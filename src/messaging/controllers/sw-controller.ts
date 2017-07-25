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
'use strict';

import ControllerInterface from './controller-interface';
import Errors from '../models/errors';
import WorkerPageMessage from '../models/worker-page-message';
import FCMDetails from '../models/fcm-details';

const FCM_MSG = 'FCM_MSG';

export default class SWController extends ControllerInterface {
  private bgMessageHandler_: (input: Object) => Promise<any>;

  constructor(app) {
    super(app);

    self.addEventListener('push', e => this.onPush_(e), false);
    self.addEventListener(
      'pushsubscriptionchange',
      e => this.onSubChange_(e),
      false
    );
    self.addEventListener(
      'notificationclick',
      e => this.onNotificationClick_(e),
      false
    );

    /**
     * @private
     * @type {function(Object)|null}
     */
    this.bgMessageHandler_ = null;
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
  * @private
  */
  onPush_(event) {
    let msgPayload;
    try {
      msgPayload = event.data.json();
    } catch (err) {
      // Not JSON so not an FCM message
      return;
    }

    const handleMsgPromise = this.hasVisibleClients_().then(
      hasVisibleClients => {
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
          const notificationTitle = notificationDetails.title || '';
          return (self as any).registration.showNotification(
            notificationTitle,
            notificationDetails
          );
        } else if (this.bgMessageHandler_) {
          return this.bgMessageHandler_(msgPayload);
        }
      }
    );

    event.waitUntil(handleMsgPromise);
  }

  /**
  * @private
  */
  onSubChange_(event) {
    const promiseChain = this.getToken().then(token => {
      if (!token) {
        // We can't resubscribe if we don't have an FCM token for this scope.
        throw this.errorFactory_.create(
          Errors.codes.NO_FCM_TOKEN_FOR_RESUBSCRIBE
        );
      }

      let tokenDetails = null;
      const tokenManager = this.getTokenManager();
      return tokenManager
        .getTokenDetailsFromToken(token)
        .then(details => {
          tokenDetails = details;
          if (!tokenDetails) {
            throw this.errorFactory_.create(Errors.codes.INVALID_SAVED_TOKEN);
          }

          // Attempt to get a new subscription
          return (self as any).registration.pushManager.subscribe(
            FCMDetails.SUBSCRIPTION_OPTIONS
          );
        })
        .then(newSubscription => {
          // Send new subscription to FCM.
          return tokenManager.subscribeToFCM(
            tokenDetails.fcmSenderId,
            newSubscription,
            tokenDetails.fcmPushSet
          );
        })
        .catch(err => {
          // The best thing we can do is log this to the terminal so
          // developers might notice the error.
          return tokenManager.deleteToken(tokenDetails.fcmToken).then(() => {
            throw this.errorFactory_.create(
              Errors.codes.UNABLE_TO_RESUBSCRIBE,
              {
                message: err
              }
            );
          });
        });
    });

    event.waitUntil(promiseChain);
  }

  /**
  * @private
  */
  onNotificationClick_(event) {
    if (
      !(
        event.notification &&
        event.notification.data &&
        event.notification.data[FCM_MSG]
      )
    ) {
      // Not an FCM notification, do nothing.
      return;
    }

    // Prevent other listeners from receiving the event
    event.stopImmediatePropagation();

    event.notification.close();

    const msgPayload = event.notification.data[FCM_MSG];
    const clickAction = msgPayload['notification']['click_action'];
    if (!clickAction) {
      // Nothing to do.
      return;
    }

    const promiseChain = this.getWindowClient_(clickAction)
      .then(windowClient => {
        if (!windowClient) {
          // Unable to find window client so need to open one.
          return (self as any).clients.openWindow(clickAction);
        }
        return windowClient;
      })
      .then(windowClient => {
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
      });

    event.waitUntil(promiseChain);
  }

  /**
   * @private
   * @param {Object} msgPayload
   * @return {NotificationOptions|undefined}
   */
  getNotificationData_(msgPayload) {
    if (!msgPayload) {
      return;
    }

    if (typeof msgPayload.notification !== 'object') {
      return;
    }

    const notificationInformation = Object.assign({}, msgPayload.notification);
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
   * @export
   * @param {function(Object)} callback The callback to be called when a push
   * message is received and a notification must be shown. The callback will
   * be given the data from the push message.
   */
  setBackgroundMessageHandler(callback) {
    if (callback && typeof callback !== 'function') {
      throw this.errorFactory_.create(
        Errors.codes.BG_HANDLER_FUNCTION_EXPECTED
      );
    }

    this.bgMessageHandler_ = callback;
  }

  /**
   * @private
   * @param {string} url The URL to look for when focusing a client.
   * @return {Object} Returns an existing window client or a newly opened
   * WindowClient.
   */
  getWindowClient_(url) {
    // Use URL to normalize the URL when comparing to windowClients.
    // This at least handles whether to include trailing slashes or not
    const parsedURL = new URL(url).href;

    return (self as any).clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then(clientList => {
        let suitableClient = null;
        for (let i = 0; i < clientList.length; i++) {
          const parsedClientUrl = new URL(clientList[i].url).href;
          if (parsedClientUrl === parsedURL) {
            suitableClient = clientList[i];
            break;
          }
        }

        if (suitableClient) {
          suitableClient.focus();
          return suitableClient;
        }
      });
  }

  /**
   * This message will attempt to send the message to a window client.
   * @private
   * @param {Object} client The WindowClient to send the message to.
   * @param {Object} message The message to send to the client.
   * @returns {Promise} Returns a promise that resolves after sending the
   * message. This does not guarantee that the message was successfully
   * received.
   */
  attemptToMessageClient_(client, message) {
    return new Promise((resolve, reject) => {
      if (!client) {
        return reject(
          this.errorFactory_.create(Errors.codes.NO_WINDOW_CLIENT_TO_MSG)
        );
      }

      client.postMessage(message);
      resolve();
    });
  }

  /**
   * @private
   * @returns {Promise<boolean>} If there is currently a visible WindowClient,
   * this method will resolve to true, otherwise false.
   */
  hasVisibleClients_() {
    return (self as any).clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then(clientList => {
        return clientList.some(client => client.visibilityState === 'visible');
      });
  }

  /**
   * @private
   * @param {Object} msgPayload The data from the push event that should be sent
   * to all available pages.
   * @returns {Promise} Returns a promise that resolves once the message
   * has been sent to all WindowClients.
   */
  sendMessageToWindowClients_(msgPayload) {
    return (self as any).clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then(clientList => {
        const internalMsg = WorkerPageMessage.createNewMsg(
          WorkerPageMessage.TYPES_OF_MSG.PUSH_MSG_RECEIVED,
          msgPayload
        );

        return Promise.all(
          clientList.map(client => {
            return this.attemptToMessageClient_(client, internalMsg);
          })
        );
      });
  }

  /**
   * This will register the default service worker and return the registration.
   * @private
   * @return {Promise<!ServiceWorkerRegistration>} The service worker
   * registration to be used for the push service.
   */
  getSWRegistration_() {
    return Promise.resolve((self as any).registration);
  }
}
