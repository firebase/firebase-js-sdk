/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FirebaseApp, _FirebaseService } from '@firebase/app';
import {
  HttpsCallable,
  HttpsCallableResult,
  HttpsCallableStreamResult,
  HttpsCallableOptions,
  HttpsCallableStreamOptions
} from './public-types';
import { _errorForResponse, FunctionsError } from './error';
import { ContextProvider } from './context';
import { encode, decode } from './serializer';
import { Provider } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { MessagingInternalComponentName } from '@firebase/messaging-interop-types';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { isCloudWorkstation } from '@firebase/util';

export const DEFAULT_REGION = 'us-central1';

const responseLineRE = /^data: (.*?)(?:\n|$)/;

/**
 * The response to an http request.
 */
interface HttpResponse {
  status: number;
  json: HttpResponseBody | null;
}
/**
 * Describes the shape of the HttpResponse body.
 * It makes functions that would otherwise take {} able to access the
 * possible elements in the body more easily
 */
export interface HttpResponseBody {
  data?: unknown;
  result?: unknown;
  error?: {
    message?: unknown;
    status?: unknown;
    details?: unknown;
  };
}

interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
}

/**
 * Returns a Promise that will be rejected after the given duration.
 * The error will be of type FunctionsError.
 *
 * @param millis Number of milliseconds to wait before rejecting.
 */
function failAfter(millis: number): CancellablePromise<never> {
  // Node timers and browser timers are fundamentally incompatible, but we
  // don't care about the value here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let timer: any | null = null;
  return {
    promise: new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new FunctionsError('deadline-exceeded', 'deadline-exceeded'));
      }, millis);
    }),
    cancel: () => {
      if (timer) {
        clearTimeout(timer);
      }
    }
  };
}

/**
 * The main class for the Firebase Functions SDK.
 * @internal
 */
export class FunctionsService implements _FirebaseService {
  readonly contextProvider: ContextProvider;
  emulatorOrigin: string | null = null;
  cancelAllRequests: Promise<void>;
  deleteService!: () => Promise<void>;
  region: string;
  customDomain: string | null;

  /**
   * Creates a new Functions service for the given app.
   * @param app - The FirebaseApp to use.
   */
  constructor(
    readonly app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>,
    messagingProvider: Provider<MessagingInternalComponentName>,
    appCheckProvider: Provider<AppCheckInternalComponentName>,
    regionOrCustomDomain: string = DEFAULT_REGION,
    readonly fetchImpl: typeof fetch = (...args) => fetch(...args)
  ) {
    this.contextProvider = new ContextProvider(
      app,
      authProvider,
      messagingProvider,
      appCheckProvider
    );
    // Cancels all ongoing requests when resolved.
    this.cancelAllRequests = new Promise(resolve => {
      this.deleteService = () => {
        return Promise.resolve(resolve());
      };
    });

    // Resolve the region or custom domain overload by attempting to parse it.
    try {
      const url = new URL(regionOrCustomDomain);
      this.customDomain =
        url.origin + (url.pathname === '/' ? '' : url.pathname);
      this.region = DEFAULT_REGION;
    } catch (e) {
      this.customDomain = null;
      this.region = regionOrCustomDomain;
    }
  }

  _delete(): Promise<void> {
    return this.deleteService();
  }

  /**
   * Returns the URL for a callable with the given name.
   * @param name - The name of the callable.
   * @internal
   */
  _url(name: string): string {
    const projectId = this.app.options.projectId;
    if (this.emulatorOrigin !== null) {
      const origin = this.emulatorOrigin;
      return `${origin}/${projectId}/${this.region}/${name}`;
    }

    if (this.customDomain !== null) {
      return `${this.customDomain}/${name}`;
    }

    return `https://${this.region}-${projectId}.cloudfunctions.net/${name}`;
  }
}

