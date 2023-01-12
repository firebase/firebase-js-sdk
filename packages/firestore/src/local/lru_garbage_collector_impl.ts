/**
 * @license
 * Copyright 2020 Google LLC
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

import { FirestoreError } from '../api';
import { ListenSequence } from '../core/listen_sequence';
import { ListenSequenceNumber } from '../core/types';
import { debugAssert } from '../util/assert';
import { AsyncQueue, DelayedOperation, TimerId } from '../util/async_queue';
import { getLogLevel, logDebug, LogLevel } from '../util/log';
import { primitiveComparator } from '../util/misc';
import { SortedSet } from '../util/sorted_set';

import { ignoreIfPrimaryLeaseLoss, LocalStore } from './local_store';
import {
  ActiveTargets,
  GC_DID_NOT_RUN,
  LRU_COLLECTION_DISABLED,
  LruDelegate,
  LruGarbageCollector,
  LruParams,
  LruResults
} from './lru_garbage_collector';
import { Scheduler } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { isIndexedDbTransactionError } from './simple_db';

const LOG_TAG = 'LruGarbageCollector';

export const LRU_MINIMUM_CACHE_SIZE_BYTES = 1 * 1024 * 1024;

/** How long we wait to try running LRU GC after SDK initialization. */
const INITIAL_GC_DELAY_MS = 1 * 60 * 1000;
/** Minimum amount of time between GC checks, after the first one. */
const REGULAR_GC_DELAY_MS = 5 * 60 * 1000;

// The type and comparator for the items contained in the SortedSet used in
// place of a priority queue for the RollingSequenceNumberBuffer.
type BufferEntry = [ListenSequenceNumber, number];

function bufferEntryComparator(
  [aSequence, aIndex]: BufferEntry,
  [bSequence, bIndex]: BufferEntry
): number {
  const seqCmp = primitiveComparator(aSequence, bSequence);
  if (seqCmp === 0) {
    // This order doesn't matter, but we can bias against churn by sorting
    // entries created earlier as less than newer entries.
    return primitiveComparator(aIndex, bIndex);
  } else {
    return seqCmp;
  }
}

/**
 * Used to calculate the nth sequence number. Keeps a rolling buffer of the
 * lowest n values passed to `addElement`, and finally reports the largest of
 * them in `maxValue`.
 */
class RollingSequenceNumberBuffer {
  private buffer: SortedSet<BufferEntry> = new SortedSet<BufferEntry>(
    bufferEntryComparator
  );

  private previousIndex = 0;

  constructor(private readonly maxElements: number) {}

  private nextIndex(): number {
    return ++this.previousIndex;
  }

  addElement(sequenceNumber: ListenSequenceNumber): void {
    const entry: BufferEntry = [sequenceNumber, this.nextIndex()];
    if (this.buffer.size < this.maxElements) {
      this.buffer = this.buffer.add(entry);
    } else {
      const highestValue = this.buffer.last()!;
      if (bufferEntryComparator(entry, highestValue) < 0) {
        this.buffer = this.buffer.delete(highestValue).add(entry);
      }
    }
  }

  get maxValue(): ListenSequenceNumber {
    // Guaranteed to be non-empty. If we decide we are not collecting any
    // sequence numbers, nthSequenceNumber below short-circuits. If we have
    // decided that we are collecting n sequence numbers, it's because n is some
    // percentage of the existing sequence numbers. That means we should never
    // be in a situation where we are collecting sequence numbers but don't
    // actually have any.
    return this.buffer.last()![0];
  }
}

/**
 * This class is responsible for the scheduling of LRU garbage collection. It handles checking
 * whether or not GC is enabled, as well as which delay to use before the next run.
 */
export class LruScheduler implements Scheduler {
  private gcTask: DelayedOperation<void> | null;

  constructor(
    private readonly garbageCollector: LruGarbageCollector,
    private readonly asyncQueue: AsyncQueue,
    private readonly localStore: LocalStore
  ) {
    this.gcTask = null;
  }

  start(): void {
    debugAssert(
      this.gcTask === null,
      'Cannot start an already started LruScheduler'
    );
    if (
      this.garbageCollector.params.cacheSizeCollectionThreshold !==
      LRU_COLLECTION_DISABLED
    ) {
      this.scheduleGC(INITIAL_GC_DELAY_MS);
    }
  }

  stop(): void {
    if (this.gcTask) {
      this.gcTask.cancel();
      this.gcTask = null;
    }
  }

  get started(): boolean {
    return this.gcTask !== null;
  }

  private scheduleGC(delay: number): void {
    debugAssert(
      this.gcTask === null,
      'Cannot schedule GC while a task is pending'
    );
    logDebug(LOG_TAG, `Garbage collection scheduled in ${delay}ms`);
    this.gcTask = this.asyncQueue.enqueueAfterDelay(
      TimerId.LruGarbageCollection,
      delay,
      async () => {
        this.gcTask = null;
        try {
          await this.localStore.collectGarbage(this.garbageCollector);
        } catch (e) {
          if (isIndexedDbTransactionError(e as Error)) {
            logDebug(
              LOG_TAG,
              'Ignoring IndexedDB error during garbage collection: ',
              e
            );
          } else {
            await ignoreIfPrimaryLeaseLoss(e as FirestoreError);
          }
        }
        await this.scheduleGC(REGULAR_GC_DELAY_MS);
      }
    );
  }
}

