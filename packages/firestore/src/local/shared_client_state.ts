/**
 * Copyright 2018 Google Inc.
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

import { Code, FirestoreError } from '../util/error';
import { BatchId, MutationBatchState, TargetId } from '../core/types';
import { assert } from '../util/assert';
import { debug, error } from '../util/log';
import { min } from '../util/misc';
import { SortedSet } from '../util/sorted_set';
import { isSafeInteger } from '../util/types';
import * as objUtils from '../util/obj';
import { User } from '../auth/user';
import {
  QueryTargetState,
  SharedClientStateSyncer
} from './shared_client_state_syncer';
import { AsyncQueue } from '../util/async_queue';
import { Platform } from '../platform/platform';
import { batchIdSet, TargetIdSet, targetIdSet } from '../model/collections';

const LOG_TAG = 'SharedClientState';

// TODO(multitab): Change prefix of keys to "firestore_" to match IndexedDb.

// The format of the LocalStorage key that stores the client state is:
//     fs_clients_<persistence_prefix>_<instance_key>
const CLIENT_STATE_KEY_PREFIX = 'fs_clients';

// The format of the LocalStorage key that stores the mutation state is:
//     fs_mutations_<persistence_prefix>_<batch_id> (for unauthenticated users)
// or: fs_mutations_<persistence_prefix>_<batch_id>_<user_uid>
//
// 'user_uid' is last to avoid needing to escape '_' characters that it might
// contain.
const MUTATION_BATCH_KEY_PREFIX = 'fs_mutations';

// The format of the LocalStorage key that stores a query target's metadata is:
//     fs_targets_<persistence_prefix>_<target_id>
const QUERY_TARGET_KEY_PREFIX = 'fs_targets';

/**
 * A randomly-generated key assigned to each Firestore instance at startup.
 */
export type ClientId = string;

/**
 * A `SharedClientState` keeps track of the global state of the mutations
 * and query targets for all active clients with the same persistence key (i.e.
 * project ID and FirebaseApp name). It relays local changes to other clients
 * and updates its local state as new state is observed.
 *
 * `SharedClientState` is primarily used for synchronization in Multi-Tab
 * environments. Each tab is responsible for registering its active query
 * targets and mutations. `SharedClientState` will then notify the listener
 * assigned to `.syncEngine` for updates to mutations and queries that
 * originated in other clients.
 *
 * To receive notifications, `.syncEngine` has to be assigned before calling
 * `start()`.
 */
export interface SharedClientState {
  syncEngine: SharedClientStateSyncer | null;

  /** Associates a new Mutation Batch ID with the local Firestore client. */
  addLocalPendingMutation(batchId: BatchId): void;

  /**
   * Removes a Mutation Batch ID from the local Firestore client.
   *
   * This method can be called with Batch IDs that are not associated with this
   * client, in which case no change takes place.
   */
  removeLocalPendingMutation(batchId: BatchId): void;

  /**
   * Verifies whether a Mutation Batch ID is associated with the local client.
   */
  // Visible for testing.
  hasLocalPendingMutation(batchId: BatchId): boolean;

  /**
   * Records that a pending mutation has been acknowledged or rejected.
   * Called by the primary client to notify secondary clients of mutation
   * results as they come back from the backend.
   */
  trackMutationResult(
    batchId: BatchId,
    state: 'acknowledged' | 'rejected',
    error?: FirestoreError
  ): void;

  /**
   * Gets the minimum mutation batch for all active clients.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the
   * number of clients.
   */
  getMinimumGlobalPendingMutation(): BatchId | null;

  /** Associates a new Query Target ID with the local Firestore clients. */
  addLocalQueryTarget(targetId: TargetId): void;

  /** Removes a Query Target ID for the local Firestore clients. */
  removeLocalQueryTarget(targetId: TargetId): void;

