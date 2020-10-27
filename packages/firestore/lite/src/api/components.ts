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

import { Datastore, newDatastore } from '../../../src/remote/datastore';
import { newConnection } from '../../../src/platform/connection';
import { newSerializer } from '../../../src/platform/serializer';
import { FirebaseFirestore, Settings } from './database';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { logDebug } from '../../../src/util/log';
import { Code, FirestoreError } from '../../../src/util/error';
import { FirestoreSettings } from '../../../src/api/database';

export const LOG_TAG = 'ComponentProvider';

// settings() defaults:
export const DEFAULT_HOST = 'firestore.googleapis.com';
export const DEFAULT_SSL = true;

// The components module manages the lifetime of dependencies of the Firestore
// client. Dependencies can be lazily constructed and only one exists per
// Firestore instance.

/**
 * An instance map that ensures only one Datastore exists per Firestore
 * instance.
 */
const datastoreInstances = new Map<FirebaseFirestore, Datastore>();

/**
 * Returns an initialized and started Datastore for the given Firestore
 * instance. Callers must invoke removeComponents() when the Firestore
 * instance is terminated.
 */
export function getDatastore(firestore: FirebaseFirestore): Datastore {
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
      firestore._persistenceKey,
      firestore._getSettings()
    );
    const connection = newConnection(databaseInfo);
    const serializer = newSerializer(firestore._databaseId);
    const datastore = newDatastore(
      firestore._credentials,
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
export function removeComponents(firestore: FirebaseFirestore): void {
  const datastore = datastoreInstances.get(firestore);
  if (datastore) {
    logDebug(LOG_TAG, 'Removing Datastore');
    datastoreInstances.delete(firestore);
    datastore.terminate();
  }
}

export function makeDatabaseInfo(
  databaseId: DatabaseId,
  persistenceKey: string,
  settings: FirestoreSettings
): DatabaseInfo {
  return new DatabaseInfo(
    databaseId,
    persistenceKey,
    settings.host,
    settings.ssl,
    settings.experimentalForceLongPolling,
    settings.experimentalAutoDetectLongPolling
  );
}
