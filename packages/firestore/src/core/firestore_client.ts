/**
 * @license
 * Copyright 2017 Google LLC
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

import { GetOptions } from '@firebase/firestore-types';

import { LoadBundleTask } from '../api/bundle';
import {
  CredentialChangeListener,
  CredentialsProvider
} from '../api/credentials';
import { User } from '../auth/user';
import { LocalStore } from '../local/local_store';
import {
  localStoreConfigureFieldIndexes,
  localStoreDeleteAllFieldIndexes,
  localStoreExecuteQuery,
  localStoreGetNamedQuery,
  localStoreHandleUserChange,
  localStoreReadDocument,
  localStoreSetIndexAutoCreationEnabled
} from '../local/local_store_impl';
import { Persistence } from '../local/persistence';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { FieldIndex } from '../model/field_index';
import { Mutation } from '../model/mutation';
import { toByteStreamReader } from '../platform/byte_stream_reader';
import { newSerializer } from '../platform/serializer';
import { newTextEncoder } from '../platform/text_serializer';
import { ApiClientObjectMap, Value } from '../protos/firestore_proto_api';
import { Datastore, invokeRunAggregationQueryRpc } from '../remote/datastore';
import {
  RemoteStore,
  remoteStoreDisableNetwork,
  remoteStoreEnableNetwork,
  remoteStoreHandleCredentialChange
} from '../remote/remote_store';
import { JsonProtoSerializer } from '../remote/serializer';
import { debugAssert } from '../util/assert';
import { AsyncObserver } from '../util/async_observer';
import { AsyncQueue, wrapInUserErrorIfRecoverable } from '../util/async_queue';
import { BundleReader } from '../util/bundle_reader';
import { newBundleReader } from '../util/bundle_reader_impl';
import { Code, FirestoreError } from '../util/error';
import { logDebug, logWarn } from '../util/log';
import { AutoId } from '../util/misc';
import { Deferred } from '../util/promise';

import { Aggregate } from './aggregate';
import { NamedQuery } from './bundle';
import {
  ComponentConfiguration,
  MemoryOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from './component_provider';
import { DatabaseId, DatabaseInfo } from './database_info';
import {
  addSnapshotsInSyncListener,
  EventManager,
  eventManagerListen,
  eventManagerUnlisten,
  ListenOptions,
  Observer,
  QueryListener,
  removeSnapshotsInSyncListener
} from './event_manager';
import { newQueryForPath, Query } from './query';
import { SyncEngine } from './sync_engine';
import {
  syncEngineListen,
  syncEngineLoadBundle,
  syncEngineRegisterPendingWritesCallback,
  syncEngineUnlisten,
  syncEngineWrite
} from './sync_engine_impl';
import { Transaction } from './transaction';
import { TransactionOptions } from './transaction_options';
import { TransactionRunner } from './transaction_runner';
import { View } from './view';
import { ViewSnapshot } from './view_snapshot';

const LOG_TAG = 'FirestoreClient';
export const MAX_CONCURRENT_LIMBO_RESOLUTIONS = 100;

/** DOMException error code constants. */
const DOM_EXCEPTION_INVALID_STATE = 11;
const DOM_EXCEPTION_ABORTED = 20;
const DOM_EXCEPTION_QUOTA_EXCEEDED = 22;

/**
 * FirestoreClient is a top-level class that constructs and owns all of the //
 * pieces of the client SDK architecture. It is responsible for creating the //
 * async queue that is shared by all of the other components in the system. //
 */
export class FirestoreClient {
  private user = User.UNAUTHENTICATED;
  private readonly clientId = AutoId.newId();
  private authCredentialListener: CredentialChangeListener<User> = () =>
    Promise.resolve();
  private appCheckCredentialListener: (
    appCheckToken: string,
    user: User
  ) => Promise<void> = () => Promise.resolve();
  _uninitializedComponentsProvider?: {
    _offline: OfflineComponentProvider;
    _offlineKind: 'memory' | 'persistent';
    _online: OnlineComponentProvider;
  };

  _offlineComponents?: OfflineComponentProvider;
  _onlineComponents?: OnlineComponentProvider;

