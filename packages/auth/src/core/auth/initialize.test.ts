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

import {
  deleteApp,
  initializeApp,
  FirebaseApp,
  _FirebaseService
} from '@firebase/app';
import {
  Auth,
  AuthProvider,
  Persistence as PersistencePublic,
  PopupRedirectResolver,
  UserCredential
} from '../../model/public_types';
import { isNode } from '@firebase/util';

import { expect } from 'chai';
import { inMemoryPersistence } from '../../../internal';

import { AuthInternal } from '../../model/auth';
import {
  PopupRedirectResolverInternal,
  AuthEventType,
  EventManager,
  AuthEventConsumer
} from '../../model/popup_redirect';
import { AuthPopup } from '../../platform_browser/util/popup';
import {
  PersistenceInternal,
  PersistenceType,
  PersistenceValue,
  StorageEventListener
} from '../persistence';
import { ClientPlatform, _getClientVersion } from '../util/version';
import { initializeAuth } from './initialize';
import { registerAuth } from './register';
import { debugErrorMap, prodErrorMap } from '../errors';

describe('core/auth/initialize', () => {
  let fakeApp: FirebaseApp;

  class FakeSessionPersistence implements PersistenceInternal {
    static type: 'SESSION' = 'SESSION';
    readonly type = PersistenceType.SESSION;
    storage: Record<string, PersistenceValue> = {};

    async _isAvailable(): Promise<boolean> {
      return true;
    }
    async _set(_key: string, _value: PersistenceValue): Promise<void> {
      return;
    }
    async _get<T extends PersistenceValue>(_key: string): Promise<T | null> {
      return null;
    }
    async _remove(_key: string): Promise<void> {
      return;
    }
    _addListener(_key: string, _listener: StorageEventListener): void {
      return;
    }
    _removeListener(_key: string, _listener: StorageEventListener): void {
      return;
    }
  }

  const fakeSessionPersistence: PersistencePublic = FakeSessionPersistence;

  class FakePopupRedirectResolver implements PopupRedirectResolverInternal {
    readonly _redirectPersistence = fakeSessionPersistence;

    async _initialize(_auth: AuthInternal): Promise<EventManager> {
      return new (class implements EventManager {
        registerConsumer(_authEventConsumer: AuthEventConsumer): void {
          return;
        }
        unregisterConsumer(_authEventConsumer: AuthEventConsumer): void {
          return;
        }
      })();
    }
    async _openPopup(
      _auth: AuthInternal,
      _provider: AuthProvider,
      _authType: AuthEventType,
      _eventId?: string
    ): Promise<AuthPopup> {
      return new AuthPopup(null);
    }
    _openRedirect(
      _auth: AuthInternal,
      _provider: AuthProvider,
      _authType: AuthEventType,
      _eventId?: string
    ): Promise<never> {
      return new Promise((_, reject) => reject());
    }
    _isIframeWebStorageSupported(
      _auth: AuthInternal,
      cb: (support: boolean) => unknown
    ): void {
      cb(true);
    }
    async _originValidation(): Promise<void> {}
    _shouldInitProactively = false;
    async _completeRedirectFn(
      _auth: Auth,
      _resolver: PopupRedirectResolver,
      _bypassAuthState: boolean
    ): Promise<UserCredential | null> {
      return null;
    }
    async _overrideRedirectResult(): Promise<void> {}
  }

  const fakePopupRedirectResolver: PopupRedirectResolver =
    FakePopupRedirectResolver;

  before(() => {
    registerAuth(ClientPlatform.BROWSER);
  });

  beforeEach(() => {
    fakeApp = initializeApp({
      apiKey: 'fake-key',
      appId: 'fake-app-id',
      authDomain: 'fake-auth-domain:9999'
    });
  });

  afterEach(async () => {
    await deleteApp(fakeApp);
  });

  describe('initializeAuth', () => {
    it('should work with no deps', async () => {
      const auth = initializeAuth(fakeApp) as AuthInternal;
      await auth._initializationPromise;

      expect(auth.name).to.eq(fakeApp.name);
      const expectedClientPlatform = isNode()
        ? ClientPlatform.NODE
        : ClientPlatform.BROWSER;
      const expectedSdkClientVersion = _getClientVersion(
        expectedClientPlatform
      );

      expect(auth.config).to.eql({
        apiHost: 'firebase.unstoppabledomains.com',
        apiKey: 'fake-key',
        apiScheme: 'https',
        authDomain: 'fake-auth-domain:9999',
        clientPlatform: expectedClientPlatform,
        sdkClientVersion: expectedSdkClientVersion,
        tokenApiHost: 'securetoken.googleapis.com'
      });
      expect(auth._getPersistence()).to.eq('NONE');
    });

    it('should set persistence', async () => {
      const auth = initializeAuth(fakeApp, {
        persistence: fakeSessionPersistence
      }) as AuthInternal;
      await auth._initializationPromise;

      expect(auth._getPersistence()).to.eq('SESSION');
    });

    it('should set persistence with fallback', async () => {
      const auth = initializeAuth(fakeApp, {
        persistence: [fakeSessionPersistence, inMemoryPersistence]
      }) as AuthInternal;
      await auth._initializationPromise;

      expect(auth._getPersistence()).to.eq('SESSION');
    });

    it('should set resolver', async () => {
      const auth = initializeAuth(fakeApp, {
        popupRedirectResolver: fakePopupRedirectResolver
      }) as AuthInternal;
      await auth._initializationPromise;

      expect(auth._popupRedirectResolver).to.be.instanceof(
        FakePopupRedirectResolver
      );
    });

    it('should abort initialization if deleted synchronously', async () => {
      const auth = initializeAuth(fakeApp, {
        popupRedirectResolver: fakePopupRedirectResolver
      }) as AuthInternal;
      await (auth as unknown as _FirebaseService)._delete();
      await auth._initializationPromise;

      expect(auth._isInitialized).to.be.false;
    });

    it('should not throw if called again with same (no) params', () => {
      const auth = initializeAuth(fakeApp);
      expect(initializeAuth(fakeApp)).to.equal(auth);
    });

    it('should not throw if called again with same params', () => {
      const auth = initializeAuth(fakeApp, {
        errorMap: prodErrorMap,
        persistence: fakeSessionPersistence,
        popupRedirectResolver: fakePopupRedirectResolver
      });
      expect(
        initializeAuth(fakeApp, {
          errorMap: prodErrorMap,
          persistence: fakeSessionPersistence,
          popupRedirectResolver: fakePopupRedirectResolver
        })
      ).to.equal(auth);
    });

    it('should throw if called again with different params (popupRedirectResolver)', () => {
      initializeAuth(fakeApp, {
        popupRedirectResolver: fakePopupRedirectResolver
      });
      expect(() =>
        initializeAuth(fakeApp, {
          popupRedirectResolver: undefined
        })
      ).to.throw();
    });

    it('should throw if called again with different params (errorMap)', () => {
      initializeAuth(fakeApp, {
        errorMap: prodErrorMap
      });
      expect(() =>
        initializeAuth(fakeApp, {
          errorMap: debugErrorMap
        })
      ).to.throw();
    });

    it('should throw if called again with different params (persistence)', () => {
      initializeAuth(fakeApp, {
        persistence: [inMemoryPersistence, fakeSessionPersistence]
      });
      expect(() =>
        initializeAuth(fakeApp, {
          persistence: [fakeSessionPersistence, inMemoryPersistence]
        })
      ).to.throw();
    });
  });
});
