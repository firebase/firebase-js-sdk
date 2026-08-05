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
import {
  RootTelemetryQueue,
  TelemetryBufferStore,
  EventList
} from './telemetry-buffer-store';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SdkLogRecord } from '@opentelemetry/sdk-logs';

describe('TelemetryBufferStore', () => {
  /**
   * Helper used during the ARRANGE and ACT phases of the tests to create a mock OpenTelemetry parent/root span.
   */
  function createMockParentSpan(traceId: string): ReadableSpan {
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
   * Helper used during the ARRANGE and ACT phases of the tests to create a mock OpenTelemetry child log record.
   */
  function createMockChildLog(traceId: string): SdkLogRecord {
    return {
      spanContext: { traceId }
    } as unknown as SdkLogRecord;
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
   * Helper used during the ARRANGE phase of a test to populate the store
   * with a baseline trace hierarchy.
   */
  function addTrace(
    store: TelemetryBufferStore,
    traceId: string,
    options: {
      childSpans?: number;
      childLogs?: number;
      endRoot?: boolean;
    } = {}
  ): ReadableSpan {
    const { childSpans = 0, childLogs = 0, endRoot = true } = options;
    const span = createMockParentSpan(traceId);
    store.addSpanOnStart(span);

    for (let i = 0; i < childSpans; i++) {
      store.addSpanOnStart(createMockChildSpan(traceId));
    }
    for (let i = 0; i < childLogs; i++) {
      store.addLogOnEmit(createMockChildLog(traceId));
    }

    if (endRoot) {
      store.addRootSpanOnEnd(span);
    }
    return span;
  }

  /**
   * Helper used during the ASSERT phase to verify the contents of a trace in the store.
   */
  function validateTrace(
    store: TelemetryBufferStore,
    traceId: string,
    expected: { spans: number; logs: number }
  ): void {
    const map = store['_telemetryEmitBufferMap'];
    expect(map.has(traceId)).to.be.true;
    const item = map.get(traceId);
    expect(item).to.be.an.instanceof(EventList);
    const eventList = item as EventList;
    expect(eventList.spans).to.have.lengthOf(expected.spans);
    expect(eventList.logs).to.have.lengthOf(expected.logs);
  }

  describe('addSpanOnStart', () => {
    it('should add root span to buffer with no pruning if queue size == limit and buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 1);

      // Arrange
      addTrace(store, 'trace-1'); // fills queue (queue = ['trace-1'])

      // Act
      const span2 = createMockParentSpan('trace-2');
      store.addSpanOnStart(span2);

      // Assert
      const queue = store['_rootTelemetryQueue'];
      validateTrace(store, 'trace-2', { spans: 1, logs: 0 });
      expect(queue.size).to.equal(1);
      expect(queue.peek()).to.equal('trace-1');
      expect(store['_totalTelemetryCount']).to.equal(2);
    });

    it('should add root span to buffer and evict oldest root id if queue size < limit and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      addTrace(store, 'trace-1'); // count = 1, queue = ['trace-1']
      addTrace(store, 'trace-2', { endRoot: false }); // count = 2 (limit), queue = ['trace-1']

      // Act
      const span3 = createMockParentSpan('trace-3');
      store.addSpanOnStart(span3); // triggers eviction

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(store['_telemetryEmitBufferMap'].has('trace-1')).to.be.false;
      validateTrace(store, 'trace-3', { spans: 1, logs: 0 });
      expect(queue.getValues()).to.deep.equal([]);
      expect(store['_totalTelemetryCount']).to.equal(2);
    });

    it('should not add root span to buffer if queue size == 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      addTrace(store, 'trace-1', { endRoot: false }); // count = 1 (limit), queue size = 0

      // Act
      const span2 = createMockParentSpan('trace-2');
      store.addSpanOnStart(span2); // dropped

      // Assert
      expect(store['_telemetryEmitBufferMap'].has('trace-2')).to.be.false;
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });
      expect(store['_totalTelemetryCount']).to.equal(1);
    });

    it('should add child span to buffer with no pruning if queue size == limit and buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 1);

      // Arrange
      addTrace(store, 'trace-1'); // fills queue (queue = ['trace-1'])
      addTrace(store, 'trace-2', { endRoot: false }); // count = 2

      // Act
      const child2 = createMockChildSpan('trace-2');
      store.addSpanOnStart(child2);

      // Assert
      const queue = store['_rootTelemetryQueue'];
      validateTrace(store, 'trace-2', { spans: 2, logs: 0 });
      expect(queue.size).to.equal(1);
      expect(store['_totalTelemetryCount']).to.equal(3);
    });

    it('should add child span to buffer and evict oldest root id if queue size < limit and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      addTrace(store, 'trace-1'); // count = 1, queue = ['trace-1']
      addTrace(store, 'trace-2', { endRoot: false }); // count = 2 (limit), queue = ['trace-1']

      // Act
      const child2 = createMockChildSpan('trace-2');
      store.addSpanOnStart(child2); // triggers eviction of trace-1

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(store['_telemetryEmitBufferMap'].has('trace-1')).to.be.false;
      validateTrace(store, 'trace-2', { spans: 2, logs: 0 });
      expect(queue.getValues()).to.deep.equal([]);
      expect(store['_totalTelemetryCount']).to.equal(2);
    });

    it('should not add child span to buffer if queue size == 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      addTrace(store, 'trace-1', { endRoot: false }); // count = 1 (limit), queue size = 0

      // Act
      const child1 = createMockChildSpan('trace-1');
      store.addSpanOnStart(child1); // dropped

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });
      expect(store['_totalTelemetryCount']).to.equal(1);
    });

    it('should not add child span to buffer and with no pruning if its root span was not added to buffer, queue size < limit, and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = addTrace(store, 'trace-1', { endRoot: false }); // count = 1 (limit), queue size = 0
      const root2 = createMockParentSpan('trace-2');
      store.addSpanOnStart(root2); // dropped due to capacity limits
      store.addRootSpanOnEnd(span1); // complete trace-1 (enqueues trace-1)

      // Act
      const child2 = createMockChildSpan('trace-2');
      store.addSpanOnStart(child2); // dropped because parent trace-2 doesn't exist

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(store['_telemetryEmitBufferMap'].has('trace-2')).to.be.false; // trace-2 not added
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 }); // trace-1 preserved (not evicted)
      expect(store['_totalTelemetryCount']).to.equal(1);
      expect(queue.getValues()).to.deep.equal(['trace-1']);
    });
  });

  describe('addRootSpanOnEnd', () => {
    it('should add root span to queue with no pruning if queue size < limit and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      addTrace(store, 'trace-1'); // count = 1 (ended, queue = ['trace-1'])
      const span2 = addTrace(store, 'trace-2', { endRoot: false }); // count = 2 (limit)

      // Act
      store.addRootSpanOnEnd(span2);

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(queue.getValues()).to.deep.equal(['trace-1', 'trace-2']);
      expect(store['_totalTelemetryCount']).to.equal(2);
    });

    it('should add root span to queue and evict oldest root id if queue size == limit and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 1);

      // Arrange
      addTrace(store, 'trace-1'); // count = 1 (ended, queue = ['trace-1'])
      const span2 = addTrace(store, 'trace-2', { endRoot: false }); // count = 2 (limit)

      // Act
      store.addRootSpanOnEnd(span2); // enqueues trace-2, evicting trace-1 from queue and map

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(store['_telemetryEmitBufferMap'].has('trace-1')).to.be.false; // trace-1 evicted
      validateTrace(store, 'trace-2', { spans: 1, logs: 0 }); // trace-2 remains
      expect(queue.getValues()).to.deep.equal(['trace-2']);
      expect(store['_totalTelemetryCount']).to.equal(1);
    });

    it('should not add root span to queue and with no pruning if it wasn’t added to the buffer onStart', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = addTrace(store, 'trace-1', { endRoot: false }); // count = 1 (limit), queue size = 0
      const span2 = createMockParentSpan('trace-2');
      store.addSpanOnStart(span2); // dropped due to capacity limits
      store.addRootSpanOnEnd(span1); // complete trace-1 (enqueues trace-1)

      // Act
      store.addRootSpanOnEnd(span2);

      // Assert
      const queue = store['_rootTelemetryQueue'];
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 }); // trace-1 preserved (not evicted)
      expect(queue.getValues()).to.deep.equal(['trace-1']);
      expect(store['_totalTelemetryCount']).to.equal(1);
    });

    it('should do nothing when a child span is passed in', () => {
      const store = new TelemetryBufferStore(10, 5);

      // Arrange
      addTrace(store, 'trace-1', { endRoot: false }); // count = 1, queue size = 0
      const child = createMockChildSpan('trace-1');
      store.addSpanOnStart(child); // count = 2

      // Act
      store.addRootSpanOnEnd(child); // should be ignored

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(queue.getValues()).to.deep.equal([]);
      expect(store['_totalTelemetryCount']).to.equal(2);
    });
  });

  describe('addLogOnEmit', () => {
    it('should add root log to buffer and queue with no pruning if queue size < limit and buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 5);

      // Arrange: baseline count = 5 (trace-1 has size 4, standalone log has size 1)
      addTrace(store, 'trace-1', { childSpans: 2, childLogs: 1 });
      const log1 = createMockRootLog();
      store.addLogOnEmit(log1);

      // Act
      const log2 = createMockRootLog();
      store.addLogOnEmit(log2);

      // Assert
      const map = store['_telemetryEmitBufferMap'];
      const queue = store['_rootTelemetryQueue'];

      validateTrace(store, 'trace-1', { spans: 3, logs: 1 });

      const queueContents = queue.getValues();
      expect(queueContents).to.have.lengthOf(3);
      expect(queueContents[0]).to.equal('trace-1');
      expect(map.get(queueContents[1]!)).to.equal(log1);
      expect(map.get(queueContents[2]!)).to.equal(log2);
      expect(store['_totalTelemetryCount']).to.equal(6);
    });

    it('should add root log to buffer and queue and evict oldest root id if queue size == limit and buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 2);

      // Arrange
      const log1 = createMockRootLog();
      store.addLogOnEmit(log1);
      const uuid1 = store['_rootTelemetryQueue'].peek()!;
      const log2 = createMockRootLog();
      store.addLogOnEmit(log2);

      // Act
      const log3 = createMockRootLog();
      store.addLogOnEmit(log3);

      // Assert
      const map = store['_telemetryEmitBufferMap'];
      const queue = store['_rootTelemetryQueue'];

      expect(map.has(uuid1)).to.be.false;
      expect(store['_totalTelemetryCount']).to.equal(2);

      const queueContents = queue.getValues();
      expect(queueContents).to.have.lengthOf(2);
      expect(map.get(queueContents[0]!)).to.equal(log2);
      expect(map.get(queueContents[1]!)).to.equal(log3);
    });

    it('should add root log to buffer and queue and evict oldest root id if queue size < limit and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      const log1 = createMockRootLog();
      store.addLogOnEmit(log1);
      const uuid1 = store['_rootTelemetryQueue'].peek()!;
      const log2 = createMockRootLog();
      store.addLogOnEmit(log2);

      // Act
      const log3 = createMockRootLog();
      store.addLogOnEmit(log3);

      // Assert
      const map = store['_telemetryEmitBufferMap'];
      const queue = store['_rootTelemetryQueue'];
      expect(map.has(uuid1)).to.be.false;
      expect(store['_totalTelemetryCount']).to.equal(2);

      const queueContents = queue.getValues();
      expect(queueContents).to.have.lengthOf(2);
      expect(map.get(queueContents[0]!)).to.equal(log2);
      expect(map.get(queueContents[1]!)).to.equal(log3);
    });

    it('should add child log to buffer only with no pruning if queue size == limit and buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 1);

      // Arrange
      addTrace(store, 'trace-1'); // fills queue
      const root2 = createMockParentSpan('trace-2');
      store.addSpanOnStart(root2);

      // Act
      const log = createMockChildLog('trace-2');
      store.addLogOnEmit(log);

      // Assert
      validateTrace(store, 'trace-2', { spans: 1, logs: 1 });
      expect(store['_totalTelemetryCount']).to.equal(3); // trace-1 (1) + root2 (1) + childLog (1) = 3
    });

    it('should add child log to buffer only and evict oldest root id if queue size < limit and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      addTrace(store, 'trace-1'); // count = 1 (ended, queue = ['trace-1'])
      addTrace(store, 'trace-2', { endRoot: false }); // count = 2 (limit), queue = ['trace-1']

      // Act
      const log = createMockChildLog('trace-2');
      store.addLogOnEmit(log); // triggers capacity eviction of trace-1

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(store['_telemetryEmitBufferMap'].has('trace-1')).to.be.false; // trace-1 evicted
      validateTrace(store, 'trace-2', { spans: 1, logs: 1 });
      expect(queue.getValues()).to.deep.equal([]); // empty since trace-2 has not ended yet
      expect(store['_totalTelemetryCount']).to.equal(2);
    });

    it('should not add child log to buffer if its own trace id was removed from queue due to eviction', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange: total count = 2 (buffer limit), oldest enqueued trace is 'trace-1'.
      // This simulates a child log arriving asynchronously AFTER its root span ('trace-1') has already ended and entered the eviction queue.
      addTrace(store, 'trace-1'); // count = 1, queue = ['trace-1']
      addTrace(store, 'trace-2'); // count = 2, queue = ['trace-1', 'trace-2'] (reaches buffer limit)

      // Act: child log of trace-1 triggers capacity check, evicting its own trace-1
      const log = createMockChildLog('trace-1');
      store.addLogOnEmit(log);

      // Assert: trace-1 is completely evicted, and the child log is discarded
      const queue = store['_rootTelemetryQueue'];

      expect(store['_telemetryEmitBufferMap'].has('trace-1')).to.be.false;
      expect(store['_totalTelemetryCount']).to.equal(1); // only trace-2 remains
      expect(queue.getValues()).to.deep.equal(['trace-2']);
    });

    it('should not add child log to buffer and with no pruning if its root span was not added to buffer, queue size < limit, and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = addTrace(store, 'trace-1', { endRoot: false }); // count = 1 (limit), queue size = 0
      const root2 = createMockParentSpan('trace-2');
      store.addSpanOnStart(root2); // dropped due to capacity limits
      store.addRootSpanOnEnd(span1); // complete trace-1 (enqueues trace-1)

      // Act
      const log = createMockChildLog('trace-2');
      store.addLogOnEmit(log); // dropped because parent trace-2 doesn't exist, short-circuits eviction

      // Assert
      const queue = store['_rootTelemetryQueue'];
      expect(store['_telemetryEmitBufferMap'].has('trace-2')).to.be.false; // trace-2 not added
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 }); // trace-1 preserved (not evicted)
      expect(store['_totalTelemetryCount']).to.equal(1);
      expect(queue.getValues()).to.deep.equal(['trace-1']);
    });

    it('should not add any log to buffer or queue if queue size == 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      addTrace(store, 'trace-1', { endRoot: false }); // reaches buffer limit

      // Act
      const log2 = createMockChildLog('trace-1');
      store.addLogOnEmit(log2); // dropped child log

      const log3 = createMockRootLog();
      store.addLogOnEmit(log3); // dropped standalone root log

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 }); // trace-1 remains unchanged
    });
  });

  describe('_ensureBufferCapacity', () => {
    it('should set shouldAddLimitLog flag to true if queue size == 0 and buffer size == limit and return false', () => {
      const store = new TelemetryBufferStore(0, 5);

      // Act
      const result = store['_ensureBufferCapacity']();

      // Assert
      expect(result).to.be.false;
      expect(store['_shouldAddLimitLog']).to.be.true;
    });

    it('should free up buffer capacity if queue size != 0 and buffer size == limit and return true', () => {
      const store = new TelemetryBufferStore(1, 5);

      // Arrange
      const log = createMockRootLog();
      store.addLogOnEmit(log);

      // Act
      const result = store['_ensureBufferCapacity']();

      // Assert
      const uuid = store['_rootTelemetryQueue'].peek()!;
      expect(result).to.be.true;
      expect(store['_telemetryEmitBufferMap'].has(uuid)).to.be.false;
    });

    it('should not do anything if buffer capacity is available and return true', () => {
      const store = new TelemetryBufferStore(10, 5);

      // Act
      const result = store['_ensureBufferCapacity']();

      // Assert
      expect(result).to.be.true;
      expect(store['_shouldAddLimitLog']).to.be.false;
    });
  });

  describe('_generateUuid', () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    describe('when crypto is available', () => {
      it('should generate a valid UUID v4 format string using native crypto', () => {
        const store = new TelemetryBufferStore();
        const uuid = store['_generateUuid']();
        expect(uuid).to.match(uuidRegex);
      });

      it('should generate unique UUIDs with no collisions using native crypto', () => {
        const store = new TelemetryBufferStore();
        const uuids = new Set<string>();
        for (let i = 0; i < 100; i++) {
          uuids.add(store['_generateUuid']());
        }
        expect(uuids.size).to.equal(100);
      });
    });

    describe('when crypto is unavailable', () => {
      let originalCrypto: any;

      beforeEach(() => {
        originalCrypto = globalThis.crypto;
        Object.defineProperty(globalThis, 'crypto', {
          value: undefined,
          configurable: true,
          writable: true
        });
      });

      afterEach(() => {
        Object.defineProperty(globalThis, 'crypto', {
          value: originalCrypto,
          configurable: true,
          writable: true
        });
      });

      it('should generate a valid UUID v4 format string when crypto is unavailable', () => {
        const store = new TelemetryBufferStore();
        const uuid = store['_generateUuid']();
        expect(uuid).to.match(uuidRegex);
      });

      it('should generate unique UUIDs with no collisions when crypto is unavailable', () => {
        const store = new TelemetryBufferStore();
        const uuids = new Set<string>();
        for (let i = 0; i < 100; i++) {
          uuids.add(store['_generateUuid']());
        }
        expect(uuids.size).to.equal(100);
      });
    });
  });

  describe('_evictIdFromBuffer', () => {
    it('should evict all spans and logs for a given trace id from the buffer map and correctly update telemetry count', () => {
      const store = new TelemetryBufferStore();

      // Arrange
      addTrace(store, 'trace-1'); // count = 1
      addTrace(store, 'trace-2'); // count = 2

      // Act
      store['_evictIdFromBuffer']('trace-1');

      // Assert
      const map = store['_telemetryEmitBufferMap'];
      expect(map.has('trace-1')).to.be.false;
      validateTrace(store, 'trace-2', { spans: 1, logs: 0 }); // trace-2 preserved
      expect(store['_totalTelemetryCount']).to.equal(1);
    });

    it('should evict the root log for a given uuid from the buffer map and correctly update telemetry count', () => {
      const store = new TelemetryBufferStore();

      // Arrange
      const log1 = createMockRootLog();
      store.addLogOnEmit(log1);
      const uuid1 = store['_rootTelemetryQueue'].peek()!;

      const log2 = createMockRootLog();
      store.addLogOnEmit(log2);

      // Act
      store['_evictIdFromBuffer'](uuid1);

      // Assert
      const map = store['_telemetryEmitBufferMap'];
      expect(map.has(uuid1)).to.be.false;

      const uuid2 = Array.from(map.keys())[0]!;
      expect(map.get(uuid2)).to.equal(log2); // log2 preserved
      expect(store['_totalTelemetryCount']).to.equal(1);
    });

    it('should not do anything if trace id or uuid is not in the buffer map', () => {
      const store = new TelemetryBufferStore();

      // Arrange
      addTrace(store, 'trace-1', { endRoot: false }); // count = 1
      const log = createMockRootLog();
      store.addLogOnEmit(log); // count = 2
      const uuid = store['_rootTelemetryQueue'].peek()!;

      // Act
      store['_evictIdFromBuffer']('non-existent');

      // Assert
      const map = store['_telemetryEmitBufferMap'];
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });
      expect(map.has(uuid)).to.be.true;
      expect(store['_totalTelemetryCount']).to.equal(2);
    });
  });

  describe('clear', () => {
    it('should clear queue and buffer map, reset telemetry count to 0, and reset shouldAddLimitLog flag', () => {
      const store = new TelemetryBufferStore(4, 5);

      // Arrange
      const rootSpan = addTrace(store, 'trace-1', {
        childSpans: 1,
        childLogs: 1,
        endRoot: false
      }); // count = 3, queue size = 0
      const log = createMockRootLog();
      store.addLogOnEmit(log); // count = 4, queue size = 1 (contains log UUID)

      // Add a child span to trace-1, which will evict the standalone log
      store.addSpanOnStart(createMockChildSpan('trace-1')); // count becomes 4, queue size becomes 0

      // Add another child span to trace-1, which will trigger the limit log flag since queue is empty
      store.addSpanOnStart(createMockChildSpan('trace-1')); // fails capacity check, count remains 4, shouldAddLimitLog becomes true

      // End the root span of trace-1 to populate the queue
      store.addRootSpanOnEnd(rootSpan); // queue size becomes 1 (contains trace-1)

      // Act
      store.clear();

      // Assert
      expect(store['_totalTelemetryCount']).to.equal(0);
      expect(store['_rootTelemetryQueue'].size).to.equal(0);
      expect(store['_telemetryEmitBufferMap'].size).to.equal(0);
      expect(store['_shouldAddLimitLog']).to.be.false;
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

  it('should drop oldest item when limit is exceeded', () => {
    const queue = new RootTelemetryQueue(2);
    expect(queue.enqueue('a')).to.be.undefined;
    expect(queue.enqueue('b')).to.be.undefined;

    // Third item exceeds limit of 2, should drop and return the oldest ('a')
    expect(queue.enqueue('c')).to.equal('a');
    expect(queue.size).to.equal(2);
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
