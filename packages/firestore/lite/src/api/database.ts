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

import * as firestore from '../../';

import { Provider } from '@firebase/component';
import { FirebaseApp } from '@firebase/app-types';
import { Code, FirestoreError } from '../../../src/util/error';
import { FirebaseService } from '@firebase/app-types/private';
import { Datastore, newDatastore } from '../../../src/remote/datastore';
import { PlatformSupport } from '../../../src/platform/platform';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  CredentialsProvider,
  FirebaseCredentialsProvider
} from '../../../src/api/credentials';
import { CollectionReference, DocumentReference } from './reference';
import { ResourcePath } from '../../../src/model/path';
import { DocumentKey } from '../../../src/model/document_key';

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;

/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied firestore.Settings object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
class FirestoreSettings {
  /** The hostname to connect to. */
  readonly host: string;

  /** Whether to use SSL when connecting. */
  readonly ssl: boolean;

  constructor(settings: firestore.Settings) {
    if (settings.host === undefined) {
      if (settings.ssl !== undefined) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          "Can't provide ssl option if host option is not set"
        );
      }
      this.host = DEFAULT_HOST;
      this.ssl = DEFAULT_SSL;
    } else {
      this.host = settings.host;
      this.ssl = settings.ssl ?? DEFAULT_SSL;
    }
  }

  isEqual(other: FirestoreSettings): boolean {
    return this.host === other.host && this.ssl === other.ssl;
  }
}

/**
 * The root reference to the database.
 */
export class Firestore implements firestore.FirebaseFirestore, FirebaseService {
  readonly _databaseId: DatabaseId;
  private readonly _firebaseApp: FirebaseApp;
  private _settings = new FirestoreSettings({});
  private _credentials: CredentialsProvider;

  // The firestore client instance. This will be available as soon as
  // configureClient is called, but any calls against it will block until
  // setup has completed.
  //
  // Operations on the _firestoreClient don't block on _firestoreReady. Those
  // are already set to synchronize on the async queue.
  _datastore: Datastore | undefined;

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

  _configureClient(settings: FirestoreSettings): void {
    this._settings = settings;
  }

  async _ensureClientConfigured(): Promise<void> {
    if (!this._datastore) {
      const databaseInfo = this._makeDatabaseInfo();

      const conenction = await PlatformSupport.getPlatform().loadConnection(
        databaseInfo
      );
      const serializer = PlatformSupport.getPlatform().newSerializer(
        databaseInfo.databaseId
      );
      this._datastore = newDatastore(conenction, this._credentials, serializer);
    }
  }

  private _makeDatabaseInfo(): DatabaseInfo {
    return new DatabaseInfo(
      this._databaseId,
      /* persistenceKey= */ 'invalid',
      this._settings.host,
      this._settings.ssl,
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

export interface Settings {
  host?: string;
  ssl?: boolean;
}

export function initializeFirestore(
  firstore: Firestore,
  settings?: Settings
): void {
  firstore._configureClient(new FirestoreSettings(settings ?? {}));
}
