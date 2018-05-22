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
import { FirebaseServiceInternals } from '@firebase/app-types/private';
import { FirebaseMessaging } from '@firebase/messaging-types';
import {
  CompleteFn,
  ErrorFn,
  NextFn,
  Observer,
  Unsubscribe
} from '@firebase/util';

import { isArrayBufferEqual } from '../helpers/is-array-buffer-equal';
import { MessagePayload } from '../interfaces/message-payload';
import { TokenDetails } from '../interfaces/token-details';
import { ERROR_CODES, errorFactory } from '../models/errors';
import { IidModel } from '../models/iid-model';
import { TokenDetailsModel } from '../models/token-details-model';
import { VapidDetailsModel } from '../models/vapid-details-model';

// tslint:disable-next-line no-any User can return any type of promise.
export type BgMessageHandler = (payload: MessagePayload) => Promise<any> | void;

const SENDER_ID_OPTION_NAME = 'messagingSenderId';
// Database cache should be invalidated once a week.
export const TOKEN_EXPIRATION_MILLIS = 7 * 24 * 60 * 60 * 1000; // 7 days

export abstract class BaseController implements FirebaseMessaging {
  app: FirebaseApp;
  INTERNAL: FirebaseServiceInternals;
  private readonly messagingSenderId: string;
  private readonly tokenDetailsModel: TokenDetailsModel;
  private readonly vapidDetailsModel: VapidDetailsModel;
  private readonly iidModel: IidModel;

  /**
   * An interface of the Messaging Service API
   */
  constructor(app: FirebaseApp) {
    if (
      !app.options[SENDER_ID_OPTION_NAME] ||
      typeof app.options[SENDER_ID_OPTION_NAME] !== 'string'
    ) {
      throw errorFactory.create(ERROR_CODES.BAD_SENDER_ID);
    }

    this.messagingSenderId = app.options[SENDER_ID_OPTION_NAME]!;

    this.tokenDetailsModel = new TokenDetailsModel();
    this.vapidDetailsModel = new VapidDetailsModel();
    this.iidModel = new IidModel();

    this.app = app;
    this.INTERNAL = {
      delete: () => this.delete()
    };
  }

