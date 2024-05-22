/**
 * @license
 * Copyright 2017 Google LLC
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
  AppCheckInternalComponentName,
  AppCheckTokenListener,
  AppCheckTokenResult,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import { User } from '../auth/user';
import { debugAssert, hardAssert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { logDebug } from '../util/log';
import { Deferred } from '../util/promise';

// TODO(mikelehen): This should be split into multiple files and probably
// moved to an auth/ folder to match other platforms.

/**
 * @internal
 */
export type AuthTokenFactory = () => string;

/**
 * @internal
 */
export interface FirstPartyCredentialsSettings {
  // These are external types. Prevent minification.
  ['type']: 'firstParty';
  ['sessionIndex']: string;
  ['iamToken']: string | null;
  ['authTokenFactory']: AuthTokenFactory | null;
}

export interface ProviderCredentialsSettings {
  // These are external types. Prevent minification.
  ['type']: 'provider';
  ['client']: CredentialsProvider<User>;
}

/** Settings for private credentials */
export type CredentialsSettings =
  | FirstPartyCredentialsSettings
  | ProviderCredentialsSettings;

export type TokenType = 'OAuth' | 'FirstParty' | 'AppCheck';
export interface Token {
  /** Type of token. */
  type: TokenType;

  /**
   * The user with which the token is associated (used for persisting user
   * state on disk, etc.).
   * This will be null for Tokens of the type 'AppCheck'.
   */
  user?: User;

  /** Header values to set for this token */
  headers: Map<string, string>;
}

export class OAuthToken implements Token {
  type = 'OAuth' as TokenType;
  headers = new Map();

  constructor(value: string, public user: User) {
    this.headers.set('Authorization', `Bearer ${value}`);
  }
}

/**
 * A Listener for credential change events. The listener should fetch a new
 * token and may need to invalidate other state if the current user has also
 * changed.
 */
export type CredentialChangeListener<T> = (credential: T) => Promise<void>;

/**
 * Provides methods for getting the uid and token for the current user and
 * listening for changes.
 */
export interface CredentialsProvider<T> {
  /**
   * Starts the credentials provider and specifies a listener to be notified of
   * credential changes (sign-in / sign-out, token changes). It is immediately
   * called once with the initial user.
   *
   * The change listener is invoked on the provided AsyncQueue.
   */
  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<T>
  ): void;

  /** Requests a token for the current user. */
  getToken(): Promise<Token | null>;

  /**
   * Marks the last retrieved token as invalid, making the next GetToken request
   * force-refresh the token.
   */
  invalidateToken(): void;

  shutdown(): void;
}

/**
 * A CredentialsProvider that always yields an empty token.
 * @internal
 */
export class EmptyAuthCredentialsProvider implements CredentialsProvider<User> {
  getToken(): Promise<Token | null> {
    return Promise.resolve<Token | null>(null);
  }

  invalidateToken(): void {}

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<User>
  ): void {
    // Fire with initial user.
    asyncQueue.enqueueRetryable(() => changeListener(User.UNAUTHENTICATED));
  }

  shutdown(): void {}
}

/**
 * A CredentialsProvider that always returns a constant token. Used for
 * emulator token mocking.
 */
export class EmulatorAuthCredentialsProvider
  implements CredentialsProvider<User>
{
  constructor(private token: Token) {}

  /**
   * Stores the listener registered with setChangeListener()
   * This isn't actually necessary since the UID never changes, but we use this
   * to verify the listen contract is adhered to in tests.
   */
  private changeListener: CredentialChangeListener<User> | null = null;

  getToken(): Promise<Token | null> {
    return Promise.resolve(this.token);
  }

  invalidateToken(): void {}

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<User>
  ): void {
    debugAssert(
      !this.changeListener,
      'Can only call setChangeListener() once.'
    );
    this.changeListener = changeListener;
    // Fire with initial user.
    asyncQueue.enqueueRetryable(() => changeListener(this.token.user!));
  }

  shutdown(): void {
    this.changeListener = null;
  }
}

/** Credential provider for the Lite SDK. */
export class LiteAuthCredentialsProvider implements CredentialsProvider<User> {
  private auth: FirebaseAuthInternal | null = null;

