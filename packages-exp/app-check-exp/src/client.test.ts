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
import { FirebaseApp } from '@firebase/app-exp';
import { getFakeApp, getFakePlatformLoggingProvider } from '../test/util';
import { getExchangeRecaptchaTokenRequest, exchangeToken } from './client';
import { FirebaseError } from '@firebase/util';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { BASE_ENDPOINT } from './constants';

describe('client', () => {
  let app: FirebaseApp;
  let fetchStub: SinonStub<[RequestInfo, RequestInit?], Promise<Response>>;
  beforeEach(() => {
    app = getFakeApp();
    fetchStub = stub(window, 'fetch').returns(
      Promise.resolve(new Response('{}'))
    );
  });

  it('creates exchange recaptcha token request correctly', () => {
    const request = getExchangeRecaptchaTokenRequest(
      app,
      'fake-recaptcha-token'
    );
    const { projectId, appId, apiKey } = app.options;

    expect(request).to.deep.equal({
      url: `${BASE_ENDPOINT}/projects/${projectId}/apps/${appId}:exchangeRecaptchaToken?key=${apiKey}`,
      body: {
        // eslint-disable-next-line camelcase
        recaptcha_token: 'fake-recaptcha-token'
      }
    });
  });

  it('returns a AppCheck token', async () => {
    useFakeTimers();
    fetchStub.returns(
      Promise.resolve({
        status: 200,
        json: async () => ({
          attestationToken: 'fake-appcheck-token',
          ttl: '3.600s'
        })
      } as Response)
    );

    const response = await exchangeToken(
      getExchangeRecaptchaTokenRequest(app, 'fake-custom-token'),
      getFakePlatformLoggingProvider('a/1.2.3 fire-app-check/2.3.4')
    );

    expect(
      (fetchStub.args[0][1]?.['headers'] as any)['X-Firebase-Client']
    ).to.equal('a/1.2.3 fire-app-check/2.3.4');

    expect(response).to.deep.equal({
      token: 'fake-appcheck-token',
      expireTimeMillis: 3600,
      issuedAtTimeMillis: 0
    });
  });

  it('throws when there is a network error', async () => {
    const originalError = new TypeError('Network request failed');
    fetchStub.returns(Promise.reject(originalError));
    const firebaseError = ERROR_FACTORY.create(
      AppCheckError.FETCH_NETWORK_ERROR,
      {
        originalErrorMessage: originalError.message
      }
    );

    try {
      await exchangeToken(
        getExchangeRecaptchaTokenRequest(app, 'fake-custom-token'),
        getFakePlatformLoggingProvider()
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
        getExchangeRecaptchaTokenRequest(app, 'fake-custom-token'),
        getFakePlatformLoggingProvider()
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
        originalErrorMessage: originalError.message
      }
    );

    try {
      await exchangeToken(
        getExchangeRecaptchaTokenRequest(app, 'fake-custom-token'),
        getFakePlatformLoggingProvider()
      );
    } catch (e) {
      expect(e).instanceOf(FirebaseError);
      expect(e).has.property('message', firebaseError.message);
      expect(e).has.nested.property(
        'customData.originalErrorMessage',
        originalError.message
      );
    }
  });

  it('throws if timeToLive field is not a number', async () => {
    fetchStub.returns(
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            attestationToken: 'fake-appcheck-token',
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
        getExchangeRecaptchaTokenRequest(app, 'fake-custom-token'),
        getFakePlatformLoggingProvider()
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
