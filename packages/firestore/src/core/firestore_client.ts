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
import { LocalStore } from '../local/local_store';
import { GarbageCollectionScheduler, Persistence } from '../local/persistence';
import { Document, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { RemoteStore } from '../remote/remote_store';
import { AsyncQueue, wrapInUserErrorIfRecoverable } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { logDebug } from '../util/log';
import { Deferred } from '../util/promise';
import {
  EventManager,
  ListenOptions,
  Observer,
  QueryListener
} from './event_manager';
import { SyncEngine } from './sync_engine';
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
import { PartialObserver, Unsubscribe } from '../api/observer';
import { AsyncObserver } from '../util/async_observer';
import { debugAssert } from '../util/assert';

const LOG_TAG = 'FirestoreClient';
export const MAX_CONCURRENT_LIMBO_RESOLUTIONS = 100;

/** DOMException error code constants. */
const DOM_EXCEPTION_INVALID_STATE = 11;
const DOM_EXCEPTION_ABORTED = 20;
const DOM_EXCEPTION_QUOTA_EXCEEDED = 22;

export type PersistenceSettings =
  | {
      readonly durable: false;
    }
  | {
      readonly durable: true;
      readonly cacheSizeBytes: number;
      readonly synchronizeTabs: boolean;
      readonly forceOwningTab: boolean;
    };

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
   * @param persistenceSettings Settings object to configure offline
   *     persistence.
   * @returns A deferred result indicating the user-visible result of enabling
   *     offline persistence. This method will reject this if IndexedDB fails to
   *     start for any reason. If usePersistence is false this is
   *     unconditionally resolved.
   */
  start(
    databaseInfo: DatabaseInfo,
    offlineComponentProvider: OfflineComponentProvider,
    onlineComponentProvider: OnlineComponentProvider,
    persistenceSettings: PersistenceSettings
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
          persistenceSettings,
          user,
          persistenceResult
        ).then(this.initializationDone.resolve, this.initializationDone.reject);
      } else {
        this.asyncQueue.enqueueRetryable(() =>
          this.remoteStore.handleCredentialChange(user)
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
      return this.remoteStore.enableNetwork();
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
   * @param persistenceSettings Settings object to configure offline persistence
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
    persistenceSettings: PersistenceSettings,
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
        maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS,
        persistenceSettings
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
      this.remoteStore = onlineComponentProvider.remoteStore;
      this.syncEngine = onlineComponentProvider.syncEngine;
      this.eventMgr = onlineComponentProvider.eventManager;

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
      if (!this.canFallback(error)) {
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
        { durable: false },
        user,
        persistenceResult
      );
    }
  }

  /**
   * Decides whether the provided error allows us to gracefully disable
   * persistence (as opposed to crashing the client).
   */
  private canFallback(error: FirestoreError | DOMException): boolean {
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
      return this.remoteStore.disableNetwork();
    });
  }

  terminate(): Promise<void> {
    return this.asyncQueue.enqueueAndInitiateShutdown(async () => {
      // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
      if (this.gcScheduler) {
        this.gcScheduler.stop();
      }

      await this.remoteStore.shutdown();
      await this.sharedClientState.shutdown();
      await this.persistence.shutdown();

      // `removeChangeListener` must be called after shutting down the
      // RemoteStore as it will prevent the RemoteStore from retrieving
      // auth tokens.
      this.credentials.removeChangeListener();
    });
  }

  /**
   * Returns a Promise that resolves when all writes that were pending at the time this
   * method was called received server acknowledgement. An acknowledgement can be either acceptance
   * or rejection.
   */
  waitForPendingWrites(): Promise<void> {
    this.verifyNotTerminated();

    const deferred = new Deferred<void>();
    this.asyncQueue.enqueueAndForget(() => {
      return this.syncEngine.registerPendingWritesCallback(deferred);
    });
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
    this.asyncQueue.enqueueAndForget(() => this.eventMgr.listen(listener));
    return () => {
      wrappedObserver.mute();
      this.asyncQueue.enqueueAndForget(() => this.eventMgr.unlisten(listener));
    };
  }

  async getDocumentFromLocalCache(
    docKey: DocumentKey
  ): Promise<Document | null> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    return enqueueReadDocumentFromCache(
      this.asyncQueue,
      this.localStore,
      docKey
    );
  }

  async getDocumentViaSnapshotListener(
    key: DocumentKey,
    options?: GetOptions
  ): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    return enqueueReadDocumentViaSnapshotListener(
      this.asyncQueue,
      this.eventMgr,
      key,
      options
    );
  }

  async getDocumentsFromLocalCache(query: Query): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    return enqueueExecuteQueryFromCache(
      this.asyncQueue,
      this.localStore,
      query
    );
  }

  async getDocumentsViaSnapshotListener(
    query: Query,
    options?: GetOptions
  ): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    await this.initializationDone.promise;
    return enqueueExecuteQueryViaSnapshotListener(
      this.asyncQueue,
      this.eventMgr,
      query,
      options
    );
  }

  write(mutations: Mutation[]): Promise<void> {
    this.verifyNotTerminated();
    const deferred = new Deferred<void>();
    this.asyncQueue.enqueueAndForget(() =>
      this.syncEngine.write(mutations, deferred)
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
      this.eventMgr.addSnapshotsInSyncListener(wrappedObserver)
    );
    return () => {
      wrappedObserver.mute();
      this.asyncQueue.enqueueAndForget(async () =>
        this.eventMgr.removeSnapshotsInSyncListener(wrappedObserver)
      );
    };
  }

  get clientTerminated(): boolean {
    // Technically, the asyncQueue is still running, but only accepting operations
    // related to termination or supposed to be run after termination. It is effectively
    // terminated to the eyes of users.
    return this.asyncQueue.isShuttingDown;
  }

  transaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    this.verifyNotTerminated();
    const deferred = new Deferred<T>();
    this.asyncQueue.enqueueAndForget(() => {
      this.syncEngine.runTransaction(this.asyncQueue, updateFunction, deferred);
      return Promise.resolve();
    });
    return deferred.promise;
  }
}