/**
 * Modify this instance to communicate with the Cloud Functions emulator.
 *
 * Note: this must be called before this instance has been used to do any operations.
 *
 * @param host The emulator host (ex: localhost)
 * @param port The emulator port (ex: 5001)
 * @public
 */
export function connectFunctionsEmulator(
  functionsInstance: FunctionsService,
  host: string,
  port: number
): void {
  const useSsl = isCloudWorkstation(host);
  functionsInstance.emulatorOrigin = `http${
    useSsl ? 's' : ''
  }://${host}:${port}`;
}

/**
 * Returns a reference to the callable https trigger with the given name.
 * @param name - The name of the trigger.
 * @public
 */
export function httpsCallable<RequestData, ResponseData, StreamData = unknown>(
  functionsInstance: FunctionsService,
  name: string,
  options?: HttpsCallableOptions
): HttpsCallable<RequestData, ResponseData, StreamData> {
  const callable = (
    data?: RequestData | null
  ): Promise<HttpsCallableResult> => {
    return call(functionsInstance, name, data, options || {});
  };

  callable.stream = (
    data?: RequestData | null,
    options?: HttpsCallableStreamOptions
  ) => {
    return stream(functionsInstance, name, data, options);
  };

  return callable as HttpsCallable<RequestData, ResponseData, StreamData>;
}

/**
 * Returns a reference to the callable https trigger with the given url.
 * @param url - The url of the trigger.
 * @public
 */
export function httpsCallableFromURL<
  RequestData,
  ResponseData,
  StreamData = unknown
>(
  functionsInstance: FunctionsService,
  url: string,
  options?: HttpsCallableOptions
): HttpsCallable<RequestData, ResponseData, StreamData> {
  const callable = (
    data?: RequestData | null
  ): Promise<HttpsCallableResult> => {
    return callAtURL(functionsInstance, url, data, options || {});
  };

  callable.stream = (
    data?: RequestData | null,
    options?: HttpsCallableStreamOptions
  ) => {
    return streamAtURL(functionsInstance, url, data, options || {});
  };
  return callable as HttpsCallable<RequestData, ResponseData, StreamData>;
}

/**
 * Does an HTTP POST and returns the completed response.
 * @param url The url to post to.
 * @param body The JSON body of the post.
 * @param headers The HTTP headers to include in the request.
 * @return A Promise that will succeed when the request finishes.
 */
async function postJSON(
  url: string,
  body: unknown,
  headers: { [key: string]: string },
  fetchImpl: typeof fetch
): Promise<HttpResponse> {
  headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers
    });
  } catch (e) {
    // This could be an unhandled error on the backend, or it could be a
    // network error. There's no way to know, since an unhandled error on the
    // backend will fail to set the proper CORS header, and thus will be
    // treated as a network error by fetch.
    return {
      status: 0,
      json: null
    };
  }
  let json: HttpResponseBody | null = null;
  try {
    json = await response.json();
  } catch (e) {
    // If we fail to parse JSON, it will fail the same as an empty body.
  }
  return {
    status: response.status,
    json
  };
}

/**
 * Creates authorization headers for Firebase Functions requests.
 * @param functionsInstance The Firebase Functions service instance.
 * @param options Options for the callable function, including AppCheck token settings.
 * @return A Promise that resolves a headers map to include in outgoing fetch request.
 */
async function makeAuthHeaders(
  functionsInstance: FunctionsService,
  options: HttpsCallableOptions
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const context = await functionsInstance.contextProvider.getContext(
    options.limitedUseAppCheckTokens
  );
  if (context.authToken) {
    headers['Authorization'] = 'Bearer ' + context.authToken;
  }
  if (context.messagingToken) {
    headers['Firebase-Instance-ID-Token'] = context.messagingToken;
  }
  if (context.appCheckToken !== null) {
    headers['X-Firebase-AppCheck'] = context.appCheckToken;
  }
  return headers;
}

/**
 * Calls a callable function asynchronously and returns the result.
 * @param name The name of the callable trigger.
 * @param data The data to pass as params to the function.
 */
