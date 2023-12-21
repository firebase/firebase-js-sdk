/**
 * @license
 * Copyright 2019 Google LLC
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

import {ResourcePath} from '../model/path';

import {PersistencePromise} from './persistence_promise';
import {PersistenceTransaction} from './persistence_transaction';

/** Represents the index state as it relates to a particular target. */
export const enum IndexType {
  /** Indicates that no index could be found for serving the target. */
  NONE,
  /**
   * Indicates that only a "partial index" could be found for serving the
   * target. A partial index is one which does not have a segment for every
   * filter/orderBy in the target.
   */
  PARTIAL,
  /**
   * Indicates that a "full index" could be found for serving the target. A full
   * index is one which has a segment for every filter/orderBy in the target.
   */
  FULL
}

export function displayNameForIndexType(indexType: IndexType): string {
  switch (indexType) {
    case IndexType.NONE:
      return 'NONE';
    case IndexType.PARTIAL:
      return 'PARTIAL';
    case IndexType.FULL:
      return 'FULL';
    default:
      return `[unknown IndexType: ${indexType}]`;
  }
}

/**
 * Represents a set of indexes that are used to execute queries efficiently.
 *
 * Currently the only index is a [collection id] =&gt; [parent path] index, used
 * to execute Collection Group queries.
 */
export interface IndexManager {
  /**
   * Creates an index entry mapping the collectionId (last segment of the path)
   * to the parent path (either the containing document location or the empty
   * path for root-level collections). Index entries can be retrieved via
   * getCollectionParents().
   *
   * NOTE: Currently we don't remove index entries. If this ends up being an
   * issue we can devise some sort of GC strategy.
   */
  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void>;

  /**
   * Retrieves all parent locations containing the given collectionId, as a
   * list of paths (each path being either a document location or the empty
   * path for a root-level collection).
   */
  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<ResourcePath[]>;

}
