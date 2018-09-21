/**
 * Copyright 2017 Google Inc.
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

import { User } from '../auth/user';
import { debug } from '../util/log';

import { ListenSequence } from '../core/listen_sequence';
import { ListenSequenceNumber } from '../core/types';
import { MemoryMutationQueue } from './memory_mutation_queue';
import { MemoryQueryCache } from './memory_query_cache';
import { MemoryRemoteDocumentCache } from './memory_remote_document_cache';
import { MutationQueue } from './mutation_queue';
import {
  Persistence,
  PersistenceTransaction,
  PrimaryStateListener
} from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryCache } from './query_cache';
import { RemoteDocumentCache } from './remote_document_cache';
import { ClientId } from './shared_client_state';

const LOG_TAG = 'MemoryPersistence';

/**
 * A memory-backed instance of Persistence. Data is stored only in RAM and
 * not persisted across sessions.
 */
export class MemoryPersistence implements Persistence {
  /**
   * Note that these are retained here to make it easier to write tests
   * affecting both the in-memory and IndexedDB-backed persistence layers. Tests
   * can create a new LocalStore wrapping this Persistence instance and this
   * will make the in-memory persistence layer behave as if it were actually
   * persisting values.
   */
  private mutationQueues: { [user: string]: MutationQueue } = {};
  private remoteDocumentCache = new MemoryRemoteDocumentCache();
  private queryCache = new MemoryQueryCache();

  private _started = false;

  constructor(private readonly clientId: ClientId) {
    this._started = true;
  }

  async shutdown(deleteData?: boolean): Promise<void> {
    // No durable state to ensure is closed on shutdown.
    this._started = false;
  }

  get started(): boolean {
    return this._started;
  }

  async getActiveClients(): Promise<ClientId[]> {
    return [this.clientId];
  }

  setPrimaryStateListener(
    primaryStateListener: PrimaryStateListener
  ): Promise<void> {
    // All clients using memory persistence act as primary.
    return primaryStateListener(true);
  }

  setNetworkEnabled(networkEnabled: boolean): void {
    // No op.
  }

  getMutationQueue(user: User): MutationQueue {
    let queue = this.mutationQueues[user.toKey()];
    if (!queue) {
      queue = new MemoryMutationQueue();
      this.mutationQueues[user.toKey()] = queue;
    }
    return queue;
  }

  getQueryCache(): QueryCache {
    return this.queryCache;
  }

  getRemoteDocumentCache(): RemoteDocumentCache {
    return this.remoteDocumentCache;
  }

  runTransaction<T>(
    action: string,
    mode: 'readonly' | 'readwrite' | 'readwrite-primary',
    transactionOperation: (
      transaction: PersistenceTransaction
    ) => PersistencePromise<T>
  ): Promise<T> {
    debug(LOG_TAG, 'Starting transaction:', action);
    return transactionOperation(
      new MemoryTransaction(ListenSequence.INVALID)
    ).toPromise();
  }
}

/**
 * Memory persistence is not actually transactional, but future implementations
 * may have transaction-scoped state.
 */
export class MemoryTransaction implements PersistenceTransaction {
  constructor(readonly currentSequenceNumber: ListenSequenceNumber) {}
}
