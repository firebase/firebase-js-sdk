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
import { TestAuth, testAuth, testUser } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { User } from '../../model/user';
import { updateEmail, updatePassword, updateProfile } from './account_info';

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
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid', '', true);
    fetch.setUp();
  });

  afterEach(() => {
    sinon.restore();
    fetch.tearDown();
  });

  describe('#updateProfile', () => {
    it('returns immediately if profile object is empty', async () => {
      const ep = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {});
      await updateProfile(user, {});
      expect(ep.calls).to.be.empty;
    });

    it('calls the setAccountInfo endpoint', async () => {
      const ep = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {});

      await updateProfile(user, {
        displayName: 'displayname',
        photoURL: 'photo'
      });
      expect(ep.calls[0].request).to.eql({
        idToken: 'access-token',
        displayName: 'displayname',
        photoUrl: 'photo',
        returnSecureToken: true,
      });
    });

    it('sets the fields on the user based on the response', async () => {
      mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
        displayName: 'response-name',
        photoUrl: 'response-photo'
      });

      await updateProfile(user, {
        displayName: 'displayname',
        photoURL: 'photo'
      });
      expect(user.displayName).to.eq('response-name');
      expect(user.photoURL).to.eq('response-photo');
    });

    it('sets the fields on the password provider', async () => {
      mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
        displayName: 'response-name',
        photoUrl: 'response-photo'
      });
      user.providerData = [{ ...PASSWORD_PROVIDER }];

      await updateProfile(user, {
        displayName: 'displayname',
        photoURL: 'photo'
      });
      const provider = user.providerData[0];
      expect(provider.displayName).to.eq('response-name');
      expect(provider.photoURL).to.eq('response-photo');
    });
  });

  describe('#updateEmail', () => {
    it('calls the setAccountInfo endpoint and reloads the user', async () => {
      const set = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {});
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ localId: 'new-uid-to-prove-refresh-got-called' }]
      });

      await updateEmail(user, 'hello@test.com');
      expect(set.calls[0].request).to.eql({
        idToken: 'access-token',
        email: 'hello@test.com',
        returnSecureToken: true,
      });

      expect(user.uid).to.eq('new-uid-to-prove-refresh-got-called');
    });
  });

  describe('#updatePassword', () => {
    it('calls the setAccountInfo endpoint and reloads the user', async () => {
      const set = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {});
      mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
        users: [{ localId: 'new-uid-to-prove-refresh-got-called' }]
      });

      await updatePassword(user, 'pass');
      expect(set.calls[0].request).to.eql({
        idToken: 'access-token',
        password: 'pass',
        returnSecureToken: true,
      });

      expect(user.uid).to.eq('new-uid-to-prove-refresh-got-called');
    });
  });

  describe('notifications', () => {
    let idTokenChange: sinon.SinonStub;

    beforeEach(async () => {
      idTokenChange = sinon.stub();
      auth.onIdTokenChanged(idTokenChange);

      // Flush token change promises which are floating
      await auth._updateCurrentUser(user);
      auth._isInitialized = true;
      idTokenChange.resetHistory();
    });

    describe('#updateProfile', () => {
      it('triggers a token update if necessary', async () => {
        mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
          idToken: 'new-id-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 300
        });

        await updateProfile(user, { displayName: 'd' });
        expect(idTokenChange).to.have.been.called;
        expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toJSON());
      });

      it('does NOT trigger a token update if unnecessary', async () => {
        mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
          idToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 300
        });

        await updateProfile(user, { displayName: 'd' });
        expect(idTokenChange).not.to.have.been.called;
        expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toJSON());
      });
    });

    describe('#updateEmail', () => {
      beforeEach(() => {
        // This is necessary because this method calls reload; we don't care about that though,
        // for these tests we're looking at the change listeners
        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, { users: [{}] });
      });

      it('triggers a token update if necessary', async () => {
        mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
          idToken: 'new-id-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 300
        });

        await updatePassword(user, 'email@test.com');
        expect(idTokenChange).to.have.been.called;
        expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toJSON());
      });

      it('does NOT trigger a token update if unnecessary', async () => {
        mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
          idToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 300
        });

        await updateEmail(user, 'email@test.com');
        expect(idTokenChange).not.to.have.been.called;
        expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toJSON());
      });
    });

    describe('#updatePassword', () => {
      beforeEach(() => {
        // This is necessary because this method calls reload; we don't care about that though,
        // for these tests we're looking at the change listeners
        mockEndpoint(Endpoint.GET_ACCOUNT_INFO, { users: [{}] });
      });

      it('triggers a token update if necessary', async () => {
        mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
          idToken: 'new-id-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 300
        });

        await updatePassword(user, 'pass');
        expect(idTokenChange).to.have.been.called;
        expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toJSON());
      });

      it('does NOT trigger a token update if unnecessary', async () => {
        mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
          idToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 300
        });

        await updatePassword(user, 'pass');
        expect(idTokenChange).not.to.have.been.called;
        expect(auth.persistenceLayer.lastObjectSet).to.eql(user.toJSON());
      });
    });
  });
});
