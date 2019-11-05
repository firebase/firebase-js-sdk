/**
 * @license
 * Copyright 2017 Google Inc.
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
import {
  _FirebaseNamespace,
  FirebaseService
} from '@firebase/app-types/private';
import { FirebaseMessaging } from '@firebase/messaging-types';
import { SwController } from './src/controllers/sw-controller';
import { WindowController } from './src/controllers/window-controller';
import { ErrorCode, errorFactory } from './src/models/errors';
import {
  Component,
  ComponentType,
  ComponentContainer
} from '@firebase/component';

export function registerMessaging(instance: _FirebaseNamespace): void {
  const messagingName = 'messaging';

  const factoryMethod = (container: ComponentContainer): FirebaseService => {
    /* Dependencies */
    const app = container.getProvider('app').getImmediate();
    const installations = container.getProvider('installations').getImmediate();
    const analyticsProvider = container.getProvider('analytics-internal');

    const firebaseServices = { app, installations, analyticsProvider};

    if (!isSupported()) {
      throw errorFactory.create(ErrorCode.UNSUPPORTED_BROWSER);
    }

    if (self && 'ServiceWorkerGlobalScope' in self) {
      // Running in ServiceWorker context
      return new SwController(firebaseServices);
    } else {
      // Assume we are in the window context.
      return new WindowController(firebaseServices);
    }
  };

  const namespaceExports = {
    isSupported
  };

  instance.INTERNAL.registerComponent(
    new Component(
      messagingName,
      factoryMethod,
      ComponentType.PUBLIC
    ).setServiceProps(namespaceExports)
  );
}

registerMessaging(firebase as _FirebaseNamespace);

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

export function isSupported(): boolean {
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
    'PushManager' in self &&
    'Notification' in self &&
    ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
    PushSubscription.prototype.hasOwnProperty('getKey')
  );
}
