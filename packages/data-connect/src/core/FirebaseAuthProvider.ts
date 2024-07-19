/**
 * @license
 * Copyright 2024 Google LLC
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

import { FirebaseOptions } from '@firebase/app-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName,
  FirebaseAuthTokenData
} from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import { logDebug, logError } from '../logger';

export interface AuthTokenProvider {
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null>;
  addTokenChangeListener(listener: AuthTokenListener): void;
}
export type AuthTokenListener = (token: string | null) => void;

export class FirebaseAuthProvider implements AuthTokenProvider {
  private _auth: FirebaseAuthInternal;
  constructor(
    private _appName: string,
    private _options: FirebaseOptions,
    private _authProvider: Provider<FirebaseAuthInternalName>
  ) {
    this._auth = _authProvider.getImmediate({ optional: true })!;
    if (!this._auth) {
      _authProvider.onInit(auth => (this._auth = auth));
    }
  }
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null> {
    if (!this._auth) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (this._auth) {
            this.getToken(forceRefresh).then(resolve, reject);
          } else {
            resolve(null);
          }
        }, 0);
      });
    }
    return this._auth.getToken(forceRefresh).catch(error => {
      if (error && error.code === 'auth/token-not-initialized') {
        logDebug(
          'Got auth/token-not-initialized error.  Treating as null token.'
        );
        return null;
      } else {
        logError(
          'Error received when attempting to retrieve token: ' +
            JSON.stringify(error)
        );
        return Promise.reject(error);
      }
    });
  }
  addTokenChangeListener(listener: AuthTokenListener): void {
    this._auth?.addAuthTokenListener(listener);
  }
  removeTokenChangeListener(listener: (token: string | null) => void): void {
    this._authProvider
      .get()
      .then(auth => auth.removeAuthTokenListener(listener))
      .catch(err => logError(err));
  }
}
