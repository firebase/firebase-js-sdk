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
import { Code, FirestoreError } from '../util/error';

// TODO(mikelehen): This should be split into multiple files and probably
// moved to an auth/ folder to match other platforms.

export interface FirstPartyCredentialsSettings {
  type: 'gapi';
  client: unknown;
  sessionIndex: string;
}

export interface ProviderCredentialsSettings {
  type: 'provider';
  client: CredentialsProvider;
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
export type CredentialChangeListener = (user: User) => void;

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
   */
  setChangeListener(changeListener: CredentialChangeListener): void;

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

  setChangeListener(changeListener: CredentialChangeListener): void {
    debugAssert(
      !this.changeListener,
      'Can only call setChangeListener() once.'
    );
    this.changeListener = changeListener;
    // Fire with initial user.
    changeListener(User.UNAUTHENTICATED);
  }

  removeChangeListener(): void {
    debugAssert(
      this.changeListener !== null,
      'removeChangeListener() when no listener registered'
    );
    this.changeListener = null;
  }
}

export class FirebaseCredentialsProvider implements CredentialsProvider {
  /**
   * The auth token listener registered with FirebaseApp, retained here so we
   * can unregister it.
   */
  private tokenListener: ((token: string | null) => void) | null = null;

  /** Tracks the current User. */
  private currentUser: User = User.UNAUTHENTICATED;
  private receivedInitialUser: boolean = false;

  /**
   * Counter used to detect if the token changed while a getToken request was
   * outstanding.
   */
  private tokenCounter = 0;

  /** The listener registered with setChangeListener(). */
  private changeListener: CredentialChangeListener | null = null;

  private forceRefresh = false;

  private auth: FirebaseAuthInternal | null;

  constructor(authProvider: Provider<FirebaseAuthInternalName>) {
    this.tokenListener = () => {
      this.tokenCounter++;
      this.currentUser = this.getUser();
      this.receivedInitialUser = true;
      if (this.changeListener) {
        this.changeListener(this.currentUser);
      }
    };

    this.tokenCounter = 0;

    this.auth = authProvider.getImmediate({ optional: true });

    if (this.auth) {
      this.auth.addAuthTokenListener(this.tokenListener!);
    } else {
      // if auth is not available, invoke tokenListener once with null token
      this.tokenListener(null);
      authProvider.get().then(
        auth => {
          this.auth = auth;
          if (this.tokenListener) {
            // tokenListener can be removed by removeChangeListener()
            this.auth.addAuthTokenListener(this.tokenListener);
          }
        },
        () => {
          /* this.authProvider.get() never rejects */
        }
      );
    }
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
        throw new FirestoreError(
          Code.ABORTED,
          'getToken aborted due to token change.'
        );
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

  setChangeListener(changeListener: CredentialChangeListener): void {
    debugAssert(
      !this.changeListener,
      'Can only call setChangeListener() once.'
    );
    this.changeListener = changeListener;

    // Fire the initial event
    if (this.receivedInitialUser) {
      changeListener(this.currentUser);
    }
  }

  removeChangeListener(): void {
    debugAssert(
      this.tokenListener != null,
      'removeChangeListener() called twice'
    );
    debugAssert(
      this.changeListener !== null,
      'removeChangeListener() called when no listener registered'
    );

    if (this.auth) {
      this.auth.removeAuthTokenListener(this.tokenListener!);
    }
    this.tokenListener = null;
    this.changeListener = null;
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

  constructor(private gapi: Gapi, private sessionIndex: string) {}

  get authHeaders(): { [header: string]: string } {
    const headers: { [header: string]: string } = {
      'X-Goog-AuthUser': this.sessionIndex
    };
    const authHeader = this.gapi.auth.getAuthHeaderValueForFirstParty([]);
    if (authHeader) {
      headers['Authorization'] = authHeader;
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
  constructor(private gapi: Gapi, private sessionIndex: string) {}

  getToken(): Promise<Token | null> {
    return Promise.resolve(new FirstPartyToken(this.gapi, this.sessionIndex));
  }

  setChangeListener(changeListener: CredentialChangeListener): void {
    // Fire with initial uid.
    changeListener(User.FIRST_PARTY);
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

  switch (credentials.type) {
    case 'gapi':
      const client = credentials.client as Gapi;
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
        credentials.sessionIndex || '0'
      );

    case 'provider':
      return credentials.client;

    default:
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'makeCredentialsProvider failed due to invalid credential type'
      );
  }
}
