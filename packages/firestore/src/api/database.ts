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

import {
  _getProvider,
  _removeServiceInstance,
  FirebaseApp,
  getApp
} from '@firebase/app';
import { deepEqual, getDefaultEmulatorHostnameAndPort } from '@firebase/util';

import { User } from '../auth/user';
import {
  IndexedDbOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from '../core/component_provider';
import { DatabaseId, DEFAULT_DATABASE_NAME } from '../core/database_info';
import {
  canFallbackFromIndexedDbError,
  FirestoreClient,
  firestoreClientDisableNetwork,
  firestoreClientEnableNetwork,
  firestoreClientGetNamedQuery,
  firestoreClientLoadBundle,
  firestoreClientWaitForPendingWrites,
  setOfflineComponentProvider,
  setOnlineComponentProvider
} from '../core/firestore_client';
import { makeDatabaseInfo } from '../lite-api/components';
import {
  Firestore as LiteFirestore,
  connectFirestoreEmulator
} from '../lite-api/database';
import { Query } from '../lite-api/reference';
import {
  indexedDbClearPersistence,
  indexedDbStoragePrefix
} from '../local/indexeddb_persistence';
import { LRU_COLLECTION_DISABLED } from '../local/lru_garbage_collector';
import { LRU_MINIMUM_CACHE_SIZE_BYTES } from '../local/lru_garbage_collector_impl';
import { debugAssert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { newAsyncQueue } from '../util/async_queue_impl';
import { Code, FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';
import { logWarn } from '../util/log';
import { Deferred } from '../util/promise';

import { LoadBundleTask } from './bundle';
import { CredentialsProvider } from './credentials';
import { PersistenceSettings, FirestoreSettings } from './settings';
export {
  connectFirestoreEmulator,
  EmulatorMockTokenOptions
} from '../lite-api/database';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'firestore': Firestore;
  }
}

/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * {@link Firestore} instance.
 */
export const CACHE_SIZE_UNLIMITED = LRU_COLLECTION_DISABLED;

/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link (getFirestore:1)}.
 */
export class Firestore extends LiteFirestore {
  /**
   * Whether it's a {@link Firestore} or Firestore Lite instance.
   */
  type: 'firestore-lite' | 'firestore' = 'firestore';

  readonly _queue: AsyncQueue = newAsyncQueue();
  readonly _persistenceKey: string;

  _firestoreClient: FirestoreClient | undefined;

  /** @hideconstructor */
  constructor(
    authCredentialsProvider: CredentialsProvider<User>,
    appCheckCredentialsProvider: CredentialsProvider<string>,
    databaseId: DatabaseId,
    app?: FirebaseApp
  ) {
    super(
      authCredentialsProvider,
      appCheckCredentialsProvider,
      databaseId,
      app
    );
    this._persistenceKey = app?.name || '[DEFAULT]';
  }

  _terminate(): Promise<void> {
    if (!this._firestoreClient) {
      // The client must be initialized to ensure that all subsequent API
      // usage throws an exception.
      configureFirestore(this);
    }
    return this._firestoreClient!.terminate();
  }
}

/**
 * Initializes a new instance of {@link Firestore} with the provided settings.
 * Can only be called before any other function, including
 * {@link (getFirestore:1)}. If the custom settings are empty, this function is
 * equivalent to calling {@link (getFirestore:1)}.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} with which the {@link Firestore} instance will
 * be associated.
 * @param settings - A settings object to configure the {@link Firestore} instance.
 * @param databaseId - The name of the database.
 * @returns A newly initialized {@link Firestore} instance.
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: FirestoreSettings,
  databaseId?: string
): Firestore {
  if (!databaseId) {
    databaseId = DEFAULT_DATABASE_NAME;
  }
  const provider = _getProvider(app, 'firestore');

  if (provider.isInitialized(databaseId)) {
    const existingInstance = provider.getImmediate({
      identifier: databaseId
    });
    const initialSettings = provider.getOptions(
      databaseId
    ) as FirestoreSettings;
    if (deepEqual(initialSettings, settings)) {
      return existingInstance;
    } else {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'initializeFirestore() has already been called with ' +
          'different options. To avoid this error, call initializeFirestore() with the ' +
          'same options as when it was originally called, or call getFirestore() to return the' +
          ' already initialized instance.'
      );
    }
  }

  if (
    settings.cacheSizeBytes !== undefined &&
    settings.localCache !== undefined
  ) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes will` +
        `be deprecated. Instead, specify the cache size in the cache object`
    );
  }

  if (
    settings.cacheSizeBytes !== undefined &&
    settings.cacheSizeBytes !== CACHE_SIZE_UNLIMITED &&
    settings.cacheSizeBytes < LRU_MINIMUM_CACHE_SIZE_BYTES
  ) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `cacheSizeBytes must be at least ${LRU_MINIMUM_CACHE_SIZE_BYTES}`
    );
  }

  return provider.initialize({
    options: settings,
    instanceIdentifier: databaseId
  });
}

/**
 * Returns the existing default {@link Firestore} instance that is associated with the
 * default {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @returns The default {@link Firestore} instance of the default app.
 */
