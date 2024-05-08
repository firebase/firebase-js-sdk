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

import { FirebaseOptions } from '@firebase/app';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName,
  FirebaseAuthTokenData
} from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { logger } from '../logger';

export interface AuthTokenProvider {
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null>;
  addTokenChangeListener(listener: AuthTokenListener): void;
}
export type AuthTokenListener = (token: string | null) => void;

export class FirebaseAuthProvider implements AuthTokenProvider {
  private auth_: FirebaseAuthInternal;
  constructor(
    private appName: string,
    private options: FirebaseOptions,
    private authProvider_: Provider<FirebaseAuthInternalName>
  ) {
    this.auth_ = authProvider_.getImmediate({ optional: true })!;
    if (!this.auth_) {
      authProvider_.onInit(auth => (this.auth_ = auth));
    }
  }
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null> {
    if (!this.auth_) {
      return new Promise((resolve, reject) => {
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
      if (error && error.code === 'auth/token-not-initialized') {
        logger.debug(
          'Got auth/token-not-initialized error.  Treating as null token.'
        );
        return null;
      } else {
        logger.error(
          'Error received when attempting to retrieve token: ' +
            JSON.stringify(error)
        );
        return Promise.reject(error);
      }
    });
  }
  addTokenChangeListener(listener: AuthTokenListener) {
    this.auth_?.addAuthTokenListener(listener);
  }
  removeTokenChangeListener(listener: (token: string | null) => void): void {
    this.authProvider_
      .get()
      .then(auth => auth.removeAuthTokenListener(listener));
  }
}
export class EmulatorTokenProvider implements AuthTokenProvider {
  /** A string that is treated as an admin access token by the RTDB emulator. Used by Admin SDK. */
  static OWNER = 'owner';

  constructor(private accessToken: string) {}

  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData> {
    return Promise.resolve({
      accessToken: this.accessToken
    });
  }

  addTokenChangeListener(listener: AuthTokenListener): void {
    // Invoke the listener immediately to match the behavior in Firebase Auth
    // (see packages/auth/src/auth.js#L1807)
    listener(this.accessToken);
  }

  removeTokenChangeListener(listener: (token: string | null) => void): void {}

  notifyForInvalidToken(): void {}
}
