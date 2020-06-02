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

import { IndexManager } from '../../../src/local/index_manager';
import { Persistence } from '../../../src/local/persistence';
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
      txn => {
        return this.indexManager.addToCollectionParentIndex(
          txn,
          collectionPath
        );
      }
    );
  }

  getCollectionParents(collectionId: string): Promise<ResourcePath[]> {
    return this.persistence.runTransaction(
      'getCollectionParents',
      'readonly',
      txn => {
        return this.indexManager.getCollectionParents(txn, collectionId);
      }
    );
  }
}
