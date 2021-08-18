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

import { FirebaseApp } from '@firebase/app-types';
import {
  RemoteConfig as RemoteConfigType,
  FetchStatus,
  Settings,
  Value as ValueType,
  LogLevel as RemoteConfigLogLevel
} from '@firebase/remote-config-types';
import { StorageCache } from './storage/storage_cache';
import {
  RemoteConfigFetchClient,
  RemoteConfigAbortSignal
} from './client/remote_config_fetch_client';
import { Value } from './value';
import { ErrorCode, hasErrorCode } from './errors';
import { Storage } from './storage/storage';
import { Logger, LogLevel as FirebaseLogLevel } from '@firebase/logger';

const DEFAULT_FETCH_TIMEOUT_MILLIS = 60 * 1000; // One minute
const DEFAULT_CACHE_MAX_AGE_MILLIS = 12 * 60 * 60 * 1000; // Twelve hours.

/**
 * Encapsulates business logic mapping network and storage dependencies to the public SDK API.
 *
 * See {@link https://github.com/FirebasePrivate/firebase-js-sdk/blob/master/packages/firebase/index.d.ts|interface documentation} for method descriptions.
 */
export class RemoteConfig implements RemoteConfigType {
  // Tracks completion of initialization promise.
  private _isInitializationComplete = false;

  // De-duplicates initialization calls.
  private _initializePromise?: Promise<void>;

  settings: Settings = {
    fetchTimeoutMillis: DEFAULT_FETCH_TIMEOUT_MILLIS,
    minimumFetchIntervalMillis: DEFAULT_CACHE_MAX_AGE_MILLIS
  };

  defaultConfig: { [key: string]: string | number | boolean } = {};

  // Based on packages/firestore/src/util/log.ts but not static because we need per-instance levels
  // to differentiate 2p and 3p use-cases.
  setLogLevel(logLevel: RemoteConfigLogLevel): void {
    switch (logLevel) {
      case 'debug':
        this._logger.logLevel = FirebaseLogLevel.DEBUG;
        break;
      case 'silent':
        this._logger.logLevel = FirebaseLogLevel.SILENT;
        break;
      default:
        this._logger.logLevel = FirebaseLogLevel.ERROR;
    }
  }

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
    private readonly _client: RemoteConfigFetchClient,
    private readonly _storageCache: StorageCache,
    private readonly _storage: Storage,
    private readonly _logger: Logger
  ) {}

  async activate(): Promise<boolean> {
    const [lastSuccessfulFetchResponse, activeConfigEtag] = await Promise.all([
      this._storage.getLastSuccessfulFetchResponse(),
      this._storage.getActiveConfigEtag()
    ]);
    if (
      !lastSuccessfulFetchResponse ||
      !lastSuccessfulFetchResponse.config ||
      !lastSuccessfulFetchResponse.eTag ||
      lastSuccessfulFetchResponse.eTag === activeConfigEtag
    ) {
      // Either there is no successful fetched config, or is the same as current active
      // config.
      return false;
    }
    await Promise.all([
      this._storageCache.setActiveConfig(lastSuccessfulFetchResponse.config),
      this._storage.setActiveConfigEtag(lastSuccessfulFetchResponse.eTag)
    ]);
    return true;
  }

  ensureInitialized(): Promise<void> {
    if (!this._initializePromise) {
      this._initializePromise = this._storageCache
        .loadFromStorage()
        .then(() => {
          this._isInitializationComplete = true;
        });
    }
    return this._initializePromise;
  }

  /**
   * @throws a {@link ErrorCode.FETCH_CLIENT_TIMEOUT} if the request takes longer than
   * {@link Settings.fetchTimeoutInSeconds} or
   * {@link DEFAULT_FETCH_TIMEOUT_SECONDS}.
   */
  async fetch(): Promise<void> {
    // Aborts the request after the given timeout, causing the fetch call to
    // reject with an AbortError.
    //
    // <p>Aborting after the request completes is a no-op, so we don't need a
    // corresponding clearTimeout.
    //
    // Locating abort logic here because:
    // * it uses a developer setting (timeout)
    // * it applies to all retries (like curl's max-time arg)
    // * it is consistent with the Fetch API's signal input
    const abortSignal = new RemoteConfigAbortSignal();

    setTimeout(async () => {
      // Note a very low delay, eg < 10ms, can elapse before listeners are initialized.
      abortSignal.abort();
    }, this.settings.fetchTimeoutMillis);

    // Catches *all* errors thrown by client so status can be set consistently.
    try {
      await this._client.fetch({
        cacheMaxAgeMillis: this.settings.minimumFetchIntervalMillis,
        signal: abortSignal
      });

      await this._storageCache.setLastFetchStatus('success');
    } catch (e) {
      const lastFetchStatus = hasErrorCode(e, ErrorCode.FETCH_THROTTLE)
        ? 'throttle'
        : 'failure';
      await this._storageCache.setLastFetchStatus(lastFetchStatus);
      throw e;
    }
  }

  async fetchAndActivate(): Promise<boolean> {
    await this.fetch();
    return this.activate();
  }

  getAll(): { [key: string]: ValueType } {
    return getAllKeys(
      this._storageCache.getActiveConfig(),
      this.defaultConfig
    ).reduce((allConfigs, key) => {
      allConfigs[key] = this.getValue(key);
      return allConfigs;
    }, {} as { [key: string]: ValueType });
  }

  getBoolean(key: string): boolean {
    return this.getValue(key).asBoolean();
  }

  getNumber(key: string): number {
    return this.getValue(key).asNumber();
  }

  getString(key: string): string {
    return this.getValue(key).asString();
  }

  getValue(key: string): ValueType {
    if (!this._isInitializationComplete) {
      this._logger.debug(
        `A value was requested for key "${key}" before SDK initialization completed.` +
          ' Await on ensureInitialized if the intent was to get a previously activated value.'
      );
    }
    const activeConfig = this._storageCache.getActiveConfig();
    if (activeConfig && activeConfig[key] !== undefined) {
      return new Value('remote', activeConfig[key]);
    } else if (this.defaultConfig && this.defaultConfig[key] !== undefined) {
      return new Value('default', String(this.defaultConfig[key]));
    }
    this._logger.debug(
      `Returning static value for key "${key}".` +
        ' Define a default or remote value if this is unintentional.'
    );
    return new Value('static');
  }
}

/**
 * Dedupes and returns an array of all the keys of the received objects.
 */
function getAllKeys(obj1: {} = {}, obj2: {} = {}): string[] {
  return Object.keys({ ...obj1, ...obj2 });
}
