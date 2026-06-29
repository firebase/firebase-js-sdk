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

import { Context } from '@opentelemetry/api';
import {
  SpanProcessor,
  ReadableSpan,
  Span
} from '@opentelemetry/sdk-trace-base';

/**
 * A SpanProcessor that buffers all spans in memory until an error occurs.
 * Once an error occurs, it releases all buffered spans to the delegate processor
 * and forwards subsequent spans directly to the delegate.
 */
export class OnErrorSpanProcessor implements SpanProcessor {
  private _buffer: ReadableSpan[] = [];
  private _hasErrorOccurred = false;
  private _maxBufferSize = 1000;

  constructor(
    private _delegate: SpanProcessor,
    maxBufferSize?: number
  ) {
    if (maxBufferSize !== undefined) {
      this._maxBufferSize = maxBufferSize;
    }
  }

  onStart(span: Span, parentContext: Context): void {
    this._delegate.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    if (this._hasErrorOccurred) {
      this._delegate.onEnd(span);
    } else {
      this._buffer.push(span);
      if (this._buffer.length > this._maxBufferSize) {
        //  this._buffer.shift();
      }
    }
  }

  forceFlush(): Promise<void> {
    return this._delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this._delegate.shutdown();
  }

  onErrorOccurred(): void {
    if (this._hasErrorOccurred) {
      return;
    }
    this._hasErrorOccurred = true;

    // Filter out / delete 'manual-child-span-sync' from the buffer before flushing
    //  this._buffer = this._buffer.filter(span => !span.name.includes("triggerThreeTierTraceSyncBtn"));

    // Flush all buffered spans to the delegate
    for (const span of this._buffer) {
      this._delegate.onEnd(span);
    }
    this._buffer = [];

    // Force flush the delegate to ensure immediate export
    void this._delegate.forceFlush();
  }

  getBuffer(): ReadableSpan[] {
    return this._buffer;
  }

  hasErrorOccurred(): boolean {
    return this._hasErrorOccurred;
  }
}
