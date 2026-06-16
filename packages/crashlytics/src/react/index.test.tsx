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
import { FirebaseCrashlytics } from '.';
import React from 'react';
import { AttributesStore } from '../attributes-store';
import { render, fireEvent } from '@testing-library/react';
import { ALREADY_LOGGED_FLAG } from '../constants';
import { ErrorWithSymbol } from '../types';

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
  let emitStub: sinon.SinonStub;
  let fakeApp: FirebaseApp;
  let fakeCrashlytics: Crashlytics;
  let fakeTracer: any;
  let fakeContextManager: any;

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    emitStub = stub();
    fakeTracer = {
      startSpan: stub()
    };
    fakeContextManager = {
      startRootSpan: stub()
    };
    const fakeTracingProvider = {
      getTracer: stub().returns(fakeTracer)
    };
    fakeCrashlytics = {
      app: {
        options: {}
      },
      loggerProvider: {
        getLogger: stub().returns({
          emit: emitStub
        })
      },
      tracingProvider: fakeTracingProvider,
      contextManager: fakeContextManager,
      attributesStore: new AttributesStore({ projectId: 'fake-project' })
    } as unknown as Crashlytics;

    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(
      fakeCrashlytics
    );
  });

  afterEach(() => {
    restore();
  });

  it('captures window errors', () => {
    const prevOnError = window.onerror;
    window.onerror = () => true;

    render(<FirebaseCrashlytics firebaseApp={fakeApp} />);
    const error = new Error('test error');

    window.dispatchEvent(new ErrorEvent('error', { error }));

    expect(getCrashlyticsStub).to.have.been.calledWith(fakeApp);
    expect(emitStub).to.have.been.calledOnce;
    const log = emitStub.firstCall.args[0];
    expect(log.body).to.equal('test error');
    expect(log.attributes['exception.type']).to.equal('Error');
    expect(log.attributes['exception.stacktrace']).to.be.a('string');
    expect(log.attributes['exception.message']).to.equal('test error');

    window.onerror = prevOnError;
  });

  it('captures unhandled promise rejections', () => {
    render(<FirebaseCrashlytics firebaseApp={fakeApp} />);
    const reason = new Error('test rejection');
    const promise = Promise.reject(reason);
    promise.catch(() => { });

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', { reason, promise })
    );

    expect(getCrashlyticsStub).to.have.been.calledWith(fakeApp);
    expect(emitStub).to.have.been.calledOnce;
    const log = emitStub.firstCall.args[0];
    expect(log.body).to.equal('test rejection');
    expect(log.attributes['exception.type']).to.equal('Error');
    expect(log.attributes['exception.stacktrace']).to.be.a('string');
    expect(log.attributes['exception.message']).to.equal('test rejection');
  });

  it('ignores errors that have already been logged by Crashlytics', () => {
    const prevOnError = window.onerror;
    window.onerror = () => true;

    render(<FirebaseCrashlytics firebaseApp={fakeApp} />);
    const error = new Error('already logged error');
    (error as ErrorWithSymbol)[ALREADY_LOGGED_FLAG] = true;

    window.dispatchEvent(new ErrorEvent('error', { error }));

    expect(emitStub).to.not.have.been.called;

    window.onerror = prevOnError;
  });

  describe('on click', () => {
    it('does not start a trace when clicking non-element targets or non-interactive elements', () => {
      render(
        <>
          <FirebaseCrashlytics firebaseApp={fakeApp} />
          <div id="non-interactive">Just a div</div>
        </>
      );

      // Dispatch click on window (non-element target / no closest)
      window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(fakeContextManager.startRootSpan).to.not.have.been.called;

      // Dispatch click on non-interactive div
      const div = document.getElementById('non-interactive')!;
      fireEvent.click(div);
      expect(fakeContextManager.startRootSpan).to.not.have.been.called;
    });

    it('starts a trace for a button', () => {
      render(
        <>
          <FirebaseCrashlytics firebaseApp={fakeApp} />
          <button>Login</button>
        </>
      );
      fireEvent.click(document.querySelector('button')!);
      expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
        fakeTracer,
        'click button'
      );
    });

    it('starts a trace for an anchor', () => {
      render(
        <>
          <FirebaseCrashlytics firebaseApp={fakeApp} />
          <a>Nav</a>
        </>
      );
      fireEvent.click(document.querySelector('a')!);
      expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
        fakeTracer,
        'click a'
      );
    });

    it('starts a trace for an input submit', () => {
      render(
        <>
          <FirebaseCrashlytics firebaseApp={fakeApp} />
          <input type="submit" value="Submit" />
        </>
      );
      fireEvent.click(document.querySelector('input[type="submit"]')!);
      expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
        fakeTracer,
        'click input'
      );
    });

    it('starts a trace for an input button', () => {
      render(
        <>
          <FirebaseCrashlytics firebaseApp={fakeApp} />
          <input type="button" value="Button" />
        </>
      );
      fireEvent.click(document.querySelector('input[type="button"]')!);
      expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
        fakeTracer,
        'click input'
      );
    });

    it('finds closest interactive parent when child element is clicked', () => {
      render(
        <>
          <FirebaseCrashlytics firebaseApp={fakeApp} />
          <button id="parent-btn">
            <span id="child-span">Icon</span>
          </button>
        </>
      );
      fireEvent.click(document.getElementById('child-span')!);
      expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
        fakeTracer,
        'click button [id="parent-btn"]'
      );
    });

    describe('sets the span name correctly', () => {
      it('for elements with an id', () => {
        render(
          <>
            <FirebaseCrashlytics firebaseApp={fakeApp} />
            <button id="login-btn">Login</button>
          </>
        );
        fireEvent.click(document.getElementById('login-btn')!);
        expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
          fakeTracer,
          'click button [id="login-btn"]'
        );
      });

      it('for elements with the data-testid attribute', () => {
        render(
          <>
            <FirebaseCrashlytics firebaseApp={fakeApp} />
            <button data-testid="login-btn">Login</button>
          </>
        );
        fireEvent.click(document.querySelector('[data-testid="login-btn"]')!);
        expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
          fakeTracer,
          'click button [data-testid="login-btn"]'
        );
      });

      it('for elements with the data-analytics-id attribute', () => {
        render(
          <>
            <FirebaseCrashlytics firebaseApp={fakeApp} />
            <button data-analytics-id="login-btn">Login</button>
          </>
        );
        fireEvent.click(
          document.querySelector('[data-analytics-id="login-btn"]')!
        );
        expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
          fakeTracer,
          'click button [data-analytics-id="login-btn"]'
        );
      });

      it('for elements with the name attribute', () => {
        render(
          <>
            <FirebaseCrashlytics firebaseApp={fakeApp} />
            <button name="login-btn">Login</button>
          </>
        );
        fireEvent.click(document.querySelector('button[name="login-btn"]')!);
        expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
          fakeTracer,
          'click button [name="login-btn"]'
        );
      });

      it('for elements with the aria-label attribute', () => {
        render(
          <>
            <FirebaseCrashlytics firebaseApp={fakeApp} />
            <button aria-label="login-btn">Login</button>
          </>
        );
        fireEvent.click(
          document.querySelector('button[aria-label="login-btn"]')!
        );
        expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
          fakeTracer,
          'click button [aria-label="login-btn"]'
        );
      });

      it('for elements with the role attribute', () => {
        render(
          <>
            <FirebaseCrashlytics firebaseApp={fakeApp} />
            <button role="login-btn">Login</button>
          </>
        );
        fireEvent.click(document.querySelector('button[role="login-btn"]')!);
        expect(fakeContextManager.startRootSpan).to.have.been.calledWith(
          fakeTracer,
          'click button [role="login-btn"]'
        );
      });
    });
  });
});
