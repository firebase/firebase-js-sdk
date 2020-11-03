/**
 * @license
 * Copyright 2019 Google LLC
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

import { FetchStatus } from '@firebase/remote-config-types';
import { FirebaseRemoteConfigObject } from '../client/remote_config_fetch_client';
import { Storage } from './storage';

/**
 * A memory cache layer over storage to support the SDK's synchronous read requirements.
 */
export class StorageCache {
  constructor(private readonly storage: Storage) {}

  /**
   * Memory caches.
   */
  private lastFetchStatus?: FetchStatus;
  private lastSuccessfulFetchTimestampMillis?: number;
  private activeConfig?: FirebaseRemoteConfigObject;

  /**
   * Memory-only getters
   */
  getLastFetchStatus(): FetchStatus | undefined {
    return this.lastFetchStatus;
  }

  getLastSuccessfulFetchTimestampMillis(): number | undefined {
    return this.lastSuccessfulFetchTimestampMillis;
  }

  getActiveConfig(): FirebaseRemoteConfigObject | undefined {
    return this.activeConfig;
  }

  /**
   * Read-ahead getter
   */
  async loadFromStorage(): Promise<void> {
    const lastFetchStatusPromise = this.storage.getLastFetchStatus();
    const lastSuccessfulFetchTimestampMillisPromise = this.storage.getLastSuccessfulFetchTimestampMillis();
    const activeConfigPromise = this.storage.getActiveConfig();

    // Note:
    // 1. we consistently check for undefined to avoid clobbering defined values
    //   in memory
    // 2. we defer awaiting to improve readability, as opposed to destructuring
    //   a Promise.all result, for example

    const lastFetchStatus = await lastFetchStatusPromise;
    if (lastFetchStatus) {
      this.lastFetchStatus = lastFetchStatus;
    }

    const lastSuccessfulFetchTimestampMillis = await lastSuccessfulFetchTimestampMillisPromise;
    if (lastSuccessfulFetchTimestampMillis) {
      this.lastSuccessfulFetchTimestampMillis = lastSuccessfulFetchTimestampMillis;
    }

    const activeConfig = await activeConfigPromise;
    if (activeConfig) {
      this.activeConfig = activeConfig;
    }
  }

  /**
   * Write-through setters
   */
  setLastFetchStatus(status: FetchStatus): Promise<void> {
    this.lastFetchStatus = status;
    return this.storage.setLastFetchStatus(status);
  }

  setLastSuccessfulFetchTimestampMillis(
    timestampMillis: number
  ): Promise<void> {
    this.lastSuccessfulFetchTimestampMillis = timestampMillis;
    return this.storage.setLastSuccessfulFetchTimestampMillis(timestampMillis);
  }

  setActiveConfig(activeConfig: FirebaseRemoteConfigObject): Promise<void> {
    this.activeConfig = activeConfig;
    return this.storage.setActiveConfig(activeConfig);
  }
}