export function getFirestore(): Firestore;
/**
 * Returns the existing default {@link Firestore} instance that is associated with the
 * provided {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance that the returned {@link Firestore}
 * instance is associated with.
 * @returns The default {@link Firestore} instance of the provided app.
 */
export function getFirestore(app: FirebaseApp): Firestore;
/**
 * Returns the existing named {@link Firestore} instance that is associated with the
 * default {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param databaseId - The name of the database.
 * @returns The named {@link Firestore} instance of the default app.
 * @beta
 */
export function getFirestore(databaseId: string): Firestore;
/**
 * Returns the existing named {@link Firestore} instance that is associated with the
 * provided {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance that the returned {@link Firestore}
 * instance is associated with.
 * @param databaseId - The name of the database.
 * @returns The named {@link Firestore} instance of the provided app.
 * @beta
 */
export function getFirestore(app: FirebaseApp, databaseId: string): Firestore;
export function getFirestore(
  appOrDatabaseId?: FirebaseApp | string,
  optionalDatabaseId?: string
): Firestore {
  const app: FirebaseApp =
    typeof appOrDatabaseId === 'object' ? appOrDatabaseId : getApp();
  const databaseId =
    typeof appOrDatabaseId === 'string'
      ? appOrDatabaseId
      : optionalDatabaseId || DEFAULT_DATABASE_NAME;
  const db = _getProvider(app, 'firestore').getImmediate({
    identifier: databaseId
  }) as Firestore;
  if (!db._initialized) {
    const emulator = getDefaultEmulatorHostnameAndPort('firestore');
    if (emulator) {
      connectFirestoreEmulator(db, ...emulator);
    }
  }
  return db;
}

/**
 * @internal
 */
export function ensureFirestoreConfigured(
  firestore: Firestore
): FirestoreClient {
  if (!firestore._firestoreClient) {
    configureFirestore(firestore);
  }
  firestore._firestoreClient!.verifyNotTerminated();
  return firestore._firestoreClient as FirestoreClient;
}

export function configureFirestore(firestore: Firestore): void {
  const settings = firestore._freezeSettings();
  debugAssert(!!settings.host, 'FirestoreSettings.host is not set');
  debugAssert(
    !firestore._firestoreClient,
    'configureFirestore() called multiple times'
  );

  const databaseInfo = makeDatabaseInfo(
    firestore._databaseId,
    firestore._app?.options.appId || '',
    firestore._persistenceKey,
    settings
  );
  firestore._firestoreClient = new FirestoreClient(
    firestore._authCredentials,
    firestore._appCheckCredentials,
    firestore._queue,
    databaseInfo
  );
  if (
    settings.localCache?._offlineComponentProvider &&
    settings.localCache?._onlineComponentProvider
  ) {
    firestore._firestoreClient._uninitializedComponentsProvider = {
      _offlineKind: settings.localCache.kind,
      _offline: settings.localCache._offlineComponentProvider,
      _online: settings.localCache._onlineComponentProvider
    };
  }
}

/**
 * Attempts to enable persistent storage, if possible.
 *
 * On failure, `enableIndexedDbPersistence()` will reject the promise or
 * throw an exception. There are several reasons why this can fail, which can be
 * identified by the `code` on the error.
 *
 *   * failed-precondition: The app is already open in another browser tab.
 *   * unimplemented: The browser is incompatible with the offline persistence
 *     implementation.
 *
 * Note that even after a failure, the {@link Firestore} instance will remain
 * usable, however offline persistence will be disabled.
 *
 * Note: `enableIndexedDbPersistence()` must be called before any other functions
 * (other than {@link initializeFirestore}, {@link (getFirestore:1)} or
 * {@link clearIndexedDbPersistence}.
 *
 * Persistence cannot be used in a Node.js environment.
 *
 * @param firestore - The {@link Firestore} instance to enable persistence for.
 * @param persistenceSettings - Optional settings object to configure
 * persistence.
 * @returns A `Promise` that represents successfully enabling persistent storage.
 * @deprecated This function will be removed in a future major release. Instead, set
 * `FirestoreSettings.localCache` to an instance of `PersistentLocalCache` to
 * turn on IndexedDb cache. Calling this function when `FirestoreSettings.localCache`
 * is already specified will throw an exception.
 */
