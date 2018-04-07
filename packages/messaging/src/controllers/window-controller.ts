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
import { FirebaseMessaging } from '@firebase/messaging-types';
import {
  createSubscribe,
  NextFn,
  Observer,
  PartialObserver,
  Subscribe,
  Unsubscribe
} from '@firebase/util';
import { base64ToArrayBuffer } from '../helpers/base64-to-array-buffer';
import { DEFAULT_SW_PATH, DEFAULT_SW_SCOPE } from '../models/default-sw';
import { ERROR_CODES } from '../models/errors';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../models/fcm-details';
import * as WorkerPageMessage from '../models/worker-page-message';
import { ControllerInterface } from './controller-interface';

declare const firebase: any;

export class WindowController extends ControllerInterface
  implements FirebaseMessaging {
  private registrationToUse_: ServiceWorkerRegistration | null = null;
  private publicVapidKeyToUse_: Uint8Array | null = null;
  private manifestCheckPromise_: Promise<void> | null = null;
  private messageObserver_: Observer<{}, Error> | null = null;
  private readonly onMessage_: Subscribe<{}> = createSubscribe(observer => {
    this.messageObserver_ = observer;
  });
  private tokenRefreshObserver_: Observer<{}, Error> | null = null;
  private readonly onTokenRefresh_: Subscribe<{}> = createSubscribe(
    observer => {
      this.tokenRefreshObserver_ = observer;
    }
  );

  /**
   * A service that provides a MessagingService instance.
   */
  constructor(app: FirebaseApp) {
    super(app);

    this.setupSWMessageListener_();
  }

  /**
   * This method returns an FCM token if it can be generated.
   * The return promise will reject if the browser doesn't support
   * FCM, if permission is denied for notifications or it's not
   * possible to generate a token.
   *
   * @return Returns a promise that resolves to an FCM token or null if
   * permission isn't granted.
   */
  getToken(): Promise<string | null> {
    // Check that the required API's are available
    if (!this.isSupported_()) {
      return Promise.reject(
        this.errorFactory_.create(ERROR_CODES.UNSUPPORTED_BROWSER)
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
  manifestCheck_(): Promise<void> {
    if (this.manifestCheckPromise_) {
      return this.manifestCheckPromise_;
    }

    const manifestTag = document.querySelector<HTMLAnchorElement>(
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
              ERROR_CODES.INCORRECT_GCM_SENDER_ID
            );
          }
        });
    }

    return this.manifestCheckPromise_;
  }

  /**
   * Request permission if it is not currently granted
   *
   * @return Resolves if the permission was granted, otherwise rejects
   */
  async requestPermission(): Promise<void> {
    if (
      ((Notification as any).permission as NotificationPermission) === 'granted'
    ) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const managePermissionResult = (result: NotificationPermission) => {
        if (result === 'granted') {
          return resolve();
        } else if (result === 'denied') {
          return reject(
            this.errorFactory_.create(ERROR_CODES.PERMISSION_BLOCKED)
          );
        } else {
          return reject(
            this.errorFactory_.create(ERROR_CODES.PERMISSION_DEFAULT)
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
   *
   * @param registration The service worker registration that should be used to
   * receive the push messages.
   */
  useServiceWorker(registration: ServiceWorkerRegistration): void {
    if (!(registration instanceof ServiceWorkerRegistration)) {
      throw this.errorFactory_.create(ERROR_CODES.SW_REGISTRATION_EXPECTED);
    }

    if (this.registrationToUse_ != null) {
      throw this.errorFactory_.create(ERROR_CODES.USE_SW_BEFORE_GET_TOKEN);
    }

    this.registrationToUse_ = registration;
  }

  /**
   * This method allows a developer to override the default vapid key
   * and instead use a custom VAPID public key.
   *
   * @param publicKey A URL safe base64 encoded string.
   */
  usePublicVapidKey(publicKey: string): void {
    if (typeof publicKey !== 'string') {
      throw this.errorFactory_.create(ERROR_CODES.INVALID_PUBLIC_VAPID_KEY);
    }

    if (this.publicVapidKeyToUse_ != null) {
      throw this.errorFactory_.create(
        ERROR_CODES.USE_PUBLIC_KEY_BEFORE_GET_TOKEN
      );
    }

    const parsedKey = base64ToArrayBuffer(publicKey);

    if (parsedKey.length !== 65) {
      throw this.errorFactory_.create(ERROR_CODES.PUBLIC_KEY_DECRYPTION_FAILED);
    }

    this.publicVapidKeyToUse_ = parsedKey;
  }

  /**
   * @export
   * @param nextOrObserver An observer object or a function triggered on
   * message.
   * @param error A function triggered on message error.
   * @param completed function triggered when the observer is removed.
   * @return The unsubscribe function for the observer.
   */
  onMessage(
    nextOrObserver: NextFn<{}> | PartialObserver<{}>,
    error?: (e: Error) => void,
    completed?: () => void
  ): Unsubscribe {
    if (typeof nextOrObserver === 'function') {
      return this.onMessage_(nextOrObserver, error, completed);
    } else {
      return this.onMessage_(nextOrObserver);
    }
  }

  /**
   * @param nextOrObserver An observer object or a function triggered on token
   * refresh.
   * @param error A function triggered on token refresh error.
   * @param completed function triggered when the observer is removed.
   * @return The unsubscribe function for the observer.
   */
  onTokenRefresh(
    nextOrObserver: NextFn<{}> | PartialObserver<{}>,
    error?: (e: Error) => void,
    completed?: () => void
  ): Unsubscribe {
    if (typeof nextOrObserver === 'function') {
      return this.onTokenRefresh_(nextOrObserver, error, completed);
    } else {
      return this.onTokenRefresh_(nextOrObserver);
    }
  }

  /**
   * Given a registration, wait for the service worker it relates to
   * become activer
   * @param registration Registration to wait for service worker to become active
   * @return Wait for service worker registration to become active
   */
  // Visible for testing
  // TODO: Make private
  waitForRegistrationToActivate_(
    registration: ServiceWorkerRegistration
  ): Promise<ServiceWorkerRegistration> {
    const serviceWorker =
      registration.installing || registration.waiting || registration.active;

    return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      if (!serviceWorker) {
        // This is a rare scenario but has occured in firefox
        reject(this.errorFactory_.create(ERROR_CODES.NO_SW_IN_REG));
        return;
      }
      // Because the Promise function is called on next tick there is a
      // small chance that the worker became active or redundant already.
      if (serviceWorker.state === 'activated') {
        resolve(registration);
        return;
      }

      if (serviceWorker.state === 'redundant') {
        reject(this.errorFactory_.create(ERROR_CODES.SW_REG_REDUNDANT));
        return;
      }

      const stateChangeListener = () => {
        if (serviceWorker.state === 'activated') {
          resolve(registration);
        } else if (serviceWorker.state === 'redundant') {
          reject(this.errorFactory_.create(ERROR_CODES.SW_REG_REDUNDANT));
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
   * This will register the default service worker and return the registration
   * @return The service worker registration to be used for the push service.
   */
  getSWRegistration_(): Promise<ServiceWorkerRegistration> {
    if (this.registrationToUse_) {
      return this.waitForRegistrationToActivate_(this.registrationToUse_);
    }

    // Make the registration null so we know useServiceWorker will not
    // use a new service worker as registrationToUse_ is no longer undefined
    this.registrationToUse_ = null;

    return (navigator as any).serviceWorker
      .register(DEFAULT_SW_PATH, {
        scope: DEFAULT_SW_SCOPE
      })
      .catch((err: Error) => {
        throw this.errorFactory_.create(
          ERROR_CODES.FAILED_DEFAULT_REGISTRATION,
          {
            browserErrorMessage: err.message
          }
        );
      })
      .then((registration: ServiceWorkerRegistration) => {
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
   */
  getPublicVapidKey_(): Promise<Uint8Array> {
    if (this.publicVapidKeyToUse_) {
      return Promise.resolve(this.publicVapidKeyToUse_);
    }

    return Promise.resolve(DEFAULT_PUBLIC_VAPID_KEY);
  }

  /**
   * This method will set up a message listener to handle
   * events from the service worker that should trigger
   * events in the page.
   */
  // Visible for testing
  // TODO: Make private
  setupSWMessageListener_(): void {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    (navigator as any).serviceWorker.addEventListener(
      'message',
      (event: MessageEvent) => {
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
   * @return Returns true if the desired APIs are available.
   */
  // Visible for testing
  // TODO: Make private
  isSupported_(): boolean {
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
