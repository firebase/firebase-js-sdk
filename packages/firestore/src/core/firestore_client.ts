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

import {
  CredentialChangeListener,
  CredentialsProvider
} from '../api/credentials';
import { User } from '../auth/user';
import {
  executeQuery,
  handleUserChange,
  LocalStore,
  readLocalDocument
} from '../local/local_store';
import { Document, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import {
  RemoteStore,
  remoteStoreDisableNetwork,
  remoteStoreEnableNetwork,
  remoteStoreHandleCredentialChange
} from '../remote/remote_store';
import { AsyncQueue, wrapInUserErrorIfRecoverable } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { Deferred } from '../util/promise';
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
import {
  registerPendingWritesCallback,
  SyncEngine,
  syncEngineListen,
  syncEngineUnlisten,
  syncEngineWrite
} from './sync_engine';
import { View } from './view';
import { DatabaseInfo } from './database_info';
import { newQueryForPath, Query } from './query';
import { Transaction } from './transaction';
import { ViewSnapshot } from './view_snapshot';
import {
  ComponentConfiguration,
  MemoryOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from './component_provider';
import { AsyncObserver } from '../util/async_observer';
import { debugAssert } from '../util/assert';
import { TransactionRunner } from './transaction_runner';
import { logDebug } from '../util/log';
import { AutoId } from '../util/misc';
import { Persistence } from '../local/persistence';
import { Datastore } from '../remote/datastore';

const LOG_TAG = 'FirestoreClient';
export const MAX_CONCURRENT_LIMBO_RESOLUTIONS = 100;

/**
 * FirestoreClient is a top-level class that constructs and owns all of the
 * pieces of the client SDK architecture. It is responsible for creating the
 * async queue that is shared by all of the other components in the system.
 */
export class FirestoreClient {
  private user = User.UNAUTHENTICATED;
  private readonly clientId = AutoId.newId();
  private credentialListener: CredentialChangeListener = () => {};
  private readonly receivedInitialUser = new Deferred<void>();

  offlineComponents?: OfflineComponentProvider;
  onlineComponents?: OnlineComponentProvider;

  constructor(
    private credentials: CredentialsProvider,
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
    this.credentials.setChangeListener(user => {
      logDebug(LOG_TAG, 'Received user=', user.uid);
      if (!this.user.isEqual(user)) {
        this.user = user;
        this.credentialListener(user);
      }
      this.receivedInitialUser.resolve();
    });
  }

  async getConfiguration(): Promise<ComponentConfiguration> {
    await this.receivedInitialUser.promise;

    return {
      asyncQueue: this.asyncQueue,
      databaseInfo: this.databaseInfo,
      clientId: this.clientId,
      credentials: this.credentials,
      initialUser: this.user,
      maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS
    };
  }

  setCredentialChangeListener(listener: (user: User) => void): void {
    this.credentialListener = listener;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.receivedInitialUser.promise.then(() =>
      this.credentialListener(this.user)
    );
  }

  /**
   * Checks that the client has not been terminated. Ensures that other methods on
   * this class cannot be called after the client is terminated.
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
        if (this.onlineComponents) {
          await this.onlineComponents.terminate();
        }
        if (this.offlineComponents) {
          await this.offlineComponents.terminate();
        }

        // `removeChangeListener` must be called after shutting down the
        // RemoteStore as it will prevent the RemoteStore from retrieving
        // auth tokens.
        this.credentials.removeChangeListener();
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
}

export async function setOfflineComponentProvider(
  firestoreClient: FirestoreClient,
  offlineComponentProvider: OfflineComponentProvider
): Promise<void> {
  firestoreClient.asyncQueue.verifyOperationInProgress();

  logDebug(LOG_TAG, 'Initializing OfflineComponentProvider');
  const configuration = await firestoreClient.getConfiguration();
  await offlineComponentProvider.initialize(configuration);

  firestoreClient.setCredentialChangeListener(user =>
    firestoreClient.asyncQueue.enqueueRetryable(async () => {
      await handleUserChange(offlineComponentProvider.localStore, user);
    })
  );

  // When a user calls clearPersistence() in one client, all other clients
  // need to be terminated to allow the delete to succeed.
  offlineComponentProvider.persistence.setDatabaseDeletedListener(() =>
    firestoreClient.terminate()
  );

  firestoreClient.offlineComponents = offlineComponentProvider;
}

export async function setOnlineComponentProvider(
  firestoreClient: FirestoreClient,
  onlineComponentProvider: OnlineComponentProvider
): Promise<void> {
  firestoreClient.asyncQueue.verifyOperationInProgress();

  const offlineComponentProvider = await ensureOfflineComponents(
    firestoreClient
  );

  logDebug(LOG_TAG, 'Initializing OnlineComponentProvider');
  const configuration = await firestoreClient.getConfiguration();
  await onlineComponentProvider.initialize(
    offlineComponentProvider,
    configuration
  );
  // The CredentialChangeListener of the online component provider takes
  // precedence over the offline component provider.
  firestoreClient.setCredentialChangeListener(user =>
    firestoreClient.asyncQueue.enqueueRetryable(() =>
      remoteStoreHandleCredentialChange(
        onlineComponentProvider.remoteStore,
        user
      )
    )
  );
  firestoreClient.onlineComponents = onlineComponentProvider;
}

async function ensureOfflineComponents(
  firestoreClient: FirestoreClient
): Promise<OfflineComponentProvider> {
  if (!firestoreClient.offlineComponents) {
    logDebug(LOG_TAG, 'Using default OfflineComponentProvider');
    await setOfflineComponentProvider(
      firestoreClient,
      new MemoryOfflineComponentProvider()
    );
  }

  return firestoreClient.offlineComponents!;
}

async function ensureOnlineComponents(
  firestoreClient: FirestoreClient
): Promise<OnlineComponentProvider> {
  if (!firestoreClient.onlineComponents) {
    logDebug(LOG_TAG, 'Using default OnlineComponentProvider');
    await setOnlineComponentProvider(
      firestoreClient,
      new OnlineComponentProvider()
    );
  }

  return firestoreClient.onlineComponents!;
}

function getPersistence(
  firestoreClient: FirestoreClient
): Promise<Persistence> {
  return ensureOfflineComponents(firestoreClient).then(c => c.persistence);
}

export function getLocalStore(
  firestoreClient: FirestoreClient
): Promise<LocalStore> {
  return ensureOfflineComponents(firestoreClient).then(c => c.localStore);
}

function getRemoteStore(
  firestoreClient: FirestoreClient
): Promise<RemoteStore> {
  return ensureOnlineComponents(firestoreClient).then(c => c.remoteStore);
}

function getSyncEngine(firestoreClient: FirestoreClient): Promise<SyncEngine> {
  return ensureOnlineComponents(firestoreClient).then(c => c.syncEngine);
}

function getDatastore(firestoreClient: FirestoreClient): Promise<Datastore> {
  return ensureOnlineComponents(firestoreClient).then(c => c.datastore);
}

export async function getEventManager(
  firestoreClient: FirestoreClient
): Promise<EventManager> {
  const onlineComponentProvider = await ensureOnlineComponents(firestoreClient);
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
  firestoreClient: FirestoreClient
): Promise<void> {
  return firestoreClient.asyncQueue.enqueue(async () => {
    const persistence = await getPersistence(firestoreClient);
    const remoteStore = await getRemoteStore(firestoreClient);
    persistence.setNetworkEnabled(true);
    return remoteStoreEnableNetwork(remoteStore);
  });
}

/** Disables the network connection. Pending operations will not complete. */
export function firestoreClientDisableNetwork(
  firestoreClient: FirestoreClient
): Promise<void> {
  return firestoreClient.asyncQueue.enqueue(async () => {
    const persistence = await getPersistence(firestoreClient);
    const remoteStore = await getRemoteStore(firestoreClient);
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
  firestoreClient: FirestoreClient
): Promise<void> {
  const deferred = new Deferred<void>();
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const syncEngine = await getSyncEngine(firestoreClient);
    return registerPendingWritesCallback(syncEngine, deferred);
  });
  return deferred.promise;
}

export function firestoreClientListen(
  firestoreClient: FirestoreClient,
  query: Query,
  options: ListenOptions,
  observer: Partial<Observer<ViewSnapshot>>
): () => void {
  const wrappedObserver = new AsyncObserver(observer);
  const listener = new QueryListener(query, wrappedObserver, options);
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(firestoreClient);
    return eventManagerListen(eventManager, listener);
  });
  return () => {
    wrappedObserver.mute();
    firestoreClient.asyncQueue.enqueueAndForget(async () => {
      const eventManager = await getEventManager(firestoreClient);
      return eventManagerUnlisten(eventManager, listener);
    });
  };
}

export function firestoreClientGetDocumentFromLocalCache(
  firestoreClient: FirestoreClient,
  docKey: DocumentKey
): Promise<Document | null> {
  const deferred = new Deferred<Document | null>();
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const localStore = await getLocalStore(firestoreClient);
    return readDocumentFromCache(localStore, docKey, deferred);
  });
  return deferred.promise;
}

