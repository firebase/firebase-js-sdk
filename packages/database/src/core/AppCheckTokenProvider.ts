/**
 * @license
 * Copyright 2021 Google LLC
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

import { FirebaseApp, _isFirebaseServerApp } from '@firebase/app'; // eslint-disable-line import/no-extraneous-dependencies
import {
  AppCheckInternalComponentName,
  AppCheckTokenListener,
  AppCheckTokenResult,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import { Provider } from '@firebase/component';

import { warn } from './util/util';

/**
 * Abstraction around AppCheck's token fetching capabilities.
 */
export class AppCheckTokenProvider {
  private appCheck?: FirebaseAppCheckInternal;
  private serverAppAppCheckToken?: string;
  private appName: string;
  constructor(
    app: FirebaseApp,
    private appCheckProvider?: Provider<AppCheckInternalComponentName>
  ) {
    this.appName = app.name;
    if (_isFirebaseServerApp(app) && app.settings.appCheckToken) {
      this.serverAppAppCheckToken = app.settings.appCheckToken;
    }
    this.appCheck = appCheckProvider?.getImmediate({ optional: true });
    if (!this.appCheck) {
      appCheckProvider?.get().then(appCheck => (this.appCheck = appCheck));
    }
  }

  getToken(forceRefresh?: boolean): Promise<AppCheckTokenResult> {
    if (this.serverAppAppCheckToken) {
      if (forceRefresh) {
        return new Promise<AppCheckTokenResult>(resolve => {
          const appCheckTokenResult = {
            token: 'ERROR',
            error: new Error(
              'Attempted reuse of FirebaseServerApp.appCheckToken after previous usage failed.'
            )
          };
          resolve(appCheckTokenResult);
        });
      }
      return Promise.resolve({ token: this.serverAppAppCheckToken });
    }
    if (!this.appCheck) {
      return new Promise<AppCheckTokenResult>((resolve, reject) => {
        // Support delayed initialization of FirebaseAppCheck. This allows our
        // customers to initialize the RTDB SDK before initializing Firebase
        // AppCheck and ensures that all requests are authenticated if a token
        // becomes available before the timeout below expires.
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

  addTokenChangeListener(listener: AppCheckTokenListener) {
    this.appCheckProvider
      ?.get()
      .then(appCheck => appCheck.addTokenListener(listener));
  }

  notifyForInvalidToken(): void {
    warn(
      `Provided AppCheck credentials for the app named "${this.appName}" ` +
        'are invalid. This usually indicates your app was not initialized correctly.'
    );
  }
}
