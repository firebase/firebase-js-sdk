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
import { context, Context, diag, TraceFlags } from '@opentelemetry/api';
import { ExportResultCode, suppressTracing } from '@opentelemetry/core';
import type {
  ReadableSpan,
  Span,
  SpanExporter,
  SpanProcessor
} from '@opentelemetry/sdk-trace';
import { TelemetryStore } from '../telemetry-store';

/**
 * A SpanProcessor that buffers all spans in memory via {@link TelemetryStore}
 * until an error occurs, then exports all buffered sampled spans directly.
 */
export class OnErrorSpanProcessor implements SpanProcessor {
  static readonly DEFAULT_EXPORT_BATCH_SIZE = 512;

  private readonly _exporter: SpanExporter;
  private readonly _store: TelemetryStore;
  private readonly _maxExportBatchSize: number;
  private readonly _pendingExports = new Set<Promise<void>>();
  private _isShutdown = false;
  private _shutdownPromise?: Promise<void>;

  constructor(
    exporter: SpanExporter,
    store: TelemetryStore,
    maxExportBatchSize = OnErrorSpanProcessor.DEFAULT_EXPORT_BATCH_SIZE
  ) {
    if (maxExportBatchSize <= 0) {
      throw new Error('maxExportBatchSize must be greater than 0');
    }
    this._exporter = exporter;
    this._store = store;
    this._maxExportBatchSize = maxExportBatchSize;
  }

  onStart(span: Span, _parentContext: Context): void {
    if (this._isShutdown) {
      return;
    }
    this._store.add(span);
  }

  onEnd(span: ReadableSpan): void {
    if (this._isShutdown) {
      return;
    }
    this._store.update(span);
  }

  async forceFlush(): Promise<void> {
    if (this._shutdownPromise) {
      return this._shutdownPromise;
    }
    await Promise.all(this._pendingExports);
    await this._exporter.forceFlush?.();
  }

  shutdown(): Promise<void> {
    if (this._shutdownPromise) {
      return this._shutdownPromise;
    }
    this._isShutdown = true;
    this._store.clear();
    this._shutdownPromise = Promise.all(this._pendingExports).then(() =>
      this._exporter.shutdown()
    );
    return this._shutdownPromise;
  }

  onErrorOccurred(): void {
    if (this._isShutdown) {
      return;
    }
    const spans = this._store
      .getSpansToExport()
      .filter(
        span => (span.spanContext().traceFlags & TraceFlags.SAMPLED) !== 0
      );

    for (let i = 0; i < spans.length; i += this._maxExportBatchSize) {
      this._exportBatch(spans.slice(i, i + this._maxExportBatchSize));
    }
  }

  private _exportBatch(spans: ReadableSpan[]): void {
    const exportPromise = new Promise<void>(resolve => {
      context.with(suppressTracing(context.active()), () => {
        try {
          this._exporter.export(spans, result => {
            if (result.code === ExportResultCode.FAILED) {
              if (result.error) {
                diag.error(
                  'OnErrorSpanProcessor: span export failed',
                  result.error
                );
              } else {
                diag.error('OnErrorSpanProcessor: span export failed');
              }
            }
            resolve();
          });
        } catch (error) {
          diag.error('OnErrorSpanProcessor: span export failed', error);
          resolve();
        }
      });
    });

    this._pendingExports.add(exportPromise);
    void exportPromise.finally(() => {
      this._pendingExports.delete(exportPromise);
    });
  }
}
