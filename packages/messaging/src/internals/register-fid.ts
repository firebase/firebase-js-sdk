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

import { SubscriptionOptions } from '../interfaces/registration-details';
import { MessagingService } from '../messaging-service';
import {
  base64ToArray,
  arrayToBase64
} from '../helpers/array-base64-translator';
import { requestCreateRegistration } from './requests';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';

/** Retries when CreateRegistration echoes an FID that does not match Installations.getId(). */
const FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS = 3;

/**
 * For the new FID-based register path:
 * - Create (or refresh) an FCM Web registration in the backend via CreateRegistration.
 * - Use the FIS auth token produced by the installations instance (implicitly associated with FID).
 * - CreateRegistration must echo a non-empty `fid`; it must match `expectedFid` from
 *   Installations.getId(). On mismatch we refresh the auth token and retry, then fail with
 *   `fid-registration-failed`.
 */
export async function registerFcmRegistrationWithFid(
  messaging: MessagingService,
  expectedFid: string
): Promise<void> {
  const pushSubscription = await getPushSubscription(
    messaging.swRegistration!,
    messaging.vapidKey!
  );

  const subscriptionOptions: SubscriptionOptions = {
    vapidKey: messaging.vapidKey!,
    swScope: messaging.swRegistration!.scope,
    endpoint: pushSubscription.endpoint,
    auth: arrayToBase64(pushSubscription.getKey('auth')!),
    p256dh: arrayToBase64(pushSubscription.getKey('p256dh')!)
  };

  const installations = messaging.firebaseDependencies.installations;

  for (
    let attempt = 0;
    attempt < FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS;
    attempt++
  ) {
    const { responseFid } = await requestCreateRegistration(
      messaging.firebaseDependencies,
      subscriptionOptions
    );

    if (responseFid === expectedFid) {
      return;
    }
    // If CreateRegistration echoes an unexpected FID, the FIS auth token used for the request may
    // be stale relative to the installation the backend associates with the call. Force-refresh
    // the token before retrying so the next attempt uses credentials aligned with Installations.
    if (attempt < FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS - 1) {
      await installations.getToken(true);
    }
  }

  throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
    errorInfo:
      'CreateRegistration response FID does not match Firebase Installation ID'
  });
}

async function getPushSubscription(
  swRegistration: ServiceWorkerRegistration,
  vapidKey: string
): Promise<PushSubscription> {
  const subscription = await swRegistration.pushManager.getSubscription();
  if (subscription) {
    return subscription;
  }

  // Chrome/Firefox require applicationServerKey to be of type Uint8Array.
  return swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    // `PushManager.subscribe` expects a `BufferSource`; `base64ToArray` produces a typed array.
    // Cast to satisfy the lib typing differences across TS DOM versions.
    applicationServerKey: base64ToArray(vapidKey) as unknown as BufferSource
  });
}