export function firestoreClientGetDocumentViaSnapshotListener(
  firestoreClient: FirestoreClient,
  key: DocumentKey,
  options: GetOptions = {}
): Promise<ViewSnapshot> {
  const deferred = new Deferred<ViewSnapshot>();
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(firestoreClient);
    return readDocumentViaSnapshotListener(
      eventManager,
      firestoreClient.asyncQueue,
      key,
      options,
      deferred
    );
  });
  return deferred.promise;
}

export function firestoreClientGetDocumentsFromLocalCache(
  firestoreClient: FirestoreClient,
  query: Query
): Promise<ViewSnapshot> {
  const deferred = new Deferred<ViewSnapshot>();
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const localStore = await getLocalStore(firestoreClient);
    return executeQueryFromCache(localStore, query, deferred);
  });
  return deferred.promise;
}

export function firestoreClientGetDocumentsViaSnapshotListener(
  firestoreClient: FirestoreClient,
  query: Query,
  options: GetOptions = {}
): Promise<ViewSnapshot> {
  const deferred = new Deferred<ViewSnapshot>();
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(firestoreClient);
    return executeQueryViaSnapshotListener(
      eventManager,
      firestoreClient.asyncQueue,
      query,
      options,
      deferred
    );
  });
  return deferred.promise;
}

