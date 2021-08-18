/**
 * @license
 * Copyright 2020 Google LLC
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

import {
  BASE_ENDPOINT,
  EXCHANGE_DEBUG_TOKEN_METHOD,
  EXCHANGE_RECAPTCHA_TOKEN_METHOD
} from './constants';
import { FirebaseApp } from '@firebase/app-exp';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { Provider } from '@firebase/component';
import { AppCheckTokenInternal } from './types';

/**
 * Response JSON returned from AppCheck server endpoint.
 */
interface AppCheckResponse {
  attestationToken: string;
  // timeToLive
  ttl: string;
}

interface AppCheckRequest {
  url: string;
  body: { [key: string]: string };
}

export async function exchangeToken(
  { url, body }: AppCheckRequest,
  platformLoggerProvider: Provider<'platform-logger'>
): Promise<AppCheckTokenInternal> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  // If platform logger exists, add the platform info string to the header.
  const platformLogger = platformLoggerProvider.getImmediate({
    optional: true
  });
  if (platformLogger) {
    headers['X-Firebase-Client'] = platformLogger.getPlatformInfoString();
  }
  const options: RequestInit = {
    method: 'POST',
    body: JSON.stringify(body),
    headers
  };
  let response;
  try {
    response = await fetch(url, options);
  } catch (originalError) {
    throw ERROR_FACTORY.create(AppCheckError.FETCH_NETWORK_ERROR, {
      originalErrorMessage: originalError.message
    });
  }

  if (response.status !== 200) {
    throw ERROR_FACTORY.create(AppCheckError.FETCH_STATUS_ERROR, {
      httpStatus: response.status
    });
  }

  let responseBody: AppCheckResponse;
  try {
    // JSON parsing throws SyntaxError if the response body isn't a JSON string.
    responseBody = await response.json();
  } catch (originalError) {
    throw ERROR_FACTORY.create(AppCheckError.FETCH_PARSE_ERROR, {
      originalErrorMessage: originalError.message
    });
  }

  // Protobuf duration format.
  // https://developers.google.com/protocol-buffers/docs/reference/java/com/google/protobuf/Duration
  const match = responseBody.ttl.match(/^([\d.]+)(s)$/);
  if (!match || !match[2] || isNaN(Number(match[1]))) {
    throw ERROR_FACTORY.create(AppCheckError.FETCH_PARSE_ERROR, {
      originalErrorMessage:
        `ttl field (timeToLive) is not in standard Protobuf Duration ` +
        `format: ${responseBody.ttl}`
    });
  }
  const timeToLiveAsNumber = Number(match[1]) * 1000;

  const now = Date.now();
  return {
    token: responseBody.attestationToken,
    expireTimeMillis: now + timeToLiveAsNumber,
    issuedAtTimeMillis: now
  };
}

export function getExchangeRecaptchaTokenRequest(
  app: FirebaseApp,
  reCAPTCHAToken: string
): AppCheckRequest {
  const { projectId, appId, apiKey } = app.options;

  return {
    url: `${BASE_ENDPOINT}/projects/${projectId}/apps/${appId}:${EXCHANGE_RECAPTCHA_TOKEN_METHOD}?key=${apiKey}`,
    body: {
      // eslint-disable-next-line
      recaptcha_token: reCAPTCHAToken
    }
  };
}

export function getExchangeDebugTokenRequest(
  app: FirebaseApp,
  debugToken: string
): AppCheckRequest {
  const { projectId, appId, apiKey } = app.options;

  return {
    url: `${BASE_ENDPOINT}/projects/${projectId}/apps/${appId}:${EXCHANGE_DEBUG_TOKEN_METHOD}?key=${apiKey}`,
    body: {
      // eslint-disable-next-line
      debug_token: debugToken
    }
  };
}
