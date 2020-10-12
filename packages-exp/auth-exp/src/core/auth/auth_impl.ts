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

import { Auth, ConfigInternal } from '../../model/auth';
import { PopupRedirectResolver } from '../../model/popup_redirect';
import { User } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { Persistence } from '../persistence';
import {
  _REDIRECT_USER_KEY_NAME,
  PersistenceUserManager
} from '../persistence/persistence_user_manager';
import { _reloadWithoutSaving } from '../user/reload';
import { assert } from '../util/assert';
import { _getInstance } from '../util/instantiator';
import { _getUserLanguage } from '../util/navigator';

interface AsyncAction {
  (): Promise<void>;
}

export const DEFAULT_TOKEN_API_HOST = 'securetoken.googleapis.com';
export const DEFAULT_API_HOST = 'identitytoolkit.googleapis.com';
export const DEFAULT_API_SCHEME = 'https';

export class AuthImpl implements Auth, _FirebaseService {
  currentUser: externs.User | null = null;
  private operations = Promise.resolve();
  private persistenceManager?: PersistenceUserManager;
  private redirectPersistenceManager?: PersistenceUserManager;
  private authStateSubscription = new Subscription<externs.User>(this);
  private idTokenSubscription = new Subscription<externs.User>(this);
  private redirectUser: User | null = null;
  private isProactiveRefreshEnabled = false;

  // Any network calls will set this to true and prevent subsequent emulator
  // initialization
  _canInitEmulator = true;
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
    public readonly config: ConfigInternal
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

  /**
   * If the persistence is changed in another window, the user manager will let us know
   */
  async _onStorageEvent(): Promise<void> {
    const user = await this.assertedPersistence.getCurrentUser();

    if (!this.currentUser && !user) {
      // No change, do nothing (was signed out and remained signed out).
      return;
    }

    // If the same user is to be synchronized.
    if (this.currentUser && user && this.currentUser.uid === user.uid) {
      // Data update, simply copy data changes.
      this._currentUser._copy(user);
      // If tokens changed from previous user tokens, this will trigger
      // notifyAuthListeners_.
      await this.currentUser.getIdToken();
      return;
    }

    // Update current Auth state. Either a new login or logout.
    await this.updateCurrentUser(user);
    // Notify external Auth changes of Auth change event.
    this.notifyAuthListeners();
  }

  private async initializeCurrentUser(): Promise<void> {
    const storedUser = (await this.assertedPersistence.getCurrentUser()) as User | null;
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

  private async reloadAndSetCurrentUserOrClear(user: User): Promise<void> {
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

  useEmulator(url: string): void {
    assert(this._canInitEmulator, AuthErrorCode.EMULATOR_CONFIG_FAILED, {
      appName: this.name
    });

    this.config.emulator = { url };
    this.settings.appVerificationDisabledForTesting = true;
  }

  async _delete(): Promise<void> {
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
      await this.directlySetCurrentUser(user as User | null);
      this.notifyAuthListeners();
    });
  }

  async signOut(): Promise<void> {
    // Clear the redirect user when signOut is called
    if (this.redirectPersistenceManager || this._popupRedirectResolver) {
      await this._setRedirectUser(null);
    }

    return this.updateCurrentUser(null);
  }

  setPersistence(persistence: externs.Persistence): Promise<void> {
    return this.queue(async () => {
      await this.assertedPersistence.setPersistence(_getInstance(persistence));
    });
  }

  onAuthStateChanged(
    nextOrObserver: externs.NextOrObserver<externs.User>,
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
    nextOrObserver: externs.NextOrObserver<externs.User>,
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
    user: User | null,
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
      this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
    }

    return this.redirectPersistenceManager;
  }

  async _redirectUserForId(id: string): Promise<User | null> {
    // Make sure we've cleared any pending ppersistence actions
    await this.queue(async () => {});

    if (this._currentUser?._redirectEventId === id) {
      return this._currentUser;
    }

    if (this.redirectUser?._redirectEventId === id) {
      return this.redirectUser;
    }

    return null;
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

  _key(): string {
    return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
  }

  _startProactiveRefresh(): void {
    this.isProactiveRefreshEnabled = true;
    if (this.currentUser) {
      this._currentUser._startProactiveRefresh();
    }
  }

  _stopProactiveRefresh(): void {
    this.isProactiveRefreshEnabled = false;
    if (this.currentUser) {
      this._currentUser._stopProactiveRefresh();
    }
  }

  /** Returns the current user cast as the internal type */
  get _currentUser(): User {
    return this.currentUser as User;
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
    subscription: Subscription<externs.User>,
    nextOrObserver: externs.NextOrObserver<externs.User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    const cb =
      typeof nextOrObserver === 'function'
        ? nextOrObserver
        : nextOrObserver.next;

    const promise = this._isInitialized
      ? Promise.resolve()
      : this._initializationPromise;
    assert(promise, AuthErrorCode.INTERNAL_ERROR, { appName: this.name });
    // The callback needs to be called asynchronously per the spec.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    promise.then(() => cb(this.currentUser));

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
    if (this.currentUser && this.currentUser !== user) {
      this._currentUser._stopProactiveRefresh();
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

  constructor(readonly auth: Auth) {}

  get next(): NextFn<T | null> {
    assert(this.observer, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.auth.name
    });
    return this.observer.next.bind(this.observer);
  }
}
