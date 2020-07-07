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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  OperationType,
  ProviderId,
  SignInMethod
} from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/id_token_response';
import { makeJWT } from '../../../test/jwt';
import { testAuth, testUser } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { IdTokenResponse } from '../../model/id_token';
import { User } from '../../model/user';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { _reauthenticate } from './reauthenticate';
import { AuthCredential } from '../credentials';
import { MockAuthCredential } from '../../../test/mock_auth_credential';
import { stub } from 'sinon';
import { IdTokenMfaResponse } from '../../api/authentication/mfa';
import { MultiFactorError } from '../../mfa/mfa_error';

use(chaiAsPromised);

describe('src/core/user/reauthenticate', () => {
  let credential: AuthCredential;
  let user: User;

  beforeEach(async () => {
    fetch.setUp();
    credential = new MockAuthCredential(
      ProviderId.FIREBASE,
      SignInMethod.EMAIL_LINK
    );
    user = testUser(await testAuth(), 'uid', 'test@test.com', true);
  });

  afterEach(() => {
    fetch.tearDown();
  });

  it('should error if the idToken is missing', async () => {
    stub(credential, '_getReauthenticationResolver').returns(
      Promise.resolve(({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: undefined
      } as unknown) as IdTokenResponse)
    );

    await expect(_reauthenticate(user, credential)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('should error if the token can not be parsed', async () => {
    stub(credential, '_getReauthenticationResolver').returns(
      Promise.resolve({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: 'definitely-not-base-64'
      })
    );

    await expect(_reauthenticate(user, credential)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('should throw a user mismatch error if uid is different', async () => {
    stub(credential, '_getReauthenticationResolver').returns(
      Promise.resolve({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: makeJWT({ sub: 'not-the-uid' })
      })
    );

    await expect(_reauthenticate(user, credential)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch).'
    );
  });

  it('should switch a user deleted error to a mismatch error', async () => {
    stub(credential, '_getReauthenticationResolver').returns(
      Promise.reject(
        AUTH_ERROR_FACTORY.create(AuthErrorCode.USER_DELETED, {
          appName: ''
        })
      )
    );

    await expect(_reauthenticate(user, credential)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch).'
    );
  });

  it('should not switch other errors to a mismatch error', async () => {
    stub(credential, '_getReauthenticationResolver').returns(
      Promise.reject(
        AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
          appName: ''
        })
      )
    );

    await expect(_reauthenticate(user, credential)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred. (auth/network-request-failed).'
    );
  });

  it('should wrap MFA errors with appropriate context', async () => {
      const serverResponse: IdTokenMfaResponse = {
        localId: 'uid',
        mfaInfo: [
          {
            mfaEnrollmentId: 'mfa-enrollment-id',
            enrolledAt: Date.now(),
            phoneInfo: 'phone-info'
          }
        ],
        mfaPendingCredential: 'mfa-pending-credential'
      };
      stub(credential, '_getReauthenticationResolver').returns(
        Promise.reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.MFA_REQUIRED, {
            appName: user.auth.name,
            serverResponse
          })
        )
      );
      const error = await expect(
        _reauthenticate(user, credential)
      ).to.be.rejectedWith(MultiFactorError);
      expect(error.credential).to.eq(credential);
      expect(error.operationType).to.eq(OperationType.REAUTHENTICATE);
      expect(error.serverResponse).to.eql(serverResponse);
      expect(error.user).to.eq(user);
  });

  it('should return a valid user credential', async () => { 
    stub(credential, '_getReauthenticationResolver').returns(
      Promise.resolve({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: makeJWT({ sub: 'uid' })
      })
    );

    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [{ localId: 'uid' }]
    });

    const cred = await _reauthenticate(user, credential);

    expect(cred.operationType).to.eq(OperationType.REAUTHENTICATE);
    expect(cred.credential).to.eq(null);
    expect(cred.user).to.eq(user);
  });
});
