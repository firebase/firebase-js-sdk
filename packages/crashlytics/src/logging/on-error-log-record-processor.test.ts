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
import { Context, ROOT_CONTEXT, createContextKey } from '@opentelemetry/api';
import { LogRecordProcessor, SdkLogRecord } from '@opentelemetry/sdk-logs';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';

class MockLogRecordProcessor implements LogRecordProcessor {
  logsEmitted: Array<{ logRecord: SdkLogRecord; context?: Context }> = [];
  flushedCount = 0;
  shutdownCount = 0;

  onEmit(logRecord: SdkLogRecord, context?: Context): void {
    this.logsEmitted.push({ logRecord, context });
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

describe('OnErrorLogRecordProcessor', () => {
  let mockDelegate: MockLogRecordProcessor;
  let processor: OnErrorLogRecordProcessor;
  let mockLog1: SdkLogRecord;
  let mockLog2: SdkLogRecord;
  let mockLog3: SdkLogRecord;
  let mockContext1: Context;
  let mockContext2: Context;

  beforeEach(() => {
    mockDelegate = new MockLogRecordProcessor();
    processor = new OnErrorLogRecordProcessor(mockDelegate, 2); // Max buffer size of 2 for testing limit
    mockLog1 = { body: 'log1' } as unknown as SdkLogRecord;
    mockLog2 = { body: 'log2' } as unknown as SdkLogRecord;
    mockLog3 = { body: 'log3' } as unknown as SdkLogRecord;
    mockContext1 = ROOT_CONTEXT.setValue(
      createContextKey('testKey1'),
      'testVal1'
    );
    mockContext2 = ROOT_CONTEXT.setValue(
      createContextKey('testKey2'),
      'testVal2'
    );
  });

  it('should buffer emitted log records and context and not forward them to delegate before error occurs', () => {
    processor.onEmit(mockLog1, mockContext1);
    processor.onEmit(mockLog2);

    expect(mockDelegate.logsEmitted).to.be.empty;
    expect(processor.hasErrorOccurred()).to.be.false;

    processor.onErrorOccurred();
    expect(mockDelegate.logsEmitted).to.deep.equal([
      { logRecord: mockLog1, context: mockContext1 },
      { logRecord: mockLog2, context: undefined }
    ]);
  });

  it('should drop oldest log records when buffer exceeds maxBufferSize', () => {
    processor.onEmit(mockLog1, mockContext1);
    processor.onEmit(mockLog2, mockContext2);
    processor.onEmit(mockLog3); // Over limit of 2

    expect(mockDelegate.logsEmitted).to.be.empty;

    processor.onErrorOccurred();
    expect(mockDelegate.logsEmitted).to.deep.equal([
      { logRecord: mockLog2, context: mockContext2 },
      { logRecord: mockLog3, context: undefined }
    ]);
  });

  it('should forward buffered log records and context and call forceFlush on delegate when onErrorOccurred is called', () => {
    processor.onEmit(mockLog1, mockContext1);
    processor.onEmit(mockLog2);

    processor.onErrorOccurred();

    expect(processor.hasErrorOccurred()).to.be.true;
    expect(mockDelegate.logsEmitted).to.deep.equal([
      { logRecord: mockLog1, context: mockContext1 },
      { logRecord: mockLog2, context: undefined }
    ]);
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should forward subsequent emitted log records to delegate immediately after error occurs', () => {
    processor.onEmit(mockLog1, mockContext1);
    processor.onErrorOccurred();

    expect(mockDelegate.logsEmitted).to.deep.equal([
      { logRecord: mockLog1, context: mockContext1 }
    ]);

    processor.onEmit(mockLog2, mockContext2);
    expect(mockDelegate.logsEmitted).to.deep.equal([
      { logRecord: mockLog1, context: mockContext1 },
      { logRecord: mockLog2, context: mockContext2 }
    ]);
  });

  it('should be a no-op if onErrorOccurred is called multiple times', () => {
    processor.onEmit(mockLog1, mockContext1);
    processor.onErrorOccurred();
    expect(mockDelegate.logsEmitted).to.deep.equal([
      { logRecord: mockLog1, context: mockContext1 }
    ]);
    expect(mockDelegate.flushedCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockDelegate.logsEmitted).to.deep.equal([
      { logRecord: mockLog1, context: mockContext1 }
    ]);
    expect(mockDelegate.flushedCount).to.equal(1);
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
