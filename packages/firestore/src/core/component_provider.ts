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

import { CredentialsProvider } from '../api/credentials';
import { User } from '../auth/user';
import {
  IndexBackfiller,
  IndexBackfillerScheduler
} from '../local/index_backfiller';
import {
  indexedDbStoragePrefix,
  IndexedDbPersistence
} from '../local/indexeddb_persistence';
import { LocalStore } from '../local/local_store';
import { newLocalStore } from '../local/local_store_impl';
import { LruParams } from '../local/lru_garbage_collector';
import { LruScheduler } from '../local/lru_garbage_collector_impl';
import {
  MemoryEagerDelegate,
  MemoryLruDelegate,
  MemoryPersistence
} from '../local/memory_persistence';
import { Scheduler, Persistence } from '../local/persistence';
import { QueryEngine } from '../local/query_engine';
import {
  ClientId,
  MemorySharedClientState,
  SharedClientState,
  WebStorageSharedClientState
} from '../local/shared_client_state';
import { newConnection, newConnectivityMonitor } from '../platform/connection';
import { getDocument, getWindow } from '../platform/dom';
import { newSerializer } from '../platform/serializer';
import { Datastore, newDatastore } from '../remote/datastore';
import {
  fillWritePipeline,
  newRemoteStore,
  RemoteStore,
  remoteStoreApplyPrimaryState,
  remoteStoreShutdown
} from '../remote/remote_store';
import { JsonProtoSerializer } from '../remote/serializer';
import { hardAssert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';

import { DatabaseInfo } from './database_info';
import { EventManager, newEventManager } from './event_manager';
import { SyncEngine } from './sync_engine';
import {
  newSyncEngine,
  syncEngineApplyActiveTargetsChange,
  syncEngineApplyBatchState,
  syncEngineApplyOnlineStateChange,
  syncEngineApplyPrimaryState,
  syncEngineApplyTargetState,
  syncEngineEnsureWriteCallbacks,
  syncEngineGetActiveClients,
  syncEngineHandleCredentialChange,
  syncEngineSynchronizeWithChangedDocuments
} from './sync_engine_impl';
import { OnlineStateSource } from './types';

export interface ComponentConfiguration {
  asyncQueue: AsyncQueue;
  databaseInfo: DatabaseInfo;
  authCredentials: CredentialsProvider<User>;
  appCheckCredentials: CredentialsProvider<string>;
  clientId: ClientId;
  initialUser: User;
  maxConcurrentLimboResolutions: number;
}

/**
 * Initializes and wires components that are needed to interface with the local
 * cache. Implementations override `initialize()` to provide all components.
 */
export interface OfflineComponentProvider {
  persistence: Persistence;
  sharedClientState: SharedClientState;
  localStore: LocalStore;
  gcScheduler: Scheduler | null;
  indexBackfillerScheduler: Scheduler | null;
  synchronizeTabs: boolean;

  initialize(cfg: ComponentConfiguration): Promise<void>;

  terminate(): Promise<void>;
}

/**
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */
export class MemoryOfflineComponentProvider
  implements OfflineComponentProvider
{
  persistence!: Persistence;
  sharedClientState!: SharedClientState;
  localStore!: LocalStore;
  gcScheduler!: Scheduler | null;
  indexBackfillerScheduler!: Scheduler | null;
  synchronizeTabs = false;

  serializer!: JsonProtoSerializer;

  async initialize(cfg: ComponentConfiguration): Promise<void> {
    this.serializer = newSerializer(cfg.databaseInfo.databaseId);
    this.sharedClientState = this.createSharedClientState(cfg);
    this.persistence = this.createPersistence(cfg);
    await this.persistence.start();
    this.localStore = this.createLocalStore(cfg);
    this.gcScheduler = this.createGarbageCollectionScheduler(
      cfg,
      this.localStore
    );
    this.indexBackfillerScheduler = this.createIndexBackfillerScheduler(
      cfg,
      this.localStore
    );
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration,
    localStore: LocalStore
  ): Scheduler | null {
    return null;
  }

  createIndexBackfillerScheduler(
    cfg: ComponentConfiguration,
    localStore: LocalStore
  ): Scheduler | null {
    return null;
  }

  createLocalStore(cfg: ComponentConfiguration): LocalStore {
    return newLocalStore(
      this.persistence,
      new QueryEngine(),
      cfg.initialUser,
      this.serializer
    );
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    return new MemoryPersistence(MemoryEagerDelegate.factory, this.serializer);
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
}

export class LruGcMemoryOfflineComponentProvider extends MemoryOfflineComponentProvider {
  constructor(protected readonly cacheSizeBytes: number | undefined) {
    super();
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration,
    localStore: LocalStore
  ): Scheduler | null {
    hardAssert(
      this.persistence.referenceDelegate instanceof MemoryLruDelegate,
      'referenceDelegate is expected to be an instance of MemoryLruDelegate.'
    );

    const garbageCollector =
      this.persistence.referenceDelegate.garbageCollector;
    return new LruScheduler(garbageCollector, cfg.asyncQueue, localStore);
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    const lruParams =
      this.cacheSizeBytes !== undefined
        ? LruParams.withCacheSize(this.cacheSizeBytes)
        : LruParams.DEFAULT;
    return new MemoryPersistence(
      p => MemoryLruDelegate.factory(p, lruParams),
      this.serializer
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
  gcScheduler!: Scheduler | null;
  indexBackfillerScheduler!: Scheduler | null;
  synchronizeTabs = false;

  constructor(
    protected readonly onlineComponentProvider: OnlineComponentProvider,
    protected readonly cacheSizeBytes: number | undefined,
    protected readonly forceOwnership: boolean | undefined
  ) {
    super();
  }

  async initialize(cfg: ComponentConfiguration): Promise<void> {
    await super.initialize(cfg);

    await this.onlineComponentProvider.initialize(this, cfg);

    // Enqueue writes from a previous session
    await syncEngineEnsureWriteCallbacks(
      this.onlineComponentProvider.syncEngine
    );
    await fillWritePipeline(this.onlineComponentProvider.remoteStore);

    // NOTE: This will immediately call the listener, so we make sure to
    // set it after localStore / remoteStore are started.
    await this.persistence.setPrimaryStateListener(() => {
      if (this.gcScheduler && !this.gcScheduler.started) {
        this.gcScheduler.start();
      }
      if (
        this.indexBackfillerScheduler &&
        !this.indexBackfillerScheduler.started
      ) {
        this.indexBackfillerScheduler.start();
      }
      return Promise.resolve();
    });
  }

  createLocalStore(cfg: ComponentConfiguration): LocalStore {
    return newLocalStore(
      this.persistence,
      new QueryEngine(),
      cfg.initialUser,
      this.serializer
    );
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration,
    localStore: LocalStore
  ): Scheduler | null {
    const garbageCollector =
      this.persistence.referenceDelegate.garbageCollector;
    return new LruScheduler(garbageCollector, cfg.asyncQueue, localStore);
  }

  createIndexBackfillerScheduler(
    cfg: ComponentConfiguration,
    localStore: LocalStore
  ): Scheduler | null {
    const indexBackfiller = new IndexBackfiller(localStore, this.persistence);
    return new IndexBackfillerScheduler(cfg.asyncQueue, indexBackfiller);
  }

  createPersistence(cfg: ComponentConfiguration): IndexedDbPersistence {
    const persistenceKey = indexedDbStoragePrefix(
      cfg.databaseInfo.databaseId,
      cfg.databaseInfo.persistenceKey
    );
    const lruParams =
      this.cacheSizeBytes !== undefined
        ? LruParams.withCacheSize(this.cacheSizeBytes)
        : LruParams.DEFAULT;

    return new IndexedDbPersistence(
      this.synchronizeTabs,
      persistenceKey,
      cfg.clientId,
      lruParams,
      cfg.asyncQueue,
      getWindow(),
      getDocument(),
      this.serializer,
      this.sharedClientState,
      !!this.forceOwnership
    );
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    return new MemorySharedClientState();
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
  synchronizeTabs = true;

  constructor(
    protected readonly onlineComponentProvider: OnlineComponentProvider,
    protected readonly cacheSizeBytes: number | undefined
  ) {
    super(onlineComponentProvider, cacheSizeBytes, /* forceOwnership= */ false);
  }

  async initialize(cfg: ComponentConfiguration): Promise<void> {
    await super.initialize(cfg);

    const syncEngine = this.onlineComponentProvider.syncEngine;

    if (this.sharedClientState instanceof WebStorageSharedClientState) {
      this.sharedClientState.syncEngine = {
        applyBatchState: syncEngineApplyBatchState.bind(null, syncEngine),
        applyTargetState: syncEngineApplyTargetState.bind(null, syncEngine),
        applyActiveTargetsChange: syncEngineApplyActiveTargetsChange.bind(
          null,
          syncEngine
        ),
        getActiveClients: syncEngineGetActiveClients.bind(null, syncEngine),
        synchronizeWithChangedDocuments:
          syncEngineSynchronizeWithChangedDocuments.bind(null, syncEngine)
      };
      await this.sharedClientState.start();
    }

    // NOTE: This will immediately call the listener, so we make sure to
    // set it after localStore / remoteStore are started.
    await this.persistence.setPrimaryStateListener(async isPrimary => {
      await syncEngineApplyPrimaryState(
        this.onlineComponentProvider.syncEngine,
        isPrimary
      );
      if (this.gcScheduler) {
        if (isPrimary && !this.gcScheduler.started) {
          this.gcScheduler.start();
        } else if (!isPrimary) {
          this.gcScheduler.stop();
        }
      }
      if (this.indexBackfillerScheduler) {
        if (isPrimary && !this.indexBackfillerScheduler.started) {
          this.indexBackfillerScheduler.start();
        } else if (!isPrimary) {
          this.indexBackfillerScheduler.stop();
        }
      }
    });
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
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
    this.syncEngine = this.createSyncEngine(
      cfg,
      /* startAsPrimary=*/ !offlineComponentProvider.synchronizeTabs
    );

    this.sharedClientState.onlineStateHandler = onlineState =>
      syncEngineApplyOnlineStateChange(
        this.syncEngine,
        onlineState,
        OnlineStateSource.SharedClientState
      );

    this.remoteStore.remoteSyncer.handleCredentialChange =
      syncEngineHandleCredentialChange.bind(null, this.syncEngine);

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
    return newDatastore(
      cfg.authCredentials,
      cfg.appCheckCredentials,
      connection,
      serializer
    );
  }

  createRemoteStore(cfg: ComponentConfiguration): RemoteStore {
    return newRemoteStore(
      this.localStore,
      this.datastore,
      cfg.asyncQueue,
      onlineState =>
        syncEngineApplyOnlineStateChange(
          this.syncEngine,
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      newConnectivityMonitor()
    );
  }

  createSyncEngine(
    cfg: ComponentConfiguration,
    startAsPrimary: boolean
  ): SyncEngine {
    return newSyncEngine(
      this.localStore,
      this.remoteStore,
      this.eventManager,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions,
      startAsPrimary
    );
  }

  terminate(): Promise<void> {
    return remoteStoreShutdown(this.remoteStore);
  }
}
