/**
 * @license
 * Copyright 2019 Google LLC
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

import {
  FirebaseApp,
  FirebaseOptions,
  FirebaseAppSettings
} from './public-types';
import { DEFAULT_ENTRY_NAME, PLATFORM_LOG_STRING } from './constants';
import { ERROR_FACTORY, AppError } from './errors';
import {
  ComponentContainer,
  Component,
  Name,
  ComponentType
} from '@firebase/component';
import { version } from '../../firebase/package.json';
import { FirebaseAppImpl } from './firebaseApp';
import { _apps, _components, _registerComponent } from './internal';
import { logger } from './logger';
import {
  LogLevelString,
  setLogLevel as setLogLevelImpl,
  LogCallback,
  LogOptions,
  setUserLogHandler
} from '@firebase/logger';
import { deepEqual, getDefaultAppConfig } from '@firebase/util';

export { FirebaseError } from '@firebase/util';

/**
 * The current SDK version.
 *
 * @public
 */
export const SDK_VERSION = version;

/**
 * Creates and initializes a {@link @firebase/app#FirebaseApp} instance.
 *
 * See
 * {@link
 *   https://firebase.google.com/docs/web/setup#add_firebase_to_your_app
 *   | Add Firebase to your app} and
 * {@link
 *   https://firebase.google.com/docs/web/setup#multiple-projects
 *   | Initialize multiple projects} for detailed documentation.
 *
 * @example
 * ```javascript
 *
 * // Initialize default app
 * // Retrieve your own options values by adding a web app on
 * // https://console.firebase.google.com
 * initializeApp({
 *   apiKey: "AIza....",                             // Auth / General Use
 *   authDomain: "YOUR_APP.firebaseapp.com",         // Auth with popup/redirect
 *   databaseURL: "https://YOUR_APP.firebaseio.com", // Realtime Database
 *   storageBucket: "YOUR_APP.appspot.com",          // Storage
 *   messagingSenderId: "123456789"                  // Cloud Messaging
 * });
 * ```
 *
 * @example
 * ```javascript
 *
 * // Initialize another app
 * const otherApp = initializeApp({
 *   databaseURL: "https://<OTHER_DATABASE_NAME>.firebaseio.com",
 *   storageBucket: "<OTHER_STORAGE_BUCKET>.appspot.com"
 * }, "otherApp");
 * ```
 *
 * @param options - Options to configure the app's services.
 * @param name - Optional name of the app to initialize. If no name
 *   is provided, the default is `"[DEFAULT]"`.
 *
 * @returns The initialized app.
 *
 * @public
 */
export function initializeApp(
  options: FirebaseOptions,
  name?: string
): FirebaseApp;
/**
 * Creates and initializes a FirebaseApp instance.
 *
 * @param options - Options to configure the app's services.
 * @param config - FirebaseApp Configuration
 *
 * @public
 */
export function initializeApp(
  options: FirebaseOptions,
  config?: FirebaseAppSettings
): FirebaseApp;
/**
 * Creates and initializes a FirebaseApp instance.
 *
 * @public
 */
export function initializeApp(): FirebaseApp;
export function initializeApp(
  _options?: FirebaseOptions,
  rawConfig = {}
): FirebaseApp {
  let options = _options;

  if (typeof rawConfig !== 'object') {
    const name = rawConfig;
    rawConfig = { name };
  }

  const config: Required<FirebaseAppSettings> = {
    name: DEFAULT_ENTRY_NAME,
    automaticDataCollectionEnabled: false,
    ...rawConfig
  };
  const name = config.name;

  if (typeof name !== 'string' || !name) {
    throw ERROR_FACTORY.create(AppError.BAD_APP_NAME, {
      appName: String(name)
    });
  }

  options ||= getDefaultAppConfig();

  if (!options) {
    throw ERROR_FACTORY.create(AppError.NO_OPTIONS);
  }

  const existingApp = _apps.get(name) as FirebaseAppImpl;
  if (existingApp) {
    // return the existing app if options and config deep equal the ones in the existing app.
    if (
      deepEqual(options, existingApp.options) &&
      deepEqual(config, existingApp.config)
    ) {
      return existingApp;
    } else {
      throw ERROR_FACTORY.create(AppError.DUPLICATE_APP, { appName: name });
    }
  }

  const container = new ComponentContainer(name);
  for (const component of _components.values()) {
    container.addComponent(component);
  }

  const newApp = new FirebaseAppImpl(options, config, container);

  _apps.set(name, newApp);

  return newApp;
}

