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
  TelemetryBufferStore,
  RootTelemetryQueue
} from './telemetry-buffer-store';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SdkLogRecord } from '@opentelemetry/sdk-logs';

describe('TelemetryBufferStore', () => {
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
   * Helper used during the ASSERT phase to verify the contents of a completed trace in the store.
   */
  function validateTrace(
    store: TelemetryBufferStore,
    traceId: string,
    expected: { spans: number; logs: number }
  ): void {
    const spans = store
      .getBufferedSpans()
      .filter(s => s.spanContext().traceId === traceId);
    const logs = store
      .getBufferedLogs()
      .filter(l => l.spanContext?.traceId === traceId);
    expect(spans).to.have.lengthOf(expected.spans);
    expect(logs).to.have.lengthOf(expected.logs);
  }

  describe('addSpanOnStart', () => {
    it('should add root span to buffer without pruning if buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 1);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // fills queue (queue = ['trace-1'])

      // Act
      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2);

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should add root span to buffer and evict oldest root id if queue size > 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // count = 1, queue = ['trace-1']

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // count = 2 (limit), queue = ['trace-1']

      // Act
      const span3 = createMockRootSpan('trace-3');
      store.addSpanOnStart(span3); // triggers eviction

      // Assert
      expect(
        store
          .getBufferedSpans()
          .filter(s => s.spanContext().traceId === 'trace-1')
      ).to.have.lengthOf(0);
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should set shouldAddLimitLog flag to true and not add root span to buffer if queue size == 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1); // count = 1 (limit), queue size = 0

      // Act
      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // dropped

      // Assert
      expect(store.totalTelemetryCount).to.equal(1);
      expect(store.shouldAddLimitLog).to.be.true;
    });

    it('should add child span to buffer without pruning if buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 1);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // fills queue (queue = ['trace-1'])

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // count = 2

      // Act
      const child2 = createMockChildSpan('trace-2');
      store.addSpanOnStart(child2);

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });
      expect(store.totalTelemetryCount).to.equal(3);
    });

    it('should add child span to buffer and evict oldest root id if queue size > 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // count = 1, queue = ['trace-1']

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // count = 2 (limit), queue = ['trace-1']

      // Act
      const child2 = createMockChildSpan('trace-2');
      store.addSpanOnStart(child2); // triggers eviction of trace-1

      // Assert
      expect(
        store
          .getBufferedSpans()
          .filter(s => s.spanContext().traceId === 'trace-1')
      ).to.have.lengthOf(0);
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should set shouldAddLimitLog flag to true and not add child span to buffer if queue size == 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1); // count = 1 (limit), queue size = 0

      // Act
      const child1 = createMockChildSpan('trace-1');
      store.addSpanOnStart(child1); // dropped

      // Assert
      expect(store.totalTelemetryCount).to.equal(1);
      expect(store.shouldAddLimitLog).to.be.true;
    });

    it('should not add child span to buffer and without pruning if its root span was not added to buffer', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1); // count = 1 (limit), queue size = 0

      const root2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(root2); // dropped due to capacity limits
      store.addRootSpanOnEnd(span1); // complete trace-1 (enqueues trace-1)

      // Act
      const child2 = createMockChildSpan('trace-2');
      store.addSpanOnStart(child2); // dropped because parent trace-2 doesn't exist

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 }); // trace-1 preserved (not evicted)
      expect(store.totalTelemetryCount).to.equal(1);
    });
  });

  describe('addRootSpanOnEnd', () => {
    it('should add root span to queue without pruning if queue size < limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // count = 1 (ended, queue = ['trace-1'])

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // count = 2 (limit)

      // Act
      store.addRootSpanOnEnd(span2);

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });
      validateTrace(store, 'trace-2', { spans: 1, logs: 0 });
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should add root span to queue and evict oldest root id if queue size == limit', () => {
      const store = new TelemetryBufferStore(2, 1);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // count = 1 (ended, queue = ['trace-1'])

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // count = 2 (limit)

      // Act
      store.addRootSpanOnEnd(span2); // enqueues trace-2, evicting trace-1 from queue and map

      // Assert
      expect(
        store
          .getBufferedSpans()
          .filter(s => s.spanContext().traceId === 'trace-1')
      ).to.have.lengthOf(0);
      validateTrace(store, 'trace-2', { spans: 1, logs: 0 }); // trace-2 remains
      expect(store.totalTelemetryCount).to.equal(1);
    });

    it('should not add root span to queue and without pruning if it wasn’t added to the buffer onStart', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1); // count = 1 (limit), queue size = 0

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // dropped due to capacity limits
      store.addRootSpanOnEnd(span1); // complete trace-1 (enqueues trace-1)

      // Act
      store.addRootSpanOnEnd(span2);

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 }); // trace-1 preserved (not evicted)
      expect(store.totalTelemetryCount).to.equal(1);
    });

    it('should do nothing when a child span is passed in', () => {
      const store = new TelemetryBufferStore(10, 5);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1); // count = 1, queue size = 0

      const child = createMockChildSpan('trace-1');
      store.addSpanOnStart(child); // count = 2

      // Act
      store.addRootSpanOnEnd(child); // should be ignored

      // Assert
      expect(store.getBufferedSpans()).to.have.lengthOf(0);
      expect(store.totalTelemetryCount).to.equal(2);
    });
  });

  describe('addLogOnEmit', () => {
    it('should add root log to buffer and queue without pruning if queue size < limit and buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 5);

      // Arrange: baseline count = 2, queue size = 2
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1);
      const log1 = createMockRootLog();
      store.addLogOnEmit(log1);

      // Act
      const log2 = createMockRootLog();
      store.addLogOnEmit(log2);

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });

      const logs = store.getBufferedLogs();
      expect(logs).to.have.lengthOf(2);
      expect(logs).to.include(log1);
      expect(logs).to.include(log2);
      expect(store.totalTelemetryCount).to.equal(3);
    });

    it('should add root log to buffer and queue and evict oldest root id if queue size == limit and buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 2);

      // Arrange
      const log1 = createMockRootLog();
      store.addLogOnEmit(log1);
      const log2 = createMockRootLog();
      store.addLogOnEmit(log2);

      // Act
      const log3 = createMockRootLog();
      store.addLogOnEmit(log3);

      // Assert
      const logs = store.getBufferedLogs();
      expect(logs).to.have.lengthOf(2);
      expect(logs).to.not.include(log1);
      expect(logs).to.include(log2);
      expect(logs).to.include(log3);
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should add root log to buffer and queue and evict oldest root id if queue size < limit and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      const log1 = createMockRootLog();
      store.addLogOnEmit(log1);

      const log2 = createMockRootLog();
      store.addLogOnEmit(log2);

      // Act
      const log3 = createMockRootLog();
      store.addLogOnEmit(log3);

      // Assert
      const logs = store.getBufferedLogs();
      expect(logs).to.have.lengthOf(2);
      expect(logs).to.not.include(log1);
      expect(logs).to.include(log2);
      expect(logs).to.include(log3);
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should add child log to buffer without pruning if buffer size < limit', () => {
      const store = new TelemetryBufferStore(10, 1);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // fills queue

      const root2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(root2);

      // Act
      const log = createMockChildLog('trace-2');
      store.addLogOnEmit(log);

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 });
      expect(store.totalTelemetryCount).to.equal(3); // trace-1 (1) + root2 (1) + childLog (1) = 3
    });

    it('should add child log to buffer and evict oldest root id if queue size > 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // count = 1 (ended, queue = ['trace-1'])

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2); // count = 2 (limit), queue = ['trace-1']

      // Act
      const log = createMockChildLog('trace-2');
      store.addLogOnEmit(log); // triggers capacity eviction of trace-1

      // Assert
      expect(
        store
          .getBufferedSpans()
          .filter(s => s.spanContext().traceId === 'trace-1')
      ).to.have.lengthOf(0);
      expect(store.totalTelemetryCount).to.equal(2);
    });

    it('should not add child log to buffer if its own trace id was removed from queue due to eviction', () => {
      const store = new TelemetryBufferStore(2, 5);

      // Arrange: total count = 2 (buffer limit), oldest enqueued trace is 'trace-1'.
      // This simulates a child log arriving asynchronously AFTER its root span ('trace-1') has already ended and entered the eviction queue.
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      store.addRootSpanOnEnd(span1); // count = 1, queue = ['trace-1']

      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2);
      store.addRootSpanOnEnd(span2); // count = 2, queue = ['trace-1', 'trace-2'] (reaches buffer limit)

      // Act: child log of trace-1 triggers capacity check, evicting its own trace-1
      const log = createMockChildLog('trace-1');
      store.addLogOnEmit(log);

      // Assert: trace-1 is completely evicted, and the child log is discarded
      expect(
        store
          .getBufferedSpans()
          .filter(s => s.spanContext().traceId === 'trace-1')
      ).to.have.lengthOf(0);
      validateTrace(store, 'trace-2', { spans: 1, logs: 0 });
      expect(store.totalTelemetryCount).to.equal(1); // only trace-2 remains
    });

    it('should not add child log to buffer and without pruning if its root span was not added to buffer', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1); // count = 1 (limit), queue size = 0

      const root2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(root2); // dropped due to capacity limits
      store.addRootSpanOnEnd(span1); // complete trace-1 (enqueues trace-1)

      // Act
      const log = createMockChildLog('trace-2');
      store.addLogOnEmit(log); // dropped because parent trace-2 doesn't exist, short-circuits eviction

      // Assert
      validateTrace(store, 'trace-1', { spans: 1, logs: 0 }); // trace-1 preserved (not evicted)
      expect(store.totalTelemetryCount).to.equal(1);
    });

    it('should set shouldAddLimitLog flag to true and not add any log to buffer or queue if queue size == 0 and buffer size == limit', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1); // reaches buffer limit

      // Act
      const log2 = createMockChildLog('trace-1');
      store.addLogOnEmit(log2); // dropped child log

      const log3 = createMockRootLog();
      store.addLogOnEmit(log3); // dropped standalone root log

      // Assert
      expect(store.totalTelemetryCount).to.equal(1);
      expect(store.shouldAddLimitLog).to.be.true;
    });
  });

  describe('clear', () => {
    it('should clear queue and buffer map, reset telemetry count to 0, and reset shouldAddLimitLog flag to false', () => {
      const store = new TelemetryBufferStore(1, 2);

      // Arrange
      const rootSpan = createMockRootSpan('trace-1');
      store.addSpanOnStart(rootSpan); // count = 1, queue size = 0

      store.addSpanOnStart(createMockRootSpan('trace-2')); // dropped, count = 1, shouldAddLimitLog = true
      store.addRootSpanOnEnd(rootSpan); // enqueued, count = 1, queue size = 1

      // Act
      store.clear();

      // Assert
      expect(store.totalTelemetryCount).to.equal(0);
      expect(store.shouldAddLimitLog).to.be.false;
      expect(
        store
          .getBufferedSpans()
          .filter(s => s.spanContext().traceId === 'trace-1')
      ).to.have.lengthOf(0);
      expect(store.getBufferedSpans()).to.have.lengthOf(0);
      expect(store.getBufferedLogs()).to.have.lengthOf(0);
    });
  });

  describe('getBufferedSpans', () => {
    it('should return spans of ended root traces and ignore active traces, logs, and evicted traces', () => {
      const store = new TelemetryBufferStore(10, 2);

      // Arrange
      // trace-1 is started and ended (completed). It has 1 root span and 1 child span.
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      const child1 = createMockChildSpan('trace-1');
      store.addSpanOnStart(child1);
      store.addRootSpanOnEnd(span1);

      // trace-2 is started but not ended (active).
      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2);

      // standalone log is enqueued (queue = ['trace-1', standalone_log_uuid])
      const log = createMockRootLog();
      store.addLogOnEmit(log);

      // trace-3 is started and ended. This will cause trace-1 (oldest in queue of size 2) to be evicted from queue and map.
      // queue = [standalone_log_uuid, 'trace-3']
      const span3 = createMockRootSpan('trace-3');
      store.addSpanOnStart(span3);
      const child3 = createMockChildSpan('trace-3');
      store.addSpanOnStart(child3);
      const log3 = createMockChildLog('trace-3');
      store.addLogOnEmit(log3);
      store.addRootSpanOnEnd(span3);

      // Act
      const spans = store.getBufferedSpans();

      // Assert
      expect(spans).to.deep.equal([span3, child3]);
    });
  });

  describe('getBufferedLogs', () => {
    it('should return child logs of ended root traces and standalone logs, and ignore active traces, spans, and evicted items', () => {
      const store = new TelemetryBufferStore(10, 2);

      // Arrange
      // trace-1: started, ended. Has 1 root span and 1 child log.
      const span1 = createMockRootSpan('trace-1');
      store.addSpanOnStart(span1);
      const log1 = createMockChildLog('trace-1');
      store.addLogOnEmit(log1);
      store.addRootSpanOnEnd(span1);

      // trace-2: started, uncompleted. Has 1 child log.
      const span2 = createMockRootSpan('trace-2');
      store.addSpanOnStart(span2);
      const log2 = createMockChildLog('trace-2');
      store.addLogOnEmit(log2);

      // standalone log3 (enqueued, queue = ['trace-1', standalone_log_uuid])
      const log3 = createMockRootLog();
      store.addLogOnEmit(log3);

      // trace-4: started, ended. This evicts trace-1 (oldest in queue of size 2).
      // queue = [standalone_log_uuid, 'trace-4']
      const span4 = createMockRootSpan('trace-4');
      store.addSpanOnStart(span4);
      const child4 = createMockChildSpan('trace-4');
      store.addSpanOnStart(child4);
      const log4 = createMockChildLog('trace-4');
      store.addLogOnEmit(log4);
      store.addRootSpanOnEnd(span4);

      // Act
      const logs = store.getBufferedLogs();

      // Assert
      expect(logs).to.deep.equal([log3, log4]);
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
