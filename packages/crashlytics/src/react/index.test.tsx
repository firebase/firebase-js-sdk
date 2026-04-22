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

import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import sinon, { restore, stub } from 'sinon';
import * as crashlytics from '../api';
import { FirebaseApp } from '@firebase/app';
import { Crashlytics } from '../public-types';
import { FirebaseCrashlytics, useReportRenderComplete, useTraceOperation } from '.';
import React from 'react';
import { render } from '@testing-library/react';
import { trace, context } from '@opentelemetry/api';

use(sinonChai);
use(chaiAsPromised);

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // We can also log here if needed
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}

describe('FirebaseCrashlytics', () => {
  let getCrashlyticsStub: sinon.SinonStub;
  let recordErrorStub: sinon.SinonStub;
  let fakeApp: FirebaseApp;
  let fakeCrashlytics: Crashlytics;

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    fakeCrashlytics = {} as Crashlytics;

    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(
      fakeCrashlytics
    );
    recordErrorStub = stub(crashlytics, 'recordError');
  });

  afterEach(() => {
    restore();
  });

  it('captures window errors', done => {
    render(<FirebaseCrashlytics firebaseApp={fakeApp} />);
    const error = new Error('test error');
    window.onerror = () => {
      // Prevent error from bubbling up to test suite
    };
    window.addEventListener('error', (event: ErrorEvent) => {
      // Registers another listener (sequential) to confirm behaviour.
      expect(getCrashlyticsStub).to.have.been.calledWith(fakeApp);
      expect(recordErrorStub).to.have.been.calledWith(fakeCrashlytics, error);
      done();
    });
    window.dispatchEvent(new ErrorEvent('error', { error }));
  });

  it('captures unhandled promise rejections', () => {
    render(<FirebaseCrashlytics firebaseApp={fakeApp} />);
    const reason = new Error('test rejection');
    const promise = Promise.reject(reason);
    promise.catch(() => {});
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', { reason, promise })
    );
    expect(getCrashlyticsStub).to.have.been.calledWith(fakeApp);
    expect(recordErrorStub).to.have.been.calledWith(fakeCrashlytics, reason);
  });
});

describe('useReportRenderComplete', () => {
  it('ends the span after two animation frames', done => {
    const spanEndStub = stub();
    const fakeSpan = { end: spanEndStub } as any;

    function TestComponent({ span }: { span: any }) {
      useReportRenderComplete(span);
      return <div>Test</div>;
    }

    render(<TestComponent span={fakeSpan} />);

    // Wait for two animation frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          expect(spanEndStub).to.have.been.calledOnce;
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  it('ends the span on unmount if it hasn\'t ended yet', () => {
    const spanEndStub = stub();
    const fakeSpan = { end: spanEndStub } as any;

    function TestComponent({ span }: { span: any }) {
      useReportRenderComplete(span);
      return <div>Test</div>;
    }

    const { unmount } = render(<TestComponent span={fakeSpan} />);
    unmount();

    expect(spanEndStub).to.have.been.calledOnce;
  });

  it('cancels animation frames on unmount', () => {
    const spanEndStub = stub();
    const fakeSpan = { end: spanEndStub } as any;
    const cancelSpy = stub(window, 'cancelAnimationFrame');

    function TestComponent({ span }: { span: any }) {
      useReportRenderComplete(span);
      return <div>Test</div>;
    }

    const { unmount } = render(<TestComponent span={fakeSpan} />);
    unmount();

    expect(cancelSpy).to.have.been.called;
    cancelSpy.restore();
  });
});

describe('useTraceOperation', () => {
  it('starts a span and provides a run function', () => {
    const startSpanStub = stub().returns({ end: stub(), spanContext: () => ({}) });
    const getTracerStub = stub(trace, 'getTracer').returns({
      startSpan: startSpanStub
    } as any);

    function TestComponent({ id }: { id: string }) {
      const { run } = useTraceOperation('test-op', [id]);
      return <div onClick={() => run(async () => {})}>Test</div>;
    }

    render(<TestComponent id="1" />);

    expect(getTracerStub).to.have.been.calledWith('@firebase/crashlytics');
    expect(startSpanStub).to.have.been.calledWith('test-op');

    getTracerStub.restore();
  });

  it('uses withSpan in the run function', async () => {
    const fakeSpan = { end: stub(), spanContext: () => ({}) };
    const startSpanStub = stub().returns(fakeSpan);
    stub(trace, 'getTracer').returns({
      startSpan: startSpanStub
    } as any);
    const dummyContext = {};
    const setSpanStub = stub(trace, 'setSpan').returns(dummyContext as any);
    const withStub = stub(context, 'with').callsFake((ctx, fn) => fn());

    let runFn: any;
    function TestComponent() {
      const { run } = useTraceOperation('test-op', []);
      runFn = run;
      return <div>Test</div>;
    }

    render(<TestComponent />);

    const myAsyncFn = stub().resolves('result');
    const result = await runFn(myAsyncFn);

    expect(result).to.equal('result');
    expect(setSpanStub.firstCall.args[1]).to.equal(fakeSpan);
    expect(withStub.firstCall.args[0]).to.equal(dummyContext);
    expect(myAsyncFn).to.have.been.calledOnce;

    restore();
  });
});
