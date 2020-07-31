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
import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  enqueueNetworkEnabled,
  enqueueWaitForPendingWrites,
  MAX_CONCURRENT_LIMBO_RESOLUTIONS
} from '../../../src/core/firestore_client';
import { AsyncQueue } from '../../../src/util/async_queue';
import {
  ComponentConfiguration,
  IndexedDbOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  OnlineComponentProvider
} from '../../../src/core/component_provider';
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
  getPersistence,
  getRemoteStore,
  getSyncEngine,
  removeComponents,
  setOfflineComponentProvider,
  setOnlineComponentProvider
} from './components';

import { DEFAULT_HOST, DEFAULT_SSL } from '../../../lite/src/api/components';
import { DatabaseInfo } from '../../../src/core/database_info';
import { AutoId } from '../../../src/util/misc';
import { User } from '../../../src/auth/user';
import { CredentialChangeListener } from '../../../src/api/credentials';
import { logDebug } from '../../../src/util/log';
import { debugAssert } from '../../../src/util/assert';

const LOG_TAG = 'Firestore';

/**
 * The root reference to the Firestore database and the entry point for the
 * tree-shakeable SDK.
 */
export class Firestore extends LiteFirestore
  implements firestore.FirebaseFirestore, _FirebaseService {
  readonly _queue = new AsyncQueue();
  readonly _persistenceKey: string;
  readonly _clientId = AutoId.newId();

  private readonly _receivedInitialUser = new Deferred<void>();
  private _user = User.UNAUTHENTICATED;
  private _credentialListener: CredentialChangeListener = () => {};

  // We override the Settings property of the Lite SDK since the full Firestore
  // SDK supports more settings.
  protected _settings?: firestore.Settings;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(app, authProvider);
    this._persistenceKey = app.name;
    this._credentials.setChangeListener(user => {
      this._user = user;
      this._receivedInitialUser.resolve();
    });
  }

  _setCredentialChangeListener(
    credentialListener: CredentialChangeListener
  ): void {
    logDebug(LOG_TAG, 'Registering credential change listener');
    this._credentialListener = credentialListener;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._receivedInitialUser.promise.then(() =>
      this._credentialListener(this._user)
    );
  }

  async _getConfiguration(): Promise<ComponentConfiguration> {
    const settings = this._getSettings();
    await this._receivedInitialUser.promise;
    const databaseInfo = new DatabaseInfo(
      this._databaseId,
      this._persistenceKey,
      settings.host ?? DEFAULT_HOST,
      settings.ssl ?? DEFAULT_SSL,
      /* forceLongPolling= */ false,
      /* forceAutodetectLongPolling= */ false
    );
    return {
      asyncQueue: this._queue,
      databaseInfo,
      clientId: this._clientId,
      credentials: this._credentials,
      initialUser: this._user,
      maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS,
      // Note: This will be overwritten if IndexedDB persistence is enabled.
      persistenceSettings: { durable: false }
    };
  }

  _getSettings(): firestore.Settings {
    return super._getSettings();
  }

  _terminate(): Promise<void> {
    debugAssert(!this._terminated, 'Cannot invoke _terminate() more than once');
    return this._queue.enqueueAndInitiateShutdown(async () => {
      await super._terminate();
      this._credentials.removeChangeListener();
      await removeComponents(this);
    });
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
  verifyNotInitialized(firestoreImpl);

  // `_getSettings()` freezes the client settings and prevents further changes
  // to the components (as `verifyNotInitialized()` would fail). Components can
  // then be accessed via `getOfflineComponentProvider()` and
  // `getOnlineComponentProvider()`
  const settings = firestoreImpl._getSettings();

  // TODO(firestoreexp): Add forceOwningTab
  return setOfflineComponentProvider(
    firestoreImpl,
    {
      durable: true,
      synchronizeTabs: false,
      cacheSizeBytes:
        settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
      forceOwningTab: false
    },
    new IndexedDbOfflineComponentProvider()
  );
}

export function enableMultiTabIndexedDbPersistence(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  verifyNotInitialized(firestoreImpl);

  // `_getSettings()` freezes the client settings and prevents further changes
  // to the components (as `verifyNotInitialized()` would fail). Components can
  // then be accessed via `getOfflineComponentProvider()` and
  // `getOnlineComponentProvider()`
  const settings = firestoreImpl._getSettings();

  const onlineComponentProvider = new OnlineComponentProvider();
  const offlineComponentProvider = new MultiTabOfflineComponentProvider(
    onlineComponentProvider
  );
  return setOfflineComponentProvider(
    firestoreImpl,
    {
      durable: true,
      synchronizeTabs: true,
      cacheSizeBytes:
        settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
      forceOwningTab: false
    },
    offlineComponentProvider
  ).then(() =>
    setOnlineComponentProvider(firestoreImpl, onlineComponentProvider)
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
  return getSyncEngine(firestoreImpl).then(syncEngine =>
    enqueueWaitForPendingWrites(firestoreImpl._queue, syncEngine)
  );
}

export function enableNetwork(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return Promise.all([
    getRemoteStore(firestoreImpl),
    getPersistence(firestoreImpl)
  ]).then(([remoteStore, persistence]) =>
    enqueueNetworkEnabled(
      firestoreImpl._queue,
      remoteStore,
      persistence,
      /* enabled= */ true
    )
  );
}

export function disableNetwork(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  const firestoreImpl = cast(firestore, Firestore);
  return Promise.all([
    getRemoteStore(firestoreImpl),
    getPersistence(firestoreImpl)
  ]).then(([remoteStore, persistence]) =>
    enqueueNetworkEnabled(
      firestoreImpl._queue,
      remoteStore,
      persistence,
      /* enabled= */ false
    )
  );
}

export function terminate(
  firestore: firestore.FirebaseFirestore
): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore-exp');
  const firestoreImpl = cast(firestore, Firestore);
  return firestoreImpl.delete();
}

function verifyNotInitialized(firestore: Firestore): void {
  if (firestore._initialized) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore has already been started and persistence can no longer be ' +
        'enabled. You can only enable persistence before calling any other ' +
        'methods on a Firestore object.'
    );
  }
}
