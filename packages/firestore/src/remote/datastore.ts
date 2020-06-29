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
import { Query } from '../core/query';
import { Document, MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import * as api from '../protos/firestore_proto_api';
import { debugCast, hardAssert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';

import { Connection } from './connection';
import {
  PersistentListenStream,
  PersistentWriteStream,
  WatchStreamListener,
  WriteStreamListener
} from './persistent_stream';
import {
  fromDocument,
  fromMaybeDocument,
  getEncodedDatabaseId,
  JsonProtoSerializer,
  toMutation,
  toName,
  toQueryTarget
} from './serializer';

/**
 * Datastore and its related methods are a wrapper around the external Google
 * Cloud Datastore grpc API, which provides an interface that is more convenient
 * for the rest of the client SDK architecture to consume.
 */
export class Datastore {
  // Make sure that the structural type of `Datastore` is unique.
  // See https://github.com/microsoft/TypeScript/issues/5451
  private _ = undefined;
}

/**
 * An implementation of Datastore that exposes additional state for internal
 * consumption.
 */
class DatastoreImpl extends Datastore {
  terminated = false;

  constructor(
    readonly connection: Connection,
    readonly credentials: CredentialsProvider,
    readonly serializer: JsonProtoSerializer
  ) {
    super();
  }

  private verifyNotTerminated(): void {
    if (this.terminated) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'The client has already been terminated.'
      );
    }
  }

  /** Gets an auth token and invokes the provided RPC. */
  invokeRPC<Req, Resp>(rpcName: string, request: Req): Promise<Resp> {
    this.verifyNotTerminated();
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
    this.verifyNotTerminated();
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
): Promise<void> {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  const params = {
    database: getEncodedDatabaseId(datastoreImpl.serializer),
    writes: mutations.map(m => toMutation(datastoreImpl.serializer, m))
  };
  await datastoreImpl.invokeRPC('Commit', params);
}

export async function invokeBatchGetDocumentsRpc(
  datastore: Datastore,
  keys: DocumentKey[]
): Promise<MaybeDocument[]> {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  const params = {
    database: getEncodedDatabaseId(datastoreImpl.serializer),
    documents: keys.map(k => toName(datastoreImpl.serializer, k))
  };
  const response = await datastoreImpl.invokeStreamingRPC<
    api.BatchGetDocumentsRequest,
    api.BatchGetDocumentsResponse
  >('BatchGetDocuments', params);

  const docs = new Map<string, MaybeDocument>();
  response.forEach(proto => {
    const doc = fromMaybeDocument(datastoreImpl.serializer, proto);
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

export async function invokeRunQueryRpc(
  datastore: Datastore,
  query: Query
): Promise<Document[]> {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  const { structuredQuery, parent } = toQueryTarget(
    datastoreImpl.serializer,
    query.toTarget()
  );
  const params = {
    database: getEncodedDatabaseId(datastoreImpl.serializer),
    parent,
    structuredQuery
  };

  const response = await datastoreImpl.invokeStreamingRPC<
    api.RunQueryRequest,
    api.RunQueryResponse
  >('RunQuery', params);

  return (
    response
      // Omit RunQueryResponses that only contain readTimes.
      .filter(proto => !!proto.document)
      .map(proto =>
        fromDocument(datastoreImpl.serializer, proto.document!, undefined)
      )
  );
}

export function newPersistentWriteStream(
  datastore: Datastore,
  queue: AsyncQueue,
  listener: WriteStreamListener
): PersistentWriteStream {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  return new PersistentWriteStream(
    queue,
    datastoreImpl.connection,
    datastoreImpl.credentials,
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
  return new PersistentListenStream(
    queue,
    datastoreImpl.connection,
    datastoreImpl.credentials,
    datastoreImpl.serializer,
    listener
  );
}

export function terminateDatastore(datastore: Datastore): void {
  const datastoreImpl = debugCast(datastore, DatastoreImpl);
  datastoreImpl.terminated = true;
}
