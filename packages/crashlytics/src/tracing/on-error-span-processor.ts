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

import {
  BatchSpanProcessor,
  SpanExporter,
  ReadableSpan
} from '@opentelemetry/sdk-trace-base';

/**
 * A BatchSpanProcessor that buffers all spans in memory until an error occurs.
 * Once an error occurs, it releases all buffered spans to the exporter batch processor queue.
 */
export class OnErrorSpanProcessor extends BatchSpanProcessor {
  private _buffer: ReadableSpan[] = [];
  private _maxBufferSize = 1000;

  constructor(exporter: SpanExporter, maxBufferSize?: number) {
    super(exporter);
    if (maxBufferSize !== undefined) {
      this._maxBufferSize = maxBufferSize;
    }
  }

  override onEnd(span: ReadableSpan): void {
    this._buffer.push(span);
    if (this._buffer.length > this._maxBufferSize) {
      // TODO: shift() is O(n), use a fixed size circular buffer instead
      this._buffer.shift();
    }
  }

  override shutdown(): Promise<void> {
    this._buffer = [];
    return super.shutdown();
  }

  onErrorOccurred(): void {
    // Flush all buffered spans to the batch processor
    for (const span of this._buffer) {
      super.onEnd(span);
    }
    this._buffer = [];

    // Force flush to ensure immediate export
    void super.forceFlush();
  }
}
