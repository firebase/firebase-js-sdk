/**
 * @license
 * Copyright 2021 Google LLC
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

import { SnapshotVersion } from '../core/snapshot_version';
import { Timestamp } from '../lite-api/timestamp';
import { primitiveComparator } from '../util/misc';

import { Document } from './document';
import { DocumentKey } from './document_key';
import { FieldPath } from './path';

/**
 * The initial mutation batch id for each index. Gets updated during index
 * backfill.
 */
export const INITIAL_LARGEST_BATCH_ID = -1;

/**
 * The initial sequence number for each index. Gets updated during index
 * backfill.
 */
export const INITIAL_SEQUENCE_NUMBER = 0;

/**
 * An index definition for field indexes in Firestore.
 *
 * Every index is associated with a collection. The definition contains a list
 * of fields and their index kind (which can be `ASCENDING`, `DESCENDING` or
 * `CONTAINS` for ArrayContains/ArrayContainsAny queries).
 *
 * Unlike the backend, the SDK does not differentiate between collection or
 * collection group-scoped indices. Every index can be used for both single
 * collection and collection group queries.
 */
export class FieldIndex {
  /** An ID for an index that has not yet been added to persistence.  */
  static UNKNOWN_ID = -1;

  constructor(
    /**
     * The index ID. Returns -1 if the index ID is not available (e.g. the index
     * has not yet been persisted).
     */
    readonly indexId: number,
    /** The collection ID this index applies to. */
    readonly collectionGroup: string,
    /** The field segments for this index. */
    readonly fields: IndexSegment[],
    /** Shows how up-to-date the index is for the current user. */
    readonly indexState: IndexState
  ) {}
}

/** Returns the ArrayContains/ArrayContainsAny segment for this index. */
export function fieldIndexGetArraySegment(
  fieldIndex: FieldIndex
): IndexSegment | undefined {
  return fieldIndex.fields.find(s => s.kind === IndexKind.CONTAINS);
}

/** Returns all directional (ascending/descending) segments for this index. */
export function fieldIndexGetDirectionalSegments(
  fieldIndex: FieldIndex
): IndexSegment[] {
  return fieldIndex.fields.filter(s => s.kind !== IndexKind.CONTAINS);
}

/**
 * Returns the order of the document key component for the given index.
 *
 * PORTING NOTE: This is only used in the Web IndexedDb implementation.
 */
export function fieldIndexGetKeyOrder(fieldIndex: FieldIndex): IndexKind {
  const directionalSegments = fieldIndexGetDirectionalSegments(fieldIndex);
  return directionalSegments.length === 0
    ? IndexKind.ASCENDING
    : directionalSegments[directionalSegments.length - 1].kind;
}

/**
 * Compares indexes by collection group and segments. Ignores update time and
 * index ID.
 */
export function fieldIndexSemanticComparator(
  left: FieldIndex,
  right: FieldIndex
): number {
  let cmp = primitiveComparator(left.collectionGroup, right.collectionGroup);
  if (cmp !== 0) {
    return cmp;
  }

  for (let i = 0; i < Math.min(left.fields.length, right.fields.length); ++i) {
    cmp = indexSegmentComparator(left.fields[i], right.fields[i]);
    if (cmp !== 0) {
      return cmp;
    }
  }
  return primitiveComparator(left.fields.length, right.fields.length);
}

/** Returns a debug representation of the field index */
export function fieldIndexToString(fieldIndex: FieldIndex): string {
  return `id=${fieldIndex.indexId}|cg=${
    fieldIndex.collectionGroup
  }|f=${fieldIndex.fields.map(f => `${f.fieldPath}:${f.kind}`).join(',')}`;
}

/** The type of the index, e.g. for which type of query it can be used. */
export const enum IndexKind {
  // Note: The order of these values cannot be changed as the enum values are
  // stored in IndexedDb.
  /**
   * Ordered index. Can be used for <, <=, ==, >=, >, !=, IN and NOT IN queries.
   */
  ASCENDING,
  /**
   * Ordered index. Can be used for <, <=, ==, >=, >, !=, IN and NOT IN queries.
   */
  DESCENDING,
  /** Contains index. Can be used for ArrayContains and ArrayContainsAny. */
  CONTAINS
}

