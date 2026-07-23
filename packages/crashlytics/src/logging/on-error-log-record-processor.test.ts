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
  LogRecordExporter,
  ReadableLogRecord,
  SdkLogRecord
} from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { OnErrorLogRecordProcessor } from './on-error-log-record-processor';

class MockLogRecordExporter implements LogRecordExporter {
  exportedLogs: ReadableLogRecord[] = [];
  shutdownCount = 0;

  export(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void
  ): void {
    this.exportedLogs.push(...logs);
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

describe('OnErrorLogRecordProcessor', () => {
  let mockExporter: MockLogRecordExporter;
  let processor: OnErrorLogRecordProcessor;
  let mockLog1: SdkLogRecord;
  let mockLog2: SdkLogRecord;
  let mockLog3: SdkLogRecord;

  beforeEach(() => {
    mockExporter = new MockLogRecordExporter();
    processor = new OnErrorLogRecordProcessor(mockExporter, 2); // Max buffer size of 2 for testing limit
    const emptyResource = resourceFromAttributes({});
    mockLog1 = {
      body: 'log1',
      resource: emptyResource
    } as unknown as SdkLogRecord;
    mockLog2 = {
      body: 'log2',
      resource: emptyResource
    } as unknown as SdkLogRecord;
    mockLog3 = {
      body: 'log3',
      resource: emptyResource
    } as unknown as SdkLogRecord;
  });

  it('should buffer emitted log records and not export them before error occurs', async () => {
    processor.onEmit(mockLog1);
    processor.onEmit(mockLog2);

    expect(mockExporter.exportedLogs).to.be.empty;

    processor.onErrorOccurred();
    expect(mockExporter.exportedLogs).to.be.empty;

    await processor.forceFlush();
    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1, mockLog2]);
  });

  it('should drop oldest log records when buffer exceeds maxBufferSize', async () => {
    processor.onEmit(mockLog1);
    processor.onEmit(mockLog2);
    processor.onEmit(mockLog3); // Over limit of 2

    expect(mockExporter.exportedLogs).to.be.empty;

    processor.onErrorOccurred();
    expect(mockExporter.exportedLogs).to.be.empty;

    await processor.forceFlush();
    expect(mockExporter.exportedLogs).to.deep.equal([mockLog2, mockLog3]);
  });

  it('should forward buffered log records and flush to exporter when onErrorOccurred is called', async () => {
    processor.onEmit(mockLog1);
    processor.onEmit(mockLog2);

    processor.onErrorOccurred();
    await processor.forceFlush();

    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1, mockLog2]);
  });

  it('should buffer subsequent emitted log records again after an error is flushed and flush them on subsequent onErrorOccurred', async () => {
    processor.onEmit(mockLog1);
    processor.onErrorOccurred();
    await processor.forceFlush();

    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1]);

    // Subsequent emit should be buffered
    processor.onEmit(mockLog2);
    await processor.forceFlush();
    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1]);

    // Second error triggers flush of the new buffer
    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1, mockLog2]);
  });

  it('should be a no-op if onErrorOccurred is called multiple times without new log records', async () => {
    processor.onEmit(mockLog1);
    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1]);

    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1]);
  });

  it('should forward shutdown calls to exporter and clear buffer', async () => {
    processor.onEmit(mockLog1);
    await processor.shutdown();
    expect(mockExporter.shutdownCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockExporter.exportedLogs).to.be.empty;
  });
});