function call(
  functionsInstance: FunctionsService,
  name: string,
  data: unknown,
  options: HttpsCallableOptions
): Promise<HttpsCallableResult> {
  const url = functionsInstance._url(name);
  return callAtURL(functionsInstance, url, data, options);
}

/**
 * Calls a callable function asynchronously and returns the result.
 * @param url The url of the callable trigger.
 * @param data The data to pass as params to the function.
 */
async function callAtURL(
  functionsInstance: FunctionsService,
  url: string,
  data: unknown,
  options: HttpsCallableOptions
): Promise<HttpsCallableResult> {
  // Encode any special types, such as dates, in the input data.
  data = encode(data);
  const body = { data };

  // Add a header for the authToken.
  const headers = await makeAuthHeaders(functionsInstance, options);

  // Default timeout to 70s, but let the options override it.
  const timeout = options.timeout || 70000;

  const failAfterHandle = failAfter(timeout);
  const response = await Promise.race([
    postJSON(url, body, headers, functionsInstance.fetchImpl),
    failAfterHandle.promise,
    functionsInstance.cancelAllRequests
  ]);

  // Always clear the failAfter timeout
  failAfterHandle.cancel();

  // If service was deleted, interrupted response throws an error.
  if (!response) {
    throw new FunctionsError(
      'cancelled',
      'Firebase Functions instance was deleted.'
    );
  }

  // Check for an error status, regardless of http status.
  const error = _errorForResponse(response.status, response.json);
  if (error) {
    throw error;
  }

  if (!response.json) {
    throw new FunctionsError('internal', 'Response is not valid JSON object.');
  }

  let responseData = response.json.data;
  // TODO(klimt): For right now, allow "result" instead of "data", for
  // backwards compatibility.
  if (typeof responseData === 'undefined') {
    responseData = response.json.result;
  }
  if (typeof responseData === 'undefined') {
    // Consider the response malformed.
    throw new FunctionsError('internal', 'Response is missing data field.');
  }

  // Decode any special types, such as dates, in the returned data.
  const decodedData = decode(responseData);

  return { data: decodedData };
}

/**
 * Calls a callable function asynchronously and returns a streaming result.
 * @param name The name of the callable trigger.
 * @param data The data to pass as params to the function.
 * @param options Streaming request options.
 */
function stream(
  functionsInstance: FunctionsService,
  name: string,
  data: unknown,
  options?: HttpsCallableStreamOptions
): Promise<HttpsCallableStreamResult> {
  const url = functionsInstance._url(name);
  return streamAtURL(functionsInstance, url, data, options || {});
}

/**
 * Calls a callable function asynchronously and return a streaming result.
 * @param url The url of the callable trigger.
 * @param data The data to pass as params to the function.
 * @param options Streaming request options.
 */
async function streamAtURL(
  functionsInstance: FunctionsService,
  url: string,
  data: unknown,
  options: HttpsCallableStreamOptions
): Promise<HttpsCallableStreamResult> {
  // Encode any special types, such as dates, in the input data.
  data = encode(data);
  const body = { data };
  //
  // Add a header for the authToken.
  const headers = await makeAuthHeaders(functionsInstance, options);
  headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'text/event-stream';

  let response: Response;
  try {
    response = await functionsInstance.fetchImpl(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
      signal: options?.signal
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      const error = new FunctionsError('cancelled', 'Request was cancelled.');
      return {
        data: Promise.reject(error),
        stream: {
          [Symbol.asyncIterator]() {
            return {
              next() {
                return Promise.reject(error);
              }
            };
          }
        }
      };
    }
    // This could be an unhandled error on the backend, or it could be a
    // network error. There's no way to know, since an unhandled error on the
    // backend will fail to set the proper CORS header, and thus will be
    // treated as a network error by fetch.
    const error = _errorForResponse(0, null);
    return {
      data: Promise.reject(error),
      // Return an empty async iterator
      stream: {
        [Symbol.asyncIterator]() {
          return {
            next() {
              return Promise.reject(error);
            }
          };
        }
      }
    };
  }
  let resultResolver: (value: unknown) => void;
  let resultRejecter: (reason: unknown) => void;
  const resultPromise = new Promise<unknown>((resolve, reject) => {
    resultResolver = resolve;
    resultRejecter = reject;
  });
  options?.signal?.addEventListener('abort', () => {
    const error = new FunctionsError('cancelled', 'Request was cancelled.');
    resultRejecter(error);
  });
  const reader = response.body!.getReader();
  const rstream = createResponseStream(
    reader,
    resultResolver!,
    resultRejecter!,
    options?.signal
  );
  return {
    stream: {
      [Symbol.asyncIterator]() {
        const rreader = rstream.getReader();
        return {
          async next() {
            const { value, done } = await rreader.read();
            return { value: value as unknown, done };
          },
          async return() {
            await rreader.cancel();
            return { done: true, value: undefined };
          }
        };
      }
    },
    data: resultPromise
  };
}

