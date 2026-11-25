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
import { Deferred, FirebaseError } from '@firebase/util';
import { AppCheckError } from './errors';
import { AppCheckTokenInternal } from './types';
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

const fakeToken: AppCheckTokenInternal = {
  token: 'fake-exchange-token',
  issuedAtTimeMillis: 0,
  expireTimeMillis: 10
};

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

  it('getToken() passes the signal to the attestation and the exchange', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    const attestationSpy = vi
      .spyOn(recaptcha, 'getToken')
      .mockResolvedValue('fake-recaptcha-token');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockResolvedValue(fakeToken);
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const { signal } = new AbortController();

    await provider.getToken(false, signal);

    expect(attestationSpy).toHaveBeenCalledWith(app, signal);
    expect(exchangeTokenStub.mock.calls[0][2]).toBe(signal);
  });

  it('getToken() makes no exchange request if given up before the attestation returns', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    const attestation = new Deferred<string>();
    vi.spyOn(recaptcha, 'getToken').mockReturnValue(attestation.promise);
    const exchangeTokenSpy = vi.spyOn(client, 'exchangeToken');
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockRejectedValue(new Error('unexpected request'));
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const controller = new AbortController();

    const result = provider.getToken(false, controller.signal);
    controller.abort();
    attestation.resolve('fake-recaptcha-token');

    await expect(result).rejects.toMatchObject({
      code: 'appCheck/exchange-timeout'
    });
    expect(exchangeTokenSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('getToken() is not throttled by an error that arrives after it was given up on', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    const exchange = new Deferred<AppCheckTokenInternal>();
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockReturnValue(exchange.promise);
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const controller = new AbortController();

    const result = provider.getToken(false, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    const statusError = new FirebaseError(
      AppCheckError.FETCH_STATUS_ERROR,
      'some-message',
      { httpStatus: 403 }
    );
    exchange.reject(statusError);

    await expect(result).rejects.toBe(statusError);
    exchangeTokenStub.mockResolvedValue(fakeToken);
    expect((await provider.getToken()).token).toBe('fake-exchange-token');
  });

  it('getToken() keeps its throttle when an attempt that was given up on succeeds', async () => {
    const provider = new ReCaptchaV3Provider('fake-site-key');
    const exchange = new Deferred<AppCheckTokenInternal>();
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockReturnValueOnce(exchange.promise)
      .mockRejectedValue(
        new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
          httpStatus: 403
        })
      );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const controller = new AbortController();

    const givenUp = provider.getToken(false, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await expect(provider.getToken()).rejects.toThrow('1d');

    exchange.resolve(fakeToken);
    await givenUp;
    exchangeTokenStub.mockClear();

    await expect(provider.getToken()).rejects.toThrow('1d');
    expect(exchangeTokenStub).not.toHaveBeenCalled();
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

  it('getToken() passes the signal to the attestation and the exchange', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    const attestationSpy = vi
      .spyOn(recaptcha, 'getToken')
      .mockResolvedValue('fake-recaptcha-token');
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockResolvedValue(fakeToken);
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const { signal } = new AbortController();

    await provider.getToken(false, signal);

    expect(attestationSpy).toHaveBeenCalledWith(app, signal);
    expect(exchangeTokenStub.mock.calls[0][2]).toBe(signal);
  });

  it('getToken() makes no exchange request if given up before the attestation returns', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    const attestation = new Deferred<string>();
    vi.spyOn(recaptcha, 'getToken').mockReturnValue(attestation.promise);
    const exchangeTokenSpy = vi.spyOn(client, 'exchangeToken');
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockRejectedValue(new Error('unexpected request'));
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const controller = new AbortController();

    const result = provider.getToken(false, controller.signal);
    controller.abort();
    attestation.resolve('fake-recaptcha-token');

    await expect(result).rejects.toMatchObject({
      code: 'appCheck/exchange-timeout'
    });
    expect(exchangeTokenSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('getToken() is not throttled by an error that arrives after it was given up on', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    const exchange = new Deferred<AppCheckTokenInternal>();
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockReturnValue(exchange.promise);
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const controller = new AbortController();

    const result = provider.getToken(false, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    const statusError = new FirebaseError(
      AppCheckError.FETCH_STATUS_ERROR,
      'some-message',
      { httpStatus: 403 }
    );
    exchange.reject(statusError);

    await expect(result).rejects.toBe(statusError);
    exchangeTokenStub.mockResolvedValue(fakeToken);
    expect((await provider.getToken()).token).toBe('fake-exchange-token');
  });

  it('getToken() keeps its throttle when an attempt that was given up on succeeds', async () => {
    const provider = new ReCaptchaEnterpriseProvider('fake-site-key');
    const exchange = new Deferred<AppCheckTokenInternal>();
    const exchangeTokenStub = vi
      .spyOn(client, 'exchangeToken')
      .mockReturnValueOnce(exchange.promise)
      .mockRejectedValue(
        new FirebaseError(AppCheckError.FETCH_STATUS_ERROR, 'some-message', {
          httpStatus: 403
        })
      );
    provider.initialize(app);
    getStateReference(app).reCAPTCHAState!.succeeded = true;
    const controller = new AbortController();

    const givenUp = provider.getToken(false, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await expect(provider.getToken()).rejects.toThrow('1d');

    exchange.resolve(fakeToken);
    await givenUp;
    exchangeTokenStub.mockClear();

    await expect(provider.getToken()).rejects.toThrow('1d');
    expect(exchangeTokenStub).not.toHaveBeenCalled();
  });
});
