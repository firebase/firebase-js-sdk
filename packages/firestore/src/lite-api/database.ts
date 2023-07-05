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

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  _getProvider,
  _removeServiceInstance,
  FirebaseApp,
  getApp
} from '@firebase/app';
import {
  createMockUserToken,
  EmulatorMockTokenOptions,
  getDefaultEmulatorHostnameAndPort
} from '@firebase/util';

import {
  CredentialsProvider,
  EmulatorAuthCredentialsProvider,
  makeAuthCredentialsProvider,
  OAuthToken
} from '../api/credentials';
import { User } from '../auth/user';
import { DatabaseId, DEFAULT_DATABASE_NAME } from '../core/database_info';
import { Code, FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';
import { logWarn } from '../util/log';

import { FirestoreService, removeComponents } from './components';
import {
  DEFAULT_HOST,
  FirestoreSettingsImpl,
  PrivateSettings,
  FirestoreSettings
} from './settings';

export { EmulatorMockTokenOptions } from '@firebase/util';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'firestore/lite': Firestore;
  }
}

/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link (getFirestore:1)}.
 */
export class Firestore implements FirestoreService {
  /**
   * Whether it's a Firestore or Firestore Lite instance.
   */
  type: 'firestore-lite' | 'firestore' = 'firestore-lite';

  readonly _persistenceKey: string = '(lite)';

  private _settings = new FirestoreSettingsImpl({});
  private _settingsFrozen = false;

  // A task that is assigned when the terminate() is invoked and resolved when
  // all components have shut down.
  private _terminateTask?: Promise<void>;

  /** @hideconstructor */
  constructor(
    public _authCredentials: CredentialsProvider<User>,
    public _appCheckCredentials: CredentialsProvider<string>,
    readonly _databaseId: DatabaseId,
    readonly _app?: FirebaseApp
  ) {}

  /**
   * The {@link @firebase/app#FirebaseApp} associated with this `Firestore` service
   * instance.
   */
  get app(): FirebaseApp {
    if (!this._app) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        "Firestore was not initialized using the Firebase SDK. 'app' is " +
          'not available'
      );
    }
    return this._app;
  }

  get _initialized(): boolean {
    return this._settingsFrozen;
  }

  get _terminated(): boolean {
    return this._terminateTask !== undefined;
  }

  _setSettings(settings: PrivateSettings): void {
    if (this._settingsFrozen) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and its settings can no longer ' +
          'be changed. You can only modify settings before calling any other ' +
          'methods on a Firestore object.'
      );
    }
    this._settings = new FirestoreSettingsImpl(settings);
    if (settings.credentials !== undefined) {
      this._authCredentials = makeAuthCredentialsProvider(settings.credentials);
    }
  }

  _getSettings(): FirestoreSettingsImpl {
    return this._settings;
  }

  _freezeSettings(): FirestoreSettingsImpl {
    this._settingsFrozen = true;
    return this._settings;
  }

  _delete(): Promise<void> {
    if (!this._terminateTask) {
      this._terminateTask = this._terminate();
    }
    return this._terminateTask;
  }

  /** Returns a JSON-serializable representation of this `Firestore` instance. */
  toJSON(): object {
    return {
      app: this._app,
      databaseId: this._databaseId,
      settings: this._settings
    };
  }

  /**
   * Terminates all components used by this client. Subclasses can override
   * this method to clean up their own dependencies, but must also call this
   * method.
   *
   * Only ever called once.
   */
  protected _terminate(): Promise<void> {
    removeComponents(this);
    return Promise.resolve();
  }
}

/**
 * Initializes a new instance of Cloud Firestore with the provided settings.
 * Can only be called before any other functions, including
 * {@link (getFirestore:1)}. If the custom settings are empty, this function is
 * equivalent to calling {@link (getFirestore:1)}.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} with which the `Firestore` instance will
 * be associated.
 * @param settings - A settings object to configure the `Firestore` instance.
 * @returns A newly initialized `Firestore` instance.
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: FirestoreSettings
): Firestore;
/**
 * Initializes a new instance of Cloud Firestore with the provided settings.
 * Can only be called before any other functions, including
 * {@link (getFirestore:1)}. If the custom settings are empty, this function is
 * equivalent to calling {@link (getFirestore:1)}.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} with which the `Firestore` instance will
 * be associated.
 * @param settings - A settings object to configure the `Firestore` instance.
 * @param databaseId - The name of the database.
 * @returns A newly initialized `Firestore` instance.
 * @beta
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: FirestoreSettings,
  databaseId?: string
): Firestore;
export function initializeFirestore(
  app: FirebaseApp,
  settings: FirestoreSettings,
  databaseId?: string
): Firestore {
  if (!databaseId) {
    databaseId = DEFAULT_DATABASE_NAME;
  }
  const provider = _getProvider(app, 'firestore/lite');

  if (provider.isInitialized(databaseId)) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore can only be initialized once per app.'
    );
  }

  return provider.initialize({
    options: settings,
    instanceIdentifier: databaseId
  });
}

/**
 * Returns the existing default {@link Firestore} instance that is associated with the
 * default {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @returns The {@link Firestore} instance of the provided app.
 */
