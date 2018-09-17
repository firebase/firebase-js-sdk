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
import { QueryData } from './query_data';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { ListenSequenceNumber } from '../core/types';
import { ListenSequence } from '../core/listen_sequence';
import { assert } from '../util/assert';
import { AnyJs } from '../util/misc';

/**
 * Persistence layers intending to use LRU Garbage collection should have reference delegates that
 * implement this interface. This interface defines the operations that the LRU garbage collector
 * needs from the persistence layer.
 */
export interface LruDelegate {
  readonly garbageCollector: LruGarbageCollector;

  getTargetCount(txn: PersistenceTransaction): PersistencePromise<number>;

  /** Enumerates all the targets in the QueryCache. */
  forEachTarget(
    txn: PersistenceTransaction,
    f: (target: QueryData) => void
  ): PersistencePromise<void>;

  /** Enumerates sequence numbers for documents not associated with a target. */
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
 * Describes an object whose keys are active target ids. We do not care about the type of the values.
 */
export type ActiveTargets = {
  [id: number]: AnyJs;
};

/**
 * A selective port of `java.util.PriorityQueue`
 * {@see <a href="https://github.com/openjdk-mirror/jdk7u-jdk/blob/master/src/share/classes/java/util/PriorityQueue.java">PriorityQueue.java</a>}
 * The queue does not grow and must have an initial capacity when it is constructed. Additionally, elements may only be
 * `poll()`'d and cannot be removed from any other position in the queue.
 */
class PriorityQueue<T> {
  private _size = 0;
  get size(): number {
    return this._size;
  }
  private readonly queue: T[];
  constructor(
    private readonly capacity: number,
    private readonly comparator: (a: T, b: T) => number
  ) {
    assert(capacity > 0, 'Capacity must be greater than 0');
    this.queue = new Array<T>(capacity);
  }

  add(elem: T): void {
    assert(this._size + 1 <= this.capacity, 'Queue is over capacity');
    if (this._size === 0) {
      this.queue[0] = elem;
      this._size = 1;
    } else {
      this.siftUp(elem);
    }
  }

  poll(): T | null {
    if (this._size === 0) {
      return null;
    }
    const result = this.queue[0];
    const newSize = --this._size;
    const last = this.queue[newSize];
    delete this.queue[newSize];
    if (newSize !== 0) {
      this.siftDown(last);
    }
    return result;
  }

  peek(): T | null {
    if (this._size > 0) {
      return this.queue[0];
    }
    return null;
  }

  private siftUp(elem: T): void {
    let k = this._size;
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      const toCheck = this.queue[parent];
      const comp = this.comparator(elem, toCheck);
      if (comp >= 0) {
        break;
      }
      this.queue[k] = toCheck;
      k = parent;
    }
    this.queue[k] = elem;
    this._size++;
  }

  private siftDown(lastElem: T): void {
    let k = 0;
    const half = this._size >>> 1;
    while (k < half) {
      let child = (k << 1) + 1;
      let toCheck = this.queue[child];
      const right = child + 1;
      if (
        right < this._size &&
        this.comparator(toCheck, this.queue[right]) > 0
      ) {
        toCheck = this.queue[right];
        child = right;
      }
      if (this.comparator(lastElem, toCheck) <= 0) {
        break;
      }
      this.queue[k] = toCheck;
      k = child;
    }
    this.queue[k] = lastElem;
  }
}

/**
 * Used to calculate the nth sequence number. Keeps a rolling buffer of the lowest n values passed
 * to `addElement`, and finally reports the largest of them in `maxValue`.
 */
class RollingSequenceNumberBuffer {
  private queue: PriorityQueue<ListenSequenceNumber>;

  // Invert the comparison because we want to keep the smallest values.
  private static COMPARATOR: (
    a: ListenSequenceNumber,
    b: ListenSequenceNumber
  ) => number = (a, b) => {
    if (b < a) {
      return -1;
    } else if (b === a) {
      return 0;
    }
    return 1;
  };

  constructor(private readonly maxElements: number) {
    this.queue = new PriorityQueue(
      maxElements,
      RollingSequenceNumberBuffer.COMPARATOR
    );
  }

  addElement(sequenceNumber: ListenSequenceNumber): void {
    if (this.queue.size < this.maxElements) {
      this.queue.add(sequenceNumber);
    } else {
      // Note: use first because we have inverted the comparison
      const highestValue = this.queue.peek()!;
      if (sequenceNumber < highestValue) {
        this.queue.poll();
        this.queue.add(sequenceNumber);
      }
    }
  }

  get maxValue(): ListenSequenceNumber {
    return this.queue.peek()!;
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
    return this.delegate.getTargetCount(txn).next(targetCount => {
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
