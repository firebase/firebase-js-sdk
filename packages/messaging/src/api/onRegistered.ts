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

import { NextFn, Observer, Unsubscribe } from '../interfaces/public-types';
import { MessagingService } from '../messaging-service';

/**
 * Subscribes to FID (Firebase Installation ID) registration events. The observer is invoked
 * when an FID is delivered after an explicit register() call or automatic SDK refresh.
 * Use this to upload the installationId to your application server upon receipt.
 *
 * @param messaging - The {@link MessagingService} instance.
 * @param nextOrObserver - A function or observer object called when an FID is registered.
 * @returns Unsubscribe function to stop listening.
 */
export function onRegistered(
  messaging: MessagingService,
  nextOrObserver: NextFn<string> | Observer<string>
): Unsubscribe {
  messaging.onRegisteredHandler = nextOrObserver;

  return () => {
    messaging.onRegisteredHandler = null;
  };
}
