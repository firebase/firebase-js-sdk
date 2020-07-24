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

import { Firestore } from './database';
import { DatabaseInfo } from '../../../src/core/database_info';
import {
  FirestoreClient,
  PersistenceSettings
} from '../../../src/core/firestore_client';
import { Code, FirestoreError } from '../../../src/util/error';
import {
  ComponentProvider,
  MemoryComponentProvider
} from '../../../src/core/component_provider';
import { DEFAULT_HOST, DEFAULT_SSL } from '../../../lite/src/api/components';
import { logDebug } from '../../../src/util/log';

export const LOG_TAG = 'ComponentProvider';

// The components module manages the lifetime of dependencies of the Firestore
// client. Dependencies can be lazily constructed and only one exists per
// Firestore instance.

/**
 * An instance map that ensures only one FirestoreClient exists per Firestore
 * instance.
 */
const firestoreClientInstances = new Map<Firestore, Promise<FirestoreClient>>();

/**
 * Returns the initialized and started FirestoreClient for the given Firestore
 * instance. If none exists, creates a new FirestoreClient with memory
 * persistence. Callers must invoke removeFirestoreClient() when the Firestore
 * instance is terminated.
 */
export function getFirestoreClient(
  firestore: Firestore
): Promise<FirestoreClient> {
  if (firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'The client has already been terminated.'
    );
  }
  if (!firestoreClientInstances.has(firestore)) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    initializeFirestoreClient(firestore, new MemoryComponentProvider(), {
      durable: false
    });
  }
  return firestoreClientInstances.get(firestore)!;
}

/**
 * Creates a new FirestoreClient for the given Firestore instance. Throws if the
 * instance exists.
 *
 * @param firestore The Firestore instance for which to create the
 * FirestoreClient.
 * @param componentProvider The component provider to use.
 * @param persistenceSettings Settings for the component provider.
 */
export function initializeFirestoreClient(
  firestore: Firestore,
  componentProvider: ComponentProvider,
  persistenceSettings: PersistenceSettings
): Promise<void> {
  if (firestoreClientInstances.has(firestore)) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore has already been started and persistence can no longer ' +
        'be enabled. You can only enable persistence before calling ' +
        'any other methods on a Firestore object.'
    );
  }
  logDebug(LOG_TAG, 'Initializing FirestoreClient');
  const settings = firestore._getSettings();
  const databaseInfo = new DatabaseInfo(
    firestore._databaseId,
    firestore._persistenceKey,
    settings.host ?? DEFAULT_HOST,
    settings.ssl ?? DEFAULT_SSL,
    /** forceLongPolling= */ false
  );
  const firestoreClient = new FirestoreClient(
    firestore._credentials,
    firestore._queue
  );
  const initializationPromise = firestoreClient.start(
    databaseInfo,
    componentProvider,
    persistenceSettings
  );
  firestoreClientInstances.set(
    firestore,
    initializationPromise.then(() => firestoreClient)
  );
  return initializationPromise;
}

/**
 * Removes and terminates the FirestoreClient for the given instance if it has
 * been started.
 */
export async function removeFirestoreClient(
  firestore: Firestore
): Promise<void> {
  const firestoreClientPromise = firestoreClientInstances.get(firestore);
  if (firestoreClientPromise) {
    firestoreClientInstances.delete(firestore);
    return firestoreClientPromise.then(firestoreClient =>
      firestoreClient.terminate()
    );
  }
}

/**
 * Removes all components associated with the provided instance. Must be called
 * when the Firestore instance is terminated.
 */
export async function removeComponents(firestore: Firestore): Promise<void> {
  const firestoreClientPromise = firestoreClientInstances.get(firestore);
  if (firestoreClientPromise) {
    logDebug(LOG_TAG, 'Removing FirestoreClient');
    firestoreClientInstances.delete(firestore);
    return (await firestoreClientPromise).terminate();
  }
}
