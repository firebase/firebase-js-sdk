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
import { MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation, MutationResult } from '../model/mutation';
import * as api from '../protos/firestore_proto_api';
import { debugAssert, hardAssert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { Connection } from './connection';
import { JsonProtoSerializer } from './serializer';
import {
  PersistentListenStream,
  PersistentWriteStream,
  WatchStreamListener,
  WriteStreamListener
} from './persistent_stream';
import { AsyncQueue } from '../util/async_queue';

/**
 * Datastore and its related methods are a wrapper around the external Google
 * Cloud Datastore grpc API, which provides an interface that is more convenient
 * for the rest of the client SDK architecture to consume.
 */
export class Datastore {}

/**
 * An implementation of Datastore that exposes additional state for internal
 * consumption.
 */
class DatastoreImpl extends Datastore {
  constructor(
    public readonly connection: Connection,
    public readonly credentials: CredentialsProvider,
    public readonly serializer: JsonProtoSerializer
  ) {
    super();
  }

  /** Gets an auth token and invokes the provided RPC. */
  invokeRPC<Req, Resp>(rpcName: string, request: Req): Promise<Resp> {
    return this.credentials
      .getToken()
      .then(token => {
        return this.connection.invokeRPC<Req, Resp>(rpcName, request, token);
      })
      .catch((error: FirestoreError) => {
        if (error.code === Code.UNAUTHENTICATED) {
          this.credentials.invalidateToken();
        }
        throw error;
      });
  }

  /** Gets an auth token and invokes the provided RPC with streamed results. */
  invokeStreamingRPC<Req, Resp>(
    rpcName: string,
    request: Req
  ): Promise<Resp[]> {
    return this.credentials
      .getToken()
      .then(token => {
        return this.connection.invokeStreamingRPC<Req, Resp>(
          rpcName,
          request,
          token
        );
      })
      .catch((error: FirestoreError) => {
        if (error.code === Code.UNAUTHENTICATED) {
          this.credentials.invalidateToken();
        }
        throw error;
      });
  }
}

export function newDatastore(
  connection: Connection,
  credentials: CredentialsProvider,
  serializer: JsonProtoSerializer
): Datastore {
  return new DatastoreImpl(connection, credentials, serializer);
}

export async function invokeCommitRpc(
  datastore: Datastore,
  mutations: Mutation[]
): Promise<MutationResult[]> {
  debugAssert(
    datastore instanceof DatastoreImpl,
    'invokeCommitRpc() requires DatastoreImpl'
  );
  const params = {
    database: datastore.serializer.encodedDatabaseId,
    writes: mutations.map(m => datastore.serializer.toMutation(m))
  };
  const response = await datastore.invokeRPC<
    api.CommitRequest,
    api.CommitResponse
  >('Commit', params);
  return datastore.serializer.fromWriteResults(
    response.writeResults,
    response.commitTime
  );
}

export async function invokeBatchGetDocumentsRpc(
  datastore: Datastore,
  keys: DocumentKey[]
): Promise<MaybeDocument[]> {
  debugAssert(
    datastore instanceof DatastoreImpl,
    'invokeBatchGetDocumentsRpc() requires DatastoreImpl'
  );
  const params = {
    database: datastore.serializer.encodedDatabaseId,
    documents: keys.map(k => datastore.serializer.toName(k))
  };
  const response = await datastore.invokeStreamingRPC<
    api.BatchGetDocumentsRequest,
    api.BatchGetDocumentsResponse
  >('BatchGetDocuments', params);

  const docs = new Map<string, MaybeDocument>();
  response.forEach(proto => {
    const doc = datastore.serializer.fromMaybeDocument(proto);
    docs.set(doc.key.toString(), doc);
  });
  const result: MaybeDocument[] = [];
  keys.forEach(key => {
    const doc = docs.get(key.toString());
    hardAssert(!!doc, 'Missing entity in write response for ' + key);
    result.push(doc);
  });
  return result;
}

export function newPersistentWriteStream(
  datastore: Datastore,
  queue: AsyncQueue,
  listener: WriteStreamListener
): PersistentWriteStream {
  debugAssert(
    datastore instanceof DatastoreImpl,
    'newPersistentWriteStream() requires DatastoreImpl'
  );
  return new PersistentWriteStream(
    queue,
    datastore.connection,
    datastore.credentials,
    datastore.serializer,
    listener
  );
}

export function newPersistentWatchStream(
  datastore: Datastore,
  queue: AsyncQueue,
  listener: WatchStreamListener
): PersistentListenStream {
  debugAssert(
    datastore instanceof DatastoreImpl,
    'newPersistentWatchStream() requires DatastoreImpl'
  );
  return new PersistentListenStream(
    queue,
    datastore.connection,
    datastore.credentials,
    datastore.serializer,
    listener
  );
}
