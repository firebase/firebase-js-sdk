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

import { SDK_VERSION } from '../../src/core/version';
import { Token } from '../api/credentials';
import {
  DatabaseId,
  DatabaseInfo,
  DEFAULT_DATABASE_NAME
} from '../core/database_info';
import { ResourcePath } from '../model/path';
import { debugAssert } from '../util/assert';
import { generateUniqueDebugId } from '../util/debug_uid';
import { FirestoreError } from '../util/error';
import { logDebug, logWarn } from '../util/log';
import { StringMap } from '../util/types';

import { Connection, Stream } from './connection';

const LOG_TAG = 'RestConnection';

/**
 * Maps RPC names to the corresponding REST endpoint name.
 *
 * We use array notation to avoid mangling.
 */
const RPC_NAME_URL_MAPPING: StringMap = {};

RPC_NAME_URL_MAPPING['BatchGetDocuments'] = 'batchGet';
RPC_NAME_URL_MAPPING['Commit'] = 'commit';
RPC_NAME_URL_MAPPING['RunQuery'] = 'runQuery';
RPC_NAME_URL_MAPPING['RunAggregationQuery'] = 'runAggregationQuery';

const RPC_URL_VERSION = 'v1';

// SDK_VERSION is updated to different value at runtime depending on the entry point,
// so we need to get its value when we need it in a function.
function getGoogApiClientValue(): string {
  return 'gl-js/ fire/' + SDK_VERSION;
}
/**
 * Base class for all Rest-based connections to the backend (WebChannel and
 * HTTP).
 */
export abstract class RestConnection implements Connection {
  protected readonly databaseId: DatabaseId;
  protected readonly baseUrl: string;
  private readonly databasePath: string;
  private readonly requestParams: string;

  get shouldResourcePathBeIncludedInRequest(): boolean {
    // Both `invokeRPC()` and `invokeStreamingRPC()` use their `path` arguments to determine
    // where to run the query, and expect the `request` to NOT specify the "path".
    return false;
  }

  constructor(private readonly databaseInfo: DatabaseInfo) {
    this.databaseId = databaseInfo.databaseId;
    const proto = databaseInfo.ssl ? 'https' : 'http';
    const projectId = encodeURIComponent(this.databaseId.projectId);
    const databaseId = encodeURIComponent(this.databaseId.database);
    this.baseUrl = proto + '://' + databaseInfo.host;
    this.databasePath = `projects/${projectId}/databases/${databaseId}`;
    this.requestParams =
      this.databaseId.database === DEFAULT_DATABASE_NAME
        ? `project_id=${projectId}`
        : `project_id=${projectId}&database_id=${databaseId}`;
  }

  invokeRPC<Req, Resp>(
    rpcName: string,
    path: ResourcePath,
    req: Req,
    authToken: Token | null,
    appCheckToken: Token | null
  ): Promise<Resp> {
    const streamId = generateUniqueDebugId();
    const url = this.makeUrl(rpcName, path.toUriEncodedString());
    logDebug(LOG_TAG, `Sending RPC '${rpcName}' ${streamId}:`, url, req);

    const headers: StringMap = {
      'google-cloud-resource-prefix': this.databasePath,
      'x-goog-request-params': this.requestParams
    };
    this.modifyHeadersForRequest(headers, authToken, appCheckToken);

    return this.performRPCRequest<Req, Resp>(rpcName, url, headers, req).then(
      response => {
        logDebug(LOG_TAG, `Received RPC '${rpcName}' ${streamId}: `, response);
        return response;
      },
      (err: FirestoreError) => {
        logWarn(
          LOG_TAG,
          `RPC '${rpcName}' ${streamId} failed with error: `,
          err,
          'url: ',
          url,
          'request:',
          req
        );
        throw err;
      }
    );
  }

  invokeStreamingRPC<Req, Resp>(
    rpcName: string,
    path: ResourcePath,
    request: Req,
    authToken: Token | null,
    appCheckToken: Token | null,
    expectedResponseCount?: number
  ): Promise<Resp[]> {
    // The REST API automatically aggregates all of the streamed results, so we
    // can just use the normal invoke() method.
    return this.invokeRPC<Req, Resp[]>(
      rpcName,
      path,
      request,
      authToken,
      appCheckToken
    );
  }

  abstract openStream<Req, Resp>(
    rpcName: string,
    authToken: Token | null,
    appCheckToken: Token | null
  ): Stream<Req, Resp>;

  /**
   * Modifies the headers for a request, adding any authorization token if
   * present and any additional headers for the request.
   */
  protected modifyHeadersForRequest(
    headers: StringMap,
    authToken: Token | null,
    appCheckToken: Token | null
  ): void {
    headers['X-Goog-Api-Client'] = getGoogApiClientValue();

    // Content-Type: text/plain will avoid preflight requests which might
    // mess with CORS and redirects by proxies. If we add custom headers
    // we will need to change this code to potentially use the $httpOverwrite
    // parameter supported by ESF to avoid triggering preflight requests.
    headers['Content-Type'] = 'text/plain';

    if (this.databaseInfo.appId) {
      headers['X-Firebase-GMPID'] = this.databaseInfo.appId;
    }

    if (authToken) {
      authToken.headers.forEach((value, key) => (headers[key] = value));
    }
    if (appCheckToken) {
      appCheckToken.headers.forEach((value, key) => (headers[key] = value));
    }
  }

  /**
   * Performs an RPC request using an implementation specific networking layer.
   */
  protected abstract performRPCRequest<Req, Resp>(
    rpcName: string,
    url: string,
    headers: StringMap,
    body: Req
  ): Promise<Resp>;

  private makeUrl(rpcName: string, path: string): string {
    const urlRpcName = RPC_NAME_URL_MAPPING[rpcName];
    debugAssert(
      urlRpcName !== undefined,
      'Unknown REST mapping for: ' + rpcName
    );
    return `${this.baseUrl}/${RPC_URL_VERSION}/${path}:${urlRpcName}`;
  }

  /**
   * Closes and cleans up any resources associated with the connection. This
   * implementation is a no-op because there are no resources associated
   * with the RestConnection that need to be cleaned up.
   */
  terminate(): void {
    // No-op
  }
}
