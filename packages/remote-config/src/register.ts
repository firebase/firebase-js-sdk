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
import {
  _registerComponent,
  registerVersion,
  SDK_VERSION
} from '@firebase/app';
import { isIndexedDBAvailable } from '@firebase/util';
import {
  Component,
  ComponentType,
  ComponentContainer
} from '@firebase/component';
import { Logger, LogLevel as FirebaseLogLevel } from '@firebase/logger';
import { RemoteConfig, RemoteConfigOptions } from './public_types';
import { name as packageName, version } from '../package.json';
import { ensureInitialized } from './api';
import { CachingClient } from './client/caching_client';
import { RestClient } from './client/rest_client';
import { RetryingClient } from './client/retrying_client';
import { RC_COMPONENT_NAME } from './constants';
import { ErrorCode, ERROR_FACTORY } from './errors';
import { RemoteConfig as RemoteConfigImpl } from './remote_config';
import { IndexedDbStorage, InMemoryStorage } from './storage/storage';
import { StorageCache } from './storage/storage_cache';
// This needs to be in the same file that calls `getProvider()` on the component
// or it will get tree-shaken out.
import '@firebase/installations';

export function registerRemoteConfig(): void {
  _registerComponent(
    new Component(
      RC_COMPONENT_NAME,
      remoteConfigFactory,
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(packageName, version);
  // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
  registerVersion(packageName, version, '__BUILD_TARGET__');

  function remoteConfigFactory(
    container: ComponentContainer,
    { options }: { options?: RemoteConfigOptions }
  ): RemoteConfig {
    /* Dependencies */
    // getImmediate for FirebaseApp will always succeed
    const app = container.getProvider('app').getImmediate();
    // The following call will always succeed because rc has `import '@firebase/installations'`
    const installations = container
      .getProvider('installations-internal')
      .getImmediate();

    // Normalizes optional inputs.
    const { projectId, apiKey, appId } = app.options;
    if (!projectId) {
      throw ERROR_FACTORY.create(ErrorCode.REGISTRATION_PROJECT_ID);
    }
    if (!apiKey) {
      throw ERROR_FACTORY.create(ErrorCode.REGISTRATION_API_KEY);
    }
    if (!appId) {
      throw ERROR_FACTORY.create(ErrorCode.REGISTRATION_APP_ID);
    }
    const namespace = options?.templateId || 'firebase';

    const storage = isIndexedDBAvailable()
      ? new IndexedDbStorage(appId, app.name, namespace)
      : new InMemoryStorage();
    const storageCache = new StorageCache(storage);

    const logger = new Logger(packageName);

    // Sets ERROR as the default log level.
    // See RemoteConfig#setLogLevel for corresponding normalization to ERROR log level.
    logger.logLevel = FirebaseLogLevel.ERROR;

    const restClient = new RestClient(
      installations,
      // Uses the JS SDK version, by which the RC package version can be deduced, if necessary.
      SDK_VERSION,
      namespace,
      projectId,
      apiKey,
      appId
    );
    const retryingClient = new RetryingClient(restClient, storage);
    const cachingClient = new CachingClient(
      retryingClient,
      storage,
      storageCache,
      logger
    );

    const remoteConfigInstance = new RemoteConfigImpl(
      app,
      cachingClient,
      storageCache,
      storage,
      logger
    );

    // Starts warming cache.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ensureInitialized(remoteConfigInstance);

    return remoteConfigInstance;
  }
}
