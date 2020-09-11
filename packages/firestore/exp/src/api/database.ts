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

import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { MAX_CONCURRENT_LIMBO_RESOLUTIONS } from '../../../src/core/firestore_client';
import {
  AsyncQueue,
  wrapInUserErrorIfRecoverable
} from '../../../src/util/async_queue';
import {
  ComponentConfiguration,
  IndexedDbOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  OnlineComponentProvider
} from '../../../src/core/component_provider';
import {
  FirebaseFirestore as LiteFirestore,
  Settings as LiteSettings
} from '../../../lite/src/api/database';
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
import { registerPendingWritesCallback } from '../../../src/core/sync_engine';
import {
  remoteStoreDisableNetwork,
  remoteStoreEnableNetwork
} from '../../../src/remote/remote_store';
import { PersistenceSettings } from '../../../exp-types';

const LOG_TAG = 'Firestore';

export interface Settings extends LiteSettings {
  cacheSizeBytes?: number;
}

/**
 * The root reference to the Firestore database and the entry point for the
 * tree-shakeable SDK.
 */
export class FirebaseFirestore
  extends LiteFirestore
  implements _FirebaseService {
  readonly _queue = new AsyncQueue();
  readonly _persistenceKey: string;
  readonly _clientId = AutoId.newId();

  private readonly _receivedInitialUser = new Deferred<void>();
  private _user = User.UNAUTHENTICATED;
  private _credentialListener: CredentialChangeListener = () => {};

  // We override the Settings property of the Lite SDK since the full Firestore
  // SDK supports more settings.
  protected _settings?: Settings;

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
      /* forceLongPolling= */ false
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

  _getSettings(): Settings {
    return super._getSettings();
  }

  _terminate(): Promise<void> {
    this._queue.enterRestrictedMode();
    const deferred = new Deferred();
    this._queue.enqueueAndForgetEvenWhileRestricted(async () => {
      try {
        await super._terminate();
        await removeComponents(this);

        // `removeChangeListener` must be called after shutting down the
        // RemoteStore as it will prevent the RemoteStore from retrieving
        // auth tokens.
        this._credentials.removeChangeListener();

        deferred.resolve();
      } catch (e) {
        const firestoreError = wrapInUserErrorIfRecoverable(
          e,
          `Failed to shutdown persistence`
        );
        deferred.reject(firestoreError);
      }
    });
    return deferred.promise;
  }

  _verifyNotTerminated(): void {
    if (this._terminated) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'The client has already been terminated.'
      );
    }
  }
}

export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore {
  const firestore = _getProvider(
    app,
    'firestore-exp'
  ).getImmediate() as FirebaseFirestore;

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

export function getFirestore(app: FirebaseApp): FirebaseFirestore {
  return _getProvider(app, 'firestore-exp').getImmediate() as FirebaseFirestore;
}

export function enableIndexedDbPersistence(
  firestore: FirebaseFirestore,
  persistenceSettings?: PersistenceSettings
): Promise<void> {
  verifyNotInitialized(firestore);

  // `_getSettings()` freezes the client settings and prevents further changes
  // to the components (as `verifyNotInitialized()` would fail). Components can
  // then be accessed via `getOfflineComponentProvider()` and
  // `getOnlineComponentProvider()`
  const settings = firestore._getSettings();

  const onlineComponentProvider = new OnlineComponentProvider();
  const offlineComponentProvider = new IndexedDbOfflineComponentProvider(
    onlineComponentProvider
  );

  return firestore._queue.enqueue(async () => {
    await setOfflineComponentProvider(
      firestore,
      {
        durable: true,
        synchronizeTabs: false,
        cacheSizeBytes:
          settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
        forceOwningTab: !!persistenceSettings?.forceOwnership
      },
      offlineComponentProvider
    );
    await setOnlineComponentProvider(firestore, onlineComponentProvider);
  });
}

export function enableMultiTabIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void> {
  verifyNotInitialized(firestore);

  // `_getSettings()` freezes the client settings and prevents further changes
  // to the components (as `verifyNotInitialized()` would fail). Components can
  // then be accessed via `getOfflineComponentProvider()` and
  // `getOnlineComponentProvider()`
  const settings = firestore._getSettings();

  const onlineComponentProvider = new OnlineComponentProvider();
  const offlineComponentProvider = new MultiTabOfflineComponentProvider(
    onlineComponentProvider
  );
  return firestore._queue.enqueue(async () => {
    await setOfflineComponentProvider(
      firestore,
      {
        durable: true,
        synchronizeTabs: true,
        cacheSizeBytes:
          settings.cacheSizeBytes || LruParams.DEFAULT_CACHE_SIZE_BYTES,
        forceOwningTab: false
      },
      offlineComponentProvider
    );
    await setOnlineComponentProvider(firestore, onlineComponentProvider);
  });
}

export function clearIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void> {
  if (firestore._initialized && !firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Persistence can only be cleared before a Firestore instance is ' +
        'initialized or after it is terminated.'
    );
  }

  const deferred = new Deferred<void>();
  firestore._queue.enqueueAndForgetEvenWhileRestricted(async () => {
    try {
      await indexedDbClearPersistence(
        indexedDbStoragePrefix(firestore._databaseId, firestore._persistenceKey)
      );
      deferred.resolve();
    } catch (e) {
      deferred.reject(e);
    }
  });
  return deferred.promise;
}

export function waitForPendingWrites(
  firestore: FirebaseFirestore
): Promise<void> {
  firestore._verifyNotTerminated();

  const deferred = new Deferred<void>();
  firestore._queue.enqueueAndForget(async () => {
    const syncEngine = await getSyncEngine(firestore);
    return registerPendingWritesCallback(syncEngine, deferred);
  });
  return deferred.promise;
}

export function enableNetwork(firestore: FirebaseFirestore): Promise<void> {
  firestore._verifyNotTerminated();

  return firestore._queue.enqueue(async () => {
    const remoteStore = await getRemoteStore(firestore);
    const persistence = await getPersistence(firestore);
    persistence.setNetworkEnabled(true);
    return remoteStoreEnableNetwork(remoteStore);
  });
}

export function disableNetwork(firestore: FirebaseFirestore): Promise<void> {
  firestore._verifyNotTerminated();

  return firestore._queue.enqueue(async () => {
    const remoteStore = await getRemoteStore(firestore);
    const persistence = await getPersistence(firestore);
    persistence.setNetworkEnabled(false);
    return remoteStoreDisableNetwork(remoteStore);
  });
}

export function terminate(firestore: FirebaseFirestore): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore-exp');
  return firestore._delete();
}

function verifyNotInitialized(firestore: FirebaseFirestore): void {
  if (firestore._initialized || firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore has already been started and persistence can no longer be ' +
        'enabled. You can only enable persistence before calling any other ' +
        'methods on a Firestore object.'
    );
  }
}
