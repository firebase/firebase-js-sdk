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
import { BatchId, OnlineState, TargetId, VisibilityState } from '../core/types';
import { assert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { debug } from '../util/log';
import { StringMap } from '../util/types';
import { SyncEngine } from '../core/sync_engine';

/**
 * Refresh the contents of LocalStorage every four seconds.
 */
const LCOAL_STORAGE_REFRESH_INTERVAL_MS: number = 4000;

// Prefix keys used in WebStorage.
const VISIBILITY_PREFIX = 'visibility';

const LOG_TAG = 'TabNotificationChannel';

/**
 * WebStorage of the Firestore client. Firestore uses WebStorage for cross-tab
 * notifications and to persist the metadata state of each tab. WebStorage is
 * used to perform leader election and to inform other tabs about changes in the
 * IndexedDB-backed persistence layer.
 */
export interface TabNotificationChannel {
  setVisibility(visibilityState: VisibilityState): void;
  start(): void;
  shutdown(): void;

  addMutation(batchId: BatchId): void;
  rejectMutation(batchId: BatchId, error: FirestoreError): void;
  acknowledgeMutation(batchId: BatchId): void;

  addQuery(targetId: TargetId): void;
  removeQuery(targetId: TargetId): void;
  rejectQuery(targetId: TargetId, err: FirestoreError): void;
  updateQuery(updatedTargetIds: TargetId[]): void;
}

type InstanceId = String;

enum MutationBatchStatus {
  PENDING,
  ACKNOWLEDGED,
  REJECTED
}

enum WatchTargetStatus {
  PENDING,
  UPDATED,
  REJECTED
}

class InstanceRow {
  instanceId: InstanceId;
  updateTime: Date;
  visibilityState: VisibilityState;
  activeTargets: TargetId[];
  pendingBatches: BatchId[];
}

class MasterRow {
  instanceId: InstanceId;
  updateTime: Date;
  onlineState: OnlineState;
}

class BatchUpdateRow {
  updateTime: Date;
  batchId: BatchId;
  status: MutationBatchStatus;
  err?: FirestoreError;
}

class WatchTargetRow {
  updateTime: Date;
  targetId: TargetId;
  status: WatchTargetStatus;
  err?: FirestoreError;
}


/**
 * `LocalStorageNotificationChannel` uses LocalStorage as the backing store for
 * the TabNotificationChannel class.
 *
 * Once started, LocalStorageNotificationChannel will rewrite its contents to
 * LocalStorage every four seconds. Other clients may disregard its state after
 * five seconds of inactivity.
 */
export class LocalStorageNotificationChannel implements TabNotificationChannel {
  private localStorage: Storage;
  private visibilityState: VisibilityState = VisibilityState.Unknown;
  private started = false;
  private pendingBatchIds: { [key: number]: InstanceId } = {};
  private acknowledgedBatchIds: { [key: number]: Date } = {};
  private rejectedBatchIds: {
    [key: number]: { date: Date; error: FirestoreError };
  } = {};
  private activeTargetIds: { [key: number]: InstanceId } = {};
  private updatedTargetIds: { [key: number]: Date } = {};
  private rejectedTargetIds: {
    [key: number]: { date: Date; error: FirestoreError };
  } = {};

  private knownInstances: { [key: string]: InstanceRow } = {};
  private masterRow: MasterRow;

  private primary = false;

  constructor(
    private persistenceKey: string,
    private instanceId: string,
    private asyncQueue: AsyncQueue,
    private syncEngine: SyncEngine
  ) {
    this.visibilityKey = this.buildKey(
      VISIBILITY_PREFIX,
      this.persistenceKey,
      this.instanceId
    );
    this.initInstances();
  }

  /** Returns true if LocalStorage is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  start(): void {
    if (!LocalStorageNotificationChannel.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'LocalStorage is not available on this platform.'
      );
    }

    assert(!this.started, 'LocalStorageNotificationChannel already started');

    this.localStorage = window.localStorage;
    this.started = true;
    this.persistState();
    this.scheduleRefresh();
  }

  shutdown(): void {
    assert(
      this.started,
      'LocalStorageNotificationChannel.shutdown() called when not started'
    );
    this.started = false;
  }

  // Methods called by sync engine. These mutate local state which will be
  // immediately reflected in LocalStorage and updated every 4 seconds.
  setVisibility(visibilityState: VisibilityState): void {
    this.visibilityState = visibilityState;
    this.persistState();
  }

  addMutation(batchId: BatchId): void {
    this.pendingBatchIds[batchId] = this.instanceId;
  }

  rejectMutation(batchId: BatchId, error: FirestoreError): void {
    delete batchId[batchId];
    this.rejectedBatchIds[batchId] = { date: new Date(), error };
  }

  acknowledgeMutation(batchId: BatchId): void {
    this.acknowledgedBatchIds[batchId] = new Date();
  }

  addQuery(targetId: TargetId): void {
    this.activeTargetIds[targetId] = this.instanceId;
  }

  removeQuery(targetId: TargetId): void {
    delete this.activeTargetIds[targetId];
  }

  rejectQuery(targetId: TargetId, error: FirestoreError): void {
    this.rejectedTargetIds[targetId] = { date: new Date(), error };
  }

  updateQuery(updatedTargetIds: TargetId[]): void {
    for (const targetId of updatedTargetIds) {
      this.updatedTargetIds[targetId] = new Date();
    }
  }

  // Callback for the LocalStorage observer. 'key' is the key that changed, and
  // value is the new value.
  private onUpdate(key: string, value: string) {
    if (this.primary) {
      if (isUserRow(key)) {
        const userRow: InstanceRow = parseUser();
        for (const batchId of userRow.pendingBatches) {
          this.syncEngine.updateBatch(batchId, 'append');
        }
        for (const targetId of userRow.activeTargets) {
          this.syncEngine.updateWatch(targetId, 'append');
        }
        this.knownInstances[userRow.instanceId] = userRow;
      } else if (isMasterRow(key)) {
        const masterRow: MasterRow = parseMaster();
        if (masterRow.instanceId !== this.instanceId) {
          warn('Master lease lost');
          this.primary = false;
          this.syncEngine.setMasterState(false);
        }
        this.masterRow = masterRow;
      }
    } else {
      if (isUserRow(key)) {
        const userRow: InstanceRow = parseUser();
        for (const batchId of userRow.pendingBatches) {
          this.syncEngine.updateBatch(batchId, 'append');
        }
        for (const targetId of userRow.activeTargets) {
          this.syncEngine.updateWatch(targetId, 'append');
        }
        this.knownInstances[userRow.instanceId] = userRow;
        this.tryBecomeMaster();
      } else if (isBatchUpdatedRow()) {
        const batch: BatchUpdateRow = parseBatch();
        this.syncEngine.updateBatch(batch.batchId, batch.status, batch.err);
      } else if (isWatchUpdatedRow()) {
        const target: WatchTargetRow = parseWatch();
        this.syncEngine.updateWatch(target.targetId, target.status, target.err);
      } else if (isMasterRow(key)) {
        const masterRow: MasterRow = parseMaster();
        this.masterRow = masterRow;
      }
    }
  }

  private scheduleRefresh(): void {
    this.asyncQueue.schedulePeriodically(() => {
      if (this.started) {
        this.persistState();
      }
      return Promise.resolve();
    }, LCOAL_STORAGE_REFRESH_INTERVAL_MS);
  }

  private visibilityKey: string;

  /** Persists the entire known state. */
  private persistState(): void {
    assert(this.started, 'LocalStorageNotificationChannel not started');
    debug(LOG_TAG, 'Persisting state in LocalStorage');
    this.localStorage[this.visibilityKey] = this.buildValue({
      visibilityState: VisibilityState[this.visibilityState]
    });
    this.tryBecomeMaster();
  }

  /** Assembles a key for LocalStorage */
  private buildKey(...elements: string[]): string {
    elements.forEach(value => {
      assert(value.indexOf('_') === -1, "Key element cannot contain '_'");
    });

    return elements.join('_');
  }

  /** JSON-encodes the provided value and its current update time. */
  private buildValue(data: StringMap): string {
    const persistedData = Object.assign({ lastUpdateTime: Date.now() }, data);
    return JSON.stringify(persistedData);
  }

  private tryBecomeMaster() {
    this.masterRow = localStorage['master'];

    if (!this.isExpired(this.masterRow.updateTime)) {
      return;
    }

    if (this.visibilityState !== VisibilityState.Foreground) {
      Object.keys(this.knownInstances).forEach(key => {
        if (
          this.knownInstances[key].visibilityState ===
          VisibilityState.Foreground
        ) {
          return; // Someone else should become master
        }
      });
    }

    // TODO: Come up with a clever way to solve this race, or move the
    // MasterRow to IndexedDB.
    // set master row
    // read master row
    this.primary = this.masterRow.instanceId === this.instanceId;
  }
}
