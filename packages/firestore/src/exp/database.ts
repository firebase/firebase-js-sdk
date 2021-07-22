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
import {
  _getProvider,
  _removeServiceInstance,
  FirebaseApp,
  getApp
} from '@firebase/app-exp';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import {
  IndexedDbOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from '../core/component_provider';
import { DatabaseId } from '../core/database_info';
import {
  FirestoreClient,
  firestoreClientDisableNetwork,
  firestoreClientEnableNetwork,
  firestoreClientGetNamedQuery,
  firestoreClientLoadBundle,
  firestoreClientWaitForPendingWrites,
  setOfflineComponentProvider,
  setOnlineComponentProvider
} from '../core/firestore_client';
import { makeDatabaseInfo } from '../lite/components';
import { FirebaseFirestore as LiteFirestore } from '../lite/database';
import { Query } from '../lite/reference';
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
import { Deferred } from '../util/promise';

import { LoadBundleTask } from './bundle';
import { PersistenceSettings, Settings } from './settings';
export { connectFirestoreEmulator } from '../lite/database';

/** DOMException error code constants. */
const DOM_EXCEPTION_INVALID_STATE = 11;
const DOM_EXCEPTION_ABORTED = 20;
const DOM_EXCEPTION_QUOTA_EXCEEDED = 22;

/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */
export const CACHE_SIZE_UNLIMITED = LRU_COLLECTION_DISABLED;

/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link getFirestore}.
 */
export class FirebaseFirestore extends LiteFirestore {
  type: 'firestore-lite' | 'firestore' = 'firestore';

  readonly _queue: AsyncQueue = newAsyncQueue();
  readonly _persistenceKey: string;

  _firestoreClient: FirestoreClient | undefined;

  /** @hideconstructor */
  constructor(
    databaseIdOrApp: DatabaseId | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    super(databaseIdOrApp, authProvider);
    this._persistenceKey =
      'name' in databaseIdOrApp ? databaseIdOrApp.name : '[DEFAULT]';
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
 * Initializes a new instance of Cloud Firestore with the provided settings.
 * Can only be called before any other function, including
 * {@link getFirestore}. If the custom settings are empty, this function is
 * equivalent to calling {@link getFirestore}.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} with which the `Firestore` instance will
 * be associated.
 * @param settings - A settings object to configure the `Firestore` instance.
 * @returns A newly initialized `Firestore` instance.
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore {
  const provider = _getProvider(app, 'firestore-exp');

  if (provider.isInitialized()) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore can only be initialized once per app.'
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

  return provider.initialize({ options: settings });
}

/**
 * Returns the existing instance of Firestore that is associated with the
 * provided {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance that the returned Firestore
 * instance is associated with.
 * @returns The `Firestore` instance of the provided app.
 */
export function getFirestore(app: FirebaseApp = getApp()): FirebaseFirestore {
  return _getProvider(app, 'firestore-exp').getImmediate() as FirebaseFirestore;
}

/**
 * @internal
 */
export function ensureFirestoreConfigured(
  firestore: FirebaseFirestore
): FirestoreClient {
  if (!firestore._firestoreClient) {
    configureFirestore(firestore);
  }
  firestore._firestoreClient!.verifyNotTerminated();
  return firestore._firestoreClient as FirestoreClient;
}

export function configureFirestore(firestore: FirebaseFirestore): void {
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
    firestore._credentials,
    firestore._queue,
    databaseInfo
  );
}

/**
 * Attempts to enable persistent storage, if possible.
 *
 * Must be called before any other functions (other than
 * {@link initializeFirestore}, {@link getFirestore} or
 * {@link clearIndexedDbPersistence}.
 *
 * If this fails, `enableIndexedDbPersistence()` will reject the promise it
 * returns. Note that even after this failure, the `Firestore` instance will
 * remain usable, however offline persistence will be disabled.
 *
 * There are several reasons why this can fail, which can be identified by
 * the `code` on the error.
 *
 *   * failed-precondition: The app is already open in another browser tab.
 *   * unimplemented: The browser is incompatible with the offline
 *     persistence implementation.
 *
 * @param firestore - The `Firestore` instance to enable persistence for.
 * @param persistenceSettings - Optional settings object to configure
 * persistence.
 * @returns A promise that represents successfully enabling persistent storage.
 */
export function enableIndexedDbPersistence(
  firestore: FirebaseFirestore,
  persistenceSettings?: PersistenceSettings
): Promise<void> {
  firestore = cast(firestore, FirebaseFirestore);
  verifyNotInitialized(firestore);

  const client = ensureFirestoreConfigured(firestore);
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
 * If this fails, `enableMultiTabIndexedDbPersistence()` will reject the promise
 * it returns. Note that even after this failure, the `Firestore` instance will
 * remain usable, however offline persistence will be disabled.
 *
 * There are several reasons why this can fail, which can be identified by
 * the `code` on the error.
 *
 *   * failed-precondition: The app is already open in another browser tab and
 *     multi-tab is not enabled.
 *   * unimplemented: The browser is incompatible with the offline
 *     persistence implementation.
 *
 * @param firestore - The `Firestore` instance to enable persistence for.
 * @returns A promise that represents successfully enabling persistent
 * storage.
 */
export function enableMultiTabIndexedDbPersistence(
  firestore: FirebaseFirestore
): Promise<void> {
  firestore = cast(firestore, FirebaseFirestore);
  verifyNotInitialized(firestore);

  const client = ensureFirestoreConfigured(firestore);
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
        if (!canFallbackFromIndexedDbError(e)) {
          throw e;
        }
        console.warn(
          'Error enabling offline persistence. Falling back to ' +
            'persistence disabled: ' +
            e
        );
        persistenceResult.reject(e);
      }
    })
    .then(() => persistenceResult.promise);
}

