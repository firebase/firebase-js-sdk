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
import { CRASHLYTICS_TYPE } from './constants';
import { name, version } from '../package.json';
import { CrashlyticsService } from './service';
import { createLoggerProvider } from './logging/logger-provider';
import { createTracingProvider } from './tracing/tracing-provider';

export function registerCrashlytics(): void {
  _registerComponent(
    new Component(
      CRASHLYTICS_TYPE,
      (container, { instanceIdentifier }) => {
        if (instanceIdentifier === undefined) {
          throw new Error(
            'CrashlyticsService instance identifier is undefined'
          );
        }

        // TODO: change to default endpoint once it exists
        const loggingUrl = instanceIdentifier || 'http://localhost';
        const tracingUrl = instanceIdentifier || 'http://localhost';

        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const loggerProvider = createLoggerProvider(app, loggingUrl);
        const tracingProvider = createTracingProvider(app, tracingUrl);

        return new CrashlyticsService(app, loggerProvider, tracingProvider);
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version, 'node');
  // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}
