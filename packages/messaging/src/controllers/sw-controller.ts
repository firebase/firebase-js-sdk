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

import { DEFAULT_VAPID_KEY, FCM_MSG, TAG } from '../util/constants';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { FirebaseMessaging, MessagePayload } from '@firebase/messaging-types';
import {
  MessagePayloadInternal,
  MessageType,
  NotificationPayloadInternal
} from '../interfaces/internal-message-payload';
import { NextFn, Observer, Unsubscribe } from '@firebase/util';
import { deleteToken, getToken } from '../core/token-management';

import { FirebaseApp } from '@firebase/app-types';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { FirebaseService } from '@firebase/app-types/private';
import { dbGet } from '../helpers/idb-manager';
import { externalizePayload } from '../helpers/externalizePayload';
import { isConsoleMessage } from '../helpers/is-console-message';
import { sleep } from '../helpers/sleep';

// Let TS know that this is a service worker
declare const self: ServiceWorkerGlobalScope;

export type BgMessageHandler = (payload: MessagePayload) => unknown;

export class SwController implements FirebaseMessaging, FirebaseService {
  // A boolean flag to determine wether an app is using onBackgroundMessage or
  // setBackgroundMessageHandler. onBackgroundMessage will receive a MessagePayload regardless of if
  // a notification is displayed. Whereas, setBackgroundMessageHandler will swallow the
  // MessagePayload if a NotificationPayload is included.
  private isOnBackgroundMessageUsed: boolean | null = null;
  private vapidKey: string | null = null;
  private bgMessageHandler:
    | BgMessageHandler
    | null
    | NextFn<MessagePayload>
    | Observer<MessagePayload> = null;

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
   * @deprecated. Use onBackgroundMessage(nextOrObserver: NextFn<object> | Observer<object>):
   * Unsubscribe instead.
   *
   * Calling setBackgroundMessageHandler will opt in to some specific behaviors.
   *
   * 1.) If a notification doesn't need to be shown due to a window already being visible, then push
   * messages will be sent to the page. 2.) If a notification needs to be shown, and the message
   * contains no notification data this method will be called and the promise it returns will be
   * passed to event.waitUntil. If you do not set this callback then all push messages will let and
   * the developer can handle them in a their own 'push' event callback
   *
   * @param callback The callback to be called when a push message is received and a notification
   * must be shown. The callback will be given the data from the push message.
   */
  setBackgroundMessageHandler(callback: BgMessageHandler): void {
    this.isOnBackgroundMessageUsed = false;

    if (!callback || typeof callback !== 'function') {
      throw ERROR_FACTORY.create(ErrorCode.INVALID_BG_HANDLER);
    }

    this.bgMessageHandler = callback;
  }

  onBackgroundMessage(
    nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
  ): Unsubscribe {
    this.isOnBackgroundMessageUsed = true;
    this.bgMessageHandler = nextOrObserver;

    return () => {
      this.bgMessageHandler = null;
    };
  }

  // TODO: Remove getToken from SW Controller. Calling this from an old SW can cause all kinds of
  // trouble.
  async getToken(): Promise<string> {
    if (!this.vapidKey) {
      // Call getToken using the current VAPID key if there already is a token. This is needed
      // because usePublicVapidKey was not available in SW. It will be removed when vapidKey becomes
      // a parameter of getToken, or when getToken is removed from SW.
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

  // TODO: Remove deleteToken from SW Controller. Calling this from an old SW can cause all kinds of
  // trouble.
  deleteToken(): Promise<boolean> {
    return deleteToken(this.firebaseDependencies, self.registration);
  }

  requestPermission(): Promise<void> {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

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
      console.debug(
        TAG +
          'failed to get parsed MessagePayload from the PushEvent. Skip handling the push.'
      );
      return;
    }

    // foreground handling: eventually passed to onMessage hook
    const clientList = await getClientList();
    if (hasVisibleClients(clientList)) {
      return sendMessagePayloadInternalToWindows(clientList, internalPayload);
    }

    // background handling: display and pass to onBackgroundMessage hook
    let isNotificationShown = false;
    if (!!internalPayload.notification) {
      await showNotification(wrapInternalPayload(internalPayload));
      isNotificationShown = true;
    }

    // MessagePayload is only passed to `onBackgroundMessage`. Skip passing MessagePayload for
    // the legacy `setBackgroundMessageHandler` to preserve the SDK behaviors.
    if (
      isNotificationShown === true &&
      this.isOnBackgroundMessageUsed === false
    ) {
      return;
    }

    if (!!this.bgMessageHandler) {
      const payload = externalizePayload(internalPayload);

      if (typeof this.bgMessageHandler === 'function') {
        this.bgMessageHandler(payload);
      } else {
        this.bgMessageHandler.next(payload);
      }
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
