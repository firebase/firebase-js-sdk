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
import { LogRecordProcessor, SdkLogRecord } from '@opentelemetry/sdk-logs';

/**
 * A LogRecordProcessor that buffers all log records in memory until an error occurs.
 * Once an error occurs, it releases all buffered log records to the delegate processor
 * and forwards subsequent log records directly to the delegate.
 */
export class OnErrorLogRecordProcessor implements LogRecordProcessor {
  private _buffer: SdkLogRecord[] = [];
  private _hasErrorOccurred = false;
  private _maxBufferSize = 1000;

  constructor(private _delegate: LogRecordProcessor, maxBufferSize?: number) {
    if (maxBufferSize !== undefined) {
      this._maxBufferSize = maxBufferSize;
    }
  }

  onEmit(logRecord: SdkLogRecord, context?: Context): void {
    if (this._hasErrorOccurred) {
      this._delegate.onEmit(logRecord, context);
    } else {
      this._buffer.push(logRecord);
      if (this._buffer.length > this._maxBufferSize) {
        this._buffer.shift();
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

    // Flush all buffered log records to the delegate
    for (const logRecord of this._buffer) {
      this._delegate.onEmit(logRecord);
    }
    this._buffer = [];

    // Force flush the delegate to ensure immediate export
    void this._delegate.forceFlush();
  }

  getBuffer(): SdkLogRecord[] {
    return this._buffer;
  }

  hasErrorOccurred(): boolean {
    return this._hasErrorOccurred;
  }
}
