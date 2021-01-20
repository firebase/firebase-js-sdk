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

import { ERROR_FACTORY, ErrorCode } from '../util/errors';

import { MessagingService } from '../messaging-service';
import { getTokenInternal } from '../internals/token-manager';
import { messageEventListener } from '../listeners/messageEventListener';
import { updateSwReg } from '../helpers/updateSwReg';
import { updateVapidKey } from '../helpers/updateVapidKey';

export async function getToken(
  messaging: MessagingService,
  options?: {
    vapidKey?: string;
    serviceWorkerRegistration?: ServiceWorkerRegistration;
  }
): Promise<string> {
  if (!navigator) {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  navigator.serviceWorker.addEventListener('message', e =>
    messageEventListener(messaging, e)
  );

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission !== 'granted') {
    throw ERROR_FACTORY.create(ErrorCode.PERMISSION_BLOCKED);
  }

  await updateVapidKey(messaging, options?.vapidKey);
  await updateSwReg(messaging, options?.serviceWorkerRegistration);

  return getTokenInternal(messaging);
}