export function enableIndexedDbPersistence(
  firestore: Firestore,
  persistenceSettings?: PersistenceSettings
): Promise<void> {
  firestore = cast(firestore, Firestore);
  verifyNotInitialized(firestore);

  const client = ensureFirestoreConfigured(firestore);
  if (client._uninitializedComponentsProvider) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'SDK cache is already specified.'
    );
  }

  logWarn(
    'enableIndexedDbPersistence() will be deprecated in the future, ' +
      'you can use `FirestoreSettings.cache` instead.'
  );
  const settings = firestore._freezeSettings();

  const onlineComponentProvider = new OnlineComponentProvider();
  const offlineComponentProvider = new IndexedDbOfflineComponentProvider(
    onlineComponentProvider,
    settings.cacheSizeBytes,
    persistenceSettings?.forceOwnership
  );
  return setPersistenceProviders(
    client,
    onlineComponentProvider,
    offlineComponentProvider
  );
}

/**
 * Attempts to enable multi-tab persistent storage, if possible. If enabled
 * across all tabs, all operations share access to local persistence, including
 * shared execution of queries and latency-compensated local document updates
 * across all connected instances.
 *
 * On failure, `enableMultiTabIndexedDbPersistence()` will reject the promise or
 * throw an exception. There are several reasons why this can fail, which can be
 * identified by the `code` on the error.
 *
 *   * failed-precondition: The app is already open in another browser tab and
 *     multi-tab is not enabled.
 *   * unimplemented: The browser is incompatible with the offline persistence
 *     implementation.
 *
 * Note that even after a failure, the {@link Firestore} instance will remain
 * usable, however offline persistence will be disabled.
 *
 * @param firestore - The {@link Firestore} instance to enable persistence for.
 * @returns A `Promise` that represents successfully enabling persistent
 * storage.
 * @deprecated This function will be removed in a future major release. Instead, set
 * `FirestoreSettings.localCache` to an instance of `PersistentLocalCache` to
 * turn on indexeddb cache. Calling this function when `FirestoreSettings.localCache`
 * is already specified will throw an exception.
 */
export function enableMultiTabIndexedDbPersistence(
  firestore: Firestore
): Promise<void> {
  firestore = cast(firestore, Firestore);
  verifyNotInitialized(firestore);

  const client = ensureFirestoreConfigured(firestore);
  if (client._uninitializedComponentsProvider) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'SDK cache is already specified.'
    );
  }

  logWarn(
    'enableMultiTabIndexedDbPersistence() will be deprecated in the future, ' +
      'you can use `FirestoreSettings.cache` instead.'
  );
  const settings = firestore._freezeSettings();

  const onlineComponentProvider = new OnlineComponentProvider();
  const offlineComponentProvider = new MultiTabOfflineComponentProvider(
    onlineComponentProvider,
    settings.cacheSizeBytes
  );
  return setPersistenceProviders(
    client,
    onlineComponentProvider,
    offlineComponentProvider
  );
}

/**
 * Registers both the `OfflineComponentProvider` and `OnlineComponentProvider`.
 * If the operation fails with a recoverable error (see
 * `canRecoverFromIndexedDbError()` below), the returned Promise is rejected
 * but the client remains usable.
 */
function setPersistenceProviders(
  client: FirestoreClient,
  onlineComponentProvider: OnlineComponentProvider,
  offlineComponentProvider: OfflineComponentProvider
): Promise<void> {
  const persistenceResult = new Deferred();
  return client.asyncQueue
    .enqueue(async () => {
      try {
        await setOfflineComponentProvider(client, offlineComponentProvider);
        await setOnlineComponentProvider(client, onlineComponentProvider);
        persistenceResult.resolve();
      } catch (e) {
        const error = e as FirestoreError | DOMException;
        if (!canFallbackFromIndexedDbError(error)) {
          throw error;
        }
        logWarn(
          'Error enabling indexeddb cache. Falling back to ' +
            'memory cache: ' +
            error
        );
        persistenceResult.reject(error);
      }
    })
    .then(() => persistenceResult.promise);
}

/**
 * Clears the persistent storage. This includes pending writes and cached
 * documents.
 *
 * Must be called while the {@link Firestore} instance is not started (after the app is
 * terminated or when the app is first initialized). On startup, this function
 * must be called before other functions (other than {@link
 * initializeFirestore} or {@link (getFirestore:1)})). If the {@link Firestore}
 * instance is still running, the promise will be rejected with the error code
 * of `failed-precondition`.
 *
 * Note: `clearIndexedDbPersistence()` is primarily intended to help write
 * reliable tests that use Cloud Firestore. It uses an efficient mechanism for
 * dropping existing data but does not attempt to securely overwrite or
 * otherwise make cached data unrecoverable. For applications that are sensitive
 * to the disclosure of cached data in between user sessions, we strongly
 * recommend not enabling persistence at all.
 *
 * @param firestore - The {@link Firestore} instance to clear persistence for.
 * @returns A `Promise` that is resolved when the persistent storage is
 * cleared. Otherwise, the promise is rejected with an error.
 */
