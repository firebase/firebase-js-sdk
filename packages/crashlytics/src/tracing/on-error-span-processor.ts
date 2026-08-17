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
  BatchSpanProcessor,
  SpanExporter,
  ReadableSpan,
  Span
} from '@opentelemetry/sdk-trace-base';
import { TelemetryStore } from '../telemetry-store';

/**
 * A BatchSpanProcessor that buffers all spans in memory until an error occurs.
 * Once an error occurs, it releases all buffered spans to the exporter batch processor queue.
 */
export class OnErrorSpanProcessor extends BatchSpanProcessor {
  private _store: TelemetryStore;

  constructor(exporter: SpanExporter, store: TelemetryStore) {
    super(exporter);
    this._store = store;
  }

  override onStart(span: Span, _parentContext: Context): void {
    this._store.add(span);
  }

  override onEnd(span: ReadableSpan): void {
    this._store.update(span);
  }

  override shutdown(): Promise<void> {
    this._store.clear();
    return super.shutdown();
  }

  onErrorOccurred(): void {
    const spans = this._store.getSpansToExport();
    for (const span of spans) {
      super.onEnd(span);
    }
  }
}
