/**
 * @license
 * Copyright 2017 Google LLC
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
import { ListenSequence } from '../core/listen_sequence';
import { SnapshotVersion } from '../core/snapshot_version';
import { ListenSequenceNumber, TargetId } from '../core/types';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { estimateByteSize } from '../model/values';
import { JsonProtoSerializer } from '../remote/serializer';
import { fail } from '../util/assert';
import { logDebug } from '../util/log';
import { ObjectMap } from '../util/obj_map';

import { DocumentOverlayCache } from './document_overlay_cache';
import { encodeResourcePath } from './encoded_resource_path';
import { IndexManager } from './index_manager';
import { LocalSerializer } from './local_serializer';
import {
  ActiveTargets,
  LruDelegate,
  LruGarbageCollector,
  LruParams
} from './lru_garbage_collector';
import { newLruGarbageCollector } from './lru_garbage_collector_impl';
import { MemoryBundleCache } from './memory_bundle_cache';
import { MemoryDocumentOverlayCache } from './memory_document_overlay_cache';
import { MemoryIndexManager } from './memory_index_manager';
import { MemoryMutationQueue } from './memory_mutation_queue';
import {
  MemoryRemoteDocumentCache,
  newMemoryRemoteDocumentCache
} from './memory_remote_document_cache';
import { MemoryTargetCache } from './memory_target_cache';
import { MutationQueue } from './mutation_queue';
import { Persistence, ReferenceDelegate } from './persistence';
import { PersistencePromise } from './persistence_promise';
import {
  PersistenceTransaction,
  PersistenceTransactionMode
} from './persistence_transaction';
import { ReferenceSet } from './reference_set';
import { TargetData } from './target_data';

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
  private readonly indexManager: MemoryIndexManager;
  private mutationQueues: { [user: string]: MemoryMutationQueue } = {};
  private overlays: { [user: string]: MemoryDocumentOverlayCache } = {};
  private readonly remoteDocumentCache: MemoryRemoteDocumentCache;
  private readonly targetCache: MemoryTargetCache;
  private readonly bundleCache: MemoryBundleCache;
  private readonly listenSequence = new ListenSequence(0);
  private serializer: LocalSerializer;

  private _started = false;

  readonly referenceDelegate: MemoryReferenceDelegate;

  /**
   * The constructor accepts a factory for creating a reference delegate. This
   * allows both the delegate and this instance to have strong references to
   * each other without having nullable fields that would then need to be
   * checked or asserted on every access.
   */
  constructor(
    referenceDelegateFactory: (p: MemoryPersistence) => MemoryReferenceDelegate,
    serializer: JsonProtoSerializer
  ) {
    this._started = true;
    this.referenceDelegate = referenceDelegateFactory(this);
    this.targetCache = new MemoryTargetCache(this);
    const sizer = (doc: Document): number =>
      this.referenceDelegate.documentSize(doc);
    this.indexManager = new MemoryIndexManager();
    this.remoteDocumentCache = newMemoryRemoteDocumentCache(sizer);
    this.serializer = new LocalSerializer(serializer);
    this.bundleCache = new MemoryBundleCache(this.serializer);
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    // No durable state to ensure is closed on shutdown.
    this._started = false;
    return Promise.resolve();
  }

  get started(): boolean {
    return this._started;
  }

  setDatabaseDeletedListener(): void {
    // No op.
  }

  setNetworkEnabled(): void {
    // No op.
  }

  getIndexManager(user: User): MemoryIndexManager {
    // We do not currently support indices for memory persistence, so we can
    // return the same shared instance of the memory index manager.
    return this.indexManager;
  }

  getDocumentOverlayCache(user: User): DocumentOverlayCache {
    let overlay = this.overlays[user.toKey()];
    if (!overlay) {
      overlay = new MemoryDocumentOverlayCache();
      this.overlays[user.toKey()] = overlay;
    }
    return overlay;
  }

  getMutationQueue(user: User, indexManager: IndexManager): MutationQueue {
    let queue = this.mutationQueues[user.toKey()];
    if (!queue) {
      queue = new MemoryMutationQueue(indexManager, this.referenceDelegate);
      this.mutationQueues[user.toKey()] = queue;
    }
    return queue;
  }

  getTargetCache(): MemoryTargetCache {
    return this.targetCache;
  }

  getRemoteDocumentCache(): MemoryRemoteDocumentCache {
    return this.remoteDocumentCache;
  }

  getBundleCache(): MemoryBundleCache {
    return this.bundleCache;
  }

  runTransaction<T>(
    action: string,
    mode: PersistenceTransactionMode,
    transactionOperation: (
      transaction: PersistenceTransaction
    ) => PersistencePromise<T>
  ): Promise<T> {
    logDebug(LOG_TAG, 'Starting transaction:', action);
    const txn = new MemoryTransaction(this.listenSequence.next());
    this.referenceDelegate.onTransactionStarted();
    return transactionOperation(txn)
      .next(result => {
        return this.referenceDelegate
          .onTransactionCommitted(txn)
          .next(() => result);
      })
      .toPromise()
      .then(result => {
        txn.raiseOnCommittedEvent();
        return result;
      });
  }

  mutationQueuesContainKey(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return PersistencePromise.or(
      Object.values(this.mutationQueues).map(
        queue => () => queue.containsKey(transaction, key)
      )
    );
  }
}

