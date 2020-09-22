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
import {
  LocalStore,
  newLocalStore,
  synchronizeLastDocumentChangeReadTime
} from '../local/local_store';
import {
  applyActiveTargetsChange,
  applyBatchState,
  applyOnlineStateChange,
  applyPrimaryState,
  applyTargetState,
  getActiveClients,
  syncEngineHandleCredentialChange,
  newSyncEngine,
  SyncEngine,
  ensureWriteCallbacks
} from './sync_engine';
import {
  fillWritePipeline,
  newRemoteStore,
  RemoteStore,
  remoteStoreApplyPrimaryState,
  remoteStoreShutdown
} from '../remote/remote_store';
import { EventManager, newEventManager } from './event_manager';
import { AsyncQueue } from '../util/async_queue';
import { DatabaseId, DatabaseInfo } from './database_info';
import { Datastore, newDatastore } from '../remote/datastore';
import { User } from '../auth/user';
import { PersistenceSettings } from './firestore_client';
import { debugAssert } from '../util/assert';
import { GarbageCollectionScheduler, Persistence } from '../local/persistence';
import { Code, FirestoreError } from '../util/error';
import { OnlineStateSource } from './types';
import { LruParams, LruScheduler } from '../local/lru_garbage_collector';
import { IndexFreeQueryEngine } from '../local/index_free_query_engine';
import {
  indexedDbStoragePrefix,
  IndexedDbPersistence,
  indexedDbClearPersistence
} from '../local/indexeddb_persistence';
import {
  MemoryEagerDelegate,
  MemoryPersistence
} from '../local/memory_persistence';
import { newConnection, newConnectivityMonitor } from '../platform/connection';
import { newSerializer } from '../platform/serializer';
import { getDocument, getWindow } from '../platform/dom';
import { CredentialsProvider } from '../api/credentials';

const MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE =
  'You are using the memory-only build of Firestore. Persistence support is ' +
  'only available via the @firebase/firestore bundle or the ' +
  'firebase-firestore.js build.';

export interface ComponentConfiguration {
  asyncQueue: AsyncQueue;
  databaseInfo: DatabaseInfo;
  credentials: CredentialsProvider;
  clientId: ClientId;
  initialUser: User;
  maxConcurrentLimboResolutions: number;
  persistenceSettings: PersistenceSettings;
}

/**
 * Initializes and wires components that are needed to interface with the local
 * cache. Implementations override `initialize()` to provide all components.
 */
export interface OfflineComponentProvider {
  persistence: Persistence;
  sharedClientState: SharedClientState;
  localStore: LocalStore;
  gcScheduler: GarbageCollectionScheduler | null;

  initialize(cfg: ComponentConfiguration): Promise<void>;

  terminate(): Promise<void>;

  clearPersistence(
    databaseId: DatabaseId,
    persistenceKey: string
  ): Promise<void>;
}

