/**
 * @license
 * Copyright 2017 Google LLC
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

import { ERROR_FACTORY, ErrorCode } from './util/errors';
import { FirebaseApp, _getProvider, getApp } from '@firebase/app';
import {
  GetTokenOptions,
  MessagePayload,
  Messaging
} from './interfaces/public-types';
import {
  NextFn,
  Observer,
  Unsubscribe,
  getModularInstance
} from '@firebase/util';
import { isSwSupported, isWindowSupported } from './api/isSupported';

import { MessagingService } from './messaging-service';
import { deleteToken as _deleteToken } from './api/deleteToken';
import { getToken as _getToken } from './api/getToken';
import { onBackgroundMessage as _onBackgroundMessage } from './api/onBackgroundMessage';
import { onMessage as _onMessage } from './api/onMessage';
import { _setDeliveryMetricsExportedToBigQueryEnabled } from './api/setDeliveryMetricsExportedToBigQueryEnabled';

/**
 * Retrieves a Firebase Cloud Messaging instance.
 *
 * @returns The Firebase Cloud Messaging instance associated with the provided firebase app.
 *
 * @public
 */
export function getMessagingInWindow(app: FirebaseApp = getApp()): Messaging {
  // Conscious decision to make this async check non-blocking during the messaging instance
  // initialization phase for performance consideration. An error would be thrown latter for
  // developer's information. Developers can then choose to import and call `isSupported` for
  // special handling.
  isWindowSupported().then(
    isSupported => {
      // If `isWindowSupported()` resolved, but returned false.
      if (!isSupported) {
        throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
      }
    },
    _ => {
      // If `isWindowSupported()` rejected.
      throw ERROR_FACTORY.create(ErrorCode.INDEXED_DB_UNSUPPORTED);
    }
  );
  return _getProvider(getModularInstance(app), 'messaging').getImmediate();
}

/**
 * Retrieves a Firebase Cloud Messaging instance.
 *
 * @returns The Firebase Cloud Messaging instance associated with the provided firebase app.
 *
 * @public
 */
export function getMessagingInSw(app: FirebaseApp = getApp()): Messaging {
  // Conscious decision to make this async check non-blocking during the messaging instance
  // initialization phase for performance consideration. An error would be thrown latter for
  // developer's information. Developers can then choose to import and call `isSupported` for
  // special handling.
  isSwSupported().then(
    isSupported => {
      // If `isSwSupported()` resolved, but returned false.
      if (!isSupported) {
        throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
      }
    },
    _ => {
      // If `isSwSupported()` rejected.
      throw ERROR_FACTORY.create(ErrorCode.INDEXED_DB_UNSUPPORTED);
    }
  );
  return _getProvider(getModularInstance(app), 'messaging-sw').getImmediate();
}

/**
 * Subscribes the {@link Messaging} instance to push notifications. Returns a Firebase Cloud
 * Messaging registration token that can be used to send push messages to that {@link Messaging}
 * instance.
 *
 * If notification permission isn't already granted, this method asks the user for permission. The
 * returned promise rejects if the user does not allow the app to show notifications.
 *
 * @param messaging - The {@link Messaging} instance.
 * @param options - Provides an optional vapid key and an optional service worker registration.
 *
 * @returns The promise resolves with an FCM registration token.
 *
 * @public
 */
export async function getToken(
  messaging: Messaging,
  options?: GetTokenOptions
): Promise<string> {
  messaging = getModularInstance(messaging);
  return _getToken(messaging as MessagingService, options);
}

/**
 * Deletes the registration token associated with this {@link Messaging} instance and unsubscribes
 * the {@link Messaging} instance from the push subscription.
 *
 * @param messaging - The {@link Messaging} instance.
 *
 * @returns The promise resolves when the token has been successfully deleted.
 *
 * @public
 */
export function deleteToken(messaging: Messaging): Promise<boolean> {
  messaging = getModularInstance(messaging);
  return _deleteToken(messaging as MessagingService);
}

/**
 * When a push message is received and the user is currently on a page for your origin, the
 * message is passed to the page and an `onMessage()` event is dispatched with the payload of
 * the push message.
 *
 *
 * @param messaging - The {@link Messaging} instance.
 * @param nextOrObserver - This function, or observer object with `next` defined,
 *     is called when a message is received and the user is currently viewing your page.
 * @returns To stop listening for messages execute this returned function.
 *
 * @public
 */
export function onMessage(
  messaging: Messaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  messaging = getModularInstance(messaging);
  return _onMessage(messaging as MessagingService, nextOrObserver);
}

/**
 * Called when a message is received while the app is in the background. An app is considered to be
 * in the background if no active window is displayed.
 *
 * @param messaging - The {@link Messaging} instance.
 * @param nextOrObserver - This function, or observer object with `next` defined, is called when a
 * message is received and the app is currently in the background.
 *
 * @returns To stop listening for messages execute this returned function
 *
 * @public
 */
export function onBackgroundMessage(
  messaging: Messaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  messaging = getModularInstance(messaging);
  return _onBackgroundMessage(messaging as MessagingService, nextOrObserver);
}

/**
 * Enables or disables Firebase Cloud Messaging message delivery metrics export to BigQuery. By
 * default, message delivery metrics are not exported to BigQuery. Use this method to enable or
 * disable the export at runtime.
 *
 * @param messaging - The `FirebaseMessaging` instance.
 * @param enable - Whether Firebase Cloud Messaging should export message delivery metrics to
 * BigQuery.
 *
 * @public
 */
export function experimentalSetDeliveryMetricsExportedToBigQueryEnabled(
  messaging: Messaging,
  enable: boolean
): void {
  messaging = getModularInstance(messaging);
  return _setDeliveryMetricsExportedToBigQueryEnabled(messaging, enable);
}
