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
import { getFullApp } from '../test/util';
import { expect, vi } from 'vitest';
import { FirebaseError, Deferred } from '@firebase/util';
import { AppCheckError } from './errors';
import {
  clearState,
  DEFAULT_STATE,
  getStateReference,
  setInitialState
} from './state';
import { deleteApp, FirebaseApp } from '@firebase/app';

const {
  mockExchangeToken,
  mockGetReCAPTCHAToken,
  mockInitializeRecaptchaV3,
  mockInitializeRecaptchaEnterprise
} = vi.hoisted(() => ({
  mockExchangeToken: vi.fn(),
  mockGetReCAPTCHAToken: vi.fn(),
  mockInitializeRecaptchaV3: vi.fn(),
  mockInitializeRecaptchaEnterprise: vi.fn()
}));

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return {
    ...actual,
    exchangeToken: (...args: unknown[]) =>
      mockExchangeToken.getMockImplementation()
        ? mockExchangeToken(...args)
        : actual.exchangeToken(...(args as [any, any]))
  };
});

vi.mock('./recaptcha', async importOriginal => {
  const actual = await importOriginal<typeof import('./recaptcha')>();
  return {
    ...actual,
    getToken: (...args: unknown[]) =>
      mockGetReCAPTCHAToken.getMockImplementation()
        ? mockGetReCAPTCHAToken(...args)
        : actual.getToken(...(args as [any])),
    initializeV3: (...args: unknown[]) =>
      mockInitializeRecaptchaV3.getMockImplementation()
        ? mockInitializeRecaptchaV3(...args)
        : actual.initializeV3(...(args as [any, any])),
    initializeEnterprise: (...args: unknown[]) =>
      mockInitializeRecaptchaEnterprise.getMockImplementation()
        ? mockInitializeRecaptchaEnterprise(...args)
        : actual.initializeEnterprise(...(args as [any, any]))
  };
});

import { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from './providers';

describe('ReCaptchaV3Provider', () => {
  let app: FirebaseApp;

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    app = getFullApp();
    setInitialState(app, DEFAULT_STATE);
    mockGetReCAPTCHAToken.mockResolvedValue('fake-recaptcha-token');
    mockInitializeRecaptchaV3.mockImplementation((appToInit: FirebaseApp) => {
      const state = getStateReference(appToInit);
      state.reCAPTCHAState = { initialized: new Deferred() };
      return Promise.resolve({} as any);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    clearState();
    mockExchangeToken.mockReset();
    mockGetReCAPTCHAToken.mockReset();
    mockInitializeRecaptchaV3.mockReset();
    return deleteApp(app);
  });

  it('getToken() gets a token from the exchange endpoint', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    mockExchangeToken.mockResolvedValue({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken();
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body['recaptcha_v3_token']
    ).toBe('fake-recaptcha-token');
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body['limited_use']
    ).toBeUndefined();
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken(true) gets a limited use token from the exchange endpoint', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    mockExchangeToken.mockResolvedValue({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken(true);
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body['recaptcha_v3_token']
    ).toBe('fake-recaptcha-token');
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body['limited_use']
    ).toBe(true);
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken() throttles 1d on 403', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    mockExchangeToken.mockRejectedValue(
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
    mockExchangeToken.mockRejectedValue(
      new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
        httpStatus: 503
      })
    );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Try again immediately, should be rejected.
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).not.toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Times below are max range of each random exponential wait,
    // the possible range is 2^(backoff_count) plus or minus 50%
    // Wait for 1.5 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(1500);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Wait for 3 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(3000);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Wait for 6 seconds to pass, should call exchange endpoint again
    // (and succeed)
    vi.advanceTimersByTime(6000);
    mockExchangeToken.mockResolvedValue({
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
    mockGetReCAPTCHAToken.mockResolvedValue('fake-recaptcha-token');
    mockInitializeRecaptchaEnterprise.mockImplementation(
      (appToInit: FirebaseApp) => {
        const state = getStateReference(appToInit);
        state.reCAPTCHAState = { initialized: new Deferred() };
        return Promise.resolve({} as any);
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    clearState();
    mockExchangeToken.mockReset();
    mockGetReCAPTCHAToken.mockReset();
    mockInitializeRecaptchaEnterprise.mockReset();
    return deleteApp(app);
  });

  it('getToken() gets a token from the exchange endpoint', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    mockExchangeToken.mockResolvedValue({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken();
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body[
        'recaptcha_enterprise_token'
      ]
    ).toBe('fake-recaptcha-token');
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body['limited_use']
    ).toBeUndefined();
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken(true) gets a token from the exchange endpoint', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    mockExchangeToken.mockResolvedValue({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const token = await provider.getToken(true);
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body['limited_use']
    ).toBe(true);
    expect(
      (mockExchangeToken.mock.calls[0][0] as any).body[
        'recaptcha_enterprise_token'
      ]
    ).toBe('fake-recaptcha-token');
    expect(token.token).toBe('fake-exchange-token');
  });

  it('getToken() throttles 1d on 403', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    mockExchangeToken.mockRejectedValue(
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
    mockExchangeToken.mockRejectedValue(
      new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
        httpStatus: 503
      })
    );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Try again immediately, should be rejected.
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).not.toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Times below are max range of each random exponential wait,
    // the possible range is 2^(backoff_count) plus or minus 50%
    // Wait for 1.5 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(1500);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Wait for 3 seconds to pass, should call exchange endpoint again
    // (and be rejected again)
    vi.advanceTimersByTime(3000);
    await expect(provider.getToken()).rejects.toThrow('503');
    expect(mockExchangeToken).toHaveBeenCalled();
    mockExchangeToken.mockClear();
    // Wait for 6 seconds to pass, should call exchange endpoint again
    // (and succeed)
    vi.advanceTimersByTime(6000);
    mockExchangeToken.mockResolvedValue({
      token: 'fake-exchange-token',
      issuedAtTimeMillis: 0,
      expireTimeMillis: 10
    });
    const token = await provider.getToken();
    expect(token.token).toBe('fake-exchange-token');
  });
});
