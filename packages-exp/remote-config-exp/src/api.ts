/**
 * @license
 * Copyright 2020 Google LLC
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

import { _getProvider } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import {
  LogLevel as RemoteConfigLogLevel,
  RemoteConfig,
  Value as ValueType
} from '@firebase/remote-config-types-exp';
import { RemoteConfigAbortSignal } from './client/remote_config_fetch_client';
import { RC_COMPONENT_NAME } from './constants';
import { ErrorCode, hasErrorCode } from './errors';
import { RemoteConfig as RemoteConfigImpl } from './remote_config';
import { Value } from './value';
import { LogLevel as FirebaseLogLevel } from '@firebase/logger';

/**
 *
 * @param app - the firebase app instance
 * @returns a remote config instance
 *
 * @public
 */
export function getRemoteConfig(app: FirebaseApp): RemoteConfig {
  const rcProvider = _getProvider(app, RC_COMPONENT_NAME);
  return rcProvider.getImmediate();
}

/**
 * Makes the last fetched config available to the getters.
 * @param remoteConfig - the remote config instance
 * @returns A promise which resolves to true if the current call activated the fetched configs.
 * If the fetched configs were already activated, the promise will resolve to false.
 *
 * @public
 */
export async function activate(remoteConfig: RemoteConfig): Promise<boolean> {
  const rc = remoteConfig as RemoteConfigImpl;
  const [lastSuccessfulFetchResponse, activeConfigEtag] = await Promise.all([
    rc._storage.getLastSuccessfulFetchResponse(),
    rc._storage.getActiveConfigEtag()
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
    rc._storageCache.setActiveConfig(lastSuccessfulFetchResponse.config),
    rc._storage.setActiveConfigEtag(lastSuccessfulFetchResponse.eTag)
  ]);
  return true;
}

/**
 * Ensures the last activated config are available to the getters.
 * @param remoteConfig - the remote config instance
 *
 * @returns A promise that resolves when the last activated config is available to the getters
 * @public
 */
export function ensureInitialized(remoteConfig: RemoteConfig): Promise<void> {
  const rc = remoteConfig as RemoteConfigImpl;
  if (!rc._initializePromise) {
    rc._initializePromise = rc._storageCache.loadFromStorage().then(() => {
      rc._isInitializationComplete = true;
    });
  }
  return rc._initializePromise;
}

/**
 * Fetches and caches configuration from the Remote Config service.
 * @param remoteConfig - the remote config instance
 * @public
 */
export async function fetchConfig(remoteConfig: RemoteConfig): Promise<void> {
  const rc = remoteConfig as RemoteConfigImpl;
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
  }, rc.settings.fetchTimeoutMillis);

  // Catches *all* errors thrown by client so status can be set consistently.
  try {
    await rc._client.fetch({
      cacheMaxAgeMillis: rc.settings.minimumFetchIntervalMillis,
      signal: abortSignal
    });

    await rc._storageCache.setLastFetchStatus('success');
  } catch (e) {
    const lastFetchStatus = hasErrorCode(e, ErrorCode.FETCH_THROTTLE)
      ? 'throttle'
      : 'failure';
    await rc._storageCache.setLastFetchStatus(lastFetchStatus);
    throw e;
  }
}

/**
 * Gets all config.
 *
 * @param remoteConfig - the remote config instance
 * @returns all config
 *
 * @public
 */
export function getAll(remoteConfig: RemoteConfig): Record<string, ValueType> {
  const rc = remoteConfig as RemoteConfigImpl;
  return getAllKeys(
    rc._storageCache.getActiveConfig(),
    rc.defaultConfig
  ).reduce((allConfigs, key) => {
    allConfigs[key] = getValue(remoteConfig, key);
    return allConfigs;
  }, {} as Record<string, ValueType>);
}

/**
 * Gets the value for the given key as a boolean.
 *
 * Convenience method for calling <code>remoteConfig.getValue(key).asBoolean()</code>.
 *
 * @param remoteConfig - the remote config instance
 * @param key - the name of the parameter
 *
 * @returns the value for the given key as a boolean
 * @public
 */
export function getBoolean(remoteConfig: RemoteConfig, key: string): boolean {
  return getValue(remoteConfig, key).asBoolean();
}

/**
 * Gets the value for the given key as a number.
 *
 * Convenience method for calling <code>remoteConfig.getValue(key).asNumber()</code>.
 *
 * @param remoteConfig - the remote config instance
 * @param key - the name of the parameter
 *
 * @returns the value for the given key as a number
 *
 * @public
 */
export function getNumber(remoteConfig: RemoteConfig, key: string): number {
  return getValue(remoteConfig, key).asNumber();
}

/**
 * Gets the value for the given key as a String.
 * Convenience method for calling <code>remoteConfig.getValue(key).asString()</code>.
 *
 * @param remoteConfig - the remote config instance
 * @param key - the name of the parameter
 *
 * @returns the value for the given key as a String
 *
 * @public
 */
export function getString(remoteConfig: RemoteConfig, key: string): string {
  return getValue(remoteConfig, key).asString();
}

/**
 * Gets the {@link @firebase/remote-config-types#Value} for the given key.
 *
 * @param remoteConfig - the remote config instance
 * @param key - the name of the parameter
 *
 * @returns the value for the given key
 *
 * @public
 */
export function getValue(remoteConfig: RemoteConfig, key: string): ValueType {
  const rc = remoteConfig as RemoteConfigImpl;
  if (!rc._isInitializationComplete) {
    rc._logger.debug(
      `A value was requested for key "${key}" before SDK initialization completed.` +
        ' Await on ensureInitialized if the intent was to get a previously activated value.'
    );
  }
  const activeConfig = rc._storageCache.getActiveConfig();
  if (activeConfig && activeConfig[key] !== undefined) {
    return new Value('remote', activeConfig[key]);
  } else if (rc.defaultConfig && rc.defaultConfig[key] !== undefined) {
    return new Value('default', String(rc.defaultConfig[key]));
  }
  rc._logger.debug(
    `Returning static value for key "${key}".` +
      ' Define a default or remote value if this is unintentional.'
  );
  return new Value('static');
}

/**
 * Defines the log level to use.
 *
 * @param remoteConfig - the remote config instance
 * @param logLevel - the log level to set
 *
 * @public
 */
export function setLogLevel(
  remoteConfig: RemoteConfig,
  logLevel: RemoteConfigLogLevel
): void {
  const rc = remoteConfig as RemoteConfigImpl;
  switch (logLevel) {
    case 'debug':
      rc._logger.logLevel = FirebaseLogLevel.DEBUG;
      break;
    case 'silent':
      rc._logger.logLevel = FirebaseLogLevel.SILENT;
      break;
    default:
      rc._logger.logLevel = FirebaseLogLevel.ERROR;
  }
}

/**
 * Dedupes and returns an array of all the keys of the received objects.
 */
function getAllKeys(obj1: {} = {}, obj2: {} = {}): string[] {
  return Object.keys({ ...obj1, ...obj2 });
}
