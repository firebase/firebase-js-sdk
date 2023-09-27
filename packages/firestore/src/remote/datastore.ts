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

import { CredentialsProvider } from '../api/credentials';
import { User } from '../auth/user';
import { Aggregate } from '../core/aggregate';
import { queryToAggregateTarget, Query, queryToTarget } from '../core/query';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import {
  ApiClientObjectMap,
  BatchGetDocumentsRequest as ProtoBatchGetDocumentsRequest,
  BatchGetDocumentsResponse as ProtoBatchGetDocumentsResponse,
  RunAggregationQueryRequest as ProtoRunAggregationQueryRequest,
  RunAggregationQueryResponse as ProtoRunAggregationQueryResponse,
  RunQueryRequest as ProtoRunQueryRequest,
  RunQueryResponse as ProtoRunQueryResponse,
  Value
} from '../protos/firestore_proto_api';
import { debugAssert, debugCast, hardAssert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { isNullOrUndefined } from '../util/types';

import { Connection } from './connection';
import {
  PersistentListenStream,
  PersistentWriteStream,
  WatchStreamListener,
  WriteStreamListener
} from './persistent_stream';
import {
  fromDocument,
  fromBatchGetDocumentsResponse,
  getEncodedDatabaseId,
  JsonProtoSerializer,
  toMutation,
  toName,
  toQueryTarget,
  toRunAggregationQueryRequest
} from './serializer';

/**
 * Datastore and its related methods are a wrapper around the external Google
 * Cloud Datastore grpc API, which provides an interface that is more convenient
 * for the rest of the client SDK architecture to consume.
 */
export abstract class Datastore {
  abstract terminate(): void;
  abstract serializer: JsonProtoSerializer;
}

/**
 * An implementation of Datastore that exposes additional state for internal
 * consumption.
 */
class DatastoreImpl extends Datastore {
  terminated = false;

  constructor(
    readonly authCredentials: CredentialsProvider<User>,
    readonly appCheckCredentials: CredentialsProvider<string>,
    readonly connection: Connection,
    readonly serializer: JsonProtoSerializer
  ) {
    super();
  }

  verifyInitialized(): void {
    debugAssert(!!this.connection, 'Datastore.start() not called');
    if (this.terminated) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'The client has already been terminated.'
      );
    }
  }

  /** Invokes the provided RPC with auth and AppCheck tokens. */
  invokeRPC<Req, Resp>(
    rpcName: string,
    path: string,
    request: Req
  ): Promise<Resp> {
    this.verifyInitialized();
    return Promise.all([
      this.authCredentials.getToken(),
      this.appCheckCredentials.getToken()
    ])
      .then(([authToken, appCheckToken]) => {
        return this.connection.invokeRPC<Req, Resp>(
          rpcName,
          path,
          request,
          authToken,
          appCheckToken
        );
      })
      .catch((error: FirestoreError) => {
        if (error.name === 'FirebaseError') {
          if (error.code === Code.UNAUTHENTICATED) {
            this.authCredentials.invalidateToken();
            this.appCheckCredentials.invalidateToken();
          }
          throw error;
        } else {
          throw new FirestoreError(Code.UNKNOWN, error.toString());
        }
      });
  }

  /** Invokes the provided RPC with streamed results with auth and AppCheck tokens. */
  invokeStreamingRPC<Req, Resp>(
    rpcName: string,
    path: string,
    request: Req,
    expectedResponseCount?: number
  ): Promise<Resp[]> {
    this.verifyInitialized();
    return Promise.all([
      this.authCredentials.getToken(),
      this.appCheckCredentials.getToken()
    ])
      .then(([authToken, appCheckToken]) => {
        return this.connection.invokeStreamingRPC<Req, Resp>(
          rpcName,
          path,
          request,
          authToken,
          appCheckToken,
          expectedResponseCount
        );
      })
      .catch((error: FirestoreError) => {
        if (error.name === 'FirebaseError') {
          if (error.code === Code.UNAUTHENTICATED) {
            this.authCredentials.invalidateToken();
            this.appCheckCredentials.invalidateToken();
          }
          throw error;
        } else {
          throw new FirestoreError(Code.UNKNOWN, error.toString());
        }
      });
  }

  terminate(): void {
    this.terminated = true;
  }
}

// TODO(firestorexp): Make sure there is only one Datastore instance per
// firestore-exp client.
export function newDatastore(
  authCredentials: CredentialsProvider<User>,
  appCheckCredentials: CredentialsProvider<string>,
  connection: Connection,
  serializer: JsonProtoSerializer
): Datastore {
  return new DatastoreImpl(
    authCredentials,
    appCheckCredentials,
    connection,
    serializer
  );
}

