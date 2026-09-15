/**
 * @license
 * Copyright 2019 Google LLC
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

import '../testing/setup';

import {
  ApiRequestBody,
  FID_REGISTRATION_FETCH_BASE_BACKOFF_MS,
  FID_REGISTRATION_FETCH_MAX_ATTEMPTS,
  getRegistrationOrigin,
  requestCreateRegistration,
  requestDeleteRegistration,
  requestDeleteToken,
  requestGetToken,
  requestUpdateToken
} from './requests';

import { ENDPOINT } from '../util/constants';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { TokenDetails } from '../interfaces/registration-details';
import { compareHeaders } from '../testing/compare-headers';
import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  vi,
  type MockInstance
} from 'vitest';
import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { version as fcmSdkVersion } from '../../package.json';

describe('API', () => {
  let tokenDetails: TokenDetails;
  let firebaseDependencies: FirebaseInternalDependencies;
  let fetchSpy: MockInstance;

  beforeEach(() => {
    tokenDetails = getFakeTokenDetails();
    firebaseDependencies = getFakeFirebaseDependencies();
    fetchSpy = vi.spyOn(self, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getToken', () => {
    it('calls the createRegistration server API with correct parameters', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ token: 'fcm-token-from-server' }))
      );

      const response = await requestGetToken(
        firebaseDependencies,
        tokenDetails.subscriptionOptions!
      );

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': 'apiKey',
        'x-goog-firebase-installations-auth': `FIS authToken`
      });
      const expectedBody: ApiRequestBody = {
        web: {
          origin: getRegistrationOrigin(
            tokenDetails.subscriptionOptions!.swScope,
            firebaseDependencies.appConfig.appName
          ),
          endpoint: 'https://example.org',
          auth: 'YXV0aC12YWx1ZQ',
          p256dh: 'cDI1Ni12YWx1ZQ',
          applicationPubKey: 'dmFwaWQta2V5LXZhbHVl'
        }
      };
      const expectedRequest: RequestInit = {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify(expectedBody)
      };
      const expectedEndpoint = `${ENDPOINT}/projects/projectId/registrations`;

      expect(response).toBe('fcm-token-from-server');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(expectedEndpoint, expectedRequest);
      // TODO: expect fis.getToken to be called. There is some issue w/ stubbing the fis module.
      const actualHeaders = fetchSpy.mock.calls[0][1]?.headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });

    it('does not include fcm_sdk_version in legacy createToken request payload', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ token: 'fcm-token-from-server' }))
      );

      await requestGetToken(
        firebaseDependencies,
        tokenDetails.subscriptionOptions!
      );

      const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(requestInit.body as string) as Record<
        string,
        unknown
      >;

      expect(body).not.toHaveProperty('fcm_sdk_version');
    });

    it('throws if there is a problem with the response', async () => {
      fetchSpy.mockRejectedValue(new Error('Fetch failed'));
      await expect(
        requestGetToken(firebaseDependencies, tokenDetails.subscriptionOptions!)
      ).rejects.toThrow('Fetch failed');

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'error message' } }))
      );
      await expect(
        requestGetToken(firebaseDependencies, tokenDetails.subscriptionOptions!)
      ).rejects.toThrow('messaging/token-subscribe-failed');

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({/* no token */}))
      );
      await expect(
        requestGetToken(firebaseDependencies, tokenDetails.subscriptionOptions!)
      ).rejects.toThrow('messaging/token-subscribe-no-token');
    });
  });

  describe('createRegistration', () => {
    function stubSetTimeoutImmediate(): void {
      vi.spyOn(self, 'setTimeout').mockImplementation(
        (handler: TimerHandler, _timeout?: number) => {
          if (typeof handler === 'function') {
            handler();
          }
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }
      );
    }

    const registrationResourceName = (fid: string): string =>
      `projects/projectId/registrations/${fid}`;

    it('calls fetch once when the first attempt succeeds', async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            name: registrationResourceName('installation-fid-1')
          }),
          {
            status: 200
          }
        )
      );

      await requestCreateRegistration(
        firebaseDependencies,
        tokenDetails.subscriptionOptions!
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('includes fcm_sdk_version in the CreateRegistration request payload', async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            name: registrationResourceName('installation-fid-1')
          }),
          { status: 200 }
        )
      );

      await requestCreateRegistration(
        firebaseDependencies,
        tokenDetails.subscriptionOptions!
      );

      const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(requestInit.body as string) as ApiRequestBody;

      expect(body.fcm_sdk_version).toBe(fcmSdkVersion);
    });

    it('returns responseFid when the success body includes a registration resource name', async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            name: registrationResourceName('installation-fid-1')
          }),
          {
            status: 200
          }
        )
      );

      const result = await requestCreateRegistration(
        firebaseDependencies,
        tokenDetails.subscriptionOptions!
      );

      expect(result).toEqual({ responseFid: 'installation-fid-1' });
    });

    it('rejects when name is not a valid registration resource name (no slash)', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ name: 'installation-fid-invalid' }), {
          status: 200
        })
      );

      await expect(
        requestCreateRegistration(
          firebaseDependencies,
          tokenDetails.subscriptionOptions!
        )
      ).rejects.toThrow('messaging/fid-registration-failed');
    });

    it('rejects when the success body is empty', async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));

      await expect(
        requestCreateRegistration(
          firebaseDependencies,
          tokenDetails.subscriptionOptions!
        )
      ).rejects.toThrow('messaging/fid-registration-failed');
    });

    it('retries fetch on thrown errors with exponential backoff then succeeds', async () => {
      const delays: number[] = [];
      vi.spyOn(self, 'setTimeout').mockImplementation(
        (handler: TimerHandler, timeout?: number) => {
          delays.push(timeout ?? 0);
          if (typeof handler === 'function') {
            handler();
          }
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }
      );
      fetchSpy
        .mockRejectedValueOnce(new Error('network 1'))
        .mockRejectedValueOnce(new Error('network 2'))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              name: registrationResourceName('installation-fid-1')
            }),
            {
              status: 200
            }
          )
        );

      await requestCreateRegistration(
        firebaseDependencies,
        tokenDetails.subscriptionOptions!
      );

      expect(fetchSpy).toHaveBeenCalledTimes(
        FID_REGISTRATION_FETCH_MAX_ATTEMPTS
      );
      expect(delays).toEqual([
        FID_REGISTRATION_FETCH_BASE_BACKOFF_MS,
        FID_REGISTRATION_FETCH_BASE_BACKOFF_MS * 2
      ]);
    });

    it('stops after max attempts when fetch keeps throwing', async () => {
      stubSetTimeoutImmediate();
      fetchSpy.mockRejectedValue(new Error('persistent network failure'));

      await expect(
        requestCreateRegistration(
          firebaseDependencies,
          tokenDetails.subscriptionOptions!
        )
      ).rejects.toThrow('messaging/fid-registration-failed');

      expect(fetchSpy).toHaveBeenCalledTimes(
        FID_REGISTRATION_FETCH_MAX_ATTEMPTS
      );
    });
  });

  describe('updateToken', () => {
    it('calls the updateRegistration server API with correct parameters', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ token: 'fcm-token-from-server' }))
      );

      const response = await requestUpdateToken(
        firebaseDependencies,
        tokenDetails
      );

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': 'apiKey',
        'x-goog-firebase-installations-auth': `FIS authToken`
      });
      const expectedBody: ApiRequestBody = {
        web: {
          origin: getRegistrationOrigin(
            tokenDetails.subscriptionOptions!.swScope,
            firebaseDependencies.appConfig.appName
          ),
          endpoint: 'https://example.org',
          auth: 'YXV0aC12YWx1ZQ',
          p256dh: 'cDI1Ni12YWx1ZQ',
          applicationPubKey: 'dmFwaWQta2V5LXZhbHVl'
        }
      };
      const expectedRequest: RequestInit = {
        method: 'PATCH',
        headers: expectedHeaders,
        body: JSON.stringify(expectedBody)
      };
      const expectedEndpoint = `${ENDPOINT}/projects/projectId/registrations/token-value`;

      expect(response).toBe('fcm-token-from-server');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(expectedEndpoint, expectedRequest);
      const actualHeaders = fetchSpy.mock.calls[0][1]?.headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });

    it('does not include fcm_sdk_version in legacy updateToken request payload', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ token: 'fcm-token-from-server' }))
      );

      await requestUpdateToken(firebaseDependencies, tokenDetails);

      const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(requestInit.body as string) as Record<
        string,
        unknown
      >;

      expect(body).not.toHaveProperty('fcm_sdk_version');
    });

    it('throws if there is a problem with the response', async () => {
      fetchSpy.mockRejectedValue(new Error('Fetch failed'));
      await expect(
        requestUpdateToken(firebaseDependencies, tokenDetails)
      ).rejects.toThrow('Fetch failed');

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'error message' } }))
      );
      await expect(
        requestUpdateToken(firebaseDependencies, tokenDetails)
      ).rejects.toThrow('messaging/token-update-failed');

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({/* no token */}))
      );
      await expect(
        requestUpdateToken(firebaseDependencies, tokenDetails)
      ).rejects.toThrow('messaging/token-update-no-token');
    });
  });

  describe('deleteToken', () => {
    it('calls the deleteRegistration server API with correct parameters', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({})));

      const response = await requestDeleteToken(
        firebaseDependencies,
        tokenDetails.token
      );

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': 'apiKey',
        'x-goog-firebase-installations-auth': `FIS authToken`
      });
      const expectedRequest: RequestInit = {
        method: 'DELETE',
        headers: expectedHeaders
      };
      const expectedEndpoint = `${ENDPOINT}/projects/projectId/registrations/token-value`;

      expect(response).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(expectedEndpoint, expectedRequest);
      const actualHeaders = fetchSpy.mock.calls[0][1]?.headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });

    it('throws if there is a problem with the response', async () => {
      fetchSpy.mockRejectedValue(new Error('Fetch failed'));
      await expect(
        requestDeleteToken(firebaseDependencies, tokenDetails.token)
      ).rejects.toThrow('Fetch failed');

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'error message' } }))
      );
      await expect(
        requestDeleteToken(firebaseDependencies, tokenDetails.token)
      ).rejects.toThrow('messaging/token-unsubscribe-failed');
    });
  });

  describe('deleteRegistration (FID)', () => {
    it('calls the deleteRegistration server API with correct parameters', async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({})));

      const response = await requestDeleteRegistration(
        firebaseDependencies,
        'fid-value'
      );

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': 'apiKey',
        'x-goog-firebase-installations-auth': `FIS authToken`
      });
      const expectedRequest: RequestInit = {
        method: 'DELETE',
        headers: expectedHeaders
      };
      const expectedEndpoint = `${ENDPOINT}/projects/projectId/registrations/fid-value`;

      expect(response).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(expectedEndpoint, expectedRequest);
      const actualHeaders = fetchSpy.mock.calls[0][1]?.headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });

    it('throws if fetch fails or backend returns an error', async () => {
      fetchSpy.mockRejectedValue(new Error('Fetch failed'));
      await expect(
        requestDeleteRegistration(firebaseDependencies, 'fid-value')
      ).rejects.toThrow('messaging/fid-unregister-failed');

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'error message' } }), {
          status: 400
        })
      );
      await expect(
        requestDeleteRegistration(firebaseDependencies, 'fid-value')
      ).rejects.toThrow('messaging/fid-unregister-failed');
    });
  });
});
