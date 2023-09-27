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
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { FirebaseApp } from '@firebase/app';
import { FirebaseError } from '@firebase/util';

import {
  FAKE_APP_CHECK_CONTROLLER,
  FAKE_APP_CHECK_CONTROLLER_PROVIDER,
  FAKE_HEARTBEAT_CONTROLLER,
  FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
  testAuth,
  testUser
} from '../../../test/helpers/mock_auth';
import { AuthInternal } from '../../model/auth';
import { UserInternal } from '../../model/user';
import { PersistenceInternal } from '../persistence';
import { inMemoryPersistence } from '../persistence/in_memory';
import { _getInstance } from '../util/instantiator';
import * as navigator from '../util/navigator';
import * as reload from '../user/reload';
import { AuthImpl, DefaultConfig } from './auth_impl';
import { _initializeAuthInstance } from './initialize';
import { _initializeRecaptchaConfig } from '../../platform_browser/recaptcha/recaptcha_enterprise_verifier';
import { ClientPlatform } from '../util/version';
import { mockEndpointWithParams } from '../../../test/helpers/api/helper';
import { Endpoint, RecaptchaClientType, RecaptchaVersion } from '../../api';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { AuthErrorCode } from '../errors';
import { PasswordValidationStatus } from '../../model/public_types';
import { PasswordPolicyImpl } from './password_policy_impl';

use(sinonChai);
use(chaiAsPromised);

const FAKE_APP: FirebaseApp = {
  name: 'test-app',
  options: {
    apiKey: 'api-key',
    authDomain: 'auth-domain'
  },
  automaticDataCollectionEnabled: false
};

