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
 * By default, we refresh the contents of WebStorage every four seconds.
 */
const DEFAULT_WEB_STORAGE_REFRESH_INTERVAL_MS: number = 4000;

// Prefix keys used in WebStorage.
const VISIBILITY_PREFIX = 'visibility';

const LOG_TAG = 'WebStorage';

/**
 * WebStorage of the Firestore client. Firestore uses WebStorage for cross-tab
 * notifications and to persist the metadata state of each tab. WebStorage is
 * used to perform leader election and to inform other tabs about changes in the
 * IndexedDB-backed persistence layer.
 *
 * WebStorage is only used in Persistence-enabled Firestore instances. If you
 * are not using Persistence, consider using the `NoOpWebStorage` class.
 */
export interface WebStorage {
  setVisibility(visibilityState: VisibilityState): void;
  start(): void;
  shutdown(): void;
}

/**
 * `PersistedWebStorage` uses Local Storage as the backing store for the
 * WebStorage class.
 *
 * Once started, PersistedWebStorage will rewrite its contents to Local Storage
 * every four seconds. Other clients may disregard its state after 5 seconds of
 * inactivity.
 */
export class PersistedWebStorage implements WebStorage {
  private localStorage: Storage;
  private visibilityState: VisibilityState = VisibilityState.Unknown;
  private started = false;

  constructor(
    private persistenceKey: string,
    private instanceId: string,
    private asyncQueue: AsyncQueue,
    private refreshIntervalMs?: number
  ) {
    this.refreshIntervalMs =
      refreshIntervalMs !== undefined
        ? refreshIntervalMs
        : DEFAULT_WEB_STORAGE_REFRESH_INTERVAL_MS;
  }

  /** Returns true if LocalStorage is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  start(): void {
    if (!PersistedWebStorage.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        'Local Storage is not available on this platform'
      );
    }

    assert(!this.started, 'PersistedWebStorage already started');

    this.localStorage = window.localStorage;
    this.started = true;
    this.persistState();
    this.scheduleRefresh();
  }

  shutdown(): void {
    assert(
      this.started,
      'PersistedWebStorage.shutdown() called when not started'
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
    }, this.refreshIntervalMs);
  }

  /** Persists the entire known state. */
  private persistState(): void {
    assert(this.started, 'PersistedWebStorage not started');
    debug(LOG_TAG, 'Persisting state in LocalStorage');
    this.localStorage[
      this.buildKey(VISIBILITY_PREFIX, this.persistenceKey, this.instanceId)
    ] = this.buildValue({
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

  /** JSON-encodes the provided valued and its current update time. */
  private buildValue(data: { [key: string]: string }): string {
    const persistedData = Object.assign({ lastUpdateTime: Date.now() }, data);
    return JSON.stringify(persistedData);
  }
}

/**
 * `NoOpWebStorage` implements the WebStorage API but neither persist data nor
 * delivers notifications. This call should be used for non-persistence enabled
 * clients.
 */
export class NoOpWebStorage implements WebStorage {
  start(): void {}
  shutdown(): void {}
  setVisibility(visibilityState: VisibilityState): void {}
}
