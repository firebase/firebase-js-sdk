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

import { OperationType, ProviderId, SignInMethod } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/api/helper';
import { makeJWT } from '../../../test/jwt';
import { testAuth, testUser } from '../../../test/mock_auth';
import { MockAuthCredential } from '../../../test/mock_auth_credential';
import * as mockFetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { User } from '../../model/user';
import {
    linkWithCredential, reauthenticateWithCredential, signInWithCredential
} from './credential';

use(chaiAsPromised);

describe('core/strategies/credential', () => {
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

  const idTokenResponse: IdTokenResponse = {
    idToken: 'my-id-token',
    refreshToken: 'my-refresh-token',
    expiresIn: '1234',
    localId: serverUser.localId!,
    kind: 'my-kind'
  };

  const authCredential = new MockAuthCredential(
    ProviderId.FIREBASE,
    SignInMethod.EMAIL_LINK
  );

  let auth: Auth;
  let getAccountInfoEndpoint: mockFetch.Route;
  let user: User;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    authCredential._setIdTokenResponse(idTokenResponse);
    getAccountInfoEndpoint = mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });

    user = testUser(auth, 'uid', undefined, true);
  });

  afterEach(mockFetch.tearDown);

  describe('signInWithCredential', () => {
    it('should return a valid user credential', async () => {
      const { credential, user, operationType } = await signInWithCredential(
        auth,
        authCredential
      );
      expect(credential).to.be.null;
      expect(user.uid).to.eq('local-id');
      expect(user.tenantId).to.eq('tenant-id');
      expect(user.displayName).to.eq('display-name');
      expect(operationType).to.eq(OperationType.SIGN_IN);
    });

    it('should update the current user', async () => {
      const { user } = await signInWithCredential(auth, authCredential);
      expect(auth.currentUser).to.eq(user);
    });
  });

  describe('reauthenticateWithCredential', () => {
    it('should throw an error if the uid is mismatched', async () => {
      authCredential._setIdTokenResponse({
        ...idTokenResponse,
        idToken: makeJWT({ sub: 'not-my-uid' })
      });

      await expect(
        reauthenticateWithCredential(user, authCredential)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch).'
      );
    });

    it('sould return the expected user credential', async () => {
      authCredential._setIdTokenResponse({
        ...idTokenResponse,
        idToken: makeJWT({ sub: 'uid' })
      });

      const {
        credential,
        user: newUser,
        operationType
      } = await reauthenticateWithCredential(user, authCredential);
      expect(operationType).to.eq(OperationType.REAUTHENTICATE);
      expect(newUser).to.eq(user);
      expect(credential).to.be.null;
    });
  });

  describe('linkWithCredential', () => {
    it('should throw an error if the provider is already linked', async () => {
      getAccountInfoEndpoint.response = {
        users: [
          {
            ...serverUser,
            providerUserInfo: [{ providerId: ProviderId.FIREBASE }]
          }
        ]
      };

      await expect(linkWithCredential(user, authCredential)).to.be.rejectedWith(
        FirebaseError,
        'Firebase: User can only be linked to one identity for the given provider. (auth/provider-already-linked).'
      );
    });

    it('should return a valid user credential', async () => {
      const {
        credential,
        user: newUser,
        operationType
      } = await linkWithCredential(user, authCredential);
      expect(operationType).to.eq(OperationType.LINK);
      expect(newUser).to.eq(user);
      expect(credential).to.be.null;
    });
  });
});
