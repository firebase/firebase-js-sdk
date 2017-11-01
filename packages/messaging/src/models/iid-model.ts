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

import Errors from './errors';
import arrayBufferToBase64 from '../helpers/array-buffer-to-base64';
import FCMDetails from './fcm-details';

export default class IIDModel {
  private errorFactory_: ErrorFactory<string>;

  constructor() {
    this.errorFactory_ = new ErrorFactory('messaging', 'Messaging', Errors.map);
  }

  /**
   * Given a PushSubscription and messagingSenderId, get an FCM token.
   * @public
   * @param  {string} senderId The 'messagingSenderId' to tie the token to.
   * @param  {PushSubscription} subscription The PushSusbcription to "federate".
   * @param  {string=} pushSet If defined this will swap the subscription for
   * matching FCM token.
   * @return {Promise<!Object>} Returns the FCM token to be used in place
   * of the PushSubscription.
   */
  getToken(senderId, subscription, pushSet?): Promise<Object> {
    const p256dh = arrayBufferToBase64(subscription['getKey']('p256dh'));
    const auth = arrayBufferToBase64(subscription['getKey']('auth'));

    let fcmSubscribeBody =
      `authorized_entity=${senderId}&` +
      `endpoint=${subscription.endpoint}&` +
      `encryption_key=${p256dh}&` +
      `encryption_auth=${auth}`;

    if (pushSet) {
      fcmSubscribeBody += `&pushSet=${pushSet}`;
    }

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');

    const subscribeOptions = {
      method: 'POST',
      headers: headers,
      body: fcmSubscribeBody
    };

    return fetch(
      FCMDetails.ENDPOINT + '/fcm/connect/subscribe',
      subscribeOptions
    )
      .then(response => response.json())
      .then(response => {
        const fcmTokenResponse = response;
        if (fcmTokenResponse['error']) {
          const message = fcmTokenResponse['error']['message'];
          throw this.errorFactory_.create(Errors.codes.TOKEN_SUBSCRIBE_FAILED, {
            message: message
          });
        }

        if (!fcmTokenResponse['token']) {
          throw this.errorFactory_.create(
            Errors.codes.TOKEN_SUBSCRIBE_NO_TOKEN
          );
        }

        if (!fcmTokenResponse['pushSet']) {
          throw this.errorFactory_.create(
            Errors.codes.TOKEN_SUBSCRIBE_NO_PUSH_SET
          );
        }

        return {
          token: fcmTokenResponse['token'],
          pushSet: fcmTokenResponse['pushSet']
        };
      });
  }
}