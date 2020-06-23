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

import { ComponentContainer } from '@firebase/component';

/**
 * A FirebaseApp holds the initialization information for a collection of
 * services.
 *
 * Do not call this constructor directly. Instead, use
 * {@link @firebase/app-exp#(initializeApp:1) | initializeApp()} to create an app.
 *
 * @public
 */
export interface FirebaseApp {
  /**
   * The (read-only) name for this app.
   *
   * The default app's name is `"[DEFAULT]"`.
   *
   * @example
   * ```javascript
   * // The default app's name is "[DEFAULT]"
   * const app = initializeApp(defaultAppConfig);
   * console.log(app.name);  // "[DEFAULT]"
   * ```
   *
   * @example
   * ```javascript
   * // A named app's name is what you provide to initializeApp()
   * const otherApp = initializeApp(otherAppConfig, "other");
   * console.log(otherApp.name);  // "other"
   * ```
   */
  readonly name: string;

  /**
   * The (read-only) configuration options for this app. These are the original
   * parameters given in {@link @firebase/app-exp#(initializeApp:1) | initializeApp()}.
   *
   * @example
   * ```javascript
   * const app = initializeApp(config);
   * console.log(app.options.databaseURL === config.databaseURL);  // true
   * ```
   */
  readonly options: FirebaseOptions;

  /**
   * The settable config flag for GDPR opt-in/opt-out
   */
  automaticDataCollectionEnabled: boolean;
}

/**
 * @internal
 */
export interface _FirebaseAppInternal extends FirebaseApp {
  container: ComponentContainer;
  isDeleted: boolean;
  checkDestroyed(): void;
}

/**
 * @public
 */
export interface FirebaseOptions {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

/**
 * @public
 */
export interface FirebaseAppConfig {
  name?: string;
  automaticDataCollectionEnabled?: boolean;
}

/**
 * @public
 */
export interface PlatformLoggerService {
  getPlatformInfoString(): string;
}

/**
 * @internal
 */
export interface _FirebaseService {
  app: FirebaseApp;
  /**
   * Delete the service and free it's resources - called from
   * {@link @firebase/app-exp#deleteApp | deleteApp()}
   */
  delete(): Promise<void>;
}

export interface VersionService {
  library: string;
  version: string;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-exp': FirebaseApp;
    'app-version': VersionService;
    'platform-logger': PlatformLoggerService;
  }
}
