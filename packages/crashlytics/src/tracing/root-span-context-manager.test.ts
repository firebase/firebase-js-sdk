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

const MOCK_TRACE_ID = 'trace-1';

describe('RootSpanContextManager', () => {
  let clock: sinon.SinonFakeTimers;
  let sandbox: sinon.SinonSandbox;
  let mockMutationObserver: any;
  let mutationObserverCallback: any;
  let requestAnimationFrameCallback: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
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
        requestAnimationFrameCallback = callback;
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
          name: spanName,
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
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );
      const context = manager.active();
      expect(trace.getSpan(context)).to.equal(rootSpan.span);
    });

    it('should be updated when a new root span is started', () => {
      const rootSpan1 = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );
      expect(manager.getActiveRootSpan()).to.equal(rootSpan1);

      const rootSpan2 = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-2'
      );
      expect(manager.getActiveRootSpan()).to.equal(rootSpan2);
    });

    it('should preserve any custom child spans', () => {
      manager.startRootSpan(mockTracer as Tracer, 'user-interaction', 'span-1');

      const childSpan = {
        spanContext: () => ({ traceId: MOCK_TRACE_ID, spanId: 'child-span' })
      } as unknown as Span;
      const childContext = trace.setSpan(manager.active(), childSpan);

      expect(trace.getSpan(childContext)).to.equal(childSpan);
    });
  });

  describe('user-interaction root span', () => {
    it('should end span after quiescence window', () => {
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );
      expect(manager.getActiveRootSpan()).to.equal(rootSpan);

      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should backdate end time to last active time', () => {
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );

      rootSpan.recordNetworkActivityStart();
      clock.tick(100);
      rootSpan.recordNetworkActivityEnd(100);

      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.calledWith(100)).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should stay open until network activity ends', () => {
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );

      rootSpan.recordNetworkActivityStart();
      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.false;

      rootSpan.recordNetworkActivityEnd();
      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should reset timer and set last active timestamp on DOM mutation', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'user-interaction', 'span-1');

      clock.tick(100);
      mutationObserverCallback();
      clock.tick(100); // T = 200

      expect(mockSpan.end.called).to.be.false;

      clock.tick(50); // let quiescence complete

      expect(mockSpan.end.calledWith(100)).to.be.true;
    });

    it('should reset timer and set last active timestamp on browser paint', () => {
      if (typeof document === 'undefined') {
        return;
      }
      manager.startRootSpan(mockTracer as Tracer, 'user-interaction', 'span-1');

      clock.tick(100);
      mutationObserverCallback();

      clock.tick(5); // T = 105
      requestAnimationFrameCallback();
      clock.tick(100); // T = 205

      expect(mockSpan.end.called).to.be.false;

      clock.tick(50); // let quiescence complete

      expect(mockSpan.end.calledWith(105)).to.be.true;
    });

    it('should not update lastActiveTimeMs if recorded activity timestamp is older', () => {
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );

      rootSpan.recordNetworkActivityStart();
      rootSpan.recordNetworkActivityStart();
      clock.tick(100);
      rootSpan.recordNetworkActivityEnd(100);
      rootSpan.recordNetworkActivityEnd(50);

      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.calledWith(100)).to.be.true;
    });

    it('should capture mutation events after 150ms if the network request ended recently', () => {
      if (typeof document === 'undefined') {
        return;
      }
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );

      rootSpan.recordNetworkActivityStart();
      clock.tick(145);
      rootSpan.recordNetworkActivityEnd();

      clock.tick(10); // advance clock to T = 155
      mutationObserverCallback();

      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.calledWith(155)).to.be.true;
    });
  });

  describe('app-start root span', () => {
    it('should stay open for app-start root span until markDocumentLoaded is called', () => {
      const rootSpan = manager.startRootSpan(mockTracer as Tracer, 'app-start');
      expect(manager.getActiveRootSpan()).to.equal(rootSpan);

      clock.tick(150); // advance past quiescence window

      expect(mockSpan.end.called).to.be.false;

      rootSpan.markDocumentLoaded(100);
      clock.tick(150); // let quiescence complete

      expect(mockSpan.end.called).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });

    it('should respect custom backdated startTime and initialize last background/UI activity correctly', () => {
      const rootSpan = manager.startRootSpan(
        mockTracer as Tracer,
        'app-start',
        'app-start',
        {
          startTime: 50
        }
      );

      clock.tick(200);
      expect(mockSpan.end.called).to.be.false;

      rootSpan.markDocumentLoaded(80);

      // Should not end immediately at T = 200 because only 120ms (200 - 80) has elapsed since last activity at T = 80
      expect(mockSpan.end.called).to.be.false;

      clock.tick(150); // Advance clock to T = 350 (allowing the rescheduled 150ms timer at T=200 to fire)

      expect(mockSpan.end.calledOnce).to.be.true;
      expect(mockSpan.end.calledWith(80)).to.be.true;
      expect(manager.getActiveRootSpan()).to.be.undefined;
    });
  });

  describe('interruption logic', () => {
    it('should immediately end user-interaction root span if there are no active network requests', () => {
      const rootSpan1 = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );
      rootSpan1.recordNetworkActivityStart();
      clock.tick(100);
      rootSpan1.recordNetworkActivityEnd(100);

      manager.startRootSpan(mockTracer as Tracer, 'user-interaction', 'span-2'); // interruption

      expect((rootSpan1.span as any).end.calledWith(100)).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be
        .undefined;
    });

    it('should ignore UI activity after being interrupted', () => {
      const rootSpan1 = manager.startRootSpan(
        mockTracer as Tracer,
        'user-interaction',
        'span-1'
      );
      rootSpan1.recordNetworkActivityStart();

      manager.startRootSpan(mockTracer as Tracer, 'user-interaction', 'span-2'); // interrupt

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

    it('should stay open for app-start root span if interrupted before document load completes', () => {
      const rootSpan1 = manager.startRootSpan(
        mockTracer as Tracer,
        'app-start'
      );

      manager.startRootSpan(mockTracer as Tracer, 'user-interaction', 'span-2'); // interruption

      // Must stay open because document load has not finished, even though there are no network requests!
      expect((rootSpan1.span as any).end.called).to.be.false;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.equal(
        rootSpan1
      );

      rootSpan1.markDocumentLoaded(100);

      // Now that document loaded, it should immediately end backdated to document load completion time (100)
      expect((rootSpan1.span as any).end.calledWith(100)).to.be.true;
      expect(manager.getRootSpanByTraceId(rootSpan1.getTraceId())).to.be
        .undefined;
    });
  });
});
