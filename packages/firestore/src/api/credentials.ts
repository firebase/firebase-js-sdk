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

export interface FirstPartyCredentialsSettings {
  // These are external types. Prevent minification.
  ['type']: 'gapi';
  ['client']: unknown;
  ['sessionIndex']: string;
  ['iamToken']: string | null;
}

export interface ProviderCredentialsSettings {
  // These are external types. Prevent minification.
  ['type']: 'provider';
  ['client']: CredentialsProvider;
}

/** Settings for private credentials */
export type CredentialsSettings =
  | FirstPartyCredentialsSettings
  | ProviderCredentialsSettings;

export type TokenType = 'OAuth' | 'FirstParty';
export interface Token {
  /** Type of token. */
  type: TokenType;

  /**
   * The user with which the token is associated (used for persisting user
   * state on disk, etc.).
   */
  user: User;

  /** Extra header values to be passed along with a request */
  authHeaders: { [header: string]: string };
}

export class OAuthToken implements Token {
  type = 'OAuth' as TokenType;
  authHeaders: { [header: string]: string };
  constructor(value: string, public user: User) {
    this.authHeaders = {};
    // Set the headers using Object Literal notation to avoid minification
    this.authHeaders['Authorization'] = `Bearer ${value}`;
  }
}

/**
 * A Listener for credential change events. The listener should fetch a new
 * token and may need to invalidate other state if the current user has also
 * changed.
 */
export type CredentialChangeListener = (user: User) => Promise<void>;

/**
 * Provides methods for getting the uid and token for the current user and
 * listening for changes.
 */
export interface CredentialsProvider {
  /** Requests a token for the current user. */
  getToken(): Promise<Token | null>;

  /**
   * Marks the last retrieved token as invalid, making the next GetToken request
   * force-refresh the token.
   */
  invalidateToken(): void;

  /**
   * Specifies a listener to be notified of credential changes
   * (sign-in / sign-out, token changes). It is immediately called once with the
   * initial user.
   *
   * The change listener is invoked on the provided AsyncQueue.
   */
  setChangeListener(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener
  ): void;

  /** Removes the previously-set change listener. */
  removeChangeListener(): void;
}

/** A CredentialsProvider that always yields an empty token. */
export class EmptyCredentialsProvider implements CredentialsProvider {
  /**
   * Stores the listener registered with setChangeListener()
   * This isn't actually necessary since the UID never changes, but we use this
   * to verify the listen contract is adhered to in tests.
   */
  private changeListener: CredentialChangeListener | null = null;

  getToken(): Promise<Token | null> {
    return Promise.resolve<Token | null>(null);
  }

  invalidateToken(): void {}

  setChangeListener(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener
  ): void {
    debugAssert(
      !this.changeListener,
      'Can only call setChangeListener() once.'
    );
    this.changeListener = changeListener;
    // Fire with initial user.
    asyncQueue.enqueueRetryable(() => changeListener(User.UNAUTHENTICATED));
  }

  removeChangeListener(): void {
    this.changeListener = null;
  }
}

/**
 * A CredentialsProvider that always returns a constant token. Used for
 * emulator token mocking.
 */
export class EmulatorCredentialsProvider implements CredentialsProvider {
  constructor(private token: Token) {}

  /**
   * Stores the listener registered with setChangeListener()
   * This isn't actually necessary since the UID never changes, but we use this
   * to verify the listen contract is adhered to in tests.
   */
  private changeListener: CredentialChangeListener | null = null;

  getToken(): Promise<Token | null> {
    return Promise.resolve(this.token);
  }

  invalidateToken(): void {}

  setChangeListener(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener
  ): void {
    debugAssert(
      !this.changeListener,
      'Can only call setChangeListener() once.'
    );
    this.changeListener = changeListener;
    // Fire with initial user.
    asyncQueue.enqueueRetryable(() => changeListener(this.token.user));
  }

  removeChangeListener(): void {
    this.changeListener = null;
  }
}

export class FirebaseCredentialsProvider implements CredentialsProvider {
  /**
   * The auth token listener registered with FirebaseApp, retained here so we
   * can unregister it.
   */
  private tokenListener: () => void;

  /** Tracks the current User. */
  private currentUser: User = User.UNAUTHENTICATED;

  /** Promise that allows blocking on the initialization of Firebase Auth. */
  private authDeferred = new Deferred();

  /**
   * Counter used to detect if the token changed while a getToken request was
   * outstanding.
   */
  private tokenCounter = 0;

  /** The listener registered with setChangeListener(). */
  private changeListener?: CredentialChangeListener;

  private forceRefresh = false;

