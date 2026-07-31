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

export const QUEUE_LIMIT = 100;
// TODO: Use to limit size of telemetryEmitBufferMap when implementing addSpan/addLog buffering capacity checks
// export const BUFFER_LIMIT = 1000;

/**
 * Represents a collection of spans and logs associated with a root span/trace.
 *
 * @internal
 */
export interface EventList {
  logs: SdkLogRecord[];
  spans: ReadableSpan[];
}

/**
 * A shared storage engine that buffers telemetry logs and spans in memory,
 * organizing them by trace/log hierarchies and managing structural capacity limits.
 *
 * @internal
 */
export class TelemetryBufferStore {
  // TODO: Will be activated when buffering logic is implemented in a future change
  // private readonly _rootTelemetryQueue = new RootTelemetryQueue();
  // TODO: Will be activated when buffering logic is implemented in a future change
  // private readonly _telemetryEmitBufferMap = new Map<
  //   string,
  //   EventList | SdkLogRecord
  // >();

  // TODO: Use to track if we need to emit a limit reached log record when capacity is exceeded
  // private _shouldAddLimitLog = false;

  addSpan(_span: ReadableSpan): void {
    // TODO: Add buffering logic
  }

  addLog(_logRecord: SdkLogRecord): void {
    // TODO: Add buffering logic
  }

  getBufferedSpans(): ReadableSpan[] {
    // TODO: Buffering logic will become active in a future change
    // const spans: ReadableSpan[] = [];
    // for (const entry of this._telemetryEmitBufferMap.values()) {
    //   if (entry && 'spans' in entry) {
    //     spans.push(...entry.spans);
    //   }
    // }
    // return spans;
    return [];
  }

  getBufferedLogs(): SdkLogRecord[] {
    // TODO: Buffering logic will become active in a future change
    // const logs: SdkLogRecord[] = [];
    // for (const entry of this._telemetryEmitBufferMap.values()) {
    //   if (entry) {
    //     if ('logs' in entry) {
    //       logs.push(...entry.logs);
    //     } else {
    //       logs.push(entry);
    //     }
    //   }
    // }
    // return logs;
    return [];
  }

  /** Clear all buffered telemetry and reset state. */
  clear(): void {
    // TODO: Buffering logic will become active in a future change
    // this._rootTelemetryQueue.clear();
    // TODO: Buffering logic will become active in a future change
    // this._telemetryEmitBufferMap.clear();
    // this._shouldAddLimitLog = false;
  }
}

/**
 * A type-safe queue designed for telemetry tracking with amortized O(1) performance
 * for both enqueue and dequeue operations.
 *
 * @internal
 */
export class RootTelemetryQueue {
  private _items: Array<string | null> = [];
  private _head = 0;

  constructor(private readonly _limit = QUEUE_LIMIT) {}

  get size(): number {
    return this._items.length - this._head;
  }

  enqueue(item: string): string | undefined {
    this._items.push(item);
    if (this.size > this._limit) {
      return this.dequeue();
    }
    return undefined;
  }

  dequeue(): string | undefined {
    if (this.size === 0) {
      return undefined;
    }
    const item = this._items[this._head];
    this._items[this._head] = null;
    this._head++;

    // Reclaim memory periodically
    if (this._head > this._limit) {
      this._items = this._items.slice(this._head);
      this._head = 0;
    }

    return item ?? undefined;
  }

  peek(): string | undefined {
    if (this.size === 0) {
      return undefined;
    }
    return this._items[this._head] ?? undefined;
  }

  clear(): void {
    this._items = [];
    this._head = 0;
  }
}
