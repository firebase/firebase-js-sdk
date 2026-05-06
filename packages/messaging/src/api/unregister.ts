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
  dbGetFidRegistration,
  dbRemoveFidRegistration
} from '../internals/idb-manager';
import { requestDeleteRegistration } from '../internals/requests';

/**
 * Unregisters the app instance from FCM by deleting its FID-based registration.
 *
 * On success, triggers the `onUnregistered` callback (if registered) with the unregistered FID.
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

  if (messaging.lastNotifiedFid === fid) {
    messaging.lastNotifiedFid = null;
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
