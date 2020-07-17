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
import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { AsyncQueue } from '../../../src/util/async_queue';

import { Firestore as LiteFirestore } from '../../../lite/src/api/database';
import { cast } from '../../../lite/src/api/util';
import { Code, FirestoreError } from '../../../src/util/error';
import { Deferred } from '../../../src/util/promise';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { CACHE_SIZE_UNLIMITED } from '../../../src/api/database';
import {
  indexedDbClearPersistence,
  indexedDbStoragePrefix
} from '../../../src/local/indexeddb_persistence';
import {
  getFirestoreClient,
  initializeFirestoreClient,
  removeFirestoreClient,
  setComponentProviders
} from './components';
import {
  ComponentConfiguration,
  IndexedDbOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  MultiTabOnlineComponentProvider,
  OnlineComponentProvider
} from '../../../src/core/component_provider';
import { MAX_CONCURRENT_LIMBO_RESOLUTIONS } from '../../../src/core/firestore_client';
import { DatabaseInfo } from '../../../src/core/database_info';
import { DEFAULT_HOST, DEFAULT_SSL } from '../../../lite/src/api/components';
import { User } from '../../../src/auth/user';
import { AutoId } from '../../../src/util/misc';

/**
 * The root reference to the Firestore database and the entry point for the
 * tree-shakeable SDK.
 */
export class Firestore extends LiteFirestore
  implements firestore.FirebaseFirestore, _FirebaseService {
  readonly _queue = new AsyncQueue();
  readonly _persistenceKey: string;
  // TODO(firestoreexp): Support user change without SyncEning
  private _initialUser: User = User.UNAUTHENTICATED;

  private readonly _clientId = AutoId.newId();

  // We override the Settings property of the Lite SDK since the full Firestore
  // SDK supports more settings.
  protected _settings?: firestore.Settings;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(app, authProvider);
    this._persistenceKey = app.name;

    this._credentials.getToken().then(token => {
      if (token) {
        this._initialUser = token.user;
      }
    });
  }

  _getDatabaseInfo(): DatabaseInfo {
    const settings = this._getSettings();
    return new DatabaseInfo(
      this._databaseId,
      this._persistenceKey,
      settings.host ?? DEFAULT_HOST,
      settings.ssl ?? DEFAULT_SSL,
      /** forceLongPolling= */ false
    );
  }
  _getConfiguration(): ComponentConfiguration {
    return {
      asyncQueue: this._queue,
      databaseInfo: this._getDatabaseInfo(),
      clientId: this._clientId,
      credentials: this._credentials,
      initialUser: this._initialUser,
      maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS,
      persistenceSettings: { durable: false }
    };
  }

  _getSettings(): firestore.Settings {
    if (!this._settings) {
      this._settings = {};
    }
    return this._settings;
  }

  async _terminate(): Promise<void> {
    await super._terminate();
    await removeFirestoreClient(this);
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
  const settings = firestoreImpl._getSettings();
  return setComponentProviders(
    firestoreImpl,
    new IndexedDbOfflineComponentProvider(),
    new OnlineComponentProvider()
  ).then(() =>
    initializeFirestoreClient(firestoreImpl, {
      durable: true,
      synchronizeTabs: false,
      cacheSizeBytes:
        settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
      forceOwningTab: false
    })
  );
}

export function enableMultiTabIndexedDbPersistence(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  const settings = firestoreImpl._getSettings();
  return setComponentProviders(
    firestoreImpl,
    new MultiTabOfflineComponentProvider(),
    new MultiTabOnlineComponentProvider()
  ).then(() =>
    initializeFirestoreClient(firestoreImpl, {
      durable: true,
      synchronizeTabs: true,
      cacheSizeBytes:
        settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
      forceOwningTab: false
    })
  );
}

export function clearIndexedDbPersistence(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  if (firestoreImpl._initialized && !firestoreImpl._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Persistence can only be cleared before a Firestore instance is ' +
        'initialized or after it is terminated.'
    );
  }

  const deferred = new Deferred<void>();
  firestoreImpl._queue.enqueueAndForgetEvenAfterShutdown(async () => {
    try {
      await indexedDbClearPersistence(
        indexedDbStoragePrefix(
          firestoreImpl._databaseId,
          firestoreImpl._persistenceKey
        )
      );
      deferred.resolve();
    } catch (e) {
      deferred.reject(e);
    }
  });
  return deferred.promise;
}

export function waitForPendingWrites(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return getFirestoreClient(firestoreImpl).then(firestoreClient =>
    firestoreClient.waitForPendingWrites()
  );
}

export function enableNetwork(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return getFirestoreClient(firestoreImpl).then(firestoreClient =>
    firestoreClient.enableNetwork()
  );
}

export function disableNetwork(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return getFirestoreClient(firestoreImpl).then(firestoreClient =>
    firestoreClient.disableNetwork()
  );
}

export function terminate(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore/lite');
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl.delete();
}
