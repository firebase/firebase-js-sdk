/**
 * @license
 * Copyright 2019 Google Inc.
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
import { fromIdTokenResponse } from './additional_user_info';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { ProviderId } from '../providers';
import { UserProfile } from '../../model/user';

describe('core/user/additional_user_info', () => {
  describe('fromIdTokenResponse', () => {
    const userProfileWithLogin: UserProfile = {
      login: 'scott',
      friends: [],
      netWorth: 5.0
    };
    const rawUserInfoWithLogin = JSON.stringify(userProfileWithLogin);
    const userProfileNoLogin: UserProfile = { sample: 'data' };
    const rawUserInfoNoLogin = JSON.stringify(userProfileNoLogin);

    describe('parses federated IDP response tokens', () => {
      it('for FacebookAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          rawUserInfo: rawUserInfoWithLogin
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        const { isNewUser, providerId, username, profile } = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.FACEBOOK);
        expect(username).to.be.null;
        expect(profile).to.eq(userProfileWithLogin);
      });

      it('for GithubAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.GITHUB,
          rawUserInfo: rawUserInfoWithLogin
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        const { isNewUser, providerId, username, profile } = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.GITHUB);
        expect(username).to.eq('scott');
        expect(profile).to.eq(userProfileWithLogin);
      });

      it('for GoogleAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.GOOGLE,
          rawUserInfo: rawUserInfoWithLogin
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        const { isNewUser, providerId, username, profile } = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.GOOGLE);
        expect(username).to.be.null;
        expect(profile).to.eq(userProfileWithLogin);
      });

      it('for TwitterAdditionalUserInfo', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.TWITTER,
          rawUserInfo: rawUserInfoNoLogin,
          screenName: 'scott'
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        const { isNewUser, providerId, username, profile } = additionalUserInfo;
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
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        expect(additionalUserInfo.profile).to.eql(userProfileWithLogin);
      });

      it('for missing JSON', () => {
        const idResponse = idTokenResponse({ providerId: ProviderId.FACEBOOK });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        expect(additionalUserInfo.profile).to.be.empty;
      });
    });

    describe('determines new-user status', () => {
      it('for new users by token response', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          isNewUser: true
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        expect(additionalUserInfo.isNewUser).to.be.true;
      });

      it('for new users by toolkit response kind', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.FACEBOOK,
          kind: IdTokenResponseKind.SignupNewUser
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        expect(additionalUserInfo.isNewUser).to.be.true;
      });

      it('for old users', () => {
        const idResponse = idTokenResponse({ providerId: ProviderId.FACEBOOK });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        expect(additionalUserInfo.isNewUser).to.be.false;
      });
    });

    describe('creates generic AdditionalUserInfo', () => {
      it('for custom auth', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.CUSTOM,
          rawUserInfo: rawUserInfoWithLogin
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        const { isNewUser, providerId, username, profile } = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.be.null;
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });

      it('for anonymous auth', () => {
        const idResponse = idTokenResponse({
          providerId: ProviderId.ANONYMOUS,
          rawUserInfo: rawUserInfoWithLogin
        });
        const additionalUserInfo = fromIdTokenResponse(idResponse)!;
        const { isNewUser, providerId, username, profile } = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.be.null;
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });

      it('for missing provider IDs in response but not in token', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({rawUserInfo: rawUserInfoWithLogin}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.FACEBOOK);
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });
    });

    describe('returns null', () => {
      it('for missing provider IDs', () => {
        const idResponse = idTokenResponse({});
        const additionalUserInfo = fromIdTokenResponse(idResponse);
        expect(additionalUserInfo).to.be.null;
      });
    });
  });
});

function idTokenResponse(partial: Partial<IdTokenResponse>): IdTokenResponse {
  return {
    idToken: 'Parsing logic not implemented',
    refreshToken: "Doesn't matter",
    expiresIn: "Doesn't matter",
    localId: "Doesn't matter",
    kind: IdTokenResponseKind.CreateAuthUri,
    ...partial
  };
}
