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
  MemoryPersistence
} from '../local/memory_persistence';
import { JsonProtoSerializer } from '../remote/serializer';

const MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE =
  'You are using the memory-only build of Firestore. Persistence support is ' +
  'only available via the @firebase/firestore bundle or the ' +
  'firebase-firestore.js build.';

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
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */
export class MemoryComponentProvider implements ComponentProvider {
  persistence!: Persistence;
  sharedClientState!: SharedClientState;
  localStore!: LocalStore;
  syncEngine!: SyncEngine;
  gcScheduler!: GarbageCollectionScheduler | null;
  remoteStore!: RemoteStore;
  eventManager!: EventManager;

  serializer!: JsonProtoSerializer;

  async initialize(cfg: ComponentConfiguration): Promise<void> {
    this.serializer = cfg.platform.newSerializer(cfg.databaseInfo.databaseId);
    this.sharedClientState = this.createSharedClientState(cfg);
    this.persistence = this.createPersistence(cfg);
    await this.persistence.start();
    this.gcScheduler = this.createGarbageCollectionScheduler(cfg);
    this.localStore = this.createLocalStore(cfg);
    this.remoteStore = this.createRemoteStore(cfg);
    this.syncEngine = this.createSyncEngine(cfg);
    this.eventManager = this.createEventManager(cfg);

    this.sharedClientState.onlineStateHandler = onlineState =>
      this.syncEngine.applyOnlineStateChange(
        onlineState,
        OnlineStateSource.SharedClientState
      );
    this.remoteStore.syncEngine = this.syncEngine;

    await this.localStore.start();
    await this.sharedClientState.start();
    await this.remoteStore.start();

    await this.remoteStore.applyPrimaryState(this.syncEngine.isPrimaryClient);
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
      cfg.initialUser,
      this.serializer
    );
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    debugAssert(
      !cfg.persistenceSettings.durable,
      'Can only start memory persistence'
    );
    return new MemoryPersistence(MemoryEagerDelegate.factory, this.serializer);
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

  clearPersistence(databaseInfo: DatabaseInfo): Promise<void> {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */
export class IndexedDbComponentProvider extends MemoryComponentProvider {
  persistence!: IndexedDbPersistence;

  // TODO(tree-shaking): Create an IndexedDbComponentProvider and a
  // MultiTabComponentProvider. The IndexedDbComponentProvider should depend
  // on LocalStore and SyncEngine.
  localStore!: MultiTabLocalStore;
  syncEngine!: MultiTabSyncEngine;

  async initialize(cfg: ComponentConfiguration): Promise<void> {
    await super.initialize(cfg);

    // NOTE: This will immediately call the listener, so we make sure to
    // set it after localStore / remoteStore are started.
    await this.persistence.setPrimaryStateListener(async isPrimary => {
      await (this.syncEngine as MultiTabSyncEngine).applyPrimaryState(
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

  createLocalStore(cfg: ComponentConfiguration): LocalStore {
    return new MultiTabLocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      cfg.initialUser,
      this.serializer
    );
  }

  createSyncEngine(cfg: ComponentConfiguration): SyncEngine {
    const syncEngine = new MultiTabSyncEngine(
      this.localStore,
      this.remoteStore,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions
    );
    if (this.sharedClientState instanceof WebStorageSharedClientState) {
      this.sharedClientState.syncEngine = syncEngine;
    }
    return syncEngine;
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    const garbageCollector = this.persistence.referenceDelegate
      .garbageCollector;
    return new LruScheduler(garbageCollector, cfg.asyncQueue);
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    debugAssert(
      cfg.persistenceSettings.durable,
      'Can only start durable persistence'
    );

    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      cfg.databaseInfo
    );
    return new IndexedDbPersistence(
      cfg.persistenceSettings.synchronizeTabs,
      persistenceKey,
      cfg.clientId,
      cfg.platform,
      LruParams.withCacheSize(cfg.persistenceSettings.cacheSizeBytes),
      cfg.asyncQueue,
      this.serializer,
      this.sharedClientState
    );
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    if (
      cfg.persistenceSettings.durable &&
      cfg.persistenceSettings.synchronizeTabs
    ) {
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

  clearPersistence(databaseInfo: DatabaseInfo): Promise<void> {
    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      databaseInfo
    );
    return IndexedDbPersistence.clearPersistence(persistenceKey);
  }
}
