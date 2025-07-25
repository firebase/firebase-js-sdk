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
  FirebaseServerApp,
  FirebaseOptions,
  FirebaseAppSettings,
  FirebaseServerAppSettings
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
import { FirebaseServerAppImpl } from './firebaseServerApp';
import {
  _apps,
  _components,
  _isFirebaseApp,
  _isFirebaseServerAppSettings,
  _registerComponent,
  _serverApps
} from './internal';
import { logger } from './logger';
import {
  LogLevelString,
  setLogLevel as setLogLevelImpl,
  LogCallback,
  LogOptions,
  setUserLogHandler
} from '@firebase/logger';
import {
  deepEqual,
  getDefaultAppConfig,
  isBrowser,
  isWebWorker
} from '@firebase/util';

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
 * @throws If the optional `name` parameter is malformed or empty.
 *
 * @throws If a `FirebaseApp` already exists with the same name but with a different configuration.
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
 * @throws If {@link FirebaseAppSettings.name} is defined but the value is malformed or empty.
 *
 * @throws If a `FirebaseApp` already exists with the same name but with a different configuration.
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
    automaticDataCollectionEnabled: true,
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
 * Creates and initializes a {@link @firebase/app#FirebaseServerApp} instance.
 *
 * The `FirebaseServerApp` is similar to `FirebaseApp`, but is intended for execution in
 * server side rendering environments only. Initialization will fail if invoked from a
 * browser environment.
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
 * // Initialize an instance of `FirebaseServerApp`.
 * // Retrieve your own options values by adding a web app on
 * // https://console.firebase.google.com
 * initializeServerApp({
 *     apiKey: "AIza....",                             // Auth / General Use
 *     authDomain: "YOUR_APP.firebaseapp.com",         // Auth with popup/redirect
 *     databaseURL: "https://YOUR_APP.firebaseio.com", // Realtime Database
 *     storageBucket: "YOUR_APP.appspot.com",          // Storage
 *     messagingSenderId: "123456789"                  // Cloud Messaging
 *   },
 *   {
 *    authIdToken: "Your Auth ID Token"
 *   });
 * ```
 *
 * @param options - `Firebase.AppOptions` to configure the app's services, or a
 *   a `FirebaseApp` instance which contains the `AppOptions` within.
 * @param config - Optional `FirebaseServerApp` settings.
 *
 * @returns The initialized `FirebaseServerApp`.
 *
 * @throws If invoked in an unsupported non-server environment such as a browser.
 *
 * @throws If {@link FirebaseServerAppSettings.releaseOnDeref} is defined but the runtime doesn't
 *   provide Finalization Registry support.
 *
 * @public
 */
export function initializeServerApp(
  options: FirebaseOptions | FirebaseApp,
  config?: FirebaseServerAppSettings
): FirebaseServerApp;

/**
 * Creates and initializes a {@link @firebase/app#FirebaseServerApp} instance.
 *
 * @param config - Optional `FirebaseServerApp` settings.
 *
 * @returns The initialized `FirebaseServerApp`.
 *
 * @throws If invoked in an unsupported non-server environment such as a browser.
 * @throws If {@link FirebaseServerAppSettings.releaseOnDeref} is defined but the runtime doesn't
 *   provide Finalization Registry support.
 * @throws If the `FIREBASE_OPTIONS` environment variable does not contain a valid project
 *   configuration required for auto-initialization.
 *
 * @public
 */
export function initializeServerApp(
  config?: FirebaseServerAppSettings
): FirebaseServerApp;
export function initializeServerApp(
  _options?: FirebaseApp | FirebaseServerAppSettings | FirebaseOptions,
  _serverAppConfig: FirebaseServerAppSettings = {}
): FirebaseServerApp {
  if (isBrowser() && !isWebWorker()) {
    // FirebaseServerApp isn't designed to be run in browsers.
    throw ERROR_FACTORY.create(AppError.INVALID_SERVER_APP_ENVIRONMENT);
  }

  let firebaseOptions: FirebaseOptions | undefined;
  let serverAppSettings: FirebaseServerAppSettings = _serverAppConfig || {};

  if (_options) {
    if (_isFirebaseApp(_options)) {
      firebaseOptions = _options.options;
    } else if (_isFirebaseServerAppSettings(_options)) {
      serverAppSettings = _options;
    } else {
      firebaseOptions = _options;
    }
  }

  if (serverAppSettings.automaticDataCollectionEnabled === undefined) {
    serverAppSettings.automaticDataCollectionEnabled = true;
  }

  firebaseOptions ||= getDefaultAppConfig();
  if (!firebaseOptions) {
    throw ERROR_FACTORY.create(AppError.NO_OPTIONS);
  }

  // Build an app name based on a hash of the configuration options.
  const nameObj = {
    ...serverAppSettings,
    ...firebaseOptions
  };

  // However, Do not mangle the name based on releaseOnDeref, since it will vary between the
  // construction of FirebaseServerApp instances. For example, if the object is the request headers.
  if (nameObj.releaseOnDeref !== undefined) {
    delete nameObj.releaseOnDeref;
  }

  const hashCode = (s: string): number => {
    return [...s].reduce(
      (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
      0
    );
  };

  if (serverAppSettings.releaseOnDeref !== undefined) {
    if (typeof FinalizationRegistry === 'undefined') {
      throw ERROR_FACTORY.create(
        AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED,
        {}
      );
    }
  }

  const nameString = '' + hashCode(JSON.stringify(nameObj));
  const existingApp = _serverApps.get(nameString) as FirebaseServerApp;
  if (existingApp) {
    (existingApp as FirebaseServerAppImpl).incRefCount(
      serverAppSettings.releaseOnDeref
    );
    return existingApp;
  }

  const container = new ComponentContainer(nameString);
  for (const component of _components.values()) {
    container.addComponent(component);
  }

  const newApp = new FirebaseServerAppImpl(
    firebaseOptions,
    serverAppSettings,
    nameString,
    container
  );

  _serverApps.set(nameString, newApp);

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
  if (!app && name === DEFAULT_ENTRY_NAME && getDefaultAppConfig()) {
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
  let cleanupProviders = false;
  const name = app.name;
  if (_apps.has(name)) {
    cleanupProviders = true;
    _apps.delete(name);
  } else if (_serverApps.has(name)) {
    const firebaseServerApp = app as FirebaseServerAppImpl;
    if (firebaseServerApp.decRefCount() <= 0) {
      _serverApps.delete(name);
      cleanupProviders = true;
    }
  }

  if (cleanupProviders) {
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
