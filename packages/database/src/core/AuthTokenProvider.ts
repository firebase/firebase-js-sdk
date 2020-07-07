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
import { FirebaseApp } from '@firebase/app-types';

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
    private app_: FirebaseApp,
    private authProvider_: Provider<FirebaseAuthInternalName>
  ) {
    this.auth_ = authProvider_.getImmediate({ optional: true });
    if (!this.auth_) {
      authProvider_.get().then(auth => (this.auth_ = auth));
    }
  }

  /**
   * @param {boolean} forceRefresh
   * @return {!Promise<FirebaseAuthTokenData>}
   */
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData> {
    if (!this.auth_) {
      return Promise.resolve(null);
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
      setTimeout(() => listener(null), 0);
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
      this.app_.name +
      '" are invalid. This usually indicates your app was not ' +
      'initialized correctly. ';
    if ('credential' in this.app_.options) {
      errorMessage +=
        'Make sure the "credential" property provided to initializeApp() ' +
        'is authorized to access the specified "databaseURL" and is from the correct ' +
        'project.';
    } else if ('serviceAccount' in this.app_.options) {
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

/* Auth token provider that the Admin SDK uses to connect to the Emulator. */
export class EmulatorAdminTokenProvider implements AuthTokenProvider {
  private static EMULATOR_AUTH_TOKEN = 'owner';

  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData> {
    return Promise.resolve({
      accessToken: EmulatorAdminTokenProvider.EMULATOR_AUTH_TOKEN
    });
  }

  addTokenChangeListener(listener: (token: string | null) => void): void {
    // Invoke the listener immediately to match the behavior in Firebase Auth
    // (see packages/auth/src/auth.js#L1807)
    listener(EmulatorAdminTokenProvider.EMULATOR_AUTH_TOKEN);
  }

  removeTokenChangeListener(listener: (token: string | null) => void): void {}

  notifyForInvalidToken(): void {}
}
