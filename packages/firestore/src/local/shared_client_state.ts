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
import {forEach} from '../util/obj';
import * as objUtils from '../util/obj';

const LOG_TAG = 'SharedClientState';

const FIRESTORE_PREFIX = 'fs';

// The format of an instance key is:
//   fs_clients_<persistence_prefix>_<instance_key>
const CLIENT_KEY_NAMESPACE = 'clients';

/**
 * A randomly-generated key assigned to each Firestore instance at startup.
 */
export type ClientKey = string;

/**
 * The `SharedClientState` keeps track of the global state of the mutations
 * and query targets for all active clients of the current project. It relays
 * local changes to other clients and updates its local state as new metadata is
 * observed.
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

  /** Removes a Mutation Batch ID from the current Firestore client. */
  removeLocalPendingMutation(batchId: BatchId): void;

  /**
   * Gets the minimum mutation batch for all active clients.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the
   * number of clients.
   */
  getMinimumGloballyPendingMutation(): BatchId | null;

  /** Associates a new Query Target ID with the current Firestore clients. */
  addLocallyActiveQueryTarget(targetId: TargetId): void;

  /** Removes a Query Target ID from the current Firestore clients. */
  removeLocallyActiveQueryTarget(targetId: TargetId): void;

  /**
   * Gets the active Query Targets IDs for all active clients.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the size
   * of the result set.
   */
  getGloballyActiveQueryTargets(): SortedSet<TargetId>;

  /**
   * Starts the SharedClientState, reads existing client data for all
   * `knownClients` and registers listeners for newly added clients.
   */
  start(knownClients: ClientKey[]): void;

  /** Shuts down the `SharedClientState` and its listeners. */
  shutdown(): void;
}

/**
 * The JSON representation of a clients's metadata as used in the LocalStorage
 * serialization. The ClientKey is omitted here here as it is encoded as part of
 * the key.
 */
// Visible for testing.
export interface ClientStateSchema {
  lastUpdateTime: number;
  activeTargetIds: number[];
  minMutationBatchId?: number;
  maxMutationBatchId?: number;
}

/**
 * Metadata state of a single client. Includes query targets, as well as minimum
 * and maximum pending mutation batch ids.
 *
 * This class represents the immutable state of a client as read from
 * LocalStorage. It contains the list of all active query targets and the range
 * of the client's pending mutation batch IDs.
 */
class ClientState {
  constructor(
    readonly clientKey: ClientKey,
    public lastUpdateTime: Date,
    public activeTargetIds: SortedSet<TargetId>,
    private readonly _minMutationBatchId: BatchId | null,
    private readonly _maxMutationBatchId: BatchId | null
  ) {}

  get minMutationBatchId(): BatchId | null {
    return this._minMutationBatchId;
  }

  get maxMutationBatchId(): BatchId | null {
    return this._maxMutationBatchId;
  }

