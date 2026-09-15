/**
 * @license
 * Copyright 2020 Google LLC
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
import { expect, vi, MockInstance } from 'vitest';
import { FirebaseApp } from '@firebase/app';
import { getFakeApp, getFakeHeartbeatServiceProvider } from '../test/util';
import {
  getExchangeRecaptchaV3TokenRequest,
  exchangeToken,
  getExchangeRecaptchaEnterpriseTokenRequest
} from './client';
import { FirebaseError } from '@firebase/util';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { BASE_ENDPOINT } from './constants';

describe('client', () => {
  let app: FirebaseApp;
  let fetchStub: MockInstance;
  beforeEach(() => {
    app = getFakeApp();
    fetchStub = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}'));
  });

  afterEach(() => {
    fetchStub.mockRestore();
    vi.useRealTimers();
  });

  it('creates exchange recaptcha token request correctly', () => {
    const request = getExchangeRecaptchaV3TokenRequest(
      app,
      'fake-recaptcha-token'
    );
    const { projectId, appId, apiKey } = app.options;

    expect(request).toEqual({
      url: `${BASE_ENDPOINT}/projects/${projectId}/apps/${appId}:exchangeRecaptchaV3Token?key=${apiKey}`,
      body: {
        // eslint-disable-next-line camelcase
        recaptcha_v3_token: 'fake-recaptcha-token'
      }
    });
  });

  it('creates exchange recaptcha enterprise token request correctly', () => {
    const request = getExchangeRecaptchaEnterpriseTokenRequest(
      app,
      'fake-recaptcha-token'
    );
    const { projectId, appId, apiKey } = app.options;

    expect(request).toEqual({
      url: `${BASE_ENDPOINT}/projects/${projectId}/apps/${appId}:exchangeRecaptchaEnterpriseToken?key=${apiKey}`,
      body: {
        // eslint-disable-next-line camelcase
        recaptcha_enterprise_token: 'fake-recaptcha-token'
      }
    });
  });

  it('returns a AppCheck token', async () => {
    // To get a consistent expireTime/issuedAtTime.
    vi.useFakeTimers({ now: 0 });
    fetchStub.mockResolvedValue({
      status: 200,
      json: async () => ({
        token: 'fake-appcheck-token',
        ttl: '3.600s'
      })
    } as Response);

    const response = await exchangeToken(
      getExchangeRecaptchaV3TokenRequest(app, 'fake-custom-token'),
      getFakeHeartbeatServiceProvider('a/1.2.3 fire-app-check/2.3.4')
    );

    expect(
      (fetchStub.mock.calls[0][1]?.['headers'] as any)['X-Firebase-Client']
    ).toBe('a/1.2.3 fire-app-check/2.3.4');

    expect(response).toEqual({
      token: 'fake-appcheck-token',
      expireTimeMillis: 3600,
      issuedAtTimeMillis: 0
    });
    vi.useRealTimers();
  });

  it('throws when there is a network error', async () => {
    const originalError = new TypeError('Network request failed');
    fetchStub.mockRejectedValue(originalError);
    const firebaseError = ERROR_FACTORY.create(
      AppCheckError.FETCH_NETWORK_ERROR,
      {
        originalErrorMessage: (originalError as Error)?.message
      }
    );

    try {
      await exchangeToken(
        getExchangeRecaptchaV3TokenRequest(app, 'fake-custom-token'),
        getFakeHeartbeatServiceProvider()
      );
    } catch (e) {
      expect(e).toBeInstanceOf(FirebaseError);
      expect((e as FirebaseError).message).toBe(firebaseError.message);
      expect((e as any).customData?.originalErrorMessage).toBe(
        'Network request failed'
      );
    }
  });

  it('throws when response status is not 200', async () => {
    fetchStub.mockResolvedValue({
      status: 500
    } as Response);

    const firebaseError = ERROR_FACTORY.create(
      AppCheckError.FETCH_STATUS_ERROR,
      {
        httpStatus: 500
      }
    );

    try {
      await exchangeToken(
        getExchangeRecaptchaV3TokenRequest(app, 'fake-custom-token'),
        getFakeHeartbeatServiceProvider()
      );
    } catch (e) {
      expect(e).toBeInstanceOf(FirebaseError);
      expect((e as FirebaseError).message).toBe(firebaseError.message);
      expect((e as any).customData?.httpStatus).toBe(500);
    }
  });

  it('throws if the response body is not json', async () => {
    const originalError = new SyntaxError('invalid JSON string');
    fetchStub.mockResolvedValue({
      status: 200,
      json: () => Promise.reject(originalError)
    } as Response);

    const firebaseError = ERROR_FACTORY.create(
      AppCheckError.FETCH_PARSE_ERROR,
      {
        originalErrorMessage: (originalError as Error)?.message
      }
    );

    try {
      await exchangeToken(
        getExchangeRecaptchaV3TokenRequest(app, 'fake-custom-token'),
        getFakeHeartbeatServiceProvider()
      );
    } catch (e) {
      expect(e).toBeInstanceOf(FirebaseError);
      expect((e as FirebaseError).message).toBe(firebaseError.message);
      expect((e as any).customData?.originalErrorMessage).toBe(
        (originalError as Error)?.message
      );
    }
  });

  it('throws if timeToLive field is not a number', async () => {
    fetchStub.mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          token: 'fake-appcheck-token',
          ttl: 'NAN'
        })
    } as Response);

    const firebaseError = ERROR_FACTORY.create(
      AppCheckError.FETCH_PARSE_ERROR,
      {
        originalErrorMessage: `ttl field (timeToLive) is not in standard Protobuf Duration format: NAN`
      }
    );

    try {
      await exchangeToken(
        getExchangeRecaptchaV3TokenRequest(app, 'fake-custom-token'),
        getFakeHeartbeatServiceProvider()
      );
    } catch (e) {
      expect(e).toBeInstanceOf(FirebaseError);
      expect((e as FirebaseError).message).toBe(firebaseError.message);
      expect((e as any).customData?.originalErrorMessage).toBe(
        `ttl field (timeToLive) is not in standard Protobuf Duration format: NAN`
      );
    }
  });
});
