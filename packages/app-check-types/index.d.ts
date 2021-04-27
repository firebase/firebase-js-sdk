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
   * @param siteKeyOrOrovider - reCAPTCHA sitekey or custom token provider
   */
  activate(siteKeyOrProvider: string | AppCheckProvider): void;
}

interface AppCheckProvider {
  /**
   * returns an AppCheck token
   */
  getToken(): Promise<AppCheckToken>;
}

interface AppCheckToken {
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
