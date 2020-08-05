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

import * as firestore from '../../../exp-types';

import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  FirestoreClient,
  PersistenceSettings
} from '../../../src/core/firestore_client';
import { AsyncQueue } from '../../../src/util/async_queue';
import {
  ComponentProvider,
  IndexedDbComponentProvider,
  MemoryComponentProvider,
  MultiTabIndexedDbComponentProvider
} from '../../../src/core/component_provider';

import {
  DEFAULT_FORCE_LONG_POLLING,
  DEFAULT_HOST,
  DEFAULT_SSL,
  Firestore as LiteFirestore
} from '../../../lite/src/api/database';
import { cast } from '../../../lite/src/api/util';
import { Code, FirestoreError } from '../../../src/util/error';
import { Deferred } from '../../../src/util/promise';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { CACHE_SIZE_UNLIMITED } from '../../../src/api/database';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import {
  indexedDbStoragePrefix,
  indexedDbClearPersistence
} from '../../../src/local/indexeddb_persistence';
import { LoadBundleTask } from '../../../src/api/bundle';
import { Query } from '../../../lite';

/**
 * The root reference to the Firestore database and the entry point for the
 * tree-shakeable SDK.
 */
export class Firestore extends LiteFirestore
  implements firestore.FirebaseFirestore, _FirebaseService {
  private readonly _queue = new AsyncQueue();
  private readonly _firestoreClient: FirestoreClient;
  private readonly _persistenceKey: string;
  private _componentProvider: ComponentProvider = new MemoryComponentProvider();

  // Assigned via _getFirestoreClient()
  private _deferredInitialization?: Promise<void>;

  protected _persistenceSettings: PersistenceSettings = { durable: false };
  // We override the Settings property of the Lite SDK since the full Firestore
  // SDK supports more settings.
  protected _settings?: firestore.Settings;

  private _terminated: boolean = false;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(app, authProvider);
    this._persistenceKey = app.name;
    this._firestoreClient = new FirestoreClient(this._credentials, this._queue);
  }

  _getSettings(): firestore.Settings {
    if (!this._settings) {
      this._settings = {};
    }
    return this._settings;
  }

  _getFirestoreClient(): Promise<FirestoreClient> {
    if (this._terminated) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'The client has already been terminated.'
      );
    }

    if (!this._deferredInitialization) {
      const settings = this._getSettings();
      const databaseInfo = this._makeDatabaseInfo(
        settings.host,
        settings.ssl,
        /* experimentalForceLongPolling= */ false
      );

      this._deferredInitialization = this._firestoreClient.start(
        databaseInfo,
        this._componentProvider,
        this._persistenceSettings
      );
    }

    return this._deferredInitialization.then(() => this._firestoreClient);
  }

  // TODO(firestorexp): Factor out MultiTabComponentProvider and remove
  // `synchronizeTabs` argument
  _enablePersistence(
    persistenceProvider: ComponentProvider,
    synchronizeTabs: boolean
  ): Promise<void> {
    if (this._deferredInitialization) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and persistence can no longer ' +
          'be enabled. You can only enable persistence before calling ' +
          'any other methods on a Firestore object.'
      );
    }

    const settings = this._getSettings();
    this._persistenceSettings = {
      durable: true,
      synchronizeTabs,
      forceOwningTab: false,
      cacheSizeBytes:
        settings.cacheSizeBytes ?? LruParams.DEFAULT_CACHE_SIZE_BYTES
    };
    this._componentProvider = persistenceProvider;

    // TODO(firestorexp): Add support for Persistence fallback
    return this._getFirestoreClient().then(() => {});
  }

  delete(): Promise<void> {
    return terminate(this);
  }

  /**
   * Verifies that the client is not running and clears persistence by invoking
   * `delegate` on the async queue.
   *
   * @param delegate A function that clears the clients
   * backing storage.
   */
  _clearPersistence(
    delegate: (databaseId: DatabaseId, persistenceKey: string) => Promise<void>
  ): Promise<void> {
    if (this._deferredInitialization !== undefined && !this._terminated) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Persistence can only be cleared before a Firestore instance is ' +
          'initialized or after it is terminated.'
      );
    }

    const deferred = new Deferred<void>();
    this._queue.enqueueAndForgetEvenAfterShutdown(async () => {
      try {
        await delegate(this._databaseId, this._persistenceKey);
        deferred.resolve();
      } catch (e) {
        deferred.reject(e);
      }
    });
    return deferred.promise;
  }

  protected _makeDatabaseInfo(
    host?: string,
    ssl?: boolean,
    forceLongPolling?: boolean
  ): DatabaseInfo {
    return new DatabaseInfo(
      this._databaseId,
      this._persistenceKey,
      host ?? DEFAULT_HOST,
      ssl ?? DEFAULT_SSL,
      forceLongPolling ?? DEFAULT_FORCE_LONG_POLLING
    );
  }

  _terminate(): Promise<void> {
    this._terminated = true;
    if (this._deferredInitialization) {
      return this._deferredInitialization.then(() =>
        this._firestoreClient.terminate()
      );
    }
    return Promise.resolve();
  }
}

