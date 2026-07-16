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
import { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { OnErrorSpanProcessor } from './on-error-span-processor';

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

describe('OnErrorSpanProcessor', () => {
  let mockExporter: MockSpanExporter;
  let processor: OnErrorSpanProcessor;
  let mockSpan1: ReadableSpan;
  let mockSpan2: ReadableSpan;
  let mockSpan3: ReadableSpan;

  beforeEach(() => {
    mockExporter = new MockSpanExporter();
    processor = new OnErrorSpanProcessor(mockExporter, 2); // Max buffer size of 2 for testing limit
    const emptyResource = resourceFromAttributes({});
    mockSpan1 = {
      name: 'span1',
      resource: emptyResource,
      spanContext: () => ({ traceFlags: 1 })
    } as unknown as ReadableSpan;
    mockSpan2 = {
      name: 'span2',
      resource: emptyResource,
      spanContext: () => ({ traceFlags: 1 })
    } as unknown as ReadableSpan;
    mockSpan3 = {
      name: 'span3',
      resource: emptyResource,
      spanContext: () => ({ traceFlags: 1 })
    } as unknown as ReadableSpan;
  });

  it('should buffer ended spans and not export them before error occurs', () => {
    processor.onEnd(mockSpan1);
    processor.onEnd(mockSpan2);

    expect(mockExporter.exportedSpans).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([mockSpan1, mockSpan2]);
  });

  it('should drop oldest spans when buffer exceeds maxBufferSize', () => {
    processor.onEnd(mockSpan1);
    processor.onEnd(mockSpan2);
    processor.onEnd(mockSpan3); // Over limit of 2

    expect(mockExporter.exportedSpans).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([mockSpan2, mockSpan3]);
  });

  it('should forward buffered spans and flush to exporter when onErrorOccurred is called', async () => {
    processor.onEnd(mockSpan1);
    processor.onEnd(mockSpan2);

    processor.onErrorOccurred();
    await processor.forceFlush();

    expect(processor.getBuffer()).to.be.empty;
    expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1, mockSpan2]);
  });

  it('should buffer subsequent ended spans again after an error is flushed and flush them on subsequent onErrorOccurred', async () => {
    processor.onEnd(mockSpan1);
    processor.onErrorOccurred();
    await processor.forceFlush();

    expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1]);

    // Subsequent span should be buffered
    processor.onEnd(mockSpan2);
    await processor.forceFlush();
    expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1]);

    // Second error triggers flush of the new buffer
    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1, mockSpan2]);
    expect(processor.getBuffer()).to.be.empty;
  });

  it('should be a no-op if onErrorOccurred is called multiple times without new spans', async () => {
    processor.onEnd(mockSpan1);
    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1]);

    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedSpans).to.deep.equal([mockSpan1]);
  });

  it('should forward shutdown calls to exporter and clear buffer', async () => {
    processor.onEnd(mockSpan1);
    await processor.shutdown();
    expect(mockExporter.shutdownCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockExporter.exportedSpans).to.be.empty;
  });
});
