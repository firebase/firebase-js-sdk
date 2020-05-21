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

import { UserInfo } from '@firebase/auth-types-exp';

// import { UserInfo } from '@firebase/auth-types-exp';
import { mockEndpoint } from '../../../test/api/helper';
import { testUser } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { User } from '../../model/user';
import { ProviderId } from '../providers';
// import { ProviderId } from '../providers';
import { updateProfile } from './account_info';

use(chaiAsPromised);
use(sinonChai);

const PASSWORD_PROVIDER: UserInfo = {
  providerId: ProviderId.PASSWORD,
  uid: 'uid',
  email: 'email',
  displayName: 'old-name',
  phoneNumber: 'phone-number',
  photoURL: 'old-url'
};

describe('core/user/profile', () => {
  let user: User;

  beforeEach(() => {
    user = testUser('uid', '', true);
  });

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(fetch.setUp);
  afterEach(fetch.tearDown);

  it('returns immediately if profile object is empty', async () => {
    const ep = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {});
    await updateProfile(user, {});
    expect(ep.calls).to.be.empty;
  });

  it('calls the setAccountInfo endpoint', async () => {
    const ep =mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {});

    await updateProfile(user, {displayName: 'displayname', photoURL: 'photo'});
    expect(ep.calls[0].request).to.eql({
      idToken: 'access-token',
      displayName: 'displayname',
      photoUrl: 'photo',
    });
  });

  it('sets the fields on the user based on the response', async () => {
    mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
      displayName: 'response-name',
      photoUrl: 'response-photo',
    });

    await updateProfile(user, {displayName: 'displayname', photoURL: 'photo'});
    expect(user.displayName).to.eq('response-name');
    expect(user.photoURL).to.eq('response-photo');
  });

  it('sets the fields on the passwd provider', async () => {
    mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
      displayName: 'response-name',
      photoUrl: 'response-photo',
    });
    user.providerData = [{...PASSWORD_PROVIDER}];

    await updateProfile(user, {displayName: 'displayname', photoURL: 'photo'});
    const provider = user.providerData[0];
    expect(provider.displayName).to.eq('response-name');
    expect(provider.photoURL).to.eq('response-photo');
  });

  describe('notifications', () => {
    beforeEach(() => {
      user.auth.currentUser = user;
    });

    it('triggers a token update if necessary', async () => {
      mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
        idToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 300,
      });

      const notifySpy = sinon.stub(user.auth, '_notifyStateListeners');
      await updateProfile(user, {displayName: 'd'});
      expect(notifySpy).to.have.been.called;
    });

    it('does NOT trigger a token update if unnecessary', async () => {
      mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
        idToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 300,
      });

      const notifySpy = sinon.stub(user.auth, '_notifyStateListeners');
      await updateProfile(user, {displayName: 'd'});
      expect(notifySpy).not.to.have.been.called;
    });
  });
});