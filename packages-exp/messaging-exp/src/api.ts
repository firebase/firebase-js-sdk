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

import {
  FirebaseMessaging,
  MessagePayload
} from '@firebase/messaging-types-exp';
import { NextFn, Observer, Unsubscribe } from '@firebase/util';

import { FirebaseApp } from '@firebase/app-types-exp';
import { MessagingService } from './messaging-service';
import { Provider } from '@firebase/component';
import { deleteToken as _deleteToken } from './api/deleteToken';
import { _getProvider } from '@firebase/app-exp';
import { getToken as _getToken } from './api/getToken';
import { onBackgroundMessage as _onBackgroundMessage } from './api/onBackgroundMessage';
import { onMessage as _onMessage } from './api/onMessage';

/**
 * Retrieves a firebase messaging instance.
 *
 * @return the firebase messaging instance associated with the provided firebase app.
 */
export function getMessaging(app: FirebaseApp): FirebaseMessaging {
  const messagingProvider: Provider<'messaging-exp'> = _getProvider(
    app,
    'messaging-exp'
  );

  return messagingProvider.getImmediate();
}

/**
 * Subscribes the messaging instance to push notifications. Returns an FCM registration token
 * that can be used to send push messages to that messaging instance.
 *
 * If a notification permission isn't already granted, this method asks the user for permission.
 * The returned promise rejects if the user does not allow the app to show notifications.
 *
 * @param messaging: the messaging instance.
 * @param options.vapidKey The public server key provided to push services. It is used to
 * authenticate the push subscribers to receive push messages only from sending servers that
 * hold the corresponding private key. If it is not provided, a default VAPID key is used. Note
 * that some push services (Chrome Push Service) require a non-default VAPID key. Therefore, it
 * is recommended to generate and import a VAPID key for your project with
 * {@link https://firebase.google.com/docs/cloud-messaging/js/client#configure_web_credentials_with_fcm Configure Web Credentials with FCM}.
 * See
 * {@link https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol The Web Push Protocol}
 * for details on web push services.}
 *
 * @param options.serviceWorkerRegistration The service worker registration for receiving push
 * messaging. If the registration is not provided explicitly, you need to have a
 * `firebase-messaging-sw.js` at your root location. See
 * {@link https://firebase.google.com/docs/cloud-messaging/js/client#retrieve-the-current-registration-token Retrieve the current registration token}
 * for more details.
 *
 * @return The promise resolves with an FCM registration token.
 *
 */
export async function getToken(
  messaging: FirebaseMessaging,
  options?: { vapidKey?: string; swReg?: ServiceWorkerRegistration }
): Promise<string> {
  return _getToken(messaging as MessagingService, options);
}

/**
 * Deletes the registration token associated with this messaging instance and unsubscribes the
 * messaging instance from the push subscription.
 *
 * @param messaging: the messaging instance.
 *
 * @return The promise resolves when the token has been successfully deleted.
 */
export function deleteToken(messaging: FirebaseMessaging): Promise<boolean> {
  return _deleteToken(messaging as MessagingService);
}

/**
 * When a push message is received and the user is currently on a page for your origin, the
 * message is passed to the page and an `onMessage()` event is dispatched with the payload of
 * the push message.
 *
 *
 * @param messaging: the messaging instance.
 * @param
 *     nextOrObserver This function, or observer object with `next` defined,
 *     is called when a message is received and the user is currently viewing your page.
 * @return To stop listening for messages execute this returned function.
 */
export function onMessage(
  messaging: FirebaseMessaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  return _onMessage(messaging as MessagingService, nextOrObserver);
}

/**
 * Called when a message is received while the app is in the background. An app is considered to
 * be in the background if no active window is displayed.
 *
 * @param messaging: the messaging instance.
 * @param
 *     nextOrObserver This function, or observer object with `next` defined,
 *     is called when a message is received and the app is currently in the background.
 *
 * @return To stop listening for messages execute this returned function
 */
export function onBackgroundMessage(
  messaging: FirebaseMessaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  return _onBackgroundMessage(messaging as MessagingService, nextOrObserver);
}
