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
 * {@link (initializeServerAppInstance:1) | initializeServerAppInstance()} to create
 * an app.
 *
 * @public
 */
export interface FirebaseServerApp extends FirebaseApp {
  /**
   * Checks to see if the verification of the authIdToken provided to
   * @initializeServerApp has completed.
   *
   * It is recommend that your application awaits this promise if an authIdToken was
   * provided during FirebaseServerApp initialization before invoking getAuth(). If an
   * instance of Auth is created before the Auth ID Token is validated, then the token
   * will not be used by that instance of the Auth SDK.
   *
   * The returned Promise is completed immediately if the optional authIdToken parameter
   * was omitted from FirebaseServerApp initialization.
   */
  authIdTokenVerified: () => Promise<void>;

  /**
   * Checks to see if the verification of the appCheckToken provided to
   * @initializeServerApp has completed. If the optional appCheckToken parameter was
   * omitted then the returned Promise is completed immediately.
   *
   * It is recommend that your application awaits this promise before initializing
   * any Firebase products that use AppCheck. The Firebase SDKs will not
   * use App Check tokens that are determined to be invalid or those that have not yet
   * completed validation.
   *
   * The returned Promise is completed immediately if the optional appCheckToken
   * parameter was omitted from FirebaseServerApp initialization.
   */
  appCheckTokenVerified: () => Promise<void>;

  /**
   * Checks to see if the verification of the installationToken provided to
   * @initializeServerApp has completed.
   *
   * It is recommend that your application awaits this promise before initializing
   * any Firebase products that use Firebase Installations. The Firebase SDKs will not
   * use Installation Auth tokens that are determined to be invalid or those that have
   * not yet completed validation.
   *
   * The returned Promise is completed immediately if the optional appCheckToken
   * parameter was omitted from FirebaseServerApp initialization.
   */

  installationTokenVerified: () => Promise<void>;

  /**
   * There is no get for FirebaseServerApp, so the name is not relevant. However, it's declared here
   * so that FirebaseServerApp conforms to the FirebaseApp interface declaration. Internally this
   * string will always be empty for FirebaseServerApp instances.
   */
  name: string;
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
   * If provided, the FirebaseServerApp instance will work to validate the token. The
   * result of the validation can be queried via by the application by invoking the
   * FirebaseServerApp.authIdTokenVerified(). Awaiting the Promise returned by
   * authIdTokenVerified is highly recommended if an Auth ID token is provided.
   *
   * Once the token has been properly verified then invoking getAuth() will attempt to
   * automatically sign in a user with the provided Auth ID Token.
   *
   * If the token fails verification then a warning is logged and Auth SDK will not
   * attempt to sign in a user upon its initalization.
   */
  authIdToken?: string;

  /**
   * An optional AppCheck token.
   *
   * If provided, the FirebaseServerApp instance will work to validate the token. The
   * result of the validation can be monitored by invoking the
   * FirebaseServerApp.appCheckTokenVerified(). Awaiting the Promise returned by
   * appCheckTokenVerified is highly recommended if an AppCheck token is provided.
   *
   * If the token has been properly verified then the AppCheck token will be
   * automatically used by Firebase SDKs that support App Check.
   *
   * If the token fails verification then a warning is logged and the token will not
   * be used.
   */
  appCheckToken?: string;

  /**
   * An optional Installation Auth token.
   *
   * If provided, the FirebaseServerApp instance will work to validate the token. The
   * result of the validation can be monitored by invoking the
   * FirebaseServerApp.installationTokenVerified(). Awaiting the Promise returned by
   * appCheckTokenVerified is highly recommended before initalization any other Firebase
   * SDKs.
   *
   * If the token has been properly verified then the Installation Auth token will be
   * automatically used by Firebase SDKs that support Firebase Installations.
   *
   * If the token fails verification then a warning is logged and the token will not
   * be used.
   */
  installationsAuthToken?: string;

  /**
   * An optional object. If provided, the Firebase SDK will use a FinalizationRegistry
   * object to monitor the Garbage Collection status of the provided object, and the
   * Firebase SDK will release its refrence on the FirebaseServerApp instance when the
   * provided object is collected. or.
   *
   * The intent of this field is to help reduce memory overhead for long-running cloud
   * functions executing SSR fulfillment without the customer's app needing to
   * orchestrate FirebaseServerApp cleanup. Additionally, prexisting FirebaseServerApp
   * instances may reused if they're identical to a previously generated one that has
   * yet to be deleted.
   *
   * If the object is not provided then the application must clean up the
   * FirebaseServerApp instance through the applicationss own standard mechanisms by
   * invoking deleteApp.
   *
   * If the app provides an object in this parameter, but the application is
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
