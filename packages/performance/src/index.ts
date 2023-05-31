/**
 * The Firebase Performance Monitoring Web SDK.
 * This SDK does not work in a Node.js environment.
 *
 * @packageDocumentation
 */

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
  FirebasePerformance,
  PerformanceSettings,
  PerformanceTrace
} from './public_types';
import { ERROR_FACTORY, ErrorCode } from './utils/errors';
import { setupApi } from './services/api_service';
import { PerformanceController } from './controllers/perf';
import {
  _registerComponent,
  _getProvider,
  registerVersion,
  FirebaseApp,
  getApp
} from '@firebase/app';
import {
  InstanceFactory,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import { name, version } from '../package.json';
import { Trace } from './resources/trace';
import '@firebase/installations';
import { deepEqual, getModularInstance } from '@firebase/util';

const DEFAULT_ENTRY_NAME = '[DEFAULT]';

/**
 * Returns a {@link FirebasePerformance} instance for the given app.
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @public
 */
export function getPerformance(
  app: FirebaseApp = getApp()
): FirebasePerformance {
  app = getModularInstance(app);
  const provider = _getProvider(app, 'performance');
  const perfInstance = provider.getImmediate() as PerformanceController;
  return perfInstance;
}

/**
 * Returns a {@link FirebasePerformance} instance for the given app. Can only be called once.
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @param settings - Optional settings for the {@link FirebasePerformance} instance.
 * @public
 */
export function initializePerformance(
  app: FirebaseApp,
  settings?: PerformanceSettings
): FirebasePerformance {
  app = getModularInstance(app);
  const provider = _getProvider(app, 'performance');

  // throw if an instance was already created.
  // It could happen if initializePerformance() is called more than once, or getPerformance() is called first.
  if (provider.isInitialized()) {
    const existingInstance = provider.getImmediate();
    const initialSettings = provider.getOptions() as PerformanceSettings;
    if (deepEqual(initialSettings, settings ?? {})) {
      return existingInstance;
    } else {
      throw ERROR_FACTORY.create(ErrorCode.ALREADY_INITIALIZED);
    }
  }

  const perfInstance = provider.initialize({
    options: settings
  }) as PerformanceController;
  return perfInstance;
}

/**
 * Returns a new `PerformanceTrace` instance.
 * @param performance - The {@link FirebasePerformance} instance to use.
 * @param name - The name of the trace.
 * @public
 */
export function trace(
  performance: FirebasePerformance,
  name: string
): PerformanceTrace {
  performance = getModularInstance(performance);
  return new Trace(performance as PerformanceController, name);
}

const factory: InstanceFactory<'performance'> = (
  container: ComponentContainer,
  { options: settings }: { options?: PerformanceSettings }
) => {
  // Dependencies
  const app = container.getProvider('app').getImmediate();
  const installations = container
    .getProvider('installations-internal')
    .getImmediate();

  if (app.name !== DEFAULT_ENTRY_NAME) {
    throw ERROR_FACTORY.create(ErrorCode.FB_NOT_DEFAULT);
  }
  if (typeof window === 'undefined') {
    throw ERROR_FACTORY.create(ErrorCode.NO_WINDOW);
  }
  setupApi(window);
  const perfInstance = new PerformanceController(app, installations);
  perfInstance._init(settings);

  return perfInstance;
};

function registerPerformance(): void {
  _registerComponent(
    new Component('performance', factory, ComponentType.PUBLIC)
  );
  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}

registerPerformance();

export { FirebasePerformance, PerformanceSettings, PerformanceTrace };
