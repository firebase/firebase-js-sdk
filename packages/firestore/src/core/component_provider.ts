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

/**
 * Initializes and wires up all core components for Firestore. Implementations
 * override `initialize()` to provide all components.
 */
export abstract class ComponentProvider {
  protected asyncQueue!: AsyncQueue;
  protected databaseInfo!: DatabaseInfo;
  protected platform!: Platform;
  protected datastore!: Datastore;
  protected clientId!: ClientId;
  protected initialUser!: User;
  protected maxConcurrentLimboResolutions!: number;
  protected persistenceSettings!: PersistenceSettings;

  persistence!: Persistence;
  sharedClientState!: SharedClientState;
  localStore!: LocalStore;
  syncEngine!: SyncEngine;
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
    this.asyncQueue = asyncQueue;
    this.databaseInfo = databaseInfo;
    this.platform = platform;
    this.datastore = datastore;
    this.clientId = clientId;
    this.initialUser = initialUser;
    this.maxConcurrentLimboResolutions = maxConcurrentLimboResolutions;
    this.persistenceSettings = persistenceSettings;

    this.sharedClientState = this.createSharedClientState();
    this.persistence = this.createPersistence();
    await this.persistence.start();
    this.gcScheduler = this.createGarbageCollectionScheduler();
    this.localStore = this.createLocalStore();
    this.remoteStore = this.createRemoteStore();
    this.syncEngine = this.createSyncEngine();
    this.eventManager = this.createEventManager();

    this.sharedClientState.onlineStateHandler = onlineState =>
      this.syncEngine.applyOnlineStateChange(
        onlineState,
        OnlineStateSource.SharedClientState
      );
    this.remoteStore.syncEngine = this.syncEngine;
    this.sharedClientState.syncEngine = this.syncEngine;

    await this.sharedClientState.start();
    await this.remoteStore.start();
    await this.localStore.start();

    // NOTE: This will immediately call the listener, so we make sure to
    // set it after localStore / remoteStore are started.
    await this.persistence.setPrimaryStateListener(async isPrimary => {
      await this.syncEngine.applyPrimaryState(isPrimary);
      if (this.gcScheduler) {
        if (isPrimary && !this.gcScheduler.started) {
          this.gcScheduler.start(this.localStore);
        } else if (!isPrimary) {
          this.gcScheduler.stop();
        }
      }
    });
  }

  protected abstract createSharedClientState(): SharedClientState;

  protected abstract createPersistence(): Persistence;

  protected abstract createGarbageCollectionScheduler(): GarbageCollectionScheduler | null;

  protected createLocalStore(): LocalStore {
    return new LocalStore(
      this.persistence,
      new IndexFreeQueryEngine(),
      this.initialUser
    );
  }
  protected createSyncEngine(): SyncEngine {
    return new SyncEngine(
      this.localStore,
      this.remoteStore,
      this.sharedClientState,
      this.initialUser,
      this.maxConcurrentLimboResolutions
    );
  }

  protected createEventManager(): EventManager {
    return new EventManager(this.syncEngine);
  }

  protected createRemoteStore(): RemoteStore {
    return new RemoteStore(
      this.localStore,
      this.datastore,
      this.asyncQueue,
      onlineState =>
        this.syncEngine.applyOnlineStateChange(
          onlineState,
          OnlineStateSource.RemoteStore
        ),
      this.platform.newConnectivityMonitor()
    );
  }

  abstract clearPersistence(databaseId: DatabaseInfo): Promise<void>;
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */
export class IndexedDbComponentProvider extends ComponentProvider {
  protected createGarbageCollectionScheduler(): GarbageCollectionScheduler | null {
    debugAssert(
      this.persistence instanceof IndexedDbPersistence,
      'Expected persistence to be of type IndexedDbPersistence'
    );
    const garbageCollector = this.persistence.referenceDelegate
      .garbageCollector;
    return new LruScheduler(garbageCollector, this.asyncQueue);
  }

  protected createPersistence(): Persistence {
    debugAssert(
      this.persistenceSettings.durable,
      'Can only start durable persistence'
    );

    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      this.databaseInfo
    );
    const serializer = this.platform.newSerializer(
      this.databaseInfo.databaseId
    );
    return IndexedDbPersistence.createIndexedDbPersistence({
      allowTabSynchronization: this.persistenceSettings.synchronizeTabs,
      persistenceKey,
      clientId: this.clientId,
      platform: this.platform,
      queue: this.asyncQueue,
      serializer,
      lruParams: LruParams.withCacheSize(
        this.persistenceSettings.cacheSizeBytes
      ),
      sequenceNumberSyncer: this.sharedClientState
    });
  }

  protected createSharedClientState(): SharedClientState {
    debugAssert(
      this.persistenceSettings.durable,
      'Can only start durable persistence'
    );

    if (this.persistenceSettings.synchronizeTabs) {
      if (!WebStorageSharedClientState.isAvailable(this.platform)) {
        throw new FirestoreError(
          Code.UNIMPLEMENTED,
          'IndexedDB persistence is only available on platforms that support LocalStorage.'
        );
      }
      const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
        this.databaseInfo
      );
      return new WebStorageSharedClientState(
        this.asyncQueue,
        this.platform,
        persistenceKey,
        this.clientId,
        this.initialUser
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

const MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE =
  'You are using the memory-only build of Firestore. Persistence support is ' +
  'only available via the @firebase/firestore bundle or the ' +
  'firebase-firestore.js build.';

/**
 * Provides all components needed for Firestore with in-memory persistence.
 */
export class MemoryComponentProvider extends ComponentProvider {
  constructor(
    readonly referenceDelegateFactory: (
      p: MemoryPersistence
    ) => MemoryReferenceDelegate = MemoryEagerDelegate.factory
  ) {
    super();
  }

  protected createGarbageCollectionScheduler(): GarbageCollectionScheduler | null {
    return null;
  }

  protected createPersistence(): Persistence {
    debugAssert(
      !this.persistenceSettings.durable,
      'Can only start memory persistence'
    );
    return new MemoryPersistence(this.clientId, this.referenceDelegateFactory);
  }

  protected createSharedClientState(): SharedClientState {
    return new MemorySharedClientState();
  }

  clearPersistence(): never {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE
    );
  }
}
