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

import { FirebaseApp } from '@firebase/app-types-exp';
import {
  FirebasePerformance,
  PerformanceSettings
} from '@firebase/performance-types-exp';
import { ERROR_FACTORY, ErrorCode } from './utils/errors';
import { setupApi } from './services/api_service';
import { PerformanceController } from './controllers/perf';
import {
  _registerComponent,
  _getProvider,
  registerVersion
} from '@firebase/app-exp';
import {
  InstanceFactory,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import { name, version } from '../package.json';

const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export function getPerformance(
  app: FirebaseApp,
  settings?: PerformanceSettings
): FirebasePerformance {
  const provider = _getProvider(app, 'performance-exp');
  const perfInstance = provider.getImmediate() as PerformanceController;
  perfInstance._init(settings);
  return perfInstance;
}

const factory: InstanceFactory<'performance-exp'> = (
  container: ComponentContainer
) => {
  // Dependencies
  const app = container.getProvider('app-exp').getImmediate();
  const installations = container
    .getProvider('installations-exp-internal')
    .getImmediate();

  if (app.name !== DEFAULT_ENTRY_NAME) {
    throw ERROR_FACTORY.create(ErrorCode.FB_NOT_DEFAULT);
  }
  if (typeof window === 'undefined') {
    throw ERROR_FACTORY.create(ErrorCode.NO_WINDOW);
  }
  setupApi(window);
  return new PerformanceController(app, installations);
};

export function registerPerformance(): void {
  _registerComponent(
    new Component('performance-exp', factory, ComponentType.PUBLIC)
  );
}

registerPerformance();
registerVersion(name, version);
