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

import { FirebaseError, getUA } from '@firebase/util';
import * as utils from '@firebase/util';

vi.mock('@firebase/util', { spy: true });
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
  HttpMethod,
  _addTidIfNecessary
} from './';
import { ServerError } from './errors';
import { SDK_VERSION } from '@firebase/app';
import { _getBrowserName } from '../core/util/browser';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('with regular requests', () => {
    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should set the correct request, method and HTTP Headers', async () => {
      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      const response = await _performApiRequest<
        typeof request,
        typeof serverResponse
      >(auth, HttpMethod.POST, Endpoint.SIGN_UP, request);
      expect(response).toEqual(serverResponse);
      expect(mock.calls.length).toBe(1);
      expect(mock.calls[0].method).toBe(HttpMethod.POST);
      expect(mock.calls[0].request).toEqual(request);
      expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).toBe(
        'application/json'
      );
      expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
        'testSDK/0.0.0'
      );
      expect(mock.calls[0].fullRequest?.credentials).toBeUndefined();
    });

    it('should set credentials to "include" when using IDX and emulator', async () => {
      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      auth.emulatorConfig = {
        host: 'https://something.cloudworkstations.dev',
        protocol: '',
        port: 8,
        options: {
          disableWarnings: false
        }
      };
      await _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      expect(mock.calls[0].fullRequest?.credentials).toBe('include');
    });

    it('should set the device language if available', async () => {
      auth.languageCode = 'jp';
      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      const response = await _performApiRequest<
        typeof request,
        typeof serverResponse
      >(auth, HttpMethod.POST, Endpoint.SIGN_UP, request);
      expect(response).toEqual(serverResponse);
      expect(mock.calls[0].headers.get(HttpHeader.X_FIREBASE_LOCALE)).toBe(
        'jp'
      );
    });

    it('should include whatever headers the auth impl attaches', async () => {
      vi.spyOn(auth, '_getAdditionalHeaders').mockReturnValue(
        Promise.resolve({
          'look-at-me-im-a-header': 'header-value',
          'anotherheader': 'header-value-2'
        })
      );

      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      await _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      expect(mock.calls[0].headers.get('look-at-me-im-a-header')).toBe(
        'header-value'
      );
      expect(mock.calls[0].headers.get('anotherheader')).toBe('header-value-2');
    });

    it('should set the framework in clientVersion if logged', async () => {
      auth._logFramework('Mythical');
      const mock = mockEndpoint(Endpoint.SIGN_UP, serverResponse);
      const response = await _performApiRequest<
        typeof request,
        typeof serverResponse
      >(auth, HttpMethod.POST, Endpoint.SIGN_UP, request);
      expect(response).toEqual(serverResponse);
      expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
        `${_getBrowserName(getUA())}/JsCore/${SDK_VERSION}/Mythical`
      );

      // If a new framework is logged, the client version header should change as well.
      auth._logFramework('Magical');
      const response2 = await _performApiRequest<
        typeof request,
        typeof serverResponse
      >(auth, HttpMethod.POST, Endpoint.SIGN_UP, request);
      expect(response2).toEqual(serverResponse);
      expect(mock.calls[1].headers!.get(HttpHeader.X_CLIENT_VERSION)).toBe(
        `${_getBrowserName(getUA())}/JsCore/${SDK_VERSION}/Magical,Mythical`
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
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/email-already-in-use'
      );
      expect(mock.calls[0].request).toEqual(request);
    });

    it('should translate server success with errorMessage into auth error', async () => {
      const response = {
        errorMessage: ServerError.FEDERATED_USER_ID_ALREADY_LINKED,
        idToken: 'foo-bar'
      };
      const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_IDP, response, 200);
      const promise = _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_IN_WITH_IDP,
        request
      );
      let error: any;
      try {
        await promise;
        expect.unreachable();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(FirebaseError);
      expect(error.code).toBe('auth/credential-already-in-use');
      expect(error.customData).toEqual({
        appName: 'test-app',
        _tokenResponse: response
      });
      expect(mock.calls[0].request).toEqual(request);
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
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/invalid-phone-number'
      );
      expect(mock.calls[0].request).toEqual(request);
    });

    it('should pass through server messages if applicable', async () => {
      mockEndpoint(
        Endpoint.SIGN_UP,
        {
          error: {
            code: 400,
            message: `${ServerError.BLOCKING_FUNCTION_ERROR_RESPONSE} : Text text text`,
            errors: [
              {
                message: 'Text text text'
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
      await expect(promise).rejects.toThrow(FirebaseError, 'Text text text');
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
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/awesome-error'
      );
      expect(mock.calls[0].request).toEqual(request);
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
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/argument-error'
      );
      expect(mock.calls[0].request).toEqual(request);
    });
  });

  describe('referer policy exists on fetch request', () => {
    afterEach(mockFetch.tearDown);

    it('should have referrerPolicy set', async () => {
      let referrerPolicy: string | undefined = undefined;
      mockFetch.setUpWithOverride(
        (input: RequestInfo | URL, request?: RequestInit) => {
          if (request !== undefined) {
            referrerPolicy = request.referrerPolicy;
          }
          return Promise.resolve(new Response(JSON.stringify(serverResponse)));
        }
      );
      const promise = _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).resolves.toBeDefined();
      expect(referrerPolicy).toBe('strict-origin-when-cross-origin');
    });

    it('should not have referrerPolicy set on Cloudflare workers', async () => {
      vi.spyOn(utils, 'isCloudflareWorker').mockReturnValue(true);
      let referrerPolicySet: boolean = false;
      mockFetch.setUpWithOverride(
        (input: RequestInfo | URL, request?: RequestInit) => {
          if (request !== undefined && request.referrerPolicy !== undefined) {
            referrerPolicySet = true;
          }
          return Promise.resolve(new Response(JSON.stringify(serverResponse)));
        }
      );
      const promise = _performApiRequest<typeof request, typeof serverResponse>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await expect(promise).resolves.toBeDefined();
      expect(referrerPolicySet).toBe(false);
      vi.restoreAllMocks();
    });
  });

  describe('with network issues', () => {
    afterEach(mockFetch.tearDown);

    it('should handle timeouts', async () => {
      vi.useFakeTimers();
      mockFetch.setUpWithOverride(() => {
        return new Promise<never>(() => null);
      });
      const promise = _performApiRequest<typeof request, never>(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      vi.advanceTimersByTime(DEFAULT_API_TIMEOUT_MS.get() + 1);
      await expect(promise).rejects.toThrow('auth/network-request-failed');
      vi.useRealTimers();
    });

    it('should clear the network timeout on success', async () => {
      const spy = vi.spyOn(globalThis, 'clearTimeout');
      mockFetch.setUp();
      mockEndpoint(Endpoint.SIGN_UP, {});
      const promise = _performApiRequest(
        auth,
        HttpMethod.POST,
        Endpoint.SIGN_UP,
        request
      );
      await promise;
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
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
      let error: any;
      try {
        await promise;
        expect.unreachable();
      } catch (e) {
        error = e;
      }
      expect((error as FirebaseError).name).toBe('FirebaseError');
      expect(error.code).toBe('auth/network-request-failed');
      expect(error.customData?.message).toBe('Error: network error');
    });
  });

  describe('edge case error mapping', () => {
    beforeEach(mockFetch.setUp);
    afterEach(mockFetch.tearDown);

    it('should generate a need_confirmation error with the response', async () => {
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
        expect.fail('Call should have failed');
      } catch (e) {
        expect((e as FirebaseError).code).toBe(
          `auth/${AuthErrorCode.NEED_CONFIRMATION}`
        );
        expect((e as FirebaseError).customData!._tokenResponse).toEqual({
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
        expect.fail('Call should have failed');
      } catch (e) {
        expect((e as FirebaseError).code).toBe(
          `auth/${AuthErrorCode.CREDENTIAL_ALREADY_IN_USE}`
        );
        expect((e as FirebaseError).customData!._tokenResponse).toEqual(
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
        expect.fail('Call should have failed');
      } catch (e) {
        expect((e as FirebaseError).code).toBe(
          `auth/${AuthErrorCode.EMAIL_EXISTS}`
        );
        expect((e as FirebaseError).customData!.email).toBe('email@test.com');
        expect((e as FirebaseError).customData!.phoneNumber).toBe(
          '+1555-this-is-a-number'
        );
      }
    });
  });

  describe('_getFinalTarget', () => {
    it('works properly with a non-emulated environment', async () => {
      expect(await _getFinalTarget(auth, 'host', '/path', 'query=test')).toBe(
        'mock://host/path?query=test'
      );
    });

    it('works properly with an emulated environment', async () => {
      (auth.config as ConfigInternal).emulator = {
        url: 'http://localhost:5000/'
      };
      expect(await _getFinalTarget(auth, 'host', '/path', 'query=test')).toBe(
        'http://localhost:5000/host/path?query=test'
      );
    });
  });

  describe('_addTidIfNecessary', () => {
    it('adds the tenant ID if it is not already defined', () => {
      auth.tenantId = 'auth-tenant-id';
      expect(
        _addTidIfNecessary<Record<string, string>>(auth, { foo: 'bar' })
      ).toEqual({
        tenantId: 'auth-tenant-id',
        foo: 'bar'
      });
    });

    it('does not overwrite the tenant ID if already supplied', () => {
      auth.tenantId = 'auth-tenant-id';
      expect(
        _addTidIfNecessary<Record<string, string>>(auth, {
          foo: 'bar',
          tenantId: 'request-tenant-id'
        })
      ).toEqual({
        tenantId: 'request-tenant-id',
        foo: 'bar'
      });
    });

    it('leaves tenant id on the request even if not specified on auth', () => {
      auth.tenantId = null;
      expect(
        _addTidIfNecessary<Record<string, string>>(auth, {
          foo: 'bar',
          tenantId: 'request-tenant-id'
        })
      ).toEqual({
        tenantId: 'request-tenant-id',
        foo: 'bar'
      });
    });

    it('does not attach the tenant ID at all if not specified', () => {
      auth.tenantId = null;
      expect(_addTidIfNecessary<Record<string, string>>(auth, { foo: 'bar' }))
        .toEqual({
          foo: 'bar'
        })
        .and.not.have.property('tenantId');
    });
  });
});
