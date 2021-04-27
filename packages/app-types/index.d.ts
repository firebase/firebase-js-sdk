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

  /**
   * A (read-only) array of all the initialized Apps.
   */
  apps: FirebaseApp[];

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

export type FirebaseSignInProvider =
  | 'custom'
  | 'email'
  | 'password'
  | 'phone'
  | 'anonymous'
  | 'google.com'
  | 'facebook.com'
  | 'github.com'
  | 'twitter.com'
  | 'microsoft.com'
  | 'apple.com';

export interface FirebaseIdToken {
  // Firebase Auth tokens contain snake_case claims following the JWT standard / convention.
  /* eslint-disable camelcase */

  // Always set to https://securetoken.google.com/PROJECT_ID
  iss: string;

  // Always set to PROJECT_ID
  aud: string;

  // The user's unique id
  sub: string;

  // The token issue time, in seconds since epoch
  iat: number;

  // The token expiry time, normally 'iat' + 3600
  exp: number;

  // The user's unique id, must be equal to 'sub'
  user_id: string;

  // The time the user authenticated, normally 'iat'
  auth_time: number;

  // The sign in provider, only set when the provider is 'anonymous'
  provider_id?: 'anonymous';

  // The user's primary email
  email?: string;

  // The user's email verification status
  email_verified?: boolean;

  // The user's primary phone number
  phone_number?: string;

  // The user's display name
  name?: string;

  // The user's profile photo URL
  picture?: string;

  // Information on all identities linked to this user
  firebase: {
    // The primary sign-in provider
    sign_in_provider: FirebaseSignInProvider;

    // A map of providers to the user's list of unique identifiers from
    // each provider
    identities?: { [provider in FirebaseSignInProvider]?: string[] };
  };

  // Custom claims set by the developer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [claim: string]: any;

  uid?: never; // Try to catch a common mistake of "uid" (should be "sub" instead).

  /* eslint-enable camelcase */
}

export type EmulatorMockTokenOptions = ({ user_id: string } | { sub: string }) &
  Partial<FirebaseIdToken>;

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app': FirebaseApp;
    'app-version': VersionService;
    'platform-identifier': VersionService;
  }
}
