/**
 * @license
 * Copyright 2017 Google LLC
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

import { User } from '../../../src/auth/user';
import { DatabaseId } from '../../../src/core/database_info';
import { SequenceNumberSyncer } from '../../../src/core/listen_sequence';
import {
  BatchId,
  MutationBatchState,
  OnlineState,
  TargetId,
  ListenSequenceNumber
} from '../../../src/core/types';

import {
  indexedDbStoragePrefix,
  indexedDbClearPersistence,
  IndexedDbPersistence,
  MAIN_DATABASE
} from '../../../src/local/indexeddb_persistence';
import { LocalSerializer } from '../../../src/local/local_serializer';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import {
  MemoryEagerDelegate,
  MemoryLruDelegate,
  MemoryPersistence
} from '../../../src/local/memory_persistence';
import {
  ClientId,
  WebStorageSharedClientState
} from '../../../src/local/shared_client_state';
import {
  QueryTargetState,
  SharedClientStateSyncer
} from '../../../src/local/shared_client_state_syncer';
import { SimpleDb } from '../../../src/local/simple_db';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { AsyncQueue } from '../../../src/util/async_queue';
import { FirestoreError } from '../../../src/util/error';
import { AutoId } from '../../../src/util/misc';
import { WindowLike } from '../../../src/util/types';
import { getDocument, getWindow } from '../../../src/platform/dom';

/* eslint-disable no-restricted-globals */

export const MOCK_SEQUENCE_NUMBER_SYNCER: SequenceNumberSyncer = {
  sequenceNumberHandler: null,
  writeSequenceNumber: (sequenceNumber: ListenSequenceNumber) => void {}
};

/** The Database ID used by most tests that use a serializer. */
export const TEST_DATABASE_ID = new DatabaseId('test-project');
export const TEST_PERSISTENCE_KEY = '[PersistenceTestHelpers]';

/** The persistence prefix used for testing in IndexedBD and LocalStorage. */
export const TEST_PERSISTENCE_PREFIX = indexedDbStoragePrefix(
  TEST_DATABASE_ID,
  TEST_PERSISTENCE_KEY
);

/**
 * The database name used by tests that access IndexedDb. To be used in
 * conjunction with `TEST_DATABASE_INFO` and
 * `TEST_DATABASE_ID`.
 */
export const INDEXEDDB_TEST_DATABASE_NAME =
  indexedDbStoragePrefix(TEST_DATABASE_ID, TEST_PERSISTENCE_KEY) +
  MAIN_DATABASE;

const JSON_SERIALIZER = new JsonProtoSerializer(
  TEST_DATABASE_ID,
  /* useProto3Json= */ true
);

/**
 * IndexedDb serializer that uses `TEST_DATABASE_ID` as its database
 * id.
 */
export const TEST_SERIALIZER = new LocalSerializer(JSON_SERIALIZER);

/**
 * Creates and starts an IndexedDbPersistence instance for testing, destroying
 * any previous contents if they existed.
 */
export async function testIndexedDbPersistence(
  options: {
    dontPurgeData?: boolean;
    synchronizeTabs?: boolean;
    queue?: AsyncQueue;
  } = {},
  lruParams: LruParams = LruParams.DEFAULT
): Promise<IndexedDbPersistence> {
  const queue = options.queue || new AsyncQueue();
  const clientId = AutoId.newId();
  const prefix = `${TEST_PERSISTENCE_PREFIX}/`;
  if (!options.dontPurgeData) {
    await SimpleDb.delete(prefix + MAIN_DATABASE);
  }
  const persistence = new IndexedDbPersistence(
    !!options.synchronizeTabs,
    TEST_PERSISTENCE_PREFIX,
    clientId,
    lruParams,
    queue,
    getWindow(),
    getDocument(),
    JSON_SERIALIZER,
    MOCK_SEQUENCE_NUMBER_SYNCER,
    /** forceOwningTab= */ false
  );
  await persistence.start();
  return persistence;
}

/** Creates and starts a MemoryPersistence instance for testing. */
export async function testMemoryEagerPersistence(): Promise<MemoryPersistence> {
  return new MemoryPersistence(MemoryEagerDelegate.factory);
}

export async function testMemoryLruPersistence(
  params: LruParams = LruParams.DEFAULT
): Promise<MemoryPersistence> {
  return new MemoryPersistence(p => new MemoryLruDelegate(p, params));
}

/** Clears the persistence in tests */
export function clearTestPersistence(): Promise<void> {
  return indexedDbClearPersistence(TEST_PERSISTENCE_PREFIX);
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
  applyOnlineStateChange(onlineState: OnlineState): void {}
}
/**
 * Populates Web Storage with instance data from a pre-existing client.
 */
export async function populateWebStorage(
  user: User,
  window: WindowLike,
  existingClientId: ClientId,
  existingMutationBatchIds: BatchId[],
  existingQueryTargetIds: TargetId[]
): Promise<void> {
  // HACK: Create a secondary client state to seed data into LocalStorage.
  // NOTE: We don't call shutdown() on it because that would delete the data.
  const secondaryClientState = new WebStorageSharedClientState(
    window,
    new AsyncQueue(),
    TEST_PERSISTENCE_PREFIX,
    existingClientId,
    user
  );

  secondaryClientState.syncEngine = new NoOpSharedClientStateSyncer([
    existingClientId
  ]);
  secondaryClientState.onlineStateHandler = () => {};
  await secondaryClientState.start();

  for (const batchId of existingMutationBatchIds) {
    secondaryClientState.addPendingMutation(batchId);
  }

  for (const targetId of existingQueryTargetIds) {
    secondaryClientState.addLocalQueryTarget(targetId);
  }
}
