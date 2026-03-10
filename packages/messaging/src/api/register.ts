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
import { updateSwReg } from '../helpers/updateSwReg';
import { updateVapidKey } from '../helpers/updateVapidKey';
import { RegisterOptions } from '../interfaces/public-types';

/**
 * Links the app instance to its Firebase Installation ID (FID). Unlike getToken(),
 * this does not return the FID; the FID is delivered via the onRegistered callback.
 * Call this to establish an FID-based identity even when a legacy token exists.
 * Once onRegistered provides an FID, the app should instruct the backend to deprecate
 * any legacy token previously associated with this instance.
 *
 * @param messaging - The MessagingService instance.
 * @param options - Optional. Same options as getToken (vapidKey, serviceWorkerRegistration).
 */
export async function register(
  messaging: MessagingService,
  options?: RegisterOptions
): Promise<void> {
  if (!navigator) {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission !== 'granted') {
    throw ERROR_FACTORY.create(ErrorCode.PERMISSION_BLOCKED);
  }

  await updateVapidKey(messaging, options?.vapidKey);
  await updateSwReg(messaging, options?.serviceWorkerRegistration);

  const fid =
    await messaging.firebaseDependencies.installations.getId();

  if (messaging.onRegisteredHandler) {
    if (typeof messaging.onRegisteredHandler === 'function') {
      messaging.onRegisteredHandler(fid);
    } else {
      messaging.onRegisteredHandler.next(fid);
    }
  }
}
