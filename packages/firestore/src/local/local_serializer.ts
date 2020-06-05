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

import { Timestamp } from '../api/timestamp';
import { SnapshotVersion } from '../core/snapshot_version';
import { Target } from '../core/target';
import {
  Document,
  MaybeDocument,
  NoDocument,
  UnknownDocument
} from '../model/document';
import { DocumentKey } from '../model/document_key';
import { MutationBatch } from '../model/mutation_batch';
import * as api from '../protos/firestore_proto_api';
import { JsonProtoSerializer } from '../remote/serializer';
import { debugAssert, fail } from '../util/assert';
import { ByteString } from '../util/byte_string';

import {
  DbMutationBatch,
  DbNoDocument,
  DbQuery,
  DbRemoteDocument,
  DbTarget,
  DbTimestamp,
  DbTimestampKey,
  DbUnknownDocument
} from './indexeddb_schema';
import { TargetData, TargetPurpose } from './target_data';

/** Serializer for values stored in the LocalStore. */
export class LocalSerializer {
  constructor(private remoteSerializer: JsonProtoSerializer) {}

  /** Decodes a remote document from storage locally to a Document. */
  fromDbRemoteDocument(remoteDoc: DbRemoteDocument): MaybeDocument {
    if (remoteDoc.document) {
      return this.remoteSerializer.fromDocument(
        remoteDoc.document,
        !!remoteDoc.hasCommittedMutations
      );
    } else if (remoteDoc.noDocument) {
      const key = DocumentKey.fromSegments(remoteDoc.noDocument.path);
      const version = this.fromDbTimestamp(remoteDoc.noDocument.readTime);
      return new NoDocument(key, version, {
        hasCommittedMutations: !!remoteDoc.hasCommittedMutations
      });
    } else if (remoteDoc.unknownDocument) {
      const key = DocumentKey.fromSegments(remoteDoc.unknownDocument.path);
      const version = this.fromDbTimestamp(remoteDoc.unknownDocument.version);
      return new UnknownDocument(key, version);
    } else {
      return fail('Unexpected DbRemoteDocument');
    }
  }

  /** Encodes a document for storage locally. */
  toDbRemoteDocument(
    maybeDoc: MaybeDocument,
    readTime: SnapshotVersion
  ): DbRemoteDocument {
    const dbReadTime = this.toDbTimestampKey(readTime);
    const parentPath = maybeDoc.key.path.popLast().toArray();
    if (maybeDoc instanceof Document) {
      const doc = this.remoteSerializer.toDocument(maybeDoc);
      const hasCommittedMutations = maybeDoc.hasCommittedMutations;
      return new DbRemoteDocument(
        /* unknownDocument= */ null,
        /* noDocument= */ null,
        doc,
        hasCommittedMutations,
        dbReadTime,
        parentPath
      );
    } else if (maybeDoc instanceof NoDocument) {
      const path = maybeDoc.key.path.toArray();
      const readTime = this.toDbTimestamp(maybeDoc.version);
      const hasCommittedMutations = maybeDoc.hasCommittedMutations;
      return new DbRemoteDocument(
        /* unknownDocument= */ null,
        new DbNoDocument(path, readTime),
        /* document= */ null,
        hasCommittedMutations,
        dbReadTime,
        parentPath
      );
    } else if (maybeDoc instanceof UnknownDocument) {
      const path = maybeDoc.key.path.toArray();
      const readTime = this.toDbTimestamp(maybeDoc.version);
      return new DbRemoteDocument(
        new DbUnknownDocument(path, readTime),
        /* noDocument= */ null,
        /* document= */ null,
        /* hasCommittedMutations= */ true,
        dbReadTime,
        parentPath
      );
    } else {
      return fail('Unexpected MaybeDocument');
    }
  }

  toDbTimestampKey(snapshotVersion: SnapshotVersion): DbTimestampKey {
    const timestamp = snapshotVersion.toTimestamp();
    return [timestamp.seconds, timestamp.nanoseconds];
  }

  fromDbTimestampKey(dbTimestampKey: DbTimestampKey): SnapshotVersion {
    const timestamp = new Timestamp(dbTimestampKey[0], dbTimestampKey[1]);
    return SnapshotVersion.fromTimestamp(timestamp);
  }