describe('core/auth/auth_impl', () => {
  let auth: AuthInternal;
  let persistenceStub: sinon.SinonStubbedInstance<PersistenceInternal>;

  beforeEach(async () => {
    persistenceStub = sinon.stub(_getInstance(inMemoryPersistence));
    const authImpl = new AuthImpl(
      FAKE_APP,
      FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
      FAKE_APP_CHECK_CONTROLLER_PROVIDER,
      {
        apiKey: FAKE_APP.options.apiKey!,
        apiHost: DefaultConfig.API_HOST,
        apiScheme: DefaultConfig.API_SCHEME,
        tokenApiHost: DefaultConfig.TOKEN_API_HOST,
        clientPlatform: ClientPlatform.BROWSER,
        sdkClientVersion: 'v'
      }
    );

    _initializeAuthInstance(authImpl, { persistence: inMemoryPersistence });
    auth = authImpl;
  });

  afterEach(sinon.restore);

  describe('#updateCurrentUser', () => {
    it('sets the field on the auth object', async () => {
      const user = testUser(auth, 'uid');
      await auth._updateCurrentUser(user);
      expect(auth.currentUser).to.eq(user);
    });

    it('public version makes a copy', async () => {
      const user = testUser(auth, 'uid');
      await auth.updateCurrentUser(user);

      // currentUser should deeply equal the user passed in, but should be a
      // different block in memory.
      expect(auth.currentUser).not.to.eq(user);
      expect(auth.currentUser).to.eql(user);
    });

    it('public version throws if the auth is mismatched', async () => {
      const auth2 = await testAuth();
      Object.assign(auth2.config, { apiKey: 'not-the-right-auth' });
      const user = testUser(auth2, 'uid');
      await expect(auth.updateCurrentUser(user)).to.be.rejectedWith(
        FirebaseError,
        'auth/invalid-user-token'
      );
    });

    it('orders async operations correctly', async () => {
      const users = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
        return testUser(auth, `${n}`);
      });

      persistenceStub._set.callsFake(() => {
        return new Promise(resolve => {
          // Force into the async flow to make this test actually meaningful
          setTimeout(() => resolve(), 1);
        });
      });

      await Promise.all(users.map(u => auth._updateCurrentUser(u)));
      for (let i = 0; i < 10; i++) {
        expect(persistenceStub._set.getCall(i)).to.have.been.calledWith(
          sinon.match.any,
          users[i].toJSON()
        );
      }
    });

    it('setting to null triggers a remove call', async () => {
      await auth._updateCurrentUser(null);
      expect(persistenceStub._remove).to.have.been.called;
    });

    it('should throw an error if the user is from a different tenant', async () => {
      const user = testUser(auth, 'uid');
      user.tenantId = 'other-tenant-id';
      await expect(auth._updateCurrentUser(user)).to.be.rejectedWith(
        FirebaseError,
        '(auth/tenant-id-mismatch)'
      );
    });
  });

  describe('#signOut', () => {
    it('sets currentUser to null, calls remove', async () => {
      await auth._updateCurrentUser(testUser(auth, 'test'));
      await auth.signOut();
      expect(persistenceStub._remove).to.have.been.called;
      expect(auth.currentUser).to.be.null;
    });
    it('is blocked if a beforeAuthStateChanged callback throws', async () => {
      await auth._updateCurrentUser(testUser(auth, 'test'));
      auth.beforeAuthStateChanged(sinon.stub().throws());
      await expect(auth.signOut()).to.be.rejectedWith(
        AuthErrorCode.LOGIN_BLOCKED
      );
    });
  });

  describe('#useDeviceLanguage', () => {
    it('should update the language code', () => {
      const mock = sinon.stub(navigator, '_getUserLanguage');
      mock.callsFake(() => 'jp');
      expect(auth.languageCode).to.be.null;
      auth.useDeviceLanguage();
      expect(auth.languageCode).to.eq('jp');
    });
  });

  describe('change listeners', () => {
    // // Helpers to convert auth state change results to promise
    // function onAuthStateChange(callback: NextFn<User|null>)

    it('immediately calls authStateChange if initialization finished', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = true;
      auth.onAuthStateChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('waits for initialization for authStateChange', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = false;
      auth.onAuthStateChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('immediately calls idTokenChange if initialization finished', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = true;
      auth.onIdTokenChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('waits for initialization for idTokenChanged', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = false;
      auth.onIdTokenChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('immediate callback is done async', () => {
      auth._isInitialized = true;
      let callbackCalled = false;
      auth.onIdTokenChanged(() => {
        callbackCalled = true;
      });

      expect(callbackCalled).to.be.false;
    });

    describe('user logs in/out, tokens refresh', () => {
      let user: UserInternal;
      let authStateCallback: sinon.SinonSpy;
      let idTokenCallback: sinon.SinonSpy;
      let beforeAuthCallback: sinon.SinonSpy;

      beforeEach(() => {
        user = testUser(auth, 'uid');
        authStateCallback = sinon.spy();
        idTokenCallback = sinon.spy();
        beforeAuthCallback = sinon.spy();
      });

      context('initially currentUser is null', () => {
        beforeEach(async () => {
          auth.onAuthStateChanged(authStateCallback);
          auth.onIdTokenChanged(idTokenCallback);
          auth.beforeAuthStateChanged(beforeAuthCallback);
          await auth._updateCurrentUser(null);
          authStateCallback.resetHistory();
          idTokenCallback.resetHistory();
          beforeAuthCallback.resetHistory();
        });

        it('onAuthStateChange triggers on log in', async () => {
          await auth._updateCurrentUser(user);
          expect(authStateCallback).to.have.been.calledWith(user);
        });

        it('onIdTokenChange triggers on log in', async () => {
          await auth._updateCurrentUser(user);
          expect(idTokenCallback).to.have.been.calledWith(user);
        });

        it('beforeAuthStateChanged triggers on log in', async () => {
          await auth._updateCurrentUser(user);
          expect(beforeAuthCallback).to.have.been.calledWith(user);
        });
      });

      context('initially currentUser is user', () => {
        beforeEach(async () => {
          auth.onAuthStateChanged(authStateCallback);
          auth.onIdTokenChanged(idTokenCallback);
          auth.beforeAuthStateChanged(beforeAuthCallback);
          await auth._updateCurrentUser(user);
          authStateCallback.resetHistory();
          idTokenCallback.resetHistory();
          beforeAuthCallback.resetHistory();
        });

        it('onAuthStateChange triggers on log out', async () => {
          await auth._updateCurrentUser(null);
          expect(authStateCallback).to.have.been.calledWith(null);
        });

        it('onIdTokenChange triggers on log out', async () => {
          await auth._updateCurrentUser(null);
          expect(idTokenCallback).to.have.been.calledWith(null);
        });

        it('beforeAuthStateChanged triggers on log out', async () => {
          await auth._updateCurrentUser(null);
          expect(beforeAuthCallback).to.have.been.calledWith(null);
        });

        it('onAuthStateChange does not trigger for user props change', async () => {
          user.photoURL = 'blah';
          await auth._updateCurrentUser(user);
          expect(authStateCallback).not.to.have.been.called;
        });

        it('onIdTokenChange triggers for user props change', async () => {
          user.photoURL = 'hey look I changed';
          await auth._updateCurrentUser(user);
          expect(idTokenCallback).to.have.been.calledWith(user);
        });

        it('onAuthStateChange triggers if uid changes', async () => {
          const newUser = testUser(auth, 'different-uid');
          await auth._updateCurrentUser(newUser);
          expect(authStateCallback).to.have.been.calledWith(newUser);
        });
      });

      context('with Proactive Refresh', () => {
        let oldUser: UserInternal;

        beforeEach(() => {
          oldUser = testUser(auth, 'old-user-uid');

          for (const u of [user, oldUser]) {
            sinon.spy(u, '_startProactiveRefresh');
            sinon.spy(u, '_stopProactiveRefresh');
          }
        });

        it('null -> user: does not turn on if not enabled', async () => {
          await auth._updateCurrentUser(null);
          await auth._updateCurrentUser(user);

          expect(user._startProactiveRefresh).not.to.have.been.called;
        });

        it('null -> user: turns on if enabled', async () => {
          await auth._updateCurrentUser(null);
          auth._startProactiveRefresh();
          await auth._updateCurrentUser(user);

          expect(user._startProactiveRefresh).to.have.been.called;
        });

        it('user -> user: does not turn on if not enabled', async () => {
          await auth._updateCurrentUser(oldUser);
          await auth._updateCurrentUser(user);

          expect(user._startProactiveRefresh).not.to.have.been.called;
        });

        it('user -> user: turns on if enabled', async () => {
          auth._startProactiveRefresh();
          await auth._updateCurrentUser(oldUser);
          await auth._updateCurrentUser(user);

          expect(oldUser._stopProactiveRefresh).to.have.been.called;
          expect(user._startProactiveRefresh).to.have.been.called;
        });

        it('calling start on auth triggers user to start', async () => {
          await auth._updateCurrentUser(user);
          auth._startProactiveRefresh();

          expect(user._startProactiveRefresh).to.have.been.calledOnce;
        });

        it('calling stop stops the refresh on the current user', async () => {
          auth._startProactiveRefresh();
          await auth._updateCurrentUser(user);
          auth._stopProactiveRefresh();

          expect(user._stopProactiveRefresh).to.have.been.called;
        });
      });

      it('onAuthStateChange works for multiple listeners', async () => {
        const cb1 = sinon.spy();
        const cb2 = sinon.spy();
        auth.onAuthStateChanged(cb1);
        auth.onAuthStateChanged(cb2);
        await auth._updateCurrentUser(null);
        cb1.resetHistory();
        cb2.resetHistory();

        await auth._updateCurrentUser(user);
        expect(cb1).to.have.been.calledWith(user);
        expect(cb2).to.have.been.calledWith(user);
      });

      it('onIdTokenChange works for multiple listeners', async () => {
        const cb1 = sinon.spy();
        const cb2 = sinon.spy();
        auth.onIdTokenChanged(cb1);
        auth.onIdTokenChanged(cb2);
        await auth._updateCurrentUser(null);
        cb1.resetHistory();
        cb2.resetHistory();

        await auth._updateCurrentUser(user);
        expect(cb1).to.have.been.calledWith(user);
        expect(cb2).to.have.been.calledWith(user);
      });

      it('beforeAuthStateChange works for multiple listeners', async () => {
        const cb1 = sinon.spy();
        const cb2 = sinon.spy();
        auth.beforeAuthStateChanged(cb1);
        auth.beforeAuthStateChanged(cb2);
        await auth._updateCurrentUser(null);
        cb1.resetHistory();
        cb2.resetHistory();

        await auth._updateCurrentUser(user);
        expect(cb1).to.have.been.calledWith(user);
        expect(cb2).to.have.been.calledWith(user);
      });

      it('_updateCurrentUser throws if a beforeAuthStateChange callback throws', async () => {
        await auth._updateCurrentUser(null);
        const cb1 = sinon.stub().throws();
        const cb2 = sinon.spy();
        auth.beforeAuthStateChanged(cb1);
        auth.beforeAuthStateChanged(cb2);

        await expect(auth._updateCurrentUser(user)).to.be.rejectedWith(
          AuthErrorCode.LOGIN_BLOCKED
        );
        expect(cb2).not.to.be.called;
      });

      it('_updateCurrentUser throws if a beforeAuthStateChange callback rejects', async () => {
        await auth._updateCurrentUser(null);
        const cb1 = sinon.stub().rejects();
        const cb2 = sinon.spy();
        auth.beforeAuthStateChanged(cb1);
        auth.beforeAuthStateChanged(cb2);

        await expect(auth._updateCurrentUser(user)).to.be.rejectedWith(
          AuthErrorCode.LOGIN_BLOCKED
        );
        expect(cb2).not.to.be.called;
      });
    });
  });

  describe('#_onStorageEvent', () => {
    let authStateCallback: sinon.SinonSpy;
    let idTokenCallback: sinon.SinonSpy;
    let beforeStateCallback: sinon.SinonSpy;

    beforeEach(async () => {
      authStateCallback = sinon.spy();
      idTokenCallback = sinon.spy();
      beforeStateCallback = sinon.spy();
      auth.onAuthStateChanged(authStateCallback);
      auth.onIdTokenChanged(idTokenCallback);
      auth.beforeAuthStateChanged(beforeStateCallback);
      await auth._updateCurrentUser(null); // force event handlers to clear out
      authStateCallback.resetHistory();
      idTokenCallback.resetHistory();
      beforeStateCallback.resetHistory();
    });

    context('previously logged out', () => {
      context('still logged out', () => {
        it('should do nothing', async () => {
          await auth._onStorageEvent();

          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).not.to.have.been.called;
          expect(beforeStateCallback).not.to.have.been.called;
        });
      });

      context('now logged in', () => {
        let user: UserInternal;

        beforeEach(() => {
          user = testUser(auth, 'uid');
          persistenceStub._get.returns(Promise.resolve(user.toJSON()));
        });

        it('should update the current user', async () => {
          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).to.eql(user.toJSON());
          expect(authStateCallback).to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.to.have.been.called;
        });
      });
    });

    context('previously logged in', () => {
      let user: UserInternal;

      beforeEach(async () => {
        user = testUser(auth, 'uid', undefined, true);
        await auth._updateCurrentUser(user);
        authStateCallback.resetHistory();
        idTokenCallback.resetHistory();
        beforeStateCallback.resetHistory();
      });

      context('now logged out', () => {
        beforeEach(() => {
          persistenceStub._get.returns(Promise.resolve(null));
        });

        it('should log out', async () => {
          await auth._onStorageEvent();

          expect(auth.currentUser).to.be.null;
          expect(authStateCallback).to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.to.have.been.called;
        });
      });

      context('still logged in as same user', () => {
        it('should do nothing if nothing changed', async () => {
          persistenceStub._get.returns(Promise.resolve(user.toJSON()));

          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).to.eql(user.toJSON());
          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).not.to.have.been.called;
          expect(beforeStateCallback).not.to.have.been.called;
        });

        it('should update fields if they have changed', async () => {
          const userObj = user.toJSON();
          userObj['displayName'] = 'other-name';
          persistenceStub._get.returns(Promise.resolve(userObj));

          await auth._onStorageEvent();

          expect(auth.currentUser?.uid).to.eq(user.uid);
          expect(auth.currentUser?.displayName).to.eq('other-name');
          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).not.to.have.been.called;
          expect(beforeStateCallback).not.to.have.been.called;
        });

        it('should update tokens if they have changed', async () => {
          const userObj = user.toJSON();
          (userObj['stsTokenManager'] as any)['accessToken'] =
            'new-access-token';
          persistenceStub._get.returns(Promise.resolve(userObj));

          await auth._onStorageEvent();

          expect(auth.currentUser?.uid).to.eq(user.uid);
          expect(
            (auth.currentUser as UserInternal)?.stsTokenManager.accessToken
          ).to.eq('new-access-token');
          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.to.have.been.called;
        });
      });

      context('now logged in as different user', () => {
        it('should re-login as the new user', async () => {
          const newUser = testUser(auth, 'other-uid', undefined, true);
          persistenceStub._get.returns(Promise.resolve(newUser.toJSON()));

          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).to.eql(newUser.toJSON());
          expect(authStateCallback).to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.to.have.been.called;
        });
      });
    });
  });

  context('#_delete', () => {
    beforeEach(async () => {
      sinon.stub(reload, '_reloadWithoutSaving').returns(Promise.resolve());
    });

    it('prevents initialization from completing', async () => {
      const authImpl = new AuthImpl(
        FAKE_APP,
        FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
        FAKE_APP_CHECK_CONTROLLER_PROVIDER,
        {
          apiKey: FAKE_APP.options.apiKey!,
          apiHost: DefaultConfig.API_HOST,
          apiScheme: DefaultConfig.API_SCHEME,
          tokenApiHost: DefaultConfig.TOKEN_API_HOST,
          clientPlatform: ClientPlatform.BROWSER,
          sdkClientVersion: 'v'
        }
      );

      persistenceStub._get.returns(
        Promise.resolve(testUser(auth, 'uid').toJSON())
      );
      await authImpl._delete();
      await authImpl._initializeWithPersistence([
        persistenceStub as PersistenceInternal
      ]);
      expect(authImpl.currentUser).to.be.null;
    });

    it('no longer calls listeners', async () => {
      const spy = sinon.spy();
      auth.onAuthStateChanged(spy);
      await Promise.resolve();
      spy.resetHistory();
      await (auth as AuthImpl)._delete();
      await auth._updateCurrentUser(testUser(auth, 'blah'));
      expect(spy).not.to.have.been.called;
    });
  });

  context('#_getAdditionalHeaders', () => {
    it('always adds the client version', async () => {
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v'
      });
    });

    it('adds the gmp app ID if available', async () => {
      auth.app.options.appId = 'app-id';
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v',
        'X-Firebase-gmpid': 'app-id'
      });
      delete auth.app.options.appId;
    });

    it('adds the heartbeat if available', async () => {
      sinon
        .stub(FAKE_HEARTBEAT_CONTROLLER, 'getHeartbeatsHeader')
        .returns(Promise.resolve('heartbeat'));
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v',
        'X-Firebase-Client': 'heartbeat'
      });
    });

    it('does not add heartbeat if none returned', async () => {
      sinon
        .stub(FAKE_HEARTBEAT_CONTROLLER, 'getHeartbeatsHeader')
        .returns(Promise.resolve(''));
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v'
      });
    });

    it('does not add heartbeat if controller unavailable', async () => {
      sinon
        .stub(FAKE_HEARTBEAT_CONTROLLER_PROVIDER, 'getImmediate')
        .returns(undefined as any);
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v'
      });
    });

    it('adds the App Check token if available', async () => {
      sinon
        .stub(FAKE_APP_CHECK_CONTROLLER, 'getToken')
        .returns(Promise.resolve({ token: 'fake-token' }));
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v',
        'X-Firebase-AppCheck': 'fake-token'
      });
    });

    it('does not add the App Check token if none returned', async () => {
      sinon
        .stub(FAKE_APP_CHECK_CONTROLLER, 'getToken')
        .returns(Promise.resolve({ token: '' }));
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v'
      });
    });

    it('does not add the App Check token if controller unavailable', async () => {
      sinon
        .stub(FAKE_APP_CHECK_CONTROLLER, 'getToken')
        .returns(undefined as any);
      expect(await auth._getAdditionalHeaders()).to.eql({
        'X-Client-Version': 'v'
      });
    });
  });

  context('recaptchaEnforcementState', () => {
    const recaptchaConfigResponseEnforce = {
      recaptchaKey: 'foo/bar/to/site-key',
      recaptchaEnforcementState: [
        { provider: 'EMAIL_PASSWORD_PROVIDER', enforcementState: 'ENFORCE' }
      ]
    };
    const recaptchaConfigResponseOff = {
      recaptchaKey: 'foo/bar/to/site-key',
      recaptchaEnforcementState: [
        { provider: 'EMAIL_PASSWORD_PROVIDER', enforcementState: 'OFF' }
      ]
    };
    const cachedRecaptchaConfigEnforce = {
      emailPasswordEnabled: true,
      siteKey: 'site-key'
    };
    const cachedRecaptchaConfigOFF = {
      emailPasswordEnabled: false,
      siteKey: 'site-key'
    };

    beforeEach(async () => {
      mockFetch.setUp();
    });

    afterEach(() => {
      mockFetch.tearDown();
    });

    it('recaptcha config should be set for agent if tenant id is null.', async () => {
      auth = await testAuth();
      auth.tenantId = null;
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      expect(auth._getRecaptchaConfig()).to.eql(cachedRecaptchaConfigEnforce);
    });

    it('recaptcha config should be set for tenant if tenant id is not null.', async () => {
      auth = await testAuth();
      auth.tenantId = 'tenant-id';
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE,
          tenantId: 'tenant-id'
        },
        recaptchaConfigResponseOff
      );
      await _initializeRecaptchaConfig(auth);

      expect(auth._getRecaptchaConfig()).to.eql(cachedRecaptchaConfigOFF);
    });

    it('recaptcha config should dynamically switch if tenant id switches.', async () => {
      auth = await testAuth();
      auth.tenantId = null;
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);
      auth.tenantId = 'tenant-id';
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE,
          tenantId: 'tenant-id'
        },
        recaptchaConfigResponseOff
      );
      await _initializeRecaptchaConfig(auth);

      auth.tenantId = null;
      expect(auth._getRecaptchaConfig()).to.eql(cachedRecaptchaConfigEnforce);
      auth.tenantId = 'tenant-id';
      expect(auth._getRecaptchaConfig()).to.eql(cachedRecaptchaConfigOFF);
    });
  });

  context('passwordPolicy', () => {
    const TEST_ALLOWED_NON_ALPHANUMERIC_CHARS = ['!', '(', ')'];
    const TEST_ALLOWED_NON_ALPHANUMERIC_STRING =
      TEST_ALLOWED_NON_ALPHANUMERIC_CHARS.join('');
    const TEST_MIN_PASSWORD_LENGTH = 6;
    const TEST_ENFORCEMENT_STATE_ENFORCE = 'ENFORCE';
    const TEST_FORCE_UPGRADE_ON_SIGN_IN = false;
    const TEST_SCHEMA_VERSION = 1;
    const TEST_UNSUPPORTED_SCHEMA_VERSION = 0;
    const TEST_TENANT_ID = 'tenant-id';
    const TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION =
      'tenant-id-unsupported-policy-version';

    const PASSWORD_POLICY_RESPONSE = {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
      enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
      schemaVersion: TEST_SCHEMA_VERSION
    };
    const PASSWORD_POLICY_RESPONSE_REQUIRE_NUMERIC = {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
        containsNumericCharacter: true
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
      enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
      schemaVersion: TEST_SCHEMA_VERSION
    };
    const PASSWORD_POLICY_RESPONSE_UNSUPPORTED_SCHEMA_VERSION = {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
        unsupportedPasswordPolicyProperty: 10
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
      enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
      forceUpgradeOnSignin: TEST_FORCE_UPGRADE_ON_SIGN_IN,
      schemaVersion: TEST_UNSUPPORTED_SCHEMA_VERSION
    };
    const CACHED_PASSWORD_POLICY = {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_STRING,
      enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
      forceUpgradeOnSignin: TEST_FORCE_UPGRADE_ON_SIGN_IN,
      schemaVersion: TEST_SCHEMA_VERSION
    };
    const CACHED_PASSWORD_POLICY_REQUIRE_NUMERIC = {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
        containsNumericCharacter: true
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_STRING,
      enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
      forceUpgradeOnSignin: TEST_FORCE_UPGRADE_ON_SIGN_IN,
      schemaVersion: TEST_SCHEMA_VERSION
    };
    const CACHED_PASSWORD_POLICY_UNSUPPORTED_SCHEMA_VERSION = {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_STRING,
      enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
      forceUpgradeOnSignin: TEST_FORCE_UPGRADE_ON_SIGN_IN,
      schemaVersion: TEST_UNSUPPORTED_SCHEMA_VERSION
    };

    beforeEach(async () => {
      mockFetch.setUp();
      mockEndpointWithParams(
        Endpoint.GET_PASSWORD_POLICY,
        {},
        PASSWORD_POLICY_RESPONSE
      );
      mockEndpointWithParams(
        Endpoint.GET_PASSWORD_POLICY,
        {
          tenantId: TEST_TENANT_ID
        },
        PASSWORD_POLICY_RESPONSE_REQUIRE_NUMERIC
      );
      mockEndpointWithParams(
        Endpoint.GET_PASSWORD_POLICY,
        {
          tenantId: TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION
        },
        PASSWORD_POLICY_RESPONSE_UNSUPPORTED_SCHEMA_VERSION
      );
    });

    afterEach(() => {
      mockFetch.tearDown();
    });

    it('password policy should be set for project if tenant ID is null', async () => {
      auth = await testAuth();
      auth.tenantId = null;
      await auth._updatePasswordPolicy();

      expect(auth._getPasswordPolicyInternal()).to.eql(CACHED_PASSWORD_POLICY);
    });

    it('password policy should be set for tenant if tenant ID is not null', async () => {
      auth = await testAuth();
      auth.tenantId = TEST_TENANT_ID;
      await auth._updatePasswordPolicy();

      expect(auth._getPasswordPolicyInternal()).to.eql(
        CACHED_PASSWORD_POLICY_REQUIRE_NUMERIC
      );
    });

    it('password policy should dynamically switch if tenant ID switches.', async () => {
      auth = await testAuth();
      auth.tenantId = null;
      await auth._updatePasswordPolicy();

      auth.tenantId = TEST_TENANT_ID;
      await auth._updatePasswordPolicy();

      auth.tenantId = null;
      expect(auth._getPasswordPolicyInternal()).to.eql(CACHED_PASSWORD_POLICY);
      auth.tenantId = TEST_TENANT_ID;
      expect(auth._getPasswordPolicyInternal()).to.eql(
        CACHED_PASSWORD_POLICY_REQUIRE_NUMERIC
      );
      auth.tenantId = 'other-tenant-id';
      expect(auth._getPasswordPolicyInternal()).to.be.undefined;
    });

    it('password policy should still be set when the schema version is not supported', async () => {
      auth = await testAuth();
      auth.tenantId = TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION;
      await expect(auth._updatePasswordPolicy()).to.be.fulfilled;

      expect(auth._getPasswordPolicyInternal()).to.eql(
        CACHED_PASSWORD_POLICY_UNSUPPORTED_SCHEMA_VERSION
      );
    });

    context('#validatePassword', () => {
      const PASSWORD_POLICY_IMPL = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE
      );
      const PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_NUMERIC
      );
      const TEST_BASIC_PASSWORD = 'password';

      it('password meeting the policy for the project should be considered valid', async () => {
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: true,
          meetsMinPasswordLength: true,
          passwordPolicy: PASSWORD_POLICY_IMPL
        };

        auth = await testAuth();
        const status = await auth.validatePassword(TEST_BASIC_PASSWORD);
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password not meeting the policy for the project should be considered invalid', async () => {
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          passwordPolicy: PASSWORD_POLICY_IMPL
        };

        auth = await testAuth();
        const status = await auth.validatePassword('pass');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password meeting the policy for the tenant should be considered valid', async () => {
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: true,
          meetsMinPasswordLength: true,
          containsNumericCharacter: true,
          passwordPolicy: PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC
        };

        auth = await testAuth();
        auth.tenantId = TEST_TENANT_ID;
        const status = await auth.validatePassword('passw0rd');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password not meeting the policy for the tenant should be considered invalid', async () => {
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          containsNumericCharacter: false,
          passwordPolicy: PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC
        };

        auth = await testAuth();
        auth.tenantId = TEST_TENANT_ID;
        const status = await auth.validatePassword('pass');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('should use the password policy associated with the tenant ID when the tenant ID switches', async () => {
        let expectedValidationStatus: PasswordValidationStatus = {
          isValid: true,
          meetsMinPasswordLength: true,
          passwordPolicy: PASSWORD_POLICY_IMPL
        };

        auth = await testAuth();

        let status = await auth.validatePassword(TEST_BASIC_PASSWORD);
        expect(status).to.eql(expectedValidationStatus);

        expectedValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          containsNumericCharacter: false,
          passwordPolicy: PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC
        };

        auth.tenantId = TEST_TENANT_ID;
        status = await auth.validatePassword(TEST_BASIC_PASSWORD);
        expect(status).to.eql(expectedValidationStatus);
      });

      it('should throw an error when a password policy with an unsupported schema version is received', async () => {
        auth = await testAuth();
        auth.tenantId = TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION;
        await expect(
          auth.validatePassword(TEST_BASIC_PASSWORD)
        ).to.be.rejectedWith(
          AuthErrorCode.UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION
        );
      });

      it('should throw an error when a password policy with an unsupported schema version is already cached', async () => {
        auth = await testAuth();
        auth.tenantId = TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION;
        await auth._updatePasswordPolicy();
        await expect(
          auth.validatePassword(TEST_BASIC_PASSWORD)
        ).to.be.rejectedWith(
          AuthErrorCode.UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION
        );
      });
    });
  });

  describe('AuthStateReady', () => {
    let user: UserInternal;
    let authStateChangedSpy: sinon.SinonSpy;

    beforeEach(async () => {
      user = testUser(auth, 'uid');

      authStateChangedSpy = sinon.spy(auth, 'onAuthStateChanged');

      await auth._updateCurrentUser(null);
    });

    it('immediately returns resolved promise if the user is previously logged in', async () => {
      await auth._updateCurrentUser(user);

      await auth
        .authStateReady()
        .then(() => {
          expect(authStateChangedSpy).to.not.have.been.called;
          expect(auth.currentUser).to.eq(user);
        })
        .catch(error => {
          throw new Error(error);
        });
    });

    it('calls onAuthStateChanged if there is no currentUser available, and returns resolved promise once the user is updated', async () => {
      expect(authStateChangedSpy).to.not.have.been.called;
      const promiseVar = auth.authStateReady();
      expect(authStateChangedSpy).to.be.calledOnce;

      await auth._updateCurrentUser(user);

      await promiseVar
        .then(() => {
          expect(auth.currentUser).to.eq(user);
        })
        .catch(error => {
          throw new Error(error);
        });

      expect(authStateChangedSpy).to.be.calledOnce;
    });

    it('resolves the promise during repeated logout', async () => {
      expect(authStateChangedSpy).to.not.have.been.called;
      const promiseVar = auth.authStateReady();
      expect(authStateChangedSpy).to.be.calledOnce;

      await auth._updateCurrentUser(null);

      await promiseVar
        .then(() => {
          expect(auth.currentUser).to.eq(null);
        })
        .catch(error => {
          throw new Error(error);
        });

      expect(authStateChangedSpy).to.be.calledOnce;
    });

    it('resolves the promise with currentUser being null during log in failure', async () => {
      expect(authStateChangedSpy).to.not.have.been.called;
      const promiseVar = auth.authStateReady();
      expect(authStateChangedSpy).to.be.calledOnce;

      const auth2 = await testAuth();
      Object.assign(auth2.config, { apiKey: 'not-the-right-auth' });
      const user = testUser(auth2, 'uid');
      await expect(auth.updateCurrentUser(user)).to.be.rejectedWith(
        FirebaseError,
        'auth/invalid-user-token'
      );

      await promiseVar
        .then(() => {
          expect(auth.currentUser).to.eq(null);
        })
        .catch(error => {
          throw new Error(error);
        });

      expect(authStateChangedSpy).to.be.calledOnce;
    });

    it('resolves the promise in a delayed user log in process', async () => {
      setTimeout(async () => {
        await auth._updateCurrentUser(user);
      }, 5000);

      const promiseVar = auth.authStateReady();
      expect(auth.currentUser).to.eq(null);
      expect(authStateChangedSpy).to.be.calledOnce;

      await setTimeout(() => {
        promiseVar
          .then(async () => {
            await expect(auth.currentUser).to.eq(user);
          })
          .catch(error => {
            throw new Error(error);
          });
      }, 10000);
    });
  });
});
