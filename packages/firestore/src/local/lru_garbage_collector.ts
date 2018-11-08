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

import { ListenSequence } from '../core/listen_sequence';
import { ListenSequenceNumber } from '../core/types';
import { AnyJs, primitiveComparator } from '../util/misc';
import { SortedSet } from '../util/sorted_set';
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

/** Implements the steps for LRU garbage collection. */
export class LruGarbageCollector {
  constructor(private readonly delegate: LruDelegate) {}

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
}
