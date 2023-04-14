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
import { _FirebaseService } from '@firebase/app';

import { CredentialsProvider } from '../api/credentials';
import { cloneLongPollingOptions } from '../api/long_polling_options';
import { User } from '../auth/user';
import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { newConnection } from '../platform/connection';
import { newSerializer } from '../platform/serializer';
import { Datastore, newDatastore } from '../remote/datastore';
import { Code, FirestoreError } from '../util/error';
import { logDebug } from '../util/log';

import { FirestoreSettingsImpl } from './settings';

export const LOG_TAG = 'ComponentProvider';

// The components module manages the lifetime of dependencies of the Firestore
// client. Dependencies can be lazily constructed and only one exists per
// Firestore instance.

/**
 * An interface implemented by FirebaseFirestore that provides compatibility
 * with the usage in this file.
 *
 * This interface mainly exists to remove a cyclic dependency.
 */
export interface FirestoreService extends _FirebaseService {
  _authCredentials: CredentialsProvider<User>;
  _appCheckCredentials: CredentialsProvider<string>;
  _persistenceKey: string;
  _databaseId: DatabaseId;
  _terminated: boolean;

  _freezeSettings(): FirestoreSettingsImpl;
}
/**
 * An instance map that ensures only one Datastore exists per Firestore
 * instance.
 */
const datastoreInstances = new Map<FirestoreService, Datastore>();

/**
 * Returns an initialized and started Datastore for the given Firestore
 * instance. Callers must invoke removeComponents() when the Firestore
 * instance is terminated.
 */
export function getDatastore(firestore: FirestoreService): Datastore {
  if (firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'The client has already been terminated.'
    );
  }
  if (!datastoreInstances.has(firestore)) {
    logDebug(LOG_TAG, 'Initializing Datastore');
    const databaseInfo = makeDatabaseInfo(
      firestore._databaseId,
      firestore.app.options.appId || '',
      firestore._persistenceKey,
      firestore._freezeSettings()
    );
    const connection = newConnection(databaseInfo);
    const serializer = newSerializer(firestore._databaseId);
    const datastore = newDatastore(
      firestore._authCredentials,
      firestore._appCheckCredentials,
      connection,
      serializer
    );

    datastoreInstances.set(firestore, datastore);
  }
  return datastoreInstances.get(firestore)!;
}

/**
 * Removes all components associated with the provided instance. Must be called
 * when the `Firestore` instance is terminated.
 */
export function removeComponents(firestore: FirestoreService): void {
  const datastore = datastoreInstances.get(firestore);
  if (datastore) {
    logDebug(LOG_TAG, 'Removing Datastore');
    datastoreInstances.delete(firestore);
    datastore.terminate();
  }
}

export function makeDatabaseInfo(
  databaseId: DatabaseId,
  appId: string,
  persistenceKey: string,
  settings: FirestoreSettingsImpl
): DatabaseInfo {
  return new DatabaseInfo(
    databaseId,
    appId,
    persistenceKey,
    settings.host,
    settings.ssl,
    settings.experimentalForceLongPolling,
    settings.experimentalAutoDetectLongPolling,
    cloneLongPollingOptions(settings.experimentalLongPollingOptions),
    settings.useFetchStreams
  );
}