  constructor(
    private authCredentials: CredentialsProvider<User>,
    private appCheckCredentials: CredentialsProvider<string>,
    /**
     * Asynchronous queue responsible for all of our internal processing. When
     * we get incoming work from the user (via public API) or the network
     * (incoming GRPC messages), we should always schedule onto this queue.
     * This ensures all of our work is properly serialized (e.g. we don't
     * start processing a new operation while the previous one is waiting for
     * an async I/O to complete).
     */
    public asyncQueue: AsyncQueue,
    private databaseInfo: DatabaseInfo
  ) {
    this.authCredentials.start(asyncQueue, async user => {
      logDebug(LOG_TAG, 'Received user=', user.uid);
      await this.authCredentialListener(user);
      this.user = user;
    });
    this.appCheckCredentials.start(asyncQueue, newAppCheckToken => {
      logDebug(LOG_TAG, 'Received new app check token=', newAppCheckToken);
      return this.appCheckCredentialListener(newAppCheckToken, this.user);
    });
  }

  async getConfiguration(): Promise<ComponentConfiguration> {
    return {
      asyncQueue: this.asyncQueue,
      databaseInfo: this.databaseInfo,
      clientId: this.clientId,
      authCredentials: this.authCredentials,
      appCheckCredentials: this.appCheckCredentials,
      initialUser: this.user,
      maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS
    };
  }

  setCredentialChangeListener(listener: (user: User) => Promise<void>): void {
    this.authCredentialListener = listener;
  }

  setAppCheckTokenChangeListener(
    listener: (appCheckToken: string, user: User) => Promise<void>
  ): void {
    this.appCheckCredentialListener = listener;
  }

  /**
   * Checks that the client has not been terminated. Ensures that other methods on //
   * this class cannot be called after the client is terminated. //
   */
  verifyNotTerminated(): void {
    if (this.asyncQueue.isShuttingDown) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'The client has already been terminated.'
      );
    }
  }

  terminate(): Promise<void> {
    this.asyncQueue.enterRestrictedMode();
    const deferred = new Deferred();
    this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async () => {
      try {
        if (this._onlineComponents) {
          await this._onlineComponents.terminate();
        }
        if (this._offlineComponents) {
          await this._offlineComponents.terminate();
        }

        // The credentials provider must be terminated after shutting down the
        // RemoteStore as it will prevent the RemoteStore from retrieving auth
        // tokens.
        this.authCredentials.shutdown();
        this.appCheckCredentials.shutdown();
        deferred.resolve();
      } catch (e) {
        const firestoreError = wrapInUserErrorIfRecoverable(
          e as Error,
          `Failed to shutdown persistence`
        );
        deferred.reject(firestoreError);
      }
    });
    return deferred.promise;
  }
}

export async function setOfflineComponentProvider(
  client: FirestoreClient,
  offlineComponentProvider: OfflineComponentProvider
): Promise<void> {
  client.asyncQueue.verifyOperationInProgress();

  logDebug(LOG_TAG, 'Initializing OfflineComponentProvider');
  const configuration = await client.getConfiguration();
  await offlineComponentProvider.initialize(configuration);

  let currentUser = configuration.initialUser;
  client.setCredentialChangeListener(async user => {
    if (!currentUser.isEqual(user)) {
      await localStoreHandleUserChange(
        offlineComponentProvider.localStore,
        user
      );
      currentUser = user;
    }
  });

  // When a user calls clearPersistence() in one client, all other clients
  // need to be terminated to allow the delete to succeed.
  offlineComponentProvider.persistence.setDatabaseDeletedListener(() =>
    client.terminate()
  );

  client._offlineComponents = offlineComponentProvider;
}

export async function setOnlineComponentProvider(
  client: FirestoreClient,
  onlineComponentProvider: OnlineComponentProvider
): Promise<void> {
  client.asyncQueue.verifyOperationInProgress();

  const offlineComponentProvider = await ensureOfflineComponents(client);

  logDebug(LOG_TAG, 'Initializing OnlineComponentProvider');
  const configuration = await client.getConfiguration();
  await onlineComponentProvider.initialize(
    offlineComponentProvider,
    configuration
  );
  // The CredentialChangeListener of the online component provider takes
  // precedence over the offline component provider.
  client.setCredentialChangeListener(user =>
    remoteStoreHandleCredentialChange(onlineComponentProvider.remoteStore, user)
  );
  client.setAppCheckTokenChangeListener((_, user) =>
    remoteStoreHandleCredentialChange(onlineComponentProvider.remoteStore, user)
  );
  client._onlineComponents = onlineComponentProvider;
}

