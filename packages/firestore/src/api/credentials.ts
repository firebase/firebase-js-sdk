/**
 * Copyright 2017 Google Inc.
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

import { User } from '../auth/user';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { AnyJs } from '../util/misc';
import { FirebaseApp } from '@firebase/app';

// TODO(mikelehen): This should be split into multiple files and probably
// moved to an auth/ folder to match other platforms.

export interface FirstPartyCredentialsSettings {
  type: 'gapi';
  client: Gapi;
  sessionIndex: string;
}

export interface GoogleAuthCredentialsSettings {
  type: 'google-auth';
  client: GoogleAuthClient;
}

export interface ProviderCredentialsSettings {
  type: 'provider';
  client: CredentialsProvider;
}

/** Settings for private credentials */
export type CredentialsSettings =
  | FirstPartyCredentialsSettings
  | GoogleAuthCredentialsSettings
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
    this.authHeaders = { Authorization: `Bearer ${value}` };
  }
}

/**
 * A Listener for user change events.
 */
export type UserListener = (user: User) => void;

/**
 * Provides methods for getting the uid and token for the current user and
 * listening for changes.
 */
export interface CredentialsProvider {
  /**
   * Requests a token for the current user, optionally forcing a refreshed
   * token to be fetched.
   */
  getToken(forceRefresh: boolean): Promise<Token | null>;

  /**
   * Specifies a listener to be notified of user changes (sign-in / sign-out).
   * It immediately called once with the initial user.
   */
  setUserChangeListener(listener: UserListener): void;

  /** Removes the previously-set user change listener. */
  removeUserChangeListener(): void;
}

/** A CredentialsProvider that always yields an empty token. */
export class EmptyCredentialsProvider implements CredentialsProvider {
  /**
   * Stores the User listener registered with setUserChangeListener()
   * This isn't actually necessary since the UID never changes, but we use this
   * to verify the listen contract is adhered to in tests.
   */
  private userListener: UserListener | null = null;

  constructor() {}

  getToken(forceRefresh: boolean): Promise<Token | null> {
    return Promise.resolve<Token | null>(null);
  }

  setUserChangeListener(listener: UserListener): void {
    assert(!this.userListener, 'Can only call setUserChangeListener() once.');
    this.userListener = listener;
    // Fire with initial user.
    listener(User.UNAUTHENTICATED);
  }

  removeUserChangeListener(): void {
    assert(
      this.userListener !== null,
      'removeUserChangeListener() when no listener registered'
    );
    this.userListener = null;
  }
}

export class FirebaseCredentialsProvider implements CredentialsProvider {
  /**
   * The auth token listener registered with FirebaseApp, retained here so we
   * can unregister it.
   */
  private tokenListener: ((token: string | null) => void) | null = null;

  /** Tracks the current User. */
  private currentUser: User;

  /**
   * Counter used to detect if the user changed while a getToken request was
   * outstanding.
   */
  private userCounter = 0;

  /** The User listener registered with setUserChangeListener(). */
  private userListener: UserListener | null = null;

  constructor(private readonly app: FirebaseApp) {
    // We listen for token changes but all we really care about is knowing when
    // the uid may have changed.
    this.tokenListener = () => {
      const newUser = this.getUser();
      if (!this.currentUser || !newUser.equals(this.currentUser)) {
        this.currentUser = newUser;
        this.userCounter++;
        if (this.userListener) {
          this.userListener(this.currentUser);
        }
      }
    };

    this.userCounter = 0;

    // Will fire at least once where we set this.currentUser
    this.app.INTERNAL.addAuthTokenListener(this.tokenListener);
  }

