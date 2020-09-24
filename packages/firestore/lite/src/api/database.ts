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

import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { Code, FirestoreError } from '../../../src/util/error';
import { DatabaseId } from '../../../src/core/database_info';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  CredentialsProvider,
  FirebaseCredentialsProvider
} from '../../../src/api/credentials';
import { removeComponents } from './components';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'firestore/lite': FirebaseFirestore;
  }
}

export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
}

/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link getFirestore()
 * `getFirestore()`}.
 */
export class FirebaseFirestore implements _FirebaseService {
  readonly _databaseId: DatabaseId;
  readonly _credentials: CredentialsProvider;
  readonly _persistenceKey: string = '(lite)';

  // Assigned via _configureClient()
  protected _settings?: Settings;
  private _settingsFrozen = false;

  // A task that is assigned when the terminate() is invoked and resolved when
  // all components have shut down.
  private _terminateTask?: Promise<void>;

  /**
   * The {@link FirebaseApp app} associated with this `Firestore` service
   * instance.
   */
  readonly app: FirebaseApp;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    this.app = app;
    this._databaseId = FirebaseFirestore._databaseIdFromApp(app);
    this._credentials = new FirebaseCredentialsProvider(authProvider);
  }

  get _initialized(): boolean {
    return this._settingsFrozen;
  }

  get _terminated(): boolean {
    return this._terminateTask !== undefined;
  }

  _configureClient(settings: Settings): void {
    if (this._settingsFrozen) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and its settings can no longer ' +
          'be changed. initializeFirestore() cannot be called after calling ' +
          'getFirestore().'
      );
    }
    this._settings = settings;
  }

  _getSettings(): Settings {
    if (!this._settings) {
      this._settings = {};
    }
    this._settingsFrozen = true;
    return this._settings;
  }

  private static _databaseIdFromApp(app: FirebaseApp): DatabaseId {
    if (!Object.prototype.hasOwnProperty.apply(app.options, ['projectId'])) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        '"projectId" not provided in firebase.initializeApp.'
      );
    }

    return new DatabaseId(app.options.projectId!);
  }

  _delete(): Promise<void> {
    if (!this._terminateTask) {
      this._terminateTask = this._terminate();
    }
    return this._terminateTask;
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
 * Can only be called before any other methods, including
 * {@link getFirestore()}. If the custom settings are empty, this method is
 * equivalent to calling {@link getFirestore()}.
 *
 * @param app The {@link FirebaseApp} that the Firestore instance will be
 * associated with.
 * @param settings A settings object to configure the Firestore instance.
 * @return A newly initialized Firestore instance.
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore {
  const firestore = _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as FirebaseFirestore;
  firestore._configureClient(settings);
  return firestore;
}

/**
 * Returns the existing instance of Firestore that is associated with the
 * provided {@link FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app The {@link FirebaseApp} instance that the returned Firestore
 * instance is associated with.
 * @return The Firestore instance of the provided app.
 */
export function getFirestore(app: FirebaseApp): FirebaseFirestore {
  return _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as FirebaseFirestore;
}

/**
 * Terminates the provided Firestore instance.
 *
 * After calling `terminate()` only the `clearIndexedDbPersistence()` method may
 * be used. Any other method will throw a `FirestoreError`. Termination does not
 * cancel any pending writes, and any promises that are awaiting a response from
 * the server will not be resolved.
 *
 * To restart after termination, create a new instance of FirebaseFirestore with
 * {@link getFirestore()}.
 *
 * Note: Under normal circumstances, calling `terminate()` is not required. This
 * method is useful only when you want to force this instance to release all of
 * its resources or in combination with {@link clearIndexedDbPersistence()} to
 * ensure that all local state is destroyed between test runs.
 *
 * @return A promise that is resolved when the instance has been successfully
 * terminated.
 */
export function terminate(firestore: FirebaseFirestore): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore/lite');
  return firestore._delete();
}
