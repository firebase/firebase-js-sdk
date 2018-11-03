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
import { MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { JsonProtoSerializer } from '../remote/serializer';
import { fail } from '../util/assert';
import { debug } from '../util/log';
import { AnyJs } from '../util/misc';
import * as obj from '../util/obj';
import { ObjectMap } from '../util/obj_map';
import { encode } from './encoded_resource_path';
import { LocalSerializer } from './local_serializer';
import {
  ActiveTargets,
  LruDelegate,
  LruGarbageCollector
} from './lru_garbage_collector';

import { ListenSequence } from '../core/listen_sequence';
import { ListenSequenceNumber } from '../core/types';
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
  private mutationQueues: { [user: string]: MemoryMutationQueue } = {};
  private readonly remoteDocumentCache: MemoryRemoteDocumentCache;
  private readonly queryCache: MemoryQueryCache;
  private readonly listenSequence = new ListenSequence(0);

  private _started = false;

  readonly referenceDelegate: MemoryLruDelegate | MemoryEagerDelegate;

  static createLruPersistence(
    clientId: ClientId,
    serializer: JsonProtoSerializer
  ): MemoryPersistence {
    return new MemoryPersistence(clientId, /* isEager= */ false, serializer);
  }

  static createEagerPersistence(
    clientId: ClientId,
    serializer: JsonProtoSerializer
  ): MemoryPersistence {
    return new MemoryPersistence(clientId, /* isEager= */ true, serializer);
  }

  private constructor(
    private readonly clientId: ClientId,
    isEager: boolean,
    serializer: JsonProtoSerializer
  ) {
    this._started = true;
    if (isEager) {
      this.referenceDelegate = new MemoryEagerDelegate(this);
    } else {
      this.referenceDelegate = new MemoryLruDelegate(
        this,
        new LocalSerializer(serializer)
      );
    }
    this.queryCache = new MemoryQueryCache(this);
    const sizer = (doc: MaybeDocument) =>
      this.referenceDelegate.documentSize(doc);
    this.remoteDocumentCache = new MemoryRemoteDocumentCache(sizer);
  }

  shutdown(deleteData?: boolean): Promise<void> {
    // No durable state to ensure is closed on shutdown.
    this._started = false;
    return Promise.resolve();
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
      queue = new MemoryMutationQueue(this.referenceDelegate);
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
    const txn = new MemoryTransaction(this.listenSequence.next());
    this.referenceDelegate.onTransactionStarted();
    return transactionOperation(txn)
      .next(result => {
        return this.referenceDelegate
          .onTransactionCommitted(txn)
          .next(() => result);
      })
      .toPromise();
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

export class MemoryEagerDelegate implements ReferenceDelegate {
  private inMemoryPins: ReferenceSet | null;
  private orphanedDocuments: Set<DocumentKey>;

  constructor(private readonly persistence: MemoryPersistence) {}

  setInMemoryPins(inMemoryPins: ReferenceSet): void {
    this.inMemoryPins = inMemoryPins;
  }

  addReference(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedDocuments.delete(key);
    return PersistencePromise.resolve();
  }

  removeReference(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedDocuments.add(key);
    return PersistencePromise.resolve();
  }

  removeMutationReference(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedDocuments.add(key);
    return PersistencePromise.resolve();
  }

  removeTarget(
    txn: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    const cache = this.persistence.getQueryCache();
    return cache
      .getMatchingKeysForTargetId(txn, queryData.targetId)
      .next(keys => {
        keys.forEach(key => this.orphanedDocuments.add(key));
      })
      .next(() => cache.removeQueryData(txn, queryData));
  }

  onTransactionStarted(): void {
    this.orphanedDocuments = new Set<DocumentKey>();
  }

  onTransactionCommitted(
    txn: PersistenceTransaction
  ): PersistencePromise<void> {
    const cache = this.persistence.getRemoteDocumentCache();
    return PersistencePromise.forEach(this.orphanedDocuments, key => {
      return this.isReferenced(txn, key).next(isReferenced => {
        if (!isReferenced) {
          // Since this is the eager delegate and memory persistence,
          // we don't care about the size of documents. We don't track
          // the size of the cache for eager GC.
          return cache.removeEntry(txn, key).next(() => {});
        }
        return PersistencePromise.resolve();
      });
    });
  }

  updateLimboDocument(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    return this.isReferenced(txn, key).next(isReferenced => {
      if (isReferenced) {
        this.orphanedDocuments.delete(key);
      } else {
        this.orphanedDocuments.add(key);
      }
    });
  }

  documentSize(doc: MaybeDocument): number {
    // For eager GC, we don't care about the document size, there are no size thresholds.
    return 0;
  }

  private isReferenced(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return PersistencePromise.or([
      () => this.persistence.getQueryCache().containsKey(txn, key),
      () => this.persistence.mutationQueuesContainKey(txn, key),
      () => PersistencePromise.resolve(this.inMemoryPins!.containsKey(key))
    ]);
  }
}

export class MemoryLruDelegate implements ReferenceDelegate, LruDelegate {
  private inMemoryPins: ReferenceSet | null;
  private orphanedSequenceNumbers: ObjectMap<
    DocumentKey,
    ListenSequenceNumber
  > = new ObjectMap(k => encode(k.path));

  readonly garbageCollector: LruGarbageCollector;

  constructor(
    private readonly persistence: MemoryPersistence,
    private readonly serializer: LocalSerializer
  ) {
    this.garbageCollector = new LruGarbageCollector(this);
  }

  // No-ops, present so memory persistence doesn't have to care which delegate
  // it has.
  onTransactionStarted(): void {}

  onTransactionCommitted(
    txn: PersistenceTransaction
  ): PersistencePromise<void> {
    return PersistencePromise.resolve();
  }

  forEachTarget(
    txn: PersistenceTransaction,
    f: (q: QueryData) => void
  ): PersistencePromise<void> {
    return this.persistence.getQueryCache().forEachTarget(txn, f);
  }

  getSequenceNumberCount(
    txn: PersistenceTransaction
  ): PersistencePromise<number> {
    const docCountPromise = this.orphanedDocumentCount(txn);
    const targetCountPromise = this.persistence
      .getQueryCache()
      .getTargetCount(txn);
    return targetCountPromise.next(targetCount =>
      docCountPromise.next(docCount => targetCount + docCount)
    );
  }

  private orphanedDocumentCount(
    txn: PersistenceTransaction
  ): PersistencePromise<number> {
    let orphanedCount = 0;
    return this.forEachOrphanedDocumentSequenceNumber(txn, _ => {
      orphanedCount++;
    }).next(() => orphanedCount);
  }

  forEachOrphanedDocumentSequenceNumber(
    txn: PersistenceTransaction,
    f: (sequenceNumber: ListenSequenceNumber) => void
  ): PersistencePromise<void> {
    return PersistencePromise.forEach(
      this.orphanedSequenceNumbers,
      (key, sequenceNumber) => {
        // Pass in the exact sequence number as the upper bound so we know it won't be pinned by
        // being too recent.
        return this.isPinned(txn, key, sequenceNumber).next(isPinned => {
          if (!isPinned) {
            return f(sequenceNumber);
          } else {
            return PersistencePromise.resolve();
          }
        });
      }
    );
  }

  setInMemoryPins(inMemoryPins: ReferenceSet): void {
    this.inMemoryPins = inMemoryPins;
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
          // The memory remote document cache does its own byte
          // accounting on removal. This is ok because updating the size
          // for memory persistence does not incur IO.
          return cache.removeEntry(txn, key).next();
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

  documentSize(maybeDoc: MaybeDocument): number {
    const remoteDocument = this.serializer.toDbRemoteDocument(maybeDoc);
    let value: AnyJs;
    if (remoteDocument.document) {
      value = remoteDocument.document;
    } else if (remoteDocument.unknownDocument) {
      value = remoteDocument.unknownDocument;
    } else if (remoteDocument.noDocument) {
      value = remoteDocument.noDocument;
    } else {
      throw fail('Unknown remote document type');
    }
    return JSON.stringify(value).length;
  }

  private isPinned(
    txn: PersistenceTransaction,
    key: DocumentKey,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<boolean> {
    return PersistencePromise.or([
      () => this.persistence.mutationQueuesContainKey(txn, key),
      () => PersistencePromise.resolve(this.inMemoryPins!.containsKey(key)),
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
