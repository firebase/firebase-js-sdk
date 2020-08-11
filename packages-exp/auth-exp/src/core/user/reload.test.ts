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

import { ProviderId, UserInfo } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import {
  APIUserInfo,
  ProviderUserInfo
} from '../../api/account_management/account';
import { _reloadWithoutSaving, reload } from './reload';

use(chaiAsPromised);
use(sinonChai);

const BASIC_USER_INFO: UserInfo = {
  providerId: ProviderId.FIREBASE,
  uid: 'uid',
  email: 'email',
  displayName: 'display-name',
  phoneNumber: 'phone-number',
  photoURL: 'photo-url'
};

const BASIC_PROVIDER_USER_INFO: ProviderUserInfo = {
  providerId: ProviderId.FIREBASE,
  rawId: 'uid',
  email: 'email',
  displayName: 'display-name',
  phoneNumber: 'phone-number',
  photoUrl: 'photo-url'
};

describe('core/user/reload', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    fetch.setUp();
  });

  afterEach(fetch.tearDown);

  it('sets all the new properties', async () => {
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

    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });

    const user = testUser(auth, 'abc', '', true);
    await _reloadWithoutSaving(user);
    expect(user.uid).to.eq('local-id');
    expect(user.displayName).to.eq('display-name');
    expect(user.photoURL).to.eq('photo-url');
    expect(user.email).to.eq('email');
    expect(user.emailVerified).to.be.true;
    expect(user.phoneNumber).to.eq('phone-number');
    expect(user.tenantId).to.eq('tenant-id');
    expect(user.metadata).to.eql({
      creationTime: '123',
      lastSignInTime: '456'
    });
  });

  it('adds missing provider data', async () => {
    const user = testUser(auth, 'abc', '', true);
    user.providerData = [{ ...BASIC_USER_INFO }];
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [
        {
          providerUserInfo: [
            { ...BASIC_PROVIDER_USER_INFO, providerId: ProviderId.FACEBOOK }
          ]
        }
      ]
    });
    await _reloadWithoutSaving(user);
    expect(user.providerData).to.eql([
      { ...BASIC_USER_INFO },
      { ...BASIC_USER_INFO, providerId: ProviderId.FACEBOOK }
    ]);
  });

  it('merges provider data, using the new data for overlaps', async () => {
    const user = testUser(auth, 'abc', '', true);
    user.providerData = [
      {
        ...BASIC_USER_INFO,
        providerId: ProviderId.GITHUB,
        uid: 'i-will-be-overwritten'
      },
      {
        ...BASIC_USER_INFO
      }
    ];
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [
        {
          providerUserInfo: [
            {
              ...BASIC_PROVIDER_USER_INFO,
              providerId: ProviderId.GITHUB,
              rawId: 'new-uid'
            }
          ]
        }
      ]
    });
    await _reloadWithoutSaving(user);
    expect(user.providerData).to.eql([
      { ...BASIC_USER_INFO },
      {
        ...BASIC_USER_INFO,
        providerId: ProviderId.GITHUB,
        uid: 'new-uid'
      }
    ]);
  });

  it('reload persists the object and notifies listeners', async () => {
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [{}]
    });

    const user = testUser(auth, 'user', '', true);
    user.auth.currentUser = user;

    const cb = sinon.stub();
    user.auth._onIdTokenChanged(cb);

    await reload(user);
    expect(cb).to.have.been.calledWith(user);
    expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toJSON());
  });
});
