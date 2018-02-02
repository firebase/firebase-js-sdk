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
import { BatchId, InstanceKey, TargetId } from '../core/types';
import { assert } from '../util/assert';
import { debug, error } from '../util/log';
import { primitiveComparator } from '../util/misc';
import { SortedSet } from '../util/sorted_set';
import {
  validateNamedArray,
  validateNamedOptionalType,
  validateNamedType
} from '../util/input_validation';
import { StringMap } from '../util/types';

// Prefix keys used in WebStorage.
const FIRESTORE_PREFIX = 'fs';
const INSTANCE_ROW_PREFIX = 'instances';

const LOG_TAG = 'TabNotificationChannel';

/**
 * WebStorage of the Firestore client.
 *
 * Firestore uses WebStorage for cross-tab notifications to propagate the
 * state of pending mutation batches and query targets. All Firestore tabs are
 * responsible for persisting their instance state as their in-memory state
 * changes. Primary tabs will further update the state of each mutation batch
 * and query target.
 */
export interface TabNotificationChannel {
  /** Associates a new Mutation Batch with the current Firestore instance. */
  addPendingMutation(batchId: BatchId): void;

  /** Removes a Mutation Batch from the current Firestore instance .*/
  removePendingMutation(batchId: BatchId): void;

  /** Gets the minimum mutation batch for all active instances. */
  getMinPendingMutation(): BatchId | null;

  /** Associates a new Query Target with the current Firestore instance. */
  addActiveQueryTarget(targetId: TargetId): void;

  /** Removes a new Query Target from the current Firestore instance. */
  removeActiveQueryTarget(targetId: TargetId): void;

  /** Gets the active query targets for all active instances. */
  getAllActiveQueryTargets(): Set<TargetId>;

  /**
   * Starts the TabNotificationChannel,  reads existing instance data for all
   * `knownInstances` and registers listeners for newly added instances.
   */
  start(knownInstances: InstanceKey[]): void;

  /** Shutdown the `TabNotificationChannel` and its listeners. */
  shutdown(): void;
}

// Visible for testing
export interface InstanceStateSchema {
  instanceKey?: string;
  updateTime: number;
  activeTargets: number[];
  minMutationBatch?: number;
  maxMutationBatch?: number;
}

/**
 * Metadata state of an instance. Includes query targets and minumum and
 * maximum pending mutation batch ids,
 */
class InstanceState {
  constructor(
    readonly instanceKey: InstanceKey,
    public updateTime: Date,
    readonly activeTargets: Set<TargetId>,
    private readonly _minMutationBatch?: BatchId,
    private readonly _maxMutationBatch?: BatchId
  ) {}

  get minMutationBatch(): BatchId | null {
    return this._minMutationBatch !== undefined ? this._minMutationBatch : null;
  }

  get maxMutationBatch(): BatchId | null {
    return this._maxMutationBatch !== undefined ? this._maxMutationBatch : null;
  }

  /**
   * Parses an InstanceState from JSON. Throws if the value is not valid.
   */
  static fromJSON(json: string): InstanceState {
    const instanceData = JSON.parse(json) as InstanceStateSchema;
    const instanceId: InstanceKey = validateNamedType(
      'InstanceState.fromJSON',
      'string',
      'instanceKey',
      instanceData.instanceKey
    );
    const updateTime = new Date(
      validateNamedType(
        'InstanceState.fromJSON',
        'number',
        'updateTime',
        instanceData.updateTime
      )
    );
    const activeTargets = new Set<TargetId>(
      validateNamedArray(
        'InstanceState.fromJSON',
        instanceData.activeTargets,
        'activeTargets'
      )
    );
    const minMutationBatch: number | undefined = validateNamedOptionalType(
      'InstanceState.fromJSON',
      'number',
      'minMutationBatch',
      instanceData.minMutationBatch
    );
    const maxMutationBatch: number | undefined = validateNamedOptionalType(
      'InstanceState.fromJSON',
      'number',
      'maxMutationBatch',
      instanceData.minMutationBatch
    );

    return new InstanceState(
      instanceId,
      updateTime,
      activeTargets,
      minMutationBatch,
      maxMutationBatch
    );
  }
}

/**
 * Instance state of the local instance. Keeps track of all pending mutations.
 */
class LocalInstanceState extends InstanceState {
  private pendingBatches = new SortedSet<BatchId>(primitiveComparator);

  constructor(instanceId: InstanceKey) {
    super(instanceId, new Date(), new Set<TargetId>(), null, null);
  }

  get minMutationBatch(): BatchId | null {
    return this.pendingBatches.first();
  }

  get maxMutationBatch(): BatchId | null {
    return this.pendingBatches.last();
  }

  addPendingMutation(batchId: BatchId): void {
    assert(
      !this.pendingBatches.has(batchId),
      `Batch with ID '${batchId}' already pending.`
    );
    this.pendingBatches = this.pendingBatches.add(batchId);
  }

  removePendingMutation(batchId: BatchId): void {
    assert(
      this.pendingBatches.has(batchId),
      `Pending Batch ID '${batchId}' not found.`
    );
    this.pendingBatches = this.pendingBatches.delete(batchId);
  }

  addQueryTarget(targetId: TargetId): void {
    assert(
      !this.activeTargets.has(targetId),
      `Target with ID '${targetId}' already active.`
    );
    this.activeTargets.add(targetId);
  }

