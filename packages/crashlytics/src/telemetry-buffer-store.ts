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
import { SeverityNumber } from '@opentelemetry/api-logs';

/**
 * Checks if a telemetry event is a Span.
 *
 * @param event - The telemetry event to check.
 */
function isSpan(event: ReadableSpan | SdkLogRecord): event is ReadableSpan {
  return typeof event.spanContext === 'function';
}

/**
 * Checks if a telemetry event (span or log) is a root event.
 *
 * @param event - The telemetry event to check.
 */
function isRootEvent(event: ReadableSpan | SdkLogRecord): boolean {
  if (isSpan(event)) {
    return event.parentSpanContext === undefined;
  }
  return event.spanContext?.traceId === undefined;
}

/**
 * Calculates the EventType of a given telemetry event.
 *
 * @param event - The telemetry event.
 */
function getEventType(event: ReadableSpan | SdkLogRecord): EventType {
  if (isSpan(event)) {
    return isRootEvent(event) ? EventType.RootSpan : EventType.ChildSpan;
  }
  return isRootEvent(event) ? EventType.RootLog : EventType.ChildLog;
}

/**
 * Represents a collection of spans and logs associated with a root span/trace.
 */
class TraceEvents {
  logs = new Set<SdkLogRecord>();
  spans = new Set<ReadableSpan>();
  isTraceQueuedForExport = false;

  /**
   * Adds a telemetry event (span or log) to the collection.
   *
   * @param event - The telemetry event to add.
   */
  add(event: ReadableSpan | SdkLogRecord): void {
    if (isSpan(event)) {
      this.spans.add(event);
    } else {
      this.logs.add(event);
    }
  }

  /**
   * Checks if a telemetry event is already in the collection.
   *
   * @param event - The telemetry event to check.
   */
  has(event: ReadableSpan | SdkLogRecord): boolean {
    if (isSpan(event)) {
      return this.spans.has(event);
    } else {
      return this.logs.has(event);
    }
  }

  /**
   * Marks this trace as queued for export.
   */
  markTraceQueuedForExport(): void {
    this.isTraceQueuedForExport = true;
  }
}

/**
 * Represents the type of a telemetry event.
 *
 * @internal
 */
export enum EventType {
  RootSpan = 'RootSpan',
  RootLog = 'RootLog',
  ChildSpan = 'ChildSpan',
  ChildLog = 'ChildLog'
}

/**
 * Represents the identifier for a telemetry event buffer, which can be a trace ID or a generated UUID.
 *
 * @internal
 */
export type EventId = string;

/**
 * Represents the type of telemetry data buffered in memory.
 * Can be a TraceEvents collection containing spans and logs for a trace, or a standalone SdkLogRecord.
 *
 * @internal
 */
export type EventData = TraceEvents | SdkLogRecord;

/**
 * A shared storage engine that buffers telemetry logs and spans in memory,
 * organizing them by trace/log hierarchies and managing structural capacity limits.
 *
 * @internal
 */
export class TelemetryStore {
  static readonly DEFAULT_BUFFER_LIMIT = 1000;

  private readonly _rootTelemetryQueue: RootTelemetryQueue;
  private readonly _bufferLimit: number;
  private readonly _telemetryBufferMap = new Map<EventId, EventData>();
  private _totalTelemetryCount = 0;
  private _shouldAddLimitLog = false; // Flag indicating whether a limit log entry should be added when buffer limits are exceeded.

  /**
   * Creates a new instance of TelemetryStore.
   *
   * @param bufferLimit - The maximum total count of telemetry items (spans + logs) allowed in the store. Defaults to 1000.
   * @param queueLimit - The maximum number of root telemetry items allowed in the eviction queue. Defaults to 100.
   */
  constructor(
    bufferLimit = TelemetryStore.DEFAULT_BUFFER_LIMIT,
    queueLimit?: number
  ) {
    this._bufferLimit = bufferLimit;
    this._rootTelemetryQueue = new RootTelemetryQueue(queueLimit);
  }

  /**
   * Adds a telemetry event (either a span or log) to the store.
   * Organizes the events by their trace or standalone hierarchies and evicts the oldest items if capacity is exceeded.
   *
   * @param event - The telemetry event to add.
   */
  add(event: ReadableSpan | SdkLogRecord): void {
    const eventId = this._getEventId(event);

    // We have a root event that already exists in the buffer, exit
    if (isRootEvent(event) && this._telemetryBufferMap.has(eventId)) {
      return;
    }

    // We have a child event who has no root in the buffer because we stopped collection
    if (!isRootEvent(event) && !this._telemetryBufferMap.has(eventId)) {
      return;
    }

    if (!this._bufferHasCapacity()) {
      if (this._isQueueEmpty()) {
        this._shouldAddLimitLog = true;
        return;
      }
      this._evictOldest();
    }

    const eventType = getEventType(event);
    switch (eventType) {
      case EventType.RootSpan: {
        const traceEvents = new TraceEvents();
        traceEvents.add(event);
        this._telemetryBufferMap.set(eventId, traceEvents);
        this._totalTelemetryCount++;
        return;
      }
      case EventType.RootLog: {
        this._telemetryBufferMap.set(eventId, event as SdkLogRecord);
        if (this._rootTelemetryQueue.isFull()) {
          this._evictOldest();
        }
        this._rootTelemetryQueue.enqueue(eventId);
        this._totalTelemetryCount++;
        return;
      }
      case EventType.ChildSpan:
      case EventType.ChildLog: {
        const traceEvents = this._telemetryBufferMap.get(eventId);
        if (
          traceEvents &&
          traceEvents instanceof TraceEvents &&
          !traceEvents.has(event)
        ) {
          traceEvents.add(event);
          this._totalTelemetryCount++;
        }
        return;
      }
      default:
        break;
    }
  }

