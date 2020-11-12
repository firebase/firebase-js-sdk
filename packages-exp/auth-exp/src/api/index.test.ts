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

import { assert, expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { useFakeTimers } from 'sinon';
import * as sinonChai from 'sinon-chai';

import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../test/helpers/mock_auth';
import * as mockFetch from '../../test/helpers/mock_fetch';
import { AuthErrorCode } from '../core/errors';
import { ConfigInternal } from '../model/auth';
import {
  _getFinalTarget,
  _performApiRequest,
  DEFAULT_API_TIMEOUT_MS,
  Endpoint,
  HttpHeader,
  HttpMethod
} from './';
import { ServerError } from './errors';

use(sinonChai);
use(chaiAsPromised);

describe('api/_performApiRequest', () => {
  const request = {
    requestKey: 'request-value'
  };

  const serverResponse = {
    responseKey: 'response-value'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  context('with regular requests', () => {
    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should set the correct request, method and HTTP Headers', async () => {
      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      const response = await _performApiRequest<
        typeof request,
        typeof serverResponse
      >(auth, HttpMethod.POST, Endpoint.SIGN_UP, request);
      expect(response).to.eql(serverResponse);
      expect(mock.calls.length).to.eq(1);
      expect(mock.calls[0].method).to.eq(HttpMethod.POST);
      expect(mock.calls[0].request).to.eql(request);
      expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
        'application/json'
      );
      expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
        'testSDK/0.0.0'
      );
    });

    it('should set the device language if available', async () => {
      auth.languageCode = 'jp';
      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      const response = await _performApiRequest<
        typeof request,
        typeof serverResponse
      >(auth, HttpMethod.POST, Endpoint.SIGN_UP, request);
      expect(response).to.eql(serverResponse);
      expect(mock.calls[0].headers.get(HttpHeader.X_FIREBASE_LOCALE)).to.eq(
        'jp'
      );
    });

    it('should translate server errors to auth errors', async () => {
      const mock = mockEndpoint(
        Endpoint.SIGN_UP,
        {
          error: {
            code: 400,
            message: ServerError.EMAIL_EXISTS,
            errors: [
              {
                message: ServerError.EMAIL_EXISTS
              }
            ]
          }
        },
        400
      );
      const promise = _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/email-already-in-use'
      );
      expect(mock.calls[0].request).to.eql(request);
    });

    it('should translate complex server errors to auth errors', async () => {
      const mock = mockEndpoint(
        Endpoint.SIGN_UP,
        {
          error: {
            code: 400,
            message: `${ServerError.INVALID_PHONE_NUMBER} : TOO_SHORT`,
            errors: [
              {
                message: ServerError.EMAIL_EXISTS
              }
            ]
          }
        },
        400
      );
      const promise = _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/invalid-phone-number'
      );
      expect(mock.calls[0].request).to.eql(request);
    });

    it('should handle unknown server errors', async () => {
      const mock = mockEndpoint(
        Endpoint.SIGN_UP,
        {
          error: {
            code: 400,
            message: 'Awesome error',
            errors: [
              {
                message: 'Awesome error'
              }
            ]
          }
        },
        400
      );
      const promise = _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/awesome-error'
      );
      expect(mock.calls[0].request).to.eql(request);
    });

    it('should support custom error handling per endpoint', async () => {
      const mock = mockEndpoint(
        Endpoint.SIGN_UP,
        {
          error: {
            code: 400,
            message: ServerError.EXPIRED_OOB_CODE,
            errors: [
              {
                message: ServerError.EXPIRED_OOB_CODE
              }
            ]
          }
        },
        400
      );
      const promise = _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request,
        {
          [ServerError.EXPIRED_OOB_CODE]: AuthErrorCode.ARGUMENT_ERROR
        }
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/argument-error'
      );
      expect(mock.calls[0].request).to.eql(request);
    });
  });

  context('with network issues', () => {
    afterEach(mockFetch.tearDown);

    it('should handle timeouts', async () => {
      const clock = useFakeTimers();
      mockFetch.setUpWithOverride(() => {
        return new Promise<never>(() => null);
      });
      const promise = _performApiRequest<typeof request, never>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      clock.tick(DEFAULT_API_TIMEOUT_MS.get() + 1);
      await expect(promise).to.be.rejectedWith(FirebaseError, 'auth/timeout');
      clock.restore();
    });

    it('should clear the network timeout on success', async () => {
      const clock = useFakeTimers();
      sinon.spy(clock, 'clearTimeout');
      mockFetch.setUp();
      mockEndpoint(Endpoint.SIGN_UP, {});
      const promise = _performApiRequest(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await promise;
      expect(clock.clearTimeout).to.have.been.called;
      clock.restore();
    });

    it('should handle network failure', async () => {
      mockFetch.setUpWithOverride(() => {
        return new Promise<never>((_, reject) =>
          reject(new Error('network error'))
        );
      });
      const promise = _performApiRequest<typeof request, never>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/network-request-failed'
      );
    });
  });

  context('edgcase error mapping', () => {
    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should generate a need_conirmation error with the response', async () => {
      mockEndpoint(Endpoint.SIGN_UP, {
        needConfirmation: true,
        idToken: 'id-token'
      });
      try {
        await _performApiRequest<typeof request, typeof serverResponse>(
          auth,
          HttpMethod.POST,
          Endpoint.SIGN_UP,
          request
        );
        assert.fail('Call should have failed');
      } catch (e) {
        expect(e.code).to.eq(`auth/${AuthErrorCode.NEED_CONFIRMATION}`);
        expect((e as FirebaseError).customData!._tokenResponse).to.eql({
          needConfirmation: true,
          idToken: 'id-token'
        });
      }
    });

    it('should generate a credential already in use error', async () => {
      const response = {
        error: {
          code: 400,
          message: ServerError.FEDERATED_USER_ID_ALREADY_LINKED,
          errors: [
            {
              message: ServerError.FEDERATED_USER_ID_ALREADY_LINKED
            }
          ]
        }
      };
      mockEndpoint(Endpoint.SIGN_UP, response, 400);
      try {
        await _performApiRequest<typeof request, typeof serverResponse>(
          auth,
          HttpMethod.POST,
          Endpoint.SIGN_UP,
          request
        );
        assert.fail('Call should have failed');
      } catch (e) {
        expect(e.code).to.eq(`auth/${AuthErrorCode.CREDENTIAL_ALREADY_IN_USE}`);
        expect((e as FirebaseError).customData!._tokenResponse).to.eql(
          response
        );
      }
    });

    it('should pull out email and phone number', async () => {
      const response = {
        error: {
          code: 400,
          message: ServerError.EMAIL_EXISTS,
          errors: [
            {
              message: ServerError.EMAIL_EXISTS
            }
          ]
        },
        email: 'email@test.com',
        phoneNumber: '+1555-this-is-a-number'
      };
      mockEndpoint(Endpoint.SIGN_UP, response, 400);
      try {
        await _performApiRequest<typeof request, typeof serverResponse>(
          auth,
          HttpMethod.POST,
          Endpoint.SIGN_UP,
          request
        );
        assert.fail('Call should have failed');
      } catch (e) {
        expect(e.code).to.eq(`auth/${AuthErrorCode.EMAIL_EXISTS}`);
        expect((e as FirebaseError).customData!.email).to.eq('email@test.com');
        expect((e as FirebaseError).customData!.phoneNumber).to.eq(
          '+1555-this-is-a-number'
        );
      }
    });
  });

  context('_getFinalTarget', () => {
    it('works properly with a non-emulated environment', () => {
      expect(_getFinalTarget(auth, 'host', '/path', 'query=test')).to.eq(
        'mock://host/path?query=test'
      );
    });

    it('works properly with an emulated environment', () => {
      (auth.config as ConfigInternal).emulator = {
        url: 'http://localhost:5000'
      };
      expect(_getFinalTarget(auth, 'host', '/path', 'query=test')).to.eq(
        'http://localhost:5000/host/path?query=test'
      );
    });
  });
});
