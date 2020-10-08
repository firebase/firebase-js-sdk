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

import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import {
  HttpsCallable,
  HttpsCallableResult,
  HttpsCallableOptions
} from '@firebase/functions-types-exp';
import { _errorForResponse, FunctionsError } from './error';
import { ContextProvider } from './context';
import { encode, decode } from './serializer';
import { Provider } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { FirebaseMessagingName } from '@firebase/messaging-types';

export const DEFAULT_REGION = 'us-central1';

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

/**
 * Returns a Promise that will be rejected after the given duration.
 * The error will be of type FunctionsError.
 *
 * @param millis Number of milliseconds to wait before rejecting.
 */
function failAfter(millis: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new FunctionsError('deadline-exceeded', 'deadline-exceeded'));
    }, millis);
  });
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
    messagingProvider: Provider<FirebaseMessagingName>,
    regionOrCustomDomain: string = DEFAULT_REGION,
    readonly fetchImpl: typeof fetch
  ) {
    this.contextProvider = new ContextProvider(authProvider, messagingProvider);
    // Cancels all ongoing requests when resolved.
    this.cancelAllRequests = new Promise(resolve => {
      this.deleteService = () => {
        return Promise.resolve(resolve());
      };
    });

    // Resolve the region or custom domain overload by attempting to parse it.
    try {
      const url = new URL(regionOrCustomDomain);
      this.customDomain = url.origin;
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
 * Modify this instance to communicate with the Cloudd Functions emulator.
 *
 * <p> Note: this must be called before this instance has been used to do any operations.
 *
 * @param host the emulator host (ex: localhost)
 * @param port the emulator port (ex: 5001)
 * @public
 */
export function useEmulator(
  functionsInstance: FunctionsService,
  host: string,
  port: number
): void {
  functionsInstance.emulatorOrigin = `http://${host}:${port}`;
}

/**
 * Changes this instance to point to a Cloud Functions emulator running
 * locally. See https://firebase.google.com/docs/functions/local-emulator
 *
 * @deprecated prefer the useEmulator(host, port) method.
 * @param origin - The origin of the local emulator, such as
 * "http://localhost:5005".
 * @public
 */
export function useFunctionsEmulator(
  functionsInstance: FunctionsService,
  origin: string
): void {
  functionsInstance.emulatorOrigin = origin;
}

/**
 * Returns a reference to the callable https trigger with the given name.
 * @param name - The name of the trigger.
 * @public
 */
export function httpsCallable(
  functionsInstance: FunctionsService,
  name: string,
  options?: HttpsCallableOptions
): HttpsCallable {
  return data => {
    return call(functionsInstance, name, data, options || {});
  };
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
 * Calls a callable function asynchronously and returns the result.
 * @param name The name of the callable trigger.
 * @param data The data to pass as params to the function.s
 */
async function call(
  functionsInstance: FunctionsService,
  name: string,
  data: unknown,
  options: HttpsCallableOptions
): Promise<HttpsCallableResult> {
  const url = functionsInstance._url(name);

  // Encode any special types, such as dates, in the input data.
  data = encode(data);
  const body = { data };

  // Add a header for the authToken.
  const headers: { [key: string]: string } = {};
  const context = await functionsInstance.contextProvider.getContext();
  if (context.authToken) {
    headers['Authorization'] = 'Bearer ' + context.authToken;
  }
  if (context.messagingToken) {
    headers['Firebase-Instance-ID-Token'] = context.messagingToken;
  }

  // Default timeout to 70s, but let the options override it.
  const timeout = options.timeout || 70000;

  const response = await Promise.race([
    postJSON(url, body, headers, functionsInstance.fetchImpl),
    failAfter(timeout),
    functionsInstance.cancelAllRequests
  ]);

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
