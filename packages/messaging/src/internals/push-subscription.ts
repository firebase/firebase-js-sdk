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

import { base64ToArray } from '../helpers/array-base64-translator';

/**
 * Gets a PushSubscription for the current user that uses `vapidKey` as its application server key.
 *
 * Browsers reject `PushManager.subscribe()` with a different key while a subscription exists, so an
 * existing subscription created with another key is unsubscribed first. If the browser doesn't
 * expose the key of the existing subscription, that subscription is reused.
 */
export async function getPushSubscription(
  swRegistration: ServiceWorkerRegistration,
  vapidKey: string
): Promise<PushSubscription> {
  // Chrome <= 75 doesn't support base64-encoded VAPID key. For backward compatibility, VAPID key
  // submitted to pushManager#subscribe must be of type Uint8Array.
  const applicationServerKey = base64ToArray(vapidKey);

  const subscription = await swRegistration.pushManager.getSubscription();
  if (subscription) {
    const currentKey = subscription.options?.applicationServerKey;
    if (
      !currentKey ||
      isSameKey(new Uint8Array(currentKey), applicationServerKey)
    ) {
      return subscription;
    }
    await subscription.unsubscribe();
  }

  return swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    // `PushManager.subscribe` expects a `BufferSource`; `base64ToArray` produces a typed array.
    // Cast to satisfy the lib typing differences across TS DOM versions.
    applicationServerKey: applicationServerKey as unknown as BufferSource
  });
}

/** Compares keys byte-wise, so that different base64 spellings of the same key are equal. */
function isSameKey(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