/**
 * Decides whether the provided error allows us to gracefully disable
 * persistence (as opposed to crashing the client).
 */
export function canFallbackFromIndexedDbError(
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

async function ensureOfflineComponents(
  client: FirestoreClient
): Promise<OfflineComponentProvider> {
  if (!client._offlineComponents) {
    if (client._uninitializedComponentsProvider) {
      logDebug(LOG_TAG, 'Using user provided OfflineComponentProvider');
      try {
        await setOfflineComponentProvider(
          client,
          client._uninitializedComponentsProvider._offline
        );
      } catch (e) {
        const error = e as FirestoreError | DOMException;
        if (!canFallbackFromIndexedDbError(error)) {
          throw error;
        }
        logWarn(
          'Error using user provided cache. Falling back to ' +
            'memory cache: ' +
            error
        );
        await setOfflineComponentProvider(
          client,
          new MemoryOfflineComponentProvider()
        );
      }
    } else {
      logDebug(LOG_TAG, 'Using default OfflineComponentProvider');
      await setOfflineComponentProvider(
        client,
        new MemoryOfflineComponentProvider()
      );
    }
  }

  return client._offlineComponents!;
}

async function ensureOnlineComponents(
  client: FirestoreClient
): Promise<OnlineComponentProvider> {
  if (!client._onlineComponents) {
    if (client._uninitializedComponentsProvider) {
      logDebug(LOG_TAG, 'Using user provided OnlineComponentProvider');
      await setOnlineComponentProvider(
        client,
        client._uninitializedComponentsProvider._online
      );
    } else {
      logDebug(LOG_TAG, 'Using default OnlineComponentProvider');
      await setOnlineComponentProvider(client, new OnlineComponentProvider());
    }
  }

  return client._onlineComponents!;
}

function getPersistence(client: FirestoreClient): Promise<Persistence> {
  return ensureOfflineComponents(client).then(c => c.persistence);
}

export function getLocalStore(client: FirestoreClient): Promise<LocalStore> {
  return ensureOfflineComponents(client).then(c => c.localStore);
}

function getRemoteStore(client: FirestoreClient): Promise<RemoteStore> {
  return ensureOnlineComponents(client).then(c => c.remoteStore);
}

export function getSyncEngine(client: FirestoreClient): Promise<SyncEngine> {
  return ensureOnlineComponents(client).then(c => c.syncEngine);
}

function getDatastore(client: FirestoreClient): Promise<Datastore> {
  return ensureOnlineComponents(client).then(c => c.datastore);
}

export async function getEventManager(
  client: FirestoreClient
): Promise<EventManager> {
  const onlineComponentProvider = await ensureOnlineComponents(client);
  const eventManager = onlineComponentProvider.eventManager;
  eventManager.onListen = syncEngineListen.bind(
    null,
    onlineComponentProvider.syncEngine
  );
  eventManager.onUnlisten = syncEngineUnlisten.bind(
    null,
    onlineComponentProvider.syncEngine
  );
  return eventManager;
}

/** Enables the network connection and re-enqueues all pending operations. */
export function firestoreClientEnableNetwork(
  client: FirestoreClient
): Promise<void> {
  return client.asyncQueue.enqueue(async () => {
    const persistence = await getPersistence(client);
    const remoteStore = await getRemoteStore(client);
    persistence.setNetworkEnabled(true);
    return remoteStoreEnableNetwork(remoteStore);
  });
}

/** Disables the network connection. Pending operations will not complete. */
export function firestoreClientDisableNetwork(
  client: FirestoreClient
): Promise<void> {
  return client.asyncQueue.enqueue(async () => {
    const persistence = await getPersistence(client);
    const remoteStore = await getRemoteStore(client);
    persistence.setNetworkEnabled(false);
    return remoteStoreDisableNetwork(remoteStore);
  });
}

/**
 * Returns a Promise that resolves when all writes that were pending at the time
 * this method was called received server acknowledgement. An acknowledgement
 * can be either acceptance or rejection.
 */
export function firestoreClientWaitForPendingWrites(
  client: FirestoreClient
): Promise<void> {
  const deferred = new Deferred<void>();
  client.asyncQueue.enqueueAndForget(async () => {
    const syncEngine = await getSyncEngine(client);
    return syncEngineRegisterPendingWritesCallback(syncEngine, deferred);
  });
  return deferred.promise;
}

export function firestoreClientListen(
  client: FirestoreClient,
  query: Query,
  options: ListenOptions,
  observer: Partial<Observer<ViewSnapshot>>
): () => void {
  const wrappedObserver = new AsyncObserver(observer);
  const listener = new QueryListener(query, wrappedObserver, options);
  client.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    return eventManagerListen(eventManager, listener);
  });
  return () => {
    wrappedObserver.mute();
    client.asyncQueue.enqueueAndForget(async () => {
      const eventManager = await getEventManager(client);
      return eventManagerUnlisten(eventManager, listener);
    });
  };
}

