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
  SharedClientState,
  ClientKey
} from '../../../src/local/shared_client_state';
import { BatchId, TargetId } from '../../../src/core/types';
import { BrowserPlatform } from '../../../src/platform_browser/browser_platform';

/** The persistence prefix used for testing in IndexedBD and LocalStorage. */
export const TEST_PERSISTENCE_PREFIX = 'PersistenceTestHelpers';

/** The instance key of the secondary instance in LocalStorage. */
const SECONDARY_INSTANCE_KEY: ClientKey = 'AlternativePersistence';

/** The prefix used by the keys that Firestore writes to Local Storage. */
const LOCAL_STORAGE_PREFIX = 'fs_';

/**
 * Creates and starts an IndexedDbPersistence instance for testing, destroying
 * any previous contents if they existed.
 */
export async function testIndexedDbPersistence(): Promise<
  IndexedDbPersistence
> {
  const prefix = '${TEST_PERSISTENCE_PREFIX}/';
  await SimpleDb.delete(prefix + IndexedDbPersistence.MAIN_DATABASE);
  const partition = new DatabaseId('project');
  const serializer = new JsonProtoSerializer(partition, {
    useProto3Json: true
  });
  const platform = new BrowserPlatform();
  const persistence = new IndexedDbPersistence(prefix, platform, serializer);
  await persistence.start();
  return persistence;
}

/** Creates and starts a MemoryPersistence instance for testing. */
export async function testMemoryPersistence(): Promise<MemoryPersistence> {
  const persistence = new MemoryPersistence();
  await persistence.start();
  return persistence;
}

/**
 * Creates and starts a WebStorageSharedClientState instance for testing,
 * destroying any previous contents in LocalStorage if they existed.
 */
export async function testWebStorageSharedClientState(
  instanceKey: string,
  existingMutationBatchIds: BatchId[],
  existingQueryTargetIds: TargetId[]
): Promise<SharedClientState> {
  let key;
  for (let i = 0; (key = window.localStorage.key(i)) !== null; ++i) {
    if (key.startsWith(LOCAL_STORAGE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }

  const knownInstances = [];

  if (
    existingMutationBatchIds.length > 0 ||
    existingQueryTargetIds.length > 0
  ) {
    // HACK: Create a secondary client state to seed data into LocalStorage.
    // NOTE: We don't call shutdown() on it because that would delete the data.
    const secondaryClientState = new WebStorageSharedClientState(
      TEST_PERSISTENCE_PREFIX,
      SECONDARY_INSTANCE_KEY
    );

    knownInstances.push(SECONDARY_INSTANCE_KEY);

    await secondaryClientState.start([]);

    for (const batchId of existingMutationBatchIds) {
      secondaryClientState.addLocalPendingMutation(batchId);
    }

    for (const targetId of existingQueryTargetIds) {
      secondaryClientState.addLocalQueryTarget(targetId);
    }
  }

  const sharedClientState = new WebStorageSharedClientState(
    TEST_PERSISTENCE_PREFIX,
    instanceKey
  );
  await sharedClientState.start(knownInstances);
  return sharedClientState;
}
