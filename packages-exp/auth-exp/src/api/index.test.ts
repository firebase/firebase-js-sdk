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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { SinonStub, stub, useFakeTimers } from 'sinon';

import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../test/api/helper';
import { testAuth } from '../../test/mock_auth';
import * as mockFetch from '../../test/mock_fetch';
import { AuthErrorCode } from '../core/errors';
import { Auth } from '../model/auth';
import {
  _performApiRequest,
  DEFAULT_API_TIMEOUT_MS,
  Endpoint,
  HttpMethod,
  HttpHeader
} from './';
import { ServerError } from './errors';

use(chaiAsPromised);

describe('api/_performApiRequest', () => {
  const request = {
    requestKey: 'request-value'
  };

  const serverResponse = {
    responseKey: 'response-value'
  };

  let auth: Auth;

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
        'auth/internal-error'
      );
      expect(mock.calls[0].request).to.eql(request);
    });

    it('should support custom error handling per endpoint', async () => {
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
        request,
        {
          [ServerError.EMAIL_EXISTS]: AuthErrorCode.ARGUMENT_ERROR
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
    let fetchStub: SinonStub;

    beforeEach(() => {
      fetchStub = stub(self, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should handle timeouts', async () => {
      const clock = useFakeTimers();
      fetchStub.callsFake(() => {
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

    it('should handle network failure', async () => {
      fetchStub.callsFake(() => {
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
});
