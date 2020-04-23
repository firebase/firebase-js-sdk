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
import { hardAssert } from '../util/assert';
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

// The generated proto interfaces for these class are missing the database
// field. So we add it here.
// TODO(b/36015800): Remove this once the api generator is fixed.
interface BatchGetDocumentsRequest extends api.BatchGetDocumentsRequest {
  database?: string;
}
interface CommitRequest extends api.CommitRequest {
  database?: string;
}

/**
 * Datastore is a wrapper around the external Google Cloud Datastore grpc API,
 * which provides an interface that is more convenient for the rest of the
 * client SDK architecture to consume.
 */
export class Datastore {
  constructor(
    public readonly connection: Connection,
    public readonly credentials: CredentialsProvider,
    public readonly serializer: JsonProtoSerializer
  ) {}

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

export function invokeCommitRpc(
  datastore: Datastore,
  mutations: Mutation[]
): Promise<MutationResult[]> {
  const params: CommitRequest = {
    database: datastore.serializer.encodedDatabaseId,
    writes: mutations.map(m => datastore.serializer.toMutation(m))
  };
  return datastore
    .invokeRPC<CommitRequest, api.CommitResponse>('Commit', params)
    .then(response => {
      return datastore.serializer.fromWriteResults(
        response.writeResults,
        response.commitTime
      );
    });
}

export function invokeBatchGetDocumentsRpc(
  datastore: Datastore,
  keys: DocumentKey[]
): Promise<MaybeDocument[]> {
  const params: BatchGetDocumentsRequest = {
    database: datastore.serializer.encodedDatabaseId,
    documents: keys.map(k => datastore.serializer.toName(k))
  };

  return datastore
    .invokeStreamingRPC<
      BatchGetDocumentsRequest,
      api.BatchGetDocumentsResponse
    >('BatchGetDocuments', params)
    .then(response => {
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
    });
}

export function newPersistentWriteStream(
  datastore: Datastore,
  queue: AsyncQueue,
  listener: WriteStreamListener
): PersistentWriteStream {
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
  return new PersistentListenStream(
    queue,
    datastore.connection,
    datastore.credentials,
    datastore.serializer,
    listener
  );
}
