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

import * as firestore from '../../';

import { _getProvider } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { Code, FirestoreError } from '../../../src/util/error';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  CredentialsProvider,
  FirebaseCredentialsProvider
} from '../../../src/api/credentials';
import {
  Datastore,
  newDatastore,
  terminateDatastore
} from '../../../src/remote/datastore';
import { PlatformSupport } from '../../../src/platform/platform';
import { Deferred } from '../../../src/util/promise';
import { cast } from './util';

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;

// TODO(firestorelite): Depend on FirebaseService once #3112 is merged

/**
 * The root reference to the Firestore Lite database.
 */
export class Firestore implements firestore.FirebaseFirestore {
  readonly _databaseId: DatabaseId;
  private readonly _firebaseApp: FirebaseApp;
  private readonly _credentials: CredentialsProvider;

  // Assigned via _configureClient()/_ensureClientConfigured()
  _settings?: firestore.Settings;
  private readonly _datastoreDeferred = new Deferred<Datastore>();

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

    const databaseInfo = this._makeDatabaseInfo(settings);

    // Kick off initializing the datastore but don't actually wait for it.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    PlatformSupport.getPlatform()
      .loadConnection(databaseInfo)
      .then(connection => {
        const serializer = PlatformSupport.getPlatform().newSerializer(
          databaseInfo.databaseId
        );
        const datastore = newDatastore(
          connection,
          this._credentials,
          serializer
        );
        this._datastoreDeferred.resolve(datastore);
      });
  }

  _ensureClientConfigured(): Promise<Datastore> {
    if (!this._settings) {
      this._settings = {};
    }
    return this._datastoreDeferred.promise;
  }

  private _makeDatabaseInfo(settings: firestore.Settings): DatabaseInfo {
    return new DatabaseInfo(
      this._databaseId,
      /* persistenceKey= */ 'unsupported',
      settings.host ?? DEFAULT_HOST,
      settings.ssl ?? DEFAULT_SSL,
      /* forceLongPolling= */ false
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
  // TODO(firestorelite): Call _removeServiceInstance when available
  const firestoreClient = cast(firestore, Firestore);
  return firestoreClient
    ._ensureClientConfigured()
    .then(datastore => terminateDatastore(datastore));
}
