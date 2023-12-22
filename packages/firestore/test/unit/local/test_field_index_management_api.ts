/**
 * @license
 * Copyright 2023 Google LLC
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
import { FieldIndexManagementApi } from '../../../src/index/field_index_management_api';
import { PersistenceTransaction } from '../../../src/local/persistence_transaction';
import { Query } from '../../../src/core/query';
import { QueryContext } from '../../../src/local/query_context';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { LocalDocumentsView } from '../../../src/local/local_documents_view';
import { DocumentMap } from '../../../src/model/collections';
import { IndexManager } from '../../../src/local/index_manager';
import { User } from '../../../src/auth/user';

export class TestFieldIndexManagementApi implements FieldIndexManagementApi {
  indexAutoCreationEnabled = undefined as unknown as boolean;
  initializeInvocationCount = 0;

  initialize(user: User, indexManager: IndexManager): void {
    this.initializeInvocationCount++;
  }

  createCacheIndexes(
    transaction: PersistenceTransaction,
    query: Query,
    context: QueryContext,
    resultSize: number
  ): PersistencePromise<void> {
    throw new Error(
      'createCacheIndexes() is not implemented in TestFieldIndexManagementApi'
    );
  }

  performQueryUsingIndex(
    transaction: PersistenceTransaction,
    localDocumentsView: LocalDocumentsView,
    query: Query
  ): PersistencePromise<DocumentMap | null> {
    throw new Error(
      'performQueryUsingIndex() is not implemented in TestFieldIndexManagementApi'
    );
  }
}