  private toDbTimestamp(snapshotVersion: SnapshotVersion): DbTimestamp {
    const timestamp = snapshotVersion.toTimestamp();
    return new DbTimestamp(timestamp.seconds, timestamp.nanoseconds);
  }

  private fromDbTimestamp(dbTimestamp: DbTimestamp): SnapshotVersion {
    const timestamp = new Timestamp(
      dbTimestamp.seconds,
      dbTimestamp.nanoseconds
    );
    return SnapshotVersion.fromTimestamp(timestamp);
  }

  /** Encodes a batch of mutations into a DbMutationBatch for local storage. */
  toDbMutationBatch(userId: string, batch: MutationBatch): DbMutationBatch {
    const serializedBaseMutations = batch.baseMutations.map(m =>
      this.remoteSerializer.toMutation(m)
    );
    const serializedMutations = batch.mutations.map(m =>
      this.remoteSerializer.toMutation(m)
    );
    return new DbMutationBatch(
      userId,
      batch.batchId,
      batch.localWriteTime.toMillis(),
      serializedBaseMutations,
      serializedMutations
    );
  }

  /** Decodes a DbMutationBatch into a MutationBatch */
  fromDbMutationBatch(dbBatch: DbMutationBatch): MutationBatch {
    const baseMutations = (dbBatch.baseMutations || []).map(m =>
      this.remoteSerializer.fromMutation(m)
    );
    const mutations = dbBatch.mutations.map(m =>
      this.remoteSerializer.fromMutation(m)
    );
    const timestamp = Timestamp.fromMillis(dbBatch.localWriteTimeMs);
    return new MutationBatch(
      dbBatch.batchId,
      timestamp,
      baseMutations,
      mutations
    );
  }

  /** Decodes a DbTarget into TargetData */
  fromDbTarget(dbTarget: DbTarget): TargetData {
    const version = this.fromDbTimestamp(dbTarget.readTime);
    const lastLimboFreeSnapshotVersion =
      dbTarget.lastLimboFreeSnapshotVersion !== undefined
        ? this.fromDbTimestamp(dbTarget.lastLimboFreeSnapshotVersion)
        : SnapshotVersion.min();

    let target: Target;
    if (isDocumentQuery(dbTarget.query)) {
      target = this.remoteSerializer.fromDocumentsTarget(dbTarget.query);
    } else {
      target = this.remoteSerializer.fromQueryTarget(dbTarget.query);
    }
    return new TargetData(
      target,
      dbTarget.targetId,
      TargetPurpose.Listen,
      dbTarget.lastListenSequenceNumber,
      version,
      lastLimboFreeSnapshotVersion,
      ByteString.fromBase64String(dbTarget.resumeToken)
    );
  }

  /** Encodes TargetData into a DbTarget for storage locally. */
  toDbTarget(targetData: TargetData): DbTarget {
    debugAssert(
      TargetPurpose.Listen === targetData.purpose,
      'Only queries with purpose ' +
        TargetPurpose.Listen +
        ' may be stored, got ' +
        targetData.purpose
    );
    const dbTimestamp = this.toDbTimestamp(targetData.snapshotVersion);
    const dbLastLimboFreeTimestamp = this.toDbTimestamp(
      targetData.lastLimboFreeSnapshotVersion
    );
    let queryProto: DbQuery;
    if (targetData.target.isDocumentQuery()) {
      queryProto = this.remoteSerializer.toDocumentsTarget(targetData.target);
    } else {
      queryProto = this.remoteSerializer.toQueryTarget(targetData.target);
    }

    // We can't store the resumeToken as a ByteString in IndexedDb, so we
    // convert it to a base64 string for storage.
    const resumeToken = targetData.resumeToken.toBase64();

    // lastListenSequenceNumber is always 0 until we do real GC.
    return new DbTarget(
      targetData.targetId,
      targetData.target.canonicalId(),
      dbTimestamp,
      resumeToken,
      targetData.sequenceNumber,
      dbLastLimboFreeTimestamp,
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