  /**
   * Processes an update to a query target.
   *
   * Called by the primary client to notify secondary clients of document
   * changes or state transitions that affect the provided query target.
   */
  trackQueryUpdate(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void;

  /**
   * Gets the active Query Targets IDs for all active clients.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the size
   * of the result set.
   */
  getAllActiveQueryTargets(): SortedSet<TargetId>;

  /**
   * Starts the SharedClientState, reads existing client data and registers
   * listeners for updates to new and existing clients.
   */
  start(): Promise<void>;

  /** Shuts down the `SharedClientState` and its listeners. */
  shutdown(): void;

  /**
   * Changes the active user and removes all existing user-specific data. The
   * user change does not call back into SyncEngine (for example, no mutations
   * will be marked as removed).
   */
  handleUserChange(
    user: User,
    removedBatchIds: BatchId[],
    addedBatchIds: BatchId[]
  ): void;
}

/**
 * The JSON representation of a mutation batch's metadata as used during
 * LocalStorage serialization. The UserId and BatchId is omitted as it is
 * encoded as part of the key.
 */
interface MutationMetadataSchema {
  state: MutationBatchState;
  error?: { code: string; message: string }; // Only set when state === 'rejected'
}

/**
 * Holds the state of a mutation batch, including its user ID, batch ID and
 * whether the batch is 'pending', 'acknowledged' or 'rejected'.
 */
// Visible for testing
export class MutationMetadata {
  constructor(
    readonly user: User,
    readonly batchId: BatchId,
    readonly state: MutationBatchState,
    readonly error?: FirestoreError
  ) {
    assert(
      (error !== undefined) === (state === 'rejected'),
      `MutationMetadata must contain an error iff state is 'rejected'`
    );
  }

  /**
   * Parses a MutationMetadata from its JSON representation in LocalStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromLocalStorageEntry(
    user: User,
    batchId: BatchId,
    value: string
  ): MutationMetadata | null {
    const mutationBatch = JSON.parse(value) as MutationMetadataSchema;

    let validData =
      typeof mutationBatch === 'object' &&
      ['pending', 'acknowledged', 'rejected'].indexOf(mutationBatch.state) !==
        -1 &&
      (mutationBatch.error === undefined ||
        typeof mutationBatch.error === 'object');

    let firestoreError = undefined;

    if (validData && mutationBatch.error) {
      validData =
        typeof mutationBatch.error.message === 'string' &&
        typeof mutationBatch.error.code === 'string';
      if (validData) {
        firestoreError = new FirestoreError(
          mutationBatch.error.code as Code,
          mutationBatch.error.message
        );
      }
    }

    if (validData) {
      return new MutationMetadata(
        user,
        batchId,
        mutationBatch.state,
        firestoreError
      );
    } else {
      error(
        LOG_TAG,
        `Failed to parse mutation state for ID '${batchId}': ${value}`
      );
      return null;
    }
  }

  toLocalStorageJSON(): string {
    const batchMetadata: MutationMetadataSchema = {
      state: this.state
    };

    if (this.error) {
      batchMetadata.error = {
        code: this.error.code,
        message: this.error.message
      };
    }

    return JSON.stringify(batchMetadata);
  }
}

/**
 * The JSON representation of a query target's state as used during LocalStorage
 * serialization. The TargetId is omitted as it is encoded as part of the key.
 */
interface QueryTargetStateSchema {
  lastUpdateTime: number;
  state: QueryTargetState;
  error?: { code: string; message: string }; // Only set when state === 'rejected'
}

/**
 * Holds the state of a query target, including its target ID and whether the
 * target is 'not-current', 'current' or 'rejected'.
 */
// Visible for testing
export class QueryTargetMetadata {
  constructor(
    readonly targetId: TargetId,
    readonly lastUpdateTime: Date,
    readonly state: QueryTargetState,
    readonly error?: FirestoreError
  ) {
    assert(
      (error !== undefined) === (state === 'rejected'),
      `QueryTargetMetadata must contain an error iff state is 'rejected'`
    );
  }

