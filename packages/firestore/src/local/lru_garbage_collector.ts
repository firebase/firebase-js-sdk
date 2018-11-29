/**
 * Copyright 2018 Google Inc.
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

import { CACHE_SIZE_UNLIMITED } from '../api/database';
import { ListenSequence } from '../core/listen_sequence';
import { ListenSequenceNumber } from '../core/types';
import { AsyncQueue, TimerId } from '../util/async_queue';
import * as log from '../util/log';
import { AnyJs, primitiveComparator } from '../util/misc';
import { CancelablePromise } from '../util/promise';
import { SortedSet } from '../util/sorted_set';
import { LocalStore } from './local_store';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryData } from './query_data';

/**
 * Persistence layers intending to use LRU Garbage collection should have reference delegates that
 * implement this interface. This interface defines the operations that the LRU garbage collector
 * needs from the persistence layer.
 */
export interface LruDelegate {
  readonly garbageCollector: LruGarbageCollector;

  /** Enumerates all the targets in the QueryCache. */
  forEachTarget(
    txn: PersistenceTransaction,
    f: (target: QueryData) => void
  ): PersistencePromise<void>;

  getSequenceNumberCount(
    txn: PersistenceTransaction
  ): PersistencePromise<number>;

  /**
   * Enumerates sequence numbers for documents not associated with a target.
   * Note that this may include duplicate sequence numbers.
   */
  forEachOrphanedDocumentSequenceNumber(
    txn: PersistenceTransaction,
    f: (sequenceNumber: ListenSequenceNumber) => void
  ): PersistencePromise<void>;

  /**
   * Removes all targets that have a sequence number less than or equal to `upperBound`, and are not
   * present in the `activeTargetIds` set.
   *
   * @return the number of targets removed.
   */
  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number>;

  /**
   * Removes all unreferenced documents from the cache that have a sequence number less than or
   * equal to the given `upperBound`.
   *
   * @return the number of documents removed.
   */
  removeOrphanedDocuments(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<number>;

  getCacheSize(txn: PersistenceTransaction): PersistencePromise<number>;
}

/**
 * Describes an object whose keys are active target ids. We do not care about the type of the
 * values.
 */
export type ActiveTargets = {
  [id: number]: AnyJs;
};

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

export type LruResults = {
  hasRun: boolean;
  sequenceNumbersCollected: number;
  targetsRemoved: number;
  documentsRemoved: number;
};

function gcDidNotRun(): LruResults {
  return {
    hasRun: false,
    sequenceNumbersCollected: 0,
    targetsRemoved: 0,
    documentsRemoved: 0
  };
}

export class LruParams {
  static readonly COLLECTION_DISABLED = -1;
  static readonly DEFAULT_CACHE_SIZE_BYTES = 40 * 1024 * 1024;
  private static readonly DEFAULT_COLLECTION_PERCENTILE = 10;
  private static readonly DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT = 1000;

  static withCacheSize(cacheSize: number): LruParams {
    return new LruParams(
      cacheSize,
      LruParams.DEFAULT_COLLECTION_PERCENTILE,
      LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT
    );
  }

  static default(): LruParams {
    return new LruParams(
      LruParams.DEFAULT_CACHE_SIZE_BYTES,
      LruParams.DEFAULT_COLLECTION_PERCENTILE,
      LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT
    );
  }

  static disabled(): LruParams {
    return new LruParams(LruParams.COLLECTION_DISABLED, 0, 0);
  }

  constructor(
    readonly minBytesThreshold: number,
    readonly percentileToCollect: number,
    readonly maximumSequenceNumbersToCollect: number
  ) {}
}

/** How long we wait to try running LRU GC after SDK initialization. */
const INITIAL_GC_DELAY_MS = 1 * 60 * 1000;
/** Minimum amount of time between GC checks, after the first one. */
const REGULAR_GC_DELAY_MS = 5 * 60 * 1000;

/**
 * This class is responsible for the scheduling of LRU garbage collection. It handles checking
 * whether or not GC is enabled, as well as which delay to use before the next run.
 */
export class LruScheduler {
  private hasRun: boolean;
  private gcTask?: CancelablePromise<void>;

  constructor(
    private readonly garbageCollector: LruGarbageCollector,
    private readonly asyncQueue: AsyncQueue,
    private readonly localStore: LocalStore
  ) {}

  start(): void {
    if (
      this.garbageCollector.params.minBytesThreshold !== CACHE_SIZE_UNLIMITED
    ) {
      this.scheduleGC();
    }
  }

  stop(): void {
    if (this.gcTask) {
      this.gcTask.cancel();
    }
  }

