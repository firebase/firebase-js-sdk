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
import { createSandbox } from 'sinon';
import { IdTokenResponse } from '../../model/id_token';
import { StsTokenManager, TOKEN_REFRESH_BUFFER_MS } from './token_manager';
import { FirebaseError } from '@firebase/util';

use(chaiAsPromised);

const sandbox = createSandbox();

describe('core/user/token_manager', () => {
  let stsTokenManager: StsTokenManager;
  let now: number;

  beforeEach(() => {
    stsTokenManager = new StsTokenManager();
    now = Date.now();
    sandbox.stub(Date, 'now').returns(now);
  });

  afterEach(() => sandbox.restore());

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

  describe('#getToken', () => {
    it('throws if forceRefresh is true', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'token',
        expirationTime: now + 100_000
      });
      await expect(stsTokenManager.getToken(true)).to.be.rejectedWith(
        Error,
        'StsTokenManager: token refresh not implemented'
      );
    });

    it('throws if token is expired', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'token',
        expirationTime: now - 1
      });
      await expect(stsTokenManager.getToken()).to.be.rejectedWith(
        Error,
        'StsTokenManager: token refresh not implemented'
      );
    });

    it('throws if access token is missing', async () => {
      await expect(stsTokenManager.getToken()).to.be.rejectedWith(
        Error,
        'StsTokenManager: token refresh not implemented'
      );
    });

    it('returns access token if not expired, not refreshing', async () => {
      Object.assign(stsTokenManager, {
        accessToken: 'token',
        refreshToken: 'refresh',
        expirationTime: now + 100_000
      });

      const tokens = await stsTokenManager.getToken();
      expect(tokens.accessToken).to.eq('token');
      expect(tokens.refreshToken).to.eq('refresh');
    });
  });

  describe('fromPlainObject', () => {
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
