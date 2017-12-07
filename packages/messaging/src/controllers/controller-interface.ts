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
import NOTIFICATION_PERMISSION from '../models/notification-permission';
import IIDModel from '../models/iid-model';
import FCMDetails from '../models/fcm-details';

const SENDER_ID_OPTION_NAME = 'messagingSenderId';
// Database cache should be invalidated once a week.
export const TOKEN_EXPIRATION_MILLIS = 7 * 24 * 60 * 60 * 1000;  // 7 days

export default class ControllerInterface {
  public app;
  public INTERNAL;
  protected errorFactory_;
  private messagingSenderId_: string;
  private tokenDetailsModel_: TokenDetailsModel;
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
    this.iidModel_ = new IIDModel();

    this.app = app;
    this.INTERNAL = {};
    this.INTERNAL.delete = () => this.delete();
  }

  /**
   * @export
   * @return {Promise<string> | Promise<null>} Returns a promise that
   * resolves to an FCM token.
   */
  async getToken() {
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

    const swReg = await this.getSWRegistration_();
    const tokenDetails = await this.tokenDetailsModel_.getTokenDetailsFromSWScope(swReg.scope);

    if (tokenDetails) {
      // TODO Validate the details are still accurate
      const now = Date.now();
      if (now < tokenDetails['createTime'] + TOKEN_EXPIRATION_MILLIS) {
        return tokenDetails['fcmToken'];
      } else {
        return await this.updateToken(tokenDetails, swReg);
      }
    }
    return await this.getNewToken(swReg);
  }

  private async updateToken(tokenDetails: Object, swReg: ServiceWorkerRegistration): Promise<string> {
    const publicVapidKey = await this.getPublicVapidKey_();
    const subscription = await this.getPushSubscription_(swReg, publicVapidKey);
    let updatedToken;
    try {
      updatedToken = await this.iidModel_.updateToken(
        this.messagingSenderId_,
        tokenDetails['fcmToken'],
        tokenDetails['pushDetails'],
        subscription,
        publicVapidKey
      );
    } catch(e) {
      // Delete the token, then proceed to throw the error.
      await this.deleteToken(tokenDetails['fcmToken']);
      throw e;
    }
    const allDetails = {
      swScope: swReg.scope,
      vapidKey: publicVapidKey,
      subscription: subscription,
      fcmSenderId: this.messagingSenderId_,
      fcmToken: updatedToken,
      fcmPushSet: tokenDetails['pushSet']
    };
    await this.tokenDetailsModel_.saveTokenDetails(allDetails);
    return updatedToken;
  }

  private async getNewToken(swReg: ServiceWorkerRegistration): Promise<string> {
    const publicVapidKey = await this.getPublicVapidKey_();
    const subscription = await this.getPushSubscription_(swReg, publicVapidKey);
    const tokenDetails = await this.iidModel_.getToken(
      this.messagingSenderId_,
      subscription,
      publicVapidKey
    );
    const allDetails = {
      swScope: swReg.scope,
      vapidKey: publicVapidKey,
      subscription: subscription,
      fcmSenderId: this.messagingSenderId_,
      fcmToken: tokenDetails['token'],
      fcmPushSet: tokenDetails['pushSet']
    };
    await this.tokenDetailsModel_.saveTokenDetails(allDetails);
    return tokenDetails['token'];
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

  getPushSubscription_(
    registration,
    publicVapidKey
  ): Promise<PushSubscription> {
    throw this.errorFactory_.create(Errors.codes.AVAILABLE_IN_WINDOW);
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
    return Promise.all([this.tokenDetailsModel_.closeDatabase()]);
  }

  /**
   * Returns the current Notification Permission state.
   * @private
   * @return {string} The currenct permission state.
   */
  getNotificationPermission_() {
    return (Notification as any).permission;
  }

  /**
   * @protected
   * @returns {TokenDetailsModel}
   */
  getTokenDetailsModel() {
    return this.tokenDetailsModel_;
  }

  /**
   * @protected
   * @returns {IIDModel}
   */
  getIIDModel() {
    return this.iidModel_;
  }
}