  /**
   * Parses a QueryTargetMetadata from its JSON representation in LocalStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromLocalStorageEntry(
    targetId: TargetId,
    value: string
  ): QueryTargetMetadata | null {
    const targetState = JSON.parse(value) as QueryTargetStateSchema;

    let validData =
      typeof targetState === 'object' &&
      isSafeInteger(targetState.lastUpdateTime) &&
      ['not-current', 'current', 'rejected'].indexOf(targetState.state) !==
        -1 &&
      (targetState.error === undefined ||
        typeof targetState.error === 'object');

    let firestoreError = undefined;

    if (validData && targetState.error) {
      validData =
        typeof targetState.error.message === 'string' &&
        typeof targetState.error.code === 'string';
      if (validData) {
        firestoreError = new FirestoreError(
          targetState.error.code as Code,
          targetState.error.message
        );
      }
    }

    if (validData) {
      return new QueryTargetMetadata(
        targetId,
        new Date(targetState.lastUpdateTime),
        targetState.state,
        firestoreError
      );
    } else {
      error(
        LOG_TAG,
        `Failed to parse target state for ID '${targetId}': ${value}`
      );
      return null;
    }
  }

  toLocalStorageJSON(): string {
    const targetState: QueryTargetStateSchema = {
      lastUpdateTime: this.lastUpdateTime.getTime(),
      state: this.state
    };

    if (this.error) {
      targetState.error = {
        code: this.error.code,
        message: this.error.message
      };
    }

    return JSON.stringify(targetState);
  }
}

/**
 * The JSON representation of a clients's metadata as used during LocalStorage
 * serialization. The ClientId is omitted here as it is encoded as part of the
 * key.
 */
interface ClientStateSchema {
  lastUpdateTime: number;
  activeTargetIds: number[];
  minMutationBatchId: number | null;
  maxMutationBatchId: number | null;
}

/**
 * Metadata state of a single client. Includes query targets, the minimum
 * pending and maximum pending mutation batch ID, as well as the last update
 * time of this state.
 */
// Visible for testing.
export interface ClientState {
  readonly activeTargetIds: TargetIdSet;
  readonly lastUpdateTime: Date;
  readonly maxMutationBatchId: BatchId | null;
  readonly minMutationBatchId: BatchId | null;
}

/**
 * This class represents the immutable ClientState for a client read from
 * LocalStorage. It contains the list of its active query targets and the range
 * of its pending mutation batch IDs.
 */
class RemoteClientState implements ClientState {
  private constructor(
    readonly clientId: ClientId,
    readonly lastUpdateTime: Date,
    readonly activeTargetIds: TargetIdSet,
    readonly minMutationBatchId: BatchId | null,
    readonly maxMutationBatchId: BatchId | null
  ) {}

  /**
   * Parses a RemoteClientState from the JSON representation in LocalStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromLocalStorageEntry(
    clientId: ClientId,
    value: string
  ): RemoteClientState | null {
    const clientState = JSON.parse(value) as ClientStateSchema;

    let validData =
      typeof clientState === 'object' &&
      isSafeInteger(clientState.lastUpdateTime) &&
      clientState.activeTargetIds instanceof Array &&
      (clientState.minMutationBatchId === null ||
        isSafeInteger(clientState.minMutationBatchId)) &&
      (clientState.maxMutationBatchId === null ||
        isSafeInteger(clientState.maxMutationBatchId));

    let activeTargetIdsSet = targetIdSet();

    for (let i = 0; validData && i < clientState.activeTargetIds.length; ++i) {
      validData = isSafeInteger(clientState.activeTargetIds[i]);
      activeTargetIdsSet = activeTargetIdsSet.add(
        clientState.activeTargetIds[i]
      );
    }

    if (validData) {
      return new RemoteClientState(
        clientId,
        new Date(clientState.lastUpdateTime),
        activeTargetIdsSet,
        clientState.minMutationBatchId,
        clientState.maxMutationBatchId
      );
    } else {
      error(
        LOG_TAG,
        `Failed to parse client data for instance '${clientId}': ${value}`
      );
      return null;
    }
  }
}

/**
 * Metadata state of the local client. Unlike `RemoteClientState`, this class is
 * mutable and keeps track of all pending mutations, which allows us to
 * update the range of pending mutation batch IDs as new mutations are added or
 * removed.
 *
 * The data in `LocalClientState` is not read from LocalStorage and instead
 * updated via its instance methods. The updated state can be serialized via
 * `toLocalStorageJSON()`.
 */
// Visible for testing.
export class LocalClientState implements ClientState {
  activeTargetIds = targetIdSet();
  lastUpdateTime: Date;

  private pendingBatchIds = batchIdSet();

  constructor() {
    this.lastUpdateTime = new Date();
  }

