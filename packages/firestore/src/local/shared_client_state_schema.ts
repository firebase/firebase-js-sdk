/**
 * @license
 * Copyright 2019 Google LLC
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

import { User } from '../auth/user';
import { BatchId, MutationBatchState, TargetId } from '../core/types';
import { debugAssert } from '../util/assert';

import { ClientId } from './shared_client_state';
import { QueryTargetState } from './shared_client_state_syncer';

// The format of the LocalStorage key that stores the client state is:
//     firestore_clients_<persistence_prefix>_<instance_key>
export const CLIENT_STATE_KEY_PREFIX = 'firestore_clients';

/** Assembles the key for a client state in WebStorage */
export function createWebStorageClientStateKey(
  persistenceKey: string,
  clientId: ClientId
): string {
  debugAssert(
    clientId.indexOf('_') === -1,
    `Client key cannot contain '_', but was '${clientId}'`
  );

  return `${CLIENT_STATE_KEY_PREFIX}_${persistenceKey}_${clientId}`;
}

/**
 * The JSON representation of a clients's metadata as used during WebStorage
 * serialization. The ClientId is omitted here as it is encoded as part of the
 * key.
 */
export interface ClientStateSchema {
  activeTargetIds: number[];
  updateTimeMs: number;
}

// The format of the WebStorage key that stores the mutation state is:
//     firestore_mutations_<persistence_prefix>_<batch_id>
//     (for unauthenticated users)
// or: firestore_mutations_<persistence_prefix>_<batch_id>_<user_uid>
//
// 'user_uid' is last to avoid needing to escape '_' characters that it might
// contain.
export const MUTATION_BATCH_KEY_PREFIX = 'firestore_mutations';

/** Assembles the key for a mutation batch in WebStorage */
export function createWebStorageMutationBatchKey(
  persistenceKey: string,
  user: User,
  batchId: BatchId
): string {
  let mutationKey = `${MUTATION_BATCH_KEY_PREFIX}_${persistenceKey}_${batchId}`;

  if (user.isAuthenticated()) {
    mutationKey += `_${user.uid}`;
  }

  return mutationKey;
}

/**
 * The JSON representation of a mutation batch's metadata as used during
 * WebStorage serialization. The UserId and BatchId is omitted as it is
 * encoded as part of the key.
 */
export interface MutationMetadataSchema {
  state: MutationBatchState;
  error?: { code: string; message: string }; // Only set when state === 'rejected'
  updateTimeMs: number;
}

// The format of the WebStorage key that stores a query target's metadata is:
//     firestore_targets_<persistence_prefix>_<target_id>
export const QUERY_TARGET_KEY_PREFIX = 'firestore_targets';

/** Assembles the key for a query state in WebStorage */
export function createWebStorageQueryTargetMetadataKey(
  persistenceKey: string,
  targetId: TargetId
): string {
  return `${QUERY_TARGET_KEY_PREFIX}_${persistenceKey}_${targetId}`;
}

/**
 * The JSON representation of a query target's state as used during WebStorage
 * serialization. The TargetId is omitted as it is encoded as part of the key.
 */
export interface QueryTargetStateSchema {
  state: QueryTargetState;
  error?: { code: string; message: string }; // Only set when state === 'rejected'
  updateTimeMs: number;
}

// The WebStorage prefix that stores the primary tab's online state. The
// format of the key is:
//     firestore_online_state_<persistence_prefix>
export const ONLINE_STATE_KEY_PREFIX = 'firestore_online_state';

/** Assembles the key for the online state of the primary tab. */
export function createWebStorageOnlineStateKey(persistenceKey: string): string {
  return `${ONLINE_STATE_KEY_PREFIX}_${persistenceKey}`;
}

// The WebStorage prefix that plays as a event to indicate the remote documents
// might have changed due to some secondary tabs loading a bundle.
// format of the key is:
//     firestore_bundle_loaded_v2_<persistenceKey>
// The version ending with "v2" stores the list of modified collection groups.
export const BUNDLE_LOADED_KEY_PREFIX = 'firestore_bundle_loaded_v2';
export function createBundleLoadedKey(persistenceKey: string): string {
  return `${BUNDLE_LOADED_KEY_PREFIX}_${persistenceKey}`;
}

/**
 * The JSON representation of the system's online state, as written by the
 * primary client.
 */
export interface SharedOnlineStateSchema {
  /**
   * The clientId of the client that wrote this onlineState value. Tracked so
   * that on startup, clients can check if this client is still active when
   * determining whether to apply this value or not.
   */
  readonly clientId: string;
  readonly onlineState: string;
}

// The WebStorage key prefix for the key that stores the last sequence number allocated. The key
// looks like 'firestore_sequence_number_<persistence_prefix>'.
export const SEQUENCE_NUMBER_KEY_PREFIX = 'firestore_sequence_number';

/** Assembles the key for the current sequence number. */
export function createWebStorageSequenceNumberKey(
  persistenceKey: string
): string {
  return `${SEQUENCE_NUMBER_KEY_PREFIX}_${persistenceKey}`;
}