export function clearIndexedDbPersistence(firestore: Firestore): Promise<void> {
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
      deferred.reject(e as Error | undefined);
    }
  });
  return deferred.promise;
}

/**
 * Waits until all currently pending writes for the active user have been
 * acknowledged by the backend.
 *
 * The returned promise resolves immediately if there are no outstanding writes.
 * Otherwise, the promise waits for all previously issued writes (including
 * those written in a previous app session), but it does not wait for writes
 * that were added after the function is called. If you want to wait for
 * additional writes, call `waitForPendingWrites()` again.
 *
 * Any outstanding `waitForPendingWrites()` promises are rejected during user
 * changes.
 *
 * @returns A `Promise` which resolves when all currently pending writes have been
 * acknowledged by the backend.
 */
export function waitForPendingWrites(firestore: Firestore): Promise<void> {
  firestore = cast(firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientWaitForPendingWrites(client);
}

/**
 * Re-enables use of the network for this {@link Firestore} instance after a prior
 * call to {@link disableNetwork}.
 *
 * @returns A `Promise` that is resolved once the network has been enabled.
 */
export function enableNetwork(firestore: Firestore): Promise<void> {
  firestore = cast(firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientEnableNetwork(client);
}

/**
 * Disables network usage for this instance. It can be re-enabled via {@link
 * enableNetwork}. While the network is disabled, any snapshot listeners,
 * `getDoc()` or `getDocs()` calls will return results from cache, and any write
 * operations will be queued until the network is restored.
 *
 * @returns A `Promise` that is resolved once the network has been disabled.
 */
export function disableNetwork(firestore: Firestore): Promise<void> {
  firestore = cast(firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientDisableNetwork(client);
}

/**
 * Terminates the provided {@link Firestore} instance.
 *
 * After calling `terminate()` only the `clearIndexedDbPersistence()` function
 * may be used. Any other function will throw a `FirestoreError`.
 *
 * To restart after termination, create a new instance of FirebaseFirestore with
 * {@link (getFirestore:1)}.
 *
 * Termination does not cancel any pending writes, and any promises that are
 * awaiting a response from the server will not be resolved. If you have
 * persistence enabled, the next time you start this instance, it will resume
 * sending these writes to the server.
 *
 * Note: Under normal circumstances, calling `terminate()` is not required. This
 * function is useful only when you want to force this instance to release all
 * of its resources or in combination with `clearIndexedDbPersistence()` to
 * ensure that all local state is destroyed between test runs.
 *
 * @returns A `Promise` that is resolved when the instance has been successfully
 * terminated.
 */
export function terminate(firestore: Firestore): Promise<void> {
  _removeServiceInstance(
    firestore.app,
    'firestore',
    firestore._databaseId.database
  );
  return firestore._delete();
}

/**
 * Loads a Firestore bundle into the local cache.
 *
 * @param firestore - The {@link Firestore} instance to load bundles for.
 * @param bundleData - An object representing the bundle to be loaded. Valid
 * objects are `ArrayBuffer`, `ReadableStream<Uint8Array>` or `string`.
 *
 * @returns A `LoadBundleTask` object, which notifies callers with progress
 * updates, and completion or error events. It can be used as a
 * `Promise<LoadBundleTaskProgress>`.
 */
export function loadBundle(
  firestore: Firestore,
  bundleData: ReadableStream<Uint8Array> | ArrayBuffer | string
): LoadBundleTask {
  firestore = cast(firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const resultTask = new LoadBundleTask();
  firestoreClientLoadBundle(
    client,
    firestore._databaseId,
    bundleData,
    resultTask
  );
  return resultTask;
}

/**
 * Reads a Firestore {@link Query} from local cache, identified by the given
 * name.
 *
 * The named queries are packaged  into bundles on the server side (along
 * with resulting documents), and loaded to local cache using `loadBundle`. Once
 * in local cache, use this method to extract a {@link Query} by name.
 *
 * @param firestore - The {@link Firestore} instance to read the query from.
 * @param name - The name of the query.
 * @returns A `Promise` that is resolved with the Query or `null`.
 */
export function namedQuery(
  firestore: Firestore,
  name: string
): Promise<Query | null> {
  firestore = cast(firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientGetNamedQuery(client, name).then(namedQuery => {
    if (!namedQuery) {
      return null;
    }

    return new Query(firestore, null, namedQuery.query);
  });
}

function verifyNotInitialized(firestore: Firestore): void {
  if (firestore._initialized || firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore has already been started and persistence can no longer be ' +
        'enabled. You can only enable persistence before calling any other ' +
        'methods on a Firestore object.'
    );
  }
}
