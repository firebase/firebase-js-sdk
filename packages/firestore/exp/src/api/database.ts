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

import * as firestore from '../../index';

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
  MemoryComponentProvider
} from '../../../src/core/component_provider';

import { Firestore as LiteFirestore } from '../../../lite/src/api/database';
import { cast } from '../../../lite/src/api/util';
import { Code, FirestoreError } from '../../../src/util/error';
import { Deferred } from '../../../src/util/promise';
import { LruParams } from '../../../src/local/lru_garbage_collector';

/**
 * The root reference to the Firestore database and the entry point for the
 * tree-shakeable SDK.
 */
export class Firestore extends LiteFirestore
  implements firestore.FirebaseFirestore, _FirebaseService {
  private readonly _queue = new AsyncQueue();
  private readonly _persistenceKey: string;
  private _componentProvider: ComponentProvider = new MemoryComponentProvider();

  // Assigned via _getFirestoreClient()
  private _firestoreClientPromise?: Promise<FirestoreClient>;

  protected _persistenceSettings: PersistenceSettings = { durable: false };
  // We override the Settings property of the Lite SDK since the full Firestore
  // SDK supports more settings.
  protected _settings?: firestore.Settings;

  _terminated: boolean = false;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(app, authProvider);
    this._persistenceKey = app.name;
  }

  _getSettings(): firestore.Settings {
    if (!this._settings) {
      this._settings = {};
    }
    return this._settings;
  }

  _getFirestoreClient(): Promise<FirestoreClient> {
    if (!this._firestoreClientPromise) {
      const settings = this._getSettings();
      const databaseInfo = this._makeDatabaseInfo(
        settings.host,
        settings.ssl,
        settings.experimentalForceLongPolling
      );

      const firestoreClient = new FirestoreClient(
        databaseInfo,
        this._credentials,
        this._queue
      );

      this._firestoreClientPromise = firestoreClient
        .start(this._componentProvider, this._persistenceSettings)
        .then(() => firestoreClient);
    }

    return this._firestoreClientPromise;
  }

  // TODO(firestorexp): Factor out MultiTabComponentProvider and remove
  // `synchronizeTabs` argument
  _enablePersistence(
    persistenceProvider: ComponentProvider,
    synchronizeTabs: boolean
  ): Promise<void> {
    if (this._firestoreClientPromise) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and persistence can no longer ' +
          'be enabled. You can only call enable persistence before calling ' +
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

  _clearPersistence(): Promise<void> {
    if (this._firestoreClientPromise !== undefined && !this._terminated) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Persistence can only be cleared before the Firestore instance is ' +
          'initialized or after it is terminated.'
      );
    }

    const settings = this._getSettings();
    const deferred = new Deferred<void>();
    this._queue.enqueueAndForgetEvenAfterShutdown(async () => {
      try {
        const databaseInfo = this._makeDatabaseInfo(
          settings.host,
          settings.ssl,
          settings.experimentalForceLongPolling
        );
        await this._componentProvider.clearPersistence(databaseInfo);
        deferred.resolve();
      } catch (e) {
        deferred.reject(e);
      }
    });
    return deferred.promise;
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
    new IndexedDbComponentProvider(),
    /*synchronizeTabs=*/ true
  );
}

export function clearIndexedDbPersistence(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl._clearPersistence();
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
  _removeServiceInstance(firestore.app, 'firestore/lite');
  const firestoreImpl = cast(firestore, Firestore);
  firestoreImpl._terminated = true;
  return firestoreImpl
    ._getFirestoreClient()
    .then(firestoreClient => firestoreClient.terminate());
}
