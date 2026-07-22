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
  BatchLogRecordProcessor,
  LogRecordExporter,
  SdkLogRecord
} from '@opentelemetry/sdk-logs';

/**
 * A BatchLogRecordProcessor that buffers all log records in memory until an error occurs.
 * Once an error occurs, it releases all buffered log records to the exporter batch processor queue.
 */
export class OnErrorLogRecordProcessor extends BatchLogRecordProcessor {
  private _buffer: SdkLogRecord[] = [];
  private _maxBufferSize = 1000;

  constructor(exporter: LogRecordExporter, maxBufferSize?: number) {
    super({ exporter });
    if (maxBufferSize !== undefined) {
      this._maxBufferSize = maxBufferSize;
    }
  }

  override onEmit(logRecord: SdkLogRecord): void {
    this._buffer.push(logRecord);
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
    // Release all buffered log records to the batch processor
    for (const logRecord of this._buffer) {
      super.onEmit(logRecord);
    }
    this._buffer = [];
  }
}