/** An index component consisting of field path and index type.  */
export class IndexSegment {
  constructor(
    /** The field path of the component. */
    readonly fieldPath: FieldPath,
    /** The fields sorting order. */
    readonly kind: IndexKind
  ) {}
}

function indexSegmentComparator(
  left: IndexSegment,
  right: IndexSegment
): number {
  const cmp = FieldPath.comparator(left.fieldPath, right.fieldPath);
  if (cmp !== 0) {
    return cmp;
  }
  return primitiveComparator(left.kind, right.kind);
}

/**
 * Stores the "high water mark" that indicates how updated the Index is for the
 * current user.
 */
export class IndexState {
  constructor(
    /**
     * Indicates when the index was last updated (relative to other indexes).
     */
    readonly sequenceNumber: number,
    /** The the latest indexed read time, document and batch id. */
    readonly offset: IndexOffset
  ) {}

  /** The state of an index that has not yet been backfilled. */
  static empty(): IndexState {
    return new IndexState(INITIAL_SEQUENCE_NUMBER, IndexOffset.min());
  }
}

/**
 * Creates an offset that matches all documents with a read time higher than
 * `readTime`.
 */
export function newIndexOffsetSuccessorFromReadTime(
  readTime: SnapshotVersion,
  largestBatchId: number
): IndexOffset {
  // We want to create an offset that matches all documents with a read time
  // greater than the provided read time. To do so, we technically need to
  // create an offset for `(readTime, MAX_DOCUMENT_KEY)`. While we could use
  // Unicode codepoints to generate MAX_DOCUMENT_KEY, it is much easier to use
  // `(readTime + 1, DocumentKey.empty())` since `> DocumentKey.empty()` matches
  // all valid document IDs.
  const successorSeconds = readTime.toTimestamp().seconds;
  const successorNanos = readTime.toTimestamp().nanoseconds + 1;
  const successor = SnapshotVersion.fromTimestamp(
    successorNanos === 1e9
      ? new Timestamp(successorSeconds + 1, 0)
      : new Timestamp(successorSeconds, successorNanos)
  );
  return new IndexOffset(successor, DocumentKey.empty(), largestBatchId);
}

/** Creates a new offset based on the provided document. */
export function newIndexOffsetFromDocument(document: Document): IndexOffset {
  return new IndexOffset(
    document.readTime,
    document.key,
    INITIAL_LARGEST_BATCH_ID
  );
}

/**
 * Stores the latest read time, document and batch ID that were processed for an
 * index.
 */
export class IndexOffset {
  constructor(
    /**
     * The latest read time version that has been indexed by Firestore for this
     * field index.
     */
    readonly readTime: SnapshotVersion,

    /**
     * The key of the last document that was indexed for this query. Use
     * `DocumentKey.empty()` if no document has been indexed.
     */
    readonly documentKey: DocumentKey,

    /*
     * The largest mutation batch id that's been processed by Firestore.
     */
    readonly largestBatchId: number
  ) {}

  /** Returns an offset that sorts before all regular offsets. */
  static min(): IndexOffset {
    return new IndexOffset(
      SnapshotVersion.min(),
      DocumentKey.empty(),
      INITIAL_LARGEST_BATCH_ID
    );
  }

  /** Returns an offset that sorts after all regular offsets. */
  static max(): IndexOffset {
    return new IndexOffset(
      SnapshotVersion.max(),
      DocumentKey.empty(),
      INITIAL_LARGEST_BATCH_ID
    );
  }
}

export function indexOffsetComparator(
  left: IndexOffset,
  right: IndexOffset
): number {
  let cmp = left.readTime.compareTo(right.readTime);
  if (cmp !== 0) {
    return cmp;
  }
  cmp = DocumentKey.comparator(left.documentKey, right.documentKey);
  if (cmp !== 0) {
    return cmp;
  }
  return primitiveComparator(left.largestBatchId, right.largestBatchId);
}
