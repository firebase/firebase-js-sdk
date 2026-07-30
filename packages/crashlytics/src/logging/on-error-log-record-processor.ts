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
import { TelemetryBufferStore } from '../telemetry-buffer-store';

/**
 * A BatchLogRecordProcessor that buffers all log records in memory until an error occurs.
 * Once an error occurs, it releases all buffered log records to the exporter batch processor queue.
 */
export class OnErrorLogRecordProcessor extends BatchLogRecordProcessor {
  private _store: TelemetryBufferStore;

  constructor(exporter: LogRecordExporter, store: TelemetryBufferStore) {
    super({ exporter });
    this._store = store;
  }

  override onEmit(logRecord: SdkLogRecord): void {
    this._store.addLog(logRecord);
  }

  override shutdown(): Promise<void> {
    this._store.clear();
    return super.shutdown();
  }

  onErrorOccurred(): void {
    const logs = this._store.getBufferedLogs();
    for (const log of logs) {
      super.onEmit(log);
    }
  }
}
