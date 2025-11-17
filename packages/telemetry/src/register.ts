/**
 * @license
 * Copyright 2025 Google LLC
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

import { _registerComponent, registerVersion } from '@firebase/app';
import { Component, ComponentType } from '@firebase/component';
import { TELEMETRY_TYPE } from './constants';
import { name, version } from '../package.json';
import { TelemetryService } from './service';
import { createLoggerProvider } from './logging/logger-provider';
import { AppCheckProvider } from './logging/appcheck-provider';
import { InstallationIdProvider } from './logging/installation-id-provider';

// We only import types from this package elsewhere in the `telemetry` package, so this
// explicit import is needed here to prevent this module from being tree-shaken out.
import '@firebase/installations';

export function registerTelemetry(): void {
  _registerComponent(
    new Component(
      TELEMETRY_TYPE,
      (container, { instanceIdentifier }) => {
        if (instanceIdentifier === undefined) {
          throw new Error('TelemetryService instance identifier is undefined');
        }

        // TODO: change to default endpoint once it exists
        const endpointUrl = instanceIdentifier || 'http://localhost';

        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const appCheckProvider = container.getProvider('app-check-internal');
        const installationsProvider = container.getProvider(
          'installations-internal'
        );
        const dynamicHeaderProviders = [new AppCheckProvider(appCheckProvider)];
        const dynamicLogAttributeProviders = [
          new InstallationIdProvider(installationsProvider)
        ];
        const loggerProvider = createLoggerProvider(
          app,
          endpointUrl,
          dynamicHeaderProviders,
          dynamicLogAttributeProviders
        );

        return new TelemetryService(app, loggerProvider);
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}
