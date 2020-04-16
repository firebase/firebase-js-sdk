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

import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { SinonStub, stub, useFakeTimers } from 'sinon';
import {
  DEFAULT_API_TIMEOUT_MS,
  Endpoint,
  HttpMethod,
  performApiRequest
} from '.';
import { mockEndpoint } from '../../test/api/helper';
import { mockAuth } from '../../test/mock_auth';
import * as mockFetch from '../../test/mock_fetch';
import { ServerError } from './errors';
import { AuthErrorCode } from '../core/errors';

use(chaiAsPromised);

describe('performApiRequest', () => {
  const request = {
    requestKey: 'request-value'
  };

  const serverResponse = {
    responseKey: 'response-value'
  };

  context('with regular requests', () => {
    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should set the correct request, method and HTTP Headers', async () => {
      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      const response = await performApiRequest<
        typeof request,
        typeof serverResponse
      >(mockAuth, HttpMethod.POST, Endpoint.SIGN_UP, request);
      expect(response).to.eql(serverResponse);
      expect(mock.calls.length).to.eq(1);
      expect(mock.calls[0].method).to.eq(HttpMethod.POST);
      expect(mock.calls[0].request).to.eql(request);
      expect(mock.calls[0].headers).to.eql({
        'Content-Type': 'application/json',
        'X-Client-Version': 'testSDK/0.0.0'
      });
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
      const promise = performApiRequest<typeof request, typeof serverResponse>(
        mockAuth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The email address is already in use by another account. (auth/email-already-in-use).'
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
      const promise = performApiRequest<typeof request, typeof serverResponse>(
        mockAuth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'Firebase: An internal AuthError has occurred. (auth/internal-error).'
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
      const promise = performApiRequest<typeof request, typeof serverResponse>(
        mockAuth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request,
        {
          [ServerError.EMAIL_EXISTS]: AuthErrorCode.ARGUMENT_ERROR
        }
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'Firebase: Error (auth/argument-error).'
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
      const promise = performApiRequest<typeof request, never>(
        mockAuth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      clock.tick(DEFAULT_API_TIMEOUT_MS + 1);
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The operation has timed out. (auth/timeout).'
      );
      clock.restore();
    });

    it('should handle network failure', async () => {
      fetchStub.callsFake(() => {
        return new Promise<never>((_, reject) =>
          reject(new Error('network error'))
        );
      });
      const promise = performApiRequest<typeof request, never>(
        mockAuth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'Firebase: A network AuthError (such as timeout]: interrupted connection or unreachable host) has occurred. (auth/network-request-failed).'
      );
    });
  });
});
