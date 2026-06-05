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
  QUIESCENCE_WINDOW_MS,
  UI_RENDER_QUIESCENCE_WINDOW_MS
} from './root-span-context-manager';
import { Span, Tracer, trace } from '@opentelemetry/api';

const MOCK_TRACE_ID = 'trace-1';

describe('RootSpanContextManager', () => {
  let clock: sinon.SinonFakeTimers;
  let sandbox: sinon.SinonSandbox;
  let mockMutationObserver: any;
  let mutationObserverCallback: any;
  let queuedAnimationFrameCallbacks: any[];

  const requestAnimationFrameCallbacks = (): void => {
    const callbacks = [...queuedAnimationFrameCallbacks];
    queuedAnimationFrameCallbacks = [];
    for (const cb of callbacks) {
      cb();
    }
  };

  beforeEach(() => {
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  let mockSpan: any;
  let mockTracer: any;
  let manager: RootSpanContextManager;

  beforeEach(() => {
    mockTracer = {
      startSpan: sandbox.stub().callsFake((spanName: string) => {
        // if the span name is "span-3", sets the trace id to "trace-3"
        const indexMatch = spanName.match(/\d+$/);
        const index = indexMatch ? indexMatch[0] : '1';
        mockSpan = {
          end: sandbox.stub(),
          spanContext: () => ({ traceId: `trace-${index}`, spanId: spanName })
        };
        return mockSpan;
      })
    };
    manager = new RootSpanContextManager();
  });

  describe('app screen id tracking', () => {
    it('should return active app screen id as undefined by default', () => {
      expect(manager.getActiveAppScreenId()).to.be.undefined;
    });

    it('should set and get active app screen id', () => {
      const mockScreenId = 'screen-id';
      manager.setActiveAppScreenId(mockScreenId);
      expect(manager.getActiveAppScreenId()).to.equal(mockScreenId);
    });

    it('should override previous active app screen id', () => {
      const mockScreenId1 = 'screen-id-1';
      const mockScreenId2 = 'screen-id-2';

      manager.setActiveAppScreenId(mockScreenId1);
      expect(manager.getActiveAppScreenId()).to.equal(mockScreenId1);

      manager.setActiveAppScreenId(mockScreenId2);
      expect(manager.getActiveAppScreenId()).to.equal(mockScreenId2);
    });
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

  describe('root span', () => {
    it('should end span after quiescence window', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      expect(manager.getActiveRootSpan()).to.equal(rootSpan);

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should backdate end time to last active time', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      rootSpan.recordNetworkActivityStart();
      clock.tick(100);
      rootSpan.recordNetworkActivityEnd(100);

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.calledWith(100)).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should stay open until network activity ends', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      rootSpan.recordNetworkActivityStart();
      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.called).to.be.false;

      rootSpan.recordNetworkActivityEnd();
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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110

      clock.tick(QUIESCENCE_WINDOW_MS - 1);
      expect((rootSpan.span as any).end.called).to.be.false;

      clock.tick(1); // quiescence complete
      expect((rootSpan.span as any).end.calledWith(110)).to.be.true;
    });

    it('should not update lastActiveTimeMs if recorded activity timestamp is older', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      rootSpan.recordNetworkActivityStart();
      rootSpan.recordNetworkActivityStart();
      clock.tick(100);
      rootSpan.recordNetworkActivityEnd(100);
      rootSpan.recordNetworkActivityEnd(50);

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect(mockSpan.end.calledWith(100)).to.be.true;
    });

    it('should capture mutation events after the quiescence window has completed if the network request ended recently', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      rootSpan.recordNetworkActivityStart();
      clock.tick(QUIESCENCE_WINDOW_MS - 5);
      rootSpan.recordNetworkActivityEnd();

      clock.tick(10);
      mutationObserverCallback();

      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1

      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = QUIESCENCE_WINDOW_MS + 15

      clock.tick(QUIESCENCE_WINDOW_MS); // let quiescence complete

      expect((rootSpan.span as any).end.calledWith(QUIESCENCE_WINDOW_MS + 15)).to.be.true;
    });
  });

  describe('interrupted root span', () => {
    it('should immediately end if there are no active network requests', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      rootSpan1.recordNetworkActivityStart();
      clock.tick(100);
      rootSpan1.recordNetworkActivityEnd(100);

      manager.startRootSpan(mockTracer as Tracer, 'span-2'); // interruption

      expect((rootSpan1.span as any).end.calledWith(100)).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be
        .undefined;
    });

    it('should ignore UI activity after being interrupted', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      rootSpan1.recordNetworkActivityStart();

      manager.startRootSpan(mockTracer as Tracer, 'span-2'); // interrupt

      // Interrupted root span should still be open and in context, given network requests are open
      expect((rootSpan1.span as any).end.called).to.be.false;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.equal(
        rootSpan1
      );

      clock.tick(50);
      rootSpan1.recordNetworkActivityEnd(50);
      clock.tick(100);
      if (mutationObserverCallback) {
        // trigger DOM update
        mutationObserverCallback();
      }

      expect((rootSpan1.span as any).end.calledWith(50)).to.be.true;
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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Interrupt at T = 108
      clock.tick(3);
      rootSpan.interrupt();

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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110

      // Interrupt at T = 115 before quiescence completes
      clock.tick(5);
      rootSpan.interrupt();

      // Verify that root span ended with the last ui render time (110)
      expect((rootSpan.span as any).end.calledWith(110)).to.be.true;
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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110

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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110

      // Let UI render quiescence complete
      clock.tick(UI_RENDER_QUIESCENCE_WINDOW_MS);

      // Verify first UI Render span was created
      expect(mockTracer.startSpan.calledWith('UI Render')).to.be.true;
      expect(mockSpan.end.calledWith(110)).to.be.true;
      const firstUiSpan = mockSpan;

      // Second mutation
      clock.tick(10);
      mutationObserverCallback();

      // Run Frame 1
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1

      // Run Frame 2
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 130 + UI_RENDER_QUIESCENCE_WINDOW_MS

      // Let everything quiesce
      clock.tick(QUIESCENCE_WINDOW_MS);

      // Second UI Render span ended backdated to 130 + UI_RENDER_QUIESCENCE_WINDOW_MS
      expect(mockSpan).to.not.equal(firstUiSpan);
      expect(mockSpan.end.calledWith(130 + UI_RENDER_QUIESCENCE_WINDOW_MS)).to.be.true;
    });

    it('should create two ui render spans if two raf cycles are separated by the quiescence period but the render quiescence timer callback execution is delayed', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'span-1'); // T = 0

      // First mutation at T = 100
      clock.tick(100);
      mutationObserverCallback();

      // Run Frame 1 for mutation 1 at T = 105
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Run Frame 2 for mutation 1 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110

      // Advance clock without running the quiescence timer
      clock.setSystemTime(110 + UI_RENDER_QUIESCENCE_WINDOW_MS);

      // Second mutation
      mutationObserverCallback();

      // Run Frame 1 for mutation 2
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 127 (ends first UI render span backdated to 110)

      // Verify first UI Render span was created (startTime: 105, endTime: 110)
      expect(
        mockTracer.startSpan.calledWith(
          'UI Render',
          sinon.match({ startTime: 105 })
        )
      ).to.be.true;
      expect(mockSpan.end.calledWith(110)).to.be.true;
      const firstUiSpan = mockSpan;

      // Run Frame 2 for mutation 2
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110 + UI_RENDER_QUIESCENCE_WINDOW_MS + 5

      // Let everything quiesce
      clock.tick(QUIESCENCE_WINDOW_MS);

      // Verify the second UI Render span was created
      const uiRenderSpanCalls = mockTracer.startSpan
        .getCalls()
        .filter((c: any) => c.args[0] === 'UI Render');
      expect(uiRenderSpanCalls.length).to.equal(2);

      expect(uiRenderSpanCalls[0].args[1]).to.deep.include({ startTime: 105 });
      expect(uiRenderSpanCalls[1].args[1]).to.deep.include({ startTime: 110 + UI_RENDER_QUIESCENCE_WINDOW_MS });
      expect(mockSpan).to.not.equal(firstUiSpan);
      expect(mockSpan.end.calledWith(110 + UI_RENDER_QUIESCENCE_WINDOW_MS + 5)).to.be.true;
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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Run Frame 2 for mutation 1 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110

      // Second mutation at T = 112 (within quiescence window of 110)
      clock.tick(2);
      mutationObserverCallback();

      // Run Frame 1 for mutation 2 at T = 115
      clock.tick(3);
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs remains 105, postPaintAtMs reset to undefined

      // Run Frame 2 for mutation 2 at T = 120
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 120

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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Interrupt at T = 108 before Frame 2 runs
      clock.tick(3);
      rootSpan.interrupt();

      // Verify that UI Render span was created starting at 105 and ending at 108
      expect(
        mockTracer.startSpan.calledWith(
          'UI Render',
          sinon.match({ startTime: 105 })
        )
      ).to.be.true;
      expect(mockSpan.end.calledWith(108)).to.be.true;
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
      requestAnimationFrameCallbacks(); // Frame 1: prePaintAtMs = 105

      // Run Frame 2 at T = 110
      clock.tick(5);
      requestAnimationFrameCallbacks(); // Frame 2: postPaintAtMs = 110

      // Interrupt at T = 115 during quiescence
      clock.tick(5);
      rootSpan.interrupt();

      // Verify that UI Render span was created starting at 105 and ending at the paint completion time (110)
      expect(
        mockTracer.startSpan.calledWith(
          'UI Render',
          sinon.match({ startTime: 105 })
        )
      ).to.be.true;
      expect(mockSpan.end.calledWith(110)).to.be.true;
    });
  });
});
