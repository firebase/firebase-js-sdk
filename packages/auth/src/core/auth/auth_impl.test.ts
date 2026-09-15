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
import { PersistenceInternal, PersistenceType } from '../persistence';
import { inMemoryPersistence } from '../persistence/in_memory';
import { _getInstance } from '../util/instantiator';
import * as navigator from '../util/navigator';
import * as reload from '../user/reload';

vi.mock('../util/navigator', { spy: true });
vi.mock('../user/reload', { spy: true });
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
import { MockInstance } from 'vitest';
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
  let persistenceStub: any;

  beforeEach(async () => {
    persistenceStub = _getInstance(inMemoryPersistence);
    vi.spyOn(persistenceStub, '_get');
    vi.spyOn(persistenceStub, '_set');
    vi.spyOn(persistenceStub, '_remove');
    vi.spyOn(persistenceStub, '_addListener');
    vi.spyOn(persistenceStub, '_removeListener');
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('#updateCurrentUser', () => {
    it('sets the field on the auth object', async () => {
      const user = testUser(auth, 'uid');
      await auth._updateCurrentUser(user);
      expect(auth.currentUser).toBe(user);
    });

    it('public version makes a copy', async () => {
      const user = testUser(auth, 'uid');
      await auth.updateCurrentUser(user);

      // currentUser should deeply equal the user passed in, but should be a
      // different block in memory.
      expect(auth.currentUser).not.toBe(user);
      expect(auth.currentUser).toEqual(user);
    });

    it('public version throws if the auth is mismatched', async () => {
      const auth2 = await testAuth();
      Object.assign(auth2.config, { apiKey: 'not-the-right-auth' });
      const user = testUser(auth2, 'uid');
      await expect(auth.updateCurrentUser(user)).rejects.toThrow(
        FirebaseError,
        'auth/invalid-user-token'
      );
    });

    it('orders async operations correctly', async () => {
      const users = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
        return testUser(auth, `${n}`);
      });

      persistenceStub._set.mockImplementation(() => {
        return new Promise(resolve => {
          // Force into the async flow to make this test actually meaningful
          setTimeout(() => resolve(), 1);
        });
      });

      await Promise.all(users.map(u => auth._updateCurrentUser(u)));
      for (let i = 0; i < 10; i++) {
        expect(persistenceStub._set).toHaveBeenNthCalledWith(
          i + 1,
          expect.anything(),
          users[i].toJSON()
        );
      }
    });

    it('setting to null triggers a remove call', async () => {
      await auth._updateCurrentUser(null);
      expect(persistenceStub._remove).toHaveBeenCalled();
    });

    it('should throw an error if the user is from a different tenant', async () => {
      const user = testUser(auth, 'uid');
      user.tenantId = 'other-tenant-id';
      await expect(auth._updateCurrentUser(user)).rejects.toThrow(
        FirebaseError,
        '(auth/tenant-id-mismatch)'
      );
    });

    it('wraps persistence setCurrentUser failure into FirebaseError (auth/internal-error)', async () => {
      const user = testUser(auth, 'uid');
      const originalError = new Error('Database is closing');
      persistenceStub._set.mockRejectedValue(originalError);

      let caughtError: any;
      try {
        await auth._updateCurrentUser(user);
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toBeInstanceOf(FirebaseError);
      expect(caughtError.code).toBe('auth/internal-error');
      expect(caughtError.message).toContain('Database is closing');
      expect(caughtError.customData?.originalError).toBe(originalError);
    });

    it('wraps persistence removeCurrentUser failure into FirebaseError (auth/internal-error)', async () => {
      const originalError = new Error('IndexedDB access denied');
      persistenceStub._remove.mockRejectedValue(originalError);

      let caughtError: any;
      try {
        await auth._updateCurrentUser(null);
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toBeInstanceOf(FirebaseError);
      expect(caughtError.code).toBe('auth/internal-error');
      expect(caughtError.message).toContain('IndexedDB access denied');
      expect(caughtError.customData?.originalError).toBe(originalError);
    });
  });

  describe('#signOut', () => {
    it('sets currentUser to null, calls remove', async () => {
      await auth._updateCurrentUser(testUser(auth, 'test'));
      await auth.signOut();
      expect(persistenceStub._remove).toHaveBeenCalled();
      expect(auth.currentUser).toBeNull();
    });
    it('is blocked if a beforeAuthStateChanged callback throws', async () => {
      await auth._updateCurrentUser(testUser(auth, 'test'));
      auth.beforeAuthStateChanged(
        vi.fn().mockImplementation(() => {
          throw new Error();
        })
      );
      await expect(auth.signOut()).rejects.toThrow(AuthErrorCode.LOGIN_BLOCKED);
    });
  });

  describe('#useDeviceLanguage', () => {
    it('should update the language code', () => {
      const mock = vi.spyOn(navigator, '_getUserLanguage');
      mock.mockImplementation(() => 'jp');
      expect(auth.languageCode).toBeNull();
      auth.useDeviceLanguage();
      expect(auth.languageCode).toBe('jp');
    });
  });

  describe('change listeners', () => {
    // // Helpers to convert auth state change results to promise
    // function onAuthStateChange(callback: NextFn<User|null>)

    it('immediately calls authStateChange if initialization finished', async () => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = true;
      await new Promise<void>(resolve => {
        auth.onAuthStateChanged(u => {
          expect(u).toBe(user);
          resolve();
        });
      });
    });

    it('waits for initialization for authStateChange', async () => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = false;
      await new Promise<void>(resolve => {
        auth.onAuthStateChanged(u => {
          expect(u).toBe(user);
          resolve();
        });
      });
    });

    it('immediately calls idTokenChange if initialization finished', async () => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = true;
      await new Promise<void>(resolve => {
        auth.onIdTokenChanged(u => {
          expect(u).toBe(user);
          resolve();
        });
      });
    });

    it('waits for initialization for idTokenChanged', async () => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = false;
      await new Promise<void>(resolve => {
        auth.onIdTokenChanged(u => {
          expect(u).toBe(user);
          resolve();
        });
      });
    });

    it('immediate callback is done async', () => {
      auth._isInitialized = true;
      let callbackCalled = false;
      auth.onIdTokenChanged(() => {
        callbackCalled = true;
      });

      expect(callbackCalled).toBe(false);
    });

    describe('user logs in/out, tokens refresh', () => {
      let user: UserInternal;
      let authStateCallback: MockInstance;
      let idTokenCallback: MockInstance;
      let beforeAuthCallback: MockInstance;

      beforeEach(() => {
        user = testUser(auth, 'uid');
        authStateCallback = vi.fn();
        idTokenCallback = vi.fn();
        beforeAuthCallback = vi.fn();
      });

      describe('initially currentUser is null', () => {
        beforeEach(async () => {
          auth.onAuthStateChanged(authStateCallback);
          auth.onIdTokenChanged(idTokenCallback);
          auth.beforeAuthStateChanged(beforeAuthCallback);
          await auth._updateCurrentUser(null);
          authStateCallback.mockClear();
          idTokenCallback.mockClear();
          beforeAuthCallback.mockClear();
        });

        it('onAuthStateChange triggers on log in', async () => {
          await auth._updateCurrentUser(user);
          expect(authStateCallback).toHaveBeenCalledWith(user);
        });

        it('onIdTokenChange triggers on log in', async () => {
          await auth._updateCurrentUser(user);
          expect(idTokenCallback).toHaveBeenCalledWith(user);
        });

        it('beforeAuthStateChanged triggers on log in', async () => {
          await auth._updateCurrentUser(user);
          expect(beforeAuthCallback).toHaveBeenCalledWith(user);
        });
      });

      describe('initially currentUser is user', () => {
        beforeEach(async () => {
          auth.onAuthStateChanged(authStateCallback);
          auth.onIdTokenChanged(idTokenCallback);
          auth.beforeAuthStateChanged(beforeAuthCallback);
          await auth._updateCurrentUser(user);
          authStateCallback.mockClear();
          idTokenCallback.mockClear();
          beforeAuthCallback.mockClear();
        });

        it('onAuthStateChange triggers on log out', async () => {
          await auth._updateCurrentUser(null);
          expect(authStateCallback).toHaveBeenCalledWith(null);
        });

        it('onIdTokenChange triggers on log out', async () => {
          await auth._updateCurrentUser(null);
          expect(idTokenCallback).toHaveBeenCalledWith(null);
        });

        it('beforeAuthStateChanged triggers on log out', async () => {
          await auth._updateCurrentUser(null);
          expect(beforeAuthCallback).toHaveBeenCalledWith(null);
        });

        it('onAuthStateChange does not trigger for user props change', async () => {
          user.photoURL = 'blah';
          await auth._updateCurrentUser(user);
          expect(authStateCallback).not.toHaveBeenCalled();
        });

        it('onIdTokenChange triggers for user props change', async () => {
          user.photoURL = 'hey look I changed';
          await auth._updateCurrentUser(user);
          expect(idTokenCallback).toHaveBeenCalledWith(user);
        });

        it('onAuthStateChange triggers if uid changes', async () => {
          const newUser = testUser(auth, 'different-uid');
          await auth._updateCurrentUser(newUser);
          expect(authStateCallback).toHaveBeenCalledWith(newUser);
        });
      });

      describe('with Proactive Refresh', () => {
        let oldUser: UserInternal;

        beforeEach(() => {
          oldUser = testUser(auth, 'old-user-uid');

          for (const u of [user, oldUser]) {
            vi.spyOn(u, '_startProactiveRefresh');
            vi.spyOn(u, '_stopProactiveRefresh');
          }
        });

        it('null -> user: does not turn on if not enabled', async () => {
          await auth._updateCurrentUser(null);
          await auth._updateCurrentUser(user);

          expect(user._startProactiveRefresh).not.toHaveBeenCalled();
        });

        it('null -> user: turns on if enabled', async () => {
          await auth._updateCurrentUser(null);
          auth._startProactiveRefresh();
          await auth._updateCurrentUser(user);

          expect(user._startProactiveRefresh).toHaveBeenCalled();
        });

        it('user -> user: does not turn on if not enabled', async () => {
          await auth._updateCurrentUser(oldUser);
          await auth._updateCurrentUser(user);

          expect(user._startProactiveRefresh).not.toHaveBeenCalled();
        });

        it('user -> user: turns on if enabled', async () => {
          auth._startProactiveRefresh();
          await auth._updateCurrentUser(oldUser);
          await auth._updateCurrentUser(user);

          expect(oldUser._stopProactiveRefresh).toHaveBeenCalled();
          expect(user._startProactiveRefresh).toHaveBeenCalled();
        });

        it('calling start on auth triggers user to start', async () => {
          await auth._updateCurrentUser(user);
          auth._startProactiveRefresh();

          expect(user._startProactiveRefresh).toHaveBeenCalledTimes(1);
        });

        it('calling stop stops the refresh on the current user', async () => {
          auth._startProactiveRefresh();
          await auth._updateCurrentUser(user);
          auth._stopProactiveRefresh();

          expect(user._stopProactiveRefresh).toHaveBeenCalled();
        });
      });

      it('onAuthStateChange works for multiple listeners', async () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        auth.onAuthStateChanged(cb1);
        auth.onAuthStateChanged(cb2);
        await auth._updateCurrentUser(null);
        cb1.mockClear();
        cb2.mockClear();

        await auth._updateCurrentUser(user);
        expect(cb1).toHaveBeenCalledWith(user);
        expect(cb2).toHaveBeenCalledWith(user);
      });

      it('onIdTokenChange works for multiple listeners', async () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        auth.onIdTokenChanged(cb1);
        auth.onIdTokenChanged(cb2);
        await auth._updateCurrentUser(null);
        cb1.mockClear();
        cb2.mockClear();

        await auth._updateCurrentUser(user);
        expect(cb1).toHaveBeenCalledWith(user);
        expect(cb2).toHaveBeenCalledWith(user);
      });

      it('beforeAuthStateChange works for multiple listeners', async () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        auth.beforeAuthStateChanged(cb1);
        auth.beforeAuthStateChanged(cb2);
        await auth._updateCurrentUser(null);
        cb1.mockClear();
        cb2.mockClear();

        await auth._updateCurrentUser(user);
        expect(cb1).toHaveBeenCalledWith(user);
        expect(cb2).toHaveBeenCalledWith(user);
      });

      it('_updateCurrentUser throws if a beforeAuthStateChange callback throws', async () => {
        await auth._updateCurrentUser(null);
        const cb1 = vi.fn().mockImplementation(() => {
          throw new Error();
        });
        const cb2 = vi.fn();
        auth.beforeAuthStateChanged(cb1);
        auth.beforeAuthStateChanged(cb2);

        await expect(auth._updateCurrentUser(user)).rejects.toThrow(
          AuthErrorCode.LOGIN_BLOCKED
        );
        expect(cb2).not.toHaveBeenCalled();
      });

      it('_updateCurrentUser throws if a beforeAuthStateChange callback rejects', async () => {
        await auth._updateCurrentUser(null);
        const cb1 = vi.fn().mockRejectedValue();
        const cb2 = vi.fn();
        auth.beforeAuthStateChanged(cb1);
        auth.beforeAuthStateChanged(cb2);

        await expect(auth._updateCurrentUser(user)).rejects.toThrow(
          AuthErrorCode.LOGIN_BLOCKED
        );
        expect(cb2).not.toHaveBeenCalled();
      });
    });
  });

  describe('#_onStorageEvent', () => {
    let authStateCallback: MockInstance;
    let idTokenCallback: MockInstance;
    let beforeStateCallback: MockInstance;

    beforeEach(async () => {
      authStateCallback = vi.fn();
      idTokenCallback = vi.fn();
      beforeStateCallback = vi.fn();
      auth.onAuthStateChanged(authStateCallback);
      auth.onIdTokenChanged(idTokenCallback);
      auth.beforeAuthStateChanged(beforeStateCallback);
      await auth._updateCurrentUser(null); // force event handlers to clear out
      authStateCallback.mockClear();
      idTokenCallback.mockClear();
      beforeStateCallback.mockClear();
    });

    describe('previously logged out', () => {
      describe('still logged out', () => {
        it('should do nothing', async () => {
          await auth._onStorageEvent();

          expect(authStateCallback).not.toHaveBeenCalled();
          expect(idTokenCallback).not.toHaveBeenCalled();
          expect(beforeStateCallback).not.toHaveBeenCalled();
        });
      });

      describe('now logged in', () => {
        let user: UserInternal;

        beforeEach(() => {
          user = testUser(auth, 'uid');
          persistenceStub._get.mockReturnValue(Promise.resolve(user.toJSON()));
        });

        it('should update the current user', async () => {
          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).toEqual(user.toJSON());
          expect(authStateCallback).toHaveBeenCalled();
          expect(idTokenCallback).toHaveBeenCalled();
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.toHaveBeenCalled();
        });
      });
    });

    describe('previously logged in', () => {
      let user: UserInternal;

      beforeEach(async () => {
        user = testUser(auth, 'uid', undefined, true);
        await auth._updateCurrentUser(user);
        authStateCallback.mockClear();
        idTokenCallback.mockClear();
        beforeStateCallback.mockClear();
      });

      describe('now logged out', () => {
        beforeEach(() => {
          persistenceStub._get.mockReturnValue(Promise.resolve(null));
        });

        it('should log out', async () => {
          await auth._onStorageEvent();

          expect(auth.currentUser).toBeNull();
          expect(authStateCallback).toHaveBeenCalled();
          expect(idTokenCallback).toHaveBeenCalled();
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.toHaveBeenCalled();
        });
      });

      describe('still logged in as same user', () => {
        it('should do nothing if nothing changed', async () => {
          persistenceStub._get.mockReturnValue(Promise.resolve(user.toJSON()));

          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).toEqual(user.toJSON());
          expect(authStateCallback).not.toHaveBeenCalled();
          expect(idTokenCallback).not.toHaveBeenCalled();
          expect(beforeStateCallback).not.toHaveBeenCalled();
        });

        it('should update fields if they have changed', async () => {
          const userObj = user.toJSON();
          userObj['displayName'] = 'other-name';
          persistenceStub._get.mockReturnValue(Promise.resolve(userObj));

          await auth._onStorageEvent();

          expect(auth.currentUser?.uid).toBe(user.uid);
          expect(auth.currentUser?.displayName).toBe('other-name');
          expect(authStateCallback).not.toHaveBeenCalled();
          expect(idTokenCallback).not.toHaveBeenCalled();
          expect(beforeStateCallback).not.toHaveBeenCalled();
        });

        it('should update tokens if they have changed', async () => {
          const userObj = user.toJSON();
          (userObj['stsTokenManager'] as any)['accessToken'] =
            'new-access-token';
          persistenceStub._get.mockReturnValue(Promise.resolve(userObj));

          await auth._onStorageEvent();

          expect(auth.currentUser?.uid).toBe(user.uid);
          expect(
            (auth.currentUser as UserInternal)?.stsTokenManager.accessToken
          ).toBe('new-access-token');
          expect(authStateCallback).not.toHaveBeenCalled();
          expect(idTokenCallback).toHaveBeenCalled();
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.toHaveBeenCalled();
        });
      });

      describe('now logged in as different user', () => {
        it('should re-login as the new user', async () => {
          const newUser = testUser(auth, 'other-uid', undefined, true);
          persistenceStub._get.mockReturnValue(
            Promise.resolve(newUser.toJSON())
          );

          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).toEqual(newUser.toJSON());
          expect(authStateCallback).toHaveBeenCalled();
          expect(idTokenCallback).toHaveBeenCalled();
          // This should never be called on a storage event.
          expect(beforeStateCallback).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('#_delete', () => {
    beforeEach(async () => {
      vi.spyOn(reload, '_reloadWithoutSaving').mockReturnValue(
        Promise.resolve()
      );
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

      persistenceStub._get.mockReturnValue(
        Promise.resolve(testUser(auth, 'uid').toJSON())
      );
      await authImpl._delete();
      await authImpl._initializeWithPersistence([
        persistenceStub as PersistenceInternal
      ]);
      expect(authImpl.currentUser).toBeNull();
    });

    it('no longer calls listeners', async () => {
      const spy = vi.fn();
      auth.onAuthStateChanged(spy);
      await Promise.resolve();
      spy.mockClear();
      await (auth as AuthImpl)._delete();
      await auth._updateCurrentUser(testUser(auth, 'blah'));
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('#_getAdditionalHeaders', () => {
    it('always adds the client version', async () => {
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v'
      });
    });

    it('adds the gmp app ID if available', async () => {
      auth.app.options.appId = 'app-id';
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v',
        'X-Firebase-gmpid': 'app-id'
      });
      delete auth.app.options.appId;
    });

    it('adds the heartbeat if available', async () => {
      vi.spyOn(
        FAKE_HEARTBEAT_CONTROLLER,
        'getHeartbeatsHeader'
      ).mockReturnValue(Promise.resolve('heartbeat'));
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v',
        'X-Firebase-Client': 'heartbeat'
      });
    });

    it('does not add heartbeat if none returned', async () => {
      vi.spyOn(
        FAKE_HEARTBEAT_CONTROLLER,
        'getHeartbeatsHeader'
      ).mockReturnValue(Promise.resolve(''));
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v'
      });
    });

    it('does not add heartbeat if controller unavailable', async () => {
      vi.spyOn(
        FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
        'getImmediate'
      ).mockReturnValue(undefined as any);
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v'
      });
    });

    it('adds the App Check token if available', async () => {
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        Promise.resolve({ token: 'fake-token' })
      );
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v',
        'X-Firebase-AppCheck': 'fake-token'
      });
    });

    it('does not add the App Check token if none returned', async () => {
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        Promise.resolve({ token: '' })
      );
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v'
      });
    });

    it('does not add the App Check token if controller unavailable', async () => {
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        undefined as any
      );
      expect(await auth._getAdditionalHeaders()).toEqual({
        'X-Client-Version': 'v'
      });
    });
  });

  describe('recaptchaEnforcementState', () => {
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
      recaptchaEnforcementState: [
        {
          'enforcementState': 'ENFORCE',
          'provider': 'EMAIL_PASSWORD_PROVIDER'
        }
      ],
      siteKey: 'site-key'
    };
    const cachedRecaptchaConfigOFF = {
      recaptchaEnforcementState: [
        {
          'enforcementState': 'OFF',
          'provider': 'EMAIL_PASSWORD_PROVIDER'
        }
      ],
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

      expect(auth._getRecaptchaConfig()).toEqual(cachedRecaptchaConfigEnforce);
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

      expect(auth._getRecaptchaConfig()).toEqual(cachedRecaptchaConfigOFF);
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
      expect(auth._getRecaptchaConfig()).toEqual(cachedRecaptchaConfigEnforce);
      auth.tenantId = 'tenant-id';
      expect(auth._getRecaptchaConfig()).toEqual(cachedRecaptchaConfigOFF);
    });
  });

  describe('passwordPolicy', () => {
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

      expect(auth._getPasswordPolicyInternal()).toEqual(CACHED_PASSWORD_POLICY);
    });

    it('password policy should be set for tenant if tenant ID is not null', async () => {
      auth = await testAuth();
      auth.tenantId = TEST_TENANT_ID;
      await auth._updatePasswordPolicy();

      expect(auth._getPasswordPolicyInternal()).toEqual(
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
      expect(auth._getPasswordPolicyInternal()).toEqual(CACHED_PASSWORD_POLICY);
      auth.tenantId = TEST_TENANT_ID;
      expect(auth._getPasswordPolicyInternal()).toEqual(
        CACHED_PASSWORD_POLICY_REQUIRE_NUMERIC
      );
      auth.tenantId = 'other-tenant-id';
      expect(auth._getPasswordPolicyInternal()).toBeUndefined();
    });

    it('password policy should still be set when the schema version is not supported', async () => {
      auth = await testAuth();
      auth.tenantId = TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION;
      await expect(auth._updatePasswordPolicy()).resolves.not.toThrow();

      expect(auth._getPasswordPolicyInternal()).toEqual(
        CACHED_PASSWORD_POLICY_UNSUPPORTED_SCHEMA_VERSION
      );
    });

    describe('#validatePassword', () => {
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
        expect(status).toEqual(expectedValidationStatus);
      });

      it('password not meeting the policy for the project should be considered invalid', async () => {
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          passwordPolicy: PASSWORD_POLICY_IMPL
        };

        auth = await testAuth();
        const status = await auth.validatePassword('pass');
        expect(status).toEqual(expectedValidationStatus);
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
        expect(status).toEqual(expectedValidationStatus);
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
        expect(status).toEqual(expectedValidationStatus);
      });

      it('should use the password policy associated with the tenant ID when the tenant ID switches', async () => {
        let expectedValidationStatus: PasswordValidationStatus = {
          isValid: true,
          meetsMinPasswordLength: true,
          passwordPolicy: PASSWORD_POLICY_IMPL
        };

        auth = await testAuth();

        let status = await auth.validatePassword(TEST_BASIC_PASSWORD);
        expect(status).toEqual(expectedValidationStatus);

        expectedValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          containsNumericCharacter: false,
          passwordPolicy: PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC
        };

        auth.tenantId = TEST_TENANT_ID;
        status = await auth.validatePassword(TEST_BASIC_PASSWORD);
        expect(status).toEqual(expectedValidationStatus);
      });

      it('should throw an error when a password policy with an unsupported schema version is received', async () => {
        auth = await testAuth();
        auth.tenantId = TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION;
        await expect(
          auth.validatePassword(TEST_BASIC_PASSWORD)
        ).rejects.toThrow(
          AuthErrorCode.UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION
        );
      });

      it('should throw an error when a password policy with an unsupported schema version is already cached', async () => {
        auth = await testAuth();
        auth.tenantId = TEST_TENANT_ID_UNSUPPORTED_POLICY_VERSION;
        await auth._updatePasswordPolicy();
        await expect(
          auth.validatePassword(TEST_BASIC_PASSWORD)
        ).rejects.toThrow(
          AuthErrorCode.UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION
        );
      });
    });
  });

  describe('AuthStateReady', () => {
    let user: UserInternal;
    let authStateChangedSpy: MockInstance;

    beforeEach(async () => {
      user = testUser(auth, 'uid');

      authStateChangedSpy = vi.spyOn(auth, 'onAuthStateChanged');

      await auth._updateCurrentUser(null);
    });

    it('immediately returns resolved promise if the user is previously logged in', async () => {
      await auth._updateCurrentUser(user);

      await auth
        .authStateReady()
        .then(() => {
          expect(authStateChangedSpy).not.toHaveBeenCalled();
          expect(auth.currentUser).toBe(user);
        })
        .catch(error => {
          throw new Error(error);
        });
    });

    it('calls onAuthStateChanged if there is no currentUser available, and returns resolved promise once the user is updated', async () => {
      expect(authStateChangedSpy).not.toHaveBeenCalled();
      const promiseVar = auth.authStateReady();
      expect(authStateChangedSpy).toHaveBeenCalledTimes(1);

      await auth._updateCurrentUser(user);

      await promiseVar
        .then(() => {
          expect(auth.currentUser).toBe(user);
        })
        .catch(error => {
          throw new Error(error);
        });

      expect(authStateChangedSpy).toHaveBeenCalledTimes(1);
    });

    it('resolves the promise during repeated logout', async () => {
      expect(authStateChangedSpy).not.toHaveBeenCalled();
      const promiseVar = auth.authStateReady();
      expect(authStateChangedSpy).toHaveBeenCalledTimes(1);

      await auth._updateCurrentUser(null);

      await promiseVar
        .then(() => {
          expect(auth.currentUser).toBe(null);
        })
        .catch(error => {
          throw new Error(error);
        });

      expect(authStateChangedSpy).toHaveBeenCalledTimes(1);
    });

    it('resolves the promise with currentUser being null during log in failure', async () => {
      expect(authStateChangedSpy).not.toHaveBeenCalled();
      const promiseVar = auth.authStateReady();
      expect(authStateChangedSpy).toHaveBeenCalledTimes(1);

      const auth2 = await testAuth();
      Object.assign(auth2.config, { apiKey: 'not-the-right-auth' });
      const user = testUser(auth2, 'uid');
      await expect(auth.updateCurrentUser(user)).rejects.toThrow(
        FirebaseError,
        'auth/invalid-user-token'
      );

      await promiseVar
        .then(() => {
          expect(auth.currentUser).toBe(null);
        })
        .catch(error => {
          throw new Error(error);
        });

      expect(authStateChangedSpy).toHaveBeenCalledTimes(1);
    });

    it('resolves the promise in a delayed user log in process', async () => {
      setTimeout(async () => {
        await auth._updateCurrentUser(user);
      }, 5000);

      const promiseVar = auth.authStateReady();
      expect(auth.currentUser).toBe(null);
      expect(authStateChangedSpy).toHaveBeenCalledTimes(1);

      await setTimeout(() => {
        promiseVar
          .then(async () => {
            await expect(auth.currentUser).toBe(user);
          })
          .catch(error => {
            throw new Error(error);
          });
      }, 10000);
    });
  });

  describe('_initializeWithPersistence error boundaries and fallbacks', () => {
    it('falls back to in-memory persistence when persistence manager creation fails', async () => {
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

      const erroringPersistence: PersistenceInternal = {
        type: PersistenceType.LOCAL,
        _isAvailable: () => Promise.reject(new Error('Storage disabled')),
        _set: async () => {},
        _get: async () => null,
        _remove: async () => {},
        _addListener: () => {
          throw new Error('Storage disabled');
        },
        _removeListener: () => {},
        _shouldAllowMigration: false
      };

      await authImpl._initializeWithPersistence([erroringPersistence]);
      expect(authImpl._isInitialized).toBe(true);
      expect(authImpl.currentUser).toBeNull();
      await expect(
        authImpl._persistenceManagerAvailable
      ).resolves.not.toThrow();
      await expect(authImpl.authStateReady()).resolves.not.toThrow();
    });

    it('falls back to currentUser = null when initializeCurrentUser fails', async () => {
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

      vi.spyOn(authImpl as any, 'initializeCurrentUser').mockRejectedValue(
        new Error('Corrupt storage')
      );

      await authImpl._initializeWithPersistence([
        _getInstance(inMemoryPersistence)
      ]);
      expect(authImpl._isInitialized).toBe(true);
      expect(authImpl.currentUser).toBeNull();
      await expect(authImpl.authStateReady()).resolves.not.toThrow();
    });
  });

  describe('registerStateListener rejection handling', () => {
    it('calls observer error callback if initialization promise rejects', async () => {
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

      const initError = new Error('Fatal initialization failure');
      (authImpl as any)._initializationPromise = Promise.reject(initError);

      const nextSpy = vi.fn();
      const errorSpy = vi.fn();

      authImpl.onAuthStateChanged({
        next: nextSpy,
        error: errorSpy,
        complete: vi.fn()
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(nextSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(initError);
    });

    it('calls error function parameter if initialization promise rejects', async () => {
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

      const initError = new Error('Fatal initialization failure');
      (authImpl as any)._initializationPromise = Promise.reject(initError);

      const nextSpy = vi.fn();
      const errorSpy = vi.fn();

      authImpl.onAuthStateChanged(nextSpy, errorSpy);

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(nextSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(initError);
    });
  });
});
