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

import { getApp } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import * as externs from '@firebase/auth-types-exp';
import {
  CompleteFn,
  createSubscribe,
  ErrorFn,
  NextFn,
  Observer,
  Subscribe,
  Unsubscribe
} from '@firebase/util';

import { Auth, Dependencies } from '../../model/auth';
import { User } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { Persistence } from '../persistence';
import { PersistenceUserManager } from '../persistence/persistence_user_manager';
import { assert } from '../util/assert';
import { _getClientVersion, ClientPlatform } from '../util/version';

interface AsyncAction {
  (): Promise<void>;
}

export const DEFAULT_TOKEN_API_HOST = 'securetoken.googleapis.com';
export const DEFAULT_API_HOST = 'identitytoolkit.googleapis.com';
export const DEFAULT_API_SCHEME = 'https';

export class AuthImpl implements Auth {
  currentUser: User | null = null;
  private operations = Promise.resolve();
  private persistenceManager?: PersistenceUserManager;
  private authStateSubscription = new Subscription<User>(this);
  private idTokenSubscription = new Subscription<User>(this);
  _isInitialized = false;

  // Tracks the last notified UID for state change listeners to prevent
  // repeated calls to the callbacks
  private lastNotifiedUid: string | undefined = undefined;

  languageCode: string | null = null;
  tenantId: string | null = null;
  settings: externs.AuthSettings = { appVerificationDisabledForTesting: false };

  constructor(
    public readonly name: string,
    public readonly config: externs.Config
  ) {}

  _initializeWithPersistence(
    persistenceHierarchy: Persistence[]
  ): Promise<void> {
    return this.queue(async () => {
      this.persistenceManager = await PersistenceUserManager.create(
        this,
        persistenceHierarchy
      );

      const storedUser = await this.persistenceManager.getCurrentUser();
      // TODO: Check redirect user, if not redirect user, call refresh on stored user
      if (storedUser) {
        await this.directlySetCurrentUser(storedUser);
      }

      this._isInitialized = true;
      this.notifyAuthListeners();
    });
  }

  useDeviceLanguage(): void {
    throw new Error('Method not implemented.');
  }

  async updateCurrentUser(user: User | null): Promise<void> {
    return this.queue(async () => {
      await this.directlySetCurrentUser(user);
      this.notifyAuthListeners();
    });
  }

  async signOut(): Promise<void> {
    return this.updateCurrentUser(null);
  }

  setPersistence(persistence: Persistence): Promise<void> {
    return this.queue(async () => {
      await this.assertedPersistence.setPersistence(persistence);
    });
  }

  onAuthStateChanged(
    nextOrObserver: externs.NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    return this.registerStateListener(
      this.authStateSubscription,
      nextOrObserver,
      error,
      completed
    );
  }

  onIdTokenChanged(
    nextOrObserver: externs.NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    return this.registerStateListener(
      this.idTokenSubscription,
      nextOrObserver,
      error,
      completed
    );
  }

  async _persistUserIfCurrent(user: User): Promise<void> {
    if (user === this.currentUser) {
      return this.queue(async () => this.directlySetCurrentUser(user));
    }
  }

  /** Notifies listeners only if the user is current */
  _notifyListenersIfCurrent(user: User): void {
    if (user === this.currentUser) {
      this.notifyAuthListeners();
    }
  }

  private notifyAuthListeners(): void {
    if (!this._isInitialized) {
      return;
    }

    this.idTokenSubscription.next(this.currentUser);

    if (this.lastNotifiedUid !== this.currentUser?.uid) {
      this.lastNotifiedUid = this.currentUser?.uid;
      this.authStateSubscription.next(this.currentUser);
    }
  }

  private registerStateListener(
    subscription: Subscription<User>,
    nextOrObserver: externs.NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    if (this._isInitialized) {
      const cb =
        typeof nextOrObserver === 'function'
          ? nextOrObserver
          : nextOrObserver.next;
      // The callback needs to be called asynchronously per the spec.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Promise.resolve().then(() => cb(this.currentUser));
    }

    if (typeof nextOrObserver === 'function') {
      return subscription.addObserver(nextOrObserver, error, completed);
    } else {
      return subscription.addObserver(nextOrObserver);
    }
  }

  /**
   * Unprotected (from race conditions) method to set the current user. This
   * should only be called from within a queued callback. This is necessary
   * because the queue shouldn't rely on another queued callback.
   */
  private async directlySetCurrentUser(user: User | null): Promise<void> {
    this.currentUser = user;

    if (user) {
      await this.assertedPersistence.setCurrentUser(user);
    } else {
      await this.assertedPersistence.removeCurrentUser();
    }
  }

  private queue(action: AsyncAction): Promise<void> {
    // In case something errors, the callback still should be called in order
    // to keep the promise chain alive
    this.operations = this.operations.then(action, action);
    return this.operations;
  }

  private get assertedPersistence(): PersistenceUserManager {
    assert(this.persistenceManager, this.name);
    return this.persistenceManager;
  }
}

export function initializeAuth(
  app: FirebaseApp = getApp(),
  deps?: Dependencies
): externs.Auth {
  const persistence = deps?.persistence || [];
  const hierarchy = Array.isArray(persistence) ? persistence : [persistence];
  const { apiKey, authDomain } = app.options;

  // TODO: platform needs to be determined using heuristics
  assert(apiKey, app.name, AuthErrorCode.INVALID_API_KEY);
  const config: externs.Config = {
    apiKey,
    authDomain,
    apiHost: DEFAULT_API_HOST,
    tokenApiHost: DEFAULT_TOKEN_API_HOST,
    apiScheme: DEFAULT_API_SCHEME,
    sdkClientVersion: _getClientVersion(ClientPlatform.BROWSER)
  };

  const auth = new AuthImpl(app.name, config);

  // This promise is intended to float; auth initialization happens in the
  // background, meanwhile the auth object may be used by the app.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  auth._initializeWithPersistence(hierarchy as Persistence[]);

  return auth;
}

/** Helper class to wrap subscriber logic */
class Subscription<T> {
  private observer: Observer<T | null> | null = null;
  readonly addObserver: Subscribe<T | null> = createSubscribe(
    observer => (this.observer = observer)
  );

  constructor(readonly auth: Auth) {}

  get next(): NextFn<T | null> {
    assert(this.observer, this.auth.name);
    return this.observer.next.bind(this.observer);
  }
}
