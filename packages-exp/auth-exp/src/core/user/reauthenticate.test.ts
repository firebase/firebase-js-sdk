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

import { OperationType } from '@firebase/auth-types-exp';
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

use(chaiAsPromised);

describe('src/core/user/reauthenticate', () => {
  let user: User;

  beforeEach(async () => {
    fetch.setUp();
    user = testUser(await testAuth(), 'uid', 'test@test.com', true);
  });

  afterEach(() => {
    fetch.tearDown();
  });

  it('should error if the idToken is missing', async () => {
    await expect(
      _reauthenticate(
        user,
        Promise.resolve(({
          ...TEST_ID_TOKEN_RESPONSE,
          idToken: undefined
        } as unknown) as IdTokenResponse)
      )
    ).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('should error if the token can not be parsed', async () => {
    await expect(
      _reauthenticate(
        user,
        Promise.resolve({
          ...TEST_ID_TOKEN_RESPONSE,
          idToken: 'definitely-not-base-64'
        })
      )
    ).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('should throw a user mismatch error if uid is different', async () => {
    await expect(
      _reauthenticate(
        user,
        Promise.resolve({
          ...TEST_ID_TOKEN_RESPONSE,
          idToken: makeJWT({ sub: 'not-the-uid' })
        })
      )
    ).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch).'
    );
  });

  it('should switch a user deleted error to a mismatch error', async () => {
    const rejection = Promise.reject(
      AUTH_ERROR_FACTORY.create(AuthErrorCode.USER_DELETED, {
        appName: ''
      })
    );

    await expect(_reauthenticate(user, rejection)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The supplied credentials do not correspond to the previously signed in user. (auth/user-mismatch).'
    );
  });

  it('should not switch other errors to a mismatch error', async () => {
    const rejection = Promise.reject(
      AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
        appName: ''
      })
    );

    await expect(_reauthenticate(user, rejection)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred. (auth/network-request-failed).'
    );
  });

  it('should return a valid user credential', async () => {
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [{ localId: 'uid' }]
    });

    const cred = await _reauthenticate(
      user,
      Promise.resolve({
        ...TEST_ID_TOKEN_RESPONSE,
        idToken: makeJWT({ sub: 'uid' })
      })
    );

    expect(cred.operationType).to.eq(OperationType.REAUTHENTICATE);
    expect(cred.credential).to.eq(null);
    expect(cred.user).to.eq(user);
  });
});
