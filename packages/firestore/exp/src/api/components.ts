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
  MemoryOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from '../../../src/core/component_provider';
import { DEFAULT_HOST, DEFAULT_SSL } from '../../../lite/src/api/components';
import { LocalStore } from '../../../src/local/local_store';
import { Deferred } from '../../../src/util/promise';

// The components module manages the lifetime of dependencies of the Firestore
// client. Dependencies can be lazily constructed and only one exists per
// Firestore instance.

// TODO: These should be promises too
const offlineComponentProviders = new Map<
  Firestore,
  OfflineComponentProvider
>();
const onlineComponentProviders = new Map<Firestore, OnlineComponentProvider>();

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
    initializeFirestoreClient(firestore, {
      durable: false
    });
  }
  return firestoreClientInstances.get(firestore)!;
}

async function getOfflineComponentProvider(
  firestore: Firestore
): Promise<OfflineComponentProvider> {
  let offlineComponentProvider = offlineComponentProviders.get(firestore);
  if (!offlineComponentProvider) {
    offlineComponentProvider = new MemoryOfflineComponentProvider();
    offlineComponentProviders.set(firestore, offlineComponentProvider);
    const componentConfiguration = {
      asyncQueue: firestore._queue,
      databaseInfo: firestore._databaseId,
      clientId: null as any,
      credentials: null as any,
      initialUser: null as any,
      maxConcurrentLimboResolutions: null as any,
      persistenceSettings: null as any
    };
    await offlineComponentProvider.initialize(componentConfiguration as any);
  }
  return offlineComponentProvider;
}

async function getOnlineComponentProvider(
  firestore: Firestore
): Promise<OnlineComponentProvider> {
  let onlineComponentProvider = onlineComponentProviders.get(firestore);
  if (!onlineComponentProvider) {
    onlineComponentProvider = new OnlineComponentProvider();
    onlineComponentProviders.set(firestore, onlineComponentProvider);
    const componentConfiguration = {
      asyncQueue: firestore._queue,
      databaseInfo: firestore._databaseId,
      clientId: null as any,
      credentials: null as any,
      initialUser: null as any,
      maxConcurrentLimboResolutions: null as any,
      persistenceSettings: null as any
    };
    await onlineComponentProvider.initialize(
      await getOfflineComponentProvider(firestore),
      componentConfiguration as any
    );
  }
  return onlineComponentProvider;
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
  persistenceSettings: PersistenceSettings
): Promise<void> {
  if (firestore._initialized) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore has already been started and persistence can no longer ' +
        'be enabled. You can only enable persistence before calling ' +
        'any other methods on a Firestore object.'
    );
  }
  const databaseInfo = firestore._getDatabaseInfo();
  const firestoreClient = new FirestoreClient(
    firestore._credentials,
    firestore._queue
  );
  const initializationDeferred = new Deferred<FirestoreClient>();
  firestoreClientInstances.set(firestore, initializationDeferred.promise);

  Promise.all([
    getOfflineComponentProvider(firestore),
    getOnlineComponentProvider(firestore)
  ]).then(([offlineComponentProvider, onlineComponentProvider]) => {
    firestoreClient
      .start(
        databaseInfo,
        offlineComponentProvider,
        onlineComponentProvider,
        persistenceSettings
      )
      .then(() => initializationDeferred.resolve(firestoreClient));
  });
  return initializationDeferred.promise.then(() => {});
}

/**
 * Removes and terminates the FirestoreClient for the given instance if it has
 * been started.
 */
export async function removeFirestoreClient(
  firestore: Firestore
): Promise<void> {
  const firestoreClient = await firestoreClientInstances.get(firestore);
  if (firestoreClient) {
    firestoreClientInstances.delete(firestore);
    return firestoreClient.terminate();
  }
}

export async function setComponentProviders(
  firestore: Firestore,
  offlineComponentProvider: OfflineComponentProvider,
  onlineComponentProvider: OnlineComponentProvider
): Promise<void> {
  const componentConfiguration = firestore._getConfiguration();
  await offlineComponentProvider.initialize(componentConfiguration);
  await onlineComponentProvider.initialize(
    offlineComponentProvider,
    componentConfiguration
  );
  offlineComponentProviders.set(firestore, offlineComponentProvider);
  onlineComponentProviders.set(firestore, onlineComponentProvider);
}

export function getLocalStore(firestore: Firestore): Promise<LocalStore> {
  if (firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'The client has already been terminated.'
    );
  }
  return getOfflineComponentProvider(firestore).then(
    provider => provider.localStore
  );
}
