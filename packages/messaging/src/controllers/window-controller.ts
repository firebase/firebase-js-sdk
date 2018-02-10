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

import { FirebaseMessaging } from '@firebase/messaging-types';
import ControllerInterface from './controller-interface';
import Errors from '../models/errors';
import WorkerPageMessage from '../models/worker-page-message';
import DefaultSW from '../models/default-sw';
import NOTIFICATION_PERMISSION from '../models/notification-permission';
import FCMDetails from '../models/fcm-details';
import base64ToArrayBuffer from '../helpers/base64-to-array-buffer';
import { createSubscribe } from '@firebase/util';

declare const firebase: any;

export default class WindowController extends ControllerInterface
  implements FirebaseMessaging {
  private registrationToUse_;
  private publicVapidKeyToUse_;
  private manifestCheckPromise_;
  private messageObserver_ = null;
  private onMessage_ = createSubscribe(observer => {
    this.messageObserver_ = observer;
  });
  private tokenRefreshObserver_ = null;
  private onTokenRefresh_ = createSubscribe(observer => {
    this.tokenRefreshObserver_ = observer;
  });

  /**
   * A service that provides a MessagingService instance.
   * @param {!firebase.app.App} app
   */
  constructor(app) {
    super(app);

    /**
     * @private
     * @type {ServiceWorkerRegistration}
     */
    this.registrationToUse_;

    /**
     * @private
     * @type {Promise}
     */
    this.manifestCheckPromise_;

    /**
     * @private
     * @type {firebase.Observer}
     */
    this.messageObserver_ = null;

    /**
     * @private {!firebase.Subscribe} The subscribe function to the onMessage
     * observer.
     */
    this.onMessage_ = createSubscribe(observer => {
      this.messageObserver_ = observer;
    });

    /**
     * @private
     * @type {firebase.Observer}
     */
    this.tokenRefreshObserver_ = null;
    this.onTokenRefresh_ = createSubscribe(observer => {
      this.tokenRefreshObserver_ = observer;
    });

    this.setupSWMessageListener_();
  }

  /**
   * This method returns an FCM token if it can be generated.
   * The return promise will reject if the browser doesn't support
   * FCM, if permission is denied for notifications or it's not
   * possible to generate a token.
   * @export
   * @return {Promise<string> | Promise<null>} Returns a promise the
   * resolves to an FCM token or null if permission isn't granted.
   */
  getToken() {
    // Check that the required API's are available
    if (!this.isSupported_()) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.UNSUPPORTED_BROWSER)
      );
    }

    return this.manifestCheck_().then(() => {
      return super.getToken();
    });
  }

  /**
   * The method checks that a manifest is defined and has the correct GCM
   * sender ID.
   * @private
   * @return {Promise} Returns a promise that resolves if the manifest matches
   * our required sender ID
   */
  manifestCheck_() {
    if (this.manifestCheckPromise_) {
      return this.manifestCheckPromise_;
    }

    const manifestTag = <HTMLAnchorElement>document.querySelector(
      'link[rel="manifest"]'
    );
    if (!manifestTag) {
      this.manifestCheckPromise_ = Promise.resolve();
    } else {
      this.manifestCheckPromise_ = fetch(manifestTag.href)
        .then(response => {
          return response.json();
        })
        .catch(() => {
          // If the download or parsing fails allow check.
          // We only want to error if we KNOW that the gcm_sender_id is incorrect.
        })
        .then(manifestContent => {
          if (!manifestContent) {
            return;
          }

          if (!manifestContent['gcm_sender_id']) {
            return;
          }

          if (manifestContent['gcm_sender_id'] !== '103953800507') {
            throw this.errorFactory_.create(
              Errors.codes.INCORRECT_GCM_SENDER_ID
            );
          }
        });
    }

    return this.manifestCheckPromise_;
  }

  /**
   * Request permission if it is not currently granted
   * @export
   * @returns {Promise} Resolves if the permission was granted, otherwise
   * rejects
   */
  async requestPermission() {
    if ((Notification as any).permission === NOTIFICATION_PERMISSION.granted) {
      return;
    }

    return new Promise((resolve, reject) => {
      const managePermissionResult = result => {
        if (result === NOTIFICATION_PERMISSION.granted) {
          return resolve();
        } else if (result === NOTIFICATION_PERMISSION.denied) {
          return reject(
            this.errorFactory_.create(Errors.codes.PERMISSION_BLOCKED)
          );
        } else {
          return reject(
            this.errorFactory_.create(Errors.codes.PERMISSION_DEFAULT)
          );
        }
      };

      // The Notification.requestPermission API was changed to
      // return a promise so now have to handle both in case
      // browsers stop support callbacks for promised version
      const permissionPromise = Notification.requestPermission(
        managePermissionResult
      );
      if (permissionPromise) {
        // Prefer the promise version as it's the future API.
        permissionPromise.then(managePermissionResult);
      }
    });
  }

  /**
   * This method allows a developer to override the default service worker and
   * instead use a custom service worker.
   * @export
   * @param {!ServiceWorkerRegistration} registration The service worker
   * registration that should be used to receive the push messages.
   */
  useServiceWorker(registration) {
    if (!(registration instanceof ServiceWorkerRegistration)) {
      throw this.errorFactory_.create(Errors.codes.SW_REGISTRATION_EXPECTED);
    }

    if (typeof this.registrationToUse_ !== 'undefined') {
      throw this.errorFactory_.create(Errors.codes.USE_SW_BEFORE_GET_TOKEN);
    }

    this.registrationToUse_ = registration;
  }

  /**
   * This method allows a developer to override the default vapid key
   * and instead use a custom VAPID public key.
   * @export
   * @param {!string} publicKey A URL safe base64 encoded string.
   */
  usePublicVapidKey(publicKey) {
    if (typeof publicKey !== 'string') {
      throw this.errorFactory_.create(Errors.codes.INVALID_PUBLIC_VAPID_KEY);
    }

    if (typeof this.publicVapidKeyToUse_ !== 'undefined') {
      throw this.errorFactory_.create(
        Errors.codes.USE_PUBLIC_KEY_BEFORE_GET_TOKEN
      );
    }

    const parsedKey = base64ToArrayBuffer(publicKey);

    if (parsedKey.length !== 65) {
      throw this.errorFactory_.create(
        Errors.codes.PUBLIC_KEY_DECRYPTION_FAILED
      );
    }

    this.publicVapidKeyToUse_ = parsedKey;
  }

  /**
   * @export
   * @param {!firebase.Observer|function(*)} nextOrObserver An observer object
   * or a function triggered on message.
   * @param {function(!Error)=} optError Optional A function triggered on
   * message error.
   * @param {function()=} optCompleted Optional function triggered when the
   * observer is removed.
   * @return {!function()} The unsubscribe function for the observer.
   */
  onMessage(nextOrObserver, optError?, optCompleted?) {
    return this.onMessage_(nextOrObserver, optError, optCompleted);
  }

  /**
   * @export
   * @param {!firebase.Observer|function()} nextOrObserver An observer object
   * or a function triggered on token refresh.
   * @param {function(!Error)=} optError Optional A function
   * triggered on token refresh error.
   * @param {function()=} optCompleted Optional function triggered when the
   * observer is removed.
   * @return {!function()} The unsubscribe function for the observer.
   */
  onTokenRefresh(nextOrObserver, optError, optCompleted) {
    return this.onTokenRefresh_(nextOrObserver, optError, optCompleted);
  }

  /**
   * Given a registration, wait for the service worker it relates to
   * become activer
   * @private
   * @param  {ServiceWorkerRegistration} registration Registration to wait
   * for service worker to become active
   * @return {Promise<!ServiceWorkerRegistration>} Wait for service worker
   * registration to become active
   */
  waitForRegistrationToActivate_(registration) {
    const serviceWorker =
      registration.installing || registration.waiting || registration.active;

    return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      if (!serviceWorker) {
        // This is a rare scenario but has occured in firefox
        reject(this.errorFactory_.create(Errors.codes.NO_SW_IN_REG));
        return;
      }
      // Because the Promise function is called on next tick there is a
      // small chance that the worker became active or redundant already.
      if (serviceWorker.state === 'activated') {
        resolve(registration);
        return;
      }

      if (serviceWorker.state === 'redundant') {
        reject(this.errorFactory_.create(Errors.codes.SW_REG_REDUNDANT));
        return;
      }

      let stateChangeListener = () => {
        if (serviceWorker.state === 'activated') {
          resolve(registration);
        } else if (serviceWorker.state === 'redundant') {
          reject(this.errorFactory_.create(Errors.codes.SW_REG_REDUNDANT));
        } else {
          // Return early and wait to next state change
          return;
        }
        serviceWorker.removeEventListener('statechange', stateChangeListener);
      };
      serviceWorker.addEventListener('statechange', stateChangeListener);
    });
  }

  /**
   * This will regiater the default service worker and return the registration
   * @private
   * @return {Promise<!ServiceWorkerRegistration>} The service worker
   * registration to be used for the push service.
   */
  getSWRegistration_() {
    if (this.registrationToUse_) {
      return this.waitForRegistrationToActivate_(this.registrationToUse_);
    }

    // Make the registration null so we know useServiceWorker will not
    // use a new service worker as registrationToUse_ is no longer undefined
    this.registrationToUse_ = null;

    return navigator.serviceWorker
      .register(DefaultSW.path, {
        scope: DefaultSW.scope
      })
      .catch(err => {
        throw this.errorFactory_.create(
          Errors.codes.FAILED_DEFAULT_REGISTRATION,
          {
            browserErrorMessage: err.message
          }
        );
      })
      .then(registration => {
        return this.waitForRegistrationToActivate_(registration).then(() => {
          this.registrationToUse_ = registration;

          // We update after activation due to an issue with Firefox v49 where
          // a race condition occassionally causes the service work to not
          // install
          registration.update();

          return registration;
        });
      });
  }

  /**
   * This will return the default VAPID key or the uint8array version of the public VAPID key
   * provided by the developer.
   * @private
   */
  getPublicVapidKey_(): Promise<Uint8Array> {
    if (this.publicVapidKeyToUse_) {
      return Promise.resolve(this.publicVapidKeyToUse_);
    }

    return Promise.resolve(FCMDetails.DEFAULT_PUBLIC_VAPID_KEY);
  }

  /**
   * Gets a PushSubscription for the current user.
   * @private
   * @param {ServiceWorkerRegistration} registration
   * @return {Promise<PushSubscription>}
   */
  getPushSubscription_(swRegistration, publicVapidKey) {
    // Check for existing subscription first
    let subscription;
    let fcmTokenDetails;
    return swRegistration.pushManager.getSubscription().then(subscription => {
      if (subscription) {
        return subscription;
      }

      return swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicVapidKey
      });
    });
  }

  /**
   * This method will set up a message listener to handle
   * events from the service worker that should trigger
   * events in the page.
   *
   * @private
   */
  setupSWMessageListener_() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.addEventListener(
      'message',
      event => {
        if (!event.data || !event.data[WorkerPageMessage.PARAMS.TYPE_OF_MSG]) {
          // Not a message from FCM
          return;
        }

        const workerPageMessage = event.data;
        switch (workerPageMessage[WorkerPageMessage.PARAMS.TYPE_OF_MSG]) {
          case WorkerPageMessage.TYPES_OF_MSG.PUSH_MSG_RECEIVED:
          case WorkerPageMessage.TYPES_OF_MSG.NOTIFICATION_CLICKED:
            const pushMessage =
              workerPageMessage[WorkerPageMessage.PARAMS.DATA];
            if (this.messageObserver_) {
              this.messageObserver_.next(pushMessage);
            }
            break;
          default:
            // Noop.
            break;
        }
      },
      false
    );
  }

  /**
   * Checks to see if the required API's are valid or not.
   * @private
   * @return {boolean} Returns true if the desired APIs are available.
   */
  isSupported_() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      'fetch' in window &&
      ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
      PushSubscription.prototype.hasOwnProperty('getKey')
    );
  }
}