  /**
   * @export
   */
  async getToken(): Promise<string | null> {
    // Check with permissions
    const currentPermission = this.getNotificationPermission_();
    if (currentPermission === 'denied') {
      throw errorFactory.create(ERROR_CODES.NOTIFICATIONS_BLOCKED);
    } else if (currentPermission !== 'granted') {
      // We must wait for permission to be granted
      return null;
    }

    const swReg = await this.getSWRegistration_();
    const publicVapidKey = await this.getPublicVapidKey_();
    // If a PushSubscription exists it's returned, otherwise a new subscription
    // is generated and returned.
    const pushSubscription = await this.getPushSubscription(
      swReg,
      publicVapidKey
    );
    const tokenDetails = await this.tokenDetailsModel.getTokenDetailsFromSWScope(
      swReg.scope
    );

    if (tokenDetails) {
      return this.manageExistingToken(
        swReg,
        pushSubscription,
        publicVapidKey,
        tokenDetails
      );
    }
    return this.getNewToken(swReg, pushSubscription, publicVapidKey);
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
  private async manageExistingToken(
    swReg: ServiceWorkerRegistration,
    pushSubscription: PushSubscription,
    publicVapidKey: Uint8Array,
    tokenDetails: TokenDetails
  ): Promise<string> {
    const isTokenValid = isTokenStillValid(
      pushSubscription,
      publicVapidKey,
      tokenDetails
    );
    if (isTokenValid) {
      const now = Date.now();
      if (now < tokenDetails.createTime + TOKEN_EXPIRATION_MILLIS) {
        return tokenDetails.fcmToken;
      } else {
        return this.updateToken(
          swReg,
          pushSubscription,
          publicVapidKey,
          tokenDetails
        );
      }
    }

    // If the token is no longer valid (for example if the VAPID details
    // have changed), delete the existing token from the FCM client and server
    // database. No need to unsubscribe from the Service Worker as we have a
    // good push subscription that we'd like to use in getNewToken.
    await this.deleteTokenFromDB(tokenDetails.fcmToken);
    return this.getNewToken(swReg, pushSubscription, publicVapidKey);
  }

  private async updateToken(
    swReg: ServiceWorkerRegistration,
    pushSubscription: PushSubscription,
    publicVapidKey: Uint8Array,
    tokenDetails: TokenDetails
  ): Promise<string> {
    try {
      const updatedToken = await this.iidModel.updateToken(
        this.messagingSenderId,
        tokenDetails.fcmToken,
        tokenDetails.fcmPushSet,
        pushSubscription,
        publicVapidKey
      );

      const allDetails: TokenDetails = {
        swScope: swReg.scope,
        vapidKey: publicVapidKey,
        fcmSenderId: this.messagingSenderId,
        fcmToken: updatedToken,
        fcmPushSet: tokenDetails.fcmPushSet,
        createTime: Date.now(),
        endpoint: pushSubscription.endpoint,
        auth: pushSubscription.getKey('auth')!,
        p256dh: pushSubscription.getKey('p256dh')!
      };

      await this.tokenDetailsModel.saveTokenDetails(allDetails);
      await this.vapidDetailsModel.saveVapidDetails(
        swReg.scope,
        publicVapidKey
      );
      return updatedToken;
    } catch (e) {
      await this.deleteToken(tokenDetails.fcmToken);
      throw e;
    }
  }

  private async getNewToken(
    swReg: ServiceWorkerRegistration,
    pushSubscription: PushSubscription,
    publicVapidKey: Uint8Array
  ): Promise<string> {
    const tokenDetails = await this.iidModel.getToken(
      this.messagingSenderId,
      pushSubscription,
      publicVapidKey
    );
    const allDetails: TokenDetails = {
      swScope: swReg.scope,
      vapidKey: publicVapidKey,
      fcmSenderId: this.messagingSenderId,
      fcmToken: tokenDetails.token,
      fcmPushSet: tokenDetails.pushSet,
      createTime: Date.now(),
      endpoint: pushSubscription.endpoint,
      auth: pushSubscription.getKey('auth')!,
      p256dh: pushSubscription.getKey('p256dh')!
    };
    await this.tokenDetailsModel.saveTokenDetails(allDetails);
    await this.vapidDetailsModel.saveVapidDetails(swReg.scope, publicVapidKey);
    return tokenDetails.token;
  }

  /**
   * This method deletes tokens that the token manager looks after,
   * unsubscribes the token from FCM  and then unregisters the push
   * subscription if it exists. It returns a promise that indicates
   * whether or not the unsubscribe request was processed successfully.
   */
  async deleteToken(token: string): Promise<boolean> {
    // Delete the token details from the database.
    await this.deleteTokenFromDB(token);
    // Unsubscribe from the SW.
    const registration = await this.getSWRegistration_();
    if (registration) {
      const pushSubscription = await registration.pushManager.getSubscription();
      if (pushSubscription) {
        return pushSubscription.unsubscribe();
      }
    }
    // If there's no SW, consider it a success.
    return true;
  }

  /**
   * This method will delete the token from the client database, and make a
   * call to FCM to remove it from the server DB. Does not temper with the
   * push subscription.
   */
  private async deleteTokenFromDB(token: string): Promise<void> {
    const details = await this.tokenDetailsModel.deleteToken(token);
    await this.iidModel.deleteToken(
      details.fcmSenderId,
      details.fcmToken,
      details.fcmPushSet
    );
  }

  // Visible for testing
  // TODO: Make protected
  abstract getSWRegistration_(): Promise<ServiceWorkerRegistration>;

  // Visible for testing
  // TODO: Make protected
  abstract getPublicVapidKey_(): Promise<Uint8Array>;

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

  //
  // The following methods should only be available in the window.
  //

  requestPermission(): Promise<void> {
    throw errorFactory.create(ERROR_CODES.AVAILABLE_IN_WINDOW);
  }

  useServiceWorker(registration: ServiceWorkerRegistration): void {
    throw errorFactory.create(ERROR_CODES.AVAILABLE_IN_WINDOW);
  }

  usePublicVapidKey(b64PublicKey: string): void {
    throw errorFactory.create(ERROR_CODES.AVAILABLE_IN_WINDOW);
  }

  onMessage(
    nextOrObserver: NextFn<object> | Observer<object>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    throw errorFactory.create(ERROR_CODES.AVAILABLE_IN_WINDOW);
  }

  onTokenRefresh(
    nextOrObserver: NextFn<object> | Observer<object>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    throw errorFactory.create(ERROR_CODES.AVAILABLE_IN_WINDOW);
  }

  //
  // The following methods are used by the service worker only.
  //

  setBackgroundMessageHandler(callback: BgMessageHandler): void {
    throw errorFactory.create(ERROR_CODES.AVAILABLE_IN_SW);
  }

  //
  // The following methods are used by the service themselves and not exposed
  // publicly or not expected to be used by developers.
  //

  /**
   * This method is required to adhere to the Firebase interface.
   * It closes any currently open indexdb database connections.
   */
  async delete(): Promise<void> {
    await Promise.all([
      this.tokenDetailsModel.closeDatabase(),
      this.vapidDetailsModel.closeDatabase()
    ]);
  }

  /**
   * Returns the current Notification Permission state.
   */
  getNotificationPermission_(): NotificationPermission {
    // TODO: Remove the cast when this issue is fixed:
    // https://github.com/Microsoft/TypeScript/issues/14701
    // tslint:disable-next-line no-any
    return (Notification as any).permission;
  }

  getTokenDetailsModel(): TokenDetailsModel {
    return this.tokenDetailsModel;
  }

  getVapidDetailsModel(): VapidDetailsModel {
    return this.vapidDetailsModel;
  }

  // Visible for testing
  // TODO: make protected
  getIidModel(): IidModel {
    return this.iidModel;
  }
}

/**
 * Checks if the tokenDetails match the details provided in the clients.
 */
function isTokenStillValid(
  pushSubscription: PushSubscription,
  publicVapidKey: Uint8Array,
  tokenDetails: TokenDetails
): boolean {
  if (
    !tokenDetails.vapidKey ||
    !isArrayBufferEqual(publicVapidKey.buffer, tokenDetails.vapidKey.buffer)
  ) {
    return false;
  }

  const isEndpointEqual = pushSubscription.endpoint === tokenDetails.endpoint;
  const isAuthEqual = isArrayBufferEqual(
    pushSubscription.getKey('auth'),
    tokenDetails.auth
  );
  const isP256dhEqual = isArrayBufferEqual(
    pushSubscription.getKey('p256dh'),
    tokenDetails.p256dh
  );

  return isEndpointEqual && isAuthEqual && isP256dhEqual;
}
