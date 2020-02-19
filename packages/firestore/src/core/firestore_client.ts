/**
 * @license
 * Copyright 2017 Google Inc.
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

import { CredentialsProvider } from '../api/credentials';
import { User } from '../auth/user';
import { IndexFreeQueryEngine } from '../local/index_free_query_engine';
import { LocalStore } from '../local/local_store';
import { Persistence, PersistenceFactory } from '../local/persistence';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { Platform } from '../platform/platform';
import { Datastore } from '../remote/datastore';
import { RemoteStore } from '../remote/remote_store';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { debug } from '../util/log';
import { Deferred } from '../util/promise';
import {
  EventManager,
  ListenOptions,
  Observer,
  QueryListener
} from './event_manager';
import { SyncEngine } from './sync_engine';
import { View } from './view';

import {
  LruGarbageCollector,
  LruScheduler
} from '../local/lru_garbage_collector';
import { SharedClientState } from '../local/shared_client_state';
import { AutoId } from '../util/misc';
import { DatabaseId, DatabaseInfo } from './database_info';
import { Query } from './query';
import { Transaction } from './transaction';
import { OnlineState, OnlineStateSource } from './types';
import { ViewSnapshot } from './view_snapshot';

const LOG_TAG = 'FirestoreClient';

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
  private eventMgr!: EventManager;
  private persistence!: Persistence;
  private localStore!: LocalStore;
  private remoteStore!: RemoteStore;
  private syncEngine!: SyncEngine;
  // PORTING NOTE: SharedClientState is only used for multi-tab web.
  private sharedClientState!: SharedClientState;

  private lruScheduler?: LruScheduler;

  private readonly clientId = AutoId.newId();

  constructor(
    private platform: Platform,
    private databaseInfo: DatabaseInfo,
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
   * @param persistenceSettings Settings object to configure offline
   *     persistence.
   * @returns A deferred result indicating the user-visible result of enabling
   *     offline persistence. This method will reject this if IndexedDB fails to
   *     start for any reason. If usePersistence is false this is
   *     unconditionally resolved.
   */
  start<T>(
    persistenceFactory: PersistenceFactory<T>,
    settings: T
  ): Promise<void> {
    this.verifyNotTerminated();
    // We defer our initialization until we get the current user from
    // setChangeListener(). We block the async queue until we got the initial
    // user and the initialization is completed. This will prevent any scheduled
    // work from happening before initialization is completed.
    //
    // If initializationDone resolved then the FirestoreClient is in a usable
    // state.
    const initializationDone = new Deferred<void>();

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

        persistenceFactory(
          user,
          this.asyncQueue,
          this.databaseInfo,
          this.platform,
          this.clientId,
          settings
        )
          .then(({ persistence, sharedClientState, garbageCollector }) => {
            this.persistence = persistence;
            this.sharedClientState = sharedClientState;
            return this.initializeRest(user, garbageCollector);
          })
          .then(initializationDone.resolve, initializationDone.reject);
      } else {
        this.asyncQueue.enqueueAndForget(() => {
          return this.handleCredentialChange(user);
        });
      }
    });

    // Block the async queue until initialization is done
    this.asyncQueue.enqueueAndForget(() => {
      return initializationDone.promise;
    });

    // Return only the result of enabling persistence. Note that this does not
    // need to await the completion of initializationDone because the result of
    // this method should not reflect any other kind of failure to start.
    return persistenceResult.promise;
  }

  /** Enables the network connection and requeues all pending operations. */
  enableNetwork(): Promise<void> {
    this.verifyNotTerminated();
    return this.asyncQueue.enqueue(() => {
      return this.syncEngine.enableNetwork();
    });
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

  /**
   * Initializes the rest of the FirestoreClient, assuming the initial user
   * has been obtained from the credential provider and some persistence
   * implementation is available in this.persistence.
   */
  private initializeRest(
    user: User,
    maybeLruGc: LruGarbageCollector | null
  ): Promise<void> {
    debug(LOG_TAG, 'Initializing. user=', user.uid);
    return this.platform
      .loadConnection(this.databaseInfo)
      .then(async connection => {
        const queryEngine = new IndexFreeQueryEngine();
        this.localStore = new LocalStore(this.persistence, queryEngine, user);
        await this.localStore.start();

        if (maybeLruGc) {
          // We're running LRU Garbage collection. Set up the scheduler.
          this.lruScheduler = new LruScheduler(
            maybeLruGc,
            this.asyncQueue,
            this.localStore
          );
        }

        const connectivityMonitor = this.platform.newConnectivityMonitor();
        const serializer = this.platform.newSerializer(
          this.databaseInfo.databaseId
        );
        const datastore = new Datastore(
          this.asyncQueue,
          connection,
          this.credentials,
          serializer
        );

        const remoteStoreOnlineStateChangedHandler = (
          onlineState: OnlineState
        ): void =>
          this.syncEngine.applyOnlineStateChange(
            onlineState,
            OnlineStateSource.RemoteStore
          );
        const sharedClientStateOnlineStateChangedHandler = (
          onlineState: OnlineState
        ): void =>
          this.syncEngine.applyOnlineStateChange(
            onlineState,
            OnlineStateSource.SharedClientState
          );

        this.remoteStore = new RemoteStore(
          this.localStore,
          datastore,
          this.asyncQueue,
          remoteStoreOnlineStateChangedHandler,
          connectivityMonitor
        );

        this.syncEngine = new SyncEngine(
          this.localStore,
          this.remoteStore,
          this.sharedClientState,
          user
        );

        this.sharedClientState.onlineStateHandler = sharedClientStateOnlineStateChangedHandler;

        // Set up wiring between sync engine and other components
        this.remoteStore.syncEngine = this.syncEngine;
        this.sharedClientState.syncEngine = this.syncEngine;

        this.eventMgr = new EventManager(this.syncEngine);

        // PORTING NOTE: LocalStore doesn't need an explicit start() on the Web.
        await this.sharedClientState.start();
        await this.remoteStore.start();

        // NOTE: This will immediately call the listener, so we make sure to
        // set it after localStore / remoteStore are started.
        await this.persistence.setPrimaryStateListener(async isPrimary => {
          await this.syncEngine.applyPrimaryState(isPrimary);
          if (this.lruScheduler) {
            if (isPrimary && !this.lruScheduler.started) {
              this.lruScheduler.start();
            } else if (!isPrimary) {
              this.lruScheduler.stop();
            }
          }
        });

        // When a user calls clearPersistence() in one client, all other clients
        // need to be terminated to allow the delete to succeed.
        await this.persistence.setDatabaseDeletedListener(async () => {
          await this.terminate();
        });
      });
  }

  private handleCredentialChange(user: User): Promise<void> {
    this.asyncQueue.verifyOperationInProgress();

    debug(LOG_TAG, 'Credential Changed. Current user: ' + user.uid);
    return this.syncEngine.handleCredentialChange(user);
  }

  /** Disables the network connection. Pending operations will not complete. */
  disableNetwork(): Promise<void> {
    this.verifyNotTerminated();
    return this.asyncQueue.enqueue(() => {
      return this.syncEngine.disableNetwork();
    });
  }

  terminate(): Promise<void> {
    return this.asyncQueue.enqueueAndInitiateShutdown(async () => {
      // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
      if (this.lruScheduler) {
        this.lruScheduler.stop();
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
    observer: Observer<ViewSnapshot>,
    options: ListenOptions
  ): QueryListener {
    this.verifyNotTerminated();
    const listener = new QueryListener(query, observer, options);
    this.asyncQueue.enqueueAndForget(() => {
      return this.eventMgr.listen(listener);
    });
    return listener;
  }

  unlisten(listener: QueryListener): void {
    // Checks for termination but does not raise error, allowing unlisten after
    // termination to be a no-op.
    if (this.clientTerminated) {
      return;
    }
    this.asyncQueue.enqueueAndForget(() => {
      return this.eventMgr.unlisten(listener);
    });
  }

  getDocumentFromLocalCache(docKey: DocumentKey): Promise<Document | null> {
    this.verifyNotTerminated();
    return this.asyncQueue
      .enqueue(() => {
        return this.localStore.readDocument(docKey);
      })
      .then((maybeDoc: MaybeDocument | null) => {
        if (maybeDoc instanceof Document) {
          return maybeDoc;
        } else if (maybeDoc instanceof NoDocument) {
          return null;
        } else {
          throw new FirestoreError(
            Code.UNAVAILABLE,
            'Failed to get document from cache. (However, this document may ' +
              "exist on the server. Run again without setting 'source' in " +
              'the GetOptions to attempt to retrieve the document from the ' +
              'server.)'
          );
        }
      });
  }

  getDocumentsFromLocalCache(query: Query): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    return this.asyncQueue.enqueue(async () => {
      const queryResult = await this.localStore.executeQuery(
        query,
        /* usePreviousResults= */ true
      );
      const view = new View(query, queryResult.remoteKeys);
      const viewDocChanges = view.computeDocChanges(queryResult.documents);
      return view.applyChanges(
        viewDocChanges,
        /* updateLimboDocuments= */ false
      ).snapshot!;
    });
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

  addSnapshotsInSyncListener(observer: Observer<void>): void {
    this.verifyNotTerminated();
    this.asyncQueue.enqueueAndForget(() => {
      this.eventMgr.addSnapshotsInSyncListener(observer);
      return Promise.resolve();
    });
  }

  removeSnapshotsInSyncListener(observer: Observer<void>): void {
    // Checks for shutdown but does not raise error, allowing remove after
    // shutdown to be a no-op.
    if (this.clientTerminated) {
      return;
    }
    this.eventMgr.removeSnapshotsInSyncListener(observer);
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
