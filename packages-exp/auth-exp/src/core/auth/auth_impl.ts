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

import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
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

import { Auth, AuthCore } from '../../model/auth';
import { PopupRedirectResolver } from '../../model/popup_redirect';
import { User, UserParameters } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { Persistence } from '../persistence';
import {
  _REDIRECT_USER_KEY_NAME,
  PersistenceUserManager
} from '../persistence/persistence_user_manager';
import { _reloadWithoutSaving } from '../user/reload';
import { UserImpl } from '../user/user_impl';
import { assert } from '../util/assert';
import { _getInstance } from '../util/instantiator';
import { _getUserLanguage } from '../util/navigator';

interface AsyncAction {
  (): Promise<void>;
}

export interface UserProvider<T extends User> {
  new (params: UserParameters): T;
}

export const DEFAULT_TOKEN_API_HOST = 'securetoken.googleapis.com';
export const DEFAULT_API_HOST = 'identitytoolkit.googleapis.com';
export const DEFAULT_API_SCHEME = 'https';

export class AuthImplCompat<T extends User> implements Auth, _FirebaseService {
  currentUser: T | null = null;
  private operations = Promise.resolve();
  private persistenceManager?: PersistenceUserManager;
  private redirectPersistenceManager?: PersistenceUserManager;
  private authStateSubscription = new Subscription<T>(this);
  private idTokenSubscription = new Subscription<T>(this);
  private redirectUser: T | null = null;
  private isProactiveRefreshEnabled = false;
  _isInitialized = false;
  _initializationPromise: Promise<void> | null = null;
  _popupRedirectResolver: PopupRedirectResolver | null = null;
  readonly name: string;

  // Tracks the last notified UID for state change listeners to prevent
  // repeated calls to the callbacks
  private lastNotifiedUid: string | undefined = undefined;

  languageCode: string | null = null;
  tenantId: string | null = null;
  settings: externs.AuthSettings = { appVerificationDisabledForTesting: false };

  constructor(
    public readonly app: FirebaseApp,
    public readonly config: externs.Config,
    private readonly _userProvider: UserProvider<T>
  ) {
    this.name = app.name;
  }

  _initializeWithPersistence(
    persistenceHierarchy: Persistence[],
    popupRedirectResolver?: externs.PopupRedirectResolver
  ): Promise<void> {
    this._initializationPromise = this.queue(async () => {
      if (popupRedirectResolver) {
        this._popupRedirectResolver = _getInstance(popupRedirectResolver);
      }

      this.persistenceManager = await PersistenceUserManager.create(
        this,
        persistenceHierarchy
      );

      await this.initializeCurrentUser();

      this._isInitialized = true;
      this.notifyAuthListeners();
    });

    return this._initializationPromise;
  }

  _createUser(params: UserParameters): T {
    return new this._userProvider(params);
  }

  private async initializeCurrentUser(): Promise<void> {
    const storedUser = (await this.assertedPersistence.getCurrentUser()) as T | null;
    if (!storedUser) {
      return this.directlySetCurrentUser(storedUser);
    }

    if (!storedUser._redirectEventId) {
      // This isn't a redirect user, we can reload and bail
      return this.reloadAndSetCurrentUserOrClear(storedUser);
    }

    assert(this._popupRedirectResolver, AuthErrorCode.ARGUMENT_ERROR, {
      appName: this.name
    });
    await this.getOrInitRedirectPersistenceManager();

    // If the redirect user's event ID matches the current user's event ID,
    // DO NOT reload the current user, otherwise they'll be cleared from storage.
    // This is important for the reauthenticateWithRedirect() flow.
    if (
      this.redirectUser &&
      this.redirectUser._redirectEventId === storedUser._redirectEventId
    ) {
      return this.directlySetCurrentUser(storedUser);
    }

    return this.reloadAndSetCurrentUserOrClear(storedUser);
  }

  private async reloadAndSetCurrentUserOrClear(user: T): Promise<void> {
    try {
      await _reloadWithoutSaving(user);
    } catch (e) {
      if (e.code !== `auth/${AuthErrorCode.NETWORK_REQUEST_FAILED}`) {
        // Something's wrong with the user's token. Log them out and remove
        // them from storage
        return this.directlySetCurrentUser(null);
      }
    }

    return this.directlySetCurrentUser(user);
  }

  useDeviceLanguage(): void {
    this.languageCode = _getUserLanguage();
  }

  async delete(): Promise<void> {
    // TODO: Determine what we want to do in this case
  }

  async updateCurrentUser(user: externs.User | null): Promise<void> {
    if (user) {
      assert(
        this.tenantId === user.tenantId,
        AuthErrorCode.TENANT_ID_MISMATCH,
        { appName: this.name }
      );
    }
    return this.queue(async () => {
      await this.directlySetCurrentUser(user as T | null);
      this.notifyAuthListeners();
    });
  }

