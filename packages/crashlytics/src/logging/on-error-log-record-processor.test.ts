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
import { LogRecordProcessor, SdkLogRecord } from '@opentelemetry/sdk-logs';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';

class MockLogRecordProcessor implements LogRecordProcessor {
  logsEmitted: SdkLogRecord[] = [];
  flushedCount = 0;
  shutdownCount = 0;

  onEmit(logRecord: SdkLogRecord, _context?: Context): void {
    this.logsEmitted.push(logRecord);
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

  beforeEach(() => {
    mockDelegate = new MockLogRecordProcessor();
    processor = new OnErrorLogRecordProcessor(mockDelegate, 2); // Max buffer size of 2 for testing limit
    mockLog1 = { body: 'log1' } as unknown as SdkLogRecord;
    mockLog2 = { body: 'log2' } as unknown as SdkLogRecord;
    mockLog3 = { body: 'log3' } as unknown as SdkLogRecord;
  });

  it('should buffer emitted log records and not forward them to delegate before error occurs', () => {
    processor.onEmit(mockLog1);
    processor.onEmit(mockLog2);

    expect(mockDelegate.logsEmitted).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([mockLog1, mockLog2]);
    expect(processor.hasErrorOccurred()).to.be.false;
  });

  it('should drop oldest log records when buffer exceeds maxBufferSize', () => {
    processor.onEmit(mockLog1);
    processor.onEmit(mockLog2);
    processor.onEmit(mockLog3); // Over limit of 2

    expect(mockDelegate.logsEmitted).to.be.empty;
    expect(processor.getBuffer()).to.deep.equal([mockLog2, mockLog3]);
  });

  it('should forward buffered log records and call forceFlush on delegate when onErrorOccurred is called', () => {
    processor.onEmit(mockLog1);
    processor.onEmit(mockLog2);

    processor.onErrorOccurred();

    expect(processor.hasErrorOccurred()).to.be.true;
    expect(processor.getBuffer()).to.be.empty;
    expect(mockDelegate.logsEmitted).to.deep.equal([mockLog1, mockLog2]);
    expect(mockDelegate.flushedCount).to.equal(1);
  });

  it('should forward subsequent emitted log records to delegate immediately after error occurs', () => {
    processor.onEmit(mockLog1);
    processor.onErrorOccurred();

    expect(mockDelegate.logsEmitted).to.deep.equal([mockLog1]);

    processor.onEmit(mockLog2);
    expect(mockDelegate.logsEmitted).to.deep.equal([mockLog1, mockLog2]);
    expect(processor.getBuffer()).to.be.empty;
  });

  it('should be a no-op if onErrorOccurred is called multiple times', () => {
    processor.onEmit(mockLog1);
    processor.onErrorOccurred();
    expect(mockDelegate.logsEmitted).to.deep.equal([mockLog1]);
    expect(mockDelegate.flushedCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockDelegate.logsEmitted).to.deep.equal([mockLog1]);
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
