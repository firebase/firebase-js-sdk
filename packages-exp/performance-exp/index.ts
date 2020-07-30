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

import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import {
  FirebasePerformance,
  PerformanceSettings
} from '@firebase/performance-types-exp';

import { PerformanceController } from './src/controllers/perf';
import { setupApi } from './src/services/api_service';
import { SettingsService } from './src/services/settings_service';
import { ERROR_FACTORY, ErrorCode } from './src/utils/errors';

const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export function getPerformance(
  app: FirebaseApp,
  settings?: PerformanceSettings
): FirebasePerformance {
  if (app.name !== DEFAULT_ENTRY_NAME) {
    throw ERROR_FACTORY.create(ErrorCode.FB_NOT_DEFAULT);
  }
  if (typeof window === 'undefined') {
    throw ERROR_FACTORY.create(ErrorCode.NO_WINDOW);
  }
  setupApi(window);
  SettingsService.getInstance().firebaseAppInstance = app;
  SettingsService.getInstance().installationsService = app.installations();
  return new PerformanceController(app, settings);
}
