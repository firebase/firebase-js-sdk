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

import { FirebaseApp, FirebaseAuthTokenData } from '@firebase/app';
import { log, warn } from './util/util';

/**
 * Abstraction around FirebaseApp's token fetching capabilities.
 */
export class AuthTokenProvider {
  /**
   * @param {!FirebaseApp} app_
   */
  constructor(private app_: FirebaseApp) {}

  /**
   * @param {boolean} forceRefresh
   * @return {!Promise<FirebaseAuthTokenData>}
   */
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData> {
    return this.app_['INTERNAL']['getToken'](forceRefresh).then(
      null,
      // .catch
      function(error) {
        // TODO: Need to figure out all the cases this is raised and whether
        // this makes sense.
        if (error && error.code === 'auth/token-not-initialized') {
          log('Got auth/token-not-initialized error.  Treating as null token.');
          return null;
        } else {
          return Promise.reject(error);
        }
      }
    );
  }

  addTokenChangeListener(listener: (token: string | null) => void) {
    // TODO: We might want to wrap the listener and call it with no args to
    // avoid a leaky abstraction, but that makes removing the listener harder.
    this.app_['INTERNAL']['addAuthTokenListener'](listener);
  }

  removeTokenChangeListener(listener: (token: string | null) => void) {
    this.app_['INTERNAL']['removeAuthTokenListener'](listener);
  }

  notifyForInvalidToken() {
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
