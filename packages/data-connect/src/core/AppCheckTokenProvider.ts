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

import { FirebaseApp, _isFirebaseServerApp } from '@firebase/app';
import {
  AppCheckInternalComponentName,
  AppCheckTokenListener,
  AppCheckTokenResult,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import { Provider } from '@firebase/component';

/**
 * @internal
 * Abstraction around AppCheck's token fetching capabilities.
 */
export class AppCheckTokenProvider {
  private appCheck?: FirebaseAppCheckInternal;
  private serverAppAppCheckToken?: string;
  constructor(
    app: FirebaseApp,
    private appCheckProvider?: Provider<AppCheckInternalComponentName>
  ) {
    if (_isFirebaseServerApp(app) && app.settings.appCheckToken) {
      this.serverAppAppCheckToken = app.settings.appCheckToken;
    }
    this.appCheck = appCheckProvider?.getImmediate({ optional: true });
    if (!this.appCheck) {
      void appCheckProvider
        ?.get()
        .then(appCheck => (this.appCheck = appCheck))
        .catch();
    }
  }

  getToken(forceRefresh?: boolean): Promise<AppCheckTokenResult> {
    if (this.serverAppAppCheckToken) {
      return Promise.resolve({ token: this.serverAppAppCheckToken });
    }

    if (!this.appCheck) {
      return new Promise<AppCheckTokenResult>((resolve, reject) => {
        // Support delayed initialization of FirebaseAppCheck. This allows our
        // customers to initialize the RTDB SDK before initializing Firebase
        // AppCheck and ensures that all requests are authenticated if a token
        // becomes available before the timoeout below expires.
        setTimeout(() => {
          if (this.appCheck) {
            this.getToken(forceRefresh).then(resolve, reject);
          } else {
            resolve(null);
          }
        }, 0);
      });
    }
    return this.appCheck.getToken(forceRefresh);
  }

  addTokenChangeListener(listener: AppCheckTokenListener): void {
    void this.appCheckProvider
      ?.get()
      .then(appCheck => appCheck.addTokenListener(listener));
  }
}
