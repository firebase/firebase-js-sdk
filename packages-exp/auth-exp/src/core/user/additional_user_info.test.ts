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

import { expect } from 'chai';

import {
  OperationType,
  ProviderId,
  UserProfile
} from '@firebase/auth-types-exp';

import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import {
  _fromIdTokenResponse,
  getAdditionalUserInfo
} from './additional_user_info';
import { base64Encode } from '@firebase/util';
import { UserCredentialImpl } from './user_credential_impl';
import { Auth } from '../../model/auth';
import { User, UserCredential } from '../../model/user';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';

describe('core/user/additional_user_info', () => {
  const userProfileWithLogin: UserProfile = {
    login: 'scott',
    friends: [],
    netWorth: 5.0
  };
  const rawUserInfoWithLogin = JSON.stringify(userProfileWithLogin);
  const userProfileNoLogin: UserProfile = { sample: 'data' };
  const rawUserInfoNoLogin = JSON.stringify(userProfileNoLogin);
  describe('_fromIdTokenResponse', () => {
    describe('parses federated IDP response tokens', () => {
      it('for FacebookAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          rawUserInfo: rawUserInfoWithLogin
        });
        const {
          isNewUser,
          providerId,
          username,
          profile
        } = _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.FACEBOOK);
        expect(username).to.be.undefined;
        expect(profile).to.eql(userProfileWithLogin);
      });

      it('for GithubAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.GITHUB,
          rawUserInfo: rawUserInfoWithLogin
        });
        const {
          isNewUser,
          providerId,
          username,
          profile
        } = _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.GITHUB);
        expect(username).to.eq('scott');
        expect(profile).to.eql(userProfileWithLogin);
      });

      it('for GoogleAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.GOOGLE,
          rawUserInfo: rawUserInfoWithLogin
        });
        const {
          isNewUser,
          providerId,
          username,
          profile
        } = _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.GOOGLE);
        expect(username).to.be.undefined;
        expect(profile).to.eql(userProfileWithLogin);
      });

      it('for TwitterAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.TWITTER,
          rawUserInfo: rawUserInfoNoLogin,
          screenName: 'scott'
        });
        const {
          isNewUser,
          providerId,
          username,
          profile
        } = _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.TWITTER);
        expect(username).to.eq('scott');
        expect(profile).to.eql(userProfileNoLogin);
      });
    });

    describe('parses profile data', () => {
      it('for valid JSON', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          rawUserInfo: rawUserInfoWithLogin
        });
        expect(_fromIdTokenResponse(idResponse)!.profile).to.eql(
          userProfileWithLogin
        );
      });

      it('for missing JSON', () => {
        const idResponse = idTokenResponse({ providerId: ProviderId.FACEBOOK });
        expect(_fromIdTokenResponse(idResponse)!.profile).to.be.empty;
      });
    });

    describe('determines new-user status', () => {
      it('for new users by token response', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          isNewUser: true
        });
        expect(_fromIdTokenResponse(idResponse)!.isNewUser).to.be.true;
      });

      it('for new users by toolkit response kind', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          kind: IdTokenResponseKind.SignupNewUser
        });
        expect(_fromIdTokenResponse(idResponse)!.isNewUser).to.be.true;
      });

      it('for old users', () => {
        const idResponse = idTokenResponse({ providerId: ProviderId.FACEBOOK });
        expect(_fromIdTokenResponse(idResponse)!.isNewUser).to.be.false;
      });
    });

    describe('creates generic AdditionalUserInfo', () => {
      it('for custom auth', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.CUSTOM,
          rawUserInfo: rawUserInfoWithLogin
        });
        const {
          isNewUser,
          providerId,
          username,
          profile
        } = _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).to.be.false;
        expect(providerId).to.be.null;
        expect(username).to.be.undefined;
        expect(profile).to.eq(profile);
      });

      it('for anonymous auth', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.ANONYMOUS,
          rawUserInfo: rawUserInfoWithLogin
        });
        const {
          isNewUser,
          providerId,
          username,
          profile
        } = _fromIdTokenResponse(idResponse)!;
        expect(isNewUser).to.be.false;
        expect(providerId).to.be.null;
        expect(username).to.be.undefined;
        expect(profile).to.eq(profile);
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
        const {
          isNewUser,
          providerId,
          username,
          profile
        } = _fromIdTokenResponse(
          idTokenResponse({ rawUserInfo: rawUserInfoWithLogin, idToken })
        )!;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.FACEBOOK);
        expect(username).to.be.undefined;
        expect(profile).to.eq(profile);
      });
    });

    describe('returns null', () => {
      it('for missing provider IDs', () => {
        const idResponse = idTokenResponse({});
        expect(_fromIdTokenResponse(idResponse)).to.be.null;
      });
    });
  });

  describe('getAdditionalUserInfo()', () => {
    let auth: Auth;
    let user: User;
    let cred: UserCredential;
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
      const {
        isNewUser,
        providerId,
        username,
        profile
      } = getAdditionalUserInfo(cred)!;
      expect(isNewUser).to.be.false;
      expect(providerId).to.be.null;
      expect(username).to.be.undefined;
      expect(profile).to.eq(profile);
    });

    it('calls through to _fromIdTokenResponse preserving isNewUser', () => {
      cred._tokenResponse = idTokenResponse({
        providerId: ProviderId.ANONYMOUS,
        rawUserInfo: rawUserInfoWithLogin,
        isNewUser: true
      });
      const {
        isNewUser,
        providerId,
        username,
        profile
      } = getAdditionalUserInfo(cred)!;
      expect(isNewUser).to.be.true;
      expect(providerId).to.be.null;
      expect(username).to.be.undefined;
      expect(profile).to.eq(profile);
    });

    it('returns bespoke info if existing anonymous user', () => {
      // Note that _tokenResponse is not set on cred
      (user as unknown as Record<string, unknown>).isAnonymous = true;
      const {
        isNewUser,
        providerId,
        profile
      } = getAdditionalUserInfo(cred)!;
      expect(isNewUser).to.be.false;
      expect(providerId).to.be.null;
      expect(profile).to.eq(profile);
    });

    it('returns null if not anonymous', () => {
      // Note that _tokenResponse is not set on cred
      expect(getAdditionalUserInfo(cred)).to.be.null;
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
