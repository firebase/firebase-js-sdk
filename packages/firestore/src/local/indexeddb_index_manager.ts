/**
 * @license
 * Copyright 2019 Google Inc.
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
import { decode, encode } from './encoded_resource_path';
import { IndexManager } from './index_manager';
import { IndexedDbPersistence } from './indexeddb_persistence';
import { DbCollectionParent, DbCollectionParentKey } from './indexeddb_schema';
import { MemoryCollectionParentIndex } from './memory_index_manager';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { SimpleDbStore } from './simple_db';

/**
 * A persisted implementation of IndexManager.
 */
export class IndexedDbIndexManager implements IndexManager {
  /**
   * An in-memory copy of the index entries we've already written since the SDK
   * launched. Used to avoid re-writing the same entry repeatedly.
   *
   * This is *NOT* a complete cache of what's in persistence and so can never be used to
   * satisfy reads.
   */
  private collectionParentsCache = new MemoryCollectionParentIndex();

  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void> {
    assert(collectionPath.length % 2 === 1, 'Expected a collection path.');
    if (this.collectionParentsCache.add(collectionPath)) {
      assert(collectionPath.length >= 1, 'Invalid collection path.');
      const collectionId = collectionPath.lastSegment();
      const parentPath = collectionPath.popLast();
      return collectionParentsStore(transaction).put({
        collectionId,
        parent: encode(parentPath)
      });
    }
    return PersistencePromise.resolve();
  }

  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<ResourcePath[]> {
    const parentPaths = [] as ResourcePath[];
    const range = IDBKeyRange.bound(
      [collectionId, ''],
      [immediateSuccessor(collectionId), ''],
      /*lowerOpen=*/ false,
      /*upperOpen=*/ true
    );
    return collectionParentsStore(transaction)
      .loadAll(range)
      .next(entries => {
        for (const entry of entries) {
          // This collectionId guard shouldn't be necessary (and isn't as long
          // as we're running in a real browser), but there's a bug in
          // indexeddbshim that breaks our range in our tests running in node:
          // https://github.com/axemclion/IndexedDBShim/issues/334
          if (entry.collectionId !== collectionId) {
            break;
          }
          parentPaths.push(decode(entry.parent));
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