export function firestoreClientGetDocumentFromLocalCache(
  client: FirestoreClient,
  docKey: DocumentKey
): Promise<Document | null> {
  const deferred = new Deferred<Document | null>();
  client.asyncQueue.enqueueAndForget(async () => {
    const localStore = await getLocalStore(client);
    return readDocumentFromCache(localStore, docKey, deferred);
  });
  return deferred.promise;
}

export function firestoreClientGetDocumentViaSnapshotListener(
  client: FirestoreClient,
  key: DocumentKey,
  options: GetOptions = {}
): Promise<ViewSnapshot> {
  const deferred = new Deferred<ViewSnapshot>();
  client.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    return readDocumentViaSnapshotListener(
      eventManager,
      client.asyncQueue,
      key,
      options,
      deferred
    );
  });
  return deferred.promise;
}

export function firestoreClientGetDocumentsFromLocalCache(
  client: FirestoreClient,
  query: Query
): Promise<ViewSnapshot> {
  const deferred = new Deferred<ViewSnapshot>();
  client.asyncQueue.enqueueAndForget(async () => {
    const localStore = await getLocalStore(client);
    return executeQueryFromCache(localStore, query, deferred);
  });
  return deferred.promise;
}

export function firestoreClientGetDocumentsViaSnapshotListener(
  client: FirestoreClient,
  query: Query,
  options: GetOptions = {}
): Promise<ViewSnapshot> {
  const deferred = new Deferred<ViewSnapshot>();
  client.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    return executeQueryViaSnapshotListener(
      eventManager,
      client.asyncQueue,
      query,
      options,
      deferred
    );
  });
  return deferred.promise;
}

export function firestoreClientRunAggregateQuery(
  client: FirestoreClient,
  query: Query,
  aggregates: Aggregate[]
): Promise<ApiClientObjectMap<Value>> {
  const deferred = new Deferred<ApiClientObjectMap<Value>>();

  client.asyncQueue.enqueueAndForget(async () => {
    // Implement and call executeAggregateQueryViaSnapshotListener, similar
    // to the implementation in firestoreClientGetDocumentsViaSnapshotListener
    // above
    try {
      // TODO(b/277628384): check `canUseNetwork()` and handle multi-tab.
      const datastore = await getDatastore(client);
      deferred.resolve(
        invokeRunAggregationQueryRpc(datastore, query, aggregates)
      );
    } catch (e) {
      deferred.reject(e as Error);
    }
  });
  return deferred.promise;
}

export function firestoreClientWrite(
  client: FirestoreClient,
  mutations: Mutation[]
): Promise<void> {
  const deferred = new Deferred<void>();
  client.asyncQueue.enqueueAndForget(async () => {
    const syncEngine = await getSyncEngine(client);
    return syncEngineWrite(syncEngine, mutations, deferred);
  });
  return deferred.promise;
}

