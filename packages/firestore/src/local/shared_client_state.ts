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
import { primitiveComparator } from '../util/misc';
import { SortedSet } from '../util/sorted_set';
import { isSafeInteger } from '../util/types';
import * as objUtils from '../util/obj';

const LOG_TAG = 'SharedClientState';

// The format of the LocalStorage key storing the client state is:
//     fs_clients_<persistence_prefix>_<instance_key>
const CLIENT_STATE_KEY_PREFIX = 'fs_clients';

/**
 * A randomly-generated key assigned to each Firestore instance at startup.
 */
export type ClientKey = string;

/**
 * The `SharedClientState` keeps track of the global state of the mutations
 * and query targets for all active clients with the same persistence key (i.e.
 * project ID and FirebaseApp name). It relays local changes to other clients
 * and updates its local state as new state is observed.
 *
 * `SharedClientState` is primarily used for synchronization in Multi-Tab
 * environments. Each tab is responsible for registering its active query
 * targets and mutations. As state changes happen in other clients, the
 * `SharedClientState` class will call back into SyncEngine to keep the
 * local state up to date.
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
   * Starts the SharedClientState, reads existing client data for all
   * `knownClients` and registers listeners for updates to new and existing
   * clients.
   */
  start(knownClients: ClientKey[]): void;

  /** Shuts down the `SharedClientState` and its listeners. */
  shutdown(): void;
}

/**
 * The JSON representation of a clients's metadata as used in the LocalStorage
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
  constructor(
    readonly clientKey: ClientKey,
    public lastUpdateTime: Date,
    public activeTargetIds: SortedSet<TargetId>,
    readonly minMutationBatchId: BatchId | null,
    readonly maxMutationBatchId: BatchId | null
  ) {}

  /**
   * Parses a ClientState from the JSON representation in LocalStorage.
   * Logs a warning and returns null if the data could not be parsed.
   */
  static fromLocalStorageEntry(
    clientKey: string,
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

    let activeTargetIdsSet = new SortedSet<TargetId>(primitiveComparator);

    for (let i = 0; validData && i < clientState.activeTargetIds.length; ++i) {
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
    }

    error(
      LOG_TAG,
      `Failed to parse client data for instance '${clientKey}': ${value}`
    );
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
   * Does not encode `clientKey` as it is part of the key in LocalStorage.
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
 *  backing store for the SharedClientState. It keeps track of all active
 * clients and supports modifications of the current client's data.
 */
export class WebStorageSharedClientState implements SharedClientState {
  private readonly storage: Storage;
  private readonly storageKey: string;
  private readonly activeClients: { [key: string]: ClientState } = {};
  private readonly storageListener = this.handleStorageEvent.bind(this);
  private readonly clientStateKeyRe: RegExp;
  private started = false;

  constructor(private persistenceKey: string, private clientKey: string) {
    if (!WebStorageSharedClientState.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'LocalStorage is not available on this platform.'
      );
    }
    this.storage = window.localStorage;
    this.storageKey = this.toLocalStorageClientKey(this.clientKey);
    this.activeClients[this.clientKey] = new LocalClientState();
    this.clientStateKeyRe = new RegExp(
      `^${CLIENT_STATE_KEY_PREFIX}_${persistenceKey}_([^_]*)$`
    );
  }

  /** Returns 'true' if LocalStorage is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  start(knownClients: ClientKey[]): void {
    assert(!this.started, 'WebStorageSharedClientState already started');
    window.addEventListener('storage', this.storageListener);

    for (const clientKey of knownClients) {
      const storageKey = this.toLocalStorageClientKey(clientKey);
      const clientState = RemoteClientState.fromLocalStorageEntry(
        clientKey,
        this.storage.getItem(storageKey)
      );
      if (clientState) {
        this.activeClients[clientState.clientKey] = clientState;
      }
    }

    this.started = true;
    this.persistState();
  }

  getMinimumGlobalPendingMutation(): BatchId | null {
    let minMutationBatch = null;
    objUtils.forEach(this.activeClients, (key, value) => {
      if (minMutationBatch === null) {
        minMutationBatch = value.minMutationBatchId;
      } else {
        minMutationBatch = Math.min(value.minMutationBatchId, minMutationBatch);
      }
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
    this.persistState();
  }

  removeLocalPendingMutation(batchId: BatchId): void {
    this.localClientState.removePendingMutation(batchId);
    this.persistState();
  }

  addLocalQueryTarget(targetId: TargetId): void {
    this.localClientState.addQueryTarget(targetId);
    this.persistState();
  }

  removeLocalQueryTarget(targetId: TargetId): void {
    this.localClientState.removeQueryTarget(targetId);
    this.persistState();
  }

  shutdown(): void {
    assert(
      this.started,
      'WebStorageSharedClientState.shutdown() called when not started'
    );
    window.removeEventListener('storage', this.storageListener);
    this.storage.removeItem(this.storageKey);
    this.started = false;
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (!this.started) {
      return;
    }
    if (event.storageArea === this.storage) {
      // TODO(multitab): This assert will likely become invalid as we add garbage
      // collection.
      assert(
        event.key !== this.storageKey,
        'Received LocalStorage notification for local change.'
      );
      const clientKey = this.fromLocalStorageClientKey(event.key);
      if (clientKey) {
        if (event.newValue == null) {
          delete this.activeClients[clientKey];
        } else {
          const newClient = RemoteClientState.fromLocalStorageEntry(
            clientKey,
            event.newValue
          );
          if (newClient) {
            this.activeClients[newClient.clientKey] = newClient;
          }
        }
      }
    }
  }

  private get localClientState(): LocalClientState {
    return this.activeClients[this.clientKey] as LocalClientState;
  }

  private persistState(): void {
    // TODO(multitab): Consider rate limiting/combining state updates for
    // clients that frequently update their client state.
    assert(this.started, 'WebStorageSharedClientState used before started.');
    debug(LOG_TAG, 'Persisting state in LocalStorage');
    this.localClientState.refreshLastUpdateTime();
    this.storage.setItem(
      this.storageKey,
      this.localClientState.toLocalStorageJSON()
    );
  }

  /** Assembles the key for a client state in LocalStorage */
  private toLocalStorageClientKey(clientKey: string): string {
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
  private fromLocalStorageClientKey(key: string): string | null {
    const match = this.clientStateKeyRe.exec(key);
    return match ? match[1] : null;
  }
}
