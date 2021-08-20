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

import { _FirebaseService, FirebaseApp } from '@firebase/app';
import {
  Auth,
  AuthErrorMap,
  AuthSettings,
  EmulatorConfig,
  NextOrObserver,
  Persistence,
  PopupRedirectResolver,
  User,
  UserCredential,
  CompleteFn,
  ErrorFn,
  NextFn,
  Unsubscribe
} from '../../model/public_types';
import {
  createSubscribe,
  ErrorFactory,
  getModularInstance,
  Observer,
  Subscribe
} from '@firebase/util';

import {
  AuthInternal,
  ConfigInternal,
  RefreshWithCustomToken
} from '../../model/auth';
import { PopupRedirectResolverInternal } from '../../model/popup_redirect';
import { UserInternal } from '../../model/user';
import {
  AuthErrorCode,
  AuthErrorParams,
  ErrorMapRetriever,
  _DEFAULT_AUTH_ERROR_FACTORY
} from '../errors';
import { PersistenceInternal } from '../persistence';
import {
  KeyName,
  PersistenceUserManager
} from '../persistence/persistence_user_manager';
import { _reloadWithoutSaving } from '../user/reload';
import { _assert } from '../util/assert';
import { _getInstance } from '../util/instantiator';
import { _getUserLanguage } from '../util/navigator';
import { _getClientVersion } from '../util/version';

interface AsyncAction {
  (): Promise<void>;
}

export const enum DefaultConfig {
  TOKEN_API_HOST = 'securetoken.googleapis.com',
  API_HOST = 'identitytoolkit.googleapis.com',
  API_SCHEME = 'https'
}

export class AuthImpl implements AuthInternal, _FirebaseService {
  currentUser: User | null = null;
  emulatorConfig: EmulatorConfig | null = null;
  private operations = Promise.resolve();
  private persistenceManager?: PersistenceUserManager;
  private redirectPersistenceManager?: PersistenceUserManager;
  private authStateSubscription = new Subscription<User>(this);
  private idTokenSubscription = new Subscription<User>(this);
  private redirectUser: UserInternal | null = null;
  private isProactiveRefreshEnabled = false;

  // Any network calls will set this to true and prevent subsequent emulator
  // initialization
  _canInitEmulator = true;
  _isInitialized = false;
  _deleted = false;
  _initializationPromise: Promise<void> | null = null;
  _popupRedirectResolver: PopupRedirectResolverInternal | null = null;
  _errorFactory: ErrorFactory<AuthErrorCode, AuthErrorParams> =
    _DEFAULT_AUTH_ERROR_FACTORY;
  readonly name: string;

  // Tracks the last notified UID for state change listeners to prevent
  // repeated calls to the callbacks. Undefined means it's never been
  // called, whereas null means it's been called with a signed out user
  private lastNotifiedUid: string | null | undefined = undefined;

  languageCode: string | null = null;
  tenantId: string | null = null;
  settings: AuthSettings = { appVerificationDisabledForTesting: false };

  _refreshWithCustomTokenProvider: RefreshWithCustomToken | null = null;

  constructor(
    public readonly app: FirebaseApp,
    public readonly config: ConfigInternal
  ) {
    this.name = app.name;
    this.clientVersion = config.sdkClientVersion;
  }

  _initializeWithPersistence(
    persistenceHierarchy: PersistenceInternal[],
    popupRedirectResolver?: PopupRedirectResolver
  ): Promise<void> {
    if (popupRedirectResolver) {
      this._popupRedirectResolver = _getInstance(popupRedirectResolver);
    }

    // Have to check for app deletion throughout initialization (after each
    // promise resolution)
    this._initializationPromise = this.queue(async () => {
      if (this._deleted) {
        return;
      }

      this.persistenceManager = await PersistenceUserManager.create(
        this,
        persistenceHierarchy
      );

      if (this._deleted) {
        return;
      }

      // Initialize the resolver early if necessary (only applicable to web:
      // this will cause the iframe to load immediately in certain cases)
      if (this._popupRedirectResolver?._shouldInitProactively) {
        await this._popupRedirectResolver._initialize(this);
      }

      await this.initializeCurrentUser(popupRedirectResolver);

      if (this._deleted) {
        return;
      }

      this._isInitialized = true;
    });

    return this._initializationPromise;
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
    popupRedirectResolver?: PopupRedirectResolver
  ): Promise<void> {
    // First check to see if we have a pending redirect event.
    let storedUser =
      (await this.assertedPersistence.getCurrentUser()) as UserInternal | null;
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
        storedUser = result.user as UserInternal;
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
    redirectResolver: PopupRedirectResolver
  ): Promise<UserCredential | null> {
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

    let result: UserCredential | null = null;
    try {
      // We know this._popupRedirectResolver is set since redirectResolver
      // is passed in. The _completeRedirectFn expects the unwrapped extern.
      result = await this._popupRedirectResolver!._completeRedirectFn(
        this,
        redirectResolver,
        true
      );
    } catch (e) {
      // Swallow any errors here; the code can retrieve them in
      // getRedirectResult().
      await this._setRedirectUser(null);
    }

    return result;
  }

