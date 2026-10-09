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

import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { MessagingService } from '../messaging-service';
import {
  dbRemove,
  dbGetFidRegistration,
  dbRemoveFidRegistration
} from '../internals/idb-manager';
import { requestDeleteRegistration } from '../internals/requests';

/**
 * Unregisters the app instance from FCM by deleting its FID-based registration.
 *
 * After the registration is deleted, clears local metadata and, when the service worker
 * registration is known to this instance, unsubscribes the browser push subscription
 * (best-effort). On success, triggers the `onUnregistered` callback (if set) with the
 * unregistered FID.
 *
 * @param messaging - The MessagingService instance.
 */
export async function unregister(messaging: MessagingService): Promise<void> {
  if (!navigator) {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  // Prefer the last successfully registered FID from local metadata when available.
  const stored = await dbGetFidRegistration(
    messaging.firebaseDependencies
  ).catch(() => undefined);
  const fid =
    stored?.fid ?? (await messaging.firebaseDependencies.installations.getId());

  await requestDeleteRegistration(messaging.firebaseDependencies, fid);

  // Best-effort local cleanup; still resolve even if schema is unavailable.
  try {
    await dbRemoveFidRegistration(messaging.firebaseDependencies);
  } catch {
    // Ignore.
  }

  // Best-effort cleanup of legacy token details created via getToken().
  try {
    await dbRemove(messaging.firebaseDependencies);
  } catch {
    // Ignore.
  }

  // Also unsubscribe the browser push subscription, as deleteToken() does, so that the endpoint of
  // the deleted registration can no longer receive pushes. This is only possible when the service
  // worker registration is known to this instance. Best-effort, since the backend registration and
  // local metadata are already gone. Done before notifying onUnregistered so that a handler which
  // registers again starts from a clean state.
  if (messaging.swRegistration) {
    try {
      const pushSubscription =
        await messaging.swRegistration.pushManager.getSubscription();
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }
    } catch (e) {
      // Don't fail unregister(), but surface the failure since the endpoint may remain subscribed.
      console.warn(
        'unregister(): failed to unsubscribe the push subscription.',
        e
      );
    }
  }

  const handler = messaging.onUnregisteredHandler;
  if (!handler) {
    return;
  }

  if (typeof handler === 'function') {
    handler(fid);
  } else {
    handler.next(fid);
  }
}
