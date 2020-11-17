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

import { DEFAULT_VAPID_KEY, FCM_MSG } from '../util/constants';
import {
  MessagePayloadInternal,
  MessageType,
  NotificationPayloadInternal
} from '../interfaces/internal-message-payload';
import {
  deleteTokenInternal,
  getTokenInternal
} from '../internals/token-manager';

import { MessagingService } from '../messaging-service';
import { dbGet } from '../internals/idb-manager';
import { externalizePayload } from '../helpers/externalizePayload';
import { isConsoleMessage } from '../helpers/is-console-message';
import { sleep } from '../helpers/sleep';

// Let TS know that this is a service worker
declare const self: ServiceWorkerGlobalScope;

export class SwController {
  constructor(private readonly messaging: MessagingService) {
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

  /**
   * A handler for push events that shows notifications based on the content of the payload.
   *
   * The payload must be a JSON-encoded Object with a `notification` key. The value of the
   * `notification` property will be used as the NotificationOptions object passed to
   * showNotification. Additionally, the `title` property of the notification object will be used as
   * the title.
   *
   * If there is no notification data in the payload then no notification will be shown.
   */
  async onPush(event: PushEvent): Promise<void> {
    const internalPayload = getMessagePayloadInternal(event);
    if (!internalPayload) {
      // Failed to get parsed MessagePayload from the PushEvent. Skip handling the push.
      return;
    }

    // foreground handling: eventually passed to onMessage hook
    const clientList = await getClientList();
    if (hasVisibleClients(clientList)) {
      return sendMessagePayloadInternalToWindows(clientList, internalPayload);
    }

    // background handling: display if possible and pass to onBackgroundMessage hook
    if (!!internalPayload.notification) {
      await showNotification(wrapInternalPayload(internalPayload));
    }

    if (!!this.messaging.onBackgroundMessageHandler) {
      const payload = externalizePayload(internalPayload);

      if (typeof this.messaging.onBackgroundMessageHandler === 'function') {
        this.messaging.onBackgroundMessageHandler(payload);
      } else {
        this.messaging.onBackgroundMessageHandler.next(payload);
      }
    }
  }

  async onSubChange(event: PushSubscriptionChangeEvent): Promise<void> {
    const { newSubscription } = event;
    if (!newSubscription) {
      // Subscription revoked, delete token
      await deleteTokenInternal(this.messaging);
      return;
    }

    const tokenDetails = await dbGet(this.messaging.firebaseDependencies);
    await deleteTokenInternal(this.messaging);

    this.messaging.vapidKey =
      tokenDetails?.subscriptionOptions?.vapidKey ?? DEFAULT_VAPID_KEY;
    await getTokenInternal(this.messaging);
  }

  async onNotificationClick(event: NotificationEvent): Promise<void> {
    const internalPayload: MessagePayloadInternal =
      event.notification?.data?.[FCM_MSG];

    if (!internalPayload) {
      return;
    } else if (event.action) {
      // User clicked on an action button. This will allow developers to act on action button clicks
      // by using a custom onNotificationClick listener that they define.
      return;
    }

    // Prevent other listeners from receiving the event
    event.stopImmediatePropagation();
    event.notification.close();

    // Note clicking on a notification with no link set will focus the Chrome's current tab.
    const link = getLink(internalPayload);
    if (!link) {
      return;
    }

    // FM should only open/focus links from app's origin.
    const url = new URL(link, self.location.href);
    const originUrl = new URL(self.location.origin);

    if (url.host !== originUrl.host) {
      return;
    }

    let client = await getWindowClient(url);

    if (!client) {
      client = await self.clients.openWindow(link);

      // Wait three seconds for the client to initialize and set up the message handler so that it
      // can receive the message.
      await sleep(3000);
    } else {
      client = await client.focus();
    }

    if (!client) {
      // Window Client will not be returned if it's for a third party origin.
      return;
    }

    internalPayload.messageType = MessageType.NOTIFICATION_CLICKED;
    internalPayload.isFirebaseMessaging = true;
    return client.postMessage(internalPayload);
  }
}

function wrapInternalPayload(
  internalPayload: MessagePayloadInternal
): NotificationPayloadInternal {
  const wrappedInternalPayload: NotificationPayloadInternal = {
    ...((internalPayload.notification as unknown) as NotificationPayloadInternal)
  };

  // Put the message payload under FCM_MSG name so we can identify the notification as being an FCM
  // notification vs a notification from somewhere else (i.e. normal web push or developer generated
  // notification).
  wrappedInternalPayload.data = {
    [FCM_MSG]: internalPayload
  };

  return wrappedInternalPayload;
}

function getMessagePayloadInternal({
  data
}: PushEvent): MessagePayloadInternal | null {
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

/**
 * @param url The URL to look for when focusing a client.
 * @return Returns an existing window client or a newly opened WindowClient.
 */
async function getWindowClient(url: URL): Promise<WindowClient | null> {
  const clientList = await getClientList();

  for (const client of clientList) {
    const clientUrl = new URL(client.url, self.location.href);

    if (url.host === clientUrl.host) {
      return client;
    }
  }

  return null;
}

/**
 * @returns If there is currently a visible WindowClient, this method will resolve to true,
 * otherwise false.
 */
function hasVisibleClients(clientList: WindowClient[]): boolean {
  return clientList.some(
    client =>
      client.visibilityState === 'visible' &&
      // Ignore chrome-extension clients as that matches the background pages of extensions, which
      // are always considered visible for some reason.
      !client.url.startsWith('chrome-extension://')
  );
}

function sendMessagePayloadInternalToWindows(
  clientList: WindowClient[],
  internalPayload: MessagePayloadInternal
): void {
  internalPayload.isFirebaseMessaging = true;
  internalPayload.messageType = MessageType.PUSH_RECEIVED;

  for (const client of clientList) {
    client.postMessage(internalPayload);
  }
}

function getClientList(): Promise<WindowClient[]> {
  return self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
    // TS doesn't know that "type: 'window'" means it'll return WindowClient[]
  }) as Promise<WindowClient[]>;
}

function showNotification(
  notificationPayloadInternal: NotificationPayloadInternal
): Promise<void> {
  // Note: Firefox does not support the maxActions property.
  // https://developer.mozilla.org/en-US/docs/Web/API/notification/maxActions
  const { actions } = notificationPayloadInternal;
  const { maxActions } = Notification;
  if (actions && maxActions && actions.length > maxActions) {
    console.warn(
      `This browser only supports ${maxActions} actions. The remaining actions will not be displayed.`
    );
  }

  return self.registration.showNotification(
    /* title= */ notificationPayloadInternal.title ?? '',
    notificationPayloadInternal
  );
}

function getLink(payload: MessagePayloadInternal): string | null {
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
