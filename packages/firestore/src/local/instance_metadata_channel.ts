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

const LOG_TAG = 'InstanceMetadataChannel';

const FIRESTORE_PREFIX = 'fs';

// The format of an instance key is:
//   fs_instances_<persistence_prefix>_<instance_key>
const INSTANCE_KEY_NAMESPACE = 'instances';

/**
 * A randomly-generated key assigned to each Firestore instance at startup.
 */
export type InstanceKey = string;

/**
 * The `InstanceMetadataChannel` keeps track of the global state of the
 * mutations and query targets for all active instances of the current project.
 * It relays local changes to other instances and updates its local state as new
 * metadata is observed.
 *
 * `InstanceMetadataChannel` is primarily used for synchronization in Multi-Tab
 * environments. Each tab is responsible for registering its active query
 * targets and mutations. As state changes happen in other clients, the
 * `InstanceMetadataChannel` class will call back into SyncEngine to keep the
 * local state up to date.
 *
 * TODO(multitab): Add callbacks to SyncEngine
 */
export interface InstanceMetadataChannel {
  /** Associates a new Mutation Batch ID with the current Firestore instance. */
  addLocalPendingMutation(batchId: BatchId): void;

  /** Removes a Mutation Batch ID from the current Firestore instance. */
  removeLocalPendingMutation(batchId: BatchId): void;

  /**
   * Gets the minimum mutation batch for all active instances.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the
   * number of instances.
   */
  getMinimumGloballyPendingMutation(): BatchId | null;

  /** Associates a new Query Target ID with the current Firestore instance. */
  addLocallyActiveQueryTarget(targetId: TargetId): void;

  /** Removes a Query Target ID from the current Firestore instance. */
  removeLocallyActiveQueryTarget(targetId: TargetId): void;

  /**
   * Gets the active Query Targets IDs for all active instances.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the size
   * of the result set.
   */
  getGloballyActiveQueryTargets(): SortedSet<TargetId>;

  /**
   * Starts the InstanceMetadataChannel, reads existing instance data for all
   * `knownInstances` and registers listeners for newly added instances.
   */
  start(knownInstances: InstanceKey[]): void;

  /** Shuts down the `InstanceMetadataChannel` and its listeners. */
  shutdown(): void;
}

/**
 * The JSON representation of an instances's metadata as used in the
 * LocalStorage serialization. The InstanceKey is omitted here here as it is
 * encoded as part of the key.
 */
export interface InstanceStateSchema {
  // Visible for testing.
  lastUpdateTime: number;
  activeTargetIds: number[];
  minMutationBatchId?: number;
  maxMutationBatchId?: number;
}

/**
 * Metadata state of a single instance. Includes query targets, as well as
 * minimum and maximum pending mutation batch ids.
 *
 * This class represents the immutable state of an another instance as read from
 * LocalStorage. It contains the list of all active query targets and the range
 * of the instance's pending mutation batch IDs.
 */
class InstanceState {
  constructor(
    readonly instanceKey: InstanceKey,
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
   * Parses an InstanceState from its JSON representation in LocalStorage.
   * Logs a warning and returns null if the data could not be parsed.
   */
  static fromLocalStorageEntry(
    instanceKey: string,
    value: string
  ): InstanceState | null {
    const instanceData = JSON.parse(value) as InstanceStateSchema;

    let validData =
      typeof instanceData === 'object' &&
      isSafeInteger(instanceData.lastUpdateTime) &&
      instanceData.activeTargetIds instanceof Array &&
      isSafeInteger(instanceData.minMutationBatchId) &&
      isSafeInteger(instanceData.maxMutationBatchId);

    let activeTargetIdsArray = instanceData.activeTargetIds;
    let activeTargetIdsSet = new SortedSet<TargetId>(primitiveComparator);

    for (let i = 0; validData && i < activeTargetIdsArray.length; ++i) {
      validData = isSafeInteger(activeTargetIdsArray[i]);
      activeTargetIdsSet = activeTargetIdsSet.add(activeTargetIdsArray[i]);
    }

    if (validData) {
      return new InstanceState(
        instanceKey,
        new Date(instanceData.lastUpdateTime),
        activeTargetIdsSet,
        instanceData.minMutationBatchId,
        instanceData.maxMutationBatchId
      );
    }

    error(
      LOG_TAG,
      `Failed to parse instance metadata for instance '${instanceKey}'`
    );
    return null;
  }
}

/**
 * Instance state of the local instance. Unlike `InstanceState`, this class
 * is mutable and keeps track of all pending mutations, which allows us to
 * update the range of pending mutation batch IDs as new mutations are added or
 * removed.
 *
 * The data in `LocalInstanceState` is not read from LocalStorage and instead
 * updated via its instance methods. The updated state can be serialized via
 * `toLocalStorageJSON()`.
 */
class LocalInstanceState extends InstanceState {
  private pendingBatchIds = new SortedSet<BatchId>(primitiveComparator);

