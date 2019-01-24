/**
 * Copyright 2018 Google Inc.
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

import { ResourcePath } from '../model/path';
import { assert } from '../util/assert';
import { immediateSuccessor } from '../util/misc';
import { SortedSet } from '../util/sorted_set';
import { decode, encode } from './encoded_resource_path';
import { IndexManager } from './index_manager';
import { IndexedDbPersistence } from './indexeddb_persistence';
import { DbCollectionParent, DbCollectionParentKey } from './indexeddb_schema';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { SimpleDbStore } from './simple_db';

/**
 * A persisted implementation of IndexManager.
 */
export class IndexedDbIndexManager implements IndexManager {
  /**
   * An in-memory copy of the collection parents that we've written to the index since the
   * SDK launched. Used to avoid re-writing the same entry repeatedly.
   *
   * This is *NOT* a complete cache of what's in persistence and so can never be used to
   * satisfy reads.
   */
  private knownPersistedCollectionParents = {} as {
    [collectionId: string]: SortedSet<ResourcePath>;
  };

  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void> {
    assert(collectionPath.length >= 1, 'Invalid collection path.');
    const collectionId = collectionPath.lastSegment();
    const parentPath = collectionPath.popLast();
    const knownParents =
      this.knownPersistedCollectionParents[collectionId] ||
      new SortedSet<ResourcePath>(ResourcePath.comparator);
    if (knownParents.has(parentPath)) {
      return PersistencePromise.resolve();
    } else {
      this.knownPersistedCollectionParents[collectionId] = knownParents.add(
        parentPath
      );
      return collectionParentsStore(transaction).put({
        collectionId,
        parent: encode(parentPath)
      });
    }
  }

  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<SortedSet<ResourcePath>> {
    let parentPaths = new SortedSet<ResourcePath>(ResourcePath.comparator);
    const range = IDBKeyRange.bound(
      [collectionId],
      [immediateSuccessor(collectionId)],
      /*lowerOpen=*/ false /*upperOpen=true*/
    );
    return collectionParentsStore(transaction)
      .loadAll(range)
      .next(entries => {
        for (const { parent } of entries) {
          parentPaths = parentPaths.add(decode(parent));
        }
        return parentPaths;
      });
  }
}

/**
 * Helper to get a typed SimpleDbStore for the collectionParents
 * document store.
 */
function collectionParentsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbCollectionParentKey, DbCollectionParent> {
  return IndexedDbPersistence.getStore<
    DbCollectionParentKey,
    DbCollectionParent
  >(txn, DbCollectionParent.store);
}
