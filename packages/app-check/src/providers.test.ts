/**
 * @license
 * Copyright 2021 Google LLC
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

import '../test/setup';
import { getFakeGreCAPTCHA, getFullApp } from '../test/util';
import { ReCaptchaV3Provider } from './providers';
import * as client from './client';
import * as reCAPTCHA from './recaptcha';
import * as util from './util';
import { stub, useFakeTimers } from 'sinon';
import { expect } from 'chai';
import { FirebaseError } from '@firebase/util';
import { AppCheckError } from './errors';
import { clearState } from './state';
import { deleteApp, FirebaseApp } from '@firebase/app';

describe('ReCaptchaV3Provider', () => {
  let app: FirebaseApp;
  let clock = useFakeTimers();
  beforeEach(() => {
    clock = useFakeTimers();
    app = getFullApp();
    stub(util, 'getRecaptcha').returns(getFakeGreCAPTCHA());
    stub(reCAPTCHA, 'getToken').returns(
      Promise.resolve('fake-recaptcha-token')
    );
  });

  afterEach(() => {
    clock.restore();
    clearState();
    return deleteApp(app);
  });
  it('getToken() gets a token from the exchange endpoint', async () => {
    const app = getFullApp();
    const provider = new ReCaptchaV3Provider('fake-site-key');
    stub(client, 'exchangeToken').resolves({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    provider.initialize(app);
    const token = await provider.getToken();
    expect(token.token).to.equal('fake-exchange-token');
  });
  it('getToken() throttles 1d on 403', async () => {
    const app = getFullApp();
    const provider = new ReCaptchaV3Provider('fake-site-key');
    stub(client, 'exchangeToken').rejects(
      new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
        httpStatus: 403
      })
    );
    provider.initialize(app);
    await expect(provider.getToken()).to.be.rejectedWith('1d');
    // Wait 10s and try again to see if wait time string decreases.
    clock.tick(10000);
    await expect(provider.getToken()).to.be.rejectedWith('23h');
  });
  it('getToken() throttles exponentially on 503', async () => {
    const app = getFullApp();
    const provider = new ReCaptchaV3Provider('fake-site-key');
    let exchangeTokenStub = stub(client, 'exchangeToken').rejects(
      new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
        httpStatus: 503
      })
    );
    provider.initialize(app);
    await expect(provider.getToken()).to.be.rejectedWith('503');
    expect(exchangeTokenStub).to.be.called;
    exchangeTokenStub.resetHistory();
    // Try again immediately, should be rejected.
    await expect(provider.getToken()).to.be.rejectedWith('503');
    expect(exchangeTokenStub).not.to.be.called;
    exchangeTokenStub.resetHistory();
    // Wait for 1.5 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    clock.tick(1500);
    await expect(provider.getToken()).to.be.rejectedWith('503');
    expect(exchangeTokenStub).to.be.called;
    exchangeTokenStub.resetHistory();
    // Wait for 10 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    clock.tick(10000);
    await expect(provider.getToken()).to.be.rejectedWith('503');
    expect(exchangeTokenStub).to.be.called;
    // Wait for 10 seconds to pass, should call exchange endpoint again
    // (and succeed)
    clock.tick(10000);
    exchangeTokenStub.restore();
    exchangeTokenStub = stub(client, 'exchangeToken').resolves({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    const token = await provider.getToken();
    expect(token.token).to.equal('fake-exchange-token');
  });
});
