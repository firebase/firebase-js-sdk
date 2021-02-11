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
import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import {
  CredentialsProvider,
  EmptyCredentialsProvider,
  FirebaseCredentialsProvider,
  makeCredentialsProvider
} from '../api/credentials';
import { DatabaseId } from '../core/database_info';
import { Code, FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';
import { logWarn } from '../util/log';

import { FirestoreService, removeComponents } from './components';
import {
  DEFAULT_HOST,
  FirestoreSettings,
  PrivateSettings,
  Settings
} from './settings';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'firestore/lite': FirebaseFirestore;
  }
}

/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link getFirestore}.
 */
export class FirebaseFirestore implements FirestoreService {
  readonly _databaseId: DatabaseId;
  readonly _persistenceKey: string = '(lite)';
  _credentials: CredentialsProvider;

  private _settings = new FirestoreSettings({});
  private _settingsFrozen = false;

  // A task that is assigned when the terminate() is invoked and resolved when
  // all components have shut down.
  private _terminateTask?: Promise<void>;

  private _app?: FirebaseApp;

  /** @hideconstructor */
  constructor(
    databaseIdOrApp: DatabaseId | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    if (databaseIdOrApp instanceof DatabaseId) {
      this._databaseId = databaseIdOrApp;
      this._credentials = new EmptyCredentialsProvider();
    } else {
      this._app = databaseIdOrApp as FirebaseApp;
      this._databaseId = databaseIdFromApp(databaseIdOrApp as FirebaseApp);
      this._credentials = new FirebaseCredentialsProvider(authProvider);
    }
  }

  /**
   * The {@link FirebaseApp} associated with this `Firestore` service
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
    this._settings = new FirestoreSettings(settings);
    if (settings.credentials !== undefined) {
      this._credentials = makeCredentialsProvider(settings.credentials);
    }
  }

  _getSettings(): FirestoreSettings {
    return this._settings;
  }

  _freezeSettings(): FirestoreSettings {
    this._settingsFrozen = true;
    return this._settings;
  }

  _delete(): Promise<void> {
    if (!this._terminateTask) {
      this._terminateTask = this._terminate();
    }
    return this._terminateTask;
  }

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

function databaseIdFromApp(app: FirebaseApp): DatabaseId {
  if (!Object.prototype.hasOwnProperty.apply(app.options, ['projectId'])) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      '"projectId" not provided in firebase.initializeApp.'
    );
  }

  return new DatabaseId(app.options.projectId!);
}

/**
 * Initializes a new instance of Cloud Firestore with the provided settings.
 * Can only be called before any other functions, including
 * {@link getFirestore}. If the custom settings are empty, this function is
 * equivalent to calling {@link getFirestore}.
 *
 * @param app - The {@link FirebaseApp} with which the `Firestore` instance will
 * be associated.
 * @param settings - A settings object to configure the `Firestore` instance.
 * @returns A newly initialized Firestore instance.
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore {
  const provider = _getProvider(app, 'firestore/lite');

  if (provider.isInitialized()) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore can only be initialized once per app.'
    );
  }

  const firestore = provider.getImmediate() as FirebaseFirestore;
  firestore._setSettings(settings);
  return firestore;
}

/**
 * Returns the existing instance of Firestore that is associated with the
 * provided {@link FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app - The {@link FirebaseApp} instance that the returned Firestore
 * instance is associated with.
 * @returns The `Firestore` instance of the provided app.
 */
export function getFirestore(app: FirebaseApp): FirebaseFirestore {
  return _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as FirebaseFirestore;
}

/**
 * Modify this instance to communicate with the Cloud Firestore emulator.
 *
 * Note: This must be called before this instance has been used to do any
 * operations.
 *
 * @param firestore - The Firestore instance to configure to connect to the
 * emulator.
 * @param host - the emulator host (ex: localhost).
 * @param port - the emulator port (ex: 9000).
 */
export function useFirestoreEmulator(
  firestore: FirebaseFirestore,
  host: string,
  port: number
): void {
  firestore = cast(firestore, FirebaseFirestore);
  const settings = firestore._getSettings();

  if (settings.host !== DEFAULT_HOST && settings.host !== host) {
    logWarn(
      'Host has been set in both settings() and useEmulator(), emulator host ' +
        'will be used'
    );
  }

  firestore._setSettings({
    ...settings,
    host: `${host}:${port}`,
    ssl: false
  });
}

/**
 * Terminates the provided Firestore instance.
 *
 * After calling `terminate()` only the `clearIndexedDbPersistence()` functions
 * may be used. Any other function will throw a `FirestoreError`. Termination
 * does not cancel any pending writes, and any promises that are awaiting a
 * response from the server will not be resolved.
 *
 * To restart after termination, create a new instance of FirebaseFirestore with
 * {@link getFirestore}.
 *
 * Note: Under normal circumstances, calling `terminate()` is not required. This
 * function is useful only when you want to force this instance to release all of
 * its resources or in combination with {@link clearIndexedDbPersistence} to
 * ensure that all local state is destroyed between test runs.
 *
 * @param firestore - The Firestore instance to terminate.
 * @returns A promise that is resolved when the instance has been successfully
 * terminated.
 */
export function terminate(firestore: FirebaseFirestore): Promise<void> {
  firestore = cast(firestore, FirebaseFirestore);
  _removeServiceInstance(firestore.app, 'firestore/lite');
  return firestore._delete();
}
