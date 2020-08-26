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

import * as firestore from '../../../lite-types';

import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { Code, FirestoreError } from '../../../src/util/error';
import { DatabaseId } from '../../../src/core/database_info';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  CredentialsProvider,
  FirebaseCredentialsProvider
} from '../../../src/api/credentials';
import { cast } from './util';
import { removeComponents } from './components';

/**
 * The root reference to the Firestore Lite database.
 */
export class Firestore
  implements firestore.FirebaseFirestore, _FirebaseService {
  readonly _databaseId: DatabaseId;
  readonly _credentials: CredentialsProvider;
  readonly _persistenceKey: string = '(lite)';

  // Assigned via _configureClient()
  protected _settings?: firestore.Settings;
  private _settingsFrozen = false;

  // A task that is assigned when the terminate() is invoked and resolved when
  // all components have shut down.
  private _terminateTask?: Promise<void>;

  constructor(
    readonly app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    this._databaseId = Firestore.databaseIdFromApp(app);
    this._credentials = new FirebaseCredentialsProvider(authProvider);
  }

  get _initialized(): boolean {
    return this._settingsFrozen;
  }

  get _terminated(): boolean {
    return this._terminateTask !== undefined;
  }

  _configureClient(settings: firestore.Settings): void {
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

  _getSettings(): firestore.Settings {
    if (!this._settings) {
      this._settings = {};
    }
    this._settingsFrozen = true;
    return this._settings;
  }

  private static databaseIdFromApp(app: FirebaseApp): DatabaseId {
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

  // TODO(firestoreexp): `deleteApp()` should call the delete method above,
  // but it still calls INTERNAL.delete().
  INTERNAL = {
    delete: () => this._delete()
  };
}

export function initializeFirestore(
  app: FirebaseApp,
  settings: firestore.Settings
): Firestore {
  const firestore = _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as Firestore;
  firestore._configureClient(settings);
  return firestore;
}

export function getFirestore(app: FirebaseApp): Firestore {
  return _getProvider(app, 'firestore/lite').getImmediate() as Firestore;
}

export function terminate(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore/lite');
  const firestoreClient = cast(firestore, Firestore);
  return firestoreClient._delete();
}
