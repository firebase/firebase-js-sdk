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

import { Code, DataConnectError } from '../core/error';
import { SDK_VERSION } from '../core/version';
import { logDebug, logError } from '../logger';

let connectFetch: typeof fetch | null = globalThis.fetch;
export function initializeFetch(fetchImpl: typeof fetch): void {
  connectFetch = fetchImpl;
}
function getGoogApiClientValue(): string {
  return 'gl-js/ fire/' + SDK_VERSION;
}
export function dcFetch<T, U>(
  url: string,
  body: U,
  { signal }: AbortController,
  accessToken: string | null
): Promise<{ data: T; errors: Error[] }> {
  if (!connectFetch) {
    throw new DataConnectError(Code.OTHER, 'No Fetch Implementation detected!');
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Client': getGoogApiClientValue()
  };
  if (accessToken) {
    headers['X-Firebase-Auth-Token'] = accessToken;
  }
  const bodyStr = JSON.stringify(body);
  logDebug(`Making request out to ${url} with body: ${bodyStr}`);

  return connectFetch(url, {
    body: bodyStr,
    method: 'POST',
    headers,
    signal
  })
    .catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        'Failed to fetch: ' + JSON.stringify(err)
      );
    })
    .then(async response => {
      let jsonResponse = null;
      try {
        jsonResponse = await response.json();
      } catch (e) {
        throw new DataConnectError(Code.OTHER, JSON.stringify(e));
      }
      const message = getMessage(jsonResponse);
      if (response.status >= 400) {
        logError(
          'Error while performing request: ' + JSON.stringify(jsonResponse)
        );
        if (response.status === 401) {
          throw new DataConnectError(Code.UNAUTHORIZED, message);
        }
        throw new DataConnectError(Code.OTHER, message);
      }
      return jsonResponse;
    })
    .then(res => {
      if (res.errors && res.errors.length) {
        const stringified = JSON.stringify(res.errors);
        logError('DataConnect error while performing request: ' + stringified);
        throw new DataConnectError(Code.OTHER, stringified);
      }
      return res as { data: T; errors: Error[] };
    });
}
interface MessageObject {
  message?: string;
}
function getMessage(obj: MessageObject): string {
  if ('message' in obj) {
    return obj.message;
  }
  return JSON.stringify(obj);
}
