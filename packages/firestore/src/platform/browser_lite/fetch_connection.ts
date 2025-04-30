/**
 * @license
 * Copyright 2020 Google LLC
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

import { Token } from '../../api/credentials';
import { Stream } from '../../remote/connection';
import { RestConnection } from '../../remote/rest_connection';
import { mapCodeFromHttpStatus } from '../../remote/rpc_error';
import { FirestoreError } from '../../util/error';
import { StringMap } from '../../util/types';

/**
 * A Rest-based connection that relies on the native HTTP stack
 * (e.g. `fetch` or a polyfill).
 */
export class FetchConnection extends RestConnection {
  openStream<Req, Resp>(
    rpcName: string,
    token: Token | null
  ): Stream<Req, Resp> {
    throw new Error('Not supported by FetchConnection');
  }

  protected async performRPCRequest<Req, Resp>(
    rpcName: string,
    url: string,
    headers: StringMap,
    body: Req,
    forwardCredentials: boolean
  ): Promise<Resp> {
    const requestJson = JSON.stringify(body);
    let response: Response;

    try {
      const fetchArgs: RequestInit = {
        method: 'POST',
        headers,
        body: requestJson
      };
      if (forwardCredentials) {
        fetchArgs.credentials = 'include';
      }
      response = await fetch(url, fetchArgs);
    } catch (e) {
      const err = e as { status: number | undefined; statusText: string };
      throw new FirestoreError(
        mapCodeFromHttpStatus(err.status),
        'Request failed with error: ' + err.statusText
      );
    }

    if (!response.ok) {
      let errorResponse = await response.json();
      if (Array.isArray(errorResponse)) {
        errorResponse = errorResponse[0];
      }
      const errorMessage = errorResponse?.error?.message;
      throw new FirestoreError(
        mapCodeFromHttpStatus(response.status),
        `Request failed with error: ${errorMessage ?? response.statusText}`
      );
    }

    return response.json();
  }
}
