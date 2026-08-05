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

import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SdkLogRecord } from '@opentelemetry/sdk-logs';

/**
 * Represents a collection of spans and logs associated with a root span/trace.
 *
 * @internal
 */
export class EventList {
  logs: SdkLogRecord[] = [];
  spans: ReadableSpan[] = [];
}

/**
 * A shared storage engine that buffers telemetry logs and spans in memory,
 * organizing them by trace/log hierarchies and managing structural capacity limits.
 *
 * @internal
 */
export class TelemetryBufferStore {
  static readonly BUFFER_LIMIT = 1000;

  private readonly _rootTelemetryQueue: RootTelemetryQueue;
  private readonly _bufferLimit: number;
  private readonly _telemetryEmitBufferMap = new Map<
    string,
    EventList | SdkLogRecord
  >();
  private _totalTelemetryCount = 0;
  private _shouldAddLimitLog = false;

  /**
   * Creates a new instance of TelemetryBufferStore.
   *
   * @param bufferLimit - The maximum total count of telemetry items (spans + logs) allowed in the store. Defaults to 1000.
   * @param queueLimit - The maximum number of root telemetry items allowed in the eviction queue. Defaults to 100.
   */
  constructor(
    bufferLimit = TelemetryBufferStore.BUFFER_LIMIT,
    queueLimit?: number
  ) {
    this._bufferLimit = bufferLimit;
    this._rootTelemetryQueue = new RootTelemetryQueue(queueLimit);
  }

  /**
   * Called when any span (root or child) starts.
   * Handles capacity pruning if the overall buffer limit is reached,
   * and buffers the span in the correct trace container.
   *
   * @param _span - The span that has started.
   */
  addSpanOnStart(_span: ReadableSpan): void {
    const traceId = _span.spanContext().traceId;
    if (!_span.parentSpanContext) {
      // Root Span Path
      if (this._ensureBufferCapacity()) {
        const eventList = new EventList();
        this._telemetryEmitBufferMap.set(traceId, eventList);
        eventList.spans.push(_span);
        this._totalTelemetryCount++;
      }
    } else {
      // Child Span Path
      const eventList = this._telemetryEmitBufferMap.get(traceId);
      if (eventList instanceof EventList && this._ensureBufferCapacity()) {
        eventList.spans.push(_span);
        this._totalTelemetryCount++;
      }
    }
  }

  /**
   * Called when a root span ends.
   * Enqueues the trace ID in the root queue for eviction if it was successfully started.
   *
   * @param _span - The root span that has ended.
   */
  addRootSpanOnEnd(_span: ReadableSpan): void {
    if (!_span.parentSpanContext) {
      const traceId = _span.spanContext().traceId;
      if (this._telemetryEmitBufferMap.has(traceId)) {
        const evictedTraceId = this._rootTelemetryQueue.enqueue(traceId);
        if (evictedTraceId) {
          this._evictIdFromBuffer(evictedTraceId);
        }
      }
    }
  }

  /**
   * Called when a log record is emitted.
   * For child logs, checks buffer capacity and appends the log to the parent trace.
   * For root-level logs (emitted outside an active trace), creates a new standalone
   * log entry in the map and enqueues its UUID.
   *
   * @param _logRecord - The log record that was emitted.
   */
  addLogOnEmit(_logRecord: SdkLogRecord): void {
    const traceId = _logRecord.spanContext?.traceId;

    if (traceId) {
      // Child Log Path
      const eventList = this._telemetryEmitBufferMap.get(traceId);
      if (eventList instanceof EventList && this._ensureBufferCapacity()) {
        if (this._telemetryEmitBufferMap.has(traceId)) {
          eventList.logs.push(_logRecord);
          this._totalTelemetryCount++;
        }
      }
    } else {
      // Root Log Path
      if (this._ensureBufferCapacity()) {
        const uuid = this._generateUuid();
        this._telemetryEmitBufferMap.set(uuid, _logRecord);
        this._totalTelemetryCount++;

        const evictedTraceId = this._rootTelemetryQueue.enqueue(uuid);
        if (evictedTraceId) {
          this._evictIdFromBuffer(evictedTraceId);
        }
      }
    }
  }

  /**
   * Rapid check to ensure total telemetry count does not exceed the configured buffer limit.
   * If the limit is exceeded, it attempts to evict the oldest root telemetry item.
   *
   * @returns `true` if capacity is available (or was freed by eviction), or `false` if the buffer is full and no item could be evicted.
   */
  private _ensureBufferCapacity(): boolean {
    if (this._totalTelemetryCount >= this._bufferLimit) {
      if (this._rootTelemetryQueue.size === 0) {
        this._shouldAddLimitLog = true;
        return false;
      }
      const evictedTraceId = this._rootTelemetryQueue.dequeue();
      if (evictedTraceId) {
        this._evictIdFromBuffer(evictedTraceId);
      }
    }
    return true;
  }

  /**
   * Generates a unique UUID v4 format string.
   * Uses Web Crypto API when available, otherwise falls back to a pseudo-random Math.random-based generator.
   */
  private _generateUuid(): string {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Evicts a telemetry item (either a trace hierarchy or a standalone root log record) from the buffer
   * and decrements its size from the total telemetry counter.
   *
   * @param key - The map key (trace ID or log UUID) to evict.
   */
  private _evictIdFromBuffer(key: string): void {
    const item = this._telemetryEmitBufferMap.get(key);
    if (item) {
      if (item instanceof EventList) {
        this._totalTelemetryCount -= item.spans.length + item.logs.length;
      } else {
        this._totalTelemetryCount -= 1;
      }
      this._telemetryEmitBufferMap.delete(key);
    }
  }

  /** Clear all buffered telemetry and reset state. */
  clear(): void {
    this._rootTelemetryQueue.clear();
    this._telemetryEmitBufferMap.clear();
    this._totalTelemetryCount = 0;
    this._shouldAddLimitLog = false;
  }
}

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
   * Returns the ordered items currently in the queue.
   */
  getValues(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this._size; i++) {
      const idx = (this._head + i) % this._items.length;
      result.push(this._items[idx]!);
    }
    return result;
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
