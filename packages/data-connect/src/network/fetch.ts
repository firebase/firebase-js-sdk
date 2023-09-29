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

let connectFetch: typeof fetch | null = globalThis.fetch;
export function initializeFetch(fetchImpl: typeof fetch) {
  connectFetch = fetchImpl;
}
export function dcFetch<T, U>(
  url: string,
  body: U,
  { signal }: AbortController,
  accessToken: string | null
) {
  if (!connectFetch) {
    throw new DataConnectError(Code.OTHER, 'No Fetch Implementation detected!');
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (accessToken) {
    headers['X-Firebase-Auth-Token'] = accessToken;
  }
  return connectFetch(url, {
    body: JSON.stringify(body),
    method: 'POST',
    headers,
    signal
  })
    .then(async response => {
      let jsonResponse = null;
      try {
        jsonResponse = await response.json();
      } catch (e) {
        throw new DataConnectError(Code.OTHER, JSON.stringify(e));
      }
      if (response.status >= 400) {
        throw new DataConnectError(Code.OTHER, JSON.stringify(jsonResponse));
      }
      return jsonResponse;
    })
    .then(res => {
      if (res.errors && res.errors.length) {
        throw new DataConnectError(Code.OTHER, JSON.stringify(res.errors));
      }
      return res as { data: T; errors: Error[] };
    });
}
