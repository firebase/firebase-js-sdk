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

import { FirebaseError } from '@firebase/util';
import { ProviderId } from '@firebase/auth-types-exp';

import { makeJWT } from '../../../test/jwt';
import { testUser } from '../../../test/mock_auth';
import { User } from '../../model/user';
import { getIdTokenResult } from './id_token_result';

use(chaiAsPromised);

const MAY_1 = new Date('May 1, 2020');
const MAY_2 = new Date('May 2, 2020');
const MAY_3 = new Date('May 3, 2020');

describe('/core/user/id_token_result', () => {
  let user: User;

  beforeEach(() => {
    user = testUser('uid');
  });

  function setup(token: string): void {
    sinon.stub(user, 'getIdToken').returns(Promise.resolve(token));
  }

  it('throws an internal error when the token is malformed', async () => {
    setup('not.valid');
    await expect(getIdTokenResult(user)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('builds the result properly w/ timestamps', async () => {
    const token = {
      'iat': (MAY_1.getTime() / 1000).toString(),
      'auth_time': (MAY_2.getTime() / 1000).toString(),
      'exp': (MAY_3.getTime() / 1000).toString()
    };

    const encodedStr = makeJWT(token);
    setup(encodedStr);
    const result = await getIdTokenResult(user);
    console.log(JSON.stringify(result));
    console.log(JSON.stringify({
      claims: token,
      token: encodedStr,
      issuedAtTime: MAY_1.toUTCString(),
      authTime: MAY_2.toUTCString(),
      expirationTime: MAY_3.toUTCString(),
      signInProvider: null,
      signInSecondFactor: null
    }));
    expect(result).to.eql({
      claims: token,
      token: encodedStr,
      issuedAtTime: MAY_1.toUTCString(),
      authTime: MAY_2.toUTCString(),
      expirationTime: MAY_3.toUTCString(),
      signInProvider: null,
      signInSecondFactor: null
    });
  });

  it('sets provider and second factor if available', async () => {
    const token = {
      'iat': (MAY_1.getTime() / 1000).toString(),
      'auth_time': (MAY_2.getTime() / 1000).toString(),
      'exp': (MAY_3.getTime() / 1000).toString(),
      'firebase': {
        'sign_in_provider': ProviderId.GOOGLE,
        'sign_in_second_factor': 'sure'
      }
    };

    const encodedStr = makeJWT(token);
    setup(encodedStr);
    const result = await getIdTokenResult(user);
    expect(result).to.eql({
      claims: token,
      token: encodedStr,
      issuedAtTime: MAY_1.toUTCString(),
      authTime: MAY_2.toUTCString(),
      expirationTime: MAY_3.toUTCString(),
      signInProvider: ProviderId.GOOGLE,
      signInSecondFactor: 'sure'
    });
  });

  it('errors if iat is missing', async () => {
    const token = {
      'auth_time': (MAY_2.getTime() / 1000).toString(),
      'exp': (MAY_3.getTime() / 1000).toString()
    };

    const encodedStr = makeJWT(token);
    setup(encodedStr);
    await expect(getIdTokenResult(user)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('errors if auth_time is missing', async () => {
    const token = {
      'iat': (MAY_1.getTime() / 1000).toString(),
      'exp': (MAY_3.getTime() / 1000).toString()
    };

    const encodedStr = makeJWT(token);
    setup(encodedStr);
    await expect(getIdTokenResult(user)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });

  it('errors if exp is missing', async () => {
    const token = {
      'iat': (MAY_1.getTime() / 1000).toString(),
      'auth_time': (MAY_2.getTime() / 1000).toString()
    };

    const encodedStr = makeJWT(token);
    setup(encodedStr);
    await expect(getIdTokenResult(user)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
  });
});
