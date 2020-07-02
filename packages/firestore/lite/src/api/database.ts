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
import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import * as firestore from '../../';
import { Settings } from '../../';
import {
  CredentialsProvider,
  FirebaseCredentialsProvider
} from '../../../src/api/credentials';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { newConnection } from '../../../src/platform/connection';
import { newSerializer } from '../../../src/platform/serializer';
import {
  Datastore,
  newDatastore,
  terminateDatastore
} from '../../../src/remote/datastore';
import { Code, FirestoreError } from '../../../src/util/error';

import { cast } from './util';

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;
const DEFAULT_FORCE_LONG_POLLING = false; // Used by full SDK

/**
 * The root reference to the Firestore Lite database.
 */
export class Firestore
  implements firestore.FirebaseFirestore, _FirebaseService {
  readonly _databaseId: DatabaseId;
  private readonly _firebaseApp: FirebaseApp;
  protected readonly _credentials: CredentialsProvider;

  // Assigned via _configureClient()
  protected _settings?: firestore.Settings;
  private _datastorePromise?: Promise<Datastore>;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    this._firebaseApp = app;
    this._databaseId = Firestore.databaseIdFromApp(app);
    this._credentials = new FirebaseCredentialsProvider(authProvider);
  }

  get app(): FirebaseApp {
    return this._firebaseApp;
  }

  _configureClient(settings: firestore.Settings): void {
    if (this._settings) {
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
    return this._settings;
  }

  _getDatastore(): Promise<Datastore> {
    if (!this._datastorePromise) {
      const settings = this._getSettings();
      const databaseInfo = this._makeDatabaseInfo(settings.host, settings.ssl);
      this._datastorePromise = newConnection(databaseInfo).then(connection => {
        const serializer = newSerializer(databaseInfo.databaseId);
        return newDatastore(connection, this._credentials, serializer);
      });
    }

    return this._datastorePromise;
  }

  protected _makeDatabaseInfo(
    host?: string,
    ssl?: boolean,
    forceLongPolling?: boolean
  ): DatabaseInfo {
    return new DatabaseInfo(
      this._databaseId,
      /* persistenceKey= */ 'unsupported',
      host ?? DEFAULT_HOST,
      ssl ?? DEFAULT_SSL,
      forceLongPolling ?? DEFAULT_FORCE_LONG_POLLING
    );
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

  delete(): Promise<void> {
    return terminate(this);
  }
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
  return firestoreClient
    ._getDatastore()
    .then(datastore => terminateDatastore(datastore));
}
