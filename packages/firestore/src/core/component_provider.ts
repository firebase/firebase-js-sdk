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
  ClientId,
  MemorySharedClientState,
  SharedClientState,
  WebStorageSharedClientState
} from '../local/shared_client_state';
import { LocalStore, MultiTabLocalStore } from '../local/local_store';
import { MultiTabSyncEngine, SyncEngine } from './sync_engine';
import { RemoteStore } from '../remote/remote_store';
import { EventManager } from './event_manager';
import { AsyncQueue } from '../util/async_queue';
import { DatabaseInfo } from './database_info';
import { Platform } from '../platform/platform';
import { Datastore } from '../remote/datastore';
import { User } from '../auth/user';
import { PersistenceSettings } from './firestore_client';
import { debugAssert } from '../util/assert';
import { GarbageCollectionScheduler, Persistence } from '../local/persistence';
import { Code, FirestoreError } from '../util/error';
import { OnlineStateSource } from './types';
import { LruParams, LruScheduler } from '../local/lru_garbage_collector';
import { IndexFreeQueryEngine } from '../local/index_free_query_engine';
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import {
  MemoryEagerDelegate,
  MemoryPersistence,
  MemoryReferenceDelegate
} from '../local/memory_persistence';

/**
 * Initializes and wires up all core components for Firestore. Implementations
 * override `initialize()` to provide all components.
 */
export interface ComponentProvider {
  persistence: Persistence;
  sharedClientState: SharedClientState;
  localStore: LocalStore;
  syncEngine: SyncEngine;
  gcScheduler: GarbageCollectionScheduler | null;
  remoteStore: RemoteStore;
  eventManager: EventManager;

  initialize(
    asyncQueue: AsyncQueue,
    databaseInfo: DatabaseInfo,
    platform: Platform,
    datastore: Datastore,
    clientId: ClientId,
    initialUser: User,
    maxConcurrentLimboResolutions: number,
    persistenceSettings: PersistenceSettings
  ): Promise<void>;

  clearPersistence(databaseId: DatabaseInfo): Promise<void>;
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */
export class IndexedDbComponentProvider implements ComponentProvider {
  persistence!: IndexedDbPersistence;
  sharedClientState!: SharedClientState;
  localStore!: MultiTabLocalStore;
  syncEngine!: MultiTabSyncEngine;
  gcScheduler!: GarbageCollectionScheduler | null;
  remoteStore!: RemoteStore;
  eventManager!: EventManager;

  async initialize(
    asyncQueue: AsyncQueue,
    databaseInfo: DatabaseInfo,
    platform: Platform,
    datastore: Datastore,
    clientId: ClientId,
    initialUser: User,
    maxConcurrentLimboResolutions: number,
    persistenceSettings: PersistenceSettings
  ): Promise<void> {
    debugAssert(
      persistenceSettings.durable,
      'IndexedDbComponentProvider can only provide durable persistence'
    );
    debugAssert(!this.sharedClientState, 'initialize() already called');

    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      databaseInfo
    );

    const serializer = platform.newSerializer(databaseInfo.databaseId);
    if (!WebStorageSharedClientState.isAvailable(platform)) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'IndexedDB persistence is only available on platforms that support LocalStorage.'
      );
    }

    this.sharedClientState = persistenceSettings.synchronizeTabs
      ? new WebStorageSharedClientState(
          asyncQueue,
          platform,
          persistenceKey,
          clientId,
          initialUser
        )
      : new MemorySharedClientState();
    this.sharedClientState.onlineStateHandler = onlineState =>
      this.syncEngine.applyOnlineStateChange(
        onlineState,
        OnlineStateSource.SharedClientState
      );

    this.persistence = await IndexedDbPersistence.createIndexedDbPersistence({
      allowTabSynchronization: persistenceSettings.synchronizeTabs,
      persistenceKey,
      clientId,
      platform,
      queue: asyncQueue,
      serializer,
      lruParams: LruParams.withCacheSize(persistenceSettings.cacheSizeBytes),
      sequenceNumberSyncer: this.sharedClientState
    });

    const garbageCollector = this.persistence.referenceDelegate
      .garbageCollector;

    this.gcScheduler = new LruScheduler(garbageCollector, asyncQueue);
    this.localStore = new MultiTabLocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      initialUser
    );
    this.remoteStore = new RemoteStore(
      this.localStore,
      datastore,
      asyncQueue,
      onlineState =>
        this.syncEngine.applyOnlineStateChange(
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      platform.newConnectivityMonitor()
    );
    this.syncEngine = new MultiTabSyncEngine(
      this.localStore,
      this.remoteStore,
      this.sharedClientState,
      initialUser,
      maxConcurrentLimboResolutions
    );
    this.eventManager = new EventManager(this.syncEngine);

    this.remoteStore.syncEngine = this.syncEngine;
    this.sharedClientState.syncEngine = this.syncEngine;

    await this.sharedClientState.start();
    await this.remoteStore.start();
    await this.localStore.start();

    // NOTE: This will immediately call the listener, so we make sure to
    // set it after localStore / remoteStore are started.
    await this.persistence.setPrimaryStateListener(async isPrimary => {
      await this.syncEngine.applyPrimaryState(isPrimary);
      if (isPrimary && !this.gcScheduler!.started) {
        this.gcScheduler!.start(this.localStore);
      } else if (!isPrimary) {
        this.gcScheduler!.stop();
      }
    });
  }

  clearPersistence(databaseInfo: DatabaseInfo): Promise<void> {
    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      databaseInfo
    );
    return IndexedDbPersistence.clearPersistence(persistenceKey);
  }
}

const MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE =
  'You are using the memory-only build of Firestore. Persistence support is ' +
  'only available via the @firebase/firestore bundle or the ' +
  'firebase-firestore.js build.';

/**
 * Provides all components needed for Firestore with in-memory persistence.
 */
export class MemoryComponentProvider implements ComponentProvider {
  persistence!: Persistence;
  sharedClientState!: SharedClientState;
  localStore!: LocalStore;
  syncEngine!: SyncEngine;
  gcScheduler!: GarbageCollectionScheduler | null;
  remoteStore!: RemoteStore;
  eventManager!: EventManager;

  constructor(
    readonly referenceDelegateFactory: (
      p: MemoryPersistence
    ) => MemoryReferenceDelegate = MemoryEagerDelegate.factory
  ) {}

  async initialize(
    asyncQueue: AsyncQueue,
    databaseInfo: DatabaseInfo,
    platform: Platform,
    datastore: Datastore,
    clientId: ClientId,
    initialUser: User,
    maxConcurrentLimboResolutions: number,
    persistenceSettings: PersistenceSettings
  ): Promise<void> {
    if (persistenceSettings.durable) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
      );
    }

    this.persistence = new MemoryPersistence(this.referenceDelegateFactory);
    this.gcScheduler = null;
    this.sharedClientState = new MemorySharedClientState();
    this.localStore = new LocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      initialUser
    );
    this.remoteStore = new RemoteStore(
      this.localStore,
      datastore,
      asyncQueue,
      onlineState =>
        this.syncEngine.applyOnlineStateChange(
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      platform.newConnectivityMonitor()
    );
    this.syncEngine = new SyncEngine(
      this.localStore,
      this.remoteStore,
      this.sharedClientState,
      initialUser,
      maxConcurrentLimboResolutions
    );
    this.eventManager = new EventManager(this.syncEngine);

    this.remoteStore.syncEngine = this.syncEngine;

    await this.remoteStore.start();
    await this.remoteStore.applyPrimaryState(true);
  }

  clearPersistence(): never {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }
}
