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
import { registerFcmRegistrationWithFid } from '../internals/register-fid';
import {
  dbGetFidRegistration,
  dbSetFidRegistration
} from '../internals/idb-manager';

const FID_REGISTRATION_REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Registers the app instance with FCM using its Firebase Installation ID (FID) from
 * Firebase Installations. Once registered, use the FID to target messages to this app
 * instance. Unlike getToken(), this does not return the FID; the FID is delivered via the
 * onRegistered callback.
 *
 * Call this to complete FID-based registration even when a legacy FCM token still exists.
 * Once onRegistered provides an FID, the app should instruct the backend to remove any
 * legacy token previously associated with this instance.
 *
 * When called multiple times, onRegistered is only invoked when the FID has changed
 * from the last notified value (or on first call), so the same identity is not reported twice.
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

  if (!messaging.onRegisteredHandler) {
    throw ERROR_FACTORY.create(ErrorCode.INVALID_ON_REGISTERED_HANDLER);
  }

  await updateVapidKey(messaging, options?.vapidKey);
  await updateSwReg(messaging, options?.serviceWorkerRegistration);

  const prev = messaging._registerNotifyChain;
  messaging._registerNotifyChain = prev.then(async () => {
    const fid = await messaging.firebaseDependencies.installations.getId();

    const stored = await dbGetFidRegistration(messaging.firebaseDependencies);
    const now = Date.now();
    const shouldRefresh =
      !stored ||
      stored.fid !== fid ||
      now >= stored.lastRegisterTime + FID_REGISTRATION_REFRESH_MS;

    if (!shouldRefresh) {
      // Nothing to do: same FID and within refresh window.
      return;
    }

    await registerFcmRegistrationWithFid(messaging, fid);
    await dbSetFidRegistration(messaging.firebaseDependencies, {
      fid,
      lastRegisterTime: now
    });

    const handler = messaging.onRegisteredHandler;
    if (!handler) {
      return;
    }

    // Notify the app after a backend sync when the identity changes, or when a weekly refresh occurs.
    // (Also notify when no stored registration exists, since we just established one.)
    const shouldNotify =
      fid !== messaging.lastNotifiedFid ||
      !stored ||
      now >= stored.lastRegisterTime + FID_REGISTRATION_REFRESH_MS;
    if (shouldNotify) {
      messaging.lastNotifiedFid = fid;
      if (typeof handler === 'function') {
        handler(fid);
      } else {
        handler.next(fid);
      }
    }
  });
  return messaging._registerNotifyChain;
}
