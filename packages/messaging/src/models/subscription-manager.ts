/**
 * @license
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

import { arrayBufferToBase64 } from '../helpers/array-buffer-to-base64';
import { isArrayBufferEqual } from '../helpers/is-array-buffer-equal';
import { ErrorCode, errorFactory } from './errors';
import { DEFAULT_PUBLIC_VAPID_KEY, ENDPOINT } from './fcm-details';
import { FirebaseApp } from '@firebase/app-types';
import { TokenDetails } from '../interfaces/token-details';
import { FirebaseInternalServices } from '../interfaces/internal-services';

interface ApiResponse {
  token?: string;
  error?: { message: string };
}

interface TokenRequestBody {
  web: {
    endpoint: string;
    p256dh: string;
    auth: string;
    applicationPubKey?: string;
  };
}

export class SubscriptionManager {
  async getToken(
    services: FirebaseInternalServices,
    subscription: PushSubscription,
    vapidKey: Uint8Array
  ): Promise<string> {
    const headers = await getHeaders(services);
    const body = getBody(subscription, vapidKey);

    const subscribeOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    };

    let responseData: ApiResponse;
    try {
      const response = await fetch(getEndpoint(services.app), subscribeOptions);
      responseData = await response.json();
    } catch (err) {
      throw errorFactory.create(ErrorCode.TOKEN_SUBSCRIBE_FAILED, {
        errorInfo: err
      });
    }

    if (responseData.error) {
      const message = responseData.error.message;
      throw errorFactory.create(ErrorCode.TOKEN_SUBSCRIBE_FAILED, {
        errorInfo: message
      });
    }

    if (!responseData.token) {
      throw errorFactory.create(ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN);
    }

    return responseData.token;
  }

  /**
   * Update the underlying token details for fcmToken.
   */
  async updateToken(
    tokenDetails: TokenDetails,
    services: FirebaseInternalServices,
    subscription: PushSubscription,
    vapidKey: Uint8Array
  ): Promise<string> {
    const headers = await getHeaders(services);
    const body = getBody(subscription, vapidKey);

    const updateOptions = {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    };

    let responseData: ApiResponse;
    try {
      const response = await fetch(
        `${getEndpoint(services.app)}/${tokenDetails.fcmToken}`,
        updateOptions
      );
      responseData = await response.json();
    } catch (err) {
      throw errorFactory.create(ErrorCode.TOKEN_UPDATE_FAILED, {
        errorInfo: err
      });
    }

    if (responseData.error) {
      const message = responseData.error.message;
      throw errorFactory.create(ErrorCode.TOKEN_UPDATE_FAILED, {
        errorInfo: message
      });
    }

    if (!responseData.token) {
      throw errorFactory.create(ErrorCode.TOKEN_UPDATE_NO_TOKEN);
    }

    return responseData.token;
  }

  async deleteToken(
    services: FirebaseInternalServices,
    tokenDetails: TokenDetails
  ): Promise<void> {
    // TODO: Add FIS header
    const headers = await getHeaders(services);

    const unsubscribeOptions = {
      method: 'DELETE',
      headers
    };

    try {
      const response = await fetch(
        `${getEndpoint(services.app)}/${tokenDetails.fcmToken}`,
        unsubscribeOptions
      );
      const responseData: ApiResponse = await response.json();
      if (responseData.error) {
        const message = responseData.error.message;
        throw errorFactory.create(ErrorCode.TOKEN_UNSUBSCRIBE_FAILED, {
          errorInfo: message
        });
      }
    } catch (err) {
      throw errorFactory.create(ErrorCode.TOKEN_UNSUBSCRIBE_FAILED, {
        errorInfo: err
      });
    }
  }
}

function getEndpoint(app: FirebaseApp): string {
  return `${ENDPOINT}/projects/${app.options.projectId!}/registrations`;
}

async function getHeaders({
  app,
  installations
}: FirebaseInternalServices): Promise<Headers> {
  const authToken = await installations.getToken();

  return new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-goog-api-key': app.options.apiKey!,
    'x-goog-firebase-installations-auth': `FIS ${authToken}`
  });
}

function getBody(
  subscription: PushSubscription,
  vapidKey: Uint8Array
): TokenRequestBody {
  const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
  const auth = arrayBufferToBase64(subscription.getKey('auth')!);
  const body: TokenRequestBody = {
    web: {
      endpoint: subscription.endpoint,
      p256dh,
      auth
    }
  };

  if (!isArrayBufferEqual(vapidKey.buffer, DEFAULT_PUBLIC_VAPID_KEY.buffer)) {
    body.web.applicationPubKey = arrayBufferToBase64(vapidKey);
  }

  return body;
}
