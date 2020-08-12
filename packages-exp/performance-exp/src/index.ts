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

import '@firebase/installations';

import { FirebaseApp } from '@firebase/app-types-exp';
import {
  PerformanceSettings,
  FirebasePerformance
} from '@firebase/performance-types-exp';
import { ERROR_FACTORY, ErrorCode } from './utils/errors';
import { setupApi } from './services/api_service';
import { PerformanceController } from './controllers/perf';
import { _registerComponent, _getProvider } from '@firebase/app-exp';
import {
  Provider,
  InstanceFactory,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';

const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export function getPerformance(
  app: FirebaseApp,
  settings?: PerformanceSettings
): FirebasePerformance {
  const provider: Provider<'performance'> = _getProvider(app, 'performance');
  const perfInstance = provider.getImmediate();
  perfInstance._init(settings);
  return perfInstance;
}

const factory: InstanceFactory<'performance'> = (
  container: ComponentContainer
) => {
  // Dependencies
  const app = container.getProvider('app-exp').getImmediate();
  const installations = container.getProvider('installations').getImmediate();

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
    new Component('performance', factory, ComponentType.PUBLIC)
  );
}

registerPerformance();
