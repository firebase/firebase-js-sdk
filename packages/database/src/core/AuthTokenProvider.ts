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

import { FirebaseAuthTokenData } from '@firebase/app-types/private';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import { log, warn } from './util/util';

// @internal
export interface AuthTokenProvider {
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData>;
  addTokenChangeListener(listener: (token: string | null) => void): void;
  removeTokenChangeListener(listener: (token: string | null) => void): void;
  notifyForInvalidToken(): void;
}

/**
 * Abstraction around FirebaseApp's token fetching capabilities.
 */
export class FirebaseAuthTokenProvider implements AuthTokenProvider {
  private auth_: FirebaseAuthInternal | null = null;

  constructor(
    private appName_: string,
    private firebaseOptions_: object,
    private authProvider_: Provider<FirebaseAuthInternalName>
  ) {
    this.auth_ = authProvider_.getImmediate({ optional: true });
    if (!this.auth_) {
      authProvider_.onInit(auth => (this.auth_ = auth));
    }
  }

  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData> {
    if (!this.auth_) {
      return new Promise<FirebaseAuthTokenData>((resolve, reject) => {
        // Support delayed initialization of FirebaseAuth. This allows our
        // customers to initialize the RTDB SDK before initializing Firebase
        // Auth and ensures that all requests are authenticated if a token
        // becomes available before the timeout below expires.
        setTimeout(() => {
          if (this.auth_) {
            this.getToken(forceRefresh).then(resolve, reject);
          } else {
            resolve(null);
          }
        }, 0);
      });
    }

    return this.auth_.getToken(forceRefresh).catch(error => {
      // TODO: Need to figure out all the cases this is raised and whether
      // this makes sense.
      if (error && error.code === 'auth/token-not-initialized') {
        log('Got auth/token-not-initialized error.  Treating as null token.');
        return null;
      } else {
        return Promise.reject(error);
      }
    });
  }

  addTokenChangeListener(listener: (token: string | null) => void): void {
    // TODO: We might want to wrap the listener and call it with no args to
    // avoid a leaky abstraction, but that makes removing the listener harder.
    if (this.auth_) {
      this.auth_.addAuthTokenListener(listener);
    } else {
      this.authProvider_
        .get()
        .then(auth => auth.addAuthTokenListener(listener));
    }
  }

  removeTokenChangeListener(listener: (token: string | null) => void): void {
    this.authProvider_
      .get()
      .then(auth => auth.removeAuthTokenListener(listener));
  }

  notifyForInvalidToken(): void {
    let errorMessage =
      'Provided authentication credentials for the app named "' +
      this.appName_ +
      '" are invalid. This usually indicates your app was not ' +
      'initialized correctly. ';
    if ('credential' in this.firebaseOptions_) {
      errorMessage +=
        'Make sure the "credential" property provided to initializeApp() ' +
        'is authorized to access the specified "databaseURL" and is from the correct ' +
        'project.';
    } else if ('serviceAccount' in this.firebaseOptions_) {
      errorMessage +=
        'Make sure the "serviceAccount" property provided to initializeApp() ' +
        'is authorized to access the specified "databaseURL" and is from the correct ' +
        'project.';
    } else {
      errorMessage +=
        'Make sure the "apiKey" and "databaseURL" properties provided to ' +
        'initializeApp() match the values provided for your app at ' +
        'https://console.firebase.google.com/.';
    }
    warn(errorMessage);
  }
}

/* AuthTokenProvider that supplies a constant token. Used by Admin SDK or mockUserToken with emulators. */
export class EmulatorTokenProvider implements AuthTokenProvider {
  /** A string that is treated as an admin access token by the RTDB emulator. Used by Admin SDK. */
  static OWNER = 'owner';

  constructor(private accessToken: string) {}

  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData> {
    return Promise.resolve({
      accessToken: this.accessToken
    });
  }

  addTokenChangeListener(listener: (token: string | null) => void): void {
    // Invoke the listener immediately to match the behavior in Firebase Auth
    // (see packages/auth/src/auth.js#L1807)
    listener(this.accessToken);
  }

  removeTokenChangeListener(listener: (token: string | null) => void): void {}

  notifyForInvalidToken(): void {}
}