/**
 * Retrieves a {@link @firebase/app#FirebaseApp} instance.
 *
 * When called with no arguments, the default app is returned. When an app name
 * is provided, the app corresponding to that name is returned.
 *
 * An exception is thrown if the app being retrieved has not yet been
 * initialized.
 *
 * @example
 * ```javascript
 * // Return the default app
 * const app = getApp();
 * ```
 *
 * @example
 * ```javascript
 * // Return a named app
 * const otherApp = getApp("otherApp");
 * ```
 *
 * @param name - Optional name of the app to return. If no name is
 *   provided, the default is `"[DEFAULT]"`.
 *
 * @returns The app corresponding to the provided app name.
 *   If no app name is provided, the default app is returned.
 *
 * @public
 */
export function getApp(name: string = DEFAULT_ENTRY_NAME): FirebaseApp {
  const app = _apps.get(name);
  if (!app && name === DEFAULT_ENTRY_NAME) {
    return initializeApp();
  }
  if (!app) {
    throw ERROR_FACTORY.create(AppError.NO_APP, { appName: name });
  }

  return app;
}

/**
 * A (read-only) array of all initialized apps.
 * @public
 */
export function getApps(): FirebaseApp[] {
  return Array.from(_apps.values());
}

/**
 * Renders this app unusable and frees the resources of all associated
 * services.
 *
 * @example
 * ```javascript
 * deleteApp(app)
 *   .then(function() {
 *     console.log("App deleted successfully");
 *   })
 *   .catch(function(error) {
 *     console.log("Error deleting app:", error);
 *   });
 * ```
 *
 * @public
 */
export async function deleteApp(app: FirebaseApp): Promise<void> {
  const name = app.name;
  if (_apps.has(name)) {
    _apps.delete(name);
    await Promise.all(
      (app as FirebaseAppImpl).container
        .getProviders()
        .map(provider => provider.delete())
    );
    (app as FirebaseAppImpl).isDeleted = true;
  }
}

/**
 * Registers a library's name and version for platform logging purposes.
 * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
 * @param version - Current version of that library.
 * @param variant - Bundle variant, e.g., node, rn, etc.
 *
 * @public
 */
export function registerVersion(
  libraryKeyOrName: string,
  version: string,
  variant?: string
): void {
  // TODO: We can use this check to whitelist strings when/if we set up
  // a good whitelist system.
  let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
  if (variant) {
    library += `-${variant}`;
  }
  const libraryMismatch = library.match(/\s|\//);
  const versionMismatch = version.match(/\s|\//);
  if (libraryMismatch || versionMismatch) {
    const warning = [
      `Unable to register library "${library}" with version "${version}":`
    ];
    if (libraryMismatch) {
      warning.push(
        `library name "${library}" contains illegal characters (whitespace or "/")`
      );
    }
    if (libraryMismatch && versionMismatch) {
      warning.push('and');
    }
    if (versionMismatch) {
      warning.push(
        `version name "${version}" contains illegal characters (whitespace or "/")`
      );
    }
    logger.warn(warning.join(' '));
    return;
  }
  _registerComponent(
    new Component(
      `${library}-version` as Name,
      () => ({ library, version }),
      ComponentType.VERSION
    )
  );
}

/**
 * Sets log handler for all Firebase SDKs.
 * @param logCallback - An optional custom log handler that executes user code whenever
 * the Firebase SDK makes a logging call.
 *
 * @public
 */
export function onLog(
  logCallback: LogCallback | null,
  options?: LogOptions
): void {
  if (logCallback !== null && typeof logCallback !== 'function') {
    throw ERROR_FACTORY.create(AppError.INVALID_LOG_ARGUMENT);
  }
  setUserLogHandler(logCallback, options);
}

/**
 * Sets log level for all Firebase SDKs.
 *
 * All of the log types above the current log level are captured (i.e. if
 * you set the log level to `info`, errors are logged, but `debug` and
 * `verbose` logs are not).
 *
 * @public
 */
export function setLogLevel(logLevel: LogLevelString): void {
  setLogLevelImpl(logLevel);
}
