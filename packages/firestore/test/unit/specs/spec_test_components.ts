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
  ComponentConfiguration,
  IndexedDbComponentProvider,
  MemoryComponentProvider
} from '../../../src/core/component_provider';
import {
  GarbageCollectionScheduler,
  Persistence,
  PersistenceTransaction,
  PersistenceTransactionMode
} from '../../../src/local/persistence';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { debugAssert } from '../../../src/util/assert';
import {
  MemoryEagerDelegate,
  MemoryLruDelegate,
  MemoryPersistence
} from '../../../src/local/memory_persistence';
import { LruParams } from '../../../src/local/lru_garbage_collector';

/**
 * A test-only MemoryPersistence implementation that is able to inject
 * transaction failures.
 */
export class MockMemoryPersistence extends MemoryPersistence {
  injectFailures = false;

  runTransaction<T>(
    action: string,
    mode: PersistenceTransactionMode,
    transactionOperation: (
      transaction: PersistenceTransaction
    ) => PersistencePromise<T>
  ): Promise<T> {
    if (this.injectFailures) {
      return Promise.reject(new Error('Injected Failure'));
    } else {
      return super.runTransaction(action, mode, transactionOperation);
    }
  }
}

/**
 * A test-only IndexedDbPersistence implementation that is able to inject
 * transaction failures.
 */
export class MockIndexedDbPersistence extends IndexedDbPersistence {
  injectFailures = false;

  runTransaction<T>(
    action: string,
    mode: PersistenceTransactionMode,
    transactionOperation: (
      transaction: PersistenceTransaction
    ) => PersistencePromise<T>
  ): Promise<T> {
    if (this.injectFailures) {
      return Promise.reject(new Error('Injected Failure'));
    } else {
      return super.runTransaction(action, mode, transactionOperation);
    }
  }
}

export class MockIndexedDbComponentProvider extends IndexedDbComponentProvider {
  persistence!: MockIndexedDbPersistence;

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    return null;
  }

  createPersistence(cfg: ComponentConfiguration): MockIndexedDbPersistence {
    debugAssert(
      cfg.persistenceSettings.durable,
      'Can only start durable persistence'
    );

    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      cfg.databaseInfo
    );
    const serializer = cfg.platform.newSerializer(cfg.databaseInfo.databaseId);

    return new MockIndexedDbPersistence(
      /* allowTabSynchronization= */ true,
      persistenceKey,
      cfg.clientId,
      cfg.platform,
      LruParams.withCacheSize(cfg.persistenceSettings.cacheSizeBytes),
      cfg.asyncQueue,
      serializer,
      this.sharedClientState
    );
  }
}

export class MockMemoryComponentProvider extends MemoryComponentProvider {
  persistence!: MockMemoryPersistence;

  constructor(private readonly gcEnabled: boolean) {
    super();
  }

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    return null;
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    debugAssert(
      !cfg.persistenceSettings.durable,
      'Can only start memory persistence'
    );
    return new MockMemoryPersistence(
      this.gcEnabled
        ? MemoryEagerDelegate.factory
        : p => new MemoryLruDelegate(p, LruParams.DEFAULT)
    );
  }
}
