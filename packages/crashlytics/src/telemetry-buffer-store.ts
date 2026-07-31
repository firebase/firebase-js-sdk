/**
 * @license
 * Copyright 2026 Google LLC
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

/**
 * A type-safe queue designed for telemetry tracking with amortized O(1) performance
 * for both enqueue and dequeue operations.
 *
 * @internal
 */
export class RootTelemetryQueue {
  static readonly LIMIT = 100;
  private readonly _items: Array<string | undefined>;
  private _head = 0;
  private _tail = 0;
  private _size = 0;

  constructor(private readonly _limit = RootTelemetryQueue.LIMIT) {
    if (_limit <= 0) {
      throw new Error('Limit must be a positive integer greater than 0');
    }
    this._items = new Array(this._limit).fill(undefined);
  }

  /**
   * Returns the current number of items in the queue.
   */
  get size(): number {
    return this._size;
  }

  /**
   * Enqueues an item into the queue.
   *
   * @param item - The item to enqueue.
   * @returns The evicted item (oldest) if the queue was full and had to drop an item,
   *          or `undefined` if enqueued without eviction.
   */
  enqueue(item: string): string | undefined {
    let evicted: string | undefined;
    if (this._size === this._limit) {
      evicted = this.dequeue();
    }
    this._items[this._tail] = item;
    this._tail = (this._tail + 1) % this._limit;
    this._size++;
    return evicted;
  }

  /**
   * Dequeues the oldest item from the queue.
   *
   * @returns The oldest enqueued string, or `undefined` if the queue is empty.
   */
  dequeue(): string | undefined {
    if (this._size === 0) {
      return undefined;
    }
    const item = this._items[this._head];
    this._items[this._head] = undefined;
    this._head = (this._head + 1) % this._limit;
    this._size--;
    return item;
  }

  /**
   * Returns the oldest item from the queue without removing it.
   *
   * @returns The oldest enqueued string, or `undefined` if the queue is empty.
   */
  peek(): string | undefined {
    if (this._size === 0) {
      return undefined;
    }
    return this._items[this._head];
  }

  /**
   * Clears all items from the queue and resets its state.
   */
  clear(): void {
    this._items.fill(undefined);
    this._head = 0;
    this._tail = 0;
    this._size = 0;
  }
}
