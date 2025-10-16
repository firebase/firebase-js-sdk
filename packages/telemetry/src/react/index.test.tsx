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
import { restore, stub } from 'sinon';
import * as app from '@firebase/app';
import * as telemetry from '../api';
import { FirebaseApp } from '@firebase/app';
import { Telemetry } from '../public-types';
import { FirebaseTelemetry } from '.';
import React from 'react';
import { render } from '@testing-library/react';

use(sinonChai);
use(chaiAsPromised);

describe('FirebaseTelemetry', () => {
  let getTelemetryStub: sinon.SinonStub;
  let captureErrorStub: sinon.SinonStub;
  let initializeAppStub: sinon.SinonStub;
  let getAppStub: sinon.SinonStub;
  let fakeApp: FirebaseApp;
  let fakeTelemetry: Telemetry;

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    fakeTelemetry = {} as Telemetry;

    initializeAppStub = stub(app, 'initializeApp').returns(fakeApp);
    getTelemetryStub = stub(telemetry, 'getTelemetry').returns(fakeTelemetry);
    captureErrorStub = stub(telemetry, 'captureError');
    getAppStub = stub(app, 'getApp').returns(fakeApp);
  });

  afterEach(() => {
    restore();
  });

  it('gets telemetry with the default app if no firebaseOptions are provided', () => {
    render(<FirebaseTelemetry />);
    expect(initializeAppStub).not.to.have.been.called;
  });

  it('initializes a new app and gets telemetry if firebaseOptions are provided', () => {
    const firebaseOptions = { apiKey: 'test' };
    render(<FirebaseTelemetry firebaseOptions={firebaseOptions} />);
    expect(initializeAppStub).to.have.been.calledWith(firebaseOptions);
  });

  it('captures window errors', done => {
    render(<FirebaseTelemetry />);
    const error = new Error('test error');
    window.onerror = () => {
      // Prevent error from bubbling up to test suite
    };
    window.addEventListener('error', (event: ErrorEvent) => {
      // Registers another listener (sequential) to confirm behaviour.
      expect(getTelemetryStub).to.have.been.called;
      expect(captureErrorStub).to.have.been.calledWith(fakeTelemetry, error);
      done();
    });
    window.dispatchEvent(new ErrorEvent('error', { error }));
  });

  it('captures unhandled promise rejections', () => {
    render(<FirebaseTelemetry />);
    const reason = new Error('test rejection');
    const promise = Promise.reject(reason);
    promise.catch(() => {});
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', { reason, promise })
    );
    expect(getTelemetryStub).to.have.been.called;
    expect(captureErrorStub).to.have.been.calledWith(fakeTelemetry, reason);
  });

  it('fails silently when getTelemetry fails', () => {
    const error = new Error('getTelemetry failed');
    initializeAppStub.throws(error);
    const consoleWarnStub = stub(console, 'warn');

    expect(() => render(<FirebaseTelemetry firebaseOptions={{}}/>)).not.to.throw();
    expect(consoleWarnStub).to.have.been.calledWith(
      'Firebase Telemetry was not initialized:\n',
      error
    );
  });
});
