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
import { DocumentKey } from '../model/document_key';
import { debug } from '../util/log';
import { ObjectMap } from '../util/obj_map';
import { encode } from './encoded_resource_path';
import {
  ActiveTargets,
  LruDelegate,
  LruGarbageCollector
} from './lru_garbage_collector';

import { MemoryMutationQueue } from './memory_mutation_queue';
import { MemoryQueryCache } from './memory_query_cache';
import { MemoryRemoteDocumentCache } from './memory_remote_document_cache';
import { MutationQueue } from './mutation_queue';
import {
  Persistence,
  PersistenceTransaction,
  PrimaryStateListener,
  ReferenceDelegate
} from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryData } from './query_data';
import { ReferenceSet } from './reference_set';
import { ClientId } from './shared_client_state';
import { ListenSequenceNumber } from '../core/types';
import { ListenSequence } from '../core/listen_sequence';
import * as obj from '../util/obj';

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
  private readonly queryCache: MemoryQueryCache; // = new MemoryQueryCache();
  private readonly listenSequence = new ListenSequence(0);

  private _started = false;

  // TODO(gsoltis): remove option to be null once eager delegate is implemented.
  private _referenceDelegate: ReferenceDelegate | null;

  static createLruPersistence(clientId: ClientId): MemoryPersistence {
    const persistence = new MemoryPersistence(clientId);
    persistence._referenceDelegate = new MemoryLruDelegate(persistence);
    return persistence;
  }

  constructor(private readonly clientId: ClientId) {
    this._started = true;
    this.queryCache = new MemoryQueryCache(this);
  }

  shutdown(deleteData?: boolean): Promise<void> {
    // No durable state to ensure is closed on shutdown.
    this._started = false;
    return Promise.resolve();
  }

  get started(): boolean {
    return this._started;
  }

  get referenceDelegate(): ReferenceDelegate {
    return this._referenceDelegate!;
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

  getQueryCache(): MemoryQueryCache {
    return this.queryCache;
  }

  getRemoteDocumentCache(): MemoryRemoteDocumentCache {
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
      new MemoryTransaction(this.listenSequence.next())
    ).toPromise();
  }

  mutationQueuesContainKey(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return PersistencePromise.or(
      obj
        .values(this.mutationQueues)
        .map(queue => () => queue.containsKey(transaction, key))
    );
  }
}

/**
 * Memory persistence is not actually transactional, but future implementations
 * may have transaction-scoped state.
 */
export class MemoryTransaction implements PersistenceTransaction {
  constructor(readonly currentSequenceNumber: ListenSequenceNumber) {}
}

export class MemoryLruDelegate implements ReferenceDelegate, LruDelegate {
  private additionalReferences: ReferenceSet | null;
  private orphanedSequenceNumbers: ObjectMap<
    DocumentKey,
    ListenSequenceNumber
  > = new ObjectMap(k => encode(k.path));

  readonly garbageCollector: LruGarbageCollector;

  constructor(private readonly persistence: MemoryPersistence) {
    this.garbageCollector = new LruGarbageCollector(this);
  }

  forEachTarget(
    txn: PersistenceTransaction,
    f: (q: QueryData) => void
  ): PersistencePromise<void> {
    return this.persistence.getQueryCache().forEachTarget(txn, f);
  }

  getTargetCount(txn: PersistenceTransaction): PersistencePromise<number> {
    return this.persistence.getQueryCache().getTargetCount(txn);
  }

  forEachOrphanedDocumentSequenceNumber(
    txn: PersistenceTransaction,
    f: (sequenceNumber: ListenSequenceNumber) => void
  ): PersistencePromise<void> {
    this.orphanedSequenceNumbers.forEach((_, sequenceNumber) =>
      f(sequenceNumber)
    );
    return PersistencePromise.resolve();
  }

  setInMemoryPins(inMemoryPins: ReferenceSet): void {
    this.additionalReferences = inMemoryPins;
  }

  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    return this.persistence
      .getQueryCache()
      .removeTargets(txn, upperBound, activeTargetIds);
  }

  removeOrphanedDocuments(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<number> {
    let count = 0;
    const cache = this.persistence.getRemoteDocumentCache();
    const p = cache.forEachDocumentKey(txn, key => {
      return this.isPinned(txn, key, upperBound).next(isPinned => {
        if (isPinned) {
          return PersistencePromise.resolve();
        } else {
          count++;
          return cache.removeEntry(txn, key);
        }
      });
    });
    return p.next(() => count);
  }

  removeMutationReference(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedSequenceNumbers.set(key, txn.currentSequenceNumber);
    return PersistencePromise.resolve();
  }

  removeTarget(
    txn: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    const updated = queryData.copy({
      sequenceNumber: txn.currentSequenceNumber
    });
    return this.persistence.getQueryCache().updateQueryData(txn, updated);
  }

  addReference(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedSequenceNumbers.set(key, txn.currentSequenceNumber);
    return PersistencePromise.resolve();
  }

  removeReference(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedSequenceNumbers.set(key, txn.currentSequenceNumber);
    return PersistencePromise.resolve();
  }

  updateLimboDocument(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedSequenceNumbers.set(key, txn.currentSequenceNumber);
    return PersistencePromise.resolve();
  }

  private isPinned(
    txn: PersistenceTransaction,
    key: DocumentKey,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<boolean> {
    return PersistencePromise.or([
      () => this.persistence.mutationQueuesContainKey(txn, key),
      () => this.additionalReferences!.containsKey(txn, key),
      () => this.persistence.getQueryCache().containsKey(txn, key),
      () => {
        const orphanedAt = this.orphanedSequenceNumbers.get(key);
        return PersistencePromise.resolve(
          orphanedAt !== undefined && orphanedAt > upperBound
        );
      }
    ]);
  }
}
