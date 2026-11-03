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

import { OperationType, ProviderId } from '../../model/enums';

import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import {
  _fromIdTokenResponse,
  getAdditionalUserInfo
} from './additional_user_info';
import { base64Encode } from '@firebase/util';
import { UserCredentialImpl } from './user_credential_impl';
import { AuthInternal } from '../../model/auth';
import { UserInternal, UserCredentialInternal } from '../../model/user';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { makeJWT } from '../../../test/helpers/jwt';

describe('core/user/additional_user_info', () => {
  const userProfileWithLogin: Record<string, unknown> = {
    login: 'scott',
    friends: [],
    netWorth: 5.0
  };
  const rawUserInfoWithLogin = JSON.stringify(userProfileWithLogin);
  const userProfileNoLogin: Record<string, unknown> = { sample: 'data' };
  const rawUserInfoNoLogin = JSON.stringify(userProfileNoLogin);
  describe('_fromIdTokenResponse', () => {
    describe('parses federated IDP response tokens', () => {
      it('for FacebookAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          rawUserInfo: rawUserInfoWithLogin
        });
        const { isNewUser, providerId, username, profile } =
          _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).toBe(false);
        expect(providerId).toBe(ProviderId.FACEBOOK);
        expect(username).toBeUndefined();
        expect(profile).toEqual(userProfileWithLogin);
      });

      it('for GithubAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.GITHUB,
          rawUserInfo: rawUserInfoWithLogin
        });
        const { isNewUser, providerId, username, profile } =
          _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).toBe(false);
        expect(providerId).toBe(ProviderId.GITHUB);
        expect(username).toBe('scott');
        expect(profile).toEqual(userProfileWithLogin);
      });

      it('for GoogleAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.GOOGLE,
          rawUserInfo: rawUserInfoWithLogin
        });
        const { isNewUser, providerId, username, profile } =
          _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).toBe(false);
        expect(providerId).toBe(ProviderId.GOOGLE);
        expect(username).toBeUndefined();
        expect(profile).toEqual(userProfileWithLogin);
      });

      it('for TwitterAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.TWITTER,
          rawUserInfo: rawUserInfoNoLogin,
          screenName: 'scott'
        });
        const { isNewUser, providerId, username, profile } =
          _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).toBe(false);
        expect(providerId).toBe(ProviderId.TWITTER);
        expect(username).toBe('scott');
        expect(profile).toEqual(userProfileNoLogin);
      });
    });

    describe('parses profile data', () => {
      it('for valid JSON', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          rawUserInfo: rawUserInfoWithLogin
        });
        expect(_fromIdTokenResponse(idResponse)!.profile).toEqual(
          userProfileWithLogin
        );
      });

      it('for missing JSON', () => {
        const idResponse = idTokenResponse({ providerId: ProviderId.FACEBOOK });
        expect(_fromIdTokenResponse(idResponse)!.profile).toEqual({});
      });
    });

    describe('determines new-user status', () => {
      it('for new users by token response', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          isNewUser: true
        });
        expect(_fromIdTokenResponse(idResponse)!.isNewUser).toBe(true);
      });

      it('for new users by toolkit response kind', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          kind: IdTokenResponseKind.SignupNewUser
        });
        expect(_fromIdTokenResponse(idResponse)!.isNewUser).toBe(true);
      });

      it('for old users', () => {
        const idResponse = idTokenResponse({ providerId: ProviderId.FACEBOOK });
        expect(_fromIdTokenResponse(idResponse)!.isNewUser).toBe(false);
      });
    });

    describe('creates generic AdditionalUserInfo', () => {
      it('for custom auth', () => {
        const idResponse = idTokenResponse({
          rawUserInfo: rawUserInfoWithLogin,
          idToken: makeJWT({
            firebase: {
              'sign_in_provider': 'custom'
            }
          })
        });
        const { isNewUser, providerId, username, profile } =
          _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).toBe(false);
        expect(providerId).toBeNull();
        expect(username).toBeUndefined();
        expect(profile).toBe(profile);
      });

      it('for anonymous auth', () => {
        const idResponse = idTokenResponse({
          rawUserInfo: rawUserInfoWithLogin,
          idToken: makeJWT({
            firebase: {
              'sign_in_provider': 'anonymous'
            }
          })
        });
        const { isNewUser, providerId, username, profile } =
          _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).toBe(false);
        expect(providerId).toBeNull();
        expect(username).toBeUndefined();
        expect(profile).toBe(profile);
      });

      it('for missing provider IDs in response but not in token', () => {
        const idToken =
          'algorithm.' +
          base64Encode(
            JSON.stringify({
              'firebase': { 'sign_in_provider': 'facebook.com' }
            })
          ) +
          '.signature';
        const { isNewUser, providerId, username, profile } =
          _fromIdTokenResponse(
            idTokenResponse({ rawUserInfo: rawUserInfoWithLogin, idToken })
          )!;
        expect(isNewUser).toBe(false);
        expect(providerId).toBe(ProviderId.FACEBOOK);
        expect(username).toBeUndefined();
        expect(profile).toBe(profile);
      });
    });

    describe('returns null', () => {
      it('for missing provider IDs', () => {
        const idResponse = idTokenResponse({});
        expect(_fromIdTokenResponse(idResponse)).toBeNull();
      });
    });
  });

  describe('getAdditionalUserInfo()', () => {
    let auth: AuthInternal;
    let user: UserInternal;
    let cred: UserCredentialInternal;
    beforeEach(async () => {
      auth = await testAuth();
      user = testUser(auth, 'uid');
      cred = new UserCredentialImpl({
        user,
        providerId: null,
        operationType: OperationType.SIGN_IN
      });
    });

    it('calls through to _fromIdTokenResponse', () => {
      cred._tokenResponse = idTokenResponse({
        providerId: ProviderId.ANONYMOUS,
        rawUserInfo: rawUserInfoWithLogin
      });
      const { isNewUser, providerId, username, profile } =
        getAdditionalUserInfo(cred)!;
      expect(isNewUser).toBe(false);
      expect(providerId).toBeNull();
      expect(username).toBeUndefined();
      expect(profile).toBe(profile);
    });

    it('calls through to _fromIdTokenResponse preserving isNewUser', () => {
      cred._tokenResponse = idTokenResponse({
        providerId: ProviderId.ANONYMOUS,
        rawUserInfo: rawUserInfoWithLogin,
        isNewUser: true
      });
      const { isNewUser, providerId, username, profile } =
        getAdditionalUserInfo(cred)!;
      expect(isNewUser).toBe(true);
      expect(providerId).toBeNull();
      expect(username).toBeUndefined();
      expect(profile).toBe(profile);
    });

    it('returns bespoke info if existing anonymous user', () => {
      // Note that _tokenResponse is not set on cred
      (user as unknown as Record<string, unknown>).isAnonymous = true;
      const { isNewUser, providerId, profile } = getAdditionalUserInfo(cred)!;
      expect(isNewUser).toBe(false);
      expect(providerId).toBeNull();
      expect(profile).toBe(profile);
    });

    it('returns null if not anonymous', () => {
      // Note that _tokenResponse is not set on cred
      expect(getAdditionalUserInfo(cred)).toBeNull();
    });
  });
});

function idTokenResponse(partial: Partial<IdTokenResponse>): IdTokenResponse {
  return {
    idToken: 'id-token',
    refreshToken: 'refresh-token',
    expiresIn: 'expires-in',
    localId: 'local-id',
    kind: IdTokenResponseKind.CreateAuthUri,
    ...partial
  };
}
