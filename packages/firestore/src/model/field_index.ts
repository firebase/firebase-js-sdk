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

import {SnapshotVersion} from '../core/snapshot_version';
import {Timestamp} from '../lite-api/timestamp';
import { Document } from './document';
import {DocumentKey} from './document_key';
import {primitiveComparator} from "../util/misc";

/**
 * The initial mutation batch id for each index. Gets updated during index
 * backfill.
 */
export const INITIAL_LARGEST_BATCH_ID = -1;

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

/** Creates a new offset based on the provided document. */
export function newIndexOffsetFromDocument(document: Document): IndexOffset {
  return new IndexOffset(
    document.readTime,
    document.key,
    INITIAL_LARGEST_BATCH_ID
  );
}
