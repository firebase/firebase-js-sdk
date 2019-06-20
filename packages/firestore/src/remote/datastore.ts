/**
 * @license
 * Copyright 2017 Google Inc.
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
import { maybeDocumentMap } from '../model/collections';
import { MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation, MutationResult } from '../model/mutation';
import * as api from '../protos/firestore_proto_api';
import { assert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { Connection } from './connection';
import {
  WatchStreamListener,
  WriteStreamListener,
  PersistentListenStream,
  PersistentWriteStream
} from './persistent_stream';

import { JsonProtoSerializer } from './serializer';

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
    private queue: AsyncQueue,
    private connection: Connection,
    private credentials: CredentialsProvider,
    private serializer: JsonProtoSerializer
  ) {}

  newPersistentWriteStream(
    listener: WriteStreamListener
  ): PersistentWriteStream {
    return new PersistentWriteStream(
      this.queue,
      this.connection,
      this.credentials,
      this.serializer,
      listener
    );
  }

  newPersistentWatchStream(
    listener: WatchStreamListener
  ): PersistentListenStream {
    return new PersistentListenStream(
      this.queue,
      this.connection,
      this.credentials,
      this.serializer,
      listener
    );
  }

  commit(mutations: Mutation[]): Promise<MutationResult[]> {
    const params: CommitRequest = {
      database: this.serializer.encodedDatabaseId,
      writes: mutations.map(m => this.serializer.toMutation(m))
    };
    return this.invokeRPC<CommitRequest, api.CommitResponse>(
      'Commit',
      params
    ).then(response => {
      return this.serializer.fromWriteResults(
        response.writeResults,
        response.commitTime
      );
    });
  }

  lookup(keys: DocumentKey[]): Promise<MaybeDocument[]> {
    const params: BatchGetDocumentsRequest = {
      database: this.serializer.encodedDatabaseId,
      documents: keys.map(k => this.serializer.toName(k))
    };
    return this.invokeStreamingRPC<
      BatchGetDocumentsRequest,
      api.BatchGetDocumentsResponse
    >('BatchGetDocuments', params).then(response => {
      let docs = maybeDocumentMap();
      response.forEach(proto => {
        const doc = this.serializer.fromMaybeDocument(proto);
        docs = docs.insert(doc.key, doc);
      });
      const result: MaybeDocument[] = [];
      keys.forEach(key => {
        const doc = docs.get(key);
        assert(!!doc, 'Missing entity in write response for ' + key);
        result.push(doc!);
      });
      return result;
    });
  }

  /** Gets an auth token and invokes the provided RPC. */
  private invokeRPC<Req, Resp>(rpcName: string, request: Req): Promise<Resp> {
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
  private invokeStreamingRPC<Req, Resp>(
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
