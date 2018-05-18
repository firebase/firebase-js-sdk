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

import { FirebaseApp } from '@firebase/app-types';
import {
  CompleteFn,
  ErrorFn,
  NextFn,
  Observer,
  Unsubscribe
} from '@firebase/util';

import { BaseController } from './src/controllers/base-controller';
import { SwController } from './src/controllers/sw-controller';
import { WindowController } from './src/controllers/window-controller';
import { ERROR_CODES, errorFactory } from './src/models/errors';

export class FirebaseMessaging {
  private readonly controller: BaseController;

  constructor(app: FirebaseApp) {
    if (!isSupported()) {
      throw errorFactory.create(ERROR_CODES.UNSUPPORTED_BROWSER);
    }

    if (self && 'ServiceWorkerGlobalScope' in self) {
      // Running in ServiceWorker context
      this.controller = new SwController(app);
    } else {
      // Assume we are in the window context.
      this.controller = new WindowController(app);
    }
  }

  get app(): FirebaseApp {
    return this.controller.app;
  }

  deleteToken(token: string): Promise<boolean> {
    return this.controller.deleteToken(token);
  }

  getToken(): Promise<string | null> {
    return this.controller.getToken();
  }

  onMessage(
    // tslint:disable-next-line no-any The message payload can be anything.
    nextOrObserver: NextFn<any> | Observer<any>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    return this.controller.onMessage(nextOrObserver, error, completed);
  }

  onTokenRefresh(
    // tslint:disable-next-line no-any Not implemented yet.
    nextOrObserver: NextFn<any> | Observer<any>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    return this.controller.onTokenRefresh(nextOrObserver, error, completed);
  }

  requestPermission(): Promise<void> {
    return this.controller.requestPermission();
  }

  setBackgroundMessageHandler(
    // tslint:disable no-any The message payload can be anything.
    callback: (payload: any) => Promise<any> | void
  ): void {
    return this.controller.setBackgroundMessageHandler(callback);
  }

  useServiceWorker(registration: ServiceWorkerRegistration): void {
    return this.controller.useServiceWorker(registration);
  }

  usePublicVapidKey(b64PublicKey: string): void {
    return this.controller.usePublicVapidKey(b64PublicKey);
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
