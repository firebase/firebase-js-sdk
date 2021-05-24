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

import { FirebaseApp } from '@firebase/app-exp';

/**
 * The Firebase AppCheck service interface.
 *
 * @public
 */
export interface AppCheck {
  /**
   * The FirebaseApp this Functions instance is associated with.
   */
  app: FirebaseApp;
}

/**
 * An App Check provider. This can be either the built-in reCAPTCHA
 * provider or a custom provider. For more on custom providers, see
 * https://firebase.google.com/docs/app-check/web-custom-provider
 * @public
 */
export interface AppCheckProvider {
  /**
   * Returns an AppCheck token.
   */
  getToken: () => Promise<AppCheckToken>;
}

/**
 * The token returned from an {@link AppCheckProvider}.
 * @public
 */
export interface AppCheckToken {
  readonly token: string;
  /**
   * The local timestamp after which the token will expire.
   */
  readonly expireTimeMillis: number;
}

/**
 * @internal
 */
export type _AppCheckComponentName = 'app-check-exp';

/**
 * Options for App Check initialization.
 * @public
 */
export interface AppCheckOptions {
  /**
   * reCAPTCHA provider or custom provider.
   */
  provider: AppCheckProvider;
  /**
   * If set to true, enables automatic background refresh of app check token.
   */
  isTokenAutoRefreshEnabled?: boolean;
}

/**
 * Options when creating a {@link CustomProvider}.
 * @public
 */
export interface CustomProviderOptions {
  /**
   * Method to get an App Check token through a custom provider
   * service.
   */
  getToken(): Promise<AppCheckToken>;
}
