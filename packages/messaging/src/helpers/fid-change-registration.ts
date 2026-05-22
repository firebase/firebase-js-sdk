/**
 * @license
 * Copyright 2026 Google LLC
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
  IdChangeUnsubscribeFn,
  Installations,
  onIdChange
} from '@firebase/installations';
import { register } from '../api/register';
import {
  dbGetFidRegistration,
  dbSetFidRegistration
} from '../internals/idb-manager';
import { registerFcmRegistrationWithFid } from '../internals/register-fid';
import { notifyOnRegistered } from '../internals/token-manager';
import { MessagingService } from '../messaging-service';
import { updateVapidKey } from './updateVapidKey';

/**
 * Re-runs FCM FID registration when push subscription keys change (e.g. `pushsubscriptionchange`
 * in the service worker). No-op if the app instance was never registered via `register()`.
 * Best-effort: callers should catch failures when permission or push may be unavailable.
 */
export async function refreshFidRegistrationIfStored(
  messaging: MessagingService
): Promise<void> {
  const stored = await dbGetFidRegistration(
    messaging.firebaseDependencies
  ).catch(() => undefined);
  if (!stored) {
    return;
  }

  await updateVapidKey(messaging, stored.vapidKey);

  const fid = await messaging.firebaseDependencies.installations.getId();
  await registerFcmRegistrationWithFid(messaging, fid);
  await dbSetFidRegistration(messaging.firebaseDependencies, {
    fid,
    lastRegisterTime: Date.now(),
    vapidKey: messaging.vapidKey
  });
  notifyOnRegistered(messaging, fid);
}

/**
 * When the Firebase Installation ID changes, re-run `register()` so FCM registration and
 * onRegistered run for the new FID. No-op if no onRegistered handler is set or the app
 * instance was never registered with FCM.
 */
export function subscribeFidChangeRegistration(
  messaging: MessagingService,
  installations: Installations
): IdChangeUnsubscribeFn {
  return onIdChange(installations, () => {
    void (async () => {
      if (!messaging.onRegisteredHandler) {
        return;
      }
      const stored = await dbGetFidRegistration(messaging.firebaseDependencies);
      if (!stored) {
        return;
      }
      await register(messaging).catch(() => {
        // Best-effort: permission may be revoked or SW unavailable after FID rotation.
      });
    })();
  });
}
