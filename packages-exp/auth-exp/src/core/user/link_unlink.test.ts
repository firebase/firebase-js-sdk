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
import { APIUserInfo } from '../../api/account_management/account';
import { User } from '../../model/user';
import { _assertLinkedStatus, unlink } from './link_unlink';

use(chaiAsPromised);

describe('core/user/link_unlink', () => {
  let user: User;
  let auth: TestAuth;
  let getAccountInfoEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid', '', true);
    await auth.updateCurrentUser(user);
    fetch.setUp();
  });

  afterEach(() => {
    fetch.tearDown();
  });

  context('link', () => {
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

      it('removes the phone provider from the list and persists', async () => {
        user.phoneNumber = 'number!';
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
        expect(user.phoneNumber).to.be.null;
      });

      it('removes non-phone provider from the list and persists', async () => {
        user.providerData = [
          {
            providerId: ProviderId.GOOGLE,
            displayName: '',
            phoneNumber: '',
            email: '',
            photoURL: '',
            uid: ''
          },
          {
            providerId: ProviderId.TWITTER,
            displayName: '',
            phoneNumber: '',
            email: '',
            photoURL: '',
            uid: ''
          }
        ];
        await unlink(user, ProviderId.TWITTER);
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

  describe('_assertLinkedStatus', () => {
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
    
    beforeEach(() => {
      getAccountInfoEndpoint = mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [
          {
            uid: 'uid',
            providerUserInfo: [{ providerId: ProviderId.PHONE }]
          }
        ]
      });
    });

    it('should error with already linked if expectation is true', async () => {
      getAccountInfoEndpoint.response = {
        users: [
          {
            ...serverUser,
            providerUserInfo: [{ providerId: ProviderId.GOOGLE }]
          }
        ]
      };

      await expect(
        _assertLinkedStatus(false, user, ProviderId.GOOGLE)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: User can only be linked to one identity for the given provider. (auth/provider-already-linked).'
      );
    });

    it('should not error if provider is not linked', async () => {
      await expect(_assertLinkedStatus(false, user, ProviderId.GOOGLE)).not.to
        .be.rejected;
    });

    it('should error if provider is not linked but it was expected to be', async () => {
      await expect(
        _assertLinkedStatus(true, user, ProviderId.GOOGLE)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: User was not linked to an account with the given provider. (auth/no-such-provider).'
      );
    });

    it('should not error if provider is linked and that is expected', async () => {
      getAccountInfoEndpoint.response = {
        users: [
          {
            ...serverUser,
            providerUserInfo: [{ providerId: ProviderId.GOOGLE }]
          }
        ]
      };
      await expect(_assertLinkedStatus(true, user, ProviderId.GOOGLE)).not.to.be
        .rejected;
    });
  });
});