  /**
   * Parses a ClientState from its JSON representation in LocalStorage.
   * Logs a warning and returns null if the data could not be parsed.
   */
  static fromLocalStorageEntry(
    clientKey: string,
    value: string
  ): ClientState | null {
    const clientState = JSON.parse(value) as ClientStateSchema;

    let validData =
      typeof clientState === 'object' &&
      isSafeInteger(clientState.lastUpdateTime) &&
      clientState.activeTargetIds instanceof Array &&
      isSafeInteger(clientState.minMutationBatchId) &&
      isSafeInteger(clientState.maxMutationBatchId);

    const activeTargetIdsArray = clientState.activeTargetIds;
    let activeTargetIdsSet = new SortedSet<TargetId>(primitiveComparator);

    for (let i = 0; validData && i < activeTargetIdsArray.length; ++i) {
      validData = isSafeInteger(activeTargetIdsArray[i]);
      activeTargetIdsSet = activeTargetIdsSet.add(activeTargetIdsArray[i]);
    }

    if (validData) {
      return new ClientState(
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
 * Metadata state of the local client. Unlike `ClientState`, this class is
 * mutable and keeps track of all pending mutations, which allows us to
 * update the range of pending mutation batch IDs as new mutations are added or
 * removed.
 *
 * The data in `LocalClientState` is not read from LocalStorage and instead
 * updated via its instance methods. The updated state can be serialized via
 * `toLocalStorageJSON()`.
 */
class LocalClientState extends ClientState {
  private pendingBatchIds = new SortedSet<BatchId>(primitiveComparator);

  constructor(clientKey: ClientKey) {
    super(
      clientKey,
      new Date(),
      new SortedSet<TargetId>(primitiveComparator),
      null,
      null
    );
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
      activeTargetIds: []
    };

    this.activeTargetIds.forEach(targetId => {
      data.activeTargetIds.push(targetId);
    });

    if (this.minMutationBatchId !== null) {
      data.minMutationBatchId = this.minMutationBatchId;
      data.maxMutationBatchId = this.maxMutationBatchId;
    }

    return JSON.stringify(data);
  }
}

/**
 * `WebStorageSynchronizedClientState` uses WebStorage (window.localStorage) as
 * the backing store for the SharedClientState. It keeps track of all active
 * clients and supports modification of the current client's data.
 */
export class WebStorageSynchronizedClientState implements SharedClientState {
  private readonly localStorage: Storage;
  private readonly storageKey: string;
  private readonly activeClients: { [key: string]: ClientState } = {};
  private readonly storageListener = this.handleStorageEvent.bind(this);
  private readonly clientStateRe: RegExp;
  private started = false;

  constructor(private persistenceKey: string, private clientKey: string) {
    this.localStorage = window ? window.localStorage : undefined;
    this.storageKey = toLocalStorageKey(
      CLIENT_KEY_NAMESPACE,
      this.persistenceKey,
      this.clientKey
    );
    this.activeClients[this.clientKey] = new LocalClientState(
      this.clientKey
    );
    this.clientStateRe = new RegExp(
      `^fs_clients_${persistenceKey}_[^_]{20}$`
    );
  }

  /** Returns 'true' if LocalStorage is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  start(knownClients: ClientKey[]): void {
    if (!WebStorageSynchronizedClientState.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'LocalStorage is not available on this platform.'
      );
    }
    assert(!this.started, 'LocalStorageMetadataNotifier already started');

    window.addEventListener('storage', this.storageListener);

    for (const clientKey of knownClients) {
      const storageKey = toLocalStorageKey(
        CLIENT_KEY_NAMESPACE,
        this.persistenceKey,
        clientKey
      );
      const clientState = ClientState.fromLocalStorageEntry(
        clientKey,
        this.localStorage.getItem(storageKey)
      );
      if (clientState) {
        this.activeClients[clientState.clientKey] = clientState;
      }
    }

    this.started = true;
    this.persistState();
  }

  getMinimumGloballyPendingMutation(): BatchId | null {
    let minMutationBatch = null;
    Object.keys(this.activeClients).forEach(key => {
      if (minMutationBatch === null) {
        minMutationBatch = this.activeClients[key].minMutationBatchId;
      } else {
        minMutationBatch = Math.min(
          this.activeClients[key].minMutationBatchId,
          minMutationBatch
        );
      }
    });

    return minMutationBatch;
  }

  getGloballyActiveQueryTargets(): SortedSet<TargetId> {
    let activeTargets = new SortedSet<TargetId>(primitiveComparator);

    Object.keys(this.activeClients).forEach(key => {
      activeTargets = activeTargets.unionWith(
        this.activeClients[key].activeTargetIds
      );
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

  addLocallyActiveQueryTarget(targetId: TargetId): void {
    this.localClientState.addQueryTarget(targetId);
    this.persistState();
  }

  removeLocallyActiveQueryTarget(targetId: TargetId): void {
    this.localClientState.removeQueryTarget(targetId);
    this.persistState();
  }

  shutdown(): void {
    assert(
      this.started,
      'LocalStorageMetadataNotifier.shutdown() called when not started'
    );
    window.removeEventListener('storage', this.storageListener);
    this.localStorage.removeItem(this.storageKey);
    this.started = false;
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (!this.started) {
      return;
    }
    if (event.storageArea === this.localStorage) {
      // TODO(multitab): This assert will likely become invalid as we add garbage
      // collection.
      assert(
        event.key !== this.storageKey,
        'Received LocalStorage notification for local change.'
      );

      const clientKey = fromLocalStorageKey(event.key, this.clientStateRe, 3);
      if (clientKey) {
        if (event.newValue == null) {
          delete this.activeClients[clientKey];
        } else {
          const newClient = ClientState.fromLocalStorageEntry(
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
    assert(this.started, 'LocalStorageMetadataNotifier used before started.');
    debug(LOG_TAG, 'Persisting state in LocalStorage');
    this.localClientState.refreshLastUpdateTime();
    this.localStorage.setItem(
      this.storageKey,
      this.localClientState.toLocalStorageJSON()
    );
  }
}

/** Assembles a key for LocalStorage */
function toLocalStorageKey(...segments: string[]): string {
  segments.forEach(value => {
    assert(
      value.indexOf('_') === -1,
      `Key element cannot contain '_', but was '${value}'`
    );
  });

  return `${FIRESTORE_PREFIX}_${segments.join('_')}`;
}

/**
 * Parses the segments from a key in LocalStorage. Returns null if the key
 * doesn't match the provided regular expression.
 */
function fromLocalStorageKey(
  key: string,
  expectedMatch: RegExp,
  dataSegment: number
): string | null {
  if (!expectedMatch.test(key)) {
    console.log('key didnt match ' + key);
    return null;
  }

  return key.split('_')[dataSegment];
}