export async function invokeCommitRpc(
  datastore: Datastore,
  mutations: Mutation[]
): Promise<void> {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  const path = getEncodedDatabaseId(datastoreImpl.serializer) + '/documents';
  const request = {
    writes: mutations.map(m => toMutation(datastoreImpl.serializer, m))
  };
  await datastoreImpl.invokeRPC('Commit', path, request);
}

export async function invokeBatchGetDocumentsRpc(
  datastore: Datastore,
  keys: DocumentKey[]
): Promise<Document[]> {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  const path = getEncodedDatabaseId(datastoreImpl.serializer) + '/documents';
  const request = {
    documents: keys.map(k => toName(datastoreImpl.serializer, k))
  };
  const response = await datastoreImpl.invokeStreamingRPC<
    ProtoBatchGetDocumentsRequest,
    ProtoBatchGetDocumentsResponse
  >('BatchGetDocuments', path, request, keys.length);

  const docs = new Map<string, Document>();
  response.forEach(proto => {
    const doc = fromBatchGetDocumentsResponse(datastoreImpl.serializer, proto);
    docs.set(doc.key.toString(), doc);
  });
  const result: Document[] = [];
  keys.forEach(key => {
    const doc = docs.get(key.toString());
    hardAssert(!!doc, 'Missing entity in write response for ' + key);
    result.push(doc);
  });
  return result;
}

export async function invokeRunQueryRpc(
  datastore: Datastore,
  query: Query
): Promise<Document[]> {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  const request = toQueryTarget(datastoreImpl.serializer, queryToTarget(query));
  const response = await datastoreImpl.invokeStreamingRPC<
    ProtoRunQueryRequest,
    ProtoRunQueryResponse
  >('RunQuery', request.parent!, { structuredQuery: request.structuredQuery });
  return (
    response
      // Omit RunQueryResponses that only contain readTimes.
      .filter(proto => !!proto.document)
      .map(proto =>
        fromDocument(datastoreImpl.serializer, proto.document!, undefined)
      )
  );
}

export async function invokeRunAggregationQueryRpc(
  datastore: Datastore,
  query: Query,
  aggregates: Aggregate[]
): Promise<ApiClientObjectMap<Value>> {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  const { request, aliasMap } = toRunAggregationQueryRequest(
    datastoreImpl.serializer,
    queryToAggregateTarget(query),
    aggregates
  );

  const parent = request.parent;
  if (!datastoreImpl.connection.shouldResourcePathBeIncludedInRequest) {
    delete request.parent;
  }
  const response = await datastoreImpl.invokeStreamingRPC<
    ProtoRunAggregationQueryRequest,
    ProtoRunAggregationQueryResponse
  >('RunAggregationQuery', parent!, request, /*expectedResponseCount=*/ 1);

  // Omit RunAggregationQueryResponse that only contain readTimes.
  const filteredResult = response.filter(proto => !!proto.result);

  hardAssert(
    filteredResult.length === 1,
    'Aggregation fields are missing from result.'
  );
  debugAssert(
    !isNullOrUndefined(filteredResult[0].result),
    'aggregationQueryResponse.result'
  );
  debugAssert(
    !isNullOrUndefined(filteredResult[0].result.aggregateFields),
    'aggregationQueryResponse.result.aggregateFields'
  );

  // Remap the short-form aliases that were sent to the server
  // to the client-side aliases. Users will access the results
  // using the client-side alias.
  const unmappedAggregateFields = filteredResult[0].result?.aggregateFields;
  const remappedFields = Object.keys(unmappedAggregateFields).reduce<
    ApiClientObjectMap<Value>
  >((accumulator, key) => {
    debugAssert(
      !isNullOrUndefined(aliasMap[key]),
      `'${key}' not present in aliasMap result`
    );
    accumulator[aliasMap[key]] = unmappedAggregateFields[key]!;
    return accumulator;
  }, {});

  return remappedFields;
}

export function newPersistentWriteStream(
  datastore: Datastore,
  queue: AsyncQueue,
  listener: WriteStreamListener
): PersistentWriteStream {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  datastoreImpl.verifyInitialized();
  return new PersistentWriteStream(
    queue,
    datastoreImpl.connection,
    datastoreImpl.authCredentials,
    datastoreImpl.appCheckCredentials,
    datastoreImpl.serializer,
    listener
  );
}

export function newPersistentWatchStream(
  datastore: Datastore,
  queue: AsyncQueue,
  listener: WatchStreamListener
): PersistentListenStream {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  datastoreImpl.verifyInitialized();
  return new PersistentListenStream(
    queue,
    datastoreImpl.connection,
    datastoreImpl.authCredentials,
    datastoreImpl.appCheckCredentials,
    datastoreImpl.serializer,
    listener
  );
}
