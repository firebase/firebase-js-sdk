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
import {
  PlatformLoggerService,
  VersionService,
  HeartbeatService
} from './types';

/**
 * A {@link @firebase/app#FirebaseApp} holds the initialization information for a collection of
 * services.
 *
 * Do not call this constructor directly. Instead, use
 * {@link (initializeApp:1) | initializeApp()} to create an app.
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
   * parameters given in {@link (initializeApp:1) | initializeApp()}.
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
 * A {@link @firebase/app#FirebaseServerApp} holds the initialization information
 * for a collection of services running in server enviornments.
 *
 * Do not call this constructor directly. Instead, use
 * {@link (initializeServerApp:1) | initializeServerApp()} to create
 * an app.
 *
 * @public
 */
export interface FirebaseServerApp extends FirebaseApp {
  /**
   * Checks to see if the local verification of the authIdToken provided to
   * {@link (initializeServerApp:1) | initializeServerApp()} has completed.
   *
   * It is recommend that your application awaits this promise before invoking getAuth() if an
   * authIdToken was provided in the FirebaseServerAppSettings.
   * 
   * The returned Promise is completed immediately if the optional authIdToken parameter
   * was omitted from FirebaseServerApp initialization.
   */
  authIdTokenVerified: () => Promise<void>;

  /**
   * There is no getApp operation for FirebaseServerApps, so the name is not relevant for
   * applications. However, it may be used internally, and is declared here so that
   * FirebaseServerApp conforms to the FirebaseApp interface declaration.
   */
  name: string;

  /**
   * The (read-only) configuration settings for this server app. These are the original
   * parameters given in {@link (initializeServerApp:1) | initializeServerApp()}.
   *
   * @example
   * ```javascript
   * const app = initializeServerApp(settings);
   * console.log(app.settings.authIdToken === options.authIdToken);  // true
   * ```
   */
  readonly settings: FirebaseServerAppSettings;
}

/**
 * @public
 *
 * Firebase configuration object. Contains a set of parameters required by
 * services in order to successfully communicate with Firebase server APIs
 * and to associate client data with your Firebase project and
 * Firebase application. Typically this object is populated by the Firebase
 * console at project setup. See also:
 * {@link https://firebase.google.com/docs/web/setup#config-object | Learn about the Firebase config object}.
 */
export interface FirebaseOptions {
  /**
   * An encrypted string used when calling certain APIs that don't need to
   * access private user data
   * (example value: `AIzaSyDOCAbC123dEf456GhI789jKl012-MnO`).
   */
  apiKey?: string;
  /**
   * Auth domain for the project ID.
   */
  authDomain?: string;
  /**
   * Default Realtime Database URL.
   */
  databaseURL?: string;
  /**
   * The unique identifier for the project across all of Firebase and
   * Google Cloud.
   */
  projectId?: string;
  /**
   * The default Cloud Storage bucket name.
   */
  storageBucket?: string;
  /**
   * Unique numerical value used to identify each sender that can send
   * Firebase Cloud Messaging messages to client apps.
   */
  messagingSenderId?: string;
  /**
   * Unique identifier for the app.
   */
  appId?: string;
  /**
   * An ID automatically created when you enable Analytics in your
   * Firebase project and register a web app. In versions 7.20.0
   * and higher, this parameter is optional.
   */
  measurementId?: string;
}

/**
 * @public
 *
 * Configuration options given to {@link (initializeApp:1) | initializeApp()}
 */
export interface FirebaseAppSettings {
  /**
   * custom name for the Firebase App.
   * The default value is `"[DEFAULT]"`.
   */
  name?: string;
  /**
   * The settable config flag for GDPR opt-in/opt-out
   */
  automaticDataCollectionEnabled?: boolean;
}

/**
 * @public
 *
 * Configuration options given to {@link (initializeServerApp:1) | initializeServerApp()}
 */
export interface FirebaseServerAppSettings extends FirebaseAppSettings {
  /**
   * An optional Auth ID token used to resume a signed in user session from a client
   * runtime environment.
   *
   * If provided, the FirebaseServerApp instance will work to validate the token even before Auth
   * is initialized. The result of the validation can be queried via by the application by invoking
   * {@link (FirebaseServerApp.authIdTokenVerified()}. Awaiting the Promise returned by
   * {@link (FirebaseServerApp.authIdTokenVerified()} is highly recommended if an authIdToken token
   * is provided.
   *
   * Invoking getAuth() with a FirebaseServerApp configured with a validated authIdToken will cause
   * an automatic attempt to sign in the user that the authIdToken represents. The token
   * needs to have been recently minted for this operation to succeed, otherwise it will fail
   * validation.
   *
   * If the token fails local verfiication, or if the Auth service has deemed it invalid when 
   * the Auth SDK is initialized, then a warning is logged to the console and the Auth SDK will not
   * sign in a user upon initalization.
   * 
   * If a user is successfully signed-in, then the Auth instance's onAuthStateChanged callback
   * will be invoked with the User as per standard Auth flows. However, users created via
   * authIdTokens do not have a refresh token and any attempted refresh operation will fail.
   */
  authIdToken?: string;

  /**
   * An optional object. If provided, the Firebase SDK will use a FinalizationRegistry
   * object to monitor the Garbage Collection status of the provided object, and the
   * Firebase SDK will release its refrence on the FirebaseServerApp instance when the
   * provided object is garbage collected.
   *
   * The intent of this field is to help reduce memory overhead for long-running cloud
   * functions. If provided, the customer's app running in a SSR pass need not worry about
   * FirebaseServerApp cleanup, so long as the reference object is deleted (by falling out of
   * SSR scope, for instance.)
   *
   * If an object is not provided then the application must clean up the FirebaseServerApp instance
   * by invoking deleteApp.
   *
   * If the application provides an object in this parameter, but the application is
   * executed in a JavaScript engine that predates the support of FinalizationRegistry
   * (introduced in node v14.6.0, for instance), then the Firebase SDK will not be able
   * to automatically clean up the FirebaseServerApp instance and an error will be
   * thrown.
   */
  releaseOnDeref?: object;

  /**
   * There is no get for FirebaseServerApps, so the name is not relevant. however it's always
   * a blank string so that FirebaseServerApp conforms to the FirebaseApp interface declaration.
   */
  name?: undefined;
}

/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _FirebaseService {
  app: FirebaseApp;
  /**
   * Delete the service and free it's resources - called from
   * {@link @firebase/app#deleteApp | deleteApp()}
   */
  _delete(): Promise<void>;
}

/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _FirebaseAppInternal extends FirebaseApp {
  container: ComponentContainer;
  isDeleted: boolean;
  checkDestroyed(): void;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app': FirebaseApp;
    'app-version': VersionService;
    'heartbeat': HeartbeatService;
    'platform-logger': PlatformLoggerService;
  }
}
