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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import {
  Observer,
  Unsubscribe,
  NextFn,
  ErrorFn,
  CompleteFn
} from '@firebase/util';
import { MessagePayload } from '../messaging/src/interfaces/message-payload';

export interface FirebaseMessaging {
  /** window controller */
  deleteToken(): Promise<boolean>;
  getToken(options?: {
    vapidKey?: string;
    serviceWorkerRegistration?: ServiceWorkerRegistration;
  }): Promise<string>;
  onMessage(
    nextOrObserver: NextFn<any> | Observer<any>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;

  /** service worker controller */
  onBackgroundMessage(
    nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;

  /** @deprecated */
  deleteToken(token: string): Promise<boolean>;
  getToken(): Promise<string>;
  onTokenRefresh(
    nextOrObserver: NextFn<any> | Observer<any>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  setBackgroundMessageHandler(
    callback: (payload: any) => Promise<any> | void
  ): void;
  useServiceWorker(registration: ServiceWorkerRegistration): void;
  usePublicVapidKey(b64PublicKey: string): void;
}

export type FirebaseMessagingName = 'messaging';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'messaging': FirebaseMessaging;
  }
}