  get minMutationBatchId(): BatchId | null {
    return this.pendingBatchIds.first();
  }

  get maxMutationBatchId(): BatchId | null {
    return this.pendingBatchIds.last();
  }

  addPendingMutation(batchId: BatchId): void {
    assert(
      !this.pendingBatchIds.has(batchId),
      `Batch with ID '${batchId}' already pending.`
    );
    this.pendingBatchIds = this.pendingBatchIds.add(batchId);
  }

  removePendingMutation(batchId: BatchId): void {
    this.pendingBatchIds = this.pendingBatchIds.delete(batchId);
  }

  hasLocalPendingMutation(batchId: BatchId): boolean {
    return this.pendingBatchIds.has(batchId);
  }

  addQueryTarget(targetId: TargetId): void {
    assert(
      !this.activeTargetIds.has(targetId),
      `Target with ID '${targetId}' already active.`
    );
    this.activeTargetIds = this.activeTargetIds.add(targetId);
  }

  removeQueryTarget(targetId: TargetId): void {
    assert(
      this.activeTargetIds.has(targetId),
      `Active Target ID '${targetId}' not found.`
    );
    this.activeTargetIds = this.activeTargetIds.delete(targetId);
  }

  /** Sets the update time to the current time. */
  refreshLastUpdateTime(): void {
    this.lastUpdateTime = new Date();
  }

  /**
   * Converts this entry into a JSON-encoded format we can use for LocalStorage.
   * Does not encode `clientId` as it is part of the key in LocalStorage.
   */
  toLocalStorageJSON(): string {
    const data: ClientStateSchema = {
      lastUpdateTime: this.lastUpdateTime.getTime(),
      activeTargetIds: this.activeTargetIds.toArray(),
      minMutationBatchId: this.minMutationBatchId,
      maxMutationBatchId: this.maxMutationBatchId
    };
    return JSON.stringify(data);
  }
}

/**
 * `WebStorageSharedClientState` uses WebStorage (window.localStorage) as the
 * backing store for the SharedClientState. It keeps track of all active
 * clients and supports modifications of the local client's data.
 */
// TODO(multitab): Rename all usages of LocalStorage to WebStorage to better differentiate from LocalClient.
export class WebStorageSharedClientState implements SharedClientState {
  syncEngine: SharedClientStateSyncer | null;

  private readonly storage: Storage;
  private readonly localClientStorageKey: string;
  private readonly activeClients: { [key: string]: ClientState } = {};
  private readonly storageListener = this.handleLocalStorageEvent.bind(this);
  private readonly clientStateKeyRe: RegExp;
  private readonly mutationBatchKeyRe: RegExp;
  private readonly queryTargetKeyRe: RegExp;
  private started = false;
  private currentUser: User;

  /**
   * Captures WebStorage events that occur before `start()` is called. These
   * events are replayed once `WebStorageSharedClientState` is started.
   */
  private earlyEvents: StorageEvent[] = [];

  constructor(
    private readonly queue: AsyncQueue,
    private readonly platform: Platform,
    private readonly persistenceKey: string,
    private readonly localClientId: ClientId,
    initialUser: User
  ) {
    if (!WebStorageSharedClientState.isAvailable(this.platform)) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'LocalStorage is not available on this platform.'
      );
    }
    this.storage = this.platform.window.localStorage;
    this.currentUser = initialUser;
    this.localClientStorageKey = this.toLocalStorageClientStateKey(
      this.localClientId
    );
    this.activeClients[this.localClientId] = new LocalClientState();
    this.clientStateKeyRe = new RegExp(
      `^${CLIENT_STATE_KEY_PREFIX}_${persistenceKey}_([^_]*)$`
    );
    this.mutationBatchKeyRe = new RegExp(
      `^${MUTATION_BATCH_KEY_PREFIX}_${persistenceKey}_(\\d+)(?:_(.*))?$`
    );
    this.queryTargetKeyRe = new RegExp(
      `^${QUERY_TARGET_KEY_PREFIX}_${persistenceKey}_(\\d+)$`
    );