  async signOut(): Promise<void> {
    return this.updateCurrentUser(null);
  }

  _setPersistence(persistence: externs.Persistence): Promise<void> {
    return this.queue(async () => {
      await this.assertedPersistence.setPersistence(_getInstance(persistence));
    });
  }

  _onAuthStateChanged(
    nextOrObserver: externs.NextOrObserver<T>,
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

  _onIdTokenChanged(
    nextOrObserver: externs.NextOrObserver<T>,
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

  async _setRedirectUser(
    user: T | null,
    popupRedirectResolver?: externs.PopupRedirectResolver
  ): Promise<void> {
    const redirectManager = await this.getOrInitRedirectPersistenceManager(
      popupRedirectResolver
    );
    return user === null
      ? redirectManager.removeCurrentUser()
      : redirectManager.setCurrentUser(user);
  }

  private async getOrInitRedirectPersistenceManager(
    popupRedirectResolver?: externs.PopupRedirectResolver
  ): Promise<PersistenceUserManager> {
    if (!this.redirectPersistenceManager) {
      const resolver: PopupRedirectResolver | null =
        (popupRedirectResolver && _getInstance(popupRedirectResolver)) ||
        this._popupRedirectResolver;
      assert(resolver, AuthErrorCode.ARGUMENT_ERROR, { appName: this.name });
      this.redirectPersistenceManager = await PersistenceUserManager.create(
        this,
        [_getInstance(resolver._redirectPersistence)],
        _REDIRECT_USER_KEY_NAME
      );
      this.redirectUser = (await this.redirectPersistenceManager.getCurrentUser()) as T;
    }

    return this.redirectPersistenceManager;
  }

  async _redirectUserForId(id: string): Promise<T | null> {
    // Make sure we've cleared any pending ppersistence actions
    await this.queue(async () => {});

    if (this.currentUser?._redirectEventId === id) {
      return this.currentUser;
    }

    if (this.redirectUser?._redirectEventId === id) {
      return this.redirectUser;
    }

    return null;
  }

  async _persistUserIfCurrent(user: T): Promise<void> {
    if (user === this.currentUser) {
      return this.queue(async () => this.directlySetCurrentUser(user));
    }
  }

  /** Notifies listeners only if the user is current */
  _notifyListenersIfCurrent(user: T): void {
    if (user === this.currentUser) {
      this.notifyAuthListeners();
    }
  }

  _key(): string {
    return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
  }

  _startProactiveRefresh(): void {
    this.isProactiveRefreshEnabled = true;
    if (this.currentUser) {
      this.currentUser._startProactiveRefresh();
    }
  }

  _stopProactiveRefresh(): void {
    this.isProactiveRefreshEnabled = false;
    if (this.currentUser) {
      this.currentUser._stopProactiveRefresh();
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
    subscription: Subscription<T>,
    nextOrObserver: externs.NextOrObserver<T>,
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
  private async directlySetCurrentUser(user: T | null): Promise<void> {
    if (this.currentUser && this.currentUser !== user) {
      this.currentUser._stopProactiveRefresh();
      if (user && this.isProactiveRefreshEnabled) {
        user._startProactiveRefresh();
      }
    }

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
    assert(this.persistenceManager, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.name
    });
    return this.persistenceManager;
  }
}

/**
 * This is the implementation we make public in the new SDK, note the changed interface on these methods
 *
 * Don't instantiate this class directly, use initializeAuth()
 */
export class AuthImpl extends AuthImplCompat<UserImpl> implements externs.Auth {
  constructor(app: FirebaseApp, config: externs.Config) {
    super(app, config, UserImpl);
  }

  onAuthStateChanged(
    nextOrObserver: externs.NextOrObserver<externs.User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    return super._onAuthStateChanged(nextOrObserver, error, completed);
  }

  onIdTokenChanged(
    nextOrObserver: externs.NextOrObserver<externs.User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    return super._onIdTokenChanged(nextOrObserver, error, completed);
  }

  setPersistence(persistence: externs.Persistence): Promise<void> {
    return super._setPersistence(persistence);
  }
}

/**
 * Method to be used to cast down to our private implmentation of Auth
 *
 * @param auth Auth object passed in from developer
 */
export function _castAuth(auth: externs.Auth): Auth {
  return (auth as unknown) as Auth;
}

/** Helper class to wrap subscriber logic */
class Subscription<T> {
  private observer: Observer<T | null> | null = null;
  readonly addObserver: Subscribe<T | null> = createSubscribe(
    observer => (this.observer = observer)
  );

  constructor(readonly auth: AuthCore) {}

  get next(): NextFn<T | null> {
    assert(this.observer, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.auth.name
    });
    return this.observer.next.bind(this.observer);
  }
}
