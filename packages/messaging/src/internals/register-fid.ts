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

/**
 * For the new FID-based register path:
 * - Create (or refresh) an FCM Web registration in the backend via CreateRegistration.
 * - Use the FIS auth token produced by the installations instance (implicitly associated with FID).
 */
export async function registerFcmRegistrationWithFid(
  messaging: MessagingService
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

  // Only rely on HTTP success/failure; do not depend on response token.
  await requestCreateRegistration(
    messaging.firebaseDependencies,
    subscriptionOptions
  );
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
