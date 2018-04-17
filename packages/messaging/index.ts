/**
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
import {
  _FirebaseNamespace,
  FirebaseServiceFactory
} from '@firebase/app-types/private';

import { SWController } from './src/controllers/sw-controller';
import { WindowController } from './src/controllers/window-controller';
import { ERROR_CODES, errorFactory } from './src/models/errors';

import * as types from '@firebase/messaging-types';

export function registerMessaging(instance: _FirebaseNamespace): void {
  const messagingName = 'messaging';
  const factoryMethod: FirebaseServiceFactory = app => {
    if (self && 'ServiceWorkerGlobalScope' in self) {
      // Running in ServiceWorker context
      if (isSWControllerSupported()) {
        return new SWController(app);
      }
    } else {
      // Assume we are in the window context.
      if (isWindowControllerSupported()) {
        return new WindowController(app);
      }
    }

    throw errorFactory.create(ERROR_CODES.UNSUPPORTED_BROWSER);
  };

  const namespaceExports = {
    // no-inline
    Messaging: WindowController
  };

  instance.INTERNAL.registerService(
    messagingName,
    factoryMethod,
    namespaceExports
  );
}

registerMessaging(firebase as _FirebaseNamespace);

/**
 * Define extension behavior of `registerMessaging`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    messaging?: {
      (app?: FirebaseApp): types.FirebaseMessaging;
      Messaging: typeof types.FirebaseMessaging;
    };
  }
  interface FirebaseApp {
    messaging?(): types.FirebaseMessaging;
  }
}

/**
 * Checks to see if the required APIs exist.
 */
function isWindowControllerSupported(): boolean {
  return (
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
