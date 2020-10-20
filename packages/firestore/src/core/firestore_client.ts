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

import { CredentialsProvider } from '../api/credentials';
import { User } from '../auth/user';
import {
  getNamedQuery,
  executeQuery,
  LocalStore,
  readLocalDocument
} from '../local/local_store';
import { GarbageCollectionScheduler, Persistence } from '../local/persistence';
import { Document, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import {
  remoteStoreHandleCredentialChange,
  RemoteStore,
  remoteStoreEnableNetwork,
  remoteStoreDisableNetwork,
  remoteStoreShutdown
} from '../remote/remote_store';
import { AsyncQueue, wrapInUserErrorIfRecoverable } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { logDebug, logWarn } from '../util/log';
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
  loadBundle,
  registerPendingWritesCallback,
  SyncEngine,
  syncEngineListen,
  syncEngineUnlisten,
  syncEngineWrite
} from './sync_engine';
import { View } from './view';
import { SharedClientState } from '../local/shared_client_state';
import { AutoId } from '../util/misc';
import { DatabaseId, DatabaseInfo } from './database_info';
import { newQueryForPath, Query } from './query';
import { Transaction } from './transaction';
import { ViewSnapshot } from './view_snapshot';
import {
  MemoryOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from './component_provider';
import { AsyncObserver } from '../util/async_observer';
import { debugAssert } from '../util/assert';
import { TransactionRunner } from './transaction_runner';
import { Datastore } from '../remote/datastore';
import { canFallbackFromIndexedDbError } from '../../exp/src/api/database';
import { BundleReader } from '../util/bundle_reader';
import { LoadBundleTask } from '../api/bundle';
import { newSerializer, newTextEncoder } from '../platform/serializer';
import { toByteStreamReader } from '../platform/byte_stream_reader';
import { NamedQuery } from './bundle';
import { JsonProtoSerializer } from '../remote/serializer';

const LOG_TAG = 'FirestoreClient';
export const MAX_CONCURRENT_LIMBO_RESOLUTIONS = 100;

/**
 * FirestoreClient is a top-level class that constructs and owns all of the
 * pieces of the client SDK architecture. It is responsible for creating the
 * async queue that is shared by all of the other components in the system.
 */
export class FirestoreClient {
  // NOTE: These should technically have '|undefined' in the types, since
  // they're initialized asynchronously rather than in the constructor, but
  // given that all work is done on the async queue and we assert that
  // initialization completes before any other work is queued, we're cheating
  // with the types rather than littering the code with '!' or unnecessary
  // undefined checks.
  private databaseInfo!: DatabaseInfo;
  private eventMgr!: EventManager;
  private persistence!: Persistence;
  private localStore!: LocalStore;
  private datastore!: Datastore;
  private remoteStore!: RemoteStore;
  private syncEngine!: SyncEngine;
  private gcScheduler!: GarbageCollectionScheduler | null;

  // PORTING NOTE: SharedClientState is only used for multi-tab web.
  private sharedClientState!: SharedClientState;

  private readonly clientId = AutoId.newId();

  // We defer our initialization until we get the current user from
  // setChangeListener(). We block the async queue until we got the initial
  // user and the initialization is completed. This will prevent any scheduled
  // work from happening before initialization is completed.
  //
  // If initializationDone resolved then the FirestoreClient is in a usable
  // state.
  private readonly initializationDone = new Deferred<void>();

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
    private asyncQueue: AsyncQueue
  ) {}

  /**
   * Starts up the FirestoreClient, returning only whether or not enabling
   * persistence succeeded.
   *
   * The intent here is to "do the right thing" as far as users are concerned.
   * Namely, in cases where offline persistence is requested and possible,
   * enable it, but otherwise fall back to persistence disabled. For the most
   * part we expect this to succeed one way or the other so we don't expect our
   * users to actually wait on the firestore.enablePersistence Promise since
   * they generally won't care.
   *
   * Of course some users actually do care about whether or not persistence
   * was successfully enabled, so the Promise returned from this method
   * indicates this outcome.
   *
   * This presents a problem though: even before enablePersistence resolves or
   * rejects, users may have made calls to e.g. firestore.collection() which
   * means that the FirestoreClient in there will be available and will be
   * enqueuing actions on the async queue.
   *
   * Meanwhile any failure of an operation on the async queue causes it to
   * panic and reject any further work, on the premise that unhandled errors
   * are fatal.
   *
   * Consequently the fallback is handled internally here in start, and if the
   * fallback succeeds we signal success to the async queue even though the
   * start() itself signals failure.
   *
   * @param databaseInfo The connection information for the current instance.
   * @param offlineComponentProvider Provider that returns all components
   * required for memory-only or IndexedDB persistence.
   * @param onlineComponentProvider Provider that returns all components
   * required for online support.
   * @returns A deferred result indicating the user-visible result of enabling
   *     offline persistence. This method will reject this if IndexedDB fails to
   *     start for any reason. If usePersistence is false this is
   *     unconditionally resolved.
   */
  start(
    databaseInfo: DatabaseInfo,
    offlineComponentProvider: OfflineComponentProvider,
    onlineComponentProvider: OnlineComponentProvider
  ): Promise<void> {
    this.verifyNotTerminated();

    this.databaseInfo = databaseInfo;

    // If usePersistence is true, certain classes of errors while starting are
    // recoverable but only by falling back to persistence disabled.
    //
    // If there's an error in the first case but not in recovery we cannot
    // reject the promise blocking the async queue because this will cause the
    // async queue to panic.
    const persistenceResult = new Deferred<void>();

    let initialized = false;
    this.credentials.setChangeListener(user => {
      if (!initialized) {
        initialized = true;

        logDebug(LOG_TAG, 'Initializing. user=', user.uid);

        return this.initializeComponents(
          offlineComponentProvider,
          onlineComponentProvider,
          user,
          persistenceResult
        ).then(this.initializationDone.resolve, this.initializationDone.reject);
      } else {
        this.asyncQueue.enqueueRetryable(() =>
          remoteStoreHandleCredentialChange(this.remoteStore, user)
        );
      }
    });

    // Block the async queue until initialization is done
    this.asyncQueue.enqueueAndForget(() => this.initializationDone.promise);

    // Return only the result of enabling persistence. Note that this does not
    // need to await the completion of initializationDone because the result of
    // this method should not reflect any other kind of failure to start.
    return persistenceResult.promise;
  }

  /** Enables the network connection and requeues all pending operations. */
  enableNetwork(): Promise<void> {
    this.verifyNotTerminated();
    return this.asyncQueue.enqueue(() => {
      this.persistence.setNetworkEnabled(true);
      return remoteStoreEnableNetwork(this.remoteStore);
    });
  }

  /**
   * Initializes persistent storage, attempting to use IndexedDB if
   * usePersistence is true or memory-only if false.
   *
   * If IndexedDB fails because it's already open in another tab or because the
   * platform can't possibly support our implementation then this method rejects
   * the persistenceResult and falls back on memory-only persistence.
   *
   * @param offlineComponentProvider Provider that returns all components
   * required for memory-only or IndexedDB persistence.
   * @param onlineComponentProvider Provider that returns all components
   * required for online support.
   * @param user The initial user
   * @param persistenceResult A deferred result indicating the user-visible
   *     result of enabling offline persistence. This method will reject this if
   *     IndexedDB fails to start for any reason. If usePersistence is false
   *     this is unconditionally resolved.
   * @returns a Promise indicating whether or not initialization should
   *     continue, i.e. that one of the persistence implementations actually
   *     succeeded.
   */
  private async initializeComponents(
    offlineComponentProvider: OfflineComponentProvider,
    onlineComponentProvider: OnlineComponentProvider,
    user: User,
    persistenceResult: Deferred<void>
  ): Promise<void> {
    try {
      const componentConfiguration = {
        asyncQueue: this.asyncQueue,
        databaseInfo: this.databaseInfo,
        clientId: this.clientId,
        credentials: this.credentials,
        initialUser: user,
        maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS
      };

      await offlineComponentProvider.initialize(componentConfiguration);
      await onlineComponentProvider.initialize(
        offlineComponentProvider,
        componentConfiguration
      );

      this.persistence = offlineComponentProvider.persistence;
      this.sharedClientState = offlineComponentProvider.sharedClientState;
      this.localStore = offlineComponentProvider.localStore;
      this.gcScheduler = offlineComponentProvider.gcScheduler;
      this.datastore = onlineComponentProvider.datastore;
      this.remoteStore = onlineComponentProvider.remoteStore;
      this.syncEngine = onlineComponentProvider.syncEngine;
      this.eventMgr = onlineComponentProvider.eventManager;

      this.eventMgr.onListen = syncEngineListen.bind(null, this.syncEngine);
      this.eventMgr.onUnlisten = syncEngineUnlisten.bind(null, this.syncEngine);

      // When a user calls clearPersistence() in one client, all other clients
      // need to be terminated to allow the delete to succeed.
      this.persistence.setDatabaseDeletedListener(async () => {
        await this.terminate();
      });

      persistenceResult.resolve();
    } catch (error) {
      // Regardless of whether or not the retry succeeds, from an user
      // perspective, offline persistence has failed.
      persistenceResult.reject(error);

      // An unknown failure on the first stage shuts everything down.
      if (!canFallbackFromIndexedDbError(error)) {
        throw error;
      }
      console.warn(
        'Error enabling offline persistence. Falling back to' +
          ' persistence disabled: ' +
          error
      );
      return this.initializeComponents(
        new MemoryOfflineComponentProvider(),
        new OnlineComponentProvider(),
        user,
        persistenceResult
      );
    }
  }

  /**
   * Checks that the client has not been terminated. Ensures that other methods on
   * this class cannot be called after the client is terminated.
   */
  private verifyNotTerminated(): void {
    if (this.asyncQueue.isShuttingDown) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'The client has already been terminated.'
      );
    }
  }

  /** Disables the network connection. Pending operations will not complete. */
  disableNetwork(): Promise<void> {
    this.verifyNotTerminated();
    return this.asyncQueue.enqueue(() => {
      this.persistence.setNetworkEnabled(false);
      return remoteStoreDisableNetwork(this.remoteStore);
    });
  }

  terminate(): Promise<void> {
    this.asyncQueue.enterRestrictedMode();
    const deferred = new Deferred();
    this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async () => {
      try {
        // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
        if (this.gcScheduler) {
          this.gcScheduler.stop();
        }

        await remoteStoreShutdown(this.remoteStore);
        await this.sharedClientState.shutdown();
        await this.persistence.shutdown();

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

  /**
   * Returns a Promise that resolves when all writes that were pending at the time this
   * method was called received server acknowledgement. An acknowledgement can be either acceptance
   * or rejection.
   */
  waitForPendingWrites(): Promise<void> {
    this.verifyNotTerminated();

    const deferred = new Deferred<void>();
    this.asyncQueue.enqueueAndForget(() =>
      registerPendingWritesCallback(this.syncEngine, deferred)
    );
    return deferred.promise;
  }

  listen(
    query: Query,
    options: ListenOptions,
    observer: Partial<Observer<ViewSnapshot>>
  ): () => void {
    this.verifyNotTerminated();
    const wrappedObserver = new AsyncObserver(observer);
    const listener = new QueryListener(query, wrappedObserver, options);
    this.asyncQueue.enqueueAndForget(() =>
      eventManagerListen(this.eventMgr, listener)
    );
    return () => {
      wrappedObserver.mute();
      this.asyncQueue.enqueueAndForget(() =>
        eventManagerUnlisten(this.eventMgr, listener)
      );
    };
  }

  async getDocumentFromLocalCache(
    docKey: DocumentKey
  ): Promise<Document | null> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    const deferred = new Deferred<Document | null>();
    this.asyncQueue.enqueueAndForget(() =>
      readDocumentFromCache(this.localStore, docKey, deferred)
    );
    return deferred.promise;
  }

  async getDocumentViaSnapshotListener(
    key: DocumentKey,
    options: GetOptions = {}
  ): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    const deferred = new Deferred<ViewSnapshot>();
    this.asyncQueue.enqueueAndForget(() =>
      readDocumentViaSnapshotListener(
        this.eventMgr,
        this.asyncQueue,
        key,
        options,
        deferred
      )
    );
    return deferred.promise;
  }

  async getDocumentsFromLocalCache(query: Query): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    const deferred = new Deferred<ViewSnapshot>();
    this.asyncQueue.enqueueAndForget(() =>
      executeQueryFromCache(this.localStore, query, deferred)
    );
    return deferred.promise;
  }

  async getDocumentsViaSnapshotListener(
    query: Query,
    options: GetOptions = {}
  ): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    const deferred = new Deferred<ViewSnapshot>();
    this.asyncQueue.enqueueAndForget(() =>
      executeQueryViaSnapshotListener(
        this.eventMgr,
        this.asyncQueue,
        query,
        options,
        deferred
      )
    );
    return deferred.promise;
  }

  write(mutations: Mutation[]): Promise<void> {
    this.verifyNotTerminated();
    const deferred = new Deferred<void>();
    this.asyncQueue.enqueueAndForget(() =>
      syncEngineWrite(this.syncEngine, mutations, deferred)
    );
    return deferred.promise;
  }

  databaseId(): DatabaseId {
    return this.databaseInfo.databaseId;
  }

  addSnapshotsInSyncListener(observer: Partial<Observer<void>>): () => void {
    this.verifyNotTerminated();
    const wrappedObserver = new AsyncObserver(observer);
    this.asyncQueue.enqueueAndForget(async () =>
      addSnapshotsInSyncListener(this.eventMgr, wrappedObserver)
    );
    return () => {
      wrappedObserver.mute();
      this.asyncQueue.enqueueAndForget(async () =>
        removeSnapshotsInSyncListener(this.eventMgr, wrappedObserver)
      );
    };
  }

  get clientTerminated(): boolean {
    // Technically, the asyncQueue is still running, but only accepting operations
    // related to termination or supposed to be run after termination. It is effectively
    // terminated to the eyes of users.
    return this.asyncQueue.isShuttingDown;
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
  transaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    this.verifyNotTerminated();
    const deferred = new Deferred<T>();
    this.asyncQueue.enqueueAndForget(() => {
      new TransactionRunner<T>(
        this.asyncQueue,
        this.datastore,
        updateFunction,
        deferred
      ).run();
      return Promise.resolve();
    });
    return deferred.promise;
  }

  loadBundle(
    data: ReadableStream<Uint8Array> | ArrayBuffer | string,
    resultTask: LoadBundleTask
  ): void {
    this.verifyNotTerminated();

    const reader = createBundleReader(
      data,
      newSerializer(this.databaseInfo.databaseId)
    );
    this.asyncQueue.enqueueAndForget(async () => {
      loadBundle(this.syncEngine, reader, resultTask);
      return resultTask.catch(e => {
        logWarn(LOG_TAG, `Loading bundle failed with ${e}`);
      });
    });
  }

  getNamedQuery(queryName: string): Promise<NamedQuery | undefined> {
    this.verifyNotTerminated();
    return getNamedQuery(this.localStore, queryName);
  }
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

export function createBundleReader(
  data: ReadableStream<Uint8Array> | ArrayBuffer | string,
  serializer: JsonProtoSerializer
): BundleReader {
  let content: ReadableStream<Uint8Array> | ArrayBuffer;
  if (typeof data === 'string') {
    content = newTextEncoder().encode(data);
  } else {
    content = data;
  }
  return new BundleReader(toByteStreamReader(content), serializer);
}
