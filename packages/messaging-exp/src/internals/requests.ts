/**
 * @license
 * Copyright 2019 Google LLC
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

import { DEFAULT_VAPID_KEY, ENDPOINT } from '../util/constants';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { SubscriptionOptions, TokenDetails } from '../interfaces/token-details';

import { AppConfig } from '../interfaces/app-config';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';

export interface ApiResponse {
  token?: string;
  error?: { message: string };
}

export interface ApiRequestBody {
  web: {
    endpoint: string;
    p256dh: string;
    auth: string;
    applicationPubKey?: string;
  };
}

export async function requestGetToken(
  firebaseDependencies: FirebaseInternalDependencies,
  subscriptionOptions: SubscriptionOptions
): Promise<string> {
  const headers = await getHeaders(firebaseDependencies);
  const body = getBody(subscriptionOptions);

  const subscribeOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  };

  let responseData: ApiResponse;
  try {
    const response = await fetch(
      getEndpoint(firebaseDependencies.appConfig),
      subscribeOptions
    );
    responseData = await response.json();
  } catch (err) {
    throw ERROR_FACTORY.create(ErrorCode.TOKEN_SUBSCRIBE_FAILED, {
      errorInfo: err
    });
  }

  if (responseData.error) {
    const message = responseData.error.message;
    throw ERROR_FACTORY.create(ErrorCode.TOKEN_SUBSCRIBE_FAILED, {
      errorInfo: message
    });
  }

  if (!responseData.token) {
    throw ERROR_FACTORY.create(ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN);
  }

  return responseData.token;
}

export async function requestUpdateToken(
  firebaseDependencies: FirebaseInternalDependencies,
  tokenDetails: TokenDetails
): Promise<string> {
  const headers = await getHeaders(firebaseDependencies);
  const body = getBody(tokenDetails.subscriptionOptions!);

  const updateOptions = {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  };

  let responseData: ApiResponse;
  try {
    const response = await fetch(
      `${getEndpoint(firebaseDependencies.appConfig)}/${tokenDetails.token}`,
      updateOptions
    );
    responseData = await response.json();
  } catch (err) {
    throw ERROR_FACTORY.create(ErrorCode.TOKEN_UPDATE_FAILED, {
      errorInfo: err
    });
  }

  if (responseData.error) {
    const message = responseData.error.message;
    throw ERROR_FACTORY.create(ErrorCode.TOKEN_UPDATE_FAILED, {
      errorInfo: message
    });
  }

  if (!responseData.token) {
    throw ERROR_FACTORY.create(ErrorCode.TOKEN_UPDATE_NO_TOKEN);
  }

  return responseData.token;
}

export async function requestDeleteToken(
  firebaseDependencies: FirebaseInternalDependencies,
  token: string
): Promise<void> {
  const headers = await getHeaders(firebaseDependencies);

  const unsubscribeOptions = {
    method: 'DELETE',
    headers
  };

  try {
    const response = await fetch(
      `${getEndpoint(firebaseDependencies.appConfig)}/${token}`,
      unsubscribeOptions
    );
    const responseData: ApiResponse = await response.json();
    if (responseData.error) {
      const message = responseData.error.message;
      throw ERROR_FACTORY.create(ErrorCode.TOKEN_UNSUBSCRIBE_FAILED, {
        errorInfo: message
      });
    }
  } catch (err) {
    throw ERROR_FACTORY.create(ErrorCode.TOKEN_UNSUBSCRIBE_FAILED, {
      errorInfo: err
    });
  }
}

function getEndpoint({ projectId }: AppConfig): string {
  return `${ENDPOINT}/projects/${projectId!}/registrations`;
}

async function getHeaders({
  appConfig,
  installations
}: FirebaseInternalDependencies): Promise<Headers> {
  const authToken = await installations.getToken();

  return new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-goog-api-key': appConfig.apiKey!,
    'x-goog-firebase-installations-auth': `FIS ${authToken}`
  });
}

function getBody({
  p256dh,
  auth,
  endpoint,
  vapidKey
}: SubscriptionOptions): ApiRequestBody {
  const body: ApiRequestBody = {
    web: {
      endpoint,
      auth,
      p256dh
    }
  };

  if (vapidKey !== DEFAULT_VAPID_KEY) {
    body.web.applicationPubKey = vapidKey;
  }

  return body;
}
