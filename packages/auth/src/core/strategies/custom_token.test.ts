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
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { OperationType } from '../../model/enums';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { UserCredentialInternal } from '../../model/user';
import {
  clearCustomTokenProvider,
  setCustomTokenProvider,
  signInWithCustomToken
} from './custom_token';
import { FirebaseError } from '@firebase/util';
import { makeJWT } from '../../../test/helpers/jwt';

use(sinonChai);
use(chaiAsPromised);

describe('core/strategies/signInWithCustomToken', () => {
  const serverUser: APIUserInfo = {
    localId: 'local-id',
    displayName: 'display-name',
    photoUrl: 'photo-url',
    email: 'email',
    emailVerified: true,
    phoneNumber: 'phone-number',
    createdAt: 123,
    lastLoginAt: 456
  };

  const idTokenResponse: IdTokenResponse = {
    idToken: makeJWT({ sub: 'local-id' }),
    refreshToken: 'my-refresh-token',
    expiresIn: '1234',
    localId: serverUser.localId!,
    kind: IdTokenResponseKind.CreateAuthUri
  };

  let auth: TestAuth;
  let signInRoute: mockFetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    signInRoute = mockEndpoint(
      Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN,
      idTokenResponse
    );
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(() => {
    mockFetch.tearDown();
    sinon.restore();
  });

  describe('#signInWithCustomToken', () => {
    it('should return a valid user credential', async () => {
      const { user, operationType, _tokenResponse } =
        (await signInWithCustomToken(
          auth,
          'look-at-me-im-a-jwt'
        )) as UserCredentialInternal;
      expect(_tokenResponse).to.eql(idTokenResponse);
      expect(user.uid).to.eq('local-id');
      expect(user.displayName).to.eq('display-name');
      expect(operationType).to.eq(OperationType.SIGN_IN);
    });

    it('should send with a valid request', async () => {
      await signInWithCustomToken(auth, 'j.w.t');
      expect(signInRoute.calls[0].request).to.eql({
        token: 'j.w.t',
        returnSecureToken: true
      });
    });

    it('should update the current user', async () => {
      const { user } = await signInWithCustomToken(auth, 'oh.no');
      expect(auth.currentUser).to.eq(user);
    });
  });

  describe('#setCustomTokenProvider', () => {
    it('sets a custom token provider', () => {
      const provider = {
        async getCustomToken(): Promise<string> {
          return '';
        }
      };

      setCustomTokenProvider(auth, provider);

      expect(auth._refreshWithCustomTokenProvider).not.to.be.null;
    });

    it('_refreshWithCustomTokenProvider should send with a valid request and update the current user', async () => {
      const provider = {
        async getCustomToken(): Promise<string> {
          return 'custom-token';
        }
      };
      const user = testUser(auth, serverUser.localId!);
      auth.currentUser = user;
      sinon.spy(user.stsTokenManager, 'updateFromServerResponse');

      setCustomTokenProvider(auth, provider);
      const token = await auth._refreshWithCustomTokenProvider!();

      expect(signInRoute.calls[0].request).to.eql({
        token: 'custom-token',
        returnSecureToken: true
      });
      expect(token).to.eq(idTokenResponse.idToken);
      expect(
        user.stsTokenManager.updateFromServerResponse
      ).to.have.been.calledWith(idTokenResponse);
    });

    it('_refreshWithCustomTokenProvider should error when uid does not match localId', async () => {
      const provider = {
        async getCustomToken(): Promise<string> {
          return 'custom-token';
        }
      };
      const user = testUser(auth, 'not-matching-uid');
      auth.currentUser = user;
      sinon.spy(user.stsTokenManager, 'updateFromServerResponse');

      setCustomTokenProvider(auth, provider);
      await expect(auth._refreshWithCustomTokenProvider!()).to.be.rejectedWith(
        FirebaseError,
        'Firebase: Error (auth/internal-error).'
      );
    });
  });

  describe('#clearCustomTokenProvider', () => {
    it('clears the custom token provider', () => {
      const provider = {
        async getCustomToken(): Promise<string> {
          return '';
        }
      };
      setCustomTokenProvider(auth, provider);

      clearCustomTokenProvider(auth);

      expect(auth._refreshWithCustomTokenProvider).to.be.null;
    });
  });
});
