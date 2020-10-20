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

export function registerRemoteConfig(
  firebaseInstance: _FirebaseNamespace
): void {
  firebaseInstance.INTERNAL.registerComponent(
    new Component(
      'remoteConfig',
      remoteConfigFactory,
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  firebaseInstance.registerVersion(packageName, version);

  function remoteConfigFactory(
    container: ComponentContainer,
    namespace?: string
  ): RemoteConfig {
    /* Dependencies */
    // getImmediate for FirebaseApp will always succeed
    const app = container.getProvider('app').getImmediate();
    // The following call will always succeed because rc has `import '@firebase/installations'`
    const installations = container.getProvider('installations').getImmediate();

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
      firebaseInstance.SDK_VERSION,
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

    const remoteConfigInstance = new RemoteConfig(
      app,
      cachingClient,
      storageCache,
      storage,
      logger
    );

    // Starts warming cache.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    remoteConfigInstance.ensureInitialized();

    return remoteConfigInstance;
  }
}