export function firestoreClientAddSnapshotsInSyncListener(
  client: FirestoreClient,
  observer: Partial<Observer<void>>
): () => void {
  const wrappedObserver = new AsyncObserver(observer);
  client.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    return addSnapshotsInSyncListener(eventManager, wrappedObserver);
  });
  return () => {
    wrappedObserver.mute();
    client.asyncQueue.enqueueAndForget(async () => {
      const eventManager = await getEventManager(client);
      return removeSnapshotsInSyncListener(eventManager, wrappedObserver);
    });
  };
}

/**
 * Takes an updateFunction in which a set of reads and writes can be performed
 * atomically. In the updateFunction, the client can read and write values
 * using the supplied transaction object. After the updateFunction, all
 * changes will be committed. If a retryable error occurs (ex: some other
 * client has changed any of the data referenced), then the updateFunction
 * will be called again after a backoff. If the updateFunction still fails
 * after all retries, then the transaction will be rejected.
 *
 * The transaction object passed to the updateFunction contains methods for
 * accessing documents and collections. Unlike other datastore access, data
 * accessed with the transaction will not reflect local changes that have not
 * been committed. For this reason, it is required that all reads are
 * performed before any writes. Transactions must be performed while online.
 */
export function firestoreClientTransaction<T>(
  client: FirestoreClient,
  updateFunction: (transaction: Transaction) => Promise<T>,
  options: TransactionOptions
): Promise<T> {
  const deferred = new Deferred<T>();
  client.asyncQueue.enqueueAndForget(async () => {
    const datastore = await getDatastore(client);
    new TransactionRunner<T>(
      client.asyncQueue,
      datastore,
      options,
      updateFunction,
      deferred
    ).run();
  });
  return deferred.promise;
}

async function readDocumentFromCache(
  localStore: LocalStore,
  docKey: DocumentKey,
  result: Deferred<Document | null>
): Promise<void> {
  try {
    const document = await localStoreReadDocument(localStore, docKey);
    if (document.isFoundDocument()) {
      result.resolve(document);
    } else if (document.isNoDocument()) {
      result.resolve(null);
    } else {
      result.reject(
        new FirestoreError(
          Code.UNAVAILABLE,
          'Failed to get document from cache. (However, this document may ' +
            "exist on the server. Run again without setting 'source' in " +
            'the GetOptions to attempt to retrieve the document from the ' +
            'server.)'
        )
      );
    }
  } catch (e) {
    const firestoreError = wrapInUserErrorIfRecoverable(
      e as Error,
      `Failed to get document '${docKey} from cache`
    );
    result.reject(firestoreError);
  }
}

/**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */
function readDocumentViaSnapshotListener(
  eventManager: EventManager,
  asyncQueue: AsyncQueue,
  key: DocumentKey,
  options: GetOptions,
  result: Deferred<ViewSnapshot>
): Promise<void> {
  const wrappedObserver = new AsyncObserver({
    next: (snap: ViewSnapshot) => {
      // Remove query first before passing event to user to avoid
      // user actions affecting the now stale query.
      asyncQueue.enqueueAndForget(() =>
        eventManagerUnlisten(eventManager, listener)
      );

      const exists = snap.docs.has(key);
      if (!exists && snap.fromCache) {
        // TODO(dimond): If we're online and the document doesn't
        // exist then we resolve with a doc.exists set to false. If
        // we're offline however, we reject the Promise in this
        // case. Two options: 1) Cache the negative response from
        // the server so we can deliver that even when you're
        // offline 2) Actually reject the Promise in the online case
        // if the document doesn't exist.
        result.reject(
          new FirestoreError(
            Code.UNAVAILABLE,
            'Failed to get document because the client is offline.'
          )
        );
      } else if (
        exists &&
        snap.fromCache &&
        options &&
        options.source === 'server'
      ) {
        result.reject(
          new FirestoreError(
            Code.UNAVAILABLE,
            'Failed to get document from server. (However, this ' +
              'document does exist in the local cache. Run again ' +
              'without setting source to "server" to ' +
              'retrieve the cached document.)'
          )
        );
      } else {
        debugAssert(
          snap.docs.size <= 1,
          'Expected zero or a single result on a document-only query'
        );
        result.resolve(snap);
      }
    },
    error: e => result.reject(e)
  });

  const listener = new QueryListener(
    newQueryForPath(key.path),
    wrappedObserver,
    {
      includeMetadataChanges: true,
      waitForSyncWhenOnline: true
    }
  );
  return eventManagerListen(eventManager, listener);
}

