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

import { Target } from '../core/target';
import { DocumentMap } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { FieldIndex, IndexOffset } from '../model/field_index';
import { ResourcePath } from '../model/path';
import { debugAssert } from '../util/assert';
import { SortedSet } from '../util/sorted_set';

import { IndexManager, IndexType } from './index_manager';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';

/**
 * An in-memory implementation of IndexManager.
 */
export class MemoryIndexManager implements IndexManager {
  private collectionParentIndex = new MemoryCollectionParentIndex();

  addToCollectionParentIndex(
    transaction: PersistenceTransaction,
    collectionPath: ResourcePath
  ): PersistencePromise<void> {
    this.collectionParentIndex.add(collectionPath);
    return PersistencePromise.resolve();
  }

  getCollectionParents(
    transaction: PersistenceTransaction,
    collectionId: string
  ): PersistencePromise<ResourcePath[]> {
    return PersistencePromise.resolve(
      this.collectionParentIndex.getEntries(collectionId)
    );
  }

  addFieldIndex(
    transaction: PersistenceTransaction,
    index: FieldIndex
  ): PersistencePromise<void> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve();
  }

  deleteFieldIndex(
    transaction: PersistenceTransaction,
    index: FieldIndex
  ): PersistencePromise<void> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve();
  }

  deleteAllFieldIndexes(
    transaction: PersistenceTransaction
  ): PersistencePromise<void> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve();
  }

  createTargetIndexes(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<void> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve();
  }

  getDocumentsMatchingTarget(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<DocumentKey[] | null> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve<DocumentKey[] | null>(null);
  }

  getIndexType(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<IndexType> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve<IndexType>(IndexType.NONE);
  }

  getFieldIndexes(
    transaction: PersistenceTransaction,
    collectionGroup?: string
  ): PersistencePromise<FieldIndex[]> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve<FieldIndex[]>([]);
  }

  getNextCollectionGroupToUpdate(
    transaction: PersistenceTransaction
  ): PersistencePromise<string | null> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve<string | null>(null);
  }

  getMinOffset(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<IndexOffset> {
    return PersistencePromise.resolve(IndexOffset.min());
  }

  getMinOffsetFromCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string
  ): PersistencePromise<IndexOffset> {
    return PersistencePromise.resolve(IndexOffset.min());
  }

  updateCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    offset: IndexOffset
  ): PersistencePromise<void> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve();
  }

  updateIndexEntries(
    transaction: PersistenceTransaction,
    documents: DocumentMap
  ): PersistencePromise<void> {
    // Field indices are not supported with memory persistence.
    return PersistencePromise.resolve();
  }
}

/**
 * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
 * Also used for in-memory caching by IndexedDbIndexManager and initial index population
 * in indexeddb_schema.ts
 */
export class MemoryCollectionParentIndex {
  private index = {} as {
    [collectionId: string]: SortedSet<ResourcePath>;
  };

  // Returns false if the entry already existed.
  add(collectionPath: ResourcePath): boolean {
    debugAssert(collectionPath.length % 2 === 1, 'Expected a collection path.');
    const collectionId = collectionPath.lastSegment();
    const parentPath = collectionPath.popLast();
    const existingParents =
      this.index[collectionId] ||
      new SortedSet<ResourcePath>(ResourcePath.comparator);
    const added = !existingParents.has(parentPath);
    this.index[collectionId] = existingParents.add(parentPath);
    return added;
  }

  has(collectionPath: ResourcePath): boolean {
    const collectionId = collectionPath.lastSegment();
    const parentPath = collectionPath.popLast();
    const existingParents = this.index[collectionId];
    return existingParents && existingParents.has(parentPath);
  }

  getEntries(collectionId: string): ResourcePath[] {
    const parentPaths =
      this.index[collectionId] ||
      new SortedSet<ResourcePath>(ResourcePath.comparator);
    return parentPaths.toArray();
  }
}
