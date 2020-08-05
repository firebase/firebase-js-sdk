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
import * as sinon from 'sinon';

import { FirebaseError } from '@firebase/util';

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { _ENDPOINT } from '../../api/authentication/token';
import { IdTokenResponse } from '../../model/id_token';
import { StsTokenManager, TOKEN_REFRESH_BUFFER_MS } from './token_manager';

use(chaiAsPromised);

describe('core/user/token_manager', () => {
  let stsTokenManager: StsTokenManager;
  let now: number;
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    stsTokenManager = new StsTokenManager();
    now = Date.now();
    sinon.stub(Date, 'now').returns(now);
  });

  beforeEach(fetch.setUp);
  afterEach(fetch.tearDown);
  afterEach(() => sinon.restore());

  describe('#isExpired', () => {
    it('is true if past expiration time', () => {
      stsTokenManager.expirationTime = 1; // Ancient history
      expect(stsTokenManager.isExpired).to.eq(true);
    });

    it('is true if exp is in future but within buffer', () => {
      stsTokenManager.expirationTime = now + (TOKEN_REFRESH_BUFFER_MS - 10);
      expect(stsTokenManager.isExpired).to.eq(true);
    });

    it('is fals if exp is far enough in future', () => {
      stsTokenManager.expirationTime = now + (TOKEN_REFRESH_BUFFER_MS + 10);
      expect(stsTokenManager.isExpired).to.eq(false);
    });
  });

  describe('#updateFromServerResponse', () => {
    it('sets all the fields correctly', () => {
      stsTokenManager.updateFromServerResponse({
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '60' // From the server this is 30s
      } as IdTokenResponse);

      expect(stsTokenManager.expirationTime).to.eq(now + 60_000);
      expect(stsTokenManager.accessToken).to.eq('id-token');
      expect(stsTokenManager.refreshToken).to.eq('refresh-token');
    });
  });

  describe('#clearRefreshToken', () => {
    it('sets refresh token to null', () => {
      stsTokenManager.refreshToken = 'refresh-token';
      stsTokenManager.clearRefreshToken();
      expect(stsTokenManager.refreshToken).to.be.null;
    });
  });

  describe('#getToken', () => {
    context('with endpoint setup', () => {
      let mock: fetch.Route;
      beforeEach(() => {
        const { apiKey, tokenApiHost, apiScheme } = auth.config;
        const endpoint = `${apiScheme}://${tokenApiHost}/${_ENDPOINT}?key=${apiKey}`;
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
        expect(mock.calls[0].request).to.contain('old-refresh-token');
        expect(stsTokenManager.accessToken).to.eq('new-access-token');
        expect(stsTokenManager.refreshToken).to.eq('new-refresh-token');
        expect(stsTokenManager.expirationTime).to.eq(now + 3_600_000);

        expect(tokens).to.eql({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          wasRefreshed: true
        });
      });

      it('refreshes the token if token is expired', async () => {
        Object.assign(stsTokenManager, {
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
          expirationTime: now - 1
        });

        const tokens = await stsTokenManager.getToken(auth, false);
        expect(mock.calls[0].request).to.contain('old-refresh-token');
        expect(stsTokenManager.accessToken).to.eq('new-access-token');
        expect(stsTokenManager.refreshToken).to.eq('new-refresh-token');
        expect(stsTokenManager.expirationTime).to.eq(now + 3_600_000);

        expect(tokens).to.eql({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          wasRefreshed: true
        });
      });
    });

    it('returns null if the refresh token is missing', async () => {
      expect(await stsTokenManager.getToken(auth)).to.be.null;
    });

    it('throws an error if expired but refresh token is missing', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'old-access-token',
        expirationTime: now - 1
      });

      await expect(stsTokenManager.getToken(auth)).to.be.rejectedWith(
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
      expect(tokens).to.eql({
        accessToken: 'token',
        refreshToken: 'refresh',
        wasRefreshed: false
      });
    });
  });

  describe('.fromPlainObject', () => {
    const errorString =
      'Firebase: An internal AuthError has occurred. (auth/internal-error).';

    it('throws if refresh token is not a string', () => {
      expect(() =>
        StsTokenManager.fromPlainObject('app', {
          refreshToken: 45,
          accessToken: 't',
          expirationTime: 3
        })
      ).to.throw(FirebaseError, errorString);
    });

    it('throws if access token is not a string', () => {
      expect(() =>
        StsTokenManager.fromPlainObject('app', {
          refreshToken: 't',
          accessToken: 45,
          expirationTime: 3
        })
      ).to.throw(FirebaseError, errorString);
    });

    it('throws if expiration time is not a number', () => {
      expect(() =>
        StsTokenManager.fromPlainObject('app', {
          refreshToken: 't',
          accessToken: 't',
          expirationTime: 'lol'
        })
      ).to.throw(FirebaseError, errorString);
    });

    it('builds an object correctly', () => {
      const manager = StsTokenManager.fromPlainObject('app', {
        refreshToken: 'r',
        accessToken: 'a',
        expirationTime: 45
      });
      expect(manager.accessToken).to.eq('a');
      expect(manager.refreshToken).to.eq('r');
      expect(manager.expirationTime).to.eq(45);
    });
  });
});