  private async reloadAndSetCurrentUserOrClear(
    user: UserInternal
  ): Promise<void> {
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

  async _delete(): Promise<void> {
    this._deleted = true;
  }

  async updateCurrentUser(userExtern: User | null): Promise<void> {
    // The public updateCurrentUser method needs to make a copy of the user,
    // and also check that the project matches
    const user = userExtern
      ? (getModularInstance(userExtern) as UserInternal)
      : null;
    if (user) {
      _assert(
        user.auth.config.apiKey === this.config.apiKey,
        this,
        AuthErrorCode.INVALID_AUTH
      );
    }
    return this._updateCurrentUser(user && user._clone(this));
  }

  async _updateCurrentUser(user: User | null): Promise<void> {
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
      await this.directlySetCurrentUser(user as UserInternal | null);
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

  setPersistence(persistence: Persistence): Promise<void> {
    return this.queue(async () => {
      await this.assertedPersistence.setPersistence(_getInstance(persistence));
    });
  }

  _getPersistence(): string {
    return this.assertedPersistence.persistence.type;
  }

  _updateErrorMap(errorMap: AuthErrorMap): void {
    this._errorFactory = new ErrorFactory<AuthErrorCode, AuthErrorParams>(
      'auth',
      'Firebase',
      (errorMap as ErrorMapRetriever)()
    );
  }

  onAuthStateChanged(
    nextOrObserver: NextOrObserver<User>,
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
    nextOrObserver: NextOrObserver<User>,
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
    user: UserInternal | null,
    popupRedirectResolver?: PopupRedirectResolver
  ): Promise<void> {
    const redirectManager = await this.getOrInitRedirectPersistenceManager(
      popupRedirectResolver
    );
    return user === null
      ? redirectManager.removeCurrentUser()
      : redirectManager.setCurrentUser(user);
  }

  private async getOrInitRedirectPersistenceManager(
    popupRedirectResolver?: PopupRedirectResolver
  ): Promise<PersistenceUserManager> {
    if (!this.redirectPersistenceManager) {
      const resolver: PopupRedirectResolverInternal | null =
        (popupRedirectResolver && _getInstance(popupRedirectResolver)) ||
        this._popupRedirectResolver;
      _assert(resolver, this, AuthErrorCode.ARGUMENT_ERROR);
      this.redirectPersistenceManager = await PersistenceUserManager.create(
        this,
        [_getInstance(resolver._redirectPersistence)],
        KeyName.REDIRECT_USER
      );
      this.redirectUser =
        await this.redirectPersistenceManager.getCurrentUser();
    }

    return this.redirectPersistenceManager;
  }

  async _redirectUserForId(id: string): Promise<UserInternal | null> {
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

  async _persistUserIfCurrent(user: UserInternal): Promise<void> {
    if (user === this.currentUser) {
      return this.queue(async () => this.directlySetCurrentUser(user));
    }
  }

  /** Notifies listeners only if the user is current */
  _notifyListenersIfCurrent(user: UserInternal): void {
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
  get _currentUser(): UserInternal {
    return this.currentUser as UserInternal;
  }

  private notifyAuthListeners(): void {
    if (!this._isInitialized) {
      return;
    }

    this.idTokenSubscription.next(this.currentUser);

    const currentUid = this.currentUser?.uid ?? null;
    if (this.lastNotifiedUid !== currentUid) {
      this.lastNotifiedUid = currentUid;
      this.authStateSubscription.next(this.currentUser);
    }
  }

  private registerStateListener(
    subscription: Subscription<User>,
    nextOrObserver: NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    if (this._deleted) {
      return () => {};
    }

    const cb =
      typeof nextOrObserver === 'function'
        ? nextOrObserver
        : nextOrObserver.next.bind(nextOrObserver);

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
  private async directlySetCurrentUser(
    user: UserInternal | null
  ): Promise<void> {
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

  private frameworks: string[] = [];
  private clientVersion: string;
  _logFramework(framework: string): void {
    if (!framework || this.frameworks.includes(framework)) {
      return;
    }
    this.frameworks.push(framework);

    // Sort alphabetically so that "FirebaseCore-web,FirebaseUI-web" and
    // "FirebaseUI-web,FirebaseCore-web" aren't viewed as different.
    this.frameworks.sort();
    this.clientVersion = _getClientVersion(
      this.config.clientPlatform,
      this._getFrameworks()
    );
  }
  _getFrameworks(): readonly string[] {
    return this.frameworks;
  }
  _getSdkClientVersion(): string {
    return this.clientVersion;
  }
}

/**
 * Method to be used to cast down to our private implmentation of Auth.
 * It will also handle unwrapping from the compat type if necessary
 *
 * @param auth Auth object passed in from developer
 */
export function _castAuth(auth: Auth): AuthInternal {
  return getModularInstance(auth) as AuthInternal;
}

/** Helper class to wrap subscriber logic */
class Subscription<T> {
  private observer: Observer<T | null> | null = null;
  readonly addObserver: Subscribe<T | null> = createSubscribe(
    observer => (this.observer = observer)
  );

  constructor(readonly auth: AuthInternal) {}

  get next(): NextFn<T | null> {
    _assert(this.observer, this.auth, AuthErrorCode.INTERNAL_ERROR);
    return this.observer.next.bind(this.observer);
  }
}
