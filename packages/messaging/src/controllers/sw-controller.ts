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

import { deleteToken, getToken } from '../core/token-management';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { FirebaseMessaging } from '@firebase/messaging-types';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import {
  MessagePayload,
  NotificationDetails
} from '../interfaces/message-payload';
import { FCM_MSG, DEFAULT_VAPID_KEY } from '../util/constants';
import { MessageType, InternalMessage } from '../interfaces/internal-message';
import { dbGet } from '../helpers/idb-manager';
import { Unsubscribe, getBrowserExtensionRuntime } from '@firebase/util';
import { sleep } from '../helpers/sleep';
import { FirebaseApp } from '@firebase/app-types';
import { isConsoleMessage } from '../helpers/is-console-message';
import { FirebaseService } from '@firebase/app-types/private';

// Let TS know that this is a service worker
declare const self: ServiceWorkerGlobalScope;

export type BgMessageHandler = (payload: MessagePayload) => unknown;

export class SwController implements FirebaseMessaging, FirebaseService {
  private vapidKey: string | null = null;
  private bgMessageHandler: BgMessageHandler | null = null;

  constructor(
    private readonly firebaseDependencies: FirebaseInternalDependencies
  ) {
    self.addEventListener('push', e => {
      e.waitUntil(this.onPush(e));
    });
    self.addEventListener('pushsubscriptionchange', e => {
      e.waitUntil(this.onSubChange(e));
    });
    self.addEventListener('notificationclick', e => {
      e.waitUntil(this.onNotificationClick(e));
    });
  }

  get app(): FirebaseApp {
    return this.firebaseDependencies.app;
  }

  /**
   * Calling setBackgroundMessageHandler will opt in to some specific
   * behaviours.
   * 1.) If a notification doesn't need to be shown due to a window already
   * being visible, then push messages will be sent to the page.
   * 2.) If a notification needs to be shown, and the message contains no
   * notification data this method will be called
   * and the promise it returns will be passed to event.waitUntil.
   * If you do not set this callback then all push messages will let and the
   * developer can handle them in a their own 'push' event callback
   *
   * @param callback The callback to be called when a push message is received
   * and a notification must be shown. The callback will be given the data from
   * the push message.
   */
  setBackgroundMessageHandler(callback: BgMessageHandler): void {
    if (!callback || typeof callback !== 'function') {
      throw ERROR_FACTORY.create(ErrorCode.INVALID_BG_HANDLER);
    }

    this.bgMessageHandler = callback;
  }

  // TODO: Remove getToken from SW Controller.
  // Calling this from an old SW can cause all kinds of trouble.
  async getToken(): Promise<string> {
    if (!this.vapidKey) {
      // Call getToken using the current VAPID key if there already is a token.
      // This is needed because usePublicVapidKey was not available in SW.
      // It will be removed when vapidKey becomes a parameter of getToken, or
      // when getToken is removed from SW.
      const tokenDetails = await dbGet(this.firebaseDependencies);
      this.vapidKey =
        tokenDetails?.subscriptionOptions?.vapidKey ?? DEFAULT_VAPID_KEY;
    }

    return getToken(
      this.firebaseDependencies,
      self.registration,
      this.vapidKey
    );
  }

  // TODO: Remove deleteToken from SW Controller.
  // Calling this from an old SW can cause all kinds of trouble.
  deleteToken(): Promise<boolean> {
    return deleteToken(this.firebaseDependencies, self.registration);
  }

