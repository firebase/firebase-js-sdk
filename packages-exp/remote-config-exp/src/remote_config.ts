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

import { FirebaseApp } from '@firebase/app-types-exp';
import {
  RemoteConfig as RemoteConfigType,
  FetchStatus,
  Settings
} from '@firebase/remote-config-types-exp';
import { StorageCache } from './storage/storage_cache';
import { RemoteConfigFetchClient } from './client/remote_config_fetch_client';
import { Storage } from './storage/storage';
import { Logger } from '@firebase/logger';

const DEFAULT_FETCH_TIMEOUT_MILLIS = 60 * 1000; // One minute
const DEFAULT_CACHE_MAX_AGE_MILLIS = 12 * 60 * 60 * 1000; // Twelve hours.

/**
 * Encapsulates business logic mapping network and storage dependencies to the public SDK API.
 *
 * See {@link https://github.com/FirebasePrivate/firebase-js-sdk/blob/master/packages/firebase/index.d.ts|interface documentation} for method descriptions.
 */
export class RemoteConfig implements RemoteConfigType {
  /**
   * Tracks completion of initialization promise.
   * @internal
   */
  public _isInitializationComplete = false;

  /**
   * De-duplicates initialization calls.
   * @internal
   */
  public _initializePromise?: Promise<void>;

  settings: Settings = {
    fetchTimeoutMillis: DEFAULT_FETCH_TIMEOUT_MILLIS,
    minimumFetchIntervalMillis: DEFAULT_CACHE_MAX_AGE_MILLIS
  };

  defaultConfig: { [key: string]: string | number | boolean } = {};

  get fetchTimeMillis(): number {
    return this._storageCache.getLastSuccessfulFetchTimestampMillis() || -1;
  }

  get lastFetchStatus(): FetchStatus {
    return this._storageCache.getLastFetchStatus() || 'no-fetch-yet';
  }

  constructor(
    // Required by FirebaseServiceFactory interface.
    readonly app: FirebaseApp,
    // JS doesn't support private yet
    // (https://github.com/tc39/proposal-class-fields#private-fields), so we hint using an
    // underscore prefix.
    /**
     * @internal
     */
    readonly _client: RemoteConfigFetchClient,
    /**
     * @internal
     */
    readonly _storageCache: StorageCache,
    /**
     * @internal
     */
    readonly _storage: Storage,
    /**
     * @internal
     */
    readonly _logger: Logger
  ) {}
}
