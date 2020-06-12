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

import { ProviderId } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { User } from '../../model/user';
import { unlink } from './unlink';

use(chaiAsPromised);

describe('core/user/unlink', () => {
  let user: User;
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid', '', true);
    await auth.updateCurrentUser(user);
    fetch.setUp();
  });

  afterEach(() => {
    fetch.tearDown();
  });

  it('rejects if the provider is not linked', async () => {
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [
        {
          uid: 'uid'
        }
      ]
    });

    await expect(unlink(user, ProviderId.PHONE)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: User was not linked to an account with the given provider. (auth/no-such-provider).'
    );
  });

  context('with properly linked account', () => {
    let endpoint: fetch.Route;
    beforeEach(() => {
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [
          {
            uid: 'uid',
            providerUserInfo: [{ providerId: ProviderId.PHONE }]
          }
        ]
      });

      endpoint = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
        providerUserInfo: [
          {
            providerId: ProviderId.GOOGLE
          }
        ]
      });
    });

    it('removes the provider from the list and persists', async () => {
      user.providerData = [
        {
          providerId: ProviderId.PHONE,
          displayName: '',
          phoneNumber: '',
          email: '',
          photoURL: '',
          uid: ''
        },
        {
          providerId: ProviderId.GOOGLE,
          displayName: '',
          phoneNumber: '',
          email: '',
          photoURL: '',
          uid: ''
        }
      ];
      await unlink(user, ProviderId.PHONE);
      expect(user.providerData).to.eql([
        {
          providerId: ProviderId.GOOGLE,
          displayName: '',
          phoneNumber: '',
          email: '',
          photoURL: '',
          uid: ''
        }
      ]);

      expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toPlainObject());
    });

    it('calls the endpoint with the provider', async () => {
      await unlink(user, ProviderId.PHONE);
      expect(endpoint.calls[0].request).to.eql({
        idToken: await user.getIdToken(),
        deleteProvider: [ProviderId.PHONE]
      });
    });
  });
});