/**
 * Decides whether the provided error allows us to gracefully disable
 * persistence (as opposed to crashing the client).
 */
function canFallbackFromIndexedDbError(
  error: FirestoreError | DOMException
): boolean {
  if (error.name === 'FirebaseError') {
    return (
      error.code === Code.FAILED_PRECONDITION ||
      error.code === Code.UNIMPLEMENTED
    );
  } else if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException
  ) {
    // There are a few known circumstances where we can open IndexedDb but
    // trying to read/write will fail (e.g. quota exceeded). For
    // well-understood cases, we attempt to detect these and then gracefully
    // fall back to memory persistence.
    // NOTE: Rather than continue to add to this list, we could decide to
    // always fall back, with the risk that we might accidentally hide errors
    // representing actual SDK bugs.
    return (
      // When the browser is out of quota we could get either quota exceeded
      // or an aborted error depending on whether the error happened during
      // schema migration.
      error.code === DOM_EXCEPTION_QUOTA_EXCEEDED ||
      error.code === DOM_EXCEPTION_ABORTED ||
      // Firefox Private Browsing mode disables IndexedDb and returns
      // INVALID_STATE for any usage.
      error.code === DOM_EXCEPTION_INVALID_STATE
    );
  }

  return true;
}

/**
 * Clears the persistent storage. This includes pending writes and cached
 * documents.
 *
 * Must be called while the `Firestore` instance is not started (after the app is
 * terminated or when the app is first initialized). On startup, this function
 * must be called before other functions (other than {@link
 * initializeFirestore} or {@link getFirestore})). If the `Firestore`
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
 * @param firestore - The `Firestore` instance to clear persistence for.
 * @returns A promise that is resolved when the persistent storage is
 * cleared. Otherwise, the promise is rejected with an error.
 */
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

/**
 * Waits until all currently pending writes for the active user have been
 * acknowledged by the backend.
 *
 * The returned Promise resolves immediately if there are no outstanding writes.
 * Otherwise, the Promise waits for all previously issued writes (including
 * those written in a previous app session), but it does not wait for writes
 * that were added after the function is called. If you want to wait for
 * additional writes, call `waitForPendingWrites()` again.
 *
 * Any outstanding `waitForPendingWrites()` Promises are rejected during user
 * changes.
 *
 * @returns A Promise which resolves when all currently pending writes have been
 * acknowledged by the backend.
 */
export function waitForPendingWrites(
  firestore: FirebaseFirestore
): Promise<void> {
  firestore = cast(firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientWaitForPendingWrites(client);
}

/**
 * Re-enables use of the network for this Firestore instance after a prior
 * call to {@link disableNetwork}.
 *
 * @returns A promise that is resolved once the network has been enabled.
 */
export function enableNetwork(firestore: FirebaseFirestore): Promise<void> {
  firestore = cast(firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientEnableNetwork(client);
}

/**
 * Disables network usage for this instance. It can be re-enabled via {@link
 * enableNetwork}. While the network is disabled, any snapshot listeners,
 * `getDoc()` or `getDocs()` calls will return results from cache, and any write
 * operations will be queued until the network is restored.
 *
 * @returns A promise that is resolved once the network has been disabled.
 */
export function disableNetwork(firestore: FirebaseFirestore): Promise<void> {
  firestore = cast(firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientDisableNetwork(client);
}

/**
 * Terminates the provided Firestore instance.
 *
 * After calling `terminate()` only the `clearIndexedDbPersistence()` function
 * may be used. Any other function will throw a `FirestoreError`.
 *
 * To restart after termination, create a new instance of FirebaseFirestore with
 * {@link getFirestore}.
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
 * @returns A promise that is resolved when the instance has been successfully
 * terminated.
 */
export function terminate(firestore: FirebaseFirestore): Promise<void> {
  _removeServiceInstance(firestore.app, 'firestore-exp');
  return firestore._delete();
}

/**
 * Loads a Firestore bundle into the local cache.
 *
 * @param firestore - The `Firestore` instance to load bundles for for.
 * @param bundleData - An object representing the bundle to be loaded. Valid objects are
 *   `ArrayBuffer`, `ReadableStream<Uint8Array>` or `string`.
 *
 * @returns
 *   A `LoadBundleTask` object, which notifies callers with progress updates, and completion
 *   or error events. It can be used as a `Promise<LoadBundleTaskProgress>`.
 */
export function loadBundle(
  firestore: FirebaseFirestore,
  bundleData: ReadableStream<Uint8Array> | ArrayBuffer | string
): LoadBundleTask {
  firestore = cast(firestore, FirebaseFirestore);
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
 * Reads a Firestore `Query` from local cache, identified by the given name.
 *
 * The named queries are packaged  into bundles on the server side (along
 * with resulting documents), and loaded to local cache using `loadBundle`. Once in local
 * cache, use this method to extract a `Query` by name.
 */
export function namedQuery(
  firestore: FirebaseFirestore,
  name: string
): Promise<Query | null> {
  firestore = cast(firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientGetNamedQuery(client, name).then(namedQuery => {
    if (!namedQuery) {
      return null;
    }

    return new Query(firestore, null, namedQuery.query);
  });
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
