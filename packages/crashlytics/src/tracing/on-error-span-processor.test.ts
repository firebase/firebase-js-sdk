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
  let mockSpan1: ReadableSpan;
  let mockSpan2: ReadableSpan;
  let mockSpan3: ReadableSpan;

  beforeEach(() => {
    mockDelegate = new MockSpanProcessor();
    processor = new OnErrorSpanProcessor(mockDelegate, 2); // Max buffer size of 2 for testing limit
    mockSpan1 = { name: 'span1' } as unknown as ReadableSpan;
    mockSpan2 = { name: 'span2' } as unknown as ReadableSpan;
    mockSpan3 = { name: 'span3' } as unknown as ReadableSpan;
  });

  it('should forward onStart calls to the delegate immediately', () => {
    const span = {} as Span;
    const context = {} as Context;
    processor.onStart(span, context);
    expect(mockDelegate.spansStarted).to.deep.equal([span]);
  });

  it('should buffer ended spans and not forward them to delegate before error occurs', () => {
    processor.onEnd(mockSpan1);
    processor.onEnd(mockSpan2);

    expect(mockDelegate.spansEnded).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([mockSpan1, mockSpan2]);
    expect(processor.hasErrorOccurred()).to.be.false;
  });

  it('should drop oldest spans when buffer exceeds maxBufferSize', () => {
    processor.onEnd(mockSpan1);
    processor.onEnd(mockSpan2);
    processor.onEnd(mockSpan3); // Over limit of 2

    expect(mockDelegate.spansEnded).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([mockSpan2, mockSpan3]);
  });

  it('should forward buffered spans and call forceFlush on delegate when onErrorOccurred is called', () => {
    processor.onEnd(mockSpan1);
    processor.onEnd(mockSpan2);

    processor.onErrorOccurred();

    expect(processor.hasErrorOccurred()).to.be.true;
    expect(processor.getBuffer()).to.be.empty;
    expect(mockDelegate.spansEnded).to.deep.equal([mockSpan1, mockSpan2]);
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should forward subsequent ended spans to delegate immediately after error occurs', () => {
    processor.onEnd(mockSpan1);
    processor.onErrorOccurred();

    expect(mockDelegate.spansEnded).to.deep.equal([mockSpan1]);

    processor.onEnd(mockSpan2);
    expect(mockDelegate.spansEnded).to.deep.equal([mockSpan1, mockSpan2]);
    expect(processor.getBuffer()).to.be.empty;
  });

  it('should be a no-op if onErrorOccurred is called multiple times', () => {
    processor.onEnd(mockSpan1);
    processor.onErrorOccurred();
    expect(mockDelegate.spansEnded).to.deep.equal([mockSpan1]);
    expect(mockDelegate.flushedCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockDelegate.spansEnded).to.deep.equal([mockSpan1]);
    // Flushed count should still be 1 (didn't trigger again)
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should forward forceFlush calls to delegate', async () => {
    await processor.forceFlush();
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should forward shutdown calls to delegate and clear buffer', async () => {
    processor.onEnd(mockSpan1);
    await processor.shutdown();
    expect(mockDelegate.shutdownCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockDelegate.spansEnded).to.be.empty;
  });
});