  constructor(authProvider: Provider<FirebaseAuthInternalName>) {
    authProvider.onInit(auth => {
      this.auth = auth;
    });
  }

  getToken(): Promise<Token | null> {
    if (!this.auth) {
      return Promise.resolve(null);
    }

    return this.auth.getToken().then(tokenData => {
      if (tokenData) {
        hardAssert(
          typeof tokenData.accessToken === 'string',
          'Invalid tokenData returned from getToken():' + tokenData
        );
        return new OAuthToken(
          tokenData.accessToken,
          new User(this.auth!.getUid())
        );
      } else {
        return null;
      }
    });
  }

  invalidateToken(): void {}

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<User>
  ): void {}

  shutdown(): void {}
}

export class FirebaseAuthCredentialsProvider
  implements CredentialsProvider<User>
{
  /**
   * The auth token listener registered with FirebaseApp, retained here so we
   * can unregister it.
   */
  private tokenListener!: () => void;

  /** Tracks the current User. */
  private currentUser: User = User.UNAUTHENTICATED;

  /**
   * Counter used to detect if the token changed while a getToken request was
   * outstanding.
   */
  private tokenCounter = 0;

  private forceRefresh = false;

  private auth: FirebaseAuthInternal | null = null;

  constructor(private authProvider: Provider<FirebaseAuthInternalName>) {}

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<User>
  ): void {
    let lastTokenId = this.tokenCounter;

    // A change listener that prevents double-firing for the same token change.
    const guardedChangeListener: (user: User) => Promise<void> = user => {
      if (this.tokenCounter !== lastTokenId) {
        lastTokenId = this.tokenCounter;
        return changeListener(user);
      } else {
        return Promise.resolve();
      }
    };

    // A promise that can be waited on to block on the next token change.
    // This promise is re-created after each change.
    let nextToken = new Deferred<void>();

    this.tokenListener = () => {
      this.tokenCounter++;
      this.currentUser = this.getUser();
      nextToken.resolve();
      nextToken = new Deferred<void>();
      asyncQueue.enqueueRetryable(() =>
        guardedChangeListener(this.currentUser)
      );
    };

    const awaitNextToken: () => void = () => {
      const currentTokenAttempt = nextToken;
      asyncQueue.enqueueRetryable(async () => {
        await currentTokenAttempt.promise;
        await guardedChangeListener(this.currentUser);
      });
    };

    const registerAuth = (auth: FirebaseAuthInternal): void => {
      logDebug('FirebaseAuthCredentialsProvider', 'Auth detected');
      this.auth = auth;
      this.auth.addAuthTokenListener(this.tokenListener);
      awaitNextToken();
    };

    this.authProvider.onInit(auth => registerAuth(auth));

    // Our users can initialize Auth right after Firestore, so we give it
    // a chance to register itself with the component framework before we
    // determine whether to start up in unauthenticated mode.
    setTimeout(() => {
      if (!this.auth) {
        const auth = this.authProvider.getImmediate({ optional: true });
        if (auth) {
          registerAuth(auth);
        } else {
          // If auth is still not available, proceed with `null` user
          logDebug('FirebaseAuthCredentialsProvider', 'Auth not yet detected');
          nextToken.resolve();
          nextToken = new Deferred<void>();
        }
      }
    }, 0);

    awaitNextToken();
  }

  getToken(): Promise<Token | null> {
    debugAssert(
      this.tokenListener != null,
      'FirebaseAuthCredentialsProvider not started.'
    );

    // Take note of the current value of the tokenCounter so that this method
    // can fail (with an ABORTED error) if there is a token change while the
    // request is outstanding.
    const initialTokenCounter = this.tokenCounter;
    const forceRefresh = this.forceRefresh;
    this.forceRefresh = false;

    if (!this.auth) {
      return Promise.resolve(null);
    }

    return this.auth.getToken(forceRefresh).then(tokenData => {
      // Cancel the request since the token changed while the request was
      // outstanding so the response is potentially for a previous user (which
      // user, we can't be sure).
      if (this.tokenCounter !== initialTokenCounter) {
        logDebug(
          'FirebaseAuthCredentialsProvider',
          'getToken aborted due to token change.'
        );
        return this.getToken();
      } else {
        if (tokenData) {
          hardAssert(
            typeof tokenData.accessToken === 'string',
            'Invalid tokenData returned from getToken():' + tokenData
          );
          return new OAuthToken(tokenData.accessToken, this.currentUser);
        } else {
          return null;
        }
      }
    });
  }

  invalidateToken(): void {
    this.forceRefresh = true;
  }

  shutdown(): void {
    if (this.auth) {
      this.auth.removeAuthTokenListener(this.tokenListener!);
    }
  }

  // Auth.getUid() can return null even with a user logged in. It is because
  // getUid() is synchronous, but the auth code populating Uid is asynchronous.
  // This method should only be called in the AuthTokenListener callback
  // to guarantee to get the actual user.
  private getUser(): User {
    const currentUid = this.auth && this.auth.getUid();
    hardAssert(
      currentUid === null || typeof currentUid === 'string',
      'Received invalid UID: ' + currentUid
    );
    return new User(currentUid);
  }
}

