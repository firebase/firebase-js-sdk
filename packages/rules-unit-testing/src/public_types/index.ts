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

import { FirebaseSignInProvider } from '@firebase/util';
import { Firestore, FirestoreSettings } from '@firebase/firestore/exp';
import { Database } from '@firebase/database/exp';
import { FirebaseStorage } from '@firebase/storage/exp';

/**
 * More options for the mock user token to be used for testing, including developer-specfied custom
 * claims or optional overrides for Firebase Auth token payloads.
 * @public
 */
export type TokenOptions = {
  /** The token issue time, in seconds since epoch */
  iat?: number;

  /** The token expiry time, normally 'iat' + 3600 */
  exp?: number;

  /** The time the user authenticated, normally 'iat' */
  auth_time?: number;

  /** The sign in provider, only set when the provider is 'anonymous' */
  provider_id?: 'anonymous';

  /** The user's primary email */
  email?: string;

  /** The user's email verification status */
  email_verified?: boolean;

  /** The user's primary phone number */
  phone_number?: string;

  /** The user's display name */
  name?: string;

  /** The user's profile photo URL */
  picture?: string;

  /** Information on all identities linked to this user */
  firebase?: {
    /** The primary sign-in provider */
    sign_in_provider: FirebaseSignInProvider;

    /** A map of providers to the user's list of unique identifiers from each provider */
    identities?: { [provider in FirebaseSignInProvider]?: string[] };
  };

  /** Set to PROJECT_ID by default. In rare cases, you may want to specify an override. */
  aud?: string;

  /** Set to https://securetoken.google.com/PROJECT_ID by default. In rare cases, you may want to specify an override. */
  iss?: string;

  /** Custom claims set by the developer */
  [claim: string]: unknown;

  // The fields below needs to be explicitly excluded from the index signature above.

  /** DO NOT USE. The user ID MUST be specified as the first param in authenticatedContext(uid, options) instead. */
  uid?: never;
  /** DO NOT USE. The user ID MUST be specified as the first param in authenticatedContext(uid, options) instead. */
  sub?: never;
  /** DO NOT USE. The user ID MUST be specified as the first param in authenticatedContext(uid, options) instead. */
  user_id?: never;
};

/**
 * Configuration of the unit testing environment, including emulators.
 * @public
 */
export interface TestEnvironmentConfig {
  /**
   * The project ID of the test environment. Can also be specified via the environment variable GCLOUD_PROJECT.
   *
   * A "demo-*" project ID is strongly recommended, especially for unit testing.
   * See: https://firebase.google.com/docs/emulator-suite/connect_firestore#choose_a_firebase_project
   */
  projectId?: string;

  /**
   * The Firebase Emulator hub. Can also be specified via the environment variable FIREBASE_EMULATOR_HUB.
   * If specified either way, other running emulators can be automatically discovered, and thus do
   * not to be explicity specified.
   */
  hub?: Pick<EmulatorConfig, 'host' | 'port'>;

  /**
   * The Database emulator. Its host and port can also be discovered automatically through the hub
   * (see field "hub") or specified via the environment variable FIREBASE_DATABASE_EMULATOR_HOST.
   */
  database?: EmulatorConfig;

  /**
   * The Firestore emulator. Its host and port can also be discovered automatically through the hub
   * (see field "hub") or specified via the environment variable FIRESTORE_EMULATOR_HOST.
   */
  firestore?: EmulatorConfig;

  /**
   * The Storage emulator. Its host and port can also be discovered automatically through the hub
   * (see field "hub") or specified via the environment variable FIREBASE_STORAGE_EMULATOR_HOST.
   */
  storage?: EmulatorConfig;
}

/**
 * Configuration for a given emulator.
 * @public
 */
export interface EmulatorConfig {
  /** The security rules source code under test for this emulator. Strongly recommended. */
  rules?: string;

  /**
   * The host of the emulator. Can be omitted if discovered automatically through the hub or
   * specified via environment variables. See {@code TestEnvironmentConfig} for details.
   */
  host?: string;

  /**
   * The port of the emulator. Can be omitted if discovered automatically through the hub or
   * specified via environment variables. See {@code TestEnvironmentConfig} for details.
   */
  port?: number;
}

/**
 * An object used to control the rules unit test environment. Can be used to create RulesTestContext
 * for different authentication situations.
 * @public
 */
export interface RulesTestEnvironment {
  /** The project ID specified or discovered at test environment creation. */
  readonly projectId: string;

