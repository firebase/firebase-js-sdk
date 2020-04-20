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
  PersistenceTransactionMode,
  PrimaryStateListener,
  ReferenceDelegate
} from '../../../src/local/persistence';
import { ClientId } from '../../../src/local/shared_client_state';
import { User } from '../../../src/auth/user';
import { MutationQueue } from '../../../src/local/mutation_queue';
import { TargetCache } from '../../../src/local/target_cache';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { IndexManager } from '../../../src/local/index_manager';
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
 * A test-only persistence implementation that delegates all calls to the
 * underlying IndexedDB or Memory-based persistence implementations and is able
 * to inject transaction failures.
 */
export class MockPersistence implements Persistence {
  injectFailures = false;

  constructor(private readonly delegate: Persistence) {}

  start(): Promise<void> {
    return this.delegate.start();
  }

  get started(): boolean {
    return this.delegate.started;
  }

  get referenceDelegate(): ReferenceDelegate {
    return this.delegate.referenceDelegate;
  }

  shutdown(): Promise<void> {
    return this.delegate.shutdown();
  }

  setDatabaseDeletedListener(
    databaseDeletedListener: () => Promise<void>
  ): void {
    this.delegate.setDatabaseDeletedListener(databaseDeletedListener);
  }

  getActiveClients(): Promise<ClientId[]> {
    debugAssert(
      this.delegate instanceof IndexedDbPersistence,
      `getActiveClients() requires IndexedDbPersistence`
    );
    return this.delegate.getActiveClients();
  }

  getMutationQueue(user: User): MutationQueue {
    return this.delegate.getMutationQueue(user);
  }

  getTargetCache(): TargetCache {
    return this.delegate.getTargetCache();
  }

  getRemoteDocumentCache(): RemoteDocumentCache {
    return this.delegate.getRemoteDocumentCache();
  }

  getIndexManager(): IndexManager {
    return this.delegate.getIndexManager();
  }

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
      return this.delegate.runTransaction(action, mode, transactionOperation);
    }
  }
}

export class MockIndexedDbComponentProvider extends IndexedDbComponentProvider {
  persistence!: MockPersistence;

  createGarbageCollectionScheduler(
    cfg: ComponentConfiguration
  ): GarbageCollectionScheduler | null {
    return null;
  }

  createPersistence(cfg: ComponentConfiguration): Persistence {
    return new MockPersistence(super.createPersistence(cfg));
  }
}

export class MockMemoryComponentProvider extends MemoryComponentProvider {
  persistence!: MockPersistence;

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
    const persistence = new MemoryPersistence(
      this.gcEnabled
        ? MemoryEagerDelegate.factory
        : p => new MemoryLruDelegate(p, LruParams.DEFAULT)
    );
    return new MockPersistence(persistence);
  }
}
