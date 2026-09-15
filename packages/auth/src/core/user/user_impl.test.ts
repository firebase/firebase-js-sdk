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

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { makeJWT } from '../../../test/helpers/jwt';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { StsTokenManager } from './token_manager';
import { UserImpl } from './user_impl';
describe('core/user/user_impl', () => {
  let auth: TestAuth;
  let stsTokenManager: StsTokenManager;

  beforeEach(async () => {
    auth = await testAuth();
    fetch.setUp();
    stsTokenManager = new StsTokenManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetch.tearDown();
  });

  describe('.constructor', () => {
    it('attaches required fields', () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      expect(user.auth).toBe(auth);
      expect(user.uid).toBe('uid');
    });

    it('attaches optional fields if provided', () => {
      const user = new UserImpl({
        uid: 'uid',
        auth,
        stsTokenManager,
        displayName: 'displayName',
        email: 'email',
        emailVerified: true,
        phoneNumber: 'phoneNumber',
        photoURL: 'photoURL'
      });

      expect(user.displayName).toBe('displayName');
      expect(user.email).toBe('email');
      expect(user.phoneNumber).toBe('phoneNumber');
      expect(user.photoURL).toBe('photoURL');
      expect(user.emailVerified).toBe(true);
    });

    it('sets optional fields to null if not provided', () => {
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      expect(user.displayName).toBe(null);
      expect(user.email).toBe(null);
      expect(user.phoneNumber).toBe(null);
      expect(user.photoURL).toBe(null);
      expect(user.emailVerified).toBe(false);
    });
  });

  describe('#getIdToken', () => {
    it('returns the raw token if refresh tokens are in order', async () => {
      stsTokenManager.updateFromServerResponse({
        idToken: 'id-token-string',
        refreshToken: 'refresh-token-string',
        expiresIn: '100000'
      } as IdTokenResponse);

      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      const token = await user.getIdToken();
      expect(token).toBe('id-token-string');
      expect(user.refreshToken).toBe('refresh-token-string');
    });
  });

  describe('#getIdTokenResult', () => {
    // Smoke test; comprehensive tests in id_token_result.test.ts
    it('calls through to getIdTokenResult', async () => {
      const token = {
        'iat': String(new Date('May 1, 2020').getTime() / 1000),
        'auth_time': String(new Date('May 2, 2020').getTime() / 1000),
        'exp': String(new Date('May 3, 2020').getTime() / 1000)
      };

      const jwt = makeJWT(token);

      stsTokenManager.updateFromServerResponse({
        idToken: jwt,
        refreshToken: 'refresh-token-string',
        expiresIn: '100000'
      } as IdTokenResponse);

      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      const tokenResult = await user.getIdTokenResult();
      expect(tokenResult).toEqual({
        issuedAtTime: new Date('May 1, 2020').toUTCString(),
        authTime: new Date('May 2, 2020').toUTCString(),
        expirationTime: new Date('May 3, 2020').toUTCString(),
        token: jwt,
        claims: token,
        signInProvider: null,
        signInSecondFactor: null
      });
    });
  });

  describe('#delete', () => {
    it('calls delete endpoint', async () => {
      stsTokenManager.updateFromServerResponse({
        idToken: 'id-token',
        refreshToken: 'refresh-token-string',
        expiresIn: '100000'
      } as IdTokenResponse);
      const user = new UserImpl({ uid: 'uid', auth, stsTokenManager });
      const endpoint = mockEndpoint(Endpoint.DELETE_ACCOUNT, {});
      const signOut = vi.spyOn(auth, 'signOut');

      await user.delete();
      expect(endpoint.calls[0].request).toEqual({
        idToken: 'id-token'
      });
      expect(signOut).toHaveBeenCalled();
      expect(stsTokenManager.refreshToken).toBeNull();
    });
  });

  describe('.fromJSON', () => {
    const errorString =
      'Firebase: An internal AuthError has occurred. (auth/internal-error).';

    it('throws an error if uid is not present', () => {
      expect(() => UserImpl._fromJSON(auth, { name: 'foo' })).toThrow(
        FirebaseError,
        errorString
      );
    });

    it('throws if a key is not undefined or string', () => {
      expect(() =>
        UserImpl._fromJSON(auth, { uid: 'foo', displayName: 3 })
      ).toThrow(FirebaseError, errorString);
    });

    it('fills out a user object properly', () => {
      const params = {
        uid: 'uid',
        stsTokenManager: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expirationTime: 3
        },
        displayName: 'name',
        email: 'email',
        phoneNumber: 'number',
        photoURL: 'photo',
        emailVerified: false,
        isAnonymous: false
      };

      const user = UserImpl._fromJSON(auth, params);
      expect(user.uid).toBe(params.uid);
      expect(user.displayName).toBe(params.displayName);
      expect(user.email).toBe(params.email);
      expect(user.phoneNumber).toBe(params.phoneNumber);
      expect(user.photoURL).toBe(params.photoURL);
    });
  });

  describe('fromIdTokenResponse', () => {
    const idTokenResponse: IdTokenResponse = {
      idToken: 'my-id-token',
      refreshToken: 'my-refresh-token',
      expiresIn: '1234',
      localId: 'local-id',
      kind: IdTokenResponseKind.CreateAuthUri
    };

    const serverUser: APIUserInfo = {
      localId: 'local-id',
      displayName: 'display-name',
      photoUrl: 'photo-url',
      email: 'email',
      emailVerified: true,
      phoneNumber: 'phone-number',
      tenantId: 'tenant-id',
      createdAt: 123,
      lastLoginAt: 456
    };

    beforeEach(() => {
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [serverUser]
      });
    });

    it('should initialize a user', async () => {
      const user = await UserImpl._fromIdTokenResponse(auth, idTokenResponse);
      expect(user.uid).toBe(idTokenResponse.localId);
      expect(await user.getIdToken()).toBe('my-id-token');
      expect(user.refreshToken).toBe('my-refresh-token');
    });

    it('should pull additional user info on the user', async () => {
      const user = await UserImpl._fromIdTokenResponse(auth, idTokenResponse);
      expect(user.displayName).toBe('display-name');
      expect(user.phoneNumber).toBe('phone-number');
    });

    it('should not trigger additional callbacks', async () => {
      const cb = vi.fn();
      auth.onAuthStateChanged(cb);
      await auth._updateCurrentUser(null);
      cb.mockClear();

      await UserImpl._fromIdTokenResponse(auth, idTokenResponse);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('_clone', () => {
    it('copies the user to a new object', async () => {
      const stsTokenManager = Object.assign(new StsTokenManager(), {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expirationTime: 3
      });

      const user = new UserImpl({
        auth,
        uid: 'uid',
        stsTokenManager,
        displayName: 'name',
        email: 'email',
        phoneNumber: 'number',
        photoURL: 'photo',
        emailVerified: false,
        isAnonymous: true,
        providerData: [
          {
            providerId: 'password',
            displayName: null,
            photoURL: null,
            email: 'test@foo.test',
            phoneNumber: null,
            uid: 'i-am-uid'
          }
        ],
        tenantId: 'tenant-id',
        createdAt: '2018-01-01 13:02:56.12345678',
        lastLoginAt: '2018-01-05 13:02:56.12345678'
      });

      const newAuth = await testAuth();
      const copy = user._clone(newAuth);
      expect(copy).not.toBe(user);
      expect(copy.stsTokenManager).not.toBe(user.stsTokenManager);
      expect(copy.toJSON()).toEqual(user.toJSON());
      expect(copy.auth).toBe(newAuth);
      expect(copy.tenantId).toBe('tenant-id');
      expect(copy.providerData).toEqual([
        {
          providerId: 'password',
          displayName: null,
          photoURL: null,
          email: 'test@foo.test',
          phoneNumber: null,
          uid: 'i-am-uid'
        }
      ]);
      expect(copy.metadata.toJSON()).toEqual(user.metadata.toJSON());
    });
  });
});
