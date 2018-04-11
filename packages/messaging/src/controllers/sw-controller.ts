/**
 * Copyright 2017 Google Inc.
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

import { FirebaseApp } from '@firebase/app-types';
import { ERROR_CODES } from '../models/errors';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../models/fcm-details';
import * as WorkerPageMessage from '../models/worker-page-message';
import { ControllerInterface } from './controller-interface';

const FCM_MSG = 'FCM_MSG';

export type BgMessageHandler = (input: any) => Promise<any>;

export class SWController extends ControllerInterface {
  private bgMessageHandler_: BgMessageHandler | null = null;

  constructor(app: FirebaseApp) {
    super(app);

    self.addEventListener(
      'push',
      (e: any) => {
        this.onPush(e);
      },
      false
    );
    self.addEventListener(
      'pushsubscriptionchange',
      (e: any) => {
        this.onSubChange(e);
      },
      false
    );
    self.addEventListener(
      'notificationclick',
      (e: any) => {
        this.onNotificationClick(e);
      },
      false
    );
  }

  // Visible for testing
  // TODO: Make private
  onPush(event: any): void {
    event.waitUntil(this.onPush_(event));
  }

  // Visible for testing
  // TODO: Make private
  onSubChange(event: any): void {
    event.waitUntil(this.onSubChange_(event));
  }

  // Visible for testing
  // TODO: Make private
  onNotificationClick(event: any): void {
    event.waitUntil(this.onNotificationClick_(event));
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
  private async onPush_(event: any): Promise<void> {
    let msgPayload: any;
    try {
      msgPayload = event.data.json();
    } catch (err) {
      // Not JSON so not an FCM message
      return;
    }

    const hasVisibleClients = await this.hasVisibleClients_();
    if (hasVisibleClients) {
      // Do not need to show a notification.
      if (msgPayload.notification || this.bgMessageHandler_) {
        // Send to page
        return this.sendMessageToWindowClients_(msgPayload);
      }
      return;
    }

    const notificationDetails = this.getNotificationData_(msgPayload);
    if (notificationDetails) {
      const notificationTitle = (notificationDetails as any).title || '';
      const reg = await this.getSWRegistration_();
      return reg.showNotification(notificationTitle, notificationDetails);
    } else if (this.bgMessageHandler_) {
      return this.bgMessageHandler_(msgPayload);
    }
  }

  private async onSubChange_(event: any): Promise<void> {
    let registration: ServiceWorkerRegistration;
    try {
      registration = await this.getSWRegistration_();
    } catch (err) {
      throw this.errorFactory_.create(ERROR_CODES.UNABLE_TO_RESUBSCRIBE, {
        message: err
      });
    }

    try {
      const subscription = await registration.pushManager.getSubscription();
      // TODO: Check if it's still valid. If not, then update token.
    } catch (err) {
      // The best thing we can do is log this to the terminal so
      // developers might notice the error.
      const tokenDetailsModel = this.getTokenDetailsModel();
      const tokenDetails = await tokenDetailsModel.getTokenDetailsFromSWScope(
        registration.scope
      );
      if (!tokenDetails) {
        // This should rarely occure, but could if indexedDB
        // is corrupted or wiped
        throw err;
      }

      // Attempt to delete the token if we know it's bad
      await this.deleteToken(tokenDetails['fcmToken']);
      throw err;
    }
  }

  private async onNotificationClick_(event: any): Promise<void> {
    if (
      !event.notification ||
      !event.notification.data ||
      !event.notification.data[FCM_MSG]
    ) {
      // Not an FCM notification, do nothing.
      return;
    }

    // Prevent other listeners from receiving the event
    event.stopImmediatePropagation();

    event.notification.close();

    const msgPayload = event.notification.data[FCM_MSG];
    if (!msgPayload['notification']) {
      // Nothing to do.
      return;
    }

    const clickAction = msgPayload['notification']['click_action'];
    if (!clickAction) {
      // Nothing to do.
      return;
    }

    let windowClient = await this.getWindowClient_(clickAction);
    if (!windowClient) {
      // Unable to find window client so need to open one.
      windowClient = await (self as any).clients.openWindow(clickAction);
    } else {
      windowClient = await windowClient.focus();
    }

    if (!windowClient) {
      // Window Client will not be returned if it's for a third party origin.
      return;
    }

    // Delete notification data from payload before sending to the page.
    const notificationData = msgPayload['notification'];
    delete msgPayload['notification'];

    const internalMsg = WorkerPageMessage.createNewMsg(
      WorkerPageMessage.TYPES_OF_MSG.NOTIFICATION_CLICKED,
      msgPayload
    );

    // Attempt to send a message to the client to handle the data
    // Is affected by: https://github.com/slightlyoff/ServiceWorker/issues/728
    return this.attemptToMessageClient_(windowClient, internalMsg);
  }

  // Visible for testing
  // TODO: Make private
  getNotificationData_(msgPayload: any): NotificationOptions | undefined {
    if (!msgPayload) {
      return;
    }

    if (typeof msgPayload.notification !== 'object') {
      return;
    }

    const notificationInformation = { ...msgPayload.notification };
    // Put the message payload under FCM_MSG name so we can identify the
    // notification as being an FCM notification vs a notification from
    // somewhere else (i.e. normal web push or developer generated
    // notification).
    notificationInformation['data'] = {
      [FCM_MSG]: msgPayload
    };

    return notificationInformation;
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
      throw this.errorFactory_.create(ERROR_CODES.BG_HANDLER_FUNCTION_EXPECTED);
    }

    this.bgMessageHandler_ = callback;
  }

  /**
   * @param url The URL to look for when focusing a client.
   * @return Returns an existing window client or a newly opened WindowClient.
   */
  // Visible for testing
  // TODO: Make private
  async getWindowClient_(url: string): Promise<any> {
    // Use URL to normalize the URL when comparing to windowClients.
    // This at least handles whether to include trailing slashes or not
    const parsedURL = new URL(url, (self as any).location).href;

    const clientList = await getClientList();

    let suitableClient = null;
    for (let i = 0; i < clientList.length; i++) {
      const parsedClientUrl = new URL(clientList[i].url, (self as any).location)
        .href;
      if (parsedClientUrl === parsedURL) {
        suitableClient = clientList[i];
        break;
      }
    }

    return suitableClient;
  }

  /**
   * This message will attempt to send the message to a window client.
   * @param client The WindowClient to send the message to.
   * @param message The message to send to the client.
   * @returns Returns a promise that resolves after sending the message. This
   * does not guarantee that the message was successfully received.
   */
  // Visible for testing
  // TODO: Make private
  async attemptToMessageClient_(client: any, message: any): Promise<void> {
    // NOTE: This returns a promise in case this API is abstracted later on to
    // do additional work
    if (!client) {
      throw this.errorFactory_.create(ERROR_CODES.NO_WINDOW_CLIENT_TO_MSG);
    }

    client.postMessage(message);
  }

  /**
   * @returns If there is currently a visible WindowClient, this method will
   * resolve to true, otherwise false.
   */
  // Visible for testing
  // TODO: Make private
  async hasVisibleClients_(): Promise<boolean> {
    const clientList = await getClientList();

    return clientList.some(
      (client: any) => client.visibilityState === 'visible'
    );
  }

  /**
   * @param msgPayload The data from the push event that should be sent to all
   * available pages.
   * @returns Returns a promise that resolves once the message has been sent to
   * all WindowClients.
   */
  // Visible for testing
  // TODO: Make private
  async sendMessageToWindowClients_(msgPayload: any): Promise<void> {
    const clientList = await getClientList();

    const internalMsg = WorkerPageMessage.createNewMsg(
      WorkerPageMessage.TYPES_OF_MSG.PUSH_MSG_RECEIVED,
      msgPayload
    );

    await Promise.all(
      clientList.map((client: any) =>
        this.attemptToMessageClient_(client, internalMsg)
      )
    );
  }

  /**
   * This will register the default service worker and return the registration.
   * @return he service worker registration to be used for the push service.
   */
  async getSWRegistration_(): Promise<ServiceWorkerRegistration> {
    return (self as any).registration;
  }

  /**
   * This will return the default VAPID key or the uint8array version of the
   * public VAPID key provided by the developer.
   */
  async getPublicVapidKey_(): Promise<Uint8Array> {
    const swReg = await this.getSWRegistration_();
    if (!swReg) {
      throw this.errorFactory_.create(ERROR_CODES.SW_REGISTRATION_EXPECTED);
    }

    const vapidKeyFromDatabase = await this.getVapidDetailsModel().getVapidFromSWScope(
      swReg.scope
    );
    if (vapidKeyFromDatabase == null) {
      return DEFAULT_PUBLIC_VAPID_KEY;
    }

    return vapidKeyFromDatabase;
  }
}

function getClientList(): Promise<any[]> {
  return (self as any).clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
}
