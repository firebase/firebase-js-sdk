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

import { Target } from '../../../src/core/target';
import { IndexManager, IndexType } from '../../../src/local/index_manager';
import { Persistence } from '../../../src/local/persistence';
import { DocumentMap } from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import { FieldIndex, IndexOffset } from '../../../src/model/field_index';
import { ResourcePath } from '../../../src/model/path';

/**
 * A wrapper around IndexManager that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestIndexManager {
  constructor(
    public persistence: Persistence,
    public indexManager: IndexManager
  ) {}

  addToCollectionParentIndex(collectionPath: ResourcePath): Promise<void> {
    return this.persistence.runTransaction(
      'addToCollectionParentIndex',
      'readwrite',
      txn => this.indexManager.addToCollectionParentIndex(txn, collectionPath)
    );
  }

  getCollectionParents(collectionId: string): Promise<ResourcePath[]> {
    return this.persistence.runTransaction(
      'getCollectionParents',
      'readonly',
      txn => this.indexManager.getCollectionParents(txn, collectionId)
    );
  }

  addFieldIndex(index: FieldIndex): Promise<void> {
    return this.persistence.runTransaction('addFieldIndex', 'readwrite', txn =>
      this.indexManager.addFieldIndex(txn, index)
    );
  }

  deleteFieldIndex(index: FieldIndex): Promise<void> {
    return this.persistence.runTransaction(
      'deleteFieldIndex',
      'readwrite',
      txn => this.indexManager.deleteFieldIndex(txn, index)
    );
  }

  createTargetIndexes(target: Target): Promise<void> {
    return this.persistence.runTransaction(
      'createTargetIndexes',
      'readwrite',
      txn => this.indexManager.createTargetIndexes(txn, target)
    );
  }

  getFieldIndexes(collectionGroup?: string): Promise<FieldIndex[]> {
    return this.persistence.runTransaction('getFieldIndexes', 'readonly', txn =>
      collectionGroup
        ? this.indexManager.getFieldIndexes(txn, collectionGroup)
        : this.indexManager.getFieldIndexes(txn)
    );
  }

  getIndexType(target: Target): Promise<IndexType> {
    return this.persistence.runTransaction('getIndexType', 'readonly', txn =>
      this.indexManager.getIndexType(txn, target)
    );
  }

  getDocumentsMatchingTarget(target: Target): Promise<DocumentKey[] | null> {
    return this.persistence.runTransaction(
      'getDocumentsMatchingTarget',
      'readonly',
      txn => this.indexManager.getDocumentsMatchingTarget(txn, target)
    );
  }

  getNextCollectionGroupToUpdate(): Promise<string | null> {
    return this.persistence.runTransaction(
      'getNextCollectionGroupToUpdate',
      'readonly',
      txn => this.indexManager.getNextCollectionGroupToUpdate(txn)
    );
  }

  updateCollectionGroup(
    collectionGroup: string,
    offset: IndexOffset
  ): Promise<void> {
    return this.persistence.runTransaction(
      'updateCollectionGroup',
      'readwrite-primary',
      txn =>
        this.indexManager.updateCollectionGroup(txn, collectionGroup, offset)
    );
  }

  updateIndexEntries(documents: DocumentMap): Promise<void> {
    return this.persistence.runTransaction(
      'updateIndexEntries',
      'readwrite-primary',
      txn => this.indexManager.updateIndexEntries(txn, documents)
    );
  }
}