/**
 * Creates a ReadableStream that processes a streaming response from a streaming
 * callable function that returns data in server-sent event format.
 *
 * @param reader The underlying reader providing raw response data
 * @param resultResolver Callback to resolve the final result when received
 * @param resultRejecter Callback to reject with an error if encountered
 * @param signal Optional AbortSignal to cancel the stream processing
 * @returns A ReadableStream that emits decoded messages from the response
 *
 * The returned ReadableStream:
 *   1. Emits individual messages when "message" data is received
 *   2. Resolves with the final result when a "result" message is received
 *   3. Rejects with an error if an "error" message is received
 */
function createResponseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  resultResolver: (value: unknown) => void,
  resultRejecter: (reason: unknown) => void,
  signal?: AbortSignal
): ReadableStream<unknown> {
  const processLine = (
    line: string,
    controller: ReadableStreamDefaultController
  ): void => {
    const match = line.match(responseLineRE);
    // ignore all other lines (newline, comments, etc.)
    if (!match) {
      return;
    }
    const data = match[1];
    try {
      const jsonData = JSON.parse(data);
      if ('result' in jsonData) {
        resultResolver(decode(jsonData.result));
        return;
      }
      if ('message' in jsonData) {
        controller.enqueue(decode(jsonData.message));
        return;
      }
      if ('error' in jsonData) {
        const error = _errorForResponse(0, jsonData);
        controller.error(error);
        resultRejecter(error);
        return;
      }
    } catch (error) {
      if (error instanceof FunctionsError) {
        controller.error(error);
        resultRejecter(error);
        return;
      }
      // ignore other parsing errors
    }
  };

  const decoder = new TextDecoder();
  return new ReadableStream({
    start(controller) {
      let currentText = '';
      return pump();
      async function pump(): Promise<void> {
        if (signal?.aborted) {
          const error = new FunctionsError(
            'cancelled',
            'Request was cancelled'
          );
          controller.error(error);
          resultRejecter(error);
          return Promise.resolve();
        }
        try {
          const { value, done } = await reader.read();
          if (done) {
            if (currentText.trim()) {
              processLine(currentText.trim(), controller);
            }
            controller.close();
            return;
          }
          if (signal?.aborted) {
            const error = new FunctionsError(
              'cancelled',
              'Request was cancelled'
            );
            controller.error(error);
            resultRejecter(error);
            await reader.cancel();
            return;
          }
          currentText += decoder.decode(value, { stream: true });
          const lines = currentText.split('\n');
          currentText = lines.pop() || '';
          for (const line of lines) {
            if (line.trim()) {
              processLine(line.trim(), controller);
            }
          }
          return pump();
        } catch (error) {
          const functionsError =
            error instanceof FunctionsError
              ? error
              : _errorForResponse(0, null);
          controller.error(functionsError);
          resultRejecter(functionsError);
        }
      }
    },
    cancel() {
      return reader.cancel();
    }
  });
}
