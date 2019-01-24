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
import { SortedSet } from '../util/sorted_set';
import { IndexManager } from './index_manager';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

/**
 * An in-memory implementation of IndexManager.
 */
export class MemoryIndexManager implements IndexManager {
  private collectionParentsIndex = {} as {
    [collectionId: string]: SortedSet<ResourcePath>;
  };

  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void> {
    assert(collectionPath.length >= 1, 'Invalid collection path.');
    const collectionId = collectionPath.lastSegment();
    const parentPath = collectionPath.popLast();
    const existingParents =
      this.collectionParentsIndex[collectionId] ||
      new SortedSet<ResourcePath>(ResourcePath.comparator);
    this.collectionParentsIndex[collectionId] = existingParents.add(parentPath);
    return PersistencePromise.resolve();
  }

  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<SortedSet<ResourcePath>> {
    const parentPaths =
      this.collectionParentsIndex[collectionId] ||
      new SortedSet<ResourcePath>(ResourcePath.comparator);
    return PersistencePromise.resolve(parentPaths);
  }
}