export function initializeFirestore(
  app: FirebaseApp,
  settings: firestore.Settings
): Firestore {
  const firestore = _getProvider(
    app,
    'firestore-exp'
  ).getImmediate() as Firestore;

  if (
    settings.cacheSizeBytes !== undefined &&
    settings.cacheSizeBytes !== CACHE_SIZE_UNLIMITED &&
    settings.cacheSizeBytes < LruParams.MINIMUM_CACHE_SIZE_BYTES
  ) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `cacheSizeBytes must be at least ${LruParams.MINIMUM_CACHE_SIZE_BYTES}`
    );
  }

  firestore._configureClient(settings);
  return firestore;
}

export function getFirestore(app: FirebaseApp): Firestore {
  return _getProvider(app, 'firestore-exp').getImmediate() as Firestore;
}

export function enableIndexedDbPersistence(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl._enablePersistence(
    new IndexedDbComponentProvider(),
    /*synchronizeTabs=*/ false
  );
}

export function enableMultiTabIndexedDbPersistence(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl._enablePersistence(
    new MultiTabIndexedDbComponentProvider(),
    /*synchronizeTabs=*/ false
  );
}

export function clearIndexedDbPersistence(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl._clearPersistence((databaseId, persistenceKey) => {
    return indexedDbClearPersistence(
      indexedDbStoragePrefix(databaseId, persistenceKey)
    );
  });
}

export function waitForPendingWrites(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl
    ._getFirestoreClient()
    .then(firestoreClient => firestoreClient.waitForPendingWrites());
}

export function enableNetwork(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl
    ._getFirestoreClient()
    .then(firestoreClient => firestoreClient.enableNetwork());
}

export function disableNetwork(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl
    ._getFirestoreClient()
    .then(firestoreClient => firestoreClient.disableNetwork());
}

export function terminate(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore-exp');
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl._terminate();
}

export function loadBundle(
  firestore: firestore.FirebaseFirestore,
  bundleData: ArrayBuffer | ReadableStream<Uint8Array> | string
): LoadBundleTask {
  const firestoreImpl = cast(firestore, Firestore);
  const resultTask = new LoadBundleTask();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  firestoreImpl._getFirestoreClient().then(firestoreClient => {
    firestoreClient.loadBundle(bundleData, resultTask);
  });

  return resultTask;
}

export async function namedQuery(
  firestore: firestore.FirebaseFirestore,
  name: string
): Promise<firestore.Query | null> {
  const firestoreImpl = cast(firestore, Firestore);
  const client = await firestoreImpl._getFirestoreClient();
  const namedQuery = await client.getNamedQuery(name);
  if (!namedQuery) {
    return null;
  }

  return new Query(firestoreImpl, null, namedQuery.query);
}
