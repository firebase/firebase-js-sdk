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
import { FirebaseCrashlytics, CrashlyticsRoutes } from '.';
import React from 'react';
import { AttributesStore, LOG_ATTR_KEY } from '../attributes-store';
import { render } from '@testing-library/react';
import { ALREADY_LOGGED_FLAG } from '../constants';
import { ErrorWithSymbol } from '../types';
import { MemoryRouter, Route } from 'react-router-dom';

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

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    emitStub = stub();
    fakeCrashlytics = {
      app: {
        options: {}
      },
      loggerProvider: {
        getLogger: stub().returns({
          emit: emitStub
        })
      },
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
    promise.catch(() => {});

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
});

describe('CrashlyticsRoutes', () => {
  let getCrashlyticsStub: sinon.SinonStub;
  let recordErrorStub: sinon.SinonStub;
  let fakeApp: FirebaseApp;
  let fakeAttributesStore: AttributesStore;
  let fakeCrashlytics: Crashlytics;

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    fakeAttributesStore = new AttributesStore({ projectId: 'project-id' });
    fakeCrashlytics = {
      attributesStore: fakeAttributesStore,
    } as unknown as Crashlytics;

    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(
      fakeCrashlytics
    );
    recordErrorStub = stub(crashlytics, 'recordError');
  });

  afterEach(() => {
    restore();
  });

  const ThrowingComponent = () => {
    throw new Error('render error');
  };

  it('captures render errors in routes and re-throws them', () => {
    const consoleErrorStub = stub(console, 'error');

    const { container } = render(
      <TestErrorBoundary>
        <MemoryRouter>
          <CrashlyticsRoutes firebaseApp={fakeApp}>
            <Route path="/" element={<ThrowingComponent />} />
          </CrashlyticsRoutes>
        </MemoryRouter>
      </TestErrorBoundary>
    );

    expect(getCrashlyticsStub).to.have.been.calledWith(fakeApp);
    expect(recordErrorStub).to.have.been.calledWith(
      fakeCrashlytics,
      sinon.match
        .instanceOf(Error)
        .and(sinon.match.has('message', 'render error'))
    );
    expect(container.firstChild).to.be.null;

    consoleErrorStub.restore();
  });

  it('captures parameterized route pattern and re-throws', () => {
    const consoleErrorStub = stub(console, 'error');

    const { container } = render(
      <TestErrorBoundary>
        <MemoryRouter initialEntries={['/users/123']}>
          <CrashlyticsRoutes firebaseApp={fakeApp}>
            <Route path="/users/:id" element={<ThrowingComponent />} />
          </CrashlyticsRoutes>
        </MemoryRouter>
      </TestErrorBoundary>
    );

    expect(getCrashlyticsStub).to.have.been.calledWith(fakeApp);
    expect(recordErrorStub).to.have.been.calledWith(
      fakeCrashlytics,
      sinon.match
        .instanceOf(Error)
        .and(sinon.match.has('message', 'render error'))
    );
    expect(container.firstChild).to.be.null;

    consoleErrorStub.restore();
  });

  it('filters empty paths and normalizes leading slashes', () => {
    const consoleErrorStub = stub(console, 'error');

    const { container } = render(
      <TestErrorBoundary>
        <MemoryRouter initialEntries={['/about']}>
          <CrashlyticsRoutes firebaseApp={fakeApp}>
            <Route path="/">
              <Route path="" />
              <Route path="about" element={<ThrowingComponent />} />
            </Route>
          </CrashlyticsRoutes>
        </MemoryRouter>
      </TestErrorBoundary>
    );

    expect(getCrashlyticsStub).to.have.been.calledWith(fakeApp);
    expect(recordErrorStub).to.have.been.calledWith(
      fakeCrashlytics,
      sinon.match
        .instanceOf(Error)
        .and(sinon.match.has('message', 'render error'))
    );
    expect(container.firstChild).to.be.null;

    consoleErrorStub.restore();
  });

  it('registers routePath in attributesStore and cleans up on unmount', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/users/123']}>
        <CrashlyticsRoutes firebaseApp={fakeApp}>
          <Route path="/users/:id" element={<div>User Profile</div>} />
        </CrashlyticsRoutes>
      </MemoryRouter>
    );

    expect(fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH]).to.equal('/users/:id');

    unmount();
    expect(fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH]).to.be.undefined;
  });
});
