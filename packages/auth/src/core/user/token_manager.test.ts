/**
 * @license
 * Copyright 2026 Google LLC
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

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { IdTokenResponse } from '../../model/id_token';
import { StsTokenManager, Buffer } from './token_manager';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { makeJWT } from '../../../test/helpers/jwt';
import { Endpoint } from '../../api';
describe('core/user/token_manager', () => {
  let stsTokenManager: StsTokenManager;
  let now: number;
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    stsTokenManager = new StsTokenManager();
    now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  beforeEach(fetch.setUp);
  afterEach(fetch.tearDown);
  afterEach(() => vi.restoreAllMocks());

  describe('#isExpired', () => {
    it('is true if past expiration time', () => {
      stsTokenManager.expirationTime = 1; // Ancient history
      expect(stsTokenManager.isExpired).toBe(true);
    });

    it('is true if exp is in future but within buffer', () => {
      stsTokenManager.expirationTime = now + (Buffer.TOKEN_REFRESH - 10);
      expect(stsTokenManager.isExpired).toBe(true);
    });

    it('is false if exp is far enough in future', () => {
      stsTokenManager.expirationTime = now + (Buffer.TOKEN_REFRESH + 10);
      expect(stsTokenManager.isExpired).toBe(false);
    });
  });

  describe('#updateFromServerResponse', () => {
    it('sets all the fields correctly', () => {
      stsTokenManager.updateFromServerResponse({
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '60' // From the server this is 30s
      } as IdTokenResponse);

      expect(stsTokenManager.expirationTime).toBe(now + 60_000);
      expect(stsTokenManager.accessToken).toBe('id-token');
      expect(stsTokenManager.refreshToken).toBe('refresh-token');
    });

    it('falls back to exp and iat when expiresIn is omitted (ie: MFA)', () => {
      const idToken = makeJWT({ 'exp': '180', 'iat': '120' });
      stsTokenManager.updateFromServerResponse({
        idToken,
        refreshToken: 'refresh-token'
      } as FinalizeMfaResponse);

      expect(stsTokenManager.expirationTime).toBe(now + 60_000);
      expect(stsTokenManager.accessToken).toBe(idToken);
      expect(stsTokenManager.refreshToken).toBe('refresh-token');
    });
  });

  describe('#clearRefreshToken', () => {
    it('sets refresh token to null', () => {
      stsTokenManager.refreshToken = 'refresh-token';
      stsTokenManager.clearRefreshToken();
      expect(stsTokenManager.refreshToken).toBeNull();
    });
  });

  describe('#getToken', () => {
    describe('with endpoint setup', () => {
      let mock: fetch.Route;
      beforeEach(() => {
        const { apiKey, tokenApiHost, apiScheme } = auth.config;
        const endpoint = `${apiScheme}://${tokenApiHost}${Endpoint.TOKEN}?key=${apiKey}`;
        mock = fetch.mock(endpoint, {
          'access_token': 'new-access-token',
          'refresh_token': 'new-refresh-token',
          'expires_in': '3600'
        });
      });

      it('refreshes the token if forceRefresh is true', async () => {
        Object.assign(stsTokenManager, {
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
          expirationTime: now + 100_000
        });

        const tokens = await stsTokenManager.getToken(auth, true);
        expect(mock.calls[0].request).toContain('old-refresh-token');
        expect(stsTokenManager.accessToken).toBe('new-access-token');
        expect(stsTokenManager.refreshToken).toBe('new-refresh-token');
        expect(stsTokenManager.expirationTime).toBe(now + 3_600_000);

        expect(tokens).toEqual('new-access-token');
      });

      it('refreshes the token if token is expired', async () => {
        Object.assign(stsTokenManager, {
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
          expirationTime: now - 1
        });

        const tokens = await stsTokenManager.getToken(auth, false);
        expect(mock.calls[0].request).toContain('old-refresh-token');
        expect(stsTokenManager.accessToken).toBe('new-access-token');
        expect(stsTokenManager.refreshToken).toBe('new-refresh-token');
        expect(stsTokenManager.expirationTime).toBe(now + 3_600_000);

        expect(tokens).toEqual('new-access-token');
      });
    });

    it('returns non-null if the refresh token is missing but token still valid', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'token',
        expirationTime: now + 100_000
      });
      const tokens = await stsTokenManager.getToken(auth, false);
      expect(tokens).toEqual('token');
    });

    it('throws an error if the refresh token is missing and force refresh is true', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'token',
        expirationTime: now + 100_000
      });
      await expect(stsTokenManager.getToken(auth, true)).rejects.toThrow(
        FirebaseError,
        "Firebase: The user's credential is no longer valid. The user must sign in again. (auth/user-token-expired)"
      );
    });

    it('throws an error if the refresh token is missing and token is no longer valid', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'old-access-token',
        expirationTime: now - 1
      });
      await expect(stsTokenManager.getToken(auth)).rejects.toThrow(
        FirebaseError,
        "Firebase: The user's credential is no longer valid. The user must sign in again. (auth/user-token-expired)"
      );
    });

    it('throws an error if expired but refresh token is missing', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'old-access-token',
        expirationTime: now - 1
      });

      await expect(stsTokenManager.getToken(auth)).rejects.toThrow(
        FirebaseError,
        "Firebase: The user's credential is no longer valid. The user must sign in again. (auth/user-token-expired)"
      );
    });

    it('returns access token if not expired, not refreshing', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'token',
        refreshToken: 'refresh',
        expirationTime: now + 100_000
      });

      const tokens = (await stsTokenManager.getToken(auth))!;
      expect(tokens).toEqual('token');
    });
  });

  describe('#_clone', () => {
    it('copies the manager to a new object', () => {
      Object.assign(stsTokenManager, {
        accessToken: 'token',
        refreshToken: 'refresh',
        expirationTime: now
      });

      const copy = stsTokenManager._clone();
      expect(copy).not.toBe(stsTokenManager);
      expect(copy.toJSON()).toEqual(stsTokenManager.toJSON());
    });
  });

  describe('.fromJSON', () => {
    const errorString = 'auth/internal-error';

    it('throws if refresh token is not a string', () => {
      expect(() =>
        StsTokenManager.fromJSON('app', {
          refreshToken: 45,
          accessToken: 't',
          expirationTime: 3
        })
      ).toThrow(FirebaseError, errorString);
    });

    it('throws if access token is not a string', () => {
      expect(() =>
        StsTokenManager.fromJSON('app', {
          refreshToken: 't',
          accessToken: 45,
          expirationTime: 3
        })
      ).toThrow(FirebaseError, errorString);
    });

    it('throws if expiration time is not a number', () => {
      expect(() =>
        StsTokenManager.fromJSON('app', {
          refreshToken: 't',
          accessToken: 't',
          expirationTime: 'lol'
        })
      ).toThrow(FirebaseError, errorString);
    });

    it('builds an object correctly', () => {
      const manager = StsTokenManager.fromJSON('app', {
        refreshToken: 'r',
        accessToken: 'a',
        expirationTime: 45
      });
      expect(manager.accessToken).toBe('a');
      expect(manager.refreshToken).toBe('r');
      expect(manager.expirationTime).toBe(45);
    });
  });
});