/**
 * Memory persistence is not actually transactional, but future implementations
 * may have transaction-scoped state.
 */
export class MemoryTransaction extends PersistenceTransaction {
  constructor(readonly currentSequenceNumber: ListenSequenceNumber) {
    super();
  }
}

export interface MemoryReferenceDelegate extends ReferenceDelegate {
  documentSize(doc: Document): number;
  onTransactionStarted(): void;
  onTransactionCommitted(txn: PersistenceTransaction): PersistencePromise<void>;
}

export class MemoryEagerDelegate implements MemoryReferenceDelegate {
  /** Tracks all documents that are active in Query views. */
  private localViewReferences: ReferenceSet = new ReferenceSet();
  /** The list of documents that are potentially GCed after each transaction. */
  private _orphanedDocuments: Set</* path= */ string> | null = null;

  private constructor(private readonly persistence: MemoryPersistence) {}

  static factory(persistence: MemoryPersistence): MemoryEagerDelegate {
    return new MemoryEagerDelegate(persistence);
  }

  private get orphanedDocuments(): Set<string> {
    if (!this._orphanedDocuments) {
      throw fail('orphanedDocuments is only valid during a transaction.');
    } else {
      return this._orphanedDocuments;
    }
  }

  addReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.localViewReferences.addReference(key, targetId);
    this.orphanedDocuments.delete(key.toString());
    return PersistencePromise.resolve();
  }

  removeReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.localViewReferences.removeReference(key, targetId);
    this.orphanedDocuments.add(key.toString());
    return PersistencePromise.resolve();
  }

  markPotentiallyOrphaned(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedDocuments.add(key.toString());
    return PersistencePromise.resolve();
  }

  removeTarget(
    txn: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    const orphaned = this.localViewReferences.removeReferencesForId(
      targetData.targetId
    );
    orphaned.forEach(key => this.orphanedDocuments.add(key.toString()));
    const cache = this.persistence.getTargetCache();
    return cache
      .getMatchingKeysForTargetId(txn, targetData.targetId)
      .next(keys => {
        keys.forEach(key => this.orphanedDocuments.add(key.toString()));
      })
      .next(() => cache.removeTargetData(txn, targetData));
  }

  onTransactionStarted(): void {
    this._orphanedDocuments = new Set<string>();
  }

  onTransactionCommitted(
    txn: PersistenceTransaction
  ): PersistencePromise<void> {
    // Remove newly orphaned documents.
    const cache = this.persistence.getRemoteDocumentCache();
    const changeBuffer = cache.newChangeBuffer();
    return PersistencePromise.forEach(
      this.orphanedDocuments,
      (path: string) => {
        const key = DocumentKey.fromPath(path);
        return this.isReferenced(txn, key).next(isReferenced => {
          if (!isReferenced) {
            changeBuffer.removeEntry(key, SnapshotVersion.min());
          }
        });
      }
    ).next(() => {
      this._orphanedDocuments = null;
      return changeBuffer.apply(txn);
    });
  }

  updateLimboDocument(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    return this.isReferenced(txn, key).next(isReferenced => {
      if (isReferenced) {
        this.orphanedDocuments.delete(key.toString());
      } else {
        this.orphanedDocuments.add(key.toString());
      }
    });
  }

  documentSize(doc: Document): number {
    // For eager GC, we don't care about the document size, there are no size thresholds.
    return 0;
  }

  private isReferenced(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return PersistencePromise.or([
      () =>
        PersistencePromise.resolve(this.localViewReferences.containsKey(key)),
      () => this.persistence.getTargetCache().containsKey(txn, key),
      () => this.persistence.mutationQueuesContainKey(txn, key)
    ]);
  }
}

