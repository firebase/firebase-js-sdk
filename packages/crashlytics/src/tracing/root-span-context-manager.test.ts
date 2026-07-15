/**
 * @license
 * Copyright 2025 Google LLC
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
import * as sinon from 'sinon';
import {
  RootSpanContextManager,
  RootSpan,
  QUIESCENCE_WINDOW_MS,
  UI_RENDER_QUIESCENCE_WINDOW_MS
} from './root-span-context-manager';
import { Span, Tracer, trace, context } from '@opentelemetry/api';
import { AttributesStore, LOG_ATTR_KEY } from '../attributes-store';
import { Logger, LogRecord, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';

const MOCK_TRACE_ID = 'trace-1';

describe('RootSpanContextManager', () => {
  let clock: sinon.SinonFakeTimers;
  let sandbox: sinon.SinonSandbox;
  let mockMutationObserver: any;
  let mutationObserverCallback: any;
  let queuedAnimationFrameCallbacks: any[];
  let loggerProvider: LoggerProvider;

  const emittedLogs: LogRecord[] = [];

  const requestAnimationFrameCallbacks = (): void => {
    const callbacks = [...queuedAnimationFrameCallbacks];
    queuedAnimationFrameCallbacks = [];
    for (const cb of callbacks) {
      cb();
    }
  };

  beforeEach(() => {
    emittedLogs.length = 0;
    sandbox = sinon.createSandbox();
    queuedAnimationFrameCallbacks = [];
    clock = sandbox.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date']
    });

    mockMutationObserver = {
      observe: sandbox.stub(),
      disconnect: sandbox.stub()
    };
    if (typeof window !== 'undefined') {
      sandbox.stub(globalThis, 'MutationObserver').callsFake(((
        callback: any
      ) => {
        mutationObserverCallback = callback;
        return mockMutationObserver;
      }) as any);

      sandbox.stub(window, 'requestAnimationFrame').callsFake(((
        callback: any
      ) => {
        queuedAnimationFrameCallbacks.push(callback);
        return 1;
      }) as any);
    }
    loggerProvider = {
      getLogger: (): Logger => {
        return {
          emit: (logRecord: LogRecord) => {
            emittedLogs.push(logRecord);
          }
        };
      }
    } as any as LoggerProvider;
  });

  afterEach(() => {
    manager?.disable();
    sandbox.restore();
  });

  let mockSpan: any;
  let mockTracer: any;
  let manager: RootSpanContextManager;

  const recordResourceFetchSpanStart = (
    rootSpan: RootSpan,
    id: string = 'net-1'
  ): void => {
    rootSpan.onResourceFetchSpanStart({
      name: id === 'doc-load' ? 'documentLoad' : id,
      spanContext: () => ({ spanId: id })
    } as any);
  };

  const recordResourceFetchSpanEnd = (
    rootSpan: RootSpan,
    id: string = 'net-1',
    endTimeMs: number = Date.now()
  ): void => {
    rootSpan.onResourceFetchSpanEnd({
      name: id === 'doc-load' ? 'documentLoad' : id,
      spanContext: () => ({ spanId: id }),
      endTime: [Math.floor(endTimeMs / 1000), (endTimeMs % 1000) * 1000000]
    } as any);
  };

  beforeEach(() => {
    mockTracer = {
      startSpan: sandbox.stub().callsFake((spanName: string) => {
        // if the span name is "span-3", sets the trace id to "trace-3"
        const indexMatch = spanName.match(/\d+$/);
        const index = indexMatch ? indexMatch[0] : '1';
        mockSpan = {
          name: spanName,
          end: sandbox.stub(),
          setAttribute: sandbox.stub(),
          spanContext: () => ({ traceId: `trace-${index}`, spanId: spanName })
        };
        return mockSpan;
      })
    };
    const attributesStore = new AttributesStore({ projectId: 'my-project' });
    manager = new RootSpanContextManager(loggerProvider, attributesStore);
    manager.enable();
    context.setGlobalContextManager(manager);
  });

  describe('active context', () => {
    it('should contain the active root span', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      const context = manager.active();
      expect(trace.getSpan(context)).to.equal(rootSpan.span);
    });

    it('should be updated when a new root span is started', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      expect(manager.getActiveRootSpan()).to.equal(rootSpan1);

      const rootSpan2 = manager.startRootSpan(mockTracer as Tracer, 'span-2');
      expect(manager.getActiveRootSpan()).to.equal(rootSpan2);
    });

    it('should preserve any custom child spans', () => {
      manager.startRootSpan(mockTracer as Tracer, 'span-1');

      const childSpan = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID, spanId: 'child-span' })
      } as unknown as Span;
      const childContext = trace.setSpan(manager.active(), childSpan);

      expect(trace.getSpan(childContext)).to.equal(childSpan);
    });
  });

  describe('user-interaction root span', () => {
    it('should end span after quiescence window', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      expect(manager.getActiveRootSpan()).to.equal(rootSpan);

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should backdate end time to last active time', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      recordResourceFetchSpanStart(rootSpan);
      clock.tick(100);
      recordResourceFetchSpanEnd(rootSpan, 'net-1', 100);

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.calledWith(100)).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should stay open until network activity ends', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      recordResourceFetchSpanStart(rootSpan);
      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.called).to.be.false;

      recordResourceFetchSpanEnd(rootSpan);
      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });
    it('should not reset timer or set last active timestamp on DOM mutation', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // Trigger DOM mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Tick to QUIESCENCE_WINDOW_MS (quiescence window completes from start time)
      clock.tick(QUIESCENCE_WINDOW_MS - 100);

      // Verify root span ended because mutation did not reset the timer
      expect(mockSpan.end.called).to.be.true;
      // End time is backdated to the start time (0) because no paint occurred
      expect((rootSpan.span as any).end.calledWith(0)).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });
    it('should reset timer and set last active timestamp on browser paint', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      clock.tick(100);
      mutationObserverCallback();

      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110

      clock.tick(QUIESCENCE_WINDOW_MS - 1);
      expect((rootSpan.span as any).end.called).to.be.false;

      clock.tick(1); // quiescence complete
      expect((rootSpan.span as any).end.calledWith(110)).to.be.true;
    });

    it('should not update lastActiveTimeMs if recorded activity timestamp is older', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      recordResourceFetchSpanStart(rootSpan, 'net-1');
      recordResourceFetchSpanStart(rootSpan, 'net-2');
      clock.tick(100);
      recordResourceFetchSpanEnd(rootSpan, 'net-1', 100);
      recordResourceFetchSpanEnd(rootSpan, 'net-2', 50);

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.calledWith(100)).to.be.true;
    });

    it('should capture mutation events after the quiescence window has completed if the network request ended recently', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      recordResourceFetchSpanStart(rootSpan);
      clock.tick(QUIESCENCE_WINDOW_MS - 5);
      recordResourceFetchSpanEnd(rootSpan);

      clock.tick(10);
      mutationObserverCallback();

      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1

      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = QUIESCENCE_WINDOW_MS + 15

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect((rootSpan.span as any).end.calledWith(QUIESCENCE_WINDOW_MS + 15))
        .to.be.true;
    });
  });

  describe('app-start root span', () => {
    it('should stay open for app-start root span until documentLoad span ends', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'app-start');
      expect(manager.getActiveRootSpan()).to.equal(rootSpan);

      // Check 1: Advance past quiescence prior to doc-load starting
      clock.tick(QUIESCENCE_WINDOW_MS);
      expect(mockSpan.end.called).to.be.false;

      // Check 2: Start doc-load and advance past quiescence while in-flight
      recordResourceFetchSpanStart(rootSpan, 'doc-load');
      clock.tick(QUIESCENCE_WINDOW_MS);
      expect(mockSpan.end.called).to.be.false;

      // Check 3: End doc-load and verify root span closes after post-load quiescence
      recordResourceFetchSpanEnd(rootSpan, 'doc-load', 300);
      clock.tick(QUIESCENCE_WINDOW_MS);

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should respect custom backdated startTime and initialize last background/UI activity correctly', () => {
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'app-start',
        {
          startTime: 50
        }
      );
      recordResourceFetchSpanStart(rootSpan, 'doc-load');

      clock.tick(200);
      expect(mockSpan.end.called).to.be.false;

      recordResourceFetchSpanEnd(rootSpan, 'doc-load', 80);

      // Should not end immediately at T = 200 because only 120ms (200 - 80) has elapsed since last activity at T = 80
      expect(mockSpan.end.called).to.be.false;

      clock.tick(QUIESCENCE_WINDOW_MS); // Advance clock (allowing the rescheduled timer at T=200 to fire)

      expect(mockSpan.end.calledOnce).to.be.true;
      expect(mockSpan.end.calledWith(80)).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });
  });

  describe('interrupted root span', () => {
    it('should immediately end user-interaction root span if there are no active network requests', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      recordResourceFetchSpanStart(rootSpan1);
      clock.tick(100);
      recordResourceFetchSpanEnd(rootSpan1, 'net-1', 100);

      manager.startRootSpan(mockTracer as Tracer, 'span-2'); // interruption

      expect((rootSpan1.span as any).end.calledWith(100)).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be
        .undefined;
    });

    it('should end at the last network activity end time if interrupted while quiescing after network activity', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      recordResourceFetchSpanStart(rootSpan1);
      clock.tick(50);
      recordResourceFetchSpanEnd(rootSpan1, 'net-1', 50);

      // Advance clock by less than the quiescence window
      clock.tick(30);

      // Interrupt at T = 80
      manager.startRootSpan(mockTracer as Tracer, 'span-2'); // interruption

      // Should end backdated to the network activity end time (50), not the interruption time (80)
      expect((rootSpan1.span as any).end.calledWith(50)).to.be.true;
    });

    it('should ignore UI activity after being interrupted', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      recordResourceFetchSpanStart(rootSpan1);

      manager.startRootSpan(mockTracer as Tracer, 'span-2'); // interrupt

      // Interrupted root span should still be open and in context, given network requests are open
      expect((rootSpan1.span as any).end.called).to.be.false;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.equal(
        rootSpan1
      );

      clock.tick(50);
      recordResourceFetchSpanEnd(rootSpan1, 'net-1', 50);
      clock.tick(QUIESCENCE_WINDOW_MS - 50);
      if (mutationObserverCallback) {
        // trigger DOM update
        mutationObserverCallback();

        // Simulate Frame 1 (pre-paint)
        clock.tick(5);
        requestAnimationFrameCallbacks();

        // Simulate Frame 2 (post-paint)
        clock.tick(5);
        requestAnimationFrameCallbacks();
      }

      // Verify the root span still ended backdated to T = 50
      expect((rootSpan1.span as any).end.calledWith(50)).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be
        .undefined;
    });

    it('should stay open for app-start root span if interrupted before document load completes', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      recordResourceFetchSpanStart(rootSpan1, 'doc-load');

      manager.startRootSpan(mockTracer as Tracer, 'span-2'); // interruption

      // Must stay open because document load has not finished, even though there are no network requests!
      expect((rootSpan1.span as any).end.called).to.be.false;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.equal(
        rootSpan1
      );

      recordResourceFetchSpanEnd(rootSpan1, 'doc-load', 100);

      // Now that document loaded, it should immediately end backdated to document load completion time (100)
      expect((rootSpan1.span as any).end.calledWith(100)).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be
        .undefined;
    });

    it('should end at the interruption time if there are no active network requests and there is an active ui render span', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // Trigger mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      // Interrupt at T = 108
      clock.tick(3);
      rootSpan.interrupt(clock.Date.now());

      // Verify that root span was ended with the interruption time (108)
      expect((rootSpan.span as any).end.calledWith(108)).to.be.true;
    });

    it('should end at the last ui render time if there are no active network requests and the ui render span is completed', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // Trigger mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110

      // Interrupt at T = 115 before quiescence completes
      clock.tick(5);
      rootSpan.interrupt(clock.Date.now());

      // Verify that root span ended with the last ui render time (110)
      expect((rootSpan.span as any).end.calledWith(110)).to.be.true;
    });

    it('should log an event when interrupted and associate it with the interrupted span context and the trace id of the interrupting span', () => {
      // Start the first root span (interrupted span)
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      clock.tick(123);

      // Start the second root span (interrupting span) which interrupts the first
      manager.startRootSpan(mockTracer as Tracer, 'span-2');

      clock.tick(1);

      expect(emittedLogs.length).to.equal(1);
      const log = emittedLogs[0];
      expect(log.timestamp).to.equal(123);
      expect(log.severityNumber).to.equal(SeverityNumber.INFO);
      expect(log.body).to.equal('Root span interrupted');

      // Check the attributes on the log
      expect(log.attributes).to.deep.equal({
        [LOG_ATTR_KEY.TRACE]: 'projects/my-project/traces/trace-1',
        [LOG_ATTR_KEY.SPAN_ID]: 'span-1',
        [LOG_ATTR_KEY.INTERRUPTED_BY_TRACE]: 'trace-2',
        [LOG_ATTR_KEY.APP_VERSION]: 'unset'
      });

      // Verify the log's context has the interrupted span
      expect(log.context).to.exist;
      const activeSpan = trace.getSpan(log.context!);
      expect(activeSpan).to.equal(rootSpan1.span);
    });
  });

  describe('ui render span', () => {
    it('should create a ui render span that starts at pre-paint raf and ends at post-paint raf', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // Trigger mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110

      // Let quiescence complete
      clock.tick(QUIESCENCE_WINDOW_MS); // Both timers will fire.

      // UI Render span was created and ended backdated to 110
      expect(mockTracer.startSpan.calledWith('UI Render')).to.be.true;
      expect(mockSpan.end.calledWith(110)).to.be.true;
    });

    it('should create two ui render spans with two raf cycles separated by the quiescence period', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // First mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      const firstUiSpan = mockSpan; // first UI render span has started

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110

      // Let UI render quiescence complete
      clock.tick(UI_RENDER_QUIESCENCE_WINDOW_MS);

      // Verify first UI Render span was created
      expect(mockTracer.startSpan.calledWith('UI Render')).to.be.true;
      expect(firstUiSpan.end.calledWith(110)).to.be.true;

      // Second mutation
      clock.tick(10);
      mutationObserverCallback();

      // Run Frame 1
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1

      const secondUiSpan = mockSpan; // second UI render span has started

      // Run Frame 2
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 130 + UI_RENDER_QUIESCENCE_WINDOW_MS

      // Let everything quiesce
      clock.tick(QUIESCENCE_WINDOW_MS);

      // Second UI Render span ended backdated to 130 + UI_RENDER_QUIESCENCE_WINDOW_MS
      expect(secondUiSpan).to.not.equal(firstUiSpan);
      expect(secondUiSpan.end.calledWith(130 + UI_RENDER_QUIESCENCE_WINDOW_MS))
        .to.be.true;
    });

    it('should create two ui render spans if two raf cycles are separated by the quiescence period but the render quiescence timer callback execution is delayed', () => {
      // This test validates the safety path for when the browser's rendering pipeline runs before the event loop's macrotask queue.
      // In theory, when the render quiescence period ends, the timer callback to close the UI render span is placed in the macrotask queue.
      // However, if a microtask (like a DOM MutationObserver callback) schedules a new animation frame (rAF), that outer rAF callback
      // can execute before the macrotask timer callback runs, because the browser's rendering pipeline prioritizes rAF callbacks.
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // First mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 for mutation 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      const firstUiSpan = mockSpan; // first UI render span has started

      // Run Frame 2 for mutation 1 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110

      // Advance clock without running the quiescence timer
      clock.setSystemTime(110 + UI_RENDER_QUIESCENCE_WINDOW_MS);

      // Second mutation
      mutationObserverCallback();

      // Run Frame 1 for mutation 2
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 127 (ends first UI render span backdated to 110)

      const secondUiSpan = mockSpan; // second UI render span has started

      // Verify first UI Render span was created (startTime: 105, endTime: 110)
      expect(
        mockTracer.startSpan.calledWith(
          'UI Render',
          sinon.match({ startTime: 105 })
        )
      ).to.be.true;
      expect(firstUiSpan.end.calledWith(110)).to.be.true;

      // Run Frame 2 for mutation 2
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110 + UI_RENDER_QUIESCENCE_WINDOW_MS + 5

      // Let everything quiesce
      clock.tick(QUIESCENCE_WINDOW_MS);

      // Verify the second UI Render span was created and ended correctly
      expect(
        mockTracer.startSpan.calledWith(
          'UI Render',
          sinon.match({ startTime: 110 + UI_RENDER_QUIESCENCE_WINDOW_MS })
        )
      ).to.be.true;
      expect(secondUiSpan).to.not.equal(firstUiSpan);
      expect(
        secondUiSpan.end.calledWith(110 + UI_RENDER_QUIESCENCE_WINDOW_MS + 5)
      ).to.be.true;
    });

    it('should create one ui render span if two raf cycles are not separated by the quiescence period', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // First mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 for mutation 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      // Run Frame 2 for mutation 1 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110

      // Second mutation at T = 112 (within quiescence window of 110)
      clock.tick(2);
      mutationObserverCallback();

      // Run Frame 1 for mutation 2 at T = 115
      clock.tick(3);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan created, lastUiActivityMs reset to undefined

      // Run Frame 2 for mutation 2 at T = 120
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 120

      // Let everything quiesce
      clock.tick(QUIESCENCE_WINDOW_MS);

      // Verify that only one UI Render span was created, starting at 105 and ending at 120
      const uiRenderSpanCalls = mockTracer.startSpan
        .getCalls()
        .filter((c: any) => c.args[0] === 'UI Render');
      expect(uiRenderSpanCalls.length).to.equal(1);
      expect(uiRenderSpanCalls[0].args[1]).to.deep.include({ startTime: 105 });
      expect(mockSpan.end.calledWith(120)).to.be.true;
    });

    it('should create a single ui render span if there are multiple mutation events at the same time', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // Multiple mutations at T = 100
      clock.tick(100);
      mutationObserverCallback();
      mutationObserverCallback();
      mutationObserverCallback();

      // Run Frame 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2

      // Let quiescence complete
      clock.tick(QUIESCENCE_WINDOW_MS);

      // Check that UI Render span was created exactly once
      const uiRenderSpanCalls = mockTracer.startSpan
        .getCalls()
        .filter((c: any) => c.args[0] === 'UI Render');
      expect(uiRenderSpanCalls.length).to.equal(1);
      expect(mockSpan.end.calledWith(110)).to.be.true;
    });

    it('should create a ui render span that ends at the interruption time on interrupt if it has started and not ended', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // Trigger mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      // Interrupt at T = 108 before Frame 2 runs
      clock.tick(3);
      rootSpan.interrupt(clock.Date.now());

      // Verify that UI Render span was created starting at 105 and ending at 108
      expect(
        mockTracer.startSpan.calledWith(
          'UI Render',
          sinon.match({ startTime: 105 })
        )
      ).to.be.true;
      expect(mockSpan.end.calledWith(108)).to.be.true;
      expect(mockSpan.setAttribute.calledWith('interrupted_at', 108)).to.be
        .true;
    });

    it('should create a ui render span that ends at the ui render completion time on interrupt if it has started and ended but is still quiescing', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // Trigger mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: activeUiRenderSpan started at 105

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: lastUiActivityMs = 110

      // Interrupt at T = 115 during quiescence
      clock.tick(5);
      rootSpan.interrupt(clock.Date.now());

      // Verify that UI Render span was created starting at 105 and ending at the paint completion time (110)
      expect(
        mockTracer.startSpan.calledWith(
          'UI Render',
          sinon.match({ startTime: 105 })
        )
      ).to.be.true;
      expect(mockSpan.end.calledWith(110)).to.be.true;
      expect(mockSpan.setAttribute.calledWith('interrupted_at', 115)).to.be
        .false;
    });
  });
});