  requestPermission(): Promise<void> {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  // TODO: Deprecate this and make VAPID key a parameter in getToken.
  // TODO: Remove this together with getToken from SW Controller.
  usePublicVapidKey(vapidKey: string): void {
    if (this.vapidKey !== null) {
      throw ERROR_FACTORY.create(ErrorCode.USE_VAPID_KEY_AFTER_GET_TOKEN);
    }

    if (typeof vapidKey !== 'string' || vapidKey.length === 0) {
      throw ERROR_FACTORY.create(ErrorCode.INVALID_VAPID_KEY);
    }

    this.vapidKey = vapidKey;
  }

  useServiceWorker(): void {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  onMessage(): Unsubscribe {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  onTokenRefresh(): Unsubscribe {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  /**
   * A handler for push events that shows notifications based on the content of
   * the payload.
   *
   * The payload must be a JSON-encoded Object with a `notification` key. The
   * value of the `notification` property will be used as the NotificationOptions
   * object passed to showNotification. Additionally, the `title` property of the
   * notification object will be used as the title.
   *
   * If there is no notification data in the payload then no notification will be
   * shown.
   */
  async onPush(event: PushEvent): Promise<void> {
    const payload = getMessagePayload(event);
    if (!payload) {
      return;
    }

    const clientList = await getClientList();
    if (await hasVisibleClients(clientList)) {
      // App in foreground. Send to page.
      return sendMessageToWindowClients(clientList, payload);
    }

    const notificationDetails = getNotificationData(payload);
    if (notificationDetails) {
      await showNotification(notificationDetails);
    } else if (this.bgMessageHandler) {
      await this.bgMessageHandler(payload);
    }
  }

  async onSubChange(event: PushSubscriptionChangeEvent): Promise<void> {
    const { newSubscription } = event;
    if (!newSubscription) {
      // Subscription revoked, delete token
      await deleteToken(this.firebaseDependencies, self.registration);
      return;
    }

    const tokenDetails = await dbGet(this.firebaseDependencies);
    await deleteToken(this.firebaseDependencies, self.registration);
    await getToken(
      this.firebaseDependencies,
      self.registration,
      tokenDetails?.subscriptionOptions?.vapidKey ?? DEFAULT_VAPID_KEY
    );
  }

  async onNotificationClick(event: NotificationEvent): Promise<void> {
    const payload: MessagePayload = event.notification?.data?.[FCM_MSG];
    if (!payload) {
      // Not an FCM notification, do nothing.
      return;
    } else if (event.action) {
      // User clicked on an action button.
      // This will allow devs to act on action button clicks by using a custom
      // onNotificationClick listener that they define.
      return;
    }

    // Prevent other listeners from receiving the event
    event.stopImmediatePropagation();
    event.notification.close();

    const link = getLink(payload);
    if (!link) {
      return;
    }

    let client = await getWindowClient(link);
    if (!client) {
      // Unable to find window client so need to open one.
      // This also focuses the opened client.
      client = await self.clients.openWindow(link);
      // Wait three seconds for the client to initialize and set up the message
      // handler so that it can receive the message.
      await sleep(3000);
    } else {
      client = await client.focus();
    }

    if (!client) {
      // Window Client will not be returned if it's for a third party origin.
      return;
    }

    const message = createNewMessage(MessageType.NOTIFICATION_CLICKED, payload);
    return client.postMessage(message);
  }
}

function getMessagePayload({ data }: PushEvent): MessagePayload | null {
  if (!data) {
    return null;
  }

  try {
    return data.json();
  } catch (err) {
    // Not JSON so not an FCM message.
    return null;
  }
}

function getNotificationData(
  payload: MessagePayload
): NotificationDetails | undefined {
  if (!payload || typeof payload.notification !== 'object') {
    return;
  }

  const notificationInformation: NotificationDetails = {
    ...payload.notification
  };

  // Put the message payload under FCM_MSG name so we can identify the
  // notification as being an FCM notification vs a notification from
  // somewhere else (i.e. normal web push or developer generated
  // notification).
  notificationInformation.data = {
    ...payload.notification.data,
    [FCM_MSG]: payload
  };

  return notificationInformation;
}

/**
 * @param url The URL to look for when focusing a client.
 * @return Returns an existing window client or a newly opened WindowClient.
 */
async function getWindowClient(url: string): Promise<WindowClient | null> {
  // Use URL to normalize the URL when comparing to windowClients.
  // This at least handles whether to include trailing slashes or not
  const parsedURL = new URL(url, self.location.href);

  const clientList = await getClientList();

  for (const client of clientList) {
    const parsedClientUrl = new URL(client.url, self.location.href);
    if (parsedClientUrl.host === parsedURL.host) {
      return client;
    }
  }

  return null;
}

/**
 * @returns If there is currently a visible WindowClient, this method will
 * resolve to true, otherwise false.
 */
async function hasVisibleClients(clientList: WindowClient[]): Promise<boolean> {
  const checkedClientList = await Promise.all(
    clientList.map(
      async client =>
        client.visibilityState === 'visible' &&
        // Ignore browser extension clients as that matches the background pages
        // of extensions, which are always considered visible for some reason.
        !(await isExtensionBackgroundClient(client))
    )
  );

  return checkedClientList.some(item => item);
}

/**
 * @returns If client is the background page of browser extension, this method will
 * resolve to true, otherwise false.
 */
async function isExtensionBackgroundClient(
  client: WindowClient
): Promise<boolean> {
  const runtime = getBrowserExtensionRuntime();

  if (runtime && runtime.getBackgroundClient) {
    try {
      const backgroundClient = await runtime.getBackgroundClient();
      return client === backgroundClient;
    } catch (e) {
      console.error('Error while calling "getBackgroundClient": ', e);
      return false;
    }
  }

  return false;
}

/**
 * @param payload The data from the push event that should be sent to all
 * available pages.
 * @returns Returns a promise that resolves once the message has been sent to
 * all WindowClients.
 */
function sendMessageToWindowClients(
  clientList: WindowClient[],
  payload: MessagePayload
): void {
  const message = createNewMessage(MessageType.PUSH_RECEIVED, payload);

  for (const client of clientList) {
    client.postMessage(message);
  }
}

function getClientList(): Promise<WindowClient[]> {
  return self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
    // TS doesn't know that "type: 'window'" means it'll return WindowClient[]
  }) as Promise<WindowClient[]>;
}

function createNewMessage(
  type: MessageType,
  payload: MessagePayload
): InternalMessage {
  return {
    firebaseMessaging: { type, payload }
  };
}

function showNotification(details: NotificationDetails): Promise<void> {
  const title = details.title ?? '';

  const { actions } = details;
  // Note: Firefox does not support the maxActions property.
  // https://developer.mozilla.org/en-US/docs/Web/API/notification/maxActions
  const { maxActions } = Notification;
  if (actions && maxActions && actions.length > maxActions) {
    console.warn(
      `This browser only supports ${maxActions} actions. The remaining actions will not be displayed.`
    );
  }

  return self.registration.showNotification(title, details);
}

function getLink(payload: MessagePayload): string | null {
  // eslint-disable-next-line camelcase
  const link = payload.fcmOptions?.link ?? payload.notification?.click_action;
  if (link) {
    return link;
  }

  if (isConsoleMessage(payload.data)) {
    // Notification created in the Firebase Console. Redirect to origin.
    return self.location.origin;
  } else {
    return null;
  }
}
