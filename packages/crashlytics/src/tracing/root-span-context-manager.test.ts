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
import { RootSpanContextManager } from './root-span-context-manager';
import { Span, Tracer, trace } from '@opentelemetry/api';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';

const MOCK_TRACE_ID = 'trace-1';

describe('RootSpanContextManager', () => {
  let clock: sinon.SinonFakeTimers;
  let sandbox: sinon.SinonSandbox;
  let mockMutationObserver: any;
  let mutationObserverCallback: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date', 'requestAnimationFrame']
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
        mockSpan = {
          end: sandbox.stub(),
          spanContext: () => ({ traceId: spanName === 'span-2' ? MOCK_TRACE_ID + '-2' : MOCK_TRACE_ID, spanId: spanName })
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

      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should backdate end time to last active time', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      clock.tick(100);
      const activityTimestamp = clock.Date.now();
      const networkSpan = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: [0, activityTimestamp * 1000000]
      };
      rootSpan.recordNetworkActivityStart(networkSpan as unknown as Span);
      rootSpan.recordNetworkActivityEnd(networkSpan as unknown as ReadableSpan);

      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.calledWith(activityTimestamp)).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should stay open until network activity ends', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      const networkSpan = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: sandbox.stub()
      };

      rootSpan.recordNetworkActivityStart(networkSpan as unknown as Span);
      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.false;

      rootSpan.recordNetworkActivityEnd(networkSpan as unknown as ReadableSpan);
      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should ignore network activity from an unrelated trace', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      const unrelatedNetworkSpan = {
        spanContext: () => ({ traceId: 'unrelated-trace' })
      } as unknown as Span;

      rootSpan.recordNetworkActivityStart(unrelatedNetworkSpan);
      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should reset timer on DOM mutation', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'span-1');

      clock.tick(100);
      mutationObserverCallback(); // trigger mutation observer

      clock.tick(100); // now 200ms

      expect(mockSpan.end.called).to.be.false;
    });

    it('should not update lastActiveTimeMs if recorded activity timestamp is older', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'span-1');

      clock.tick(100);
      const originalActiveTime = clock.Date.now(); // 100ms
      const networkSpan1 = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: [0, originalActiveTime * 1000000]
      };
      rootSpan.recordNetworkActivityStart(networkSpan1 as unknown as Span);
      rootSpan.recordNetworkActivityEnd(networkSpan1 as unknown as ReadableSpan);

      const networkSpan2 = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: [0, 50 * 1000000]
      };
      rootSpan.recordNetworkActivityStart(networkSpan2 as unknown as Span);
      rootSpan.recordNetworkActivityEnd(networkSpan2 as unknown as ReadableSpan);

      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.calledWith(originalActiveTime)).to.be.true;
    });
  });

  describe('interrupted root span', () => {
    it('should immediately end if there are no active network requests', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      clock.tick(100);
      const activeTime = clock.Date.now();
      const networkSpan = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: [0, activeTime * 1000000]
      };
      rootSpan1.recordNetworkActivityStart(networkSpan as unknown as Span);
      rootSpan1.recordNetworkActivityEnd(networkSpan as unknown as ReadableSpan);

      clock.tick(50);
      // starting a new root span interrupts rootSpan1
      manager.startRootSpan(mockTracer as Tracer, 'span-2');

      expect((rootSpan1.span as any).end.calledWith(activeTime)).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be.undefined;
    });

    it('should stay open if there are active network requests and end when network activity ends', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      const networkSpan = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: [0, 0]
      };

      rootSpan1.recordNetworkActivityStart(networkSpan as unknown as Span);

      // interrupt rootSpan1
      manager.startRootSpan(mockTracer as Tracer, 'span-2');

      expect((rootSpan1.span as any).end.called).to.be.false;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.equal(rootSpan1);

      rootSpan1.recordNetworkActivityEnd(networkSpan as unknown as ReadableSpan);

      expect((rootSpan1.span as any).end.called).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be.undefined;
    });

    it('should ignore UI activity after being interrupted', () => {
      const rootSpan1 = manager.startRootSpan(mockTracer as Tracer, 'span-1');
      const networkSpan = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: [0, 0]
      };
      rootSpan1.recordNetworkActivityStart(networkSpan as unknown as Span);

      clock.tick(50);
      const networkActiveTime = clock.Date.now();
      const networkSpan2 = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID }),
        endTime: [0, networkActiveTime * 1000000]
      };
      rootSpan1.recordNetworkActivityStart(networkSpan2 as unknown as Span);
      rootSpan1.recordNetworkActivityEnd(networkSpan2 as unknown as ReadableSpan);

      const rootSpan1ObserverCb = mutationObserverCallback;
      // interrupt rootSpan1
      manager.startRootSpan(mockTracer as Tracer, 'span-2');

      clock.tick(50);
      if (rootSpan1ObserverCb) {
        rootSpan1ObserverCb();
      }

      rootSpan1.recordNetworkActivityEnd(networkSpan as unknown as ReadableSpan);

      expect((rootSpan1.span as any).end.calledWith(networkActiveTime)).to.be.true;
    });
  });
});
