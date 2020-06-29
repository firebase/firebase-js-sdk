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
import {
  Document,
  MaybeDocument,
  NoDocument,
  UnknownDocument
} from '../model/document';
import { DocumentKey } from '../model/document_key';
import { MutationBatch } from '../model/mutation_batch';
import * as api from '../protos/firestore_proto_api';
import {
  fromDocument,
  fromDocumentsTarget,
  fromMutation,
  fromQueryTarget,
  JsonProtoSerializer,
  toDocument,
  toDocumentsTarget,
  toMutation,
  toQueryTarget
} from '../remote/serializer';
import { debugAssert, fail } from '../util/assert';
import { ByteString } from '../util/byte_string';
import { canonifyTarget, isDocumentTarget, Target } from '../core/target';
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
  constructor(readonly remoteSerializer: JsonProtoSerializer) {}
}

/** Decodes a remote document from storage locally to a Document. */
export function fromDbRemoteDocument(
  localSerializer: LocalSerializer,
  remoteDoc: DbRemoteDocument
): MaybeDocument {
  if (remoteDoc.document) {
    return fromDocument(
      localSerializer.remoteSerializer,
      remoteDoc.document,
      !!remoteDoc.hasCommittedMutations
    );
  } else if (remoteDoc.noDocument) {
    const key = DocumentKey.fromSegments(remoteDoc.noDocument.path);
    const version = fromDbTimestamp(remoteDoc.noDocument.readTime);
    return new NoDocument(key, version, {
      hasCommittedMutations: !!remoteDoc.hasCommittedMutations
    });
  } else if (remoteDoc.unknownDocument) {
    const key = DocumentKey.fromSegments(remoteDoc.unknownDocument.path);
    const version = fromDbTimestamp(remoteDoc.unknownDocument.version);
    return new UnknownDocument(key, version);
  } else {
    return fail('Unexpected DbRemoteDocument');
  }
}

/** Encodes a document for storage locally. */
export function toDbRemoteDocument(
  localSerializer: LocalSerializer,
  maybeDoc: MaybeDocument,
  readTime: SnapshotVersion
): DbRemoteDocument {
  const dbReadTime = toDbTimestampKey(readTime);
  const parentPath = maybeDoc.key.path.popLast().toArray();
  if (maybeDoc instanceof Document) {
    const doc = toDocument(localSerializer.remoteSerializer, maybeDoc);
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
    const readTime = toDbTimestamp(maybeDoc.version);
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
    const readTime = toDbTimestamp(maybeDoc.version);
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

export function toDbTimestampKey(
  snapshotVersion: SnapshotVersion
): DbTimestampKey {
  const timestamp = snapshotVersion.toTimestamp();
  return [timestamp.seconds, timestamp.nanoseconds];
}

export function fromDbTimestampKey(
  dbTimestampKey: DbTimestampKey
): SnapshotVersion {
  const timestamp = new Timestamp(dbTimestampKey[0], dbTimestampKey[1]);
  return SnapshotVersion.fromTimestamp(timestamp);
}

function toDbTimestamp(snapshotVersion: SnapshotVersion): DbTimestamp {
  const timestamp = snapshotVersion.toTimestamp();
  return new DbTimestamp(timestamp.seconds, timestamp.nanoseconds);
}

function fromDbTimestamp(dbTimestamp: DbTimestamp): SnapshotVersion {
  const timestamp = new Timestamp(dbTimestamp.seconds, dbTimestamp.nanoseconds);
  return SnapshotVersion.fromTimestamp(timestamp);
}

/** Encodes a batch of mutations into a DbMutationBatch for local storage. */
export function toDbMutationBatch(
  localSerializer: LocalSerializer,
  userId: string,
  batch: MutationBatch
): DbMutationBatch {
  const serializedBaseMutations = batch.baseMutations.map(m =>
    toMutation(localSerializer.remoteSerializer, m)
  );
  const serializedMutations = batch.mutations.map(m =>
    toMutation(localSerializer.remoteSerializer, m)
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
export function fromDbMutationBatch(
  localSerializer: LocalSerializer,
  dbBatch: DbMutationBatch
): MutationBatch {
  const baseMutations = (dbBatch.baseMutations || []).map(m =>
    fromMutation(localSerializer.remoteSerializer, m)
  );
  const mutations = dbBatch.mutations.map(m =>
    fromMutation(localSerializer.remoteSerializer, m)
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
export function fromDbTarget(dbTarget: DbTarget): TargetData {
  const version = fromDbTimestamp(dbTarget.readTime);
  const lastLimboFreeSnapshotVersion =
    dbTarget.lastLimboFreeSnapshotVersion !== undefined
      ? fromDbTimestamp(dbTarget.lastLimboFreeSnapshotVersion)
      : SnapshotVersion.min();

  let target: Target;
  if (isDocumentQuery(dbTarget.query)) {
    target = fromDocumentsTarget(dbTarget.query);
  } else {
    target = fromQueryTarget(dbTarget.query);
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
export function toDbTarget(
  localSerializer: LocalSerializer,
  targetData: TargetData
): DbTarget {
  debugAssert(
    TargetPurpose.Listen === targetData.purpose,
    'Only queries with purpose ' +
      TargetPurpose.Listen +
      ' may be stored, got ' +
      targetData.purpose
  );
  const dbTimestamp = toDbTimestamp(targetData.snapshotVersion);
  const dbLastLimboFreeTimestamp = toDbTimestamp(
    targetData.lastLimboFreeSnapshotVersion
  );
  let queryProto: DbQuery;
  if (isDocumentTarget(targetData.target)) {
    queryProto = toDocumentsTarget(
      localSerializer.remoteSerializer,
      targetData.target
    );
  } else {
    queryProto = toQueryTarget(
      localSerializer.remoteSerializer,
      targetData.target
    );
  }

  // We can't store the resumeToken as a ByteString in IndexedDb, so we
  // convert it to a base64 string for storage.
  const resumeToken = targetData.resumeToken.toBase64();

  // lastListenSequenceNumber is always 0 until we do real GC.
  return new DbTarget(
    targetData.targetId,
    canonifyTarget(targetData.target),
    dbTimestamp,
    resumeToken,
    targetData.sequenceNumber,
    dbLastLimboFreeTimestamp,
    queryProto
  );
}

/**
 * A helper function for figuring out what kind of query has been stored.
 */
function isDocumentQuery(dbQuery: DbQuery): dbQuery is api.DocumentsTarget {
  return (dbQuery as api.DocumentsTarget).documents !== undefined;
}
