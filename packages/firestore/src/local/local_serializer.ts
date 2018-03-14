/**
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

import * as api from '../protos/firestore_proto_api';
import { Timestamp } from '../api/timestamp';
import { Query } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { MutationBatch } from '../model/mutation_batch';
import { JsonProtoSerializer } from '../remote/serializer';
import { assert, fail } from '../util/assert';

import {
  DbMutationBatch,
  DbNoDocument,
  DbQuery,
  DbRemoteDocument,
  DbTarget,
  DbTimestamp
} from './indexeddb_schema';
import { QueryData, QueryPurpose } from './query_data';

/** Serializer for values stored in the LocalStore. */
export class LocalSerializer {
  constructor(private remoteSerializer: JsonProtoSerializer) {}

  /** Decodes a remote document from storage locally to a Document. */
  fromDbRemoteDocument(remoteDoc: DbRemoteDocument): MaybeDocument {
    if (remoteDoc.document) {
      return this.remoteSerializer.fromDocument(remoteDoc.document);
    } else if (remoteDoc.noDocument) {
      const key = DocumentKey.fromSegments(remoteDoc.noDocument.path);
      const readTime = remoteDoc.noDocument.readTime;
      const timestamp = new Timestamp(readTime.seconds, readTime.nanoseconds);
      return new NoDocument(key, SnapshotVersion.fromTimestamp(timestamp));
    } else {
      return fail('Unexpected DbRemoteDocument');
    }
  }

  /** Encodes a document for storage locally. */
  toDbRemoteDocument(maybeDoc: MaybeDocument): DbRemoteDocument {
    if (maybeDoc instanceof Document) {
      const doc = this.remoteSerializer.toDocument(maybeDoc);
      return new DbRemoteDocument(null, doc);
    } else {
      const path = maybeDoc.key.path.toArray();
      const timestamp = maybeDoc.version.toTimestamp();
      const readTime = new DbTimestamp(
        timestamp.seconds,
        timestamp.nanoseconds
      );
      return new DbRemoteDocument(new DbNoDocument(path, readTime), null);
    }
  }

  /** Encodes a batch of mutations into a DbMutationBatch for local storage. */
  toDbMutationBatch(userId: string, batch: MutationBatch): DbMutationBatch {
    const serializedMutations = batch.mutations.map(m =>
      this.remoteSerializer.toMutation(m)
    );
    return new DbMutationBatch(
      userId,
      batch.batchId,
      batch.localWriteTime.toMillis(),
      serializedMutations
    );
  }

  /** Decodes a DbMutationBatch into a MutationBatch */
  fromDbMutationBatch(dbBatch: DbMutationBatch): MutationBatch {
    const mutations = dbBatch.mutations.map(m =>
      this.remoteSerializer.fromMutation(m)
    );
    const timestamp = Timestamp.fromMillis(dbBatch.localWriteTimeMs);
    return new MutationBatch(dbBatch.batchId, timestamp, mutations);
  }

  /** Decodes a DbTarget into QueryData */
  fromDbTarget(dbTarget: DbTarget): QueryData {
    const readTime = new Timestamp(
      dbTarget.readTime.seconds,
      dbTarget.readTime.nanoseconds
    );
    const version = SnapshotVersion.fromTimestamp(readTime);
    let query: Query;
    if (isDocumentQuery(dbTarget.query)) {
      query = this.remoteSerializer.fromDocumentsTarget(dbTarget.query);
    } else {
      query = this.remoteSerializer.fromQueryTarget(dbTarget.query);
    }
    return new QueryData(
      query,
      dbTarget.targetId,
      QueryPurpose.Listen,
      version,
      dbTarget.resumeToken
    );
  }

  /** Encodes QueryData into a DbTarget for storage locally. */
  toDbTarget(queryData: QueryData): DbTarget {
    assert(
      QueryPurpose.Listen === queryData.purpose,
      'Only queries with purpose ' +
        QueryPurpose.Listen +
        ' may be stored, got ' +
        queryData.purpose
    );
    const timestamp = queryData.snapshotVersion.toTimestamp();
    const dbTimestamp = new DbTimestamp(
      timestamp.seconds,
      timestamp.nanoseconds
    );
    let queryProto: DbQuery;
    if (queryData.query.isDocumentQuery()) {
      queryProto = this.remoteSerializer.toDocumentsTarget(queryData.query);
    } else {
      queryProto = this.remoteSerializer.toQueryTarget(queryData.query);
    }
    assert(
      typeof queryData.resumeToken === 'string',
      'Persisting non-string resume token not supported.'
    );
    const resumeToken = queryData.resumeToken as string;

    // lastListenSequenceNumber is always 0 until we do real GC.
    return new DbTarget(
      queryData.targetId,
      queryData.query.canonicalId(),
      dbTimestamp,
      resumeToken,
      0,
      queryProto
    );
  }
}

/**
 * A helper function for figuring out what kind of query has been stored.
 */
function isDocumentQuery(dbQuery: DbQuery): dbQuery is api.DocumentsTarget {
  return (dbQuery as api.DocumentsTarget).documents !== undefined;
}
