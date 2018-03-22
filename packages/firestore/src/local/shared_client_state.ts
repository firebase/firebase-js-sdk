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
import { BatchId, TargetId } from '../core/types';
import { assert } from '../util/assert';
import { debug, error } from '../util/log';
import { min, primitiveComparator } from '../util/misc';
import { SortedSet } from '../util/sorted_set';
import { isSafeInteger } from '../util/types';
import * as objUtils from '../util/obj';
import { User } from '../auth/user';
import { SharedClientDelegate } from './shared_client_delegate';

const LOG_TAG = 'SharedClientState';

// TODO(multitab): Change prefix of keys to "firestore_" to match IndexedDb.

// The format of the LocalStorage key that stores the client state is:
//     fs_clients_<persistence_prefix>_<instance_key>
const CLIENT_STATE_KEY_PREFIX = 'fs_clients';

// The format of the LocalStorage key that stores the mutation state is:
//     fs_mutations_<persistence_prefix>_<instance_key>
const MUTATION_BATCH_KEY_PREFIX = 'fs_mutations';

/**
 * A randomly-generated key assigned to each Firestore instance at startup.
 */
// TODO(multitab): Rename to ClientId.
export type ClientKey = string;

/**
 * A `SharedClientState` keeps track of the global state of the mutations
 * and query targets for all active clients with the same persistence key (i.e.
 * project ID and FirebaseApp name). It relays local changes to other clients
 * and updates its local state as new state is observed.
 *
 * `SharedClientState` is primarily used for synchronization in Multi-Tab
 * environments. Each tab is responsible for registering its active query
 * targets and mutations. `SharedClientState` will then notify the listener
 * passed to `subscribe()` for updates to mutations and queries that originated
 * in other clients.
 *
 * To receive notifications, both `subscribe()` and `start()` have to be called
 * in order.
 *
 * TODO(multitab): Add callbacks to SyncEngine
 */
export interface SharedClientState {
  /** Associates a new Mutation Batch ID with the current Firestore client. */
  addLocalPendingMutation(batchId: BatchId): void;

  /** Removes a Mutation Batch ID for the current Firestore client. */
  removeLocalPendingMutation(batchId: BatchId): void;

  /**
   * Gets the minimum mutation batch for all active clients.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the
   * number of clients.
   */
  getMinimumGlobalPendingMutation(): BatchId | null;

  /** Associates a new Query Target ID with the current Firestore clients. */
  addLocalQueryTarget(targetId: TargetId): void;

  /** Removes a Query Target ID for the current Firestore clients. */
  removeLocalQueryTarget(targetId: TargetId): void;

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
  start(initialUser: User): Promise<void>;

  /** Shuts down the `SharedClientState` and its listeners. */
  shutdown(): void;
}

// Visible for testing
export type MutationBatchState = 'pending' | 'acknowledged' | 'rejected';

/**
 * The JSON representation of a mutation batch's metadata as used during
 * LocalStorage serialization. The UserId and BatchId is omitted as it is
 * encoded as part of the key.
 */
interface MutationBatchSchema {
  lastUpdateTime: number;
  state: MutationBatchState;
  error?: { code: string; message: string };
}

// Visible for testing
export class RemoteMutationBatch {
  private lastUpdateTime: Date;

  constructor(
    readonly user: User,
    readonly batchId: BatchId,
    readonly state: MutationBatchState,
    readonly error?: FirestoreError
  ) {
    this.lastUpdateTime = new Date();
  }

