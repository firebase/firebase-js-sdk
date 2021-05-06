/**
 * @license
 * Copyright 2020 Google LLC
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

  /**
   *
   * @param isTokenAutoRefreshEnabled - If true, the SDK automatically
   * refreshes App Check tokens as needed. This overrides any value set
   * during `activate()`.
   */
  setTokenAutoRefreshEnabled(isTokenAutoRefreshEnabled: boolean): void;
}

/**
 * An App Check provider. This can be either the built-in reCAPTCHA provider
 * or a custom provider. For more on custom providers, see
 * https://firebase.google.com/docs/app-check/web-custom-provider
 */
interface AppCheckProvider {
  /**
   * Returns an AppCheck token.
   */
  getToken(): Promise<AppCheckToken>;
}

/**
 * The token returned from an `AppCheckProvider`.
 */
interface AppCheckToken {
  /**
   * The token string in JWT format.
   */
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
