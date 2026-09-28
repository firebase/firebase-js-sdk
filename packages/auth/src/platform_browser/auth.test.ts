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
import {
  Auth,
  Persistence,
  PopupRedirectResolver
} from '../model/public_types';
import { OperationType } from '../model/enums';

import {
  FAKE_APP_CHECK_CONTROLLER_PROVIDER,
  FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
  testAuth,
  testUser
} from '../../test/helpers/mock_auth';
import { AuthImpl, DefaultConfig } from '../core/auth/auth_impl';
import { _initializeAuthInstance } from '../core/auth/initialize';
import { AuthErrorCode } from '../core/errors';
import { PersistenceInternal } from '../core/persistence';
import { browserLocalPersistence } from './persistence/local_storage';
import { browserSessionPersistence } from './persistence/session_storage';
import { inMemoryPersistence } from '../core/persistence/in_memory';
import { PersistenceUserManager } from '../core/persistence/persistence_user_manager';
import * as reload from '../core/user/reload';
import { _getInstance } from '../core/util/instantiator';
import { _getClientVersion, ClientPlatform } from '../core/util/version';
import { AuthInternal } from '../model/auth';
import { browserPopupRedirectResolver } from './popup_redirect';
import { PopupRedirectResolverInternal } from '../model/popup_redirect';
import { UserCredentialImpl } from '../core/user/user_credential_impl';
import { UserInternal } from '../model/user';
import { _createError } from '../core/util/assert';
import { makeMockPopupRedirectResolver } from '../../test/helpers/mock_popup_redirect_resolver';
import { MockInstance } from 'vitest';

vi.mock('../core/user/reload', { spy: true });

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

  beforeEach(async () => {
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
    sinon.restore();
    vi.restoreAllMocks();
  });

  describe('#setPersistence', () => {
    it('swaps underlying persistence', async () => {
      const persistenceStub =
        _getInstance<PersistenceInternal>(inMemoryPersistence);
      const getSpy = vi
        .spyOn(persistenceStub, '_get')
        .mockReturnValue(Promise.resolve(testUser(auth, 'test').toJSON()));
      const removeSpy = vi.spyOn(persistenceStub, '_remove');
      const newPersistence = browserLocalPersistence;
      const newStub = _getInstance<PersistenceInternal>(newPersistence);
      const setSpy = vi.spyOn(newStub, '_set');

      await auth.setPersistence(newPersistence);
      expect(getSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith(
        expect.anything(),
        testUser(auth, 'test').toJSON()
      );
    });
  });
});

