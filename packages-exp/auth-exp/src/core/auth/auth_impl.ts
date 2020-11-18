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
  ErrorFactory,
  ErrorFn,
  NextFn,
  Observer,
  Subscribe,
  Unsubscribe
} from '@firebase/util';

import { Auth, ConfigInternal } from '../../model/auth';
import { PopupRedirectResolver } from '../../model/popup_redirect';
import { User } from '../../model/user';
import {
  AuthErrorCode,
  AuthErrorParams,
  ErrorMapRetriever,
  _DEFAULT_AUTH_ERROR_FACTORY
} from '../errors';
import { Persistence } from '../persistence';
import {
  KeyName,
  PersistenceUserManager
} from '../persistence/persistence_user_manager';
import { _reloadWithoutSaving } from '../user/reload';
import { _assert } from '../util/assert';
import { _getInstance } from '../util/instantiator';
import { _getUserLanguage } from '../util/navigator';

interface AsyncAction {
  (): Promise<void>;
}

export const enum DefaultConfig {
  TOKEN_API_HOST = 'securetoken.googleapis.com',
  API_HOST = 'identitytoolkit.googleapis.com',
  API_SCHEME = 'https'
}

export class AuthImpl implements Auth, _FirebaseService {
  currentUser: externs.User | null = null;
  private operations = Promise.resolve();
  private persistenceManager?: PersistenceUserManager;
  private redirectPersistenceManager?: PersistenceUserManager;
  private authStateSubscription = new Subscription<externs.User>(this);
  private idTokenSubscription = new Subscription<externs.User>(this);
  private redirectUser: User | null = null;
  private isProactiveRefreshEnabled = false;
  private redirectInitializerError: Error | null = null;

  // Any network calls will set this to true and prevent subsequent emulator
  // initialization
  _canInitEmulator = true;
  _isInitialized = false;
  _deleted = false;
  _initializationPromise: Promise<void> | null = null;
  _popupRedirectResolver: PopupRedirectResolver | null = null;
  _errorFactory: ErrorFactory<
    AuthErrorCode,
    AuthErrorParams
  > = _DEFAULT_AUTH_ERROR_FACTORY;
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
    // Have to check for app deletion throughout initialization (after each
    // promise resolution)
    this._initializationPromise = this.queue(async () => {
      if (this._deleted) {
        return;
      }

      if (popupRedirectResolver) {
        this._popupRedirectResolver = _getInstance(popupRedirectResolver);
      }

      this.persistenceManager = await PersistenceUserManager.create(
        this,
        persistenceHierarchy
      );

      if (this._deleted) {
        return;
      }

      await this.initializeCurrentUser(popupRedirectResolver);

      if (this._deleted) {
        return;
      }

      this._isInitialized = true;
    });

