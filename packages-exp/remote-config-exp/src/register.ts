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
} from '@firebase/app-exp';
import {
  Component,
  ComponentType,
  ComponentContainer
} from '@firebase/component';
import { Logger, LogLevel as FirebaseLogLevel } from '@firebase/logger';
import { RemoteConfig } from '@firebase/remote-config-types-exp';
import { name as packageName, version } from '../package.json';
import { ensureInitialized } from './api';
import { CachingClient } from './client/caching_client';
import { RestClient } from './client/rest_client';
import { RetryingClient } from './client/retrying_client';
import { RC_COMPONENT_NAME } from './constants';
import { ErrorCode, ERROR_FACTORY } from './errors';
import { RemoteConfig as RemoteConfigImpl } from './remote_config';
import { Storage } from './storage/storage';
import { StorageCache } from './storage/storage_cache';

export function registerRemoteConfig(): void {
  _registerComponent(
    new Component(
      RC_COMPONENT_NAME,
      remoteConfigFactory,
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(packageName, version);

  function remoteConfigFactory(
    container: ComponentContainer,
    namespace?: string
  ): RemoteConfig {
    /* Dependencies */
    // getImmediate for FirebaseApp will always succeed
    const app = container.getProvider('app-exp').getImmediate();
    // The following call will always succeed because rc has `import '@firebase/installations'`
    const installations = container
      .getProvider('installations-exp-internal')
      .getImmediate();

    // Guards against the SDK being used in non-browser environments.
    if (typeof window === 'undefined') {
      throw ERROR_FACTORY.create(ErrorCode.REGISTRATION_WINDOW);
    }

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
    namespace = namespace || 'firebase';

    const storage = new Storage(appId, app.name, namespace);
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