async function executeQueryFromCache(
  localStore: LocalStore,
  query: Query,
  result: Deferred<ViewSnapshot>
): Promise<void> {
  try {
    const queryResult = await localStoreExecuteQuery(
      localStore,
      query,
      /* usePreviousResults= */ true
    );
    const view = new View(query, queryResult.remoteKeys);
    const viewDocChanges = view.computeDocChanges(queryResult.documents);
    const viewChange = view.applyChanges(
      viewDocChanges,
      /* updateLimboDocuments= */ false
    );
    result.resolve(viewChange.snapshot!);
  } catch (e) {
    const firestoreError = wrapInUserErrorIfRecoverable(
      e as Error,
      `Failed to execute query '${query} against cache`
    );
    result.reject(firestoreError);
  }
}

/**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */
function executeQueryViaSnapshotListener(
  eventManager: EventManager,
  asyncQueue: AsyncQueue,
  query: Query,
  options: GetOptions,
  result: Deferred<ViewSnapshot>
): Promise<void> {
  const wrappedObserver = new AsyncObserver<ViewSnapshot>({
    next: snapshot => {
      // Remove query first before passing event to user to avoid
      // user actions affecting the now stale query.
      asyncQueue.enqueueAndForget(() =>
        eventManagerUnlisten(eventManager, listener)
      );

      if (snapshot.fromCache && options.source === 'server') {
        result.reject(
          new FirestoreError(
            Code.UNAVAILABLE,
            'Failed to get documents from server. (However, these ' +
              'documents may exist in the local cache. Run again ' +
              'without setting source to "server" to ' +
              'retrieve the cached documents.)'
          )
        );
      } else {
        result.resolve(snapshot);
      }
    },
    error: e => result.reject(e)
  });

  const listener = new QueryListener(query, wrappedObserver, {
    includeMetadataChanges: true,
    waitForSyncWhenOnline: true
  });
  return eventManagerListen(eventManager, listener);
}

export function firestoreClientLoadBundle(
  client: FirestoreClient,
  databaseId: DatabaseId,
  data: ReadableStream<Uint8Array> | ArrayBuffer | string,
  resultTask: LoadBundleTask
): void {
  const reader = createBundleReader(data, newSerializer(databaseId));
  client.asyncQueue.enqueueAndForget(async () => {
    syncEngineLoadBundle(await getSyncEngine(client), reader, resultTask);
  });
}

export function firestoreClientGetNamedQuery(
  client: FirestoreClient,
  queryName: string
): Promise<NamedQuery | undefined> {
  return client.asyncQueue.enqueue(async () =>
    localStoreGetNamedQuery(await getLocalStore(client), queryName)
  );
}

function createBundleReader(
  data: ReadableStream<Uint8Array> | ArrayBuffer | string,
  serializer: JsonProtoSerializer
): BundleReader {
  let content: ReadableStream<Uint8Array> | ArrayBuffer;
  if (typeof data === 'string') {
    content = newTextEncoder().encode(data);
  } else {
    content = data;
  }
  return newBundleReader(toByteStreamReader(content), serializer);
}

export function firestoreClientSetIndexConfiguration(
  client: FirestoreClient,
  indexes: FieldIndex[]
): Promise<void> {
  return client.asyncQueue.enqueue(async () => {
    return localStoreConfigureFieldIndexes(
      await getLocalStore(client),
      indexes
    );
  });
}

export function firestoreClientSetPersistentCacheIndexAutoCreationEnabled(
  client: FirestoreClient,
  isEnabled: boolean
): Promise<void> {
  return client.asyncQueue.enqueue(async () => {
    return localStoreSetIndexAutoCreationEnabled(
      await getLocalStore(client),
      isEnabled
    );
  });
}

export function firestoreClientDeleteAllFieldIndexes(
  client: FirestoreClient
): Promise<void> {
  return client.asyncQueue.enqueue(async () => {
    return localStoreDeleteAllFieldIndexes(await getLocalStore(client));
  });
}
