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
  ExportResult,
  ExportResultCode,
  isTracingSuppressed
} from '@opentelemetry/core';
import {
  StackContextManager,
  SpanExporter,
  ReadableSpan,
  Span
} from '@opentelemetry/sdk-trace';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { context, diag, TraceFlags } from '@opentelemetry/api';
import { OnErrorSpanProcessor } from './on-error-span-processor';
import { TelemetryStore } from '../telemetry-store';

class MockSpanExporter implements SpanExporter {
  exportedSpans: ReadableSpan[] = [];
  shutdownCount = 0;

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ): void {
    this.exportedSpans.push(...spans);
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    this.shutdownCount++;
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

function createMockSpan(
  name: string,
  traceId: string,
  traceFlags: number = TraceFlags.SAMPLED
): Span {
  return {
    name,
    resource: resourceFromAttributes({}),
    spanContext: () => ({
      traceId,
      traceFlags
    })
  } as unknown as Span;
}

describe('OnErrorSpanProcessor', () => {
  let mockExporter: MockSpanExporter;
  let telemetryStore: TelemetryStore;
  let processor: OnErrorSpanProcessor;
  let mockSpan1: Span;
  let mockSpan2: Span;

  beforeEach(() => {
    mockExporter = new MockSpanExporter();
    telemetryStore = new TelemetryStore(2, 2); // Max buffer size of 2 for testing limit
    processor = new OnErrorSpanProcessor(mockExporter, telemetryStore);
    mockSpan1 = createMockSpan('span1', 'trace-1');
    mockSpan2 = createMockSpan('span2', 'trace-2');
  });

  afterEach(() => {
    context.disable();
    vi.restoreAllMocks();
  });

  it('should buffer ended spans and export them directly when an error occurs', async () => {
    const forceFlushSpy = vi.spyOn(mockExporter, 'forceFlush');
    processor.onStart(mockSpan1, context.active());
    processor.onEnd(mockSpan1);
    processor.onStart(mockSpan2, context.active());
    processor.onEnd(mockSpan2);

    await processor.forceFlush();
    expect(mockExporter.exportedSpans).toHaveLength(0);

    processor.onErrorOccurred();
    expect(mockExporter.exportedSpans).toEqual([mockSpan1, mockSpan2]);

    await processor.forceFlush();
    expect(forceFlushSpy).toHaveBeenCalledTimes(2);
  });

  it('should suppress tracing while exporting spans', () => {
    const contextManager = new StackContextManager().enable();
    context.setGlobalContextManager(contextManager);
    let tracingSuppressed = false;
    vi.spyOn(mockExporter, 'export').mockImplementation(
      (_spans, resultCallback) => {
        tracingSuppressed = isTracingSuppressed(context.active());
        resultCallback({ code: ExportResultCode.SUCCESS });
      }
    );

    processor.onStart(mockSpan1, context.active());
    processor.onEnd(mockSpan1);

    processor.onErrorOccurred();
    expect(tracingSuppressed).toBe(true);
  });

  it('should only export sampled spans', () => {
    const unsampledSpan = createMockSpan(
      'unsampled',
      'trace-u',
      TraceFlags.NONE
    );
    processor.onStart(unsampledSpan, context.active());
    processor.onEnd(unsampledSpan);
    processor.onStart(mockSpan1, context.active());
    processor.onEnd(mockSpan1);

    processor.onErrorOccurred();
    expect(mockExporter.exportedSpans).toEqual([mockSpan1]);
  });

  it('should not call exporter when there are no sampled spans to export', () => {
    const exportSpy = vi.spyOn(mockExporter, 'export');
    const unsampledSpan = createMockSpan(
      'unsampled',
      'trace-u',
      TraceFlags.NONE
    );
    processor.onStart(unsampledSpan, context.active());
    processor.onEnd(unsampledSpan);

    processor.onErrorOccurred();
    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('should chunk exports when buffered spans exceed max batch size', () => {
    const exportSpy = vi.spyOn(mockExporter, 'export');
    const store = new TelemetryStore(5, 5);
    const batchProcessor = new OnErrorSpanProcessor(mockExporter, store, 2);

    for (let i = 0; i < 5; i++) {
      const span = createMockSpan(`span-${i}`, `trace-${i}`);
      batchProcessor.onStart(span, context.active());
      batchProcessor.onEnd(span);
    }

    batchProcessor.onErrorOccurred();
    expect(exportSpy).toHaveBeenCalledTimes(3);
    expect(exportSpy.mock.calls[0][0]).toHaveLength(2);
    expect(exportSpy.mock.calls[1][0]).toHaveLength(2);
    expect(exportSpy.mock.calls[2][0]).toHaveLength(1);
    expect(mockExporter.exportedSpans).toHaveLength(5);
  });

  it('should throw when maxExportBatchSize is not greater than 0', () => {
    expect(
      () => new OnErrorSpanProcessor(mockExporter, telemetryStore, 0)
    ).toThrow('maxExportBatchSize must be greater than 0');
    expect(
      () => new OnErrorSpanProcessor(mockExporter, telemetryStore, -1)
    ).toThrow('maxExportBatchSize must be greater than 0');
  });

  it('should await in-flight async exports during forceFlush and shutdown', async () => {
    let finishExport!: (result: ExportResult) => void;
    const asyncExporter: SpanExporter = {
      export: (_spans, resultCallback) => {
        finishExport = resultCallback;
      },
      forceFlush: vi.fn(() => Promise.resolve()),
      shutdown: vi.fn(() => Promise.resolve())
    };
    const asyncProcessor = new OnErrorSpanProcessor(
      asyncExporter,
      telemetryStore
    );

    asyncProcessor.onStart(mockSpan1, context.active());
    asyncProcessor.onEnd(mockSpan1);
    asyncProcessor.onErrorOccurred();

    const flushPromise = asyncProcessor.forceFlush();
    await Promise.resolve();
    expect(asyncExporter.forceFlush).not.toHaveBeenCalled();

    const shutdownPromise = asyncProcessor.shutdown();
    await Promise.resolve();
    expect(asyncExporter.shutdown).not.toHaveBeenCalled();

    finishExport({ code: ExportResultCode.SUCCESS });
    await Promise.all([flushPromise, shutdownPromise]);

    expect(asyncExporter.forceFlush).toHaveBeenCalled();
    expect(asyncExporter.shutdown).toHaveBeenCalled();
  });

  describe('export error handling', () => {
    let diagErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      diagErrorSpy = vi.spyOn(diag, 'error').mockImplementation(() => {});
    });

    it('should log via diag.error and continue exporting after a failed export with an error', () => {
      const networkError = new Error('network error');
      vi.spyOn(mockExporter, 'export').mockImplementationOnce(
        (_spans, resultCallback) => {
          resultCallback({
            code: ExportResultCode.FAILED,
            error: networkError
          });
        }
      );

      processor.onStart(mockSpan1, context.active());
      processor.onEnd(mockSpan1);
      expect(() => processor.onErrorOccurred()).not.toThrow();
      expect(diagErrorSpy).toHaveBeenCalledWith(
        'OnErrorSpanProcessor: span export failed',
        networkError
      );

      diagErrorSpy.mockClear();
      telemetryStore.clear();

      processor.onStart(mockSpan2, context.active());
      processor.onEnd(mockSpan2);
      processor.onErrorOccurred();
      expect(mockExporter.exportedSpans).toEqual([mockSpan2]);
      expect(diagErrorSpy).not.toHaveBeenCalled();
    });

    it('should log via diag.error and continue exporting after a failed export without an error', () => {
      vi.spyOn(mockExporter, 'export').mockImplementationOnce(
        (_spans, resultCallback) => {
          resultCallback({ code: ExportResultCode.FAILED });
        }
      );

      processor.onStart(mockSpan1, context.active());
      processor.onEnd(mockSpan1);
      expect(() => processor.onErrorOccurred()).not.toThrow();
      expect(diagErrorSpy).toHaveBeenCalledWith(
        'OnErrorSpanProcessor: span export failed'
      );

      diagErrorSpy.mockClear();
      telemetryStore.clear();

      processor.onStart(mockSpan2, context.active());
      processor.onEnd(mockSpan2);
      processor.onErrorOccurred();
      expect(mockExporter.exportedSpans).toEqual([mockSpan2]);
      expect(diagErrorSpy).not.toHaveBeenCalled();
    });

    it('should log via diag.error and continue exporting after a synchronous exporter throw', () => {
      const syncError = new Error('sync boom');
      vi.spyOn(mockExporter, 'export').mockImplementationOnce(() => {
        throw syncError;
      });

      processor.onStart(mockSpan1, context.active());
      processor.onEnd(mockSpan1);
      expect(() => processor.onErrorOccurred()).not.toThrow();
      expect(diagErrorSpy).toHaveBeenCalledWith(
        'OnErrorSpanProcessor: span export failed',
        syncError
      );

      diagErrorSpy.mockClear();
      telemetryStore.clear();

      processor.onStart(mockSpan2, context.active());
      processor.onEnd(mockSpan2);
      processor.onErrorOccurred();
      expect(mockExporter.exportedSpans).toEqual([mockSpan2]);
      expect(diagErrorSpy).not.toHaveBeenCalled();
    });
  });

  it('should forward shutdown calls to exporter and clear buffer', async () => {
    processor.onStart(mockSpan1, context.active());
    processor.onEnd(mockSpan1);

    await processor.shutdown();
    expect(mockExporter.shutdownCount).toBe(1);
    expect(telemetryStore.totalTelemetryCount).toBe(0);
  });

  it('should ignore onStart, onEnd, onErrorOccurred, forceFlush, and shutdown after shutdown', async () => {
    await processor.shutdown();

    const addSpy = vi.spyOn(telemetryStore, 'add');
    const updateSpy = vi.spyOn(telemetryStore, 'update');
    const getSpansSpy = vi.spyOn(telemetryStore, 'getSpansToExport');
    const exportSpy = vi.spyOn(mockExporter, 'export');
    const forceFlushSpy = vi.spyOn(mockExporter, 'forceFlush');
    const shutdownSpy = vi.spyOn(mockExporter, 'shutdown');

    processor.onStart(mockSpan2, context.active());
    processor.onEnd(mockSpan2);
    processor.onErrorOccurred();
    await processor.forceFlush();
    await processor.shutdown();

    expect(addSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpansSpy).not.toHaveBeenCalled();
    expect(exportSpy).not.toHaveBeenCalled();
    expect(forceFlushSpy).not.toHaveBeenCalled();
    expect(shutdownSpy).not.toHaveBeenCalled();
  });

  describe('multi-error scenarios simulating SDK lifecycle', () => {
    function simulateSDKErrorLifecycleCleanup(): void {
      telemetryStore.clear();
    }

    it('should buffer and export subsequent emitted spans with lifecycle cleanup', async () => {
      // First error cycle
      processor.onStart(mockSpan1, context.active());
      processor.onEnd(mockSpan1);
      processor.onErrorOccurred();
      simulateSDKErrorLifecycleCleanup();
      await processor.forceFlush();
      expect(mockExporter.exportedSpans).toEqual([mockSpan1]);

      // Second error cycle
      processor.onStart(mockSpan2, context.active());
      processor.onEnd(mockSpan2);
      processor.onErrorOccurred();
      simulateSDKErrorLifecycleCleanup();
      await processor.forceFlush();
      expect(mockExporter.exportedSpans).toEqual([mockSpan1, mockSpan2]);
    });
  });
});