describe('core/auth/initializeAuth', () => {
  afterEach(() => {
    sinon.restore();
    vi.restoreAllMocks();
  });

  describe('persistence manager creation', () => {
    let createManagerStub: MockInstance;
    let reloadStub: MockInstance;
    let oldAuth: AuthInternal;
    let completeRedirectFnStub: MockInstance;

    beforeEach(async () => {
      vi.clearAllMocks();
      oldAuth = await testAuth();
      createManagerStub = vi.spyOn(PersistenceUserManager, 'create');
      reloadStub = vi
        .spyOn(reload, '_reloadWithoutSaving')
        .mockReturnValue(Promise.resolve());
      completeRedirectFnStub = vi
        .spyOn(
          _getInstance<PopupRedirectResolverInternal>(
            browserPopupRedirectResolver
          ),
          '_completeRedirectFn'
        )
        .mockReturnValue(Promise.resolve(null));
    });

    async function initAndWait(
      persistence: Persistence | Persistence[],
      popupRedirectResolver?: PopupRedirectResolver,
      authDomain = FAKE_APP.options.authDomain,
      blockMiddleware = false
    ): Promise<Auth> {
      const auth = new AuthImpl(
        FAKE_APP,
        FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
        FAKE_APP_CHECK_CONTROLLER_PROVIDER,
        {
          apiKey: FAKE_APP.options.apiKey!,
          apiHost: DefaultConfig.API_HOST,
          apiScheme: DefaultConfig.API_SCHEME,
          tokenApiHost: DefaultConfig.TOKEN_API_HOST,
          authDomain,
          clientPlatform: ClientPlatform.BROWSER,
          sdkClientVersion: _getClientVersion(ClientPlatform.BROWSER)
        }
      );

      _initializeAuthInstance(auth, {
        persistence,
        popupRedirectResolver
      });

      if (blockMiddleware) {
        auth.beforeAuthStateChanged(() => {
          throw new Error('blocked');
        });
      }
      // Auth initializes async. We can make sure the initialization is
      // flushed by awaiting a method on the queue.
      await auth.setPersistence(inMemoryPersistence);
      return auth;
    }

    it('converts single persistence to array', async () => {
      const auth = await initAndWait(inMemoryPersistence);
      expect(createManagerStub).toHaveBeenCalledWith(auth, [
        _getInstance(inMemoryPersistence)
      ]);
    });

    it('pulls the user from storage', async () => {
      vi.spyOn(
        _getInstance<PersistenceInternal>(inMemoryPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(testUser(oldAuth, 'uid').toJSON()));
      const auth = await initAndWait(inMemoryPersistence);
      expect(auth.currentUser!.uid).toBe('uid');
    });

    it('calls create with the persistence in order', async () => {
      const auth = await initAndWait([
        inMemoryPersistence,
        browserLocalPersistence
      ]);
      expect(createManagerStub).toHaveBeenCalledWith(auth, [
        _getInstance(inMemoryPersistence),
        _getInstance(browserLocalPersistence)
      ]);
    });

    it('does not reload redirect users', async () => {
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = 'event-id';
      vi.spyOn(
        _getInstance<PersistenceInternal>(inMemoryPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(user.toJSON()));
      vi.spyOn(
        _getInstance<PersistenceInternal>(browserSessionPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(user.toJSON()));
      await initAndWait(inMemoryPersistence);
      expect(reload._reloadWithoutSaving).not.toHaveBeenCalled();
    });

    it('does not early-initialize the resolver if _shouldInitProactively is false', async () => {
      const popupRedirectResolver = makeMockPopupRedirectResolver();
      const resolverInternal: PopupRedirectResolverInternal = _getInstance(
        popupRedirectResolver
      );
      vi.spyOn(
        resolverInternal,
        '_shouldInitProactively',
        'get'
      ).mockReturnValue(false);
      vi.spyOn(resolverInternal, '_initialize');
      await initAndWait(inMemoryPersistence, popupRedirectResolver);
      expect(resolverInternal._initialize).not.toHaveBeenCalled();
    });

    it('early-initializes the resolver if _shouldInitProactively is true', async () => {
      const popupRedirectResolver = makeMockPopupRedirectResolver();
      const resolverInternal: PopupRedirectResolverInternal = _getInstance(
        popupRedirectResolver
      );
      vi.spyOn(
        resolverInternal,
        '_shouldInitProactively',
        'get'
      ).mockReturnValue(true);
      vi.spyOn(resolverInternal, '_initialize');
      await initAndWait(inMemoryPersistence, popupRedirectResolver);
      expect(resolverInternal._initialize).toHaveBeenCalled();
    });

    it('does not halt init if resolver fails', async () => {
      const popupRedirectResolver = makeMockPopupRedirectResolver();
      const resolverInternal: PopupRedirectResolverInternal = _getInstance(
        popupRedirectResolver
      );
      vi.spyOn(
        resolverInternal,
        '_shouldInitProactively',
        'get'
      ).mockReturnValue(true);
      vi.spyOn(resolverInternal, '_initialize').mockRejectedValue(new Error());
      await expect(
        initAndWait(inMemoryPersistence, popupRedirectResolver)
      ).resolves.toBeDefined();
    });

    it('reloads non-redirect users', async () => {
      vi.spyOn(
        _getInstance<PersistenceInternal>(inMemoryPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(testUser(oldAuth, 'uid').toJSON()));
      vi.spyOn(
        _getInstance<PersistenceInternal>(browserSessionPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(null));

      await initAndWait(inMemoryPersistence);
      expect(reload._reloadWithoutSaving).toHaveBeenCalled();
    });

    it('Does not reload if the event ids match', async () => {
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = 'event-id';

      vi.spyOn(
        _getInstance<PersistenceInternal>(inMemoryPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(user.toJSON()));
      vi.spyOn(
        _getInstance<PersistenceInternal>(browserSessionPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(user.toJSON()));

      await initAndWait(inMemoryPersistence, browserPopupRedirectResolver);
      expect(reload._reloadWithoutSaving).not.toHaveBeenCalled();
    });

    it('Reloads if the event ids do not match', async () => {
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = 'event-id';

      vi.spyOn(
        _getInstance<PersistenceInternal>(inMemoryPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(user.toJSON()));

      user._redirectEventId = 'some-other-id';
      vi.spyOn(
        _getInstance<PersistenceInternal>(browserSessionPersistence),
        '_get'
      ).mockReturnValue(Promise.resolve(user.toJSON()));

      await initAndWait(inMemoryPersistence, browserPopupRedirectResolver);
      expect(reload._reloadWithoutSaving).toHaveBeenCalled();
    });

    it('Nulls out the current user if reload fails', async () => {
      const stub = _getInstance<PersistenceInternal>(inMemoryPersistence);
      vi.spyOn(stub, '_get').mockReturnValue(
        Promise.resolve(testUser(oldAuth, 'uid').toJSON())
      );
      const removeSpy = vi
        .spyOn(stub, '_remove')
        .mockReturnValue(Promise.resolve());
      reloadStub.mockReturnValue(
        Promise.reject(
          _createError(AuthErrorCode.TOKEN_EXPIRED, {
            appName: 'app'
          })
        )
      );

      await initAndWait(inMemoryPersistence);
      expect(removeSpy).toHaveBeenCalled();
    });

    it('Keeps current user if reload fails with network error', async () => {
      const stub = _getInstance<PersistenceInternal>(inMemoryPersistence);
      vi.spyOn(stub, '_get').mockReturnValue(
        Promise.resolve(testUser(oldAuth, 'uid').toJSON())
      );
      const removeSpy = vi
        .spyOn(stub, '_remove')
        .mockReturnValue(Promise.resolve());
      reloadStub.mockReturnValue(
        Promise.reject(
          _createError(AuthErrorCode.NETWORK_REQUEST_FAILED, {
            appName: 'app'
          })
        )
      );

      await initAndWait(inMemoryPersistence);
      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('sets auth name and config', async () => {
      const auth = await initAndWait(inMemoryPersistence);
      expect(auth.name).toBe(FAKE_APP.name);
      expect(auth.config).toEqual({
        apiKey: FAKE_APP.options.apiKey,
        authDomain: FAKE_APP.options.authDomain,
        apiHost: DefaultConfig.API_HOST,
        apiScheme: DefaultConfig.API_SCHEME,
        tokenApiHost: DefaultConfig.TOKEN_API_HOST,
        clientPlatform: ClientPlatform.BROWSER,
        sdkClientVersion: _getClientVersion(ClientPlatform.BROWSER)
      });
    });

    it('initialization sets the callback UID correctly', async () => {
      const stub = _getInstance<PersistenceInternal>(inMemoryPersistence);
      vi.spyOn(stub, '_get').mockReturnValue(
        Promise.resolve(testUser(oldAuth, 'uid').toJSON())
      );
      let authStateChangeCalls = 0;

      const auth = (await initAndWait(inMemoryPersistence)) as AuthInternal;
      auth.onAuthStateChanged(() => {
        authStateChangeCalls++;
      });

      await auth._updateCurrentUser(testUser(auth, 'uid'));
      await new Promise(resolve => {
        setTimeout(resolve, 200);
      });
      expect(authStateChangeCalls).toBe(1);
    });

    describe('#tryRedirectSignIn', () => {
      it('returns null and clears the redirect user in case of error', async () => {
        const stub = _getInstance<PersistenceInternal>(
          browserSessionPersistence
        );
        vi.spyOn(stub, '_isAvailable').mockReturnValue(Promise.resolve(true));
        const removeSpy = vi
          .spyOn(stub, '_remove')
          .mockReturnValue(Promise.resolve());
        completeRedirectFnStub.mockReturnValue(Promise.reject(new Error('no')));

        // Manually initialize auth to make sure no error is thrown,
        // since the _initializeAuthInstance function floats
        const auth = new AuthImpl(
          FAKE_APP,
          FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
          FAKE_APP_CHECK_CONTROLLER_PROVIDER,
          {
            apiKey: FAKE_APP.options.apiKey!,
            apiHost: DefaultConfig.API_HOST,
            apiScheme: DefaultConfig.API_SCHEME,
            tokenApiHost: DefaultConfig.TOKEN_API_HOST,
            authDomain: FAKE_APP.options.authDomain,
            clientPlatform: ClientPlatform.BROWSER,
            sdkClientVersion: _getClientVersion(ClientPlatform.BROWSER)
          }
        );
        await expect(
          auth._initializeWithPersistence(
            [_getInstance(inMemoryPersistence)],
            browserPopupRedirectResolver
          )
        ).resolves.toBeUndefined();

        await initAndWait([inMemoryPersistence], browserPopupRedirectResolver);
        expect(removeSpy).toHaveBeenCalled();
      });

      it('does not run redirect sign in attempt if authDomain not set', async () => {
        await initAndWait(
          [inMemoryPersistence],
          browserPopupRedirectResolver,
          ''
        );
        expect(completeRedirectFnStub).not.toHaveBeenCalled();
      });

      it('signs in the redirect user if found', async () => {
        let user: UserInternal | null = null;
        completeRedirectFnStub.mockImplementation((auth: AuthInternal) => {
          user = testUser(auth, 'uid', 'redirectUser@test.com');
          return Promise.resolve(
            new UserCredentialImpl({
              operationType: OperationType.SIGN_IN,
              user,
              providerId: null
            })
          );
        });

        const auth = await initAndWait(
          [inMemoryPersistence],
          browserPopupRedirectResolver
        );
        expect(user).not.toBeNull();
        expect(auth.currentUser).toBe(user);
      });

      it('does not halt old user load if middleware throws', async () => {
        const stub = _getInstance<PersistenceInternal>(inMemoryPersistence);
        const oldUser = testUser(oldAuth, 'old-uid');
        vi.spyOn(stub, '_get').mockReturnValue(
          Promise.resolve(oldUser.toJSON())
        );
        const overrideSpy = vi.spyOn(
          _getInstance<PopupRedirectResolverInternal>(
            browserPopupRedirectResolver
          ),
          '_overrideRedirectResult'
        );
        const auth = await initAndWait(
          [inMemoryPersistence],
          browserPopupRedirectResolver,
          FAKE_APP.options.authDomain,
          /* blockMiddleware */ true
        );

        expect(auth.currentUser!.uid).toBe(oldUser.uid);
        expect(reload._reloadWithoutSaving).toHaveBeenCalled();
        expect(overrideSpy).not.toHaveBeenCalled();
      });

      it('Reloads and uses old user if middleware throws', async () => {
        const stub = _getInstance<PersistenceInternal>(inMemoryPersistence);
        const oldUser = testUser(oldAuth, 'old-uid');
        vi.spyOn(stub, '_get').mockReturnValue(
          Promise.resolve(oldUser.toJSON())
        );
        const overrideSpy = vi.spyOn(
          _getInstance<PopupRedirectResolverInternal>(
            browserPopupRedirectResolver
          ),
          '_overrideRedirectResult'
        );

        let user: UserInternal | null = null;
        completeRedirectFnStub.mockImplementation((auth: AuthInternal) => {
          user = testUser(auth, 'uid', 'redirectUser@test.com');
          return Promise.resolve(
            new UserCredentialImpl({
              operationType: OperationType.SIGN_IN,
              user,
              providerId: null
            })
          );
        });

        const auth = await initAndWait(
          [inMemoryPersistence],
          browserPopupRedirectResolver,
          FAKE_APP.options.authDomain,
          /* blockMiddleware */ true
        );
        expect(user).not.toBeNull();
        expect(auth.currentUser!.uid).toBe(oldUser.uid);
        expect(reload._reloadWithoutSaving).toHaveBeenCalled();
        expect(overrideSpy).toHaveBeenCalled();
      });

      it('Nulls current user if redirect blocked by middleware', async () => {
        const stub = _getInstance<PersistenceInternal>(inMemoryPersistence);
        vi.spyOn(stub, '_get').mockReturnValue(Promise.resolve(null));
        completeRedirectFnStub.mockImplementation((auth: AuthInternal) => {
          const user = testUser(auth, 'uid', 'redirectUser@test.com');
          return Promise.resolve(
            new UserCredentialImpl({
              operationType: OperationType.SIGN_IN,
              user,
              providerId: null
            })
          );
        });

        const auth = await initAndWait(
          [inMemoryPersistence],
          browserPopupRedirectResolver,
          FAKE_APP.options.authDomain,
          /* blockMiddleware */ true
        );
        expect(completeRedirectFnStub).toHaveBeenCalled();
        expect(auth.currentUser).toBeNull();
        expect(reload._reloadWithoutSaving).not.toHaveBeenCalled();
      });
    });
  });
});