export function firestoreClientWrite(
  firestoreClient: FirestoreClient,
  mutations: Mutation[]
): Promise<void> {
  const deferred = new Deferred<void>();
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const syncEngine = await getSyncEngine(firestoreClient);
    return syncEngineWrite(syncEngine, mutations, deferred);
  });
  return deferred.promise;
}

export function firestoreClientAddSnapshotsInSyncListener(
  firestoreClient: FirestoreClient,
  observer: Partial<Observer<void>>
): () => void {
  const wrappedObserver = new AsyncObserver(observer);
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(firestoreClient);
    return addSnapshotsInSyncListener(eventManager, wrappedObserver);
  });
  return () => {
    wrappedObserver.mute();
    firestoreClient.asyncQueue.enqueueAndForget(async () => {
      const eventManager = await getEventManager(firestoreClient);
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
  firestoreClient: FirestoreClient,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T> {
  const deferred = new Deferred<T>();
  firestoreClient.asyncQueue.enqueueAndForget(async () => {
    const datastore = await getDatastore(firestoreClient);
    new TransactionRunner<T>(
      firestoreClient.asyncQueue,
      datastore,
      updateFunction,
      deferred
    ).run();
  });
  return deferred.promise;
}

export async function readDocumentFromCache(
  localStore: LocalStore,
  docKey: DocumentKey,
  result: Deferred<Document | null>
): Promise<void> {
  try {
    const maybeDoc = await readLocalDocument(localStore, docKey);
    if (maybeDoc instanceof Document) {
      result.resolve(maybeDoc);
    } else if (maybeDoc instanceof NoDocument) {
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
      e,
      `Failed to get document '${docKey} from cache`
    );
    result.reject(firestoreError);
  }
}

/**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */
export function readDocumentViaSnapshotListener(
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

export async function executeQueryFromCache(
  localStore: LocalStore,
  query: Query,
  result: Deferred<ViewSnapshot>
): Promise<void> {
  try {
    const queryResult = await executeQuery(
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
      e,
      `Failed to execute query '${query} against cache`
    );
    result.reject(firestoreError);
  }
}

/**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */
export function executeQueryViaSnapshotListener(
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
