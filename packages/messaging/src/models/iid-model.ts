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

import { base64, ErrorFactory } from '@firebase/util';

import { arrayBufferToBase64 } from '../helpers/array-buffer-to-base64';
import { TokenDetails } from '../interfaces/token-details';
import { ERROR_CODES, ERROR_MAP } from './errors';
import { DEFAULT_PUBLIC_VAPID_KEY, ENDPOINT } from './fcm-details';

// tslint:disable interface-name TSLint thinks I in IID is an interface prefix.
//
// TODO: Fix abbreviations in variable and class names to match Google
// TypeScript style guide, which follows the Java style guide:
// https://google.github.io/styleguide/javaguide.html#s5.3-camel-case
//
// In this case, IIDDetails should be IidDetails.
export interface IIDDetails {
  token: string;
  pushSet: string;
}
// tslint:enable interface-name

interface ApiResponse extends Partial<IIDDetails> {
  error?: { message: string };
}

export class IIDModel {
  private readonly errorFactory_: ErrorFactory<string>;

  constructor() {
    this.errorFactory_ = new ErrorFactory('messaging', 'Messaging', ERROR_MAP);
  }

  async getToken(
    senderId: string,
    subscription: PushSubscription,
    publicVapidKey: Uint8Array
  ): Promise<IIDDetails> {
    const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
    const auth = arrayBufferToBase64(subscription.getKey('auth')!);

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

    let responseData: ApiResponse;
    try {
      const response = await fetch(
        ENDPOINT + '/fcm/connect/subscribe',
        subscribeOptions
      );

      responseData = await response.json();
    } catch (err) {
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_SUBSCRIBE_FAILED);
    }

    if (responseData.error) {
      const message = responseData.error.message;
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_SUBSCRIBE_FAILED, {
        message: message
      });
    }

    if (!responseData.token) {
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_SUBSCRIBE_NO_TOKEN);
    }

    if (!responseData.pushSet) {
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_SUBSCRIBE_NO_PUSH_SET);
    }

    return {
      token: responseData.token,
      pushSet: responseData.pushSet
    };
  }

  /**
   * Update the underlying token details for fcmToken.
   */
  async updateToken(
    senderId: string,
    fcmToken: string,
    fcmPushSet: string,
    subscription: PushSubscription,
    publicVapidKey: Uint8Array
  ): Promise<string> {
    const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
    const auth = arrayBufferToBase64(subscription.getKey('auth')!);

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

    let responseData: ApiResponse;
    try {
      const response = await fetch(
        ENDPOINT + '/fcm/connect/subscribe',
        updateOptions
      );
      responseData = await response.json();
    } catch (err) {
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_UPDATE_FAILED);
    }

    if (responseData.error) {
      const message = responseData.error.message;
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_UPDATE_FAILED, {
        message: message
      });
    }

    if (!responseData.token) {
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_UPDATE_NO_TOKEN);
    }

    return responseData.token;
  }

  /**
   * Given a fcmToken, pushSet and messagingSenderId, delete an FCM token.
   */
  async deleteToken(
    senderId: string,
    fcmToken: string,
    fcmPushSet: string
  ): Promise<void> {
    const fcmUnsubscribeBody =
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

    try {
      const response = await fetch(
        ENDPOINT + '/fcm/connect/unsubscribe',
        unsubscribeOptions
      );
      const responseData: ApiResponse = await response.json();
      if (responseData.error) {
        const message = responseData.error.message;
        throw this.errorFactory_.create(ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED, {
          message: message
        });
      }
    } catch (err) {
      throw this.errorFactory_.create(ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED);
    }
  }
}