    // Rather than adding the storage observer during start(), we add the
    // storage observer during initialization. This ensures that we collect
    // events before other components populate their initial state (during their
    // respective start() calls). Otherwise, we might for example miss a
    // mutation that is added after LocalStore's start() processed the existing
    // mutations but before we observe WebStorage events.
    this.platform.window.addEventListener('storage', this.storageListener);
  }

  /** Returns 'true' if LocalStorage is available in the current environment. */
  static isAvailable(platform: Platform): boolean {
    return platform.window && platform.window.localStorage != null;
  }

  // TOOD(multitab): Register the mutations that are already pending at client
  // startup.
  async start(): Promise<void> {
    assert(!this.started, 'WebStorageSharedClientState already started');
    assert(
      this.syncEngine !== null,
      'syncEngine property must be set before calling start()'
    );

    // Retrieve the list of existing clients to backfill the data in
    // SharedClientState.
    const existingClients = await this.syncEngine.getActiveClients();

    for (const clientId of existingClients) {
      if (clientId === this.localClientId) {
        continue;
      }

      const storageItem = this.storage.getItem(
        this.toLocalStorageClientStateKey(clientId)
      );
      if (storageItem) {
        const clientState = RemoteClientState.fromLocalStorageEntry(
          clientId,
          storageItem
        );
        if (clientState) {
          this.activeClients[clientState.clientId] = clientState;
        }
      }
    }

    this.persistClientState();

    for (const event of this.earlyEvents) {
      this.handleLocalStorageEvent(event);
    }

    this.earlyEvents = [];
    this.started = true;
  }

  // TODO(multitab): Return BATCHID_UNKNOWN instead of null
  getMinimumGlobalPendingMutation(): BatchId | null {
    let minMutationBatch: number | null = null;
    objUtils.forEach(this.activeClients, (key, value) => {
      minMutationBatch = min(minMutationBatch, value.minMutationBatchId);
    });
    return minMutationBatch;
  }

  getAllActiveQueryTargets(): TargetIdSet {
    let activeTargets = targetIdSet();
    objUtils.forEach(this.activeClients, (key, value) => {
      activeTargets = activeTargets.unionWith(value.activeTargetIds);
    });
    return activeTargets;
  }

  addLocalPendingMutation(batchId: BatchId): void {
    this.localClientState.addPendingMutation(batchId);
    this.persistMutationState(batchId, 'pending');
    this.persistClientState();
  }

  removeLocalPendingMutation(batchId: BatchId): void {
    this.localClientState.removePendingMutation(batchId);
    this.persistClientState();
  }

  hasLocalPendingMutation(batchId: BatchId): boolean {
    return this.localClientState.hasLocalPendingMutation(batchId);
  }

  trackMutationResult(
    batchId: BatchId,
    state: 'acknowledged' | 'rejected',
    error?: FirestoreError
  ): void {
    // Only persist the mutation state if at least one client is still
    // interested in this mutation. The mutation might have already been
    // removed by a client that is no longer active.
    if (batchId >= this.getMinimumGlobalPendingMutation()) {
      this.persistMutationState(batchId, state, error);
    }
  }

  addLocalQueryTarget(targetId: TargetId): void {
    this.localClientState.addQueryTarget(targetId);
    this.persistClientState();
  }

  removeLocalQueryTarget(targetId: TargetId): void {
    this.localClientState.removeQueryTarget(targetId);
    this.persistClientState();
    // TODO(multitab): Remove the query state from Local Storage.
  }