export class MemoryLruDelegate implements ReferenceDelegate, LruDelegate {
  private orphanedSequenceNumbers: ObjectMap<
    DocumentKey,
    ListenSequenceNumber
  > = new ObjectMap(
    k => encodeResourcePath(k.path),
    (l, r) => l.isEqual(r)
  );

  readonly garbageCollector: LruGarbageCollector;

  constructor(
    private readonly persistence: MemoryPersistence,
    lruParams: LruParams
  ) {
    this.garbageCollector = newLruGarbageCollector(this, lruParams);
  }

  static factory(
    persistence: MemoryPersistence,
    lruParams: LruParams
  ): MemoryLruDelegate {
    return new MemoryLruDelegate(persistence, lruParams);
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
    f: (q: TargetData) => void
  ): PersistencePromise<void> {
    return this.persistence.getTargetCache().forEachTarget(txn, f);
  }

  getSequenceNumberCount(
    txn: PersistenceTransaction
  ): PersistencePromise<number> {
    const docCountPromise = this.orphanedDocumentCount(txn);
    const targetCountPromise = this.persistence
      .getTargetCache()
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

  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    return this.persistence
      .getTargetCache()
      .removeTargets(txn, upperBound, activeTargetIds);
  }

  removeOrphanedDocuments(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<number> {
    let count = 0;
    const cache = this.persistence.getRemoteDocumentCache();
    const changeBuffer = cache.newChangeBuffer();
    const p = cache.forEachDocumentKey(txn, key => {
      return this.isPinned(txn, key, upperBound).next(isPinned => {
        if (!isPinned) {
          count++;
          changeBuffer.removeEntry(key, SnapshotVersion.min());
        }
      });
    });
    return p.next(() => changeBuffer.apply(txn)).next(() => count);
  }

  markPotentiallyOrphaned(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedSequenceNumbers.set(key, txn.currentSequenceNumber);
    return PersistencePromise.resolve();
  }

  removeTarget(
    txn: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    const updated = targetData.withSequenceNumber(txn.currentSequenceNumber);
    return this.persistence.getTargetCache().updateTargetData(txn, updated);
  }

  addReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    key: DocumentKey
  ): PersistencePromise<void> {
    this.orphanedSequenceNumbers.set(key, txn.currentSequenceNumber);
    return PersistencePromise.resolve();
  }

  removeReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
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

  documentSize(document: Document): number {
    let documentSize = document.key.toString().length;
    if (document.isFoundDocument()) {
      documentSize += estimateByteSize(document.data.value);
    }
    return documentSize;
  }

  private isPinned(
    txn: PersistenceTransaction,
    key: DocumentKey,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<boolean> {
    return PersistencePromise.or([
      () => this.persistence.mutationQueuesContainKey(txn, key),
      () => this.persistence.getTargetCache().containsKey(txn, key),
      () => {
        const orphanedAt = this.orphanedSequenceNumbers.get(key);
        return PersistencePromise.resolve(
          orphanedAt !== undefined && orphanedAt > upperBound
        );
      }
    ]);
  }

  getCacheSize(txn: PersistenceTransaction): PersistencePromise<number> {
    return this.persistence.getRemoteDocumentCache().getSize(txn);
  }
}