export function getFirestore(): Firestore;
/**
 * Returns the existing default {@link Firestore} instance that is associated with the
 * provided {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance that the returned {@link Firestore}
 * instance is associated with.
 * @returns The {@link Firestore} instance of the provided app.
 */
export function getFirestore(app: FirebaseApp): Firestore;
/**
 * Returns the existing {@link Firestore} instance that is associated with the
 * default {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param databaseId - The name of the database.
 * @returns The {@link Firestore} instance of the provided app.
 * @beta
 */
export function getFirestore(databaseId: string): Firestore;
/**
 * Returns the existing {@link Firestore} instance that is associated with the
 * provided {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance that the returned {@link Firestore}
 * instance is associated with.
 * @param databaseId - The name of the database.
 * @returns The {@link Firestore} instance of the provided app.
 * @beta
 */
export function getFirestore(app: FirebaseApp, databaseId: string): Firestore;
export function getFirestore(
  appOrDatabaseId?: FirebaseApp | string,
  optionalDatabaseId?: string
): Firestore {
  const app: FirebaseApp =
    typeof appOrDatabaseId === 'object' ? appOrDatabaseId : getApp();
  const databaseId =
    typeof appOrDatabaseId === 'string'
      ? appOrDatabaseId
      : optionalDatabaseId || '(default)';
  const db = _getProvider(app, 'firestore/lite').getImmediate({
    identifier: databaseId
  }) as Firestore;
  if (!db._initialized) {
    const emulator = getDefaultEmulatorHostnameAndPort('firestore');
    if (emulator) {
      connectFirestoreEmulator(db, ...emulator);
    }
  }
  return db;
}

/**
 * Modify this instance to communicate with the Cloud Firestore emulator.
 *
 * Note: This must be called before this instance has been used to do any
 * operations.
 *
 * @param firestore - The `Firestore` instance to configure to connect to the
 * emulator.
 * @param host - the emulator host (ex: localhost).
 * @param port - the emulator port (ex: 9000).
 * @param options.mockUserToken - the mock auth token to use for unit testing
 * Security Rules.
 */
export function connectFirestoreEmulator(
  firestore: Firestore,
  host: string,
  port: number,
  options: {
    mockUserToken?: EmulatorMockTokenOptions | string;
  } = {}
): void {
  firestore = cast(firestore, Firestore);
  const settings = firestore._getSettings();
  const newHostSetting = `${host}:${port}`;

  if (settings.host !== DEFAULT_HOST && settings.host !== newHostSetting) {
    logWarn(
      'Host has been set in both settings() and connectFirestoreEmulator(), emulator host ' +
        'will be used.'
    );
  }

  firestore._setSettings({
    ...settings,
    host: newHostSetting,
    ssl: false
  });

  if (options.mockUserToken) {
    let token: string;
    let user: User;
    if (typeof options.mockUserToken === 'string') {
      token = options.mockUserToken;
      user = User.MOCK_USER;
    } else {
      // Let createMockUserToken validate first (catches common mistakes like
      // invalid field "uid" and missing field "sub" / "user_id".)
      token = createMockUserToken(
        options.mockUserToken,
        firestore._app?.options.projectId
      );
      const uid = options.mockUserToken.sub || options.mockUserToken.user_id;
      if (!uid) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          "mockUserToken must contain 'sub' or 'user_id' field!"
        );
      }
      user = new User(uid);
    }

    firestore._authCredentials = new EmulatorAuthCredentialsProvider(
      new OAuthToken(token, user)
    );
  }
}

/**
 * Terminates the provided `Firestore` instance.
 *
 * After calling `terminate()` only the `clearIndexedDbPersistence()` functions
 * may be used. Any other function will throw a `FirestoreError`. Termination
 * does not cancel any pending writes, and any promises that are awaiting a
 * response from the server will not be resolved.
 *
 * To restart after termination, create a new instance of `Firestore` with
 * {@link (getFirestore:1)}.
 *
 * Note: Under normal circumstances, calling `terminate()` is not required. This
 * function is useful only when you want to force this instance to release all of
 * its resources or in combination with {@link clearIndexedDbPersistence} to
 * ensure that all local state is destroyed between test runs.
 *
 * @param firestore - The `Firestore` instance to terminate.
 * @returns A `Promise` that is resolved when the instance has been successfully
 * terminated.
 */
export function terminate(firestore: Firestore): Promise<void> {
  firestore = cast(firestore, Firestore);
  _removeServiceInstance(firestore.app, 'firestore/lite');
  return firestore._delete();
}