/**
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */
export class MemoryOfflineComponentProvider
  implements OfflineComponentProvider {
  persistence!: Persistence;
  sharedClientState!: SharedClientState;
  localStore!: LocalStore;
  gcScheduler!: GarbageCollectionScheduler | null;

  async initialize(cfg: ComponentConfiguration): Promise<void> {
    this.sharedClientState = this.createSharedClientState(cfg);
    this.persistence = this.createPersistence(cfg);
    await this.persistence.start();
    this.gcScheduler = this.createGarbageCollectionScheduler(cfg);
    this.localStore = this.createLocalStore(cfg);
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    return null;
  }

  createLocalStore(cfg: ComponentConfiguration): LocalStore {
    return newLocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      cfg.initialUser
    );
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    if (cfg.persistenceSettings.durable) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
      );
    }
    return new MemoryPersistence(MemoryEagerDelegate.factory);
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    return new MemorySharedClientState();
  }

  async terminate(): Promise<void> {
    if (this.gcScheduler) {
      this.gcScheduler.stop();
    }
    await this.sharedClientState.shutdown();
    await this.persistence.shutdown();
  }

  clearPersistence(
    databaseId: DatabaseId,
    persistenceKey: string
  ): Promise<void> {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */
export class IndexedDbOfflineComponentProvider extends MemoryOfflineComponentProvider {
  persistence!: IndexedDbPersistence;
  sharedClientState!: SharedClientState;
  localStore!: LocalStore;
  gcScheduler!: GarbageCollectionScheduler | null;

  constructor(
    protected readonly onlineComponentProvider: OnlineComponentProvider
  ) {
    super();
  }

  async initialize(cfg: ComponentConfiguration): Promise<void> {
    await super.initialize(cfg);
    await synchronizeLastDocumentChangeReadTime(this.localStore);

    await this.onlineComponentProvider.initialize(this, cfg);

    // Enqueue writes from a previous session
    await ensureWriteCallbacks(this.onlineComponentProvider.syncEngine);
    await fillWritePipeline(this.onlineComponentProvider.remoteStore);
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    const garbageCollector = this.persistence.referenceDelegate
      .garbageCollector;
    return new LruScheduler(garbageCollector, cfg.asyncQueue);
  }

  createPersistence(cfg: ComponentConfiguration): IndexedDbPersistence {
    debugAssert(
      cfg.persistenceSettings.durable,
      'Can only start durable persistence'
    );

    const persistenceKey = indexedDbStoragePrefix(
      cfg.databaseInfo.databaseId,
      cfg.databaseInfo.persistenceKey
    );
    const serializer = newSerializer(cfg.databaseInfo.databaseId);
    return new IndexedDbPersistence(
      cfg.persistenceSettings.synchronizeTabs,
      persistenceKey,
      cfg.clientId,
      LruParams.withCacheSize(cfg.persistenceSettings.cacheSizeBytes),
      cfg.asyncQueue,
      getWindow(),
      getDocument(),
      serializer,
      this.sharedClientState,
      cfg.persistenceSettings.forceOwningTab
    );
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    return new MemorySharedClientState();
  }

  clearPersistence(
    databaseId: DatabaseId,
    persistenceKey: string
  ): Promise<void> {
    return indexedDbClearPersistence(
      indexedDbStoragePrefix(databaseId, persistenceKey)
    );
  }
}

/**
 * Provides all components needed for Firestore with multi-tab IndexedDB
 * persistence.
 *
 * In the legacy client, this provider is used to provide both multi-tab and
 * non-multi-tab persistence since we cannot tell at build time whether
 * `synchronizeTabs` will be enabled.
 */
export class MultiTabOfflineComponentProvider extends IndexedDbOfflineComponentProvider {
  async initialize(cfg: ComponentConfiguration): Promise<void> {
    await super.initialize(cfg);

    const syncEngine = this.onlineComponentProvider.syncEngine;

    if (this.sharedClientState instanceof WebStorageSharedClientState) {
      this.sharedClientState.syncEngine = {
        applyBatchState: applyBatchState.bind(null, syncEngine),
        applyTargetState: applyTargetState.bind(null, syncEngine),
        applyActiveTargetsChange: applyActiveTargetsChange.bind(
          null,
          syncEngine
        ),
        getActiveClients: getActiveClients.bind(null, syncEngine)
      };
      await this.sharedClientState.start();
    }

    // NOTE: This will immediately call the listener, so we make sure to
    // set it after localStore / remoteStore are started.
    await this.persistence.setPrimaryStateListener(async isPrimary => {
      await applyPrimaryState(
        this.onlineComponentProvider.syncEngine,
        isPrimary
      );
      if (this.gcScheduler) {
        if (isPrimary && !this.gcScheduler.started) {
          this.gcScheduler.start(this.localStore);
        } else if (!isPrimary) {
          this.gcScheduler.stop();
        }
      }
    });
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    if (
      cfg.persistenceSettings.durable &&
      cfg.persistenceSettings.synchronizeTabs
    ) {
      const window = getWindow();
      if (!WebStorageSharedClientState.isAvailable(window)) {
        throw new FirestoreError(
          Code.UNIMPLEMENTED,
          'IndexedDB persistence is only available on platforms that support LocalStorage.'
        );
      }
      const persistenceKey = indexedDbStoragePrefix(
        cfg.databaseInfo.databaseId,
        cfg.databaseInfo.persistenceKey
      );
      return new WebStorageSharedClientState(
        window,
        cfg.asyncQueue,
        persistenceKey,
        cfg.clientId,
        cfg.initialUser
      );
    }
    return new MemorySharedClientState();
  }
}

/**
 * Initializes and wires the components that are needed to interface with the
 * network.
 */
export class OnlineComponentProvider {
  protected localStore!: LocalStore;
  protected sharedClientState!: SharedClientState;
  datastore!: Datastore;
  eventManager!: EventManager;
  remoteStore!: RemoteStore;
  syncEngine!: SyncEngine;

  async initialize(
    offlineComponentProvider: OfflineComponentProvider,
    cfg: ComponentConfiguration
  ): Promise<void> {
    if (this.localStore) {
      // OnlineComponentProvider may get initialized multiple times if
      // multi-tab persistence is used.
      return;
    }

    this.localStore = offlineComponentProvider.localStore;
    this.sharedClientState = offlineComponentProvider.sharedClientState;
    this.datastore = this.createDatastore(cfg);
    this.remoteStore = this.createRemoteStore(cfg);
    this.eventManager = this.createEventManager(cfg);
    this.syncEngine = this.createSyncEngine(cfg);

    this.sharedClientState.onlineStateHandler = onlineState =>
      applyOnlineStateChange(
        this.syncEngine,
        onlineState,
        OnlineStateSource.SharedClientState
      );

    this.remoteStore.remoteSyncer.handleCredentialChange = syncEngineHandleCredentialChange.bind(
      null,
      this.syncEngine
    );

    await remoteStoreApplyPrimaryState(
      this.remoteStore,
      this.syncEngine.isPrimaryClient
    );
  }

  createEventManager(cfg: ComponentConfiguration): EventManager {
    return newEventManager();
  }

  createDatastore(cfg: ComponentConfiguration): Datastore {
    const serializer = newSerializer(cfg.databaseInfo.databaseId);
    const connection = newConnection(cfg.databaseInfo);
    return newDatastore(cfg.credentials, connection, serializer);
  }

  createRemoteStore(cfg: ComponentConfiguration): RemoteStore {
    return newRemoteStore(
      this.localStore,
      this.datastore,
      cfg.asyncQueue,
      onlineState =>
        applyOnlineStateChange(
          this.syncEngine,
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      newConnectivityMonitor()
    );
  }

  createSyncEngine(cfg: ComponentConfiguration): SyncEngine {
    return newSyncEngine(
      this.localStore,
      this.remoteStore,
      this.eventManager,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions,
      !cfg.persistenceSettings.durable ||
        !cfg.persistenceSettings.synchronizeTabs
    );
  }

  terminate(): Promise<void> {
    return remoteStoreShutdown(this.remoteStore);
  }
}
