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

import { getFakeGreCAPTCHA, getFullApp } from '../test/util';
import { expect, vi } from 'vitest';
import { FirebaseError } from '@firebase/util';
import { AppCheckError } from './errors';
import {
  clearState,
  DEFAULT_STATE,
  getStateReference,
  setInitialState
} from './state';
import { deleteApp, FirebaseApp } from '@firebase/app';

import * as client from './client';
import * as recaptcha from './recaptcha';
import { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from './providers';

vi.mock('./client', { spy: true });
vi.mock('./recaptcha', { spy: true });

describe('ReCaptchaV3Provider', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    app = getFullApp();
    setInitialState(app, DEFAULT_STATE);
    self.grecaptcha = getFakeGreCAPTCHA() as any;
    vi.spyOn(recaptcha, 'getToken').mockResolvedValue('fake-recaptcha-token');
  });

  afterEach(() => {
    clearState();
    self.grecaptcha = undefined;
    return deleteApp(app);
  });

  it('getToken() gets a token from the exchange endpoint', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockResolvedValue({
        token: 'fake-exchange-token',
        issuedAtTimeMillis: 0,
        expireTimeMillis: 10
      });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken();
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body['recaptcha_v3_token']
    ).toBe('fake-recaptcha-token');
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body['limited_use']
    ).toBeUndefined();
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken(true) gets a limited use token from the exchange endpoint', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockResolvedValue({
        token: 'fake-exchange-token',
        issuedAtTimeMillis: 0,
        expireTimeMillis: 10
      });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken(true);
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body['recaptcha_v3_token']
    ).toBe('fake-recaptcha-token');
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body['limited_use']
    ).toBe(true);
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken() throttles 1d on 403', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    vi.spyOn(client, 'exchangeToken').mockRejectedValue(
      new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
        httpStatus: 403
      })
    );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    await expect(provider.getToken()).rejects.toThrow('1d');
    // Wait 10s and try again to see if wait time string decreases.
    vi.advanceTimersByTime(10000);
    await expect(provider.getToken()).rejects.toThrow('23h');
  });

  it('getToken() throttles exponentially on 503', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockRejectedValue(
        new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
          httpStatus: 503
        })
      );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Try again immediately, should be rejected.
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).not.toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Times below are max range of each random exponential wait,
    // the possible range is 2^(backoff_count) plus or minus 50%
    // Wait for 1.5 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(1500);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Wait for 3 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(3000);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Wait for 6 seconds to pass, should call exchange endpoint again
    // (and succeed)
    vi.advanceTimersByTime(6000);
    exchangeTokenStub.mockResolvedValue({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    const token = await provider.getToken();
    expect(token.token).toBe('fake-exchange-token');
  });
});

describe('ReCaptchaEnterpriseProvider', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    app = getFullApp();
    setInitialState(app, DEFAULT_STATE);
    self.grecaptcha = getFakeGreCAPTCHA() as any;
    vi.spyOn(recaptcha, 'getToken').mockResolvedValue('fake-recaptcha-token');
  });

  afterEach(() => {
    clearState();
    self.grecaptcha = undefined;
    return deleteApp(app);
  });

  it('getToken() gets a token from the exchange endpoint', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockResolvedValue({
        token: 'fake-exchange-token',
        issuedAtTimeMillis: 0,
        expireTimeMillis: 10
      });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken();
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body[
        'recaptcha_enterprise_token'
      ]
    ).toBe('fake-recaptcha-token');
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body['limited_use']
    ).toBeUndefined();
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken(true) gets a token from the exchange endpoint', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockResolvedValue({
        token: 'fake-exchange-token',
        issuedAtTimeMillis: 0,
        expireTimeMillis: 10
      });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken(true);
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body['limited_use']
    ).toBe(true);
    expect(
      (exchangeTokenStub.mock.calls[0][0] as any).body[
        'recaptcha_enterprise_token'
      ]
    ).toBe('fake-recaptcha-token');
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken() throttles 1d on 403', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    vi.spyOn(client, 'exchangeToken').mockRejectedValue(
      new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
        httpStatus: 403
      })
    );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    await expect(provider.getToken()).rejects.toThrow('1d');
    // Wait 10s and try again to see if wait time string decreases.
    vi.advanceTimersByTime(10000);
    await expect(provider.getToken()).rejects.toThrow('23h');
  });

  it('getToken() throttles exponentially on 503', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockRejectedValue(
        new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
          httpStatus: 503
        })
      );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Try again immediately, should be rejected.
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).not.toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Times below are max range of each random exponential wait,
    // the possible range is 2^(backoff_count) plus or minus 50%
    // Wait for 1.5 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(1500);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Wait for 3 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(3000);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(exchangeTokenStub).toHaveBeenCalled();
    exchangeTokenStub.mockClear();
    // Wait for 6 seconds to pass, should call exchange endpoint again
    // (and succeed)
    vi.advanceTimersByTime(6000);
    exchangeTokenStub.mockResolvedValue({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    const token = await provider.getToken();
    expect(token.token).toBe('fake-exchange-token');
  });
});
