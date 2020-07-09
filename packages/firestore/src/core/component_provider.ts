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
  MultiTabLocalStore,
  newLocalStore,
  newMultiTabLocalStore
} from '../local/local_store';
import {
  MultiTabSyncEngine,
  newMultiTabSyncEngine,
  newSyncEngine,
  SyncEngine
} from './sync_engine';
import { RemoteStore } from '../remote/remote_store';
import { EventManager } from './event_manager';
import { AsyncQueue } from '../util/async_queue';
import { DatabaseId, DatabaseInfo } from './database_info';
import { Datastore } from '../remote/datastore';
import { User } from '../auth/user';
import { PersistenceSettings } from './firestore_client';
import { debugAssert } from '../util/assert';
import { GarbageCollectionScheduler, Persistence } from '../local/persistence';
import { Code, FirestoreError } from '../util/error';
import { OnlineStateSource } from './types';
import { LruParams, LruScheduler } from '../local/lru_garbage_collector';
import { IndexFreeQueryEngine } from '../local/index_free_query_engine';
import {
  buildStoragePrefix,
  IndexedDbPersistence,
  clearPersistence
} from '../local/indexeddb_persistence';
import {
  MemoryEagerDelegate,
  MemoryPersistence
} from '../local/memory_persistence';
import { newConnectivityMonitor } from '../platform/connection';
import { newSerializer } from '../platform/serializer';
import { getDocument, getWindow } from '../platform/dom';

const MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE =
  'You are using the memory-only build of Firestore. Persistence support is ' +
  'only available via the @firebase/firestore bundle or the ' +
  'firebase-firestore.js build.';

export interface ComponentConfiguration {
  asyncQueue: AsyncQueue;
  databaseInfo: DatabaseInfo;
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

  clearPersistence(
    databaseId: DatabaseId,
    persistenceKey: string
  ): Promise<void>;
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

  async initialize(cfg: ComponentConfiguration): Promise<void> {
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
      newConnectivityMonitor()
    );
  }

  createSharedClientState(cfg: ComponentConfiguration): SharedClientState {
    return new MemorySharedClientState();
  }

  createSyncEngine(cfg: ComponentConfiguration): SyncEngine {
    return newSyncEngine(
      this.localStore,
      this.remoteStore,
      cfg.datastore,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions
    );
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
export class IndexedDbComponentProvider extends MemoryComponentProvider {
  persistence!: IndexedDbPersistence;

  createLocalStore(cfg: ComponentConfiguration): LocalStore {
    return newLocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      cfg.initialUser
    );
  }

  createSyncEngine(cfg: ComponentConfiguration): SyncEngine {
    return newSyncEngine(
      this.localStore,
      this.remoteStore,
      cfg.datastore,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions
    );
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

    const persistenceKey = buildStoragePrefix(
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
    return clearPersistence(buildStoragePrefix(databaseId, persistenceKey));
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
export class MultiTabIndexedDbComponentProvider extends IndexedDbComponentProvider {
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
    return newMultiTabLocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      cfg.initialUser
    );
  }

  createSyncEngine(cfg: ComponentConfiguration): SyncEngine {
    const syncEngine = newMultiTabSyncEngine(
      this.localStore,
      this.remoteStore,
      cfg.datastore,
      this.sharedClientState,
      cfg.initialUser,
      cfg.maxConcurrentLimboResolutions
    );
    if (this.sharedClientState instanceof WebStorageSharedClientState) {
      this.sharedClientState.syncEngine = syncEngine;
    }
    return syncEngine;
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
      const persistenceKey = buildStoragePrefix(
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
