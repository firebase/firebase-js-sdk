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
import { assert } from '../util/assert';
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

export interface Components {
  persistence: Persistence;
  sharedClientState: SharedClientState;
  localStore: LocalStore;
  syncEngine: SyncEngine;
  gcScheduler: GarbageCollectionScheduler | null;
  remoteStore: RemoteStore;
  eventManager: EventManager;
}

/**
 * Initializes and wires up all core components for Firestore.
 */
export interface ComponentProvider {
  initialize(
    asyncQueue: AsyncQueue,
    databaseInfo: DatabaseInfo,
    platform: Platform,
    datastore: Datastore,
    clientId: ClientId,
    initialUser: User,
    maxConcurrentLimboResolutions: number,
    persistenceSettings: PersistenceSettings
  ): Promise<Components>;

  clearPersistence(databaseId: DatabaseInfo): Promise<void>;
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */
export class IndexedDbComponentProvider implements ComponentProvider {
  async initialize(
    asyncQueue: AsyncQueue,
    databaseInfo: DatabaseInfo,
    platform: Platform,
    datastore: Datastore,
    clientId: ClientId,
    initialUser: User,
    maxConcurrentLimboResolutions: number,
    persistenceSettings: PersistenceSettings
  ): Promise<Components> {
    assert(
      persistenceSettings.durable,
      'IndexedDbComponentProvider can only provide durable persistence'
    );

    const components: Partial<Components> = {};

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

    components.sharedClientState = persistenceSettings.synchronizeTabs
      ? new WebStorageSharedClientState(
          asyncQueue,
          platform,
          persistenceKey,
          clientId,
          initialUser
        )
      : new MemorySharedClientState();
    components.sharedClientState.onlineStateHandler = onlineState =>
      components.syncEngine!.applyOnlineStateChange(
        onlineState,
        OnlineStateSource.SharedClientState
      );

    components.persistence = await IndexedDbPersistence.createIndexedDbPersistence(
      {
        allowTabSynchronization: persistenceSettings.synchronizeTabs,
        persistenceKey,
        clientId,
        platform,
        queue: asyncQueue,
        serializer,
        lruParams: LruParams.withCacheSize(persistenceSettings.cacheSizeBytes),
        sequenceNumberSyncer: components.sharedClientState
      }
    );

    const garbageCollector = (components.persistence as IndexedDbPersistence)
      .referenceDelegate.garbageCollector;

    components.gcScheduler = new LruScheduler(garbageCollector, asyncQueue);
    components.localStore = new LocalStore(
      components.persistence,
      new IndexFreeQueryEngine(),
      initialUser
    );
    components.remoteStore = new RemoteStore(
      components.localStore,
      datastore,
      asyncQueue,
      onlineState =>
        components.syncEngine!.applyOnlineStateChange(
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      platform.newConnectivityMonitor()
    );
    components.syncEngine = new SyncEngine(
      components.localStore,
      components.remoteStore,
      components.sharedClientState,
      initialUser,
      maxConcurrentLimboResolutions
    );
    components.eventManager = new EventManager(components.syncEngine);

    components.remoteStore.syncEngine = components.syncEngine;
    components.sharedClientState.syncEngine = components.syncEngine;

    await components.sharedClientState.start();
    await components.remoteStore.start();
    await components.localStore.start();

    // NOTE: This will immediately call the listener, so we make sure to
    // set it after localStore / remoteStore are started.
    await components.persistence.setPrimaryStateListener(async isPrimary => {
      await components.syncEngine!.applyPrimaryState(isPrimary);
      if (isPrimary && !components.gcScheduler!.started) {
        components.gcScheduler!.start(components.localStore!);
      } else if (!isPrimary) {
        components.gcScheduler!.stop();
      }
    });

    return components as Components;
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
  ): Promise<Components> {
    if (persistenceSettings.durable) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
      );
    }

    const components: Partial<Components> = {};

    components.persistence = new MemoryPersistence(
      clientId,
      this.referenceDelegateFactory
    );
    components.gcScheduler = null;
    components.sharedClientState = new MemorySharedClientState();
    components.localStore = new LocalStore(
      components.persistence,
      new IndexFreeQueryEngine(),
      initialUser
    );
    components.remoteStore = new RemoteStore(
      components.localStore,
      datastore,
      asyncQueue,
      onlineState =>
        components.syncEngine!.applyOnlineStateChange(
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      platform.newConnectivityMonitor()
    );
    components.syncEngine = new SyncEngine(
      components.localStore,
      components.remoteStore,
      components.sharedClientState,
      initialUser,
      maxConcurrentLimboResolutions
    );
    components.eventManager = new EventManager(components.syncEngine);

    components.remoteStore.syncEngine = components.syncEngine;

    await components.remoteStore.start();
    await components.remoteStore.applyPrimaryState(true);
    await components.syncEngine.applyPrimaryState(true);

    return components as Components;
  }

  clearPersistence(): never {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }
}