export function enqueueWrite(
  asyncQueue: AsyncQueue,
  syncEngine: SyncEngine,
  mutations: Mutation[]
): Promise<void> {
  const deferred = new Deferred<void>();
  asyncQueue.enqueueAndForget(() => syncEngine.write(mutations, deferred));
  return deferred.promise;
}

export function enqueueNetworkEnabled(
  asyncQueue: AsyncQueue,
  remoteStore: RemoteStore,
  persistence: Persistence,
  enabled: boolean
): Promise<void> {
  return asyncQueue.enqueue(() => {
    persistence.setNetworkEnabled(enabled);
    return enabled ? remoteStore.enableNetwork() : remoteStore.disableNetwork();
  });
}

export function enqueueWaitForPendingWrites(
  asyncQueue: AsyncQueue,
  syncEngine: SyncEngine
): Promise<void> {
  const deferred = new Deferred<void>();
  asyncQueue.enqueueAndForget(() => {
    return syncEngine.registerPendingWritesCallback(deferred);
  });
  return deferred.promise;
}

export function enqueueListen(
  asyncQueue: AsyncQueue,
  eventManger: EventManager,
  query: Query,
  options: ListenOptions,
  observer: PartialObserver<ViewSnapshot>
): Unsubscribe {
  const wrappedObserver = new AsyncObserver(observer);
  const listener = new QueryListener(query, wrappedObserver, options);
  asyncQueue.enqueueAndForget(() => eventManger.listen(listener));
  return () => {
    wrappedObserver.mute();
    asyncQueue.enqueueAndForget(() => eventManger.unlisten(listener));
  };
}

export function enqueueSnapshotsInSyncListen(
  asyncQueue: AsyncQueue,
  eventManager: EventManager,
  observer: PartialObserver<void>
): Unsubscribe {
  const wrappedObserver = new AsyncObserver(observer);
  asyncQueue.enqueueAndForget(async () =>
    eventManager.addSnapshotsInSyncListener(wrappedObserver)
  );
  return () => {
    wrappedObserver.mute();
    asyncQueue.enqueueAndForget(async () =>
      eventManager.removeSnapshotsInSyncListener(wrappedObserver)
    );
  };
}

export async function enqueueReadDocumentFromCache(
  asyncQueue: AsyncQueue,
  localStore: LocalStore,
  docKey: DocumentKey
): Promise<Document | null> {
  const deferred = new Deferred<Document | null>();
  await asyncQueue.enqueue(async () => {
    try {
      const maybeDoc = await localStore.readDocument(docKey);
      if (maybeDoc instanceof Document) {
        deferred.resolve(maybeDoc);
      } else if (maybeDoc instanceof NoDocument) {
        deferred.resolve(null);
      } else {
        deferred.reject(
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
      deferred.reject(firestoreError);
    }
  });
  return deferred.promise;
}

/**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */
export function enqueueReadDocumentViaSnapshotListener(
  asyncQueue: AsyncQueue,
  eventManager: EventManager,
  key: DocumentKey,
  options?: GetOptions
): Promise<ViewSnapshot> {
  const result = new Deferred<ViewSnapshot>();
  const unlisten = enqueueListen(
    asyncQueue,
    eventManager,
    newQueryForPath(key.path),
    {
      includeMetadataChanges: true,
      waitForSyncWhenOnline: true
    },
    {
      next: (snap: ViewSnapshot) => {
        // Remove query first before passing event to user to avoid
        // user actions affecting the now stale query.
        unlisten();

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
              'Failed to get document because the client is ' + 'offline.'
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
    }
  );
  return result.promise;
}

export async function enqueueExecuteQueryFromCache(
  asyncQueue: AsyncQueue,
  localStore: LocalStore,
  query: Query
): Promise<ViewSnapshot> {
  const deferred = new Deferred<ViewSnapshot>();
  await asyncQueue.enqueue(async () => {
    try {
      const queryResult = await localStore.executeQuery(
        query,
        /* usePreviousResults= */ true
      );
      const view = new View(query, queryResult.remoteKeys);
      const viewDocChanges = view.computeDocChanges(queryResult.documents);
      const viewChange = view.applyChanges(
        viewDocChanges,
        /* updateLimboDocuments= */ false
      );
      deferred.resolve(viewChange.snapshot!);
    } catch (e) {
      const firestoreError = wrapInUserErrorIfRecoverable(
        e,
        `Failed to execute query '${query} against cache`
      );
      deferred.reject(firestoreError);
    }
  });
  return deferred.promise;
}

/**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */
export function enqueueExecuteQueryViaSnapshotListener(
  asyncQueue: AsyncQueue,
  eventManager: EventManager,
  query: Query,
  options?: GetOptions
): Promise<ViewSnapshot> {
  const result = new Deferred<ViewSnapshot>();
  const unlisten = enqueueListen(
    asyncQueue,
    eventManager,
    query,
    {
      includeMetadataChanges: true,
      waitForSyncWhenOnline: true
    },
    {
      next: snapshot => {
        // Remove query first before passing event to user to avoid
        // user actions affecting the now stale query.
        unlisten();

        if (snapshot.fromCache && options && options.source === 'server') {
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
    }
  );
  return result.promise;
}
