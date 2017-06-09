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

import { log, warn } from "../../utils/libs/logger";
import { 
  FirebaseApp, 
  FirebaseAuthTokenData // <-- included to suppress TS error
} from "../../app/firebase_app";

/**
 * Abstraction around FirebaseApp's token fetching capabilities.
 */
export class AuthTokenProvider {
  constructor(private app: FirebaseApp) {}

  /**
   * @param {boolean} forceRefresh
   * @return {!Promise<firebase.AuthTokenData>}
   */
  getToken(forceRefresh: boolean) {
    return this.app['INTERNAL']['getToken'](forceRefresh)
      .catch(error => {
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

  addTokenChangeListener(listener) {
    // TODO: We might want to wrap the listener and call it with no args to
    // avoid a leaky abstraction, but that makes removing the listener harder.

    // TODO: Refactor this to eleminate the need for the `INTERNAL` object
    this.app['INTERNAL']['addAuthTokenListener'](listener);
  }

  removeTokenChangeListener(listener) {
    // TODO: Refactor this to eleminate the need for the `INTERNAL` object
    this.app['INTERNAL']['removeAuthTokenListener'](listener);
  }

  notifyForInvalidToken() {
    var errorMessage = 'Provided authentication credentials for the app named "' +
    this.app.name + '" are invalid. This usually indicates your app was not ' +
    'initialized correctly. ' +
    'Make sure the "apiKey" and "databaseURL" properties provided to ' +
    'initializeApp() match the values provided for your app at ' +
    'https://console.firebase.google.com/.';
    warn(errorMessage);
  }
}
