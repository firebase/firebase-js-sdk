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
import { expect } from 'chai';
import { stub, SinonStub, useFakeTimers } from 'sinon';
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
  let fetchStub: SinonStub<
    [RequestInfo | URL, RequestInit?],
    Promise<Response>
  >;
  beforeEach(() => {
    app = getFakeApp();
    fetchStub = stub(window, 'fetch').returns(
      Promise.resolve(new Response('{}'))
    );
  });

  it('creates exchange recaptcha token request correctly', () => {
    const request = getExchangeRecaptchaV3TokenRequest(
      app,
      'fake-recaptcha-token'
    );
    const { projectId, appId, apiKey } = app.options;

    expect(request).to.deep.equal({
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

    expect(request).to.deep.equal({
      url: `${BASE_ENDPOINT}/projects/${projectId}/apps/${appId}:exchangeRecaptchaEnterpriseToken?key=${apiKey}`,
      body: {
        // eslint-disable-next-line camelcase
        recaptcha_enterprise_token: 'fake-recaptcha-token'
      }
    });
  });

  it('returns a AppCheck token', async () => {
    // To get a consistent expireTime/issuedAtTime.
    const clock = useFakeTimers();
    fetchStub.returns(
      Promise.resolve({
        status: 200,
        json: async () => ({
          token: 'fake-appcheck-token',
          ttl: '3.600s'
        })
      } as Response)
    );

    const response = await exchangeToken(
      getExchangeRecaptchaV3TokenRequest(app, 'fake-custom-token'),
      getFakeHeartbeatServiceProvider('a/1.2.3 fire-app-check/2.3.4')
    );

    expect(
      (fetchStub.args[0][1]?.['headers'] as any)['X-Firebase-Client']
    ).to.equal('a/1.2.3 fire-app-check/2.3.4');

    expect(response).to.deep.equal({
      token: 'fake-appcheck-token',
      expireTimeMillis: 3600,
      issuedAtTimeMillis: 0
    });
    clock.restore();
  });

  it('throws when there is a network error', async () => {
    const originalError = new TypeError('Network request failed');
    fetchStub.returns(Promise.reject(originalError));
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
      expect(e).instanceOf(FirebaseError);
      expect(e).has.property('message', firebaseError.message);
      expect(e).has.nested.property(
        'customData.originalErrorMessage',
        'Network request failed'
      );
    }
  });

  it('throws when response status is not 200', async () => {
    fetchStub.returns(
      Promise.resolve({
        status: 500
      } as Response)
    );

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
      expect(e).instanceOf(FirebaseError);
      expect(e).has.property('message', firebaseError.message);
      expect(e).has.nested.property('customData.httpStatus', 500);
    }
  });

  it('throws if the response body is not json', async () => {
    const originalError = new SyntaxError('invalid JSON string');
    fetchStub.returns(
      Promise.resolve({
        status: 200,
        json: () => Promise.reject(originalError)
      } as Response)
    );

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
      expect(e).instanceOf(FirebaseError);
      expect(e).has.property('message', firebaseError.message);
      expect(e).has.nested.property(
        'customData.originalErrorMessage',
        (originalError as Error)?.message
      );
    }
  });

  it('throws if timeToLive field is not a number', async () => {
    fetchStub.returns(
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            token: 'fake-appcheck-token',
            ttl: 'NAN'
          })
      } as Response)
    );

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
      expect(e).instanceOf(FirebaseError);
      expect(e).has.property('message', firebaseError.message);
      expect(e).has.nested.property(
        'customData.originalErrorMessage',
        `ttl field (timeToLive) is not in standard Protobuf Duration format: NAN`
      );
    }
  });
});
