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
        if (!isSupported()) {
          throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
        }

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
      isSupprted(): boolean;
    };
  }
  interface FirebaseApp {
    performance?(): FirebasePerformance;
  }
}

function isSupported(): boolean {
  if (self && 'ServiceWorkerGlobalScope' in self) {
    // Running in ServiceWorker context
    return isSWControllerSupported();
  } else {
    // Assume we are in the window context.
    return isWindowControllerSupported();
  }
}

/**
 * Checks to see if the required APIs exist.
 */
function isWindowControllerSupported(): boolean {
  return (
    'indexedDB' in window &&
    indexedDB !== null &&
    navigator.cookieEnabled &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    'fetch' in window &&
    ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
    PushSubscription.prototype.hasOwnProperty('getKey')
  );
}

/**
 * Checks to see if the required APIs exist within SW Context.
 */
function isSWControllerSupported(): boolean {
  return (
    'indexedDB' in self &&
    indexedDB !== null &&
    'PushManager' in self &&
    'Notification' in self &&
    ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
    PushSubscription.prototype.hasOwnProperty('getKey')
  );
}
