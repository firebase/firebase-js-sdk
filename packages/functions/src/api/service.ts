/**
 * @license
 * Copyright 2017 Google Inc.
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

import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import {
  FirebaseFunctions,
  HttpsCallable,
  HttpsCallableResult,
  HttpsCallableOptions
} from '@firebase/functions-types';
import { _errorForResponse, HttpsErrorImpl } from './error';
import { ContextProvider } from '../context';
import { Serializer } from '../serializer';

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
 * The error will be of type HttpsErrorImpl.
 *
 * @param millis Number of milliseconds to wait before rejecting.
 */
function failAfter(millis: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new HttpsErrorImpl('deadline-exceeded', 'deadline-exceeded'));
    }, millis);
  });
}

/**
 * The main class for the Firebase Functions SDK.
 */
export class Service implements FirebaseFunctions, FirebaseService {
  private readonly contextProvider: ContextProvider;
  private readonly serializer = new Serializer();
  private emulatorOrigin: string | null = null;
  private cancelAllRequests: Promise<void>;
  private deleteService: Function;

  /**
   * Creates a new Functions service for the given app and (optional) region.
   * @param app_ The FirebaseApp to use.
   * @param region_ The region to call functions in.
   */
  constructor(
    private app_: FirebaseApp,
    private region_: string = 'us-central1'
  ) {
    this.contextProvider = new ContextProvider(app_);
    // Cancels all ongoing requests when resolved.
    this.cancelAllRequests = new Promise(resolve => {
      this.deleteService = () => {
        return resolve();
      };
    });
  }

  get app(): FirebaseApp {
    return this.app_;
  }

  INTERNAL = {
    delete: (): Promise<void> => {
      return this.deleteService();
    }
  };

  /**
   * Returns the URL for a callable with the given name.
   * @param name The name of the callable.
   */
  _url(name: string): string {
    const projectId = this.app_.options.projectId;
    const region = this.region_;
    if (this.emulatorOrigin !== null) {
      const origin = this.emulatorOrigin;
      return `${origin}/${projectId}/${region}/${name}`;
    }
    return `https://${region}-${projectId}.cloudfunctions.net/${name}`;
  }

  /**
   * Changes this instance to point to a Cloud Functions emulator running
   * locally. See https://firebase.google.com/docs/functions/local-emulator
   *
   * @param origin The origin of the local emulator, such as
   * "http://localhost:5005".
   */
  useFunctionsEmulator(origin: string): void {
    this.emulatorOrigin = origin;
  }

  /**
   * Returns a reference to the callable https trigger with the given name.
   * @param name The name of the trigger.
   */
  httpsCallable(name: string, options?: HttpsCallableOptions): HttpsCallable {
    return data => {
      return this.call(name, data, options || {});
    };
  }

  /**
   * Does an HTTP POST and returns the completed response.
   * @param url The url to post to.
   * @param body The JSON body of the post.
   * @param headers The HTTP headers to include in the request.
   * @return A Promise that will succeed when the request finishes.
   */
  private async postJSON(
    url: string,
    body: {},
    headers: Headers
  ): Promise<HttpResponse> {
    headers.append('Content-Type', 'application/json');

    let response: Response;
    try {
      response = await fetch(url, {
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
    let json: {} | null = null;
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
  private async call(
    name: string,
    data: unknown,
    options: HttpsCallableOptions
  ): Promise<HttpsCallableResult> {
    const url = this._url(name);

    // Encode any special types, such as dates, in the input data.
    data = this.serializer.encode(data);
    const body = { data };

    // Add a header for the authToken.
    const headers = new Headers();
    const context = await this.contextProvider.getContext();
    if (context.authToken) {
      headers.append('Authorization', 'Bearer ' + context.authToken);
    }
    if (context.instanceIdToken) {
      headers.append('Firebase-Instance-ID-Token', context.instanceIdToken);
    }

    // Default timeout to 70s, but let the options override it.
    const timeout = options.timeout || 70000;

    const response = await Promise.race([
      this.postJSON(url, body, headers),
      failAfter(timeout),
      this.cancelAllRequests
    ]);

    // If service was deleted, interrupted response throws an error.
    if (!response) {
      throw new HttpsErrorImpl(
        'cancelled',
        'Firebase Functions instance was deleted.'
      );
    }

    // Check for an error status, regardless of http status.
    const error = _errorForResponse(
      response.status,
      response.json,
      this.serializer
    );
    if (error) {
      throw error;
    }

    if (!response.json) {
      throw new HttpsErrorImpl(
        'internal',
        'Response is not valid JSON object.'
      );
    }

    let responseData = response.json.data;
    // TODO(klimt): For right now, allow "result" instead of "data", for
    // backwards compatibility.
    if (typeof responseData === 'undefined') {
      responseData = response.json.result;
    }
    if (typeof responseData === 'undefined') {
      // Consider the response malformed.
      throw new HttpsErrorImpl('internal', 'Response is missing data field.');
    }

    // Decode any special types, such as dates, in the returned data.
    const decodedData = this.serializer.decode(responseData as {} | null);

    return { data: decodedData };
  }
}
