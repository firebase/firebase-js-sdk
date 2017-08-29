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
import TokenManager from '../models/token-manager';
import NOTIFICATION_PERMISSION from '../models/notification-permission';

const SENDER_ID_OPTION_NAME = 'messagingSenderId';

export default class ControllerInterface {
  public app;
  public INTERNAL;
  protected errorFactory_;
  private messagingSenderId_: string;
  private tokenManager_: TokenManager;

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

    this.tokenManager_ = new TokenManager();

    this.app = app;
    this.INTERNAL = {};
    this.INTERNAL.delete = () => this.delete;
  }

  /**
   * @export
   * @return {Promise<string> | Promise<null>} Returns a promise that
   * resolves to an FCM token.
   */
  getToken() {
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

    return this.getSWRegistration_().then(registration => {
      return this.tokenManager_
        .getSavedToken(this.messagingSenderId_, registration)
        .then(token => {
          if (token) {
            return token;
          }

          return this.tokenManager_.createToken(
            this.messagingSenderId_,
            registration
          );
        });
    });
  }

  /**
   * This method deletes tokens that the token manager looks after and then
   * unregisters the push subscription if it exists.
   * @export
   * @param {string} token
   * @return {Promise<void>}
   */
  deleteToken(token) {
    return this.tokenManager_.deleteToken(token).then(() => {
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

  //
  // The following methods should only be available in the window.
  //

  requestPermission() {
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
    this.tokenManager_.closeDatabase();
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
   * @returns {TokenManager}
   */
  getTokenManager() {
    return this.tokenManager_;
  }
}