  constructor(instanceKey: InstanceKey) {
    super(
      instanceKey,
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
   * Does not encode `instanceKey` as it is part of the key in LocalStorage.
   */
  toLocalStorageJSON(): string {
    const data: InstanceStateSchema = {
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
 * `WebStorageMetadataChannel` uses WebStorage (window.localStorage) as the
 * backing store for the InstanceMetadataChannel. It keeps track of all active
 * instances and supports modification of the current instance's data.
 */
export class WebStorageMetadataChannel implements InstanceMetadataChannel {
  private readonly localStorage: Storage;
  private readonly storageKey: string;
  private readonly activeInstances: { [key: string]: InstanceState } = {};
  private readonly storageListener = this.handleStorageEvent.bind(this);
  private readonly instanceKeyRe: RegExp;
  private started = false;

  constructor(private persistenceKey: string, private instanceKey: string) {
    this.localStorage = window ? window.localStorage : undefined;
    this.storageKey = toLocalStorageKey(
      INSTANCE_KEY_NAMESPACE,
      this.persistenceKey,
      this.instanceKey
    );
    this.activeInstances[this.instanceKey] = new LocalInstanceState(
      this.instanceKey
    );
    this.instanceKeyRe = new RegExp(
      `^fs_instances_${persistenceKey}_[^_]{20}$`
    );
  }

  /** Returns 'true' if LocalStorage is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  start(knownInstances: InstanceKey[]): void {
    if (!WebStorageMetadataChannel.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'LocalStorage is not available on this platform.'
      );
    }
    assert(!this.started, 'LocalStorageMetadataNotifier already started');

    window.addEventListener('storage', this.storageListener);

    for (const instanceKey of knownInstances) {
      const storageKey = toLocalStorageKey(
        INSTANCE_KEY_NAMESPACE,
        this.persistenceKey,
        instanceKey
      );
      const instanceState = InstanceState.fromLocalStorageEntry(
        instanceKey,
        this.localStorage.getItem(storageKey)
      );
      if (instanceState) {
        this.activeInstances[instanceState.instanceKey] = instanceState;
      }
    }

    this.started = true;
    this.persistState();
  }

  getMinimumGloballyPendingMutation(): BatchId | null {
    let minMutationBatch = null;
    Object.keys(this.activeInstances).forEach(key => {
      if (minMutationBatch === null) {
        minMutationBatch = this.activeInstances[key].minMutationBatchId;
      } else {
        minMutationBatch = Math.min(
          this.activeInstances[key].minMutationBatchId,
          minMutationBatch
        );
      }
    });

    return minMutationBatch;
  }

  getGloballyActiveQueryTargets(): SortedSet<TargetId> {
    let activeTargets = new SortedSet<TargetId>(primitiveComparator);

    Object.keys(this.activeInstances).forEach(key => {
      activeTargets = activeTargets.unionWith(
        this.activeInstances[key].activeTargetIds
      );
    });

    return activeTargets;
  }

  addLocalPendingMutation(batchId: BatchId): void {
    this.localInstanceState.addPendingMutation(batchId);
    this.persistState();
  }

  removeLocalPendingMutation(batchId: BatchId): void {
    this.localInstanceState.removePendingMutation(batchId);
    this.persistState();
  }

  addLocallyActiveQueryTarget(targetId: TargetId): void {
    this.localInstanceState.addQueryTarget(targetId);
    this.persistState();
  }

  removeLocallyActiveQueryTarget(targetId: TargetId): void {
    this.localInstanceState.removeQueryTarget(targetId);
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

      const instanceKey = fromLocalStorageKey(event.key, this.instanceKeyRe, 3);
      if (instanceKey) {
        if (event.newValue == null) {
          delete this.activeInstances[instanceKey];
        } else {
          const newInstance = InstanceState.fromLocalStorageEntry(
            instanceKey,
            event.newValue
          );
          if (newInstance) {
            this.activeInstances[newInstance.instanceKey] = newInstance;
          }
        }
      }
    }
  }

  private get localInstanceState(): LocalInstanceState {
    return this.activeInstances[this.instanceKey] as LocalInstanceState;
  }

  private persistState(): void {
    assert(this.started, 'LocalStorageMetadataNotifier used before started.');
    debug(LOG_TAG, 'Persisting state in LocalStorage');
    this.localInstanceState.refreshLastUpdateTime();
    this.localStorage.setItem(
      this.storageKey,
      this.localInstanceState.toLocalStorageJSON()
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
 * doesn't match the provided regular expression. */
function fromLocalStorageKey(
  key: string,
  expectedMatch: RegExp,
  dataSegement: number
): string | null {
  if (!expectedMatch.test(key)) {
    console.log('key didnt match ' + key);
    return null;
  }

  return key.split('_')[dataSegement];
}
