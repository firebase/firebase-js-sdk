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

import firebase from '@firebase/app';
import '@firebase/installations';
import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { PerformanceController } from './src/controllers/perf';
import { setupApi } from './src/services/api_service';
import { SettingsService } from './src/services/settings_service';
import { ERROR_FACTORY, ErrorCode } from './src/utils/errors';
import { FirebasePerformance } from '@firebase/performance-types';
import { Component, ComponentType } from '@firebase/component';
import { FirebaseInstallations } from '@firebase/installations-types';
import {
  isIndexedDBAvailable,
  validateIndexedDBOpenable
} from '@firebase/util';
import { name, version } from './package.json';

const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export function registerPerformance(instance: FirebaseNamespace): void {
  const factoryMethod = (
    app: FirebaseApp,
    installations: FirebaseInstallations
  ): PerformanceController => {
    if (app.name !== DEFAULT_ENTRY_NAME) {
      throw ERROR_FACTORY.create(ErrorCode.FB_NOT_DEFAULT);
    }
    if (typeof window === 'undefined') {
      throw ERROR_FACTORY.create(ErrorCode.NO_WINDOW);
    }
    setupApi(window);
    SettingsService.getInstance().firebaseAppInstance = app;
    SettingsService.getInstance().installationsService = installations;
    return new PerformanceController(app);
  };

  const NAMESPACE_EXPORTS = {
    isSupported
  };

  // Register performance with firebase-app.
  (instance as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component(
      'performance',
      container => {
        /* Dependencies */
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        // The following call will always succeed because perf has `import '@firebase/installations'`
        const installations = container
          .getProvider('installations')
          .getImmediate();

        return factoryMethod(app, installations);
      },
      ComponentType.PUBLIC
    ).setServiceProps(NAMESPACE_EXPORTS)
  );

  instance.registerVersion(name, version);
}

registerPerformance(firebase);

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    performance?: {
      (app?: FirebaseApp): FirebasePerformance;
      isSupprted(): Promise<boolean>;
    };
  }
  interface FirebaseApp {
    performance?(): FirebasePerformance;
  }
}

async function isSupported(): Promise<boolean> {
  if (
    !fetch ||
    !Promise ||
    !navigator ||
    !navigator.cookieEnabled ||
    !isIndexedDBAvailable()
  ) {
    return false;
  }
  try {
    const isDBOpenable: boolean = await validateIndexedDBOpenable();
    return isDBOpenable;
  } catch (error) {
    return false;
  }
}
