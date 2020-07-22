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
import * as sinonChai from 'sinon-chai';

import { OperationType, ProviderId, SignInMethod } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import { MockAuthCredential } from '../../../test/helpers/mock_auth_credential';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { User } from '../../model/user';
import { AuthCredential } from '../credentials';
import { UserCredentialImpl } from './user_credential_impl';

use(chaiAsPromised);
use(sinonChai);

describe('core/user/user_credential_impl', () => {
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

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  describe('fromIdTokenResponse', () => {
    const idTokenResponse: IdTokenResponse = {
      idToken: 'my-id-token',
      refreshToken: 'my-refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!,
      kind: IdTokenResponseKind.CreateAuthUri
    };

    const credential: AuthCredential = new MockAuthCredential(
      ProviderId.FIREBASE,
      SignInMethod.EMAIL_PASSWORD
    );

    it('should initialize a UserCredential', async () => {
      const userCredential = await UserCredentialImpl._fromIdTokenResponse(
        auth,
        credential,
        OperationType.SIGN_IN,
        idTokenResponse
      );
      expect(userCredential.credential).to.eq(credential);
      expect(userCredential.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCredential.user.uid).to.eq('local-id');
    });

    it('should not trigger callbacks', async () => {
      const cb = sinon.spy();
      auth.onAuthStateChanged(cb);
      await auth.updateCurrentUser(null);
      cb.resetHistory();

      await UserCredentialImpl._fromIdTokenResponse(
        auth,
        credential,
        OperationType.SIGN_IN,
        idTokenResponse
      );
      expect(cb).not.to.have.been.called;
    });
  });

  describe('forOperation', () => {
    let user: User;

    beforeEach(async () => {
      user = testUser(auth, 'uid', 'email', true);
      await auth.updateCurrentUser(user);
    });

    it('gets a credential based on the response', async () => {
      const cred = await UserCredentialImpl._forOperation(
        user,
        OperationType.REAUTHENTICATE,
        {
          ...TEST_ID_TOKEN_RESPONSE,
          temporaryProof: 'temporary-proof',
          phoneNumber: 'phone-number'
        }
      );

      expect(cred.credential!.providerId).to.eq(ProviderId.PHONE);
      expect(cred.operationType).to.eq(OperationType.REAUTHENTICATE);
    });

    it('persists the user', async () => {
      await UserCredentialImpl._forOperation(user, OperationType.LINK, {
        ...TEST_ID_TOKEN_RESPONSE
      });
      expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toPlainObject());
    });
  });
});