/*
 * FirstPartyToken provides a fresh token each time its value
 * is requested, because if the token is too old, requests will be rejected.
 * Technically this may no longer be necessary since the SDK should gracefully
 * recover from unauthenticated errors (see b/33147818 for context), but it's
 * safer to keep the implementation as-is.
 */
export class FirstPartyToken implements Token {
  type = 'FirstParty' as TokenType;
  user = User.FIRST_PARTY;
  private _headers = new Map();

  constructor(
    private readonly sessionIndex: string,
    private readonly iamToken: string | null,
    private readonly authTokenFactory: AuthTokenFactory | null
  ) {}

  /**
   * Gets an authorization token, using a provided factory function, or return
   * null.
   */
  private getAuthToken(): string | null {
    if (this.authTokenFactory) {
      return this.authTokenFactory();
    } else {
      return null;
    }
  }

  get headers(): Map<string, string> {
    this._headers.set('X-Goog-AuthUser', this.sessionIndex);
    // Use array notation to prevent minification
    const authHeaderTokenValue = this.getAuthToken();
    if (authHeaderTokenValue) {
      this._headers.set('Authorization', authHeaderTokenValue);
    }
    if (this.iamToken) {
      this._headers.set('X-Goog-Iam-Authorization-Token', this.iamToken);
    }

    return this._headers;
  }
}

/*
 * Provides user credentials required for the Firestore JavaScript SDK
 * to authenticate the user, using technique that is only available
 * to applications hosted by Google.
 */
export class FirstPartyAuthCredentialsProvider
  implements CredentialsProvider<User>
{
  constructor(
    private sessionIndex: string,
    private iamToken: string | null,
    private authTokenFactory: AuthTokenFactory | null
  ) {}

  getToken(): Promise<Token | null> {
    return Promise.resolve(
      new FirstPartyToken(
        this.sessionIndex,
        this.iamToken,
        this.authTokenFactory
      )
    );
  }

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<User>
  ): void {
    // Fire with initial uid.
    asyncQueue.enqueueRetryable(() => changeListener(User.FIRST_PARTY));
  }

  shutdown(): void {}

  invalidateToken(): void {}
}

export class AppCheckToken implements Token {
  type = 'AppCheck' as TokenType;
  headers = new Map();

  constructor(private value: string) {
    if (value && value.length > 0) {
      this.headers.set('x-firebase-appcheck', this.value);
    }
  }
}

