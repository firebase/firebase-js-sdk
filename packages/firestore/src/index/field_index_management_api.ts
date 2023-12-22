import { PersistenceTransaction } from '../local/persistence_transaction';
import { Query } from '../core/query';
import { QueryContext } from '../local/query_context';
import { PersistencePromise } from '../local/persistence_promise';
import { DocumentMap } from '../model/collections';
import { IndexManager } from '../local/index_manager';
import { LocalDocumentsView } from '../local/local_documents_view';
import { User } from '../auth/user';
import { IndexBackfiller, IndexBackfillerScheduler } from './index_backfiller';
import { AsyncQueue } from '../util/async_queue';
import { LocalStore } from '../local/local_store';
import { Persistence } from '../local/persistence';

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
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export interface FieldIndexManagementApi {
  indexAutoCreationEnabled: boolean;

  // Must be called before any other methods and may be called multiple times,
  // where subsequent calls will update the stored variables.
  initialize(user: User, indexManager: IndexManager): void;

  getIndexBackfillerScheduler(
    asyncQueue: AsyncQueue,
    localStore: LocalStore,
    persistence: Persistence
  ): IndexBackfillerScheduler;

  createCacheIndexes(
    transaction: PersistenceTransaction,
    query: Query,
    context: QueryContext,
    resultSize: number
  ): PersistencePromise<void>;

  performQueryUsingIndex(
    transaction: PersistenceTransaction,
    localDocumentsView: LocalDocumentsView,
    query: Query
  ): PersistencePromise<DocumentMap | null>;
}
