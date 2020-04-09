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
import { LocalStore } from '../local/local_store';
import { SyncEngine } from './sync_engine';
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

export interface ComponentConfiguration {
  asyncQueue: AsyncQueue;
  databaseInfo: DatabaseInfo;
  platform: Platform;
  datastore: Datastore;
  clientId: ClientId;
  initialUser: User;
  maxConcurrentLimboResolutions: number;
  persistenceSettings: PersistenceSettings;
}

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

  initialize(cfg: ComponentConfiguration): Promise<void>;

  clearPersistence(databaseId: DatabaseInfo): Promise<void>;
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */
export class IndexedDbComponentProvider implements ComponentProvider {
  persistence!: IndexedDbPersistence;
  sharedClientState!: SharedClientState;
  localStore!: LocalStore;
  syncEngine!: SyncEngine;
  gcScheduler!: GarbageCollectionScheduler;
  remoteStore!: RemoteStore;
  eventManager!: EventManager;

  initialize(cfg: ComponentConfiguration): Promise<void> {
    return initializeComponentProvider(this, cfg);
  }

  createEventManager(cfg: ComponentConfiguration): EventManager {
    return new EventManager(this.syncEngine);
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    const garbageCollector = this.persistence.referenceDelegate
      .garbageCollector;
    return new LruScheduler(garbageCollector, cfg.asyncQueue);
  }

  createLocalStore(cfg: ComponentConfiguration): LocalStore {
    return new LocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      cfg.initialUser
    );
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    debugAssert(
      cfg.persistenceSettings.durable,
      'Can only start durable persistence'
    );

    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      cfg.databaseInfo
    );
    const serializer = cfg.platform.newSerializer(
      cfg.databaseInfo.databaseId
    );
    return IndexedDbPersistence.createIndexedDbPersistence({
      allowTabSynchronization: cfg.persistenceSettings.synchronizeTabs,
      persistenceKey,
      clientId: cfg.clientId,
      platform: cfg.platform,
      queue: cfg.asyncQueue,
      serializer,
      lruParams: LruParams.withCacheSize(
        cfg.persistenceSettings.cacheSizeBytes
      ),
      sequenceNumberSyncer: this.sharedClientState
    });
  }

  createRemoteStore(cfg: ComponentConfiguration): RemoteStore {
    return new RemoteStore(
      this.localStore,
      cfg.datastore,
      cfg.asyncQueue,
      onlineState =>
        this.syncEngine.applyOnlineStateChange(
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      cfg.platform.newConnectivityMonitor()
    );
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    debugAssert(
      cfg.persistenceSettings.durable,
      'Can only start durable persistence'
    );

    if (cfg.persistenceSettings.synchronizeTabs) {
      if (!WebStorageSharedClientState.isAvailable(cfg.platform)) {
        throw new FirestoreError(
          Code.UNIMPLEMENTED,
          'IndexedDB persistence is only available on platforms that support LocalStorage.'
        );
      }
      const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
        cfg.databaseInfo
      );
      return new WebStorageSharedClientState(
        cfg.asyncQueue,
        cfg.platform,
        persistenceKey,
        cfg.clientId,
        cfg.initialUser
      );
    }
    return new MemorySharedClientState();
  }

  createSyncEngine(cfg: ComponentConfiguration): SyncEngine {
    return new SyncEngine(
      this.localStore,
      this.remoteStore,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions
    );
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
  gcScheduler!: null;
  remoteStore!: RemoteStore;
  eventManager!: EventManager;

  constructor(
    readonly referenceDelegateFactory: (
      p: MemoryPersistence
    ) => MemoryReferenceDelegate = MemoryEagerDelegate.factory
  ) {}

  initialize(cfg: ComponentConfiguration): Promise<void> {
    return initializeComponentProvider(this, cfg);
  }

  createEventManager(cfg: ComponentConfiguration): EventManager {
    return new EventManager(this.syncEngine);
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    return null;
  }

  createLocalStore(cfg: ComponentConfiguration): LocalStore {
    return new LocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      cfg.initialUser
    );
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    debugAssert(
      !cfg.persistenceSettings.durable,
      'Can only start memory persistence'
    );
    return new MemoryPersistence(cfg.clientId, this.referenceDelegateFactory);
  }

  createRemoteStore(cfg: ComponentConfiguration): RemoteStore {
    return new RemoteStore(
      this.localStore,
      cfg.datastore,
      cfg.asyncQueue,
      onlineState =>
        this.syncEngine.applyOnlineStateChange(
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      cfg.platform.newConnectivityMonitor()
    );
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    return new MemorySharedClientState();
  }

  createSyncEngine(cfg: ComponentConfiguration): SyncEngine {
    return new SyncEngine(
      this.localStore,
      this.remoteStore,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions
    );
  }

  clearPersistence(): never {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }
}

async function initializeComponentProvider(
  target: MemoryComponentProvider | IndexedDbComponentProvider,
  cfg: ComponentConfiguration
): Promise<void> {
  target.sharedClientState = target.createSharedClientState(cfg);
  target.persistence = target.createPersistence(cfg);
  await target.persistence.start();
  target.gcScheduler = target.createGarbageCollectionScheduler(cfg);
  target.localStore = target.createLocalStore(cfg);
  target.remoteStore = target.createRemoteStore(cfg);
  target.syncEngine = target.createSyncEngine(cfg);
  target.eventManager = target.createEventManager(cfg);

  target.sharedClientState.onlineStateHandler = onlineState =>
    target.syncEngine.applyOnlineStateChange(
      onlineState,
      OnlineStateSource.SharedClientState
    );
  target.remoteStore.syncEngine = target.syncEngine;
  target.sharedClientState.syncEngine = target.syncEngine;

  await target.sharedClientState.start();
  await target.remoteStore.start();
  await target.localStore.start();

  // NOTE: This will immediately call the listener, so we make sure to
  // set it after localStore / remoteStore are started.
  await target.persistence.setPrimaryStateListener(async isPrimary => {
    await target.syncEngine.applyPrimaryState(isPrimary);
    if (target.gcScheduler) {
      if (isPrimary && !target.gcScheduler.started) {
        target.gcScheduler.start(target.localStore);
      } else if (!isPrimary) {
        target.gcScheduler.stop();
      }
    }
  });
}
