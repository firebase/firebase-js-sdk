/**
 * @license
 * Copyright 2019 Google Inc.
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

import firebase from '@firebase/app';
import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import {
  _FirebaseNamespace,
  FirebaseServiceFactory
} from '@firebase/app-types/private';
import { PerformanceController } from './src/controllers/perf';
import { setupApi } from './src/services/api_service';
import { SettingsService } from './src/services/settings_service';
import { ERROR_FACTORY, ErrorCode } from './src/utils/errors';
import { FirebasePerformance } from '@firebase/performance-types';

const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export function registerPerformance(instance: FirebaseNamespace): void {
  const factoryMethod: FirebaseServiceFactory = (
    app: FirebaseApp
  ): PerformanceController => {
    if (app.name !== DEFAULT_ENTRY_NAME) {
      throw ERROR_FACTORY.create(ErrorCode.FB_NOT_DEFAULT);
    }
    SettingsService.getInstance().firebaseAppInstance = app;
    return new PerformanceController(app);
  };

  // Register performance with firebase-app.
  const namespaceExports = {};
  (instance as _FirebaseNamespace).INTERNAL.registerService(
    'performance',
    factoryMethod,
    namespaceExports
  );
}

setupApi(window);
registerPerformance(firebase);

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    performance?: {
      (app?: FirebaseApp): FirebasePerformance;
    };
  }
  interface FirebaseApp {
    performance?(): FirebasePerformance;
  }
}
