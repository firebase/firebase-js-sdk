/**
 * @license
 * Copyright 2020 Google LLC
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
  FirebaseApp as AppCompat,
  _FirebaseService
} from '@firebase/app-compat';
import {
  FirebaseMessaging,
  MessagePayload,
  deleteToken,
  getToken,
  onMessage,
  onBackgroundMessage
} from '@firebase/messaging-exp';
import { NextFn, Observer, Unsubscribe } from '@firebase/util';

export class MessagingCompat implements _FirebaseService {
  swRegistration?: ServiceWorkerRegistration;
  vapidKey?: string;

  onBackgroundMessageHandler:
    | NextFn<MessagePayload>
    | Observer<MessagePayload>
    | null = null;

  onMessageHandler:
    | NextFn<MessagePayload>
    | Observer<MessagePayload>
    | null = null;

  constructor(readonly app: AppCompat, readonly messaging: FirebaseMessaging) {
    this.app = app;
    this.messaging = messaging;
  }

  async getToken(options?: {
    vapidKey?: string;
    serviceWorkerRegistration?: ServiceWorkerRegistration;
  }): Promise<string> {
    return getToken(this.messaging, options);
  }

  async deleteToken(): Promise<boolean> {
    return deleteToken(this.messaging);
  }

  onMessage(
    nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
  ): Unsubscribe {
    return onMessage(this.messaging, nextOrObserver);
  }

  onBackgroundMessage(
    nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
  ): Unsubscribe {
    return onBackgroundMessage(this.messaging, nextOrObserver);
  }
}
