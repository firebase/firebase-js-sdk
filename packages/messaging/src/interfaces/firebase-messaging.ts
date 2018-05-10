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

import {
  CompleteFn,
  ErrorFn,
  NextFn,
  Observer,
  Unsubscribe
} from '@firebase/util';

export interface FirebaseMessaging {
  deleteToken(token: string): Promise<boolean>;
  getToken(): Promise<string | null>;
  onMessage(
    // tslint:disable-next-line no-any The message payload can be anything.
    nextOrObserver: NextFn<any> | Observer<any>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  onTokenRefresh(
    // tslint:disable-next-line no-any Not implemented yet.
    nextOrObserver: NextFn<any> | Observer<any>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  requestPermission(): Promise<void>;
  setBackgroundMessageHandler(
    // tslint:disable no-any The message payload can be anything.
    callback: (payload: any) => Promise<any> | void
  ): void;
  useServiceWorker(registration: ServiceWorkerRegistration): void;
  usePublicVapidKey(b64PublicKey: string): void;
}
