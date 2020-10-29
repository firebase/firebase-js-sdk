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

import { deleteApp, initializeApp } from '@firebase/app-exp';
import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import * as externs from '@firebase/auth-types-exp';
import { isNode } from '@firebase/util';

import { expect } from 'chai';
import { inMemoryPersistence } from '../../../internal';

import { Auth } from '../../model/auth';
import {
  PopupRedirectResolver,
  AuthEventType,
  EventManager,
  AuthEventConsumer
} from '../../model/popup_redirect';
import { AuthPopup } from '../../platform_browser/util/popup';
import {
  Persistence,
  PersistenceType,
  PersistenceValue,
  StorageEventListener
} from '../persistence';
import { ClientPlatform, _getClientVersion } from '../util/version';
import { initializeAuth } from './initialize';
import { registerAuth } from './register';

describe('core/auth/initialize', () => {
  let fakeApp: FirebaseApp;

  class FakeSessionPersistence implements Persistence {
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

  const fakeSessionPersistence: externs.Persistence = FakeSessionPersistence;

  class FakePopupRedirectResolver implements PopupRedirectResolver {
    readonly _redirectPersistence = fakeSessionPersistence;

    async _initialize(_auth: Auth): Promise<EventManager> {
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
      _auth: Auth,
      _provider: externs.AuthProvider,
      _authType: AuthEventType,
      _eventId?: string
    ): Promise<AuthPopup> {
      return new AuthPopup(null);
    }
    _openRedirect(
      _auth: Auth,
      _provider: externs.AuthProvider,
      _authType: AuthEventType,
      _eventId?: string
    ): Promise<never> {
      return new Promise((_, reject) => reject());
    }
    _isIframeWebStorageSupported(
      _auth: Auth,
      cb: (support: boolean) => unknown
    ): void {
      cb(true);
    }
  }

  const fakePopupRedirectResolver: externs.PopupRedirectResolver = FakePopupRedirectResolver;

  before(() => {
    registerAuth(ClientPlatform.BROWSER);
  });

  beforeEach(() => {
    fakeApp = initializeApp({
      apiKey: 'fake-key',
      appId: 'fake-app-id',
      authDomain: 'fake-auth-domain'
    });
  });

  afterEach(async () => {
    await deleteApp(fakeApp);
  });

  describe('initializeAuth', () => {
    it('should work with no deps', async () => {
      const auth = initializeAuth(fakeApp) as Auth;
      await auth._initializationPromise;

      expect(auth.name).to.eq(fakeApp.name);
      const expectedSdkClientVersion = _getClientVersion(
        isNode() ? ClientPlatform.NODE : ClientPlatform.BROWSER
      );

      expect(auth.config).to.eql({
        apiHost: 'identitytoolkit.googleapis.com',
        apiKey: 'fake-key',
        apiScheme: 'https',
        authDomain: 'fake-auth-domain',
        sdkClientVersion: expectedSdkClientVersion,
        tokenApiHost: 'securetoken.googleapis.com'
      });
      expect(auth._getPersistence()).to.eq('NONE');
    });

    it('should set persistence', async () => {
      const auth = initializeAuth(fakeApp, {
        persistence: fakeSessionPersistence
      }) as Auth;
      await auth._initializationPromise;

      expect(auth._getPersistence()).to.eq('SESSION');
    });

    it('should set persistence with fallback', async () => {
      const auth = initializeAuth(fakeApp, {
        persistence: [fakeSessionPersistence, inMemoryPersistence]
      }) as Auth;
      await auth._initializationPromise;

      expect(auth._getPersistence()).to.eq('SESSION');
    });

    it('should set resolver', async () => {
      const auth = initializeAuth(fakeApp, {
        popupRedirectResolver: fakePopupRedirectResolver
      }) as Auth;
      await auth._initializationPromise;

      expect(auth._popupRedirectResolver).to.be.instanceof(
        FakePopupRedirectResolver
      );
    });

    it('should abort initialization if deleted synchronously', async () => {
      const auth = initializeAuth(fakeApp, {
        popupRedirectResolver: fakePopupRedirectResolver
      }) as Auth;
      await ((auth as unknown) as _FirebaseService)._delete();
      await auth._initializationPromise;

      expect(auth._isInitialized).to.be.false;
    });
  });
});