  /**
   * A readonly copy of the emulator config specified or discovered at test environment creation.
   */
  readonly emulators: {
    database?: { host: string; port: number };
    firestore?: { host: string; port: number };
    storage?: { host: string; port: number };
  };

  /**
   * Create a {@code RulesTestContext} which behaves like an authenticated Firebase Auth user.
   *
   * Requests created via the returned context will have a mock Firebase Auth token attached.
   *
   * @param user_id the User ID of the user. Specifies the value of "user_id" and "sub" on the token
   * @param tokenOptions custom claims or overrides for Firebase Auth token payloads
   *
   * @example
   * ```javascript
   * const alice = testEnv.authenticatedContext('alice');
   * await assertSucceeds(get(doc(alice.firestore(), '/doc/readable/by/alice'), { ... });
   * ```
   */
  authenticatedContext(
    user_id: string,
    tokenOptions?: TokenOptions
  ): RulesTestContext;

  /**
   * Create a {@code RulesTestContext} which behaves like client that is NOT logged in via Firebase
   * Auth.
   *
   * Requests created via the returned context will not have Firebase Auth tokens attached.
   *
   * @example
   * ```javascript
   * const unauthed = testEnv.unauthenticatedContext();
   * await assertFails(get(doc(unauthed.firestore(), '/private/doc'), { ... });
   * ```
   */
  unauthenticatedContext(): RulesTestContext;

  /*
   * Run a setup function with a context that behaves as if Security Rules were disabled.
   *
   * This can be used for test setup by importing data into emulators without blocked by Rules.
   * ONLY requests issued through the context passed into the callback will bypass Security Rules.
   * Requests issued through other contexts will go through Security Rules as normal.
   *
   * @param callback a function which takes the Security-Rules-bypassing context and returns a promise.
   *        The context will be destroyed once the promise resolves / rejects.
   */
  withSecurityRulesDisabled(
    callback: (context: RulesTestContext) => Promise<void>
  ): Promise<void>;

  /**
   * Clear all data in the Realtime Database emulator namespace.
   */
  clearDatabase(): Promise<void>;

  /**
   * Clear data in the Firestore that belongs to the {@code projectId} in the Firestore emulator.
   */
  clearFirestore(): Promise<void>;

  /**
   * Clear Storage files and metadata in all buckets in the Storage emulator.
   */
  clearStorage(): Promise<void>;

  /**
   * At the very end of your test code, call the cleanup function. Destroy all RulesTestContexts
   * created in test environment and clean up the underlying resources, allowing a clean exit.
   *
   * This method does not change the state in emulators in any way. To reset data between tests,
   * see {@code clearDatabase()}, {@code clearFirestore()} and {@code clearStorage()}.
   */
  cleanup(): Promise<void>;
}

/**
 * A test context that represents a client. Can be used to access emulators for rules unit testing.
 * @public
 */
export interface RulesTestContext {
  /**
   * Get a Firestore instance for this test context. The returned Firebase JS Client SDK instance
   * can be used with the client SDK APIs (v9 modular or v9 compat).
   *
   * See: https://firebase.google.com/docs/reference/js/v9/firestore_
   * @param settings a settings object to configure the {@code Firestore} instance
   * @returns a Firestore instance configured to connect to the emulator
   * @public
   */
  firestore(settings?: FirestoreSettings): Firestore;

  /**
   * Get a Firestore instance for this test context. The returned Firebase JS Client SDK instance
   * can be used with the client SDK APIs (v9 modular or v9 compat).
   *
   * See: https://firebase.google.com/docs/reference/js/v9/firestore_
   * @param databaseURL the URL of the Realtime Database instance. If specified, returns an instance
   *                    for an emulated version of the namespace with parameters extracted from URL
   * @returns a Database instance configured to connect to the emulator. It never connects to
   *          production even if a production databaseURL is specified
   */
  database(databaseURL?: string): Database;

  /**
   * Get a Storage instance for this test context. The returned Firebase JS Client SDK instance
   * can be used with the client SDK APIs (v9 modular or v9 compat).
   *
   * See: https://firebase.google.com/docs/reference/js/v9/firestore_
   * @param settings the gs:// url to the Firebase Storage Bucket for testing. If specified,
   *                 returns a Storage instance for an emulated version of the bucket name
   * @returns a Storage instance configured to connect to the emulator
   */
  storage(bucketUrl?: string): FirebaseStorage;
}
