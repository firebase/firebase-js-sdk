/**
 * @license
 * Copyright 2017 Google LLC
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

import {
  Component,
  ComponentContainer,
  ComponentType
} from '@firebase/component';
import { ERROR_FACTORY, ErrorCode } from './util/errors';
import {
  FirebaseService,
  _FirebaseNamespace
} from '@firebase/app-types/private';

import { FirebaseInternalDependencies } from './interfaces/internal-dependencies';
import { FirebaseMessaging } from '@firebase/messaging-types';
import { SwController } from './controllers/sw-controller';
import { WindowController } from './controllers/window-controller';
import { extractAppConfig } from './helpers/extract-app-config';
import firebase from '@firebase/app';

const MESSAGING_NAME = 'messaging';
function factoryMethod(
  container: ComponentContainer
): FirebaseService & FirebaseMessaging {
  // Dependencies.
  const app = container.getProvider('app').getImmediate();
  const appConfig = extractAppConfig(app);
  const installations = container.getProvider('installations').getImmediate();
  const analyticsProvider = container.getProvider('analytics-internal');

  const firebaseDependencies: FirebaseInternalDependencies = {
    app,
    appConfig,
    installations,
    analyticsProvider
  };

  if (!isSupported()) {
    throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
  }

  if (self && 'ServiceWorkerGlobalScope' in self) {
    // Running in ServiceWorker context
    return new SwController(firebaseDependencies);
  } else {
    // Assume we are in the window context.
    return new WindowController(firebaseDependencies);
  }
}

const NAMESPACE_EXPORTS = {
  isSupported
};

(firebase as _FirebaseNamespace).INTERNAL.registerComponent(
  new Component(
    MESSAGING_NAME,
    factoryMethod,
    ComponentType.PUBLIC
  ).setServiceProps(NAMESPACE_EXPORTS)
);

/**
 * Define extension behavior of `registerMessaging`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    messaging: {
      (app?: FirebaseApp): FirebaseMessaging;
      isSupported(): boolean;
    };
  }
  interface FirebaseApp {
    messaging(): FirebaseMessaging;
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
