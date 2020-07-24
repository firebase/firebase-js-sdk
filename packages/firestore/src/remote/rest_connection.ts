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

import { Token } from '../api/credentials';
import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { SDK_VERSION } from '../../src/core/version';
import { Connection, Stream } from './connection';
import { logDebug } from '../util/log';
import { FirestoreError } from '../util/error';
import { StringMap } from '../util/types';
import { debugAssert } from '../util/assert';
import { Indexable } from '../util/misc';

const LOG_TAG = 'FetchConnection';

/** Maps RPC names to the corresponding REST endpoint name. */
const RPC_NAME_URL_MAPPING: StringMap = {
  BatchGetDocuments: 'batchGet',
  Commit: 'commit',
  RunQuery: 'runQuery'
};

const RPC_URL_VERSION = 'v1';
const X_GOOG_API_CLIENT_VALUE = 'gl-js/ fire/' + SDK_VERSION;

/**
 * Base class for all Rest-based connections to the backend (WebChannel and
 * HTTP).
 */
export abstract class RestConnection implements Connection {
  protected readonly databaseId: DatabaseId;
  protected readonly baseUrl: string;
  private readonly databaseRoot: string;

  constructor(private readonly databaseInfo: DatabaseInfo) {
    this.databaseId = databaseInfo.databaseId;
    const proto = databaseInfo.ssl ? 'https' : 'http';
    this.baseUrl = proto + '://' + databaseInfo.host;
    this.databaseRoot =
      'projects/' +
      this.databaseId.projectId +
      '/databases/' +
      this.databaseId.database +
      '/documents';
  }

  invokeRPC<Req, Resp>(
    rpcName: string,
    req: Req,
    token: Token | null
  ): Promise<Resp> {
    const url = this.makeUrl(rpcName, req);

    // The database and/or parent field is already encoded in URL. Specifying it
    // again in the body is not necessary in production, and will cause
    // duplicate field errors in the Firestore Emulator. Let's remove it.
    const jsonObj = ({ ...req } as unknown) as Indexable;
    delete jsonObj.parent;
    delete jsonObj.database;

    const requestBody = JSON.stringify(jsonObj);
    logDebug(LOG_TAG, 'Sending: ', url + ' ' + requestBody);

    // Content-Type: text/plain will avoid preflight requests which might
    // mess with CORS and redirects by proxies. If we add custom headers
    // we will need to change this code to potentially use the $httpOverwrite
    // parameter supported by ESF to avoid	triggering preflight requests.
    const headers: StringMap = { 'Content-Type': 'text/plain' };
    this.modifyHeadersForRequest(headers, token);

    return this.performRPCRequest(rpcName, url, headers, requestBody).then(
      json => {
        logDebug(LOG_TAG, 'Received: ', json);
        return JSON.parse(json);
      },
      (err: FirestoreError) => {
        logDebug(LOG_TAG, 'Request failed, Code:', err.code, err.message);
        throw err;
      }
    );
  }

  invokeStreamingRPC<Req, Resp>(
    rpcName: string,
    request: Req,
    token: Token | null
  ): Promise<Resp[]> {
    // The REST API automatically aggregates all of the streamed results, so we
    // can just use the normal invoke() method.
    return this.invokeRPC<Req, Resp[]>(rpcName, request, token);
  }

  /**
   * Modifies the headers for a request, adding any authorization token if
   * present and any additional headers for the request.
   */
  protected modifyHeadersForRequest(
    headers: StringMap,
    token: Token | null
  ): void {
    if (token) {
      for (const header in token.authHeaders) {
        if (token.authHeaders.hasOwnProperty(header)) {
          headers[header] = token.authHeaders[header];
        }
      }
    }
    headers['X-Goog-Api-Client'] = X_GOOG_API_CLIENT_VALUE;
  }

  /**
   * Performs an RPC request using an implementation specific networking layer.
   */
  protected abstract performRPCRequest(
    rpcName: string,
    url: string,
    headers: StringMap,
    body: string
  ): Promise<string>;

  abstract openStream<Req, Resp>(
    rpcName: string,
    token: Token | null
  ): Stream<Req, Resp>;

  private makeUrl<Req>(rpcName: string, req: Req): string {
    const urlRpcName = RPC_NAME_URL_MAPPING[rpcName];
    debugAssert(
      urlRpcName !== undefined,
      'Unknown REST mapping for: ' + rpcName
    );
    const path = ((req as unknown) as Indexable).parent || this.databaseRoot;
    return `${this.baseUrl}/${RPC_URL_VERSION}/${path}:${urlRpcName}`;
  }
}