/**
 * Implements the steps for LRU garbage collection.
 */
class LruGarbageCollectorImpl implements LruGarbageCollector {
  constructor(
    private readonly delegate: LruDelegate,
    readonly params: LruParams
  ) {}

  calculateTargetCount(
    txn: PersistenceTransaction,
    percentile: number
  ): PersistencePromise<number> {
    return this.delegate.getSequenceNumberCount(txn).next(targetCount => {
      return Math.floor((percentile / 100.0) * targetCount);
    });
  }

  nthSequenceNumber(
    txn: PersistenceTransaction,
    n: number
  ): PersistencePromise<ListenSequenceNumber> {
    if (n === 0) {
      return PersistencePromise.resolve(ListenSequence.INVALID);
    }

    const buffer = new RollingSequenceNumberBuffer(n);
    return this.delegate
      .forEachTarget(txn, target => buffer.addElement(target.sequenceNumber))
      .next(() => {
        return this.delegate.forEachOrphanedDocumentSequenceNumber(
          txn,
          sequenceNumber => buffer.addElement(sequenceNumber)
        );
      })
      .next(() => buffer.maxValue);
  }

  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    return this.delegate.removeTargets(txn, upperBound, activeTargetIds);
  }

  removeOrphanedDocuments(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<number> {
    return this.delegate.removeOrphanedDocuments(txn, upperBound);
  }

  collect(
    txn: PersistenceTransaction,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<LruResults> {
    if (this.params.cacheSizeCollectionThreshold === LRU_COLLECTION_DISABLED) {
      logDebug('LruGarbageCollector', 'Garbage collection skipped; disabled');
      return PersistencePromise.resolve(GC_DID_NOT_RUN);
    }

    return this.getCacheSize(txn).next(cacheSize => {
      if (cacheSize < this.params.cacheSizeCollectionThreshold) {
        logDebug(
          'LruGarbageCollector',
          `Garbage collection skipped; Cache size ${cacheSize} ` +
            `is lower than threshold ${this.params.cacheSizeCollectionThreshold}`
        );
        return GC_DID_NOT_RUN;
      } else {
        return this.runGarbageCollection(txn, activeTargetIds);
      }
    });
  }

  getCacheSize(txn: PersistenceTransaction): PersistencePromise<number> {
    return this.delegate.getCacheSize(txn);
  }

  private runGarbageCollection(
    txn: PersistenceTransaction,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<LruResults> {
    let upperBoundSequenceNumber: number;
    let sequenceNumbersToCollect: number, targetsRemoved: number;
    // Timestamps for various pieces of the process
    let countedTargetsTs: number,
      foundUpperBoundTs: number,
      removedTargetsTs: number,
      removedDocumentsTs: number;
    const startTs = Date.now();
    return this.calculateTargetCount(txn, this.params.percentileToCollect)
      .next(sequenceNumbers => {
        // Cap at the configured max
        if (sequenceNumbers > this.params.maximumSequenceNumbersToCollect) {
          logDebug(
            'LruGarbageCollector',
            'Capping sequence numbers to collect down ' +
              `to the maximum of ${this.params.maximumSequenceNumbersToCollect} ` +
              `from ${sequenceNumbers}`
          );
          sequenceNumbersToCollect =
            this.params.maximumSequenceNumbersToCollect;
        } else {
          sequenceNumbersToCollect = sequenceNumbers;
        }
        countedTargetsTs = Date.now();

        return this.nthSequenceNumber(txn, sequenceNumbersToCollect);
      })
      .next(upperBound => {
        upperBoundSequenceNumber = upperBound;
        foundUpperBoundTs = Date.now();

        return this.removeTargets(
          txn,
          upperBoundSequenceNumber,
          activeTargetIds
        );
      })
      .next(numTargetsRemoved => {
        targetsRemoved = numTargetsRemoved;
        removedTargetsTs = Date.now();

        return this.removeOrphanedDocuments(txn, upperBoundSequenceNumber);
      })
      .next(documentsRemoved => {
        removedDocumentsTs = Date.now();

        if (getLogLevel() <= LogLevel.DEBUG) {
          const desc =
            'LRU Garbage Collection\n' +
            `\tCounted targets in ${countedTargetsTs - startTs}ms\n` +
            `\tDetermined least recently used ${sequenceNumbersToCollect} in ` +
            `${foundUpperBoundTs - countedTargetsTs}ms\n` +
            `\tRemoved ${targetsRemoved} targets in ` +
            `${removedTargetsTs - foundUpperBoundTs}ms\n` +
            `\tRemoved ${documentsRemoved} documents in ` +
            `${removedDocumentsTs - removedTargetsTs}ms\n` +
            `Total Duration: ${removedDocumentsTs - startTs}ms`;
          logDebug('LruGarbageCollector', desc);
        }

        return PersistencePromise.resolve<LruResults>({
          didRun: true,
          sequenceNumbersCollected: sequenceNumbersToCollect,
          targetsRemoved,
          documentsRemoved
        });
      });
  }
}

export function newLruGarbageCollector(
  delegate: LruDelegate,
  params: LruParams
): LruGarbageCollector {
  return new LruGarbageCollectorImpl(delegate, params);
}
