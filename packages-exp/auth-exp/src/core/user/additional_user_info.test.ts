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
import { IdTokenResponse } from '../../model/id_token';
import { ProviderId } from '../providers';
import { fromIdTokenResponse } from './additional_user_info';

describe('core/user/additional_user_info', () => {

  describe('fromIdTokenResponse', () => {
    const profile = {login: 'scott', friends: [], netWorth: 5.00};
    const rawUserInfo = JSON.stringify(profile);

    describe('parses federated IDP response tokens', () => {

      it('for FacebookAdditionalUserInfo', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({providerId: ProviderId.FACEBOOK, rawUserInfo}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.FACEBOOK);
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });

      it('for GithubAdditionalUserInfo', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({providerId: ProviderId.GITHUB, rawUserInfo}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.GITHUB);
        expect(username).to.eq('scott');
        expect(profile).to.eq(profile);
      });

      it('for GoogleAdditionalUserInfo', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({providerId: ProviderId.GOOGLE, rawUserInfo}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.GOOGLE);
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });

      it('for TwitterAdditionalUserInfo', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({providerId: ProviderId.TWITTER, rawUserInfo, screenName: 'scott'}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.TWITTER);
        expect(username).to.eq('scott');
        expect(profile).to.eq(profile);
      });
    });

    describe('parses profile data', () => {

      it('for valid JSON', () => {
        expect(fromIdTokenResponse(idTokenResponse({providerId: ProviderId.FACEBOOK, rawUserInfo}))!.profile).to.deep.eq(profile);
      });

      it('for missing JSON', () => {
        expect(fromIdTokenResponse(idTokenResponse({providerId: ProviderId.FACEBOOK}))!.profile).to.deep.eq({});
      });
    });

    describe('determines new-user status', () => {

      it('for new users by token response', () => {
        expect(fromIdTokenResponse(idTokenResponse({providerId: ProviderId.FACEBOOK, isNewUser: true}))!.isNewUser).to.be.true;
      });

      it('for new users by toolkit response kind', () => {
        expect(fromIdTokenResponse(idTokenResponse({providerId: ProviderId.FACEBOOK, kind: 'identitytoolkit#SignupNewUserResponse'}))!.isNewUser).to.be.true;
      });

      it('for old users', () => {
        expect(fromIdTokenResponse(idTokenResponse({providerId: ProviderId.FACEBOOK}))!.isNewUser).to.be.false;
      });
    });

    describe('creates generic AdditionalUserInfo', () => {

      it('for custom auth', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({providerId: ProviderId.CUSTOM, rawUserInfo}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.be.null;
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });

      it('for anonymous auth', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({providerId: ProviderId.ANONYMOUS, rawUserInfo}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.be.null;
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });
      /*
      it('for missing provider IDs in response but not in token', () => {
        const additionalUserInfo = fromIdTokenResponse(idTokenResponse({rawUserInfo}))!;
        const {isNewUser, providerId, username, profile} = additionalUserInfo;
        expect(isNewUser).to.be.false;
        expect(providerId).to.eq(ProviderId.FACEBOOK);
        expect(username).to.be.null;
        expect(profile).to.eq(profile);
      });
      */
    });

    describe('returns null', () => {
      it('for missing provider IDs', () => {
        expect(fromIdTokenResponse(idTokenResponse({}))).to.be.null;
      });
    });
  });
});

function idTokenResponse(partial: PartialIdTokenResponse): IdTokenResponse {
  return {
    idToken: 'Parsing logic not implemented',
    refreshToken: 'Doesn\'t matter',
    expiresIn: 'Doesn\'t matter',
    localId: 'Doesn\'t matter',
    kind: 'Not a new user response ',
    ...partial
  };
}

interface PartialIdTokenResponse {
  providerId?: ProviderId;
  isNewUser?: boolean;
  rawUserInfo?: string;
  screenName?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
  kind?: string;
}
