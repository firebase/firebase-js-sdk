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

import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import {
  FirebaseMessaging,
  MessagePayload
} from '@firebase/messaging-types-exp';
import { NextFn, Observer, Unsubscribe } from '@firebase/util';

import { MessagingService } from './messaging-service';
import { Provider } from '@firebase/component';
import { deleteToken as _deleteToken } from './api/deleteToken';
import { _getProvider } from '@firebase/app-exp';
import { getToken as _getToken } from './api/getToken';
import { onBackgroundMessage as _onBackgroundMessage } from './api/onBackgroundMessage';
import { onMessage as _onMessage } from './api/onMessage';

export function getMessaging(app: FirebaseApp): FirebaseMessaging {
  const messagingProvider: Provider<'messaging-exp'> = _getProvider(
    app,
    'messaging-exp'
  );

  return messagingProvider.getImmediate();
}

export async function getToken(
  messaging: FirebaseMessaging,
  options?: { vapidKey?: string; swReg?: ServiceWorkerRegistration }
): Promise<string> {
  return _getToken(messaging as MessagingService, options);
}

export function deleteToken(messaging: FirebaseMessaging): Promise<boolean> {
  return _deleteToken(messaging as MessagingService);
}

export function onMessage(
  messaging: FirebaseMessaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  return _onMessage(messaging as MessagingService, nextOrObserver);
}

export function onBackgroundMessage(
  messaging: FirebaseMessaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  return _onBackgroundMessage(messaging as MessagingService, nextOrObserver);
}
