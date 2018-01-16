/**
 * Copyright 2017 Google Inc.
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

const WEB_STORAGE_REFRESH_INTERVAL_MS = 4000;
const VISIBILITY_KEY = 'visibility';

export interface WebStorage {
  setVisibility(visibilityState: VisibilityState): void;
  start(): Promise<void>;
  shutdown(): Promise<void>;
}

export class PersistedWebStorage implements WebStorage {
  private localStorage: Storage;
  private visibilityState: VisibilityState = VisibilityState.Unknown;
  private started = false;

  constructor(
    private asyncQueue: AsyncQueue,
    private persistenceKey: string,
    private instanceId: string
  ) {}

  /** Returns true if IndexedDB is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage != null;
  }

  start(): Promise<void> {
    if (!PersistedWebStorage.isAvailable()) {
      const persistenceError = new FirestoreError(
        Code.UNIMPLEMENTED,
        'Local Storage is not available on this platform'
      );
      return Promise.reject(persistenceError);
    }

    this.localStorage = window.localStorage;
    this.started = true;
    this.persistState();
    this.scheduleRefresh();
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    assert(!this.started, 'PersistedWebStorage shutdown without started');
    this.started = false;
    return Promise.resolve();
  }

  setVisibility(visibilityState: VisibilityState): void {
    this.visibilityState = visibilityState;
    this.persistState();
  }

  private scheduleRefresh(): void {
    this.asyncQueue.scheduleRepeatedly(() => {
      if (this.started) {
        this.persistState();
      }
      return Promise.resolve();
    }, WEB_STORAGE_REFRESH_INTERVAL_MS);
  }

  private persistState(): void {
    assert(this.started, 'PersistedWebStorage not started');
    this.localStorage[
      this.buildKey(VISIBILITY_KEY, this.persistenceKey, this.instanceId)
    ] = this.buildValue({
      visibilityState: VisibilityState[this.visibilityState]
    });
  }

  private buildKey(...elements: string[]): string {
    elements.forEach(value => {
      assert(value.indexOf('_') === -1, "Key element cannot contain '_'");
    });

    return elements.join('_');
  }

  private buildValue(data: { [key: string]: string }): string {
    const persistedData = Object.assign({ lastUpdateTime: Date.now() }, data);
    return JSON.stringify(persistedData);
  }
}

export class NoOpWebStorage implements WebStorage {
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  setVisibility(visibilityState: VisibilityState): void {}
  start(): Promise<void> {
    return Promise.resolve();
  }
}
