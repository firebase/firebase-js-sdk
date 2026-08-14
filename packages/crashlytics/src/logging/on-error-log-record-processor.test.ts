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
import { LogAttributes } from '@opentelemetry/api-logs';
import { TelemetryStore } from '../telemetry-store';

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

function createMockLog(
  body: string,
  attributes: LogAttributes = {},
  resource = resourceFromAttributes({})
): SdkLogRecord {
  return {
    body,
    attributes,
    resource
  } as unknown as SdkLogRecord;
}

describe('OnErrorLogRecordProcessor', () => {
  let mockExporter: MockLogRecordExporter;
  let telemetryStore: TelemetryStore;
  let processor: OnErrorLogRecordProcessor;
  let mockLog1: SdkLogRecord;
  let mockLog2: SdkLogRecord;

  beforeEach(() => {
    mockExporter = new MockLogRecordExporter();
    telemetryStore = new TelemetryStore(2, 2); // Max buffer size of 2 for testing limit
    processor = new OnErrorLogRecordProcessor(mockExporter, telemetryStore);
    mockLog1 = createMockLog('log1');
    mockLog2 = createMockLog('log2');
  });

  it('should buffer emitted log records and not export them until error occurs with flush', async () => {
    processor.onEmit(mockLog1);
    processor.onEmit(mockLog2);
    await processor.forceFlush();

    expect(mockExporter.exportedLogs).to.be.empty;

    processor.onErrorOccurred();
    await processor.forceFlush();

    expect(mockExporter.exportedLogs).to.deep.equal([mockLog1, mockLog2]);
  });

  it('should forward shutdown calls to exporter and clear buffer', async () => {
    processor.onEmit(mockLog1);
    await processor.shutdown();
    expect(mockExporter.shutdownCount).to.equal(1);

    processor.onErrorOccurred();
    expect(mockExporter.exportedLogs).to.be.empty;
  });

  it('should filter out web vital log records with rating === "good"', async () => {
    processor = new OnErrorLogRecordProcessor(
      mockExporter,
      new TelemetryStore(3, 3)
    );
    const goodLog = createMockLog('good-vital', {
      'browser.web_vital.rating': 'good'
    });
    const needsImprovementLog = createMockLog('needs-improvement-vital', {
      'browser.web_vital.rating': 'needs-improvement'
    });
    const poorLog = createMockLog('poor-vital', {
      'browser.web_vital.rating': 'poor'
    });

    processor.onEmit(goodLog);
    processor.onEmit(needsImprovementLog);
    processor.onEmit(poorLog);

    processor.onErrorOccurred();
    await processor.forceFlush();
    expect(mockExporter.exportedLogs).to.deep.equal([
      needsImprovementLog,
      poorLog
    ]);
  });

  describe('multi-error scenarios simulating SDK lifecycle', () => {
    function simulateSDKErrorLifecycleCleanup(): void {
      telemetryStore.clear();
    }

    it('should buffer and export subsequent emitted log records with lifecycle cleanup', async () => {
      // First error cycle
      processor.onEmit(mockLog1);
      processor.onErrorOccurred();
      simulateSDKErrorLifecycleCleanup();
      await processor.forceFlush();
      expect(mockExporter.exportedLogs).to.deep.equal([mockLog1]);

      // Second error cycle
      processor.onEmit(mockLog2);
      processor.onErrorOccurred();
      simulateSDKErrorLifecycleCleanup();
      await processor.forceFlush();
      expect(mockExporter.exportedLogs).to.deep.equal([mockLog1, mockLog2]);
    });
  });
});
