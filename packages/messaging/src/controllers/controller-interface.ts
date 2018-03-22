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

import { ErrorFactory } from '@firebase/util';
import Errors from '../models/errors';
import TokenDetailsModel from '../models/token-details-model';
import VapidDetailsModel from '../models/vapid-details-model';
import NOTIFICATION_PERMISSION from '../models/notification-permission';
import IIDModel from '../models/iid-model';
import arrayBufferToBase64 from '../helpers/array-buffer-to-base64';

const SENDER_ID_OPTION_NAME = 'messagingSenderId';
// Database cache should be invalidated once a week.
export const TOKEN_EXPIRATION_MILLIS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default class ControllerInterface {
  public app;
  public INTERNAL;
  protected errorFactory_;
  private messagingSenderId_: string;
  private tokenDetailsModel_: TokenDetailsModel;
  private vapidDetailsModel_: VapidDetailsModel;
  private iidModel_: IIDModel;

  /**
   * An interface of the Messaging Service API
   * @param {!firebase.app.App} app
   */
  constructor(app) {
    this.errorFactory_ = new ErrorFactory('messaging', 'Messaging', Errors.map);

    if (
      !app.options[SENDER_ID_OPTION_NAME] ||
      typeof app.options[SENDER_ID_OPTION_NAME] !== 'string'
    ) {
      throw this.errorFactory_.create(Errors.codes.BAD_SENDER_ID);
    }

    this.messagingSenderId_ = app.options[SENDER_ID_OPTION_NAME];

    this.tokenDetailsModel_ = new TokenDetailsModel();
    this.vapidDetailsModel_ = new VapidDetailsModel();
    this.iidModel_ = new IIDModel();

    this.app = app;
    this.INTERNAL = {};
    this.INTERNAL.delete = () => this.delete();
  }

  /**
   * @export
   */
  getToken(): Promise<string | null> {
    // Check with permissions
    const currentPermission = this.getNotificationPermission_();
    if (currentPermission !== NOTIFICATION_PERMISSION.granted) {
      if (currentPermission === NOTIFICATION_PERMISSION.denied) {
        return Promise.reject(
          this.errorFactory_.create(Errors.codes.NOTIFICATIONS_BLOCKED)
        );
      }

      // We must wait for permission to be granted
      return Promise.resolve(null);
    }
    let swReg: ServiceWorkerRegistration;
    return this.getSWRegistration_()
      .then(reg => {
        swReg = reg;
        return this.tokenDetailsModel_.getTokenDetailsFromSWScope(swReg.scope);
      })
      .then(tokenDetails => {
        if (tokenDetails) {
          return this.manageExistingToken(tokenDetails, swReg);
        }
        return this.getNewToken(swReg);
      });
  }

  /**
   * manageExistingToken is triggered if there's an existing FCM token in the
   * database and it can take 3 different actions:
   * 1) Retrieve the existing FCM token from the database.
   * 2) If VAPID details have changed: Delete the existing token and create a
   * new one with the new VAPID key.
   * 3) If the database cache is invalidated: Send a request to FCM to update
   * the token, and to check if the token is still valid on FCM-side.
   */
  private manageExistingToken(
    tokenDetails: Object,
    swReg: ServiceWorkerRegistration
  ): Promise<string> {
    return this.isTokenStillValid(tokenDetails).then(isValid => {
      if (isValid) {
        const now = Date.now();
        if (now < tokenDetails['createTime'] + TOKEN_EXPIRATION_MILLIS) {
          return tokenDetails['fcmToken'];
        } else {
          return this.updateToken(tokenDetails, swReg);
        }
      } else {
        // If the VAPID details are updated, delete the existing token,
        // and create a new one.
        return this.deleteToken(tokenDetails['fcmToken']).then(() => {
          return this.getNewToken(swReg);
        });
      }
    });
  }

  /*
   * Checks if the tokenDetails match the details provided in the clients.
   */
  private isTokenStillValid(tokenDetails: Object): Promise<Boolean> {
    // TODO Validate rest of the details.
    return this.getPublicVapidKey_().then(publicKey => {
      if (arrayBufferToBase64(publicKey) !== tokenDetails['vapidKey']) {
        return false;
      }
      return true;
    });
  }

  private updateToken(
    tokenDetails: Object,
    swReg: ServiceWorkerRegistration
  ): Promise<string> {
    let publicVapidKey: Uint8Array;
    let updatedToken: string;
    let subscription: PushSubscription;
    return this.getPublicVapidKey_()
      .then(publicKey => {
        publicVapidKey = publicKey;
        return this.getPushSubscription(swReg, publicVapidKey);
      })
      .then(pushSubscription => {
        subscription = pushSubscription;
        return this.iidModel_.updateToken(
          this.messagingSenderId_,
          tokenDetails['fcmToken'],
          tokenDetails['fcmPushSet'],
          subscription,
          publicVapidKey
        );
      })
      .catch(err => {
        return this.deleteToken(tokenDetails['fcmToken']).then(() => {
          throw err;
        });
      })
      .then(token => {
        updatedToken = token;
        const allDetails = {
          swScope: swReg.scope,
          vapidKey: publicVapidKey,
          subscription: subscription,
          fcmSenderId: this.messagingSenderId_,
          fcmToken: updatedToken,
          fcmPushSet: tokenDetails['fcmPushSet']
        };
        return this.tokenDetailsModel_.saveTokenDetails(allDetails);
      })
      .then(() => {
        return this.vapidDetailsModel_.saveVapidDetails(
          swReg.scope,
          publicVapidKey
        );
      })
      .then(() => {
        return updatedToken;
      });
  }

  private getNewToken(swReg: ServiceWorkerRegistration): Promise<string> {
    let publicVapidKey: Uint8Array;
    let subscription: PushSubscription;
    let tokenDetails: Object;
    return this.getPublicVapidKey_()
      .then(publicKey => {
        publicVapidKey = publicKey;
        return this.getPushSubscription(swReg, publicVapidKey);
      })
      .then(pushSubscription => {
        subscription = pushSubscription;
        return this.iidModel_.getToken(
          this.messagingSenderId_,
          subscription,
          publicVapidKey
        );
      })
      .then(iidTokenDetails => {
        tokenDetails = iidTokenDetails;
        const allDetails = {
          swScope: swReg.scope,
          vapidKey: publicVapidKey,
          subscription: subscription,
          fcmSenderId: this.messagingSenderId_,
          fcmToken: tokenDetails['token'],
          fcmPushSet: tokenDetails['pushSet']
        };
        return this.tokenDetailsModel_.saveTokenDetails(allDetails);
      })
      .then(() => {
        return this.vapidDetailsModel_.saveVapidDetails(
          swReg.scope,
          publicVapidKey
        );
      })
      .then(() => {
        return tokenDetails['token'];
      });
  }

  /**
   * This method deletes tokens that the token manager looks after,
   * unsubscribes the token from FCM  and then unregisters the push
   * subscription if it exists. It returns a promise that indicates
   * whether or not the unsubscribe request was processed successfully.
   * @export
   */
  deleteToken(token: string): Promise<Boolean> {
    return this.tokenDetailsModel_
      .deleteToken(token)
      .then(details => {
        return this.iidModel_.deleteToken(
          details['fcmSenderId'],
          details['fcmToken'],
          details['fcmPushSet']
        );
      })
      .then(() => {
        return this.getSWRegistration_()
          .then(registration => {
            if (registration) {
              return registration.pushManager.getSubscription();
            }
          })
          .then(subscription => {
            if (subscription) {
              return subscription.unsubscribe();
            }
          });
      });
  }

  getSWRegistration_(): Promise<ServiceWorkerRegistration> {
    throw this.errorFactory_.create(Errors.codes.SHOULD_BE_INHERITED);
  }

  getPublicVapidKey_(): Promise<Uint8Array> {
    throw this.errorFactory_.create(Errors.codes.SHOULD_BE_INHERITED);
  }

  //
  // The following methods should only be available in the window.
  //

  requestPermission() {
    throw this.errorFactory_.create(Errors.codes.AVAILABLE_IN_WINDOW);
  }

  /**
   * Gets a PushSubscription for the current user.
   */
  getPushSubscription(
    swRegistration: ServiceWorkerRegistration,
    publicVapidKey: Uint8Array
  ): Promise<PushSubscription> {
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
   * @export
   * @param {!ServiceWorkerRegistration} registration
   */
  useServiceWorker(registration) {
    throw this.errorFactory_.create(Errors.codes.AVAILABLE_IN_WINDOW);
  }

  /**
   * @export
   * @param {!string} b64PublicKey
   */
  usePublicVapidKey(b64PublicKey) {
    throw this.errorFactory_.create(Errors.codes.AVAILABLE_IN_WINDOW);
  }

  /**
   * @export
   * @param {!firebase.Observer|function(*)} nextOrObserver
   * @param {function(!Error)=} optError
   * @param {function()=} optCompleted
   * @return {!function()}
   */
  onMessage(nextOrObserver, optError, optCompleted) {
    throw this.errorFactory_.create(Errors.codes.AVAILABLE_IN_WINDOW);
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
    throw this.errorFactory_.create(Errors.codes.AVAILABLE_IN_WINDOW);
  }

  //
  // The following methods are used by the service worker only.
  //

  /**
   * @export
   * @param {function(Object)} callback
   */
  setBackgroundMessageHandler(callback) {
    throw this.errorFactory_.create(Errors.codes.AVAILABLE_IN_SW);
  }

  //
  // The following methods are used by the service themselves and not exposed
  // publicly or not expected to be used by developers.
  //

  /**
   * This method is required to adhere to the Firebase interface.
   * It closes any currently open indexdb database connections.
   */
  delete() {
    return Promise.all([
      this.tokenDetailsModel_.closeDatabase(),
      this.vapidDetailsModel_.closeDatabase()
    ]);
  }

  /**
   * Returns the current Notification Permission state.
   * @private
   * @return {string} The currenct permission state.
   */
  getNotificationPermission_() {
    return (Notification as any).permission;
  }

  getTokenDetailsModel(): TokenDetailsModel {
    return this.tokenDetailsModel_;
  }

  getVapidDetailsModel(): VapidDetailsModel {
    return this.vapidDetailsModel_;
  }

  /**
   * @protected
   * @returns {IIDModel}
   */
  getIIDModel() {
    return this.iidModel_;
  }
}