  /**
   * Parses a RemoteMutationBatch from its JSON representation in LocalStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromLocalStorageEntry(
    user: User,
    batchId: BatchId,
    value: string | null
  ): RemoteMutationBatch | null {
    if (value !== null) {
      const mutationBatch = JSON.parse(value) as MutationBatchSchema;

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
        return new RemoteMutationBatch(
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
    return null;
  }

  toLocalStorageJSON(): string {
    const batchState: MutationBatchSchema = {
      lastUpdateTime: this.lastUpdateTime.getTime(),
      state: this.state
    };

    if (this.error) {
      batchState.error = { code: this.error.code, message: this.error.message };
    }

    return JSON.stringify(batchState);
  }
}

/**
 * The JSON representation of a clients's metadata as used during LocalStorage
 * serialization. The ClientKey is omitted here as it is encoded as part of the
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
  readonly activeTargetIds: SortedSet<TargetId>;
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
    readonly clientId: ClientKey,
    readonly lastUpdateTime: Date,
    readonly activeTargetIds: SortedSet<TargetId>,
    readonly minMutationBatchId: BatchId | null,
    readonly maxMutationBatchId: BatchId | null
  ) {}

  /**
   * Parses a RemoteClientState from the JSON representation in LocalStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromLocalStorageEntry(
    clientKey: string,
    value: string | null
  ): RemoteClientState | null {
    if (value !== null) {
      const clientState = JSON.parse(value) as ClientStateSchema;

      let validData =
        typeof clientState === 'object' &&
        isSafeInteger(clientState.lastUpdateTime) &&
        clientState.activeTargetIds instanceof Array &&
        (clientState.minMutationBatchId === null ||
          isSafeInteger(clientState.minMutationBatchId)) &&
        (clientState.maxMutationBatchId === null ||
          isSafeInteger(clientState.maxMutationBatchId));

      let activeTargetIdsSet = new SortedSet<TargetId>(primitiveComparator);

      for (
        let i = 0;
        validData && i < clientState.activeTargetIds.length;
        ++i
      ) {
        validData = isSafeInteger(clientState.activeTargetIds[i]);
        activeTargetIdsSet = activeTargetIdsSet.add(
          clientState.activeTargetIds[i]
        );
      }

      if (validData) {
        return new RemoteClientState(
          clientKey,
          new Date(clientState.lastUpdateTime),
          activeTargetIdsSet,
          clientState.minMutationBatchId,
          clientState.maxMutationBatchId
        );
      } else {
        error(
          LOG_TAG,
          `Failed to parse client data for instance '${clientKey}': ${value}`
        );
      }
    }
    return null;
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
  activeTargetIds = new SortedSet<TargetId>(primitiveComparator);
  lastUpdateTime: Date;

  private pendingBatchIds = new SortedSet<BatchId>(primitiveComparator);

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
    assert(
      this.pendingBatchIds.has(batchId),
      `Pending Batch ID '${batchId}' not found.`
    );
    this.pendingBatchIds = this.pendingBatchIds.delete(batchId);
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
 * clients and supports modifications of the current client's data.
 */
export class WebStorageSharedClientState implements SharedClientState {
  private readonly storage: Storage;
  private readonly localClientStorageKey: string;
  private readonly activeClients: { [key: string]: ClientState } = {};
  private readonly storageListener = this.handleLocalStorageEvent.bind(this);
  private readonly clientStateKeyRe: RegExp;
  private readonly mutationBatchKeyRe: RegExp;
  private sharedClientDelegate: SharedClientDelegate | null;
  private user: User;
  private started = false;

  constructor(
    private readonly persistenceKey: string,
    private readonly localClientKey: ClientKey
  ) {
    if (!WebStorageSharedClientState.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'LocalStorage is not available on this platform.'
      );
    }
    this.storage = window.localStorage;
    this.localClientStorageKey = this.toLocalStorageClientStateKey(
      this.localClientKey
    );
    this.activeClients[this.localClientKey] = new LocalClientState();
    this.clientStateKeyRe = new RegExp(
      `^${CLIENT_STATE_KEY_PREFIX}_${persistenceKey}_([^_]*)$`
    );
    this.mutationBatchKeyRe = new RegExp(
      `^${MUTATION_BATCH_KEY_PREFIX}_${persistenceKey}_([^_]*)_(\\d*)$`
    );
  }