  /**
   * Updates an existing span in the store.
   * If the span is a root span, it enqueues it, marking it as completed.
   *
   * @param event - The span to update.
   */
  update(event: ReadableSpan): void {
    if (!isRootEvent(event)) {
      return;
    }

    const eventId = this._getEventId(event);
    const traceEvents = this._telemetryBufferMap.get(eventId);
    if (traceEvents && traceEvents instanceof TraceEvents) {
      if (traceEvents.isTraceQueuedForExport) {
        return;
      }
      if (this._rootTelemetryQueue.isFull()) {
        this._evictOldest();
      }
      this._rootTelemetryQueue.enqueue(eventId);
      traceEvents.markTraceQueuedForExport();
    }
  }

  /**
   * Retrieves the ID associated with a telemetry event.
   * For root logs, generates a new UUID.
   *
   * @param event - The telemetry event.
   */
  private _getEventId(event: ReadableSpan | SdkLogRecord): EventId {
    if (isSpan(event)) {
      return event.spanContext().traceId;
    }
    return event.spanContext?.traceId ?? this._generateUuid();
  }

  /**
   * Checks if the buffer currently has capacity for more telemetry events.
   */
  private _bufferHasCapacity(): boolean {
    return this._totalTelemetryCount < this._bufferLimit;
  }

  /**
   * Checks if the root telemetry queue is empty.
   */
  private _isQueueEmpty(): boolean {
    return this._rootTelemetryQueue.size === 0;
  }

  /**
   * Evicts the oldest root telemetry item (trace or root log) to free up buffer capacity.
   */
  private _evictOldest(): void {
    const evictedTraceId = this._rootTelemetryQueue.dequeue();
    if (evictedTraceId) {
      this._maybeEvictIdFromBuffer(evictedTraceId);
    }
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
  private _maybeEvictIdFromBuffer(key: EventId): void {
    const eventData = this._telemetryBufferMap.get(key);
    if (eventData) {
      if (eventData instanceof TraceEvents) {
        this._totalTelemetryCount -= eventData.spans.size + eventData.logs.size;
      } else {
        this._totalTelemetryCount -= 1;
      }
      this._telemetryBufferMap.delete(key);
    }
  }

  /** The total count of all telemetry items (spans and logs) currently in the store. */
  get totalTelemetryCount(): number {
    return this._totalTelemetryCount;
  }

  /**
   * Gets all buffered spans from completed root traces currently in the queue.
   */
  getSpansToExport(): ReadableSpan[] {
    const spans: ReadableSpan[] = [];
    for (const key of this._rootTelemetryQueue.getValues()) {
      const item = this._telemetryBufferMap.get(key);
      if (item instanceof TraceEvents) {
        spans.push(...item.spans);
      }
    }
    return spans;
  }

  /**
   * Gets all buffered log records from completed root traces and standalone root logs currently in the queue.
   */
  getLogsToExport(): SdkLogRecord[] {
    const logs: SdkLogRecord[] = [];

    if (this._shouldAddLimitLog) {
      const limitLog = {
        severityNumber: SeverityNumber.INFO,
        body: 'Telemetry buffer limit reached. Some telemetry events were dropped.'
      } as SdkLogRecord;

      logs.push(limitLog);
    }

    for (const key of this._rootTelemetryQueue.getValues()) {
      const item = this._telemetryBufferMap.get(key);
      if (item instanceof TraceEvents) {
        logs.push(...item.logs);
      } else if (item) {
        logs.push(item);
      }
    }
    return logs;
  }

  /** Clear all buffered telemetry and reset state. */
  clear(): void {
    this._rootTelemetryQueue.clear();
    this._telemetryBufferMap.clear();
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
  private readonly _items: Array<EventId | undefined>;
  private _head = 0;
  private _tail = 0;
  private _size = 0;

  /**
   * Creates a new instance of RootTelemetryQueue.
   *
   * @param _limit - The maximum size limit of the queue. Defaults to 100.
   */
  constructor(private readonly _limit = RootTelemetryQueue.LIMIT) {
    if (_limit <= 0) {
      throw new Error('Limit must be a positive integer greater than 0');
    }
    this._items = new Array(this._limit).fill(undefined);
  }

  /**
   * Gets the current number of items in the queue.
   */
  get size(): number {
    return this._size;
  }

  /**
   * Checks if the queue has reached its maximum size limit.
   */
  isFull(): boolean {
    return this._size === this._limit;
  }

  /**
   * Enqueues an item into the queue.
   * If the queue is already full, this operation does nothing.
   *
   * @param item - The item to enqueue.
   */
  enqueue(item: EventId): void {
    if (this._size === this._limit) {
      return;
    }
    this._items[this._tail] = item;
    this._tail = (this._tail + 1) % this._limit;
    this._size++;
  }

  /**
   * Dequeues the oldest item from the queue.
   */
  dequeue(): EventId | undefined {
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
   * Gets the oldest item from the queue without removing it, or `undefined` if the queue is empty.
   */
  peek(): EventId | undefined {
    if (this._size === 0) {
      return undefined;
    }
    return this._items[this._head];
  }

  /**
   * Gets the ordered items currently in the queue.
   */
  getValues(): EventId[] {
    const result: EventId[] = [];
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
