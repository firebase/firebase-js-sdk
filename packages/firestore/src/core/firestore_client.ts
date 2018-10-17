/**
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
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import { LocalStore } from '../local/local_store';
import { MemoryPersistence } from '../local/memory_persistence';
import { Persistence } from '../local/persistence';
import {
  DocumentKeySet,
  documentKeySet,
  DocumentMap
} from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { Platform } from '../platform/platform';
import { Datastore } from '../remote/datastore';
import { RemoteStore } from '../remote/remote_store';
import { JsonProtoSerializer } from '../remote/serializer';
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
import { View, ViewDocumentChanges } from './view';

import { PersistenceSettings } from '../api/database';
import {
  MemorySharedClientState,
  SharedClientState,
  WebStorageSharedClientState
} from '../local/shared_client_state';
import { assert } from '../util/assert';
import { AutoId } from '../util/misc';
import { DatabaseId, DatabaseInfo } from './database_info';
import { Query } from './query';
import { Transaction } from './transaction';
import { OnlineStateSource } from './types';
import { ViewSnapshot } from './view_snapshot';

const LOG_TAG = 'FirestoreClient';

/** The DOMException code for an aborted operation. */
const DOM_EXCEPTION_ABORTED = 20;

/** The DOMException code for quota exceeded. */
const DOM_EXCEPTION_QUOTA_EXCEEDED = 22;

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
  private eventMgr: EventManager;
  private persistence: Persistence;
  private localStore: LocalStore;
  private remoteStore: RemoteStore;
  private syncEngine: SyncEngine;

  private readonly clientId = AutoId.newId();

  // PORTING NOTE: SharedClientState is only used for multi-tab web.
  private sharedClientState: SharedClientState;

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
  start(persistenceSettings: PersistenceSettings): Promise<void> {
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

        this.initializePersistence(persistenceSettings, persistenceResult, user)
          .then(() => this.initializeRest(user))
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
   * @param persistenceSettings Settings object to configure offline persistence
   * @param persistenceResult A deferred result indicating the user-visible
   *     result of enabling offline persistence. This method will reject this if
   *     IndexedDB fails to start for any reason. If usePersistence is false
   *     this is unconditionally resolved.
   * @returns a Promise indicating whether or not initialization should
   *     continue, i.e. that one of the persistence implementations actually
   *     succeeded.
   */
  private initializePersistence(
    persistenceSettings: PersistenceSettings,
    persistenceResult: Deferred<void>,
    user: User
  ): Promise<void> {
    if (persistenceSettings.enabled) {
      return this.startIndexedDbPersistence(user, persistenceSettings)
        .then(persistenceResult.resolve)
        .catch(error => {
          // Regardless of whether or not the retry succeeds, from an user
          // perspective, offline persistence has failed.
          persistenceResult.reject(error);

          // An unknown failure on the first stage shuts everything down.
          if (!this.canFallback(error)) {
            return Promise.reject(error);
          }

          console.warn(
            'Error enabling offline storage. Falling back to' +
              ' storage disabled: ' +
              error
          );
          return this.startMemoryPersistence();
        });
    } else {
      // When usePersistence == false, enabling offline persistence is defined
      // to unconditionally succeed. This allows start() to have the same
      // signature for both cases, despite the fact that the returned promise
      // is only used in the enablePersistence call.
      persistenceResult.resolve();
      return this.startMemoryPersistence();
    }
  }

  /**
   * Decides whether the provided error allows us to gracefully disable
   * persistence (as opposed to crashing the client).
   */
  private canFallback(error: FirestoreError | DOMException): boolean {
    if (error instanceof FirestoreError) {
      return (
        error.code === Code.FAILED_PRECONDITION ||
        error.code === Code.UNIMPLEMENTED
      );
    } else if (
      typeof DOMException !== 'undefined' &&
      error instanceof DOMException
    ) {
      // We fall back to memory persistence if we cannot write the primary
      // lease. This can happen can during a schema migration, or if we run out
      // of quota when we try to write the primary lease.
      // For both the `QuotaExceededError` and the  `AbortError`, it is safe to
      // fall back to memory persistence since all modifications to IndexedDb
      // failed to commit.
      return (
        error.code === DOM_EXCEPTION_QUOTA_EXCEEDED ||
        error.code === DOM_EXCEPTION_ABORTED
      );
    }

    return true;
  }

  /**
   * Starts IndexedDB-based persistence.
   *
   * @returns A promise indicating success or failure.
   */
  private startIndexedDbPersistence(
    user: User,
    settings: PersistenceSettings
  ): Promise<void> {
    assert(
      settings.enabled,
      'Should only start IndexedDb persitence with offline persistence enabled.'
    );

    // TODO(http://b/33384523): For now we just disable garbage collection
    // when persistence is enabled.
    const storagePrefix = IndexedDbPersistence.buildStoragePrefix(
      this.databaseInfo
    );
    // Opt to use proto3 JSON in case the platform doesn't support Uint8Array.
    const serializer = new JsonProtoSerializer(this.databaseInfo.databaseId, {
      useProto3Json: true
    });

    return Promise.resolve().then(async () => {
      if (
        settings.experimentalTabSynchronization &&
        !WebStorageSharedClientState.isAvailable(this.platform)
      ) {
        throw new FirestoreError(
          Code.UNIMPLEMENTED,
          'IndexedDB persistence is only available on platforms that support LocalStorage.'
        );
      }

      if (settings.experimentalTabSynchronization) {
        this.sharedClientState = new WebStorageSharedClientState(
          this.asyncQueue,
          this.platform,
          storagePrefix,
          this.clientId,
          user
        );
        this.persistence = await IndexedDbPersistence.createMultiClientIndexedDbPersistence(
          storagePrefix,
          this.clientId,
          this.platform,
          this.asyncQueue,
          serializer,
          { sequenceNumberSyncer: this.sharedClientState }
        );
      } else {
        this.sharedClientState = new MemorySharedClientState();
        this.persistence = await IndexedDbPersistence.createIndexedDbPersistence(
          storagePrefix,
          this.clientId,
          this.platform,
          this.asyncQueue,
          serializer
        );
      }
    });
  }

  /**
   * Starts Memory-backed persistence. In practice this cannot fail.
   *
   * @returns A promise that will successfully resolve.
   */
  private startMemoryPersistence(): Promise<void> {
    // Opt to use proto3 JSON in case the platform doesn't support Uint8Array.
    const serializer = new JsonProtoSerializer(this.databaseInfo.databaseId, {
      useProto3Json: true
    });
    this.persistence = MemoryPersistence.createEagerPersistence(
      this.clientId,
      serializer
    );
    this.sharedClientState = new MemorySharedClientState();
    return Promise.resolve();
  }

  /**
   * Initializes the rest of the FirestoreClient, assuming the initial user
   * has been obtained from the credential provider and some persistence
   * implementation is available in this.persistence.
   */
  private initializeRest(user: User): Promise<void> {
    debug(LOG_TAG, 'Initializing. user=', user.uid);
    return this.platform
      .loadConnection(this.databaseInfo)
      .then(async connection => {
        this.localStore = new LocalStore(this.persistence, user);
        const serializer = this.platform.newSerializer(
          this.databaseInfo.databaseId
        );
        const datastore = new Datastore(
          this.asyncQueue,
          connection,
          this.credentials,
          serializer
        );

        const remoteStoreOnlineStateChangedHandler = onlineState =>
          this.syncEngine.applyOnlineStateChange(
            onlineState,
            OnlineStateSource.RemoteStore
          );
        const sharedClientStateOnlineStateChangedHandler = onlineState =>
          this.syncEngine.applyOnlineStateChange(
            onlineState,
            OnlineStateSource.SharedClientState
          );

        this.remoteStore = new RemoteStore(
          this.localStore,
          datastore,
          this.asyncQueue,
          remoteStoreOnlineStateChangedHandler
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
        await this.persistence.setPrimaryStateListener(isPrimary =>
          this.syncEngine.applyPrimaryState(isPrimary)
        );
      });
  }

  private handleCredentialChange(user: User): Promise<void> {
    this.asyncQueue.verifyOperationInProgress();

    debug(LOG_TAG, 'Credential Changed. Current user: ' + user.uid);
    return this.syncEngine.handleCredentialChange(user);
  }

  /** Disables the network connection. Pending operations will not complete. */
  disableNetwork(): Promise<void> {
    return this.asyncQueue.enqueue(() => {
      return this.syncEngine.disableNetwork();
    });
  }

  shutdown(options?: {
    purgePersistenceWithDataLoss?: boolean;
  }): Promise<void> {
    return this.asyncQueue.enqueue(async () => {
      // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
      await this.remoteStore.shutdown();
      await this.sharedClientState.shutdown();
      await this.persistence.shutdown(
        options && options.purgePersistenceWithDataLoss
      );

      // `removeChangeListener` must be called after shutting down the
      // RemoteStore as it will prevent the RemoteStore from retrieving
      // auth tokens.
      this.credentials.removeChangeListener();
    });
  }

  listen(
    query: Query,
    observer: Observer<ViewSnapshot>,
    options: ListenOptions
  ): QueryListener {
    const listener = new QueryListener(query, observer, options);
    this.asyncQueue.enqueueAndForget(() => {
      return this.eventMgr.listen(listener);
    });
    return listener;
  }

  unlisten(listener: QueryListener): void {
    this.asyncQueue.enqueueAndForget(() => {
      return this.eventMgr.unlisten(listener);
    });
  }

  getDocumentFromLocalCache(docKey: DocumentKey): Promise<Document | null> {
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
    return this.asyncQueue
      .enqueue(() => {
        return this.localStore.executeQuery(query);
      })
      .then((docs: DocumentMap) => {
        const remoteKeys: DocumentKeySet = documentKeySet();

        const view = new View(query, remoteKeys);
        const viewDocChanges: ViewDocumentChanges = view.computeDocChanges(
          docs
        );
        return view.applyChanges(
          viewDocChanges,
          /* updateLimboDocuments= */ false
        ).snapshot!;
      });
  }

  write(mutations: Mutation[]): Promise<void> {
    const deferred = new Deferred<void>();
    this.asyncQueue.enqueueAndForget(() =>
      this.syncEngine.write(mutations, deferred)
    );
    return deferred.promise;
  }

  databaseId(): DatabaseId {
    return this.databaseInfo.databaseId;
  }

  transaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    // We have to wait for the async queue to be sure syncEngine is initialized.
    return this.asyncQueue
      .enqueue(async () => {})
      .then(() => this.syncEngine.runTransaction(updateFunction));
  }
}