  getToken(forceRefresh: boolean): Promise<Token | null> {
    assert(
      this.tokenListener != null,
      'getToken cannot be called after listener removed.'
    );

    // Take note of the current value of the userCounter so that this method can
    // fail (with an ABORTED error) if there is a user change while the request
    // is outstanding.
    const initialUserCounter = this.userCounter;
    return this.app.INTERNAL.getToken(forceRefresh).then(tokenData => {
      // Cancel the request since the user changed while the request was
      // outstanding so the response is likely for a previous user (which
      // user, we can't be sure).
      if (this.userCounter !== initialUserCounter) {
        throw new FirestoreError(
          Code.ABORTED,
          'getToken aborted due to uid change.'
        );
      } else {
        if (tokenData) {
          assert(
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

  setUserChangeListener(listener: UserListener): void {
    assert(!this.userListener, 'Can only call setUserChangeListener() once.');
    this.userListener = listener;

    // Fire the initial event, but only if we received the initial user
    if (this.currentUser) {
      listener(this.currentUser);
    }
  }

  removeUserChangeListener(): void {
    assert(
      this.tokenListener != null,
      'removeUserChangeListener() called twice'
    );
    assert(
      this.userListener !== null,
      'removeUserChangeListener() called when no listener registered'
    );
    this.app.INTERNAL.removeAuthTokenListener(this.tokenListener!);
    this.tokenListener = null;
    this.userListener = null;
  }

  private getUser(): User {
    // TODO(mikelehen): Remove this check once we're shipping with firebase.js.
    if (typeof this.app.INTERNAL.getUid !== 'function') {
      fail(
        'This version of the Firestore SDK requires at least version' +
          ' 3.7.0 of firebase.js.'
      );
    }
    const currentUid = this.app.INTERNAL.getUid();
    assert(
      currentUid === null || typeof currentUid === 'string',
      'Received invalid UID: ' + currentUid
    );
    return new User(currentUid);
  }
}

// Wrap a google-auth-library client as a CredentialsProvider.
// NOTE: grpc-connection can natively accept a google-auth-library
// client via createFromGoogleCredential(), but we opt to plumb the tokens
// through our CredentialsProvider interface, at least for now.
export class GoogleCredentialsProvider implements CredentialsProvider {
  constructor(private authClient: GoogleAuthClient) {}

  getToken(forceRefresh: boolean): Promise<Token | null> {
    return new Promise<Token | null>((resolve, reject) => {
      // TODO(b/32935141): ideally this would be declared as an extern
      this.authClient[
        'getAccessToken'
      ]((error: AnyJs, tokenLiteral: string) => {
        if (error) {
          reject(error);
        } else {
          resolve(new OAuthToken(tokenLiteral, User.GOOGLE_CREDENTIALS));
        }
      });
    });
  }

  // NOTE: A google-auth-library client represents an immutable "user", so
  // once we fire the initial event, it'll never change.
  setUserChangeListener(listener: UserListener): void {
    // Fire with initial uid.
    listener(User.GOOGLE_CREDENTIALS);
  }

  removeUserChangeListener(): void {}
}

/**
 * Very incomplete typing for an auth client from
 * https://github.com/google/google-auth-library-nodejs/
 */
export interface GoogleAuthClient {
  getAccessToken(callback: (error?: Error, token?: string) => void): void;
}
// TODO(b/32935141): Ideally gapi type would be declared as an extern
// tslint:disable-next-line:no-any
export type Gapi = any;

/*
 * FirstPartyToken provides a fresh token each time its value
 * is requested, because if the token is too old, requests will be rejected.
 * TODO(b/33147818) this implementation violates the current assumption that
 * tokens are immutable.  We need to either revisit this assumption or come
 * up with some way for FPA to use the listen/unlisten interface.
 */
export class FirstPartyToken implements Token {
  type = 'FirstParty' as TokenType;
  user = User.FIRST_PARTY;

  constructor(private gapi: Gapi, private sessionIndex: string) {
    assert(
      this.gapi &&
        this.gapi['auth'] &&
        this.gapi['auth']['getAuthHeaderValueForFirstParty'],
      'unexpected gapi interface'
    );
  }

  get authHeaders(): { [header: string]: string } {
    return {
      Authorization: this.gapi['auth']['getAuthHeaderValueForFirstParty']([]),
      'X-Goog-AuthUser': this.sessionIndex
    };
  }
}

/*
 * Provides user credentials required for the Firestore JavaScript SDK
 * to authenticate the user, using technique that is only available
 * to applications hosted by Google.
 */
export class FirstPartyCredentialsProvider implements CredentialsProvider {
  constructor(private gapi: Gapi, private sessionIndex: string) {
    assert(
      this.gapi &&
        this.gapi['auth'] &&
        this.gapi['auth']['getAuthHeaderValueForFirstParty'],
      'unexpected gapi interface'
    );
  }

  getToken(forceRefresh: boolean): Promise<Token | null> {
    return Promise.resolve(new FirstPartyToken(this.gapi, this.sessionIndex));
  }

  // TODO(33108925): can someone switch users w/o a page refresh?
  // TODO(33110621): need to understand token/session lifecycle
  setUserChangeListener(listener: UserListener): void {
    // Fire with initial uid.
    listener(User.FIRST_PARTY);
  }

  removeUserChangeListener(): void {}
}

/**
 * Builds a CredentialsProvider depending on the type of
 * the credentials passed in.
 */
export function makeCredentialsProvider(credentials?: CredentialsSettings) {
  if (!credentials) {
    return new EmptyCredentialsProvider();
  }

  switch (credentials.type) {
    case 'google-auth':
      return new GoogleCredentialsProvider(credentials.client);

    case 'gapi':
      return new FirstPartyCredentialsProvider(
        credentials.client,
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
