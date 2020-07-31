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

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { Token } from '../../api/credentials';
import { Stream } from '../../remote/connection';
import { mapCodeFromHttpStatus } from '../../remote/rpc_error';
import { FirestoreError } from '../../util/error';
import { StringMap } from '../../util/types';
import { RestConnection } from '../../remote/rest_connection';

const TIMEOUT_SECS = 15;

export class HttpConnection extends RestConnection {
  openStream<Req, Resp>(
    rpcName: string,
    token: Token | null
  ): Stream<Req, Resp> {
    throw new Error('Not supported by HttpConnection');
  }

  protected async performRPCRequest<Req, Resp>(
    rpcName: string,
    url: string,
    headers: StringMap,
    body: Req
  ): Promise<Resp> {
    const options: AxiosRequestConfig = {
      timeout: TIMEOUT_SECS * 1000,
      headers
    };
    let response: AxiosResponse;
    try {
      response = await axios.post(url, body, options);
    } catch (err) {
      throw new FirestoreError(
        mapCodeFromHttpStatus(err.status),
        'Request failed with error: ' + err.statusText
      );
    }
    return response.data;
  }
}
