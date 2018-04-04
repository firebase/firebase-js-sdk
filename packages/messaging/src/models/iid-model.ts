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

import { ErrorFactory, base64 } from '@firebase/util';

import { ERROR_CODES, ERROR_MAP } from './errors';
import { arrayBufferToBase64 } from '../helpers/array-buffer-to-base64';
import { DEFAULT_PUBLIC_VAPID_KEY, ENDPOINT } from './fcm-details';

export class IIDModel {
  private errorFactory_: ErrorFactory<string>;

  constructor() {
    this.errorFactory_ = new ErrorFactory('messaging', 'Messaging', ERROR_MAP);
  }

  /**
   * Given a PushSubscription and messagingSenderId, get an FCM token.
   * @public
   * @param  {string} senderId The 'messagingSenderId' to tie the token to.
   * @param  {PushSubscription} subscription The PushSusbcription to "federate".
   * @param  {Uint8Array} publicVapidKey The public VAPID key.
   * @return {Promise<!Object>} Returns the FCM token to be used in place
   * of the PushSubscription.
   */
  getToken(senderId, subscription, publicVapidKey): Promise<Object> {
    const p256dh = arrayBufferToBase64(subscription['getKey']('p256dh'));
    const auth = arrayBufferToBase64(subscription['getKey']('auth'));

    let fcmSubscribeBody =
      `authorized_entity=${senderId}&` +
      `endpoint=${subscription.endpoint}&` +
      `encryption_key=${p256dh}&` +
      `encryption_auth=${auth}`;

    if (publicVapidKey !== DEFAULT_PUBLIC_VAPID_KEY) {
      const applicationPubKey = arrayBufferToBase64(publicVapidKey);
      fcmSubscribeBody += `&application_pub_key=${applicationPubKey}`;
    }

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');

    const subscribeOptions = {
      method: 'POST',
      headers: headers,
      body: fcmSubscribeBody
    };

    return fetch(ENDPOINT + '/fcm/connect/subscribe', subscribeOptions)
      .then(response => response.json())
      .catch(() => {
        throw this.errorFactory_.create(ERROR_CODES.TOKEN_SUBSCRIBE_FAILED);
      })
      .then(response => {
        const fcmTokenResponse = response;
        if (fcmTokenResponse['error']) {
          const message = fcmTokenResponse['error']['message'];
          throw this.errorFactory_.create(ERROR_CODES.TOKEN_SUBSCRIBE_FAILED, {
            message: message
          });
        }

        if (!fcmTokenResponse['token']) {
          throw this.errorFactory_.create(ERROR_CODES.TOKEN_SUBSCRIBE_NO_TOKEN);
        }

        if (!fcmTokenResponse['pushSet']) {
          throw this.errorFactory_.create(
            ERROR_CODES.TOKEN_SUBSCRIBE_NO_PUSH_SET
          );
        }

        return {
          token: fcmTokenResponse['token'],
          pushSet: fcmTokenResponse['pushSet']
        };
      });
  }

  /**
   * Update the underlying token details for fcmToken.
   */
  updateToken(
    senderId: string,
    fcmToken: string,
    fcmPushSet: string,
    subscription: PushSubscription,
    publicVapidKey: Uint8Array
  ): Promise<string> {
    const p256dh = arrayBufferToBase64(subscription['getKey']('p256dh'));
    const auth = arrayBufferToBase64(subscription['getKey']('auth'));

    let fcmUpdateBody =
      `push_set=${fcmPushSet}&` +
      `token=${fcmToken}&` +
      `authorized_entity=${senderId}&` +
      `endpoint=${subscription.endpoint}&` +
      `encryption_key=${p256dh}&` +
      `encryption_auth=${auth}`;

    if (publicVapidKey !== DEFAULT_PUBLIC_VAPID_KEY) {
      const applicationPubKey = arrayBufferToBase64(publicVapidKey);
      fcmUpdateBody += `&application_pub_key=${applicationPubKey}`;
    }

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');

    const updateOptions = {
      method: 'POST',
      headers: headers,
      body: fcmUpdateBody
    };

    let updateFetchRes;
    return fetch(ENDPOINT + '/fcm/connect/subscribe', updateOptions)
      .then(fetchResponse => {
        updateFetchRes = fetchResponse;
        return fetchResponse.json();
      })
      .catch(() => {
        throw this.errorFactory_.create(ERROR_CODES.TOKEN_UPDATE_FAILED);
      })
      .then(fcmTokenResponse => {
        if (!updateFetchRes.ok) {
          const message = fcmTokenResponse['error']['message'];
          throw this.errorFactory_.create(ERROR_CODES.TOKEN_UPDATE_FAILED, {
            message: message
          });
        }
        if (!fcmTokenResponse['token']) {
          throw this.errorFactory_.create(ERROR_CODES.TOKEN_UPDATE_NO_TOKEN);
        }
        return fcmTokenResponse['token'];
      });
  }

  /**
   * Given a fcmToken, pushSet and messagingSenderId, delete an FCM token.
   */
  deleteToken(
    senderId: string,
    fcmToken: string,
    fcmPushSet: string
  ): Promise<void> {
    let fcmUnsubscribeBody =
      `authorized_entity=${senderId}&` +
      `token=${fcmToken}&` +
      `pushSet=${fcmPushSet}`;

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');

    const unsubscribeOptions = {
      method: 'POST',
      headers: headers,
      body: fcmUnsubscribeBody
    };

    return fetch(
      ENDPOINT + '/fcm/connect/unsubscribe',
      unsubscribeOptions
    ).then(fetchResponse => {
      if (!fetchResponse.ok) {
        return fetchResponse.json().then(
          fcmTokenResponse => {
            if (fcmTokenResponse['error']) {
              const message = fcmTokenResponse['error']['message'];
              throw this.errorFactory_.create(
                ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED,
                {
                  message: message
                }
              );
            }
          },
          err => {
            throw this.errorFactory_.create(
              ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED
            );
          }
        );
      }
    });
  }
}
