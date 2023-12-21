/**
 * @license
 * Copyright 2017 Google LLC
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
import { LogCallback, LogLevelString, LogOptions } from '@firebase/logger';

export type FirebaseOptions = {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

export interface FirebaseAppConfig {
  name?: string;
  automaticDataCollectionEnabled?: boolean;
}

export interface FirebaseServerAppConfig extends FirebaseAppConfig {
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
   * FirebaseServerApp.installationAuthTokenVerified(). Awaiting the Promise returned by
   * appCheckTokenVerified is highly recommended before initalization any other Firebase
   * SDKs.
   *
   * If the token has been properly verified then the Installation Auth token will be
   * automatically used by Firebase SDKs that support Firebase Installations.
   *
   * If the token fails verification then a warning is logged and the token will not
   * be used.
   */
  installationAuthToken?: string;

  /**
   * An optional object. If provided, the Firebase SDK will use a FinalizationRegistry
   * object to monitor its GC status. The Firebase SDK will cleanup and
   * delete the corresponding FirebaseServerApp instance when the provided object is
   * deleted by the garbage collector.
   *
   * The intent of this field is to help reduce memory overhead for long-running cloud
   * functions executing SSR fulfillment without the customer's app needing to
   * orchestrate FirebaseServerApp cleanup.
   *
   * For instance, in the case that asynchronous operations makes it difficult to
   * determine the finality of the server side rendering pass.
   *
   * If the object is not provided then the application must clean up the
   * FirebaseServerApp instance through it's own standard mechanisms by invoking
   * deleteApp.
   *
   * If the app uses provides an object but uses a JavaScript engine that predates the
   * support of FinalizationRegistry (introduced in node v14.6.0, for instance), then the
   * Firebase SDK will not be able to automatically clean up the FirebaseServerApp
   * instance and an error will be thrown.
   */
  deleteOnDeref?: object;

  name: undefined;
}

export class FirebaseApp {
  /**
   * The (read-only) name (identifier) for this App. '[DEFAULT]' is the default
   * App.
   */
  name: string;

  /**
   * The (read-only) configuration options from the app initialization.
   */
  options: FirebaseOptions;

  /**
   * The settable config flag for GDPR opt-in/opt-out
   */
  automaticDataCollectionEnabled: boolean;

  /**
   * Make the given App unusable and free resources.
   */
  delete(): Promise<void>;
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
export class FirebaseServerApp extends FirebaseApp {
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
   * Checks to see if the verification of the installationAuthToken provided to
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
  installationAuthTokenVerified: () => Promise<void>;

  /**
   * There is no get for FirebaseServerApp, name is not relevant—however it's always
   * a blank string to conform to the FirebaseApp interface
   */
  name: undefined;
}

export interface FirebaseNamespace {
  /**
   * Create (and initialize) a FirebaseApp.
   *
   * @param options Options to configure the services used in the App.
   * @param config The optional config for your firebase app
   */
  initializeApp(
    options: FirebaseOptions,
    config?: FirebaseAppConfig
  ): FirebaseApp;

  /**
   * Create (and initialize) a FirebaseApp.
   *
   * @param options Options to configure the services used in the App.
   * @param name The optional name of the app to initialize ('[DEFAULT]' if
   * omitted)
   */
  initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;

  /**
   * Create (and initialize) a FirebaseServerApp.
   *
   * @param options - Firebase.AppOptions to configure the app's services, or a
   *   a FirebaseApp instance which contains the AppOptions within.
   * @param config The config for your firebase server app.
   */
  initializeServerApp(
    options: FirebaseOptions | FirebaseApp,
    config: FirebaseServerAppConfig
  ): FirebaseServerApp;

  app: {
    /**
     * Retrieve an instance of a FirebaseApp.
     *
     * Usage: firebase.app()
     *
     * @param name The optional name of the app to return ('[DEFAULT]' if omitted)
     */
    (name?: string): FirebaseApp;

    /**
     * For testing FirebaseApp instances:
     *  app() instanceof firebase.app.App
     *
     * DO NOT call this constuctor directly (use firebase.app() instead).
     */
    App: typeof FirebaseApp;
  };

  serverApp: {
    /**
     * Retrieve an instance of a FirebaseServerApp.
     *
     * Usage: firebase.serverApp(name)
     *
     * @param name The optional name of the server app to return ('[DEFAULT]' if omitted)
     */
    (name?: string): FirebaseServerApp;

    /**
     * For testing FirebaseServerApp instances:
     *  serverApp() instanceof firebase.app.FirebaseServerApp
     *
     * DO NOT call this constuctor directly (use firebase.initializeServerApp() instead).
     */
    serverApp: typeof FirebaseServerApp;
  };

  /**
   * A (read-only) array of all the initialized Apps.
   */
  apps: FirebaseApp[];

  /**
   * A (read-only) array of all the initialized Server Apps.
   */
  serverApps: FirebaseServerApp[];

  /**
   * Registers a library's name and version for platform logging purposes.
   * @param library Name of 1p or 3p library (e.g. firestore, angularfire)
   * @param version Current version of that library.
   */
  registerVersion(library: string, version: string, variant?: string): void;

  // Sets log level for all Firebase components.
  setLogLevel(logLevel: LogLevelString): void;

  // Sets log handler for all Firebase components.
  onLog(logCallback: LogCallback, options?: LogOptions): void;

  // The current SDK version.
  SDK_VERSION: string;
}

export interface VersionService {
  library: string;
  version: string;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-version': VersionService;
    'platform-identifier': VersionService;
  }
}
