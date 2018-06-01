/**
 * Copyright 2017 Google Inc.
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

import { DatabaseId } from '../../../src/core/database_info';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { MemoryPersistence } from '../../../src/local/memory_persistence';
import { SimpleDb } from '../../../src/local/simple_db';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import {
  WebStorageSharedClientState,
  ClientId
} from '../../../src/local/shared_client_state';
import { BatchId, MutationBatchState, TargetId } from '../../../src/core/types';
import { BrowserPlatform } from '../../../src/platform_browser/browser_platform';
import { AsyncQueue } from '../../../src/util/async_queue';
import { User } from '../../../src/auth/user';
import {
  QueryTargetState,
  SharedClientStateSyncer
} from '../../../src/local/shared_client_state_syncer';
import { FirestoreError } from '../../../src/util/error';
import { AutoId } from '../../../src/util/misc';
import { PlatformSupport } from '../../../src/platform/platform';

/** The persistence prefix used for testing in IndexedBD and LocalStorage. */
export const TEST_PERSISTENCE_PREFIX = 'PersistenceTestHelpers';

/** The prefix used by the keys that Firestore writes to Local Storage. */
const LOCAL_STORAGE_PREFIX = 'fs_';

/**
 * Creates and starts an IndexedDbPersistence instance for testing, destroying
 * any previous contents if they existed.
 */
export async function testIndexedDbPersistence(
  queue?: AsyncQueue,
  clientId?: ClientId
): Promise<IndexedDbPersistence> {
  queue = queue || new AsyncQueue();
  clientId = clientId || AutoId.newId();

  const prefix = '${TEST_PERSISTENCE_PREFIX}/';
  await SimpleDb.delete(prefix + IndexedDbPersistence.MAIN_DATABASE);
  const partition = new DatabaseId('project');
  const serializer = new JsonProtoSerializer(partition, {
    useProto3Json: true
  });
  const platform = PlatformSupport.getPlatform();
  const persistence = new IndexedDbPersistence(
    prefix,
    clientId,
    platform,
    queue,
    serializer
  );
  await persistence.start();
  return persistence;
}

/** Creates and starts a MemoryPersistence instance for testing. */
export async function testMemoryPersistence(): Promise<MemoryPersistence> {
  const persistence = new MemoryPersistence(AutoId.newId());
  await persistence.start();
  return persistence;
}

class NoOpSharedClientStateSyncer implements SharedClientStateSyncer {
  constructor(private readonly activeClients: ClientId[]) {}
  async applyBatchState(
    batchId: BatchId,
    state: MutationBatchState,
    error?: FirestoreError
  ): Promise<void> {}
  async applySuccessfulWrite(batchId: BatchId): Promise<void> {}
  async rejectFailedWrite(
    batchId: BatchId,
    err: FirestoreError
  ): Promise<void> {}
  async getActiveClients(): Promise<ClientId[]> {
    return this.activeClients;
  }
  async applyTargetState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): Promise<void> {}
  async applyActiveTargetsChange(
    added: TargetId[],
    removed: TargetId[]
  ): Promise<void> {}
}
/**
 * Populates Web Storage with instance data from a pre-existing client.
 */
export async function populateWebStorage(
  user: User,
  existingClientId: ClientId,
  existingMutationBatchIds: BatchId[],
  existingQueryTargetIds: TargetId[]
): Promise<void> {
  // HACK: Create a secondary client state to seed data into LocalStorage.
  // NOTE: We don't call shutdown() on it because that would delete the data.
  const secondaryClientState = new WebStorageSharedClientState(
    new AsyncQueue(),
    new BrowserPlatform(),
    TEST_PERSISTENCE_PREFIX,
    existingClientId,
    user
  );

  secondaryClientState.syncEngine = new NoOpSharedClientStateSyncer([
    existingClientId
  ]);
  await secondaryClientState.start();

  for (const batchId of existingMutationBatchIds) {
    secondaryClientState.addLocalPendingMutation(batchId);
  }

  for (const targetId of existingQueryTargetIds) {
    secondaryClientState.addLocalQueryTarget(targetId);
  }
}

/**
 * Removes Firestore data (by prefix match) from Local Storage.
 */
export function clearWebStorage(): void {
  for (let i = 0; ; ++i) {
    const key = window.localStorage.key(i);
    if (key === null) {
      break;
    } else if (key.startsWith(LOCAL_STORAGE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
}
