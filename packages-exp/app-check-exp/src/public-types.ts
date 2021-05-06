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

export interface FirebaseAppCheck {
  /**
   * Activate AppCheck
   * @param siteKeyOrProvider - reCAPTCHA sitekey or custom token provider
   * @param isTokenAutoRefreshEnabled - If true, enables SDK to automatically
   * refresh AppCheck token as needed. If undefined, the value will default
   * to the value of `app.automaticDataCollectionEnabled`. That property
   * defaults to false and can be set in the app config.
   */
  activate(
    siteKeyOrProvider: string | AppCheckProvider,
    isTokenAutoRefreshEnabled?: boolean
  ): void;
  setTokenAutoRefreshEnabled(isTokenAutoRefreshEnabled: boolean): void;
}

export interface AppCheckProvider {
  /**
   * Returns an AppCheck token
   */
  getToken(): Promise<AppCheckToken>;
}

export interface AppCheckToken {
  readonly token: string;
  /**
   * The local timestamp after which the token will expire.
   */
  readonly expireTimeMillis: number;
}

export type AppCheckComponentName = 'appCheck';
declare module '@firebase/component' {
  interface NameServiceMapping {
    'appCheck': FirebaseAppCheck;
  }
}