  trackQueryUpdate(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void {
    this.persistQueryTargetState(targetId, state, error);
  }

  handleUserChange(
    user: User,
    removedBatchIds: BatchId[],
    addedBatchIds: BatchId[]
  ): void {
    removedBatchIds.forEach(batchId => {
      this.removeLocalPendingMutation(batchId);
    });
    addedBatchIds.forEach(batchId => {
      this.addLocalPendingMutation(batchId);
    });
    this.currentUser = user;
  }

  shutdown(): void {
    assert(
      this.started,
      'WebStorageSharedClientState.shutdown() called when not started'
    );
    this.platform.window.removeEventListener('storage', this.storageListener);
    this.storage.removeItem(this.localClientStorageKey);
    this.started = false;
  }

  private handleLocalStorageEvent(event: StorageEvent): void {
    if (event.storageArea === this.storage) {
      // TODO(multitab): This assert will likely become invalid as we add garbage
      // collection.
      assert(
        event.key !== this.localClientStorageKey,
        'Received LocalStorage notification for local change.'
      );

      this.queue.enqueue(async () => {
        if (!this.started) {
          this.earlyEvents.push(event);
          return;
        }

        if (this.clientStateKeyRe.test(event.key)) {
          if (event.newValue != null) {
            const clientState = this.fromLocalStorageClientState(
              event.key,
              event.newValue
            );
            if (clientState) {
              return this.handleClientStateEvent(clientState);
            }
          } else {
            const clientId = this.fromLocalStorageClientStateKey(event.key);
            delete this.activeClients[clientId];
          }
        } else if (this.mutationBatchKeyRe.test(event.key)) {
          if (event.newValue !== null) {
            const mutationMetadata = this.fromLocalStorageMutationMetadata(
              event.key,
              event.newValue
            );
            if (mutationMetadata) {
              return this.handleMutationBatchEvent(mutationMetadata);
            }
          }
        } else if (this.queryTargetKeyRe.test(event.key)) {
          if (event.newValue !== null) {
            const queryTargetMetadata = this.fromLocalStorageQueryTargetMetadata(
              event.key,
              event.newValue
            );
            if (queryTargetMetadata) {
              return this.handleQueryTargetEvent(queryTargetMetadata);
            }
          }
        }
      });
    }
  }

  private get localClientState(): LocalClientState {
    return this.activeClients[this.localClientId] as LocalClientState;
  }

  private persistClientState(): void {
    // TODO(multitab): Consider rate limiting/combining state updates for
    // clients that frequently update their client state.
    debug(LOG_TAG, 'Persisting state in LocalStorage');
    this.localClientState.refreshLastUpdateTime();
    this.storage.setItem(
      this.localClientStorageKey,
      this.localClientState.toLocalStorageJSON()
    );
  }

  private persistMutationState(
    batchId: BatchId,
    state: MutationBatchState,
    error?: FirestoreError
  ): void {
    const mutationState = new MutationMetadata(
      this.currentUser,
      batchId,
      state,
      error
    );

    let mutationKey = `${MUTATION_BATCH_KEY_PREFIX}_${
      this.persistenceKey
    }_${batchId}`;

    if (this.currentUser.isAuthenticated()) {
      mutationKey += `_${this.currentUser.uid}`;
    }

    this.storage.setItem(mutationKey, mutationState.toLocalStorageJSON());
  }

  private persistQueryTargetState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void {
    const targetMetadata = new QueryTargetMetadata(
      targetId,
      /* lastUpdateTime= */ new Date(),
      state,
      error
    );

    const targetKey = `${QUERY_TARGET_KEY_PREFIX}_${
      this.persistenceKey
    }_${targetId}`;

    this.storage.setItem(targetKey, targetMetadata.toLocalStorageJSON());
  }

  /** Assembles the key for a client state in LocalStorage */
  private toLocalStorageClientStateKey(clientId: ClientId): string {
    assert(
      clientId.indexOf('_') === -1,
      `Client key cannot contain '_', but was '${clientId}'`
    );

    return `${CLIENT_STATE_KEY_PREFIX}_${this.persistenceKey}_${clientId}`;
  }

  /**
   * Parses a client state key in LocalStorage. Returns null if the key does not
   * match the expected key format.
   */
  private fromLocalStorageClientStateKey(key: string): ClientId | null {
    const match = this.clientStateKeyRe.exec(key);
    return match ? match[1] : null;
  }

  /**
   * Parses a client state in LocalStorage. Returns 'null' if the value could
   * not be parsed.
   */
  private fromLocalStorageClientState(
    key: string,
    value: string
  ): RemoteClientState | null {
    const clientId = this.fromLocalStorageClientStateKey(key);
    assert(clientId !== null, `Cannot parse client state key '${key}'`);
    return RemoteClientState.fromLocalStorageEntry(clientId, value);
  }

  /**
   * Parses a mutation batch state in LocalStorage. Returns 'null' if the value
   * could not be parsed.
   */
  private fromLocalStorageMutationMetadata(
    key: string,
    value: string
  ): MutationMetadata | null {
    const match = this.mutationBatchKeyRe.exec(key);
    assert(match !== null, `Cannot parse mutation batch key '${key}'`);

    const batchId = Number(match[1]);
    const userId = match[2] !== undefined ? match[2] : null;
    return MutationMetadata.fromLocalStorageEntry(
      new User(userId),
      batchId,
      value
    );
  }

  /**
   * Parses a query target state from LocalStorage. Returns 'null' if the value
   * could not be parsed.
   */
  private fromLocalStorageQueryTargetMetadata(
    key: string,
    value: string
  ): QueryTargetMetadata | null {
    const match = this.queryTargetKeyRe.exec(key);
    assert(match !== null, `Cannot parse query target key '${key}'`);

    const targetId = Number(match[1]);
    return QueryTargetMetadata.fromLocalStorageEntry(targetId, value);
  }

  private async handleMutationBatchEvent(
    mutationBatch: MutationMetadata
  ): Promise<void> {
    if (mutationBatch.user.uid !== this.currentUser.uid) {
      debug(
        LOG_TAG,
        `Ignoring mutation for non-active user ${mutationBatch.user.uid}`
      );
      return;
    }

    return this.syncEngine.applyBatchState(
      mutationBatch.batchId,
      mutationBatch.state,
      mutationBatch.error
    );
  }

  private handleQueryTargetEvent(
    targetMetadata: QueryTargetMetadata
  ): Promise<void> {
    return this.syncEngine.applyTargetState(
      targetMetadata.targetId,
      targetMetadata.state,
      targetMetadata.error
    );
  }

  private handleClientStateEvent(
    clientState: RemoteClientState
  ): Promise<void> {
    const existingTargets = this.getAllActiveQueryTargets();

    this.activeClients[clientState.clientId] = clientState;
    const newTargets = this.getAllActiveQueryTargets();

    const addedTargets: TargetId[] = [];
    const removedTargets: TargetId[] = [];

    newTargets.forEach(async targetId => {
      if (!existingTargets.has(targetId)) {
        addedTargets.push(targetId);
      }
    });

    existingTargets.forEach(async targetId => {
      if (!newTargets.has(targetId)) {
        removedTargets.push(targetId);
      }
    });

    return this.syncEngine.applyActiveTargetsChange(
      addedTargets,
      removedTargets
    );
  }
}

/**
 * `MemorySharedClientState` is a simple implementation of SharedClientState for
 * clients using memory persistence. The state in this class remains fully
 * isolated and no synchronization is performed.
 */
export class MemorySharedClientState implements SharedClientState {
  private localState = new LocalClientState();

