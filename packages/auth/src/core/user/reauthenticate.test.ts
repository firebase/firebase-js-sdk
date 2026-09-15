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

import { OperationType, ProviderId, SignInMethod } from '../../model/enums';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { makeJWT } from '../../../test/helpers/jwt';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { MockAuthCredential } from '../../../test/helpers/mock_auth_credential';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { IdTokenMfaResponse } from '../../api/authentication/mfa';
import { MultiFactorError } from '../../mfa/mfa_error';
import { IdTokenResponse } from '../../model/id_token';
import { UserInternal, UserCredentialInternal } from '../../model/user';
import { AuthCredential } from '../credentials';
import { AuthErrorCode } from '../errors';
import { _reauthenticate } from './reauthenticate';
import { _createError } from '../util/assert';
describe('core/user/reauthenticate', () => {
  let credential: AuthCredential;
  let user: UserInternal;

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
    vi.spyOn(credential, '_getReauthenticationResolver').mockReturnValue(
      Promise.resolve({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: undefined
      } as unknown as IdTokenResponse)
    );

    await expect(_reauthenticate(user, credential)).rejects.toThrow(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('should error if the token cannot be parsed', async () => {
    vi.spyOn(credential, '_getReauthenticationResolver').mockReturnValue(
      Promise.resolve({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: 'definitely-not-base-64'
      })
    );

    await expect(_reauthenticate(user, credential)).rejects.toThrow(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('should throw a user mismatch error if uid is different', async () => {
    vi.spyOn(credential, '_getReauthenticationResolver').mockReturnValue(
      Promise.resolve({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: makeJWT({ sub: 'not-the-uid' })
      })
    );

    await expect(_reauthenticate(user, credential)).rejects.toThrow(
      FirebaseError,
      'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch).'
    );
  });

  it('should switch a user deleted error to a mismatch error', async () => {
    vi.spyOn(credential, '_getReauthenticationResolver').mockReturnValue(
      Promise.reject(
        _createError(AuthErrorCode.USER_DELETED, {
          appName: ''
        })
      )
    );

    await expect(_reauthenticate(user, credential)).rejects.toThrow(
      FirebaseError,
      'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch).'
    );
  });

  it('should not switch other errors to a mismatch error', async () => {
    vi.spyOn(credential, '_getReauthenticationResolver').mockReturnValue(
      Promise.reject(
        _createError(AuthErrorCode.NETWORK_REQUEST_FAILED, {
          appName: ''
        })
      )
    );

    await expect(_reauthenticate(user, credential)).rejects.toThrow(
      FirebaseError,
      'auth/network-request-failed'
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
    vi.spyOn(credential, '_getReauthenticationResolver').mockReturnValue(
      Promise.reject(
        _createError(user.auth, AuthErrorCode.MFA_REQUIRED, {
          _serverResponse: serverResponse
        })
      )
    );
    let error: MultiFactorError | undefined;
    try {
      await _reauthenticate(user, credential);
      expect.unreachable();
    } catch (e) {
      error = e as MultiFactorError;
    }
    expect(error).toBeInstanceOf(MultiFactorError);
    expect(error.customData.operationType).toBe(OperationType.REAUTHENTICATE);
    expect(error.customData._serverResponse).toEqual(serverResponse);
  });

  it('should return a valid user credential', async () => {
    const response = {
      ...TEST_ID_TOKEN_RESPONSE,
      idToken: makeJWT({ sub: 'uid' })
    };
    vi.spyOn(credential, '_getReauthenticationResolver').mockReturnValue(
      Promise.resolve(response)
    );

    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [{ localId: 'uid' }]
    });

    const cred = (await _reauthenticate(
      user,
      credential
    )) as UserCredentialInternal;

    expect(cred.operationType).toBe(OperationType.REAUTHENTICATE);
    expect(cred._tokenResponse).toBe(response);
    expect(cred.user).toBe(user);
  });
});
