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
import { MessagingService } from '../messaging-service';

/**
 * When the Firebase Installation ID changes, re-run `register()` so FCM registration and
 * onRegistered run for the new FID. No-op if no onRegistered handler is set.
 */
export function subscribeFidChangeRegistration(
  messaging: MessagingService,
  installations: Installations
): IdChangeUnsubscribeFn {
  return onIdChange(installations, () => {
    if (!messaging.onRegisteredHandler) {
      return;
    }
    void register(messaging).catch(() => {
      // Best-effort: permission may be revoked or SW unavailable after FID rotation.
    });
  });
}