  /** Returns 'true' if LocalStorage is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  subscribe(sharedClientDelegate: SharedClientDelegate) {
    this.sharedClientDelegate = sharedClientDelegate;
  }

  async start(initialUser: User): Promise<void> {
    assert(!this.started, 'WebStorageSharedClientState already started');
    assert(
      this.sharedClientDelegate !== null,
      'Start() called before subscribing to events'
    );

    // We add the storage observer before we retrieve the list of existing
    // clients to allow us to see LocalStorage notifications for clients
    // that were added before getActiveClients() returns.
    window.addEventListener('storage', this.storageListener);

    this.activeClients[this.localClientKey] = new LocalClientState();
    this.user = initialUser;
    this.persistClientState();
    this.started = true;

    // Retrieve the list of existing clients and backfill the data in
    // SharedClientState.
    let existingClients = await this.sharedClientDelegate.getActiveClients();

    for (const clientKey of existingClients) {
      const storageKey = this.toLocalStorageClientStateKey(clientKey);
      const clientState = RemoteClientState.fromLocalStorageEntry(
        clientKey,
        this.storage.getItem(storageKey)
      );
      if (clientState) {
        this.activeClients[clientState.clientId] = clientState;
      }
    }
  }

  getMinimumGlobalPendingMutation(): BatchId | null {
    let minMutationBatch = null;
    objUtils.forEach(this.activeClients, (key, value) => {
      minMutationBatch = min(minMutationBatch, value.minMutationBatchId);
    });
    return minMutationBatch;
  }

  getAllActiveQueryTargets(): SortedSet<TargetId> {
    let activeTargets = new SortedSet<TargetId>(primitiveComparator);
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

  addLocalQueryTarget(targetId: TargetId): void {
    this.localClientState.addQueryTarget(targetId);
    this.persistClientState();
  }

  removeLocalQueryTarget(targetId: TargetId): void {
    this.localClientState.removeQueryTarget(targetId);
    this.persistClientState();
  }

  shutdown(): void {
    assert(
      this.started,
      'WebStorageSharedClientState.shutdown() called when not started'
    );
    window.removeEventListener('storage', this.storageListener);
    this.storage.removeItem(this.localClientStorageKey);
    this.started = false;
  }

  private handleLocalStorageEvent(event: StorageEvent): void {
    if (!this.started) {
      return;
    }
    if (event.storageArea === this.storage) {
      // TODO(multitab): This assert will likely become invalid as we add garbage
      // collection.
      assert(
        event.key !== this.localClientStorageKey,
        'Received LocalStorage notification for local change.'
      );

      if (event.newValue == null) {
        const clientId = this.fromLocalStorageClientStateKey(event.key);
        if (clientId != null) {
          delete this.activeClients[clientId];
        }
      } else {
        const clientState = this.fromLocalStorageClientState(
          event.key,
          event.newValue
        );
        if (clientState) {
          this.activeClients[clientState.clientId] = clientState;
          return;
        }
        const mutationBatch = this.fromLocalStorageMutation(
          event.key,
          event.newValue
        );
        if (mutationBatch) {
          this.handleMutationBatchEvent(mutationBatch);
          return;
        }
      }
    }
  }

  private get localClientState(): LocalClientState {
    return this.activeClients[this.localClientKey] as LocalClientState;
  }

  private persistClientState(): void {
    // TODO(multitab): Consider rate limiting/combining state updates for
    // clients that frequently update their client state.
    assert(this.started, 'WebStorageSharedClientState used before started.');
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
  ) {
    const mutationState = new RemoteMutationBatch(
      this.user,
      batchId,
      state,
      error
    );

    const mutationKey = `${MUTATION_BATCH_KEY_PREFIX}_${this.persistenceKey}_${
      this.user.uid
    }_${batchId}`;

    this.storage.setItem(mutationKey, mutationState.toLocalStorageJSON());
  }

  /** Assembles the key for a client state in LocalStorage */
  private toLocalStorageClientStateKey(clientKey: string): string {
    assert(
      clientKey.indexOf('_') === -1,
      `Client key cannot contain '_', but was '${clientKey}'`
    );

    return `${CLIENT_STATE_KEY_PREFIX}_${this.persistenceKey}_${clientKey}`;
  }

  /**
   * Parses a client state key in LocalStorage. Returns null if the key does not
   * match the expected key format.
   */
  private fromLocalStorageClientStateKey(key: string): ClientKey | null {
    const match = this.clientStateKeyRe.exec(key);
    return match ? match[1] : null;
  }

  /**
   * Parses a client state in LocalStorage. Returns null if the key does not
   * match the expected key format.
   */
  private fromLocalStorageClientState(
    key: string,
    value: string
  ): RemoteClientState | null {
    const clientId = this.fromLocalStorageClientStateKey(key);
    return clientId != null
      ? RemoteClientState.fromLocalStorageEntry(clientId, value)
      : null;
  }

  /**
   * Parses a mutation batch state in LocalStorage. Returns null if the key does
   * not match the expected key format.
   */
  private fromLocalStorageMutation(
    key: string,
    value: string | null
  ): RemoteMutationBatch | null {
    const match = this.mutationBatchKeyRe.exec(key);

    if (match) {
      const isCurrentUser =
        match[1] === 'null'
          ? this.user.uid === null
          : match[1] === this.user.uid;

      if (isCurrentUser) {
        const batchId = Number(match[2]);
        return RemoteMutationBatch.fromLocalStorageEntry(
          this.user,
          batchId,
          value
        );
      }
    }

    return null;
  }

  private async handleMutationBatchEvent(
    mutationBatch: RemoteMutationBatch
  ): Promise<void> {
    if (mutationBatch.user.uid !== this.user.uid) {
      debug(
        LOG_TAG,
        `Ignoring mutation for non-active user ${mutationBatch.user.uid}`
      );
      return;
    }

    switch (mutationBatch.state) {
      case 'pending':
        return this.sharedClientDelegate.loadPendingBatch(
          mutationBatch.batchId
        );
      case 'acknowledged':
        return this.sharedClientDelegate.applySuccessfulWrite(
          mutationBatch.batchId
        );
      case 'rejected':
        return this.sharedClientDelegate.rejectFailedWrite(
          mutationBatch.batchId,
          mutationBatch.error
        );
      default:
        throw new Error('Not implemented');
    }
  }
}