  private scheduleGC(): void {
    const delay = this.hasRun ? REGULAR_GC_DELAY_MS : INITIAL_GC_DELAY_MS;
    log.debug(
      'LruGarbageCollector',
      `Garbage collection scheduled in ${delay}ms`
    );
    this.gcTask = this.asyncQueue.enqueueAfterDelay(
      TimerId.LruGarbageCollection,
      delay,
      () => {
        this.hasRun = true;
        return this.localStore
          .collectGarbage(this.garbageCollector)
          .then(() => this.scheduleGC());
      }
    );
  }
}

/** Implements the steps for LRU garbage collection. */
export class LruGarbageCollector {
  constructor(
    private readonly delegate: LruDelegate,
    readonly params: LruParams
  ) {}

  /** Given a percentile of target to collect, returns the number of targets to collect. */
  calculateTargetCount(
    txn: PersistenceTransaction,
    percentile: number
  ): PersistencePromise<number> {
    return this.delegate.getSequenceNumberCount(txn).next(targetCount => {
      return Math.floor(percentile / 100.0 * targetCount);
    });
  }

  /** Returns the nth sequence number, counting in order from the smallest. */
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

  /**
   * Removes targets with a sequence number equal to or less than the given upper bound, and removes
   * document associations with those targets.
   */
  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    return this.delegate.removeTargets(txn, upperBound, activeTargetIds);
  }

  /**
   * Removes documents that have a sequence number equal to or less than the upper bound and are not
   * otherwise pinned.
   */
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
    if (this.params.minBytesThreshold === LruParams.COLLECTION_DISABLED) {
      log.debug('LruGarbageCollector', 'Garbage collection skipped; disabled');
      return PersistencePromise.resolve(gcDidNotRun());
    }

    return this.getCacheSize(txn).next(cacheSize => {
      if (cacheSize < this.params.minBytesThreshold) {
        log.debug(
          'LruGarbageCollector',
          `Garbage collection skipped; Cache size ${cacheSize} ` +
            `is lower than threshold ${this.params.minBytesThreshold}`
        );
        return gcDidNotRun();
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
    let sequenceNumbersCollected, targetsRemoved: number;
    // Timestamps for various pieces of the process
    let startTs: number,
      countedTargetsTs: number,
      foundUpperBoundTs: number,
      removedTargetsTs: number,
      removedDocumentsTs: number;
    startTs = new Date().getTime();
    return this.calculateTargetCount(txn, this.params.percentileToCollect)
      .next(sequenceNumbers => {
        // Cap at the configurated max
        if (
          sequenceNumbersCollected > this.params.maximumSequenceNumbersToCollect
        ) {
          log.debug(
            'LruGarbageCollector',
            'Capping sequence numbers to collect down ' +
              `to the maximum of ${
                this.params.maximumSequenceNumbersToCollect
              } ` +
              `from ${sequenceNumbers}`
          );
          sequenceNumbersCollected = this.params
            .maximumSequenceNumbersToCollect;
        } else {
          sequenceNumbersCollected = sequenceNumbers;
        }
        countedTargetsTs = new Date().getTime();

        return this.nthSequenceNumber(txn, sequenceNumbersCollected);
      })
      .next(upperBound => {
        upperBoundSequenceNumber = upperBound;
        foundUpperBoundTs = new Date().getTime();

        return this.removeTargets(
          txn,
          upperBoundSequenceNumber,
          activeTargetIds
        );
      })
      .next(numTargetsRemoved => {
        targetsRemoved = numTargetsRemoved;
        removedTargetsTs = new Date().getTime();

        return this.removeOrphanedDocuments(txn, upperBoundSequenceNumber);
      })
      .next(documentsRemoved => {
        removedDocumentsTs = new Date().getTime();

        if (log.getLogLevel() === log.LogLevel.DEBUG) {
          let desc = 'LRU Garbage Collection\n';
          desc += `\tCounted targets in ${countedTargetsTs - startTs}ms\n`;
          desc +=
            `\tDetermined least recently used ${sequenceNumbersCollected} in ` +
            `${foundUpperBoundTs - countedTargetsTs}ms\n`;
          desc +=
            `\tRemoved ${targetsRemoved} targets in ` +
            `${removedTargetsTs - foundUpperBoundTs}ms\n`;
          desc +=
            `\tRemoved ${documentsRemoved} documents in ` +
            `${removedDocumentsTs - removedTargetsTs}ms\n`;
          desc += `Total Duration: ${removedDocumentsTs - startTs}ms`;
          log.debug('LruGarbageCollector', desc);
        }

        return PersistencePromise.resolve({
          hasRun: true,
          sequenceNumbersCollected,
          targetsRemoved,
          documentsRemoved
        });
      });
  }
}
