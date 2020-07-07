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

import { CredentialsProvider } from '../api/credentials';
import { User } from '../auth/user';
import { LocalStore } from '../local/local_store';
import { GarbageCollectionScheduler, Persistence } from '../local/persistence';
import { Document, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { newDatastore } from '../remote/datastore';
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
import { Query } from './query';
import { Transaction } from './transaction';
import { ViewSnapshot } from './view_snapshot';
import {
  ComponentProvider,
  MemoryComponentProvider
} from './component_provider';
import { newConnection } from '../platform/connection';
import { newSerializer } from '../platform/serializer';

const LOG_TAG = 'FirestoreClient';
const MAX_CONCURRENT_LIMBO_RESOLUTIONS = 100;

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
   * @param componentProvider Provider that returns all core components.
   * @param persistenceSettings Settings object to configure offline
   *     persistence.
   * @returns A deferred result indicating the user-visible result of enabling
   *     offline persistence. This method will reject this if IndexedDB fails to
   *     start for any reason. If usePersistence is false this is
   *     unconditionally resolved.
   */
  start(
    databaseInfo: DatabaseInfo,
    componentProvider: ComponentProvider,
    persistenceSettings: PersistenceSettings
  ): Promise<void> {
    this.verifyNotTerminated();

    this.databaseInfo = databaseInfo;

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

        logDebug(LOG_TAG, 'Initializing. user=', user.uid);

        return this.initializeComponents(
          componentProvider,
          persistenceSettings,
          user,
          persistenceResult
        ).then(initializationDone.resolve, initializationDone.reject);
      } else {
        this.asyncQueue.enqueueRetryable(() =>
          this.remoteStore.handleCredentialChange(user)
        );
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
   * Initializes persistent storage, attempting to use IndexedDB if
   * usePersistence is true or memory-only if false.
   *
   * If IndexedDB fails because it's already open in another tab or because the
   * platform can't possibly support our implementation then this method rejects
   * the persistenceResult and falls back on memory-only persistence.
   *
   * @param componentProvider The provider that provides all core componennts
   *     for IndexedDB or memory-backed persistence
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
    componentProvider: ComponentProvider,
    persistenceSettings: PersistenceSettings,
    user: User,
    persistenceResult: Deferred<void>
  ): Promise<void> {
    try {
      // TODO(mrschmidt): Ideally, ComponentProvider would also initialize
      // Datastore (without duplicating the initializing logic once per
      // provider).

      const connection = await newConnection(this.databaseInfo);
      const serializer = newSerializer(this.databaseInfo.databaseId);
      const datastore = newDatastore(connection, this.credentials, serializer);

      await componentProvider.initialize({
        asyncQueue: this.asyncQueue,
        databaseInfo: this.databaseInfo,
        datastore,
        clientId: this.clientId,
        initialUser: user,
        maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS,
        persistenceSettings
      });

      this.persistence = componentProvider.persistence;
      this.sharedClientState = componentProvider.sharedClientState;
      this.localStore = componentProvider.localStore;
      this.remoteStore = componentProvider.remoteStore;
      this.syncEngine = componentProvider.syncEngine;
      this.gcScheduler = componentProvider.gcScheduler;
      this.eventMgr = componentProvider.eventManager;

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
        new MemoryComponentProvider(),
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
      return this.syncEngine.disableNetwork();
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
    observer: Observer<ViewSnapshot>,
    options: ListenOptions
  ): QueryListener {
    this.verifyNotTerminated();
    const listener = new QueryListener(query, observer, options);
    this.asyncQueue.enqueueAndForget(() => this.eventMgr.listen(listener));
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

  async getDocumentFromLocalCache(
    docKey: DocumentKey
  ): Promise<Document | null> {
    this.verifyNotTerminated();
    const deferred = new Deferred<Document | null>();
    await this.asyncQueue.enqueue(async () => {
      try {
        const maybeDoc = await this.localStore.readDocument(docKey);
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

  async getDocumentsFromLocalCache(query: Query): Promise<ViewSnapshot> {
    this.verifyNotTerminated();
    const deferred = new Deferred<ViewSnapshot>();
    await this.asyncQueue.enqueue(async () => {
      try {
        const queryResult = await this.localStore.executeQuery(
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
    this.asyncQueue.enqueueAndForget(() => {
      this.eventMgr.removeSnapshotsInSyncListener(observer);
      return Promise.resolve();
    });
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
