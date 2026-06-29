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
import { Context } from '@opentelemetry/api';
import {
  SpanProcessor,
  ReadableSpan,
  Span
} from '@opentelemetry/sdk-trace-base';
import { OnErrorSpanProcessor } from './on-error-span-processor';

class MockSpanProcessor implements SpanProcessor {
  spansStarted: Span[] = [];
  spansEnded: ReadableSpan[] = [];
  flushedCount = 0;
  shutdownCount = 0;

  onStart(span: Span, _parentContext: Context): void {
    this.spansStarted.push(span);
  }
  onEnd(span: ReadableSpan): void {
    this.spansEnded.push(span);
  }
  forceFlush(): Promise<void> {
    this.flushedCount++;
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    this.shutdownCount++;
    return Promise.resolve();
  }
}

describe('OnErrorSpanProcessor', () => {
  let mockDelegate: MockSpanProcessor;
  let processor: OnErrorSpanProcessor;
  let dummySpan1: ReadableSpan;
  let dummySpan2: ReadableSpan;
  let dummySpan3: ReadableSpan;

  beforeEach(() => {
    mockDelegate = new MockSpanProcessor();
    processor = new OnErrorSpanProcessor(mockDelegate, 2); // Max buffer size of 2 for testing limit
    dummySpan1 = { name: 'span1' } as unknown as ReadableSpan;
    dummySpan2 = { name: 'span2' } as unknown as ReadableSpan;
    dummySpan3 = { name: 'span3' } as unknown as ReadableSpan;
  });

  it('should forward onStart calls to the delegate immediately', () => {
    const span = {} as Span;
    const context = {} as Context;
    processor.onStart(span, context);
    expect(mockDelegate.spansStarted).to.deep.equal([span]);
  });

  it('should buffer ended spans and not forward them to delegate before error occurs', () => {
    processor.onEnd(dummySpan1);
    processor.onEnd(dummySpan2);

    expect(mockDelegate.spansEnded).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([dummySpan1, dummySpan2]);
    expect(processor.hasErrorOccurred()).to.be.false;
  });

  it('should drop oldest spans when buffer exceeds maxBufferSize', () => {
    processor.onEnd(dummySpan1);
    processor.onEnd(dummySpan2);
    processor.onEnd(dummySpan3); // Over limit of 2

    expect(mockDelegate.spansEnded).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([dummySpan2, dummySpan3]);
  });

  it('should forward buffered spans and call forceFlush on delegate when onErrorOccurred is called', () => {
    processor.onEnd(dummySpan1);
    processor.onEnd(dummySpan2);

    processor.onErrorOccurred();

    expect(processor.hasErrorOccurred()).to.be.true;
    expect(processor.getBuffer()).to.be.empty;
    expect(mockDelegate.spansEnded).to.deep.equal([dummySpan1, dummySpan2]);
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should forward subsequent ended spans to delegate immediately after error occurs', () => {
    processor.onEnd(dummySpan1);
    processor.onErrorOccurred();

    expect(mockDelegate.spansEnded).to.deep.equal([dummySpan1]);

    processor.onEnd(dummySpan2);
    expect(mockDelegate.spansEnded).to.deep.equal([dummySpan1, dummySpan2]);
    expect(processor.getBuffer()).to.be.empty;
  });

  it('should be a no-op if onErrorOccurred is called multiple times', () => {
    processor.onEnd(dummySpan1);
    processor.onErrorOccurred();
    expect(mockDelegate.spansEnded).to.deep.equal([dummySpan1]);
    expect(mockDelegate.flushedCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockDelegate.spansEnded).to.deep.equal([dummySpan1]);
    // Flushed count should still be 1 (didn't trigger again)
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should keep "manual-child-span-sync" in the buffer but filter it out before flushing', () => {
    const customProcessor = new OnErrorSpanProcessor(mockDelegate, 10);

    const parentSpan = {
      name: 'root-span',
      spanContext: () => ({
        traceId: 'trace-1',
        spanId: 'parent-id'
      })
    } as unknown as ReadableSpan;

    const targetSpan = {
      name: 'manual-child-span-sync',
      spanContext: () => ({
        traceId: 'trace-1',
        spanId: 'child-id'
      }),
      parentSpanContext: {
        traceId: 'trace-1',
        spanId: 'parent-id'
      }
    } as unknown as ReadableSpan;

    const grandchildSpan = {
      name: 'grandchild-span',
      spanContext: () => ({
        traceId: 'trace-1',
        spanId: 'grandchild-id'
      }),
      parentSpanContext: {
        traceId: 'trace-1',
        spanId: 'child-id'
      }
    } as unknown as ReadableSpan;

    customProcessor.onEnd(parentSpan);
    customProcessor.onEnd(targetSpan);
    customProcessor.onEnd(grandchildSpan);

    // The targetSpan should be present in the buffer before flushing
    expect(customProcessor.getBuffer()).to.deep.equal([parentSpan, targetSpan, grandchildSpan]);

    customProcessor.onErrorOccurred();

    // After flush, the delegate should only receive the parent and grandchild spans
    expect(mockDelegate.spansEnded).to.deep.equal([parentSpan, grandchildSpan]);
  });

  it('should not delete "manual-child-span-sync" spans if they end after error occurs (since they bypass the buffer)', () => {
    processor.onErrorOccurred();

    const targetSpan = { name: 'manual-child-span-sync' } as unknown as ReadableSpan;
    const otherSpan = { name: 'other-span' } as unknown as ReadableSpan;

    processor.onEnd(targetSpan);
    processor.onEnd(otherSpan);

    expect(mockDelegate.spansEnded).to.deep.equal([targetSpan, otherSpan]);
  });

  it('should forward forceFlush calls to delegate', async () => {
    await processor.forceFlush();
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should forward shutdown calls to delegate', async () => {
    await processor.shutdown();
    expect(mockDelegate.shutdownCount).to.equal(1);
  });
});
