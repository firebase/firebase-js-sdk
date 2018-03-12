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
import {
  EventManager,
  ListenOptions,
  Observer,
  QueryListener
} from './event_manager';
import { SyncEngine } from './sync_engine';
import { EagerGarbageCollector } from '../local/eager_garbage_collector';
import { GarbageCollector } from '../local/garbage_collector';
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import { LocalStore } from '../local/local_store';
import { MemoryPersistence } from '../local/memory_persistence';
import { NoOpGarbageCollector } from '../local/no_op_garbage_collector';
import { Persistence } from '../local/persistence';
import { Mutation } from '../model/mutation';
import { Platform } from '../platform/platform';
import { Datastore } from '../remote/datastore';
import { RemoteStore } from '../remote/remote_store';
import { JsonProtoSerializer } from '../remote/serializer';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { debug } from '../util/log';
import { Deferred } from '../util/promise';

import { DatabaseId, DatabaseInfo } from './database_info';
import { Query } from './query';
import { Transaction } from './transaction';
import { OnlineState } from './types';
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
  private eventMgr: EventManager;
  private garbageCollector: GarbageCollector;
  private persistence: Persistence;
  private localStore: LocalStore;
  private remoteStore: RemoteStore;
  private syncEngine: SyncEngine;

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
   * @param usePersistence Whether or not to attempt to enable persistence.
   * @returns A deferred result indicating the user-visible result of enabling
   *     offline persistence. This method will reject this if IndexedDB fails to
   *     start for any reason. If usePersistence is false this is
   *     unconditionally resolved.
   */
  start(usePersistence: boolean): Promise<void> {
    // We defer our initialization until we get the current user from
    // setUserChangeListener(). We block the async queue until we got the
    // initial user and the initialization is completed. This will prevent
    // any scheduled work from happening before initialization is completed.
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
    this.credentials.setUserChangeListener(user => {
      if (!initialized) {
        initialized = true;

        this.initializePersistence(usePersistence, persistenceResult)
          .then(() => this.initializeRest(user))
          .then(initializationDone.resolve, initializationDone.reject);
      } else {
        this.asyncQueue.enqueue(() => {
          return this.handleUserChange(user);
        });
      }
    });

    // Block the async queue until initialization is done
    this.asyncQueue.enqueue(() => {
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
   * @param usePersistence indicates whether or not to use offline persistence
   * @param persistenceResult A deferred result indicating the user-visible
   *     result of enabling offline persistence. This method will reject this if
   *     IndexedDB fails to start for any reason. If usePersistence is false
   *     this is unconditionally resolved.
   * @returns a Promise indicating whether or not initialization should
   *     continue, i.e. that one of the persistence implementations actually
   *     succeeded.
   */
  private initializePersistence(
    usePersistence: boolean,
    persistenceResult: Deferred<void>
  ): Promise<void> {
    if (usePersistence) {
      return this.startIndexedDbPersistence()
        .then(persistenceResult.resolve)
        .catch((error: FirestoreError) => {
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

  private canFallback(error: FirestoreError): boolean {
    return (
      error.code === Code.FAILED_PRECONDITION ||
      error.code === Code.UNIMPLEMENTED
    );
  }

  /**
   * Starts IndexedDB-based persistence.
   *
   * @returns A promise indicating success or failure.
   */
  private startIndexedDbPersistence(): Promise<void> {
    // TODO(http://b/33384523): For now we just disable garbage collection
    // when persistence is enabled.
    this.garbageCollector = new NoOpGarbageCollector();
    const storagePrefix = IndexedDbPersistence.buildStoragePrefix(
      this.databaseInfo
    );
    // Opt to use proto3 JSON in case the platform doesn't support Uint8Array.
    const serializer = new JsonProtoSerializer(this.databaseInfo.databaseId, {
      useProto3Json: true
    });
    this.persistence = new IndexedDbPersistence(storagePrefix, serializer);
    return this.persistence.start();
  }

  /**
   * Starts Memory-backed persistence. In practice this cannot fail.
   *
   * @returns A promise that will successfully resolve.
   */
  private startMemoryPersistence(): Promise<void> {
    this.garbageCollector = new EagerGarbageCollector();
    this.persistence = new MemoryPersistence();
    return this.persistence.start();
  }

  /**
   * Initializes the rest of the FirestoreClient, assuming the initial user
   * has been obtained from the credential provider and some persistence
   * implementation is available in this.persistence.
   */
  private initializeRest(user: User): Promise<void> {
    return this.platform
      .loadConnection(this.databaseInfo)
      .then(connection => {
        this.localStore = new LocalStore(
          this.persistence,
          user,
          this.garbageCollector
        );
        const serializer = this.platform.newSerializer(
          this.databaseInfo.databaseId
        );
        const datastore = new Datastore(
          this.asyncQueue,
          connection,
          this.credentials,
          serializer
        );

        const onlineStateChangedHandler = (onlineState: OnlineState) => {
          this.syncEngine.applyOnlineStateChange(onlineState);
          this.eventMgr.applyOnlineStateChange(onlineState);
        };

        this.remoteStore = new RemoteStore(
          this.localStore,
          datastore,
          this.asyncQueue,
          onlineStateChangedHandler
        );

        this.syncEngine = new SyncEngine(
          this.localStore,
          this.remoteStore,
          user
        );

        // Setup wiring between sync engine and remote store
        this.remoteStore.syncEngine = this.syncEngine;

        this.eventMgr = new EventManager(this.syncEngine);

        // NOTE: RemoteStore depends on LocalStore (for persisting stream
        // tokens, refilling mutation queue, etc.) so must be started after
        // LocalStore.
        return this.localStore.start();
      })
      .then(() => {
        return this.remoteStore.start();
      });
  }

  private handleUserChange(user: User): Promise<void> {
    this.asyncQueue.verifyOperationInProgress();

    debug(LOG_TAG, 'User Changed: ' + user.uid);
    return this.syncEngine.handleUserChange(user);
  }

  /** Disables the network connection. Pending operations will not complete. */
  disableNetwork(): Promise<void> {
    return this.asyncQueue.enqueue(() => {
      return this.remoteStore.disableNetwork();
    });
  }

  shutdown(): Promise<void> {
    return this.asyncQueue
      .enqueue(() => {
        this.credentials.removeUserChangeListener();
        return this.remoteStore.shutdown();
      })
      .then(() => {
        // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
        return this.persistence.shutdown();
      });
  }

  listen(
    query: Query,
    observer: Observer<ViewSnapshot>,
    options: ListenOptions
  ): QueryListener {
    const listener = new QueryListener(query, observer, options);
    this.asyncQueue.enqueue(() => {
      return this.eventMgr.listen(listener);
    });
    return listener;
  }

  unlisten(listener: QueryListener): void {
    this.asyncQueue.enqueue(() => {
      return this.eventMgr.unlisten(listener);
    });
  }

  write(mutations: Mutation[]): Promise<void> {
    const deferred = new Deferred<void>();
    this.asyncQueue.enqueue(() => this.syncEngine.write(mutations, deferred));
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