  removeQueryTarget(targetId: TargetId): void {
    assert(
      this.activeTargets.has(targetId),
      `Active Target ID '${targetId}' not found.`
    );
    this.activeTargets.delete(targetId);
  }

  /** Sets the update time to the current time. */
  markCurrent(): void {
    this.updateTime = new Date();
  }

  toJSON(): string {
    const activeTargets = [];
    this.activeTargets.forEach(value => activeTargets.push(value));

    const data: InstanceStateSchema = {
      instanceKey: this.instanceKey,
      updateTime: this.updateTime.getTime(),
      activeTargets: Array.from(this.activeTargets)
    };

    if (this.minMutationBatch !== null) {
      data.minMutationBatch = this.minMutationBatch;
      data.maxMutationBatch = this.maxMutationBatch;
    }

    return JSON.stringify(data);
  }
}

/**
 * `LocalStorageNotificationChannel` uses LocalStorage as the backing store for
 * the TabNotificationChannel.
 */
export class LocalStorageNotificationChannel implements TabNotificationChannel {
  private activeInstances = new Map<InstanceKey, InstanceState>();
  private localStorage: Storage;
  private started = false;
  private currentInstanceKey: string;

  private storageListener = event => {
    if (!this.started) {
      return;
    }
    if (event.newValue == null) {
      const oldInstance = this.parseInstanceRow(event.oldValue);
      if (oldInstance) {
        this.activeInstances.delete(oldInstance.instanceKey);
      }
    } else {
      const newInstance = this.parseInstanceRow(event.newValue);
      if (newInstance) {
        this.activeInstances.set(newInstance.instanceKey, newInstance);
      }
    }
  };

  constructor(private persistenceKey: string, private instanceId: string) {
    this.currentInstanceKey = this.buildKey(
      INSTANCE_ROW_PREFIX,
      this.persistenceKey,
      this.instanceId
    );
    this.activeInstances.set(
      this.instanceId,
      new LocalInstanceState(this.instanceId)
    );
  }

  /** Returns true if LocalStorage is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  private parseInstanceRow(json: string): InstanceState | null {
    try {
      return InstanceState.fromJSON(json);
    } catch (err) {
      error(`Unable to parse LocalStorage row: ${json}`, err.message);
      return null;
    }
  }

  private get localInstanceState(): LocalInstanceState {
    return this.activeInstances.get(this.instanceId) as LocalInstanceState;
  }

  getMinPendingMutation(): BatchId | null {
    let minMutationBatch = null;
    this.activeInstances.forEach(instanceRow => {
      if (minMutationBatch === null) {
        minMutationBatch = instanceRow.minMutationBatch;
      } else {
        minMutationBatch = Math.min(
          instanceRow.minMutationBatch,
          minMutationBatch
        );
      }
    });

    return minMutationBatch;
  }

  getAllActiveQueryTargets(): Set<TargetId> {
    const activeTargets = new Set<TargetId>();

    this.activeInstances.forEach(instanceRow => {
      instanceRow.activeTargets.forEach(value => activeTargets.add(value));
    });

    return activeTargets;
  }

  start(knownInstances: InstanceKey[]): void {
    if (!LocalStorageNotificationChannel.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'LocalStorage is not available on this platform.'
      );
    }
    assert(!this.started, 'LocalStorageNotificationChannel already started');
    this.localStorage = window.localStorage;

    window.addEventListener('storage', this.storageListener);

    for (const instanceId of knownInstances) {
      const storageKey = this.buildKey(
        INSTANCE_ROW_PREFIX,
        this.persistenceKey,
        instanceId
      );
      const instanceState = this.parseInstanceRow(
        this.localStorage.getItem(storageKey)
      );
      if (instanceState) {
        this.activeInstances.set(instanceState.instanceKey, instanceState);
      }
    }

    this.started = true;
    this.persistState();
  }

  shutdown(): void {
    assert(
      this.started,
      'LocalStorageNotificationChannel.shutdown() called when not started'
    );
    window.removeEventListener('storage', this.storageListener);
    this.localStorage.removeItem(this.currentInstanceKey);
    this.started = false;
  }

  addPendingMutation(batchId: BatchId): void {
    this.localInstanceState.addPendingMutation(batchId);
    this.persistState();
  }

  removePendingMutation(batchId: BatchId): void {
    this.localInstanceState.removePendingMutation(batchId);
    this.persistState();
  }

  addActiveQueryTarget(targetId: TargetId): void {
    this.localInstanceState.addQueryTarget(targetId);
    this.persistState();
  }

  removeActiveQueryTarget(targetId: TargetId): void {
    this.localInstanceState.removeQueryTarget(targetId);
    this.persistState();
  }

  private persistState(): void {
    assert(
      this.started,
      'LocalStorageNotificationChannel used before started.'
    );
    debug(LOG_TAG, 'Persisting state in LocalStorage');
    this.localInstanceState.markCurrent();
    this.localStorage.setItem(
      this.currentInstanceKey,
      this.localInstanceState.toJSON()
    );
  }

  /** Assembles a key for LocalStorage */
  private buildKey(...elements: string[]): string {
    elements.forEach(value => {
      assert(
        value.indexOf('_') === -1,
        `Key element cannot contain '_', but was '${value}'`
      );
    });

    return `${FIRESTORE_PREFIX}_${elements.join('_')}`;
  }
}