export class FirebaseAppCheckTokenProvider
  implements CredentialsProvider<string>
{
  /**
   * The AppCheck token listener registered with FirebaseApp, retained here so
   * we can unregister it.
   */
  private tokenListener!: AppCheckTokenListener;
  private forceRefresh = false;
  private appCheck: FirebaseAppCheckInternal | null = null;
  private latestAppCheckToken: string | null = null;

  constructor(
    private appCheckProvider: Provider<AppCheckInternalComponentName>
  ) {}

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<string>
  ): void {
    const onTokenChanged: (
      tokenResult: AppCheckTokenResult
    ) => Promise<void> = tokenResult => {
      if (tokenResult.error != null) {
        logDebug(
          'FirebaseAppCheckTokenProvider',
          `Error getting App Check token; using placeholder token instead. Error: ${tokenResult.error.message}`
        );
      }
      const tokenUpdated = tokenResult.token !== this.latestAppCheckToken;
      this.latestAppCheckToken = tokenResult.token;
      logDebug(
        'FirebaseAppCheckTokenProvider',
        `Received ${tokenUpdated ? 'new' : 'existing'} token.`
      );
      return tokenUpdated
        ? changeListener(tokenResult.token)
        : Promise.resolve();
    };

    this.tokenListener = (tokenResult: AppCheckTokenResult) => {
      asyncQueue.enqueueRetryable(() => onTokenChanged(tokenResult));
    };

    const registerAppCheck = (appCheck: FirebaseAppCheckInternal): void => {
      logDebug('FirebaseAppCheckTokenProvider', 'AppCheck detected');
      this.appCheck = appCheck;
      this.appCheck.addTokenListener(this.tokenListener);
    };

    this.appCheckProvider.onInit(appCheck => registerAppCheck(appCheck));

    // Our users can initialize AppCheck after Firestore, so we give it
    // a chance to register itself with the component framework.
    setTimeout(() => {
      if (!this.appCheck) {
        const appCheck = this.appCheckProvider.getImmediate({ optional: true });
        if (appCheck) {
          registerAppCheck(appCheck);
        } else {
          // If AppCheck is still not available, proceed without it.
          logDebug(
            'FirebaseAppCheckTokenProvider',
            'AppCheck not yet detected'
          );
        }
      }
    }, 0);
  }

  getToken(): Promise<Token | null> {
    debugAssert(
      this.tokenListener != null,
      'FirebaseAppCheckTokenProvider not started.'
    );

    const forceRefresh = this.forceRefresh;
    this.forceRefresh = false;

    if (!this.appCheck) {
      return Promise.resolve(null);
    }

    return this.appCheck.getToken(forceRefresh).then(tokenResult => {
      if (tokenResult) {
        hardAssert(
          typeof tokenResult.token === 'string',
          'Invalid tokenResult returned from getToken():' + tokenResult
        );
        this.latestAppCheckToken = tokenResult.token;
        return new AppCheckToken(tokenResult.token);
      } else {
        return null;
      }
    });
  }

  invalidateToken(): void {
    this.forceRefresh = true;
  }

  shutdown(): void {
    if (this.appCheck) {
      this.appCheck.removeTokenListener(this.tokenListener!);
    }
  }
}

/**
 * An AppCheck token provider that always yields an empty token.
 * @internal
 */
export class EmptyAppCheckTokenProvider implements CredentialsProvider<string> {
  getToken(): Promise<Token | null> {
    return Promise.resolve<Token | null>(new AppCheckToken(''));
  }

  invalidateToken(): void {}

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<string>
  ): void {}

  shutdown(): void {}
}

/** AppCheck token provider for the Lite SDK. */
export class LiteAppCheckTokenProvider implements CredentialsProvider<string> {
  private appCheck: FirebaseAppCheckInternal | null = null;

  constructor(
    private appCheckProvider: Provider<AppCheckInternalComponentName>
  ) {
    appCheckProvider.onInit(appCheck => {
      this.appCheck = appCheck;
    });
  }

  getToken(): Promise<Token | null> {
    if (!this.appCheck) {
      return Promise.resolve(null);
    }

    return this.appCheck.getToken().then(tokenResult => {
      if (tokenResult) {
        hardAssert(
          typeof tokenResult.token === 'string',
          'Invalid tokenResult returned from getToken():' + tokenResult
        );
        return new AppCheckToken(tokenResult.token);
      } else {
        return null;
      }
    });
  }

  invalidateToken(): void {}

  start(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener<string>
  ): void {}

  shutdown(): void {}
}

/**
 * Builds a CredentialsProvider depending on the type of
 * the credentials passed in.
 */
export function makeAuthCredentialsProvider(
  credentials?: CredentialsSettings
): CredentialsProvider<User> {
  if (!credentials) {
    return new EmptyAuthCredentialsProvider();
  }
  switch (credentials['type']) {
    case 'firstParty':
      return new FirstPartyAuthCredentialsProvider(
        credentials['sessionIndex'] || '0',
        credentials['iamToken'] || null,
        credentials['authTokenFactory'] || null
      );

    case 'provider':
      return credentials['client'];

    default:
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'makeAuthCredentialsProvider failed due to invalid credential type'
      );
  }
}
