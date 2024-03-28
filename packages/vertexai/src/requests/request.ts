/**
 * @license
 * Copyright 2024 Google LLC
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

import { RequestOptions } from '../types';
import { ERROR_FACTORY, VertexError } from '../errors';
import { ApiSettings } from '../types/internal';
import { version } from '../../package.json';

const DEFAULT_BASE_URL = 'https://firebaseml.googleapis.com';

export const DEFAULT_API_VERSION = 'v2beta';

const PACKAGE_VERSION = version;
const PACKAGE_LOG_HEADER = 'firebase-vertexai-js';

export enum Task {
  GENERATE_CONTENT = 'generateContent',
  STREAM_GENERATE_CONTENT = 'streamGenerateContent',
  COUNT_TOKENS = 'countTokens'
}

export class RequestUrl {
  constructor(
    public model: string,
    public task: Task,
    public apiSettings: ApiSettings,
    public stream: boolean,
    public requestOptions?: RequestOptions
  ) {}
  toString(): string {
    const apiVersion = this.requestOptions?.apiVersion || DEFAULT_API_VERSION;
    const baseUrl = this.requestOptions?.baseUrl || DEFAULT_BASE_URL;
    let url = `${baseUrl}/${apiVersion}`;
    url += `/projects/${this.apiSettings.project}`;
    url += `/locations/${this.apiSettings.location}`;
    url += `/${this.model}`;
    url += `:${this.task}`;
    if (this.stream) {
      url += '?alt=sse';
    }
    return url;
  }

  /**
   * If the model needs to be passed to the backend, it needs to
   * include project and location path.
   */
  get fullModelString(): string {
    let modelString = `projects/${this.apiSettings.project}`;
    modelString += `/locations/${this.apiSettings.location}`;
    modelString += `/${this.model}`;
    return modelString;
  }
}

/**
 * Simple, but may become more complex if we add more versions to log.
 */
function getClientHeaders(): string {
  return `${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`;
}

export async function makeRequest(
  url: RequestUrl,
  body: string,
  requestOptions?: RequestOptions
): Promise<Response> {
  let response;
  try {
    response = await fetch(url.toString(), {
      ...buildFetchOptions(requestOptions),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-client': getClientHeaders(),
        'x-goog-api-key': url.apiSettings.apiKey
      },
      body
    });
    if (!response.ok) {
      let message = '';
      try {
        const json = await response.json();
        message = json.error.message;
        if (json.error.details) {
          message += ` ${JSON.stringify(json.error.details)}`;
        }
      } catch (e) {
        // ignored
      }
      throw new Error(`[${response.status} ${response.statusText}] ${message}`);
    }
  } catch (caughtError) {
    const e = caughtError as Error;
    const err = ERROR_FACTORY.create(VertexError.FETCH_ERROR, {
      url: url.toString(),
      message: e.message
    });
    err.stack = e.stack;
    throw err;
  }
  return response;
}

/**
 * Generates the request options to be passed to the fetch API.
 * @param requestOptions - The user-defined request options.
 * @returns The generated request options.
 */
function buildFetchOptions(requestOptions?: RequestOptions): RequestInit {
  const fetchOptions = {} as RequestInit;
  if (requestOptions?.timeout && requestOptions?.timeout >= 0) {
    const abortController = new AbortController();
    const signal = abortController.signal;
    setTimeout(() => abortController.abort(), requestOptions.timeout);
    fetchOptions.signal = signal;
  }
  return fetchOptions;
}
