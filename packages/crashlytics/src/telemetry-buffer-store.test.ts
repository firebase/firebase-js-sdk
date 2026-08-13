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
import { TelemetryStore, RootTelemetryQueue } from './telemetry-buffer-store';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SdkLogRecord } from '@opentelemetry/sdk-logs';
import { SeverityNumber } from '@opentelemetry/api-logs';

describe('TelemetryStore', () => {
  /**
   * Helper used during the ARRANGE and ACT phases of the tests to create a mock OpenTelemetry parent/root span.
   */
  function createMockRootSpan(traceId: string): ReadableSpan {
    return {
      spanContext: () => ({ traceId }),
      parentSpanContext: undefined
    } as unknown as ReadableSpan;
  }

  /**
   * Helper used during the ARRANGE and ACT phases of the tests to create a mock OpenTelemetry child span.
   */
  function createMockChildSpan(traceId: string): ReadableSpan {
    return {
      spanContext: () => ({ traceId }),
      parentSpanContext: { traceId, spanId: 'parent-span-id' }
    } as unknown as ReadableSpan;
  }

  /**
   * Helper used during the ARRANGE and ACT phases of the tests to create a mock OpenTelemetry root/standalone log record.
   */
  function createMockRootLog(): SdkLogRecord {
    return {
      spanContext: undefined
    } as unknown as SdkLogRecord;
  }

  /**
   * Helper used during the ARRANGE and ACT phases of the tests to create a mock OpenTelemetry child log record.
   */
  function createMockChildLog(traceId: string): SdkLogRecord {
    return {
      spanContext: { traceId }
    } as unknown as SdkLogRecord;
  }

  /**
   * Helper used to initialize a new TelemetryStore instance with specified capacity limits for testing.
   */
  function setupState({ bufferLimit = 1, queueLimit = 1 } = {}): {
    store: TelemetryStore;
  } {
    const store = new TelemetryStore(bufferLimit, queueLimit);
    return { store };
  }

  describe('Event is added but not made exportable; buffer size < limit and queue size < limit', () => {
    it('should add root span with children but not be exportable', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 1 });

      const expectedRootSpan = createMockRootSpan('trace-1');
      const expectedChildSpan = createMockChildSpan('trace-1');
      const expectedChildLog = createMockChildLog('trace-1');

      store.add(expectedRootSpan);
      store.add(expectedChildSpan);
      store.add(expectedChildLog);

      expect(store.getSpansToExport()).to.be.empty;
      expect(store.getLogsToExport()).to.be.empty;
      expect(store.totalTelemetryCount).to.equal(3);
    });
  });

  describe('Event is added and made exportable; buffer size < limit and queue size < limit', () => {
    it('should create an exportable root span with children successfully', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 1 });

      const expectedRootSpan = createMockRootSpan('trace-1');
      const expectedChildSpan = createMockChildSpan('trace-1');
      const expectedChildLog = createMockChildLog('trace-1');

      store.add(expectedRootSpan);
      store.add(expectedChildSpan);
      store.add(expectedChildLog);
      store.update(expectedRootSpan);

      expect(store.getSpansToExport()).to.have.deep.members([
        expectedRootSpan,
        expectedChildSpan
      ]);
      expect(store.getLogsToExport()).to.have.deep.members([expectedChildLog]);
      expect(store.totalTelemetryCount).to.equal(3);
    });

    it('should create an exportable root log successfully', () => {
      const { store } = setupState({ bufferLimit: 1, queueLimit: 1 });

      const expectedRootLog = createMockRootLog();

      store.add(expectedRootLog);

      expect(store.getLogsToExport()).to.have.deep.members([expectedRootLog]);
      expect(store.totalTelemetryCount).to.equal(1);
    });
  });

  describe('Event is added and made exportable after evicting the oldest root and all associated spans/logs', () => {
    it('should create an exportable root span and evict oldest root id if queue size == limit and buffer size < limit', () => {
      const { store } = setupState({ bufferLimit: 4, queueLimit: 1 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const existingChildSpan = createMockChildSpan('trace-1');
      const existingChildLog = createMockChildLog('trace-1');
      const expectedRootSpan = createMockRootSpan('trace-2');

      store.add(existingRootSpan);
      store.add(existingChildSpan);
      store.add(existingChildLog);
      store.update(existingRootSpan);

      store.add(expectedRootSpan);
      store.update(expectedRootSpan);

      expect(store.getSpansToExport()).to.have.deep.members([expectedRootSpan]);
      expect(store.getLogsToExport()).to.be.empty;
      expect(store.totalTelemetryCount).to.equal(1);
    });

    it('should create an exportable root log and evict oldest root id if queue size == limit and buffer size < limit', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 2 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const existingChildSpan = createMockChildSpan('trace-1');
      const existingChildLog = createMockChildLog('trace-1');
      const expectedRootLog = createMockRootLog();

      store.add(existingRootSpan);
      store.add(existingChildSpan);
      store.add(existingChildLog);
      store.update(existingRootSpan);

      store.add(expectedRootLog);

      expect(store.getSpansToExport()).to.be.empty;
      expect(store.getLogsToExport()).to.have.deep.members([expectedRootLog]);
      expect(store.totalTelemetryCount).to.equal(1);
    });

    it('should create an exportable event and evict oldest root id if queue size < limit and buffer size == limit', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 2 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const existingChildSpan = createMockChildSpan('trace-1');
      const existingChildLog = createMockChildLog('trace-1');

      store.add(existingRootSpan);
      store.add(existingChildSpan);
      store.add(existingChildLog);
      store.update(existingRootSpan);

      const expectedRootSpan = createMockRootSpan('trace-2');
      store.add(expectedRootSpan);
      store.update(expectedRootSpan);

      expect(store.getSpansToExport()).to.have.deep.members([expectedRootSpan]);
      expect(store.getLogsToExport()).to.be.empty;
      expect(store.totalTelemetryCount).to.equal(1);
    });
  });

  describe('Event is not added', () => {
    it('should not add any additional event and export limit log if queue size == 0 and buffer size == limit', () => {
      const { store } = setupState({ bufferLimit: 0, queueLimit: 2 });

      const ignoredRootLog = createMockRootLog();

      store.add(ignoredRootLog);

      const exportedLogs = store.getLogsToExport();
      expect(exportedLogs).to.have.lengthOf(1);
      expect(exportedLogs[0]).to.deep.equal({
        severityNumber: SeverityNumber.INFO,
        body: 'Telemetry buffer limit reached. Some telemetry events were dropped.'
      });
      expect(store.totalTelemetryCount).to.equal(0);
    });

    it('should not add and as a result not export any additional root event if already added', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 3 });

      const expectedRootSpan = createMockRootSpan('trace-1');

      store.add(expectedRootSpan);
      store.add(expectedRootSpan); // should not add again
      store.update(expectedRootSpan);
      store.add(expectedRootSpan); // should not add again

      expect(store.getSpansToExport()).to.have.deep.members([expectedRootSpan]);
      expect(store.totalTelemetryCount).to.equal(1);
    });

    it('should not add and as a result not export any additional child event if already added', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 3 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const expectedChildSpan = createMockChildSpan('trace-1');

      store.add(existingRootSpan);
      store.add(expectedChildSpan);
      store.add(expectedChildSpan); // should not add again
      store.update(existingRootSpan);

      expect(store.getSpansToExport()).to.have.deep.members([
        existingRootSpan,
        expectedChildSpan
      ]);
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should not add any child event if its root span has not been added', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 3 });

      const ignoredChildSpan = createMockChildSpan('trace-1');
      const ignoredChildLog = createMockChildSpan('trace-1');

      store.add(ignoredChildSpan);
      store.add(ignoredChildLog);

      expect(store.totalTelemetryCount).to.equal(0);
    });

    it('should not add any child event if its root span must be evicted in the add', () => {
      const { store } = setupState({ bufferLimit: 1, queueLimit: 1 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const ignoredChildLog = createMockChildLog('trace-1');

      store.add(existingRootSpan);
      store.update(existingRootSpan);
      store.add(ignoredChildLog); // could be added asynchronously after its root span updates

      expect(store.totalTelemetryCount).to.equal(0);
    });
  });

  describe('Event cannot be made exportable', () => {
    it('should not create any additional exportable root span if already exportable', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 3 });

      const expectedRootSpan = createMockRootSpan('trace-1');

      store.add(expectedRootSpan);
      store.update(expectedRootSpan);
      store.update(expectedRootSpan); // should not export again

      expect(store.getSpansToExport()).to.have.deep.members([expectedRootSpan]);
      expect(store.totalTelemetryCount).to.equal(1);
    });

    it('should not create an exportable child span if child span is directly queued for export', () => {
      const { store } = setupState({ bufferLimit: 3, queueLimit: 3 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const ignoredChildSpan = createMockChildSpan('trace-1');

      store.add(existingRootSpan);
      store.add(ignoredChildSpan);
      store.update(ignoredChildSpan); // should not export

      expect(store.getSpansToExport()).to.be.empty;
    });
  });

  describe('Clear events from store', () => {
    it('should reset telemetry count to 0 and return no spans/logs for export', () => {
      const { store } = setupState({ bufferLimit: 4, queueLimit: 2 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const existingChildSpan = createMockChildSpan('trace-1');
      const existingChildLog = createMockChildLog('trace-1');
      const existingRootLog = createMockRootLog();

      store.add(existingRootSpan);
      store.add(existingChildSpan);
      store.add(existingChildLog);
      store.add(existingRootLog);
      store.update(existingRootSpan);

      store.clear();

      expect(store.getSpansToExport()).to.be.empty;
      expect(store.getLogsToExport()).to.be.empty;
      expect(store.totalTelemetryCount).to.equal(0);
    });

    it('should return no limit log for export if previously triggered', () => {
      const { store } = setupState({ bufferLimit: 0, queueLimit: 2 });

      const ignoredRootLog = createMockRootLog();

      store.add(ignoredRootLog); // triggers limit log to be exported as root log is dropped

      store.clear();

      expect(store.getLogsToExport()).to.be.empty;
    });
  });

  describe('Test assumption that events can only be considered the same if they point to the same memory', () => {
    it('should treat two identical child spans of different memory as different events', () => {
      const { store } = setupState({ bufferLimit: 4, queueLimit: 2 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const existingChildSpan1 = createMockChildSpan('trace-1');
      const existingChildSpan2 = createMockChildSpan('trace-1');

      store.add(existingRootSpan);
      store.add(existingChildSpan1);
      store.add(existingChildSpan2);
      store.update(existingRootSpan);

      expect(store.getSpansToExport()).to.have.deep.members([
        existingRootSpan,
        existingChildSpan1,
        existingChildSpan2
      ]);
    });

    it('should treat two identical child spans of same memory as same events', () => {
      const { store } = setupState({ bufferLimit: 4, queueLimit: 2 });

      const existingRootSpan = createMockRootSpan('trace-1');
      const existingChildSpan = createMockChildSpan('trace-1');

      store.add(existingRootSpan);
      store.add(existingChildSpan);
      store.add(existingChildSpan);
      store.update(existingRootSpan);

      expect(store.getSpansToExport()).to.have.deep.members([
        existingRootSpan,
        existingChildSpan
      ]);
    });
  });
});

describe('RootTelemetryQueue', () => {
  it('should initialize empty', () => {
    const queue = new RootTelemetryQueue(2);
    expect(queue.size).to.equal(0);
    expect(queue.peek()).to.be.undefined;
    expect(queue.dequeue()).to.be.undefined;
  });

  it('should enqueue and dequeue in FIFO order with circular wrapping', () => {
    const queue = new RootTelemetryQueue(3);
    queue.enqueue('a');
    queue.enqueue('b');

    expect(queue.size).to.equal(2);
    expect(queue.peek()).to.equal('a');

    expect(queue.dequeue()).to.equal('a'); // head = 1, tail = 2

    // Enqueuing here wraps the tail pointer around the circular array to index 0
    queue.enqueue('c');

    expect(queue.size).to.equal(2);
    expect(queue.peek()).to.equal('b');

    queue.enqueue('d'); // head = 1, tail = 1 (queue is now full)

    expect(queue.size).to.equal(3);
    expect(queue.peek()).to.equal('b');

    expect(queue.dequeue()).to.equal('b'); // head = 2, tail = 1
    expect(queue.dequeue()).to.equal('c'); // head = 0, tail = 1
    expect(queue.dequeue()).to.equal('d'); // head = 1, tail = 1

    expect(queue.size).to.equal(0);
    expect(queue.dequeue()).to.be.undefined;
  });

  it('should not enqueue when limit is exceeded', () => {
    const queue = new RootTelemetryQueue(2);
    queue.enqueue('a');
    queue.enqueue('b');

    // Third item exceeds limit of 2, should do nothing
    queue.enqueue('c');
    expect(queue.size).to.equal(2);
    expect(queue.peek()).to.equal('a');
  });

  it('should clear the queue', () => {
    const queue = new RootTelemetryQueue(2);
    queue.enqueue('a');
    queue.enqueue('b');
    queue.clear();
    expect(queue.size).to.equal(0);
    expect(queue.peek()).to.be.undefined;
  });

  it('should throw an error if limit is less than or equal to 0', () => {
    expect(() => new RootTelemetryQueue(0)).to.throw(
      'Limit must be a positive integer greater than 0'
    );
    expect(() => new RootTelemetryQueue(-5)).to.throw(
      'Limit must be a positive integer greater than 0'
    );
  });
});