  syncEngine: SharedClientStateSyncer | null;

  addLocalPendingMutation(batchId: BatchId): void {
    this.localState.addPendingMutation(batchId);
  }

  removeLocalPendingMutation(batchId: BatchId): void {
    this.localState.removePendingMutation(batchId);
  }

  hasLocalPendingMutation(batchId: BatchId): boolean {
    return this.localState.hasLocalPendingMutation(batchId);
  }

  trackMutationResult(
    batchId: BatchId,
    state: 'acknowledged' | 'rejected',
    error?: FirestoreError
  ): void {
    // No op.
  }

  getMinimumGlobalPendingMutation(): BatchId | null {
    return this.localState.minMutationBatchId;
  }

  addLocalQueryTarget(targetId: TargetId): void {
    this.localState.addQueryTarget(targetId);
  }

  trackQueryUpdate(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void {
    // No op.
  }

  removeLocalQueryTarget(targetId: TargetId): void {
    this.localState.removeQueryTarget(targetId);
  }

  getAllActiveQueryTargets(): TargetIdSet {
    return this.localState.activeTargetIds;
  }

  start(): Promise<void> {
    this.localState = new LocalClientState();
    return Promise.resolve();
  }

  handleUserChange(
    user: User,
    removedBatchIds: BatchId[],
    addedBatchIds: BatchId[]
  ): void {
    removedBatchIds.forEach(batchId => {
      this.localState.removePendingMutation(batchId);
    });
    addedBatchIds.forEach(batchId => {
      this.localState.addPendingMutation(batchId);
    });
  }

  shutdown(): void {}
}