  private auth: FirebaseAuthInternal | null = null;

  private asyncQueue: AsyncQueue | null = null;

  constructor(authProvider: Provider<FirebaseAuthInternalName>) {
    this.tokenListener = () => {
      this.tokenCounter++;
      this.currentUser = this.getUser();
      this.authDeferred.resolve();
      if (this.changeListener) {
        this.asyncQueue!.enqueueRetryable(() =>
          this.changeListener!(this.currentUser)
        );
      }
    };

    const registerAuth = (auth: FirebaseAuthInternal): void => {
      logDebug('FirebaseCredentialsProvider', 'Auth detected');
      this.auth = auth;
      this.auth.addAuthTokenListener(this.tokenListener);
    };

    authProvider.onInit(auth => registerAuth(auth));

    // Our users can initialize Auth right after Firestore, so we give it
    // a chance to register itself with the component framework before we
    // determine whether to start up in unauthenticated mode.
    setTimeout(() => {
      if (!this.auth) {
        const auth = authProvider.getImmediate({ optional: true });
        if (auth) {
          registerAuth(auth);
        } else {
          // If auth is still not available, proceed with `null` user
          logDebug('FirebaseCredentialsProvider', 'Auth not yet detected');
          this.authDeferred.resolve();
        }
      }
    }, 0);
  }

  getToken(): Promise<Token | null> {
    debugAssert(
      this.tokenListener != null,
      'getToken cannot be called after listener removed.'
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
          'FirebaseCredentialsProvider',
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

  setChangeListener(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener
  ): void {
    debugAssert(!this.asyncQueue, 'Can only call setChangeListener() once.');
    this.asyncQueue = asyncQueue;

    // Blocks the AsyncQueue until the next user is available.
    this.asyncQueue!.enqueueRetryable(async () => {
      await this.authDeferred.promise;
      await changeListener(this.currentUser);
      this.changeListener = changeListener;
    });
  }

  removeChangeListener(): void {
    if (this.auth) {
      this.auth.removeAuthTokenListener(this.tokenListener!);
    }
    this.changeListener = () => Promise.resolve();
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

// Manual type definition for the subset of Gapi we use.
interface Gapi {
  auth: {
    getAuthHeaderValueForFirstParty: (
      userIdentifiers: Array<{ [key: string]: string }>
    ) => string | null;
  };
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

  constructor(
    private gapi: Gapi,
    private sessionIndex: string,
    private iamToken: string | null
  ) {}

  get authHeaders(): { [header: string]: string } {
    const headers: { [header: string]: string } = {
      'X-Goog-AuthUser': this.sessionIndex
    };
    // Use array notation to prevent minification
    const authHeader = this.gapi['auth']['getAuthHeaderValueForFirstParty']([]);
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (this.iamToken) {
      headers['X-Goog-Iam-Authorization-Token'] = this.iamToken;
    }
    return headers;
  }
}

/*
 * Provides user credentials required for the Firestore JavaScript SDK
 * to authenticate the user, using technique that is only available
 * to applications hosted by Google.
 */
export class FirstPartyCredentialsProvider implements CredentialsProvider {
  constructor(
    private gapi: Gapi,
    private sessionIndex: string,
    private iamToken: string | null
  ) {}

  getToken(): Promise<Token | null> {
    return Promise.resolve(
      new FirstPartyToken(this.gapi, this.sessionIndex, this.iamToken)
    );
  }

  setChangeListener(
    asyncQueue: AsyncQueue,
    changeListener: CredentialChangeListener
  ): void {
    // Fire with initial uid.
    asyncQueue.enqueueRetryable(() => changeListener(User.FIRST_PARTY));
  }

  removeChangeListener(): void {}

  invalidateToken(): void {}
}

/**
 * Builds a CredentialsProvider depending on the type of
 * the credentials passed in.
 */
export function makeCredentialsProvider(
  credentials?: CredentialsSettings
): CredentialsProvider {
  if (!credentials) {
    return new EmptyCredentialsProvider();
  }

  switch (credentials['type']) {
    case 'gapi':
      const client = credentials['client'] as Gapi;
      // Make sure this really is a Gapi client.
      hardAssert(
        !!(
          typeof client === 'object' &&
          client !== null &&
          client['auth'] &&
          client['auth']['getAuthHeaderValueForFirstParty']
        ),
        'unexpected gapi interface'
      );
      return new FirstPartyCredentialsProvider(
        client,
        credentials['sessionIndex'] || '0',
        credentials['iamToken'] || null
      );

    case 'provider':
      return credentials['client'];

    default:
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'makeCredentialsProvider failed due to invalid credential type'
      );
  }
}