    // After initialization completes, throw any error caused by redirect flow
    return this._initializationPromise.then(() => {
      if (this.redirectInitializerError) {
        throw this.redirectInitializerError;
      }
    });
  }

  /**
   * If the persistence is changed in another window, the user manager will let us know
   */
  async _onStorageEvent(): Promise<void> {
    if (this._deleted) {
      return;
    }

    const user = await this.assertedPersistence.getCurrentUser();

    if (!this.currentUser && !user) {
      // No change, do nothing (was signed out and remained signed out).
      return;
    }

    // If the same user is to be synchronized.
    if (this.currentUser && user && this.currentUser.uid === user.uid) {
      // Data update, simply copy data changes.
      this._currentUser._assign(user);
      // If tokens changed from previous user tokens, this will trigger
      // notifyAuthListeners_.
      await this.currentUser.getIdToken();
      return;
    }

    // Update current Auth state. Either a new login or logout.
    await this._updateCurrentUser(user);
  }

  private async initializeCurrentUser(
    popupRedirectResolver?: externs.PopupRedirectResolver
  ): Promise<void> {
    // First check to see if we have a pending redirect event.
    let storedUser = (await this.assertedPersistence.getCurrentUser()) as User | null;
    if (popupRedirectResolver && this.config.authDomain) {
      await this.getOrInitRedirectPersistenceManager();
      const redirectUserEventId = this.redirectUser?._redirectEventId;
      const storedUserEventId = storedUser?._redirectEventId;
      const result = await this.tryRedirectSignIn(popupRedirectResolver);

      // If the stored user (i.e. the old "currentUser") has a redirectId that
      // matches the redirect user, then we want to initially sign in with the
      // new user object from result.
      // TODO(samgho): More thoroughly test all of this
      if (
        (!redirectUserEventId || redirectUserEventId === storedUserEventId) &&
        result?.user
      ) {
        storedUser = result.user as User;
      }
    }

    // If no user in persistence, there is no current user. Set to null.
    if (!storedUser) {
      return this.directlySetCurrentUser(null);
    }

    if (!storedUser._redirectEventId) {
      // This isn't a redirect user, we can reload and bail
      // This will also catch the redirected user, if available, as that method
      // strips the _redirectEventId
      return this.reloadAndSetCurrentUserOrClear(storedUser);
    }

    _assert(this._popupRedirectResolver, this, AuthErrorCode.ARGUMENT_ERROR);
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

  private async tryRedirectSignIn(
    redirectResolver: externs.PopupRedirectResolver
  ): Promise<externs.UserCredential | null> {
    // The redirect user needs to be checked (and signed in if available)
    // during auth initialization. All of the normal sign in and link/reauth
    // flows call back into auth and push things onto the promise queue. We
    // need to await the result of the redirect sign in *inside the promise
    // queue*. This presents a problem: we run into deadlock. See:
    //    ┌> [Initialization] ─────┐
    //    ┌> [<other queue tasks>] │
    //    └─ [getRedirectResult] <─┘
    //    where [] are tasks on the queue and arrows denote awaits
    // Initialization will never complete because it's waiting on something
    // that's waiting for initialization to complete!
    //
    // Instead, this method calls getRedirectResult() (stored in
    // _completeRedirectFn) with an optional parameter that instructs all of
    // the underlying auth operations to skip anything that mutates auth state.

    let result: externs.UserCredential | null = null;
    try {
      // We know this._popupRedirectResolver is set since redirectResolver
      // is passed in. The _completeRedirectFn expects the unwrapped extern.
      result = await this._popupRedirectResolver!._completeRedirectFn(
        this,
        redirectResolver,
        true
      );
    } catch (e) {
      this.redirectInitializerError = e;
      await this._setRedirectUser(null);
    }

    return result;
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
    _assert(this._canInitEmulator, this, AuthErrorCode.EMULATOR_CONFIG_FAILED);

    _assert(
      /^https?:\/\//.test(url),
      this,
      AuthErrorCode.INVALID_EMULATOR_SCHEME
    );

    this.config.emulator = { url };
    this.settings.appVerificationDisabledForTesting = true;
  }

  async _delete(): Promise<void> {
    this._deleted = true;
  }

  async updateCurrentUser(userExtern: externs.User | null): Promise<void> {
    // The public updateCurrentUser method needs to make a copy of the user,
    // and also needs to verify that the app matches
    const user = userExtern as User | null;
    _assert(
      !user || user.auth.name === this.name,
      this,
      AuthErrorCode.ARGUMENT_ERROR
    );

    return this._updateCurrentUser(user && user._clone());
  }

  async _updateCurrentUser(user: externs.User | null): Promise<void> {
    if (this._deleted) {
      return;
    }
    if (user) {
      _assert(
        this.tenantId === user.tenantId,
        this,
        AuthErrorCode.TENANT_ID_MISMATCH
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

    return this._updateCurrentUser(null);
  }

  setPersistence(persistence: externs.Persistence): Promise<void> {
    return this.queue(async () => {
      await this.assertedPersistence.setPersistence(_getInstance(persistence));
    });
  }

  _getPersistence(): string {
    return this.assertedPersistence.persistence.type;
  }

  _updateErrorMap(errorMap: externs.AuthErrorMap): void {
    this._errorFactory = new ErrorFactory<AuthErrorCode, AuthErrorParams>(
      'auth',
      'Firebase',
      (errorMap as ErrorMapRetriever)()
    );
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

  toJSON(): object {
    return {
      apiKey: this.config.apiKey,
      authDomain: this.config.authDomain,
      appName: this.name,
      currentUser: this._currentUser?.toJSON()
    };
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
      _assert(resolver, this, AuthErrorCode.ARGUMENT_ERROR);
      this.redirectPersistenceManager = await PersistenceUserManager.create(
        this,
        [_getInstance(resolver._redirectPersistence)],
        KeyName.REDIRECT_USER
      );
      this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
    }

    return this.redirectPersistenceManager;
  }

  async _redirectUserForId(id: string): Promise<User | null> {
    // Make sure we've cleared any pending persistence actions if we're not in
    // the initializer
    if (this._isInitialized) {
      await this.queue(async () => {});
    }

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
    if (this._deleted) {
      return () => {};
    }

    const cb =
      typeof nextOrObserver === 'function'
        ? nextOrObserver
        : nextOrObserver.next;

    const promise = this._isInitialized
      ? Promise.resolve()
      : this._initializationPromise;
    _assert(promise, this, AuthErrorCode.INTERNAL_ERROR);
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
    _assert(this.persistenceManager, this, AuthErrorCode.INTERNAL_ERROR);
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
    _assert(this.observer, this.auth, AuthErrorCode.INTERNAL_ERROR);
    return this.observer.next.bind(this.observer);
  }
}
