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

import { expect } from 'chai';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import {
  SpanExporter,
  ReadableSpan,
  Span
} from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { context } from '@opentelemetry/api';
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
}

function createMockSpan(name: string, traceId: string): Span {
  return {
    name,
    resource: resourceFromAttributes({}),
    spanContext: () => ({
      traceId,
      traceFlags: 1
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

  it('should buffer ended spans and not export them until error occurs with flush', async () => {
    processor.onStart(mockSpan1, context.active());
    processor.onEnd(mockSpan1);
    processor.onStart(mockSpan2, context.active());
    processor.onEnd(mockSpan2);

    await processor.forceFlush();
    expect(mockExporter.exportedSpans).to.be.empty;

    processor.onErrorOccurred();
    expect(mockExporter.exportedSpans).to.be.empty;

    await processor.forceFlush();
    expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1, mockSpan2]);
  });

  it('should forward shutdown calls to exporter and clear buffer', async () => {
    processor.onStart(mockSpan1, context.active());
    processor.onEnd(mockSpan1);

    await processor.shutdown();
    expect(mockExporter.shutdownCount).to.equal(1);

    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedSpans).to.be.empty;
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
      expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1]);

      // Second error cycle
      processor.onStart(mockSpan2, context.active());
      processor.onEnd(mockSpan2);
      processor.onErrorOccurred();
      simulateSDKErrorLifecycleCleanup();
      await processor.forceFlush();
      expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1, mockSpan2]);
    });
  });
});
