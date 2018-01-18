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
import { VisibilityState } from '../core/types';
import { assert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { debug } from '../util/log';

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

  constructor(
    private persistenceKey: string,
    private instanceId: string,
    private asyncQueue: AsyncQueue
  ) {
    this.visibilityKey = this.buildKey(
      VISIBILITY_PREFIX,
      this.persistenceKey,
      this.instanceId
    );
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

  setVisibility(visibilityState: VisibilityState): void {
    this.visibilityState = visibilityState;
    this.persistState();
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
  }

  /** Assembles a key for LocalStorage */
  private buildKey(...elements: string[]): string {
    elements.forEach(value => {
      assert(value.indexOf('_') === -1, "Key element cannot contain '_'");
    });

    return elements.join('_');
  }

  /** JSON-encodes the provided value and its current update time. */
  private buildValue(data: { [key: string]: string }): string {
    const persistedData = Object.assign({ lastUpdateTime: Date.now() }, data);
    return JSON.stringify(persistedData);
  }
}
