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
import {
  SubscriptionOptions,
  TokenDetails
} from '../interfaces/registration-details';

import { AppConfig } from '../interfaces/app-config';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { version as fcmSdkVersion } from '../../package.json';

/** Max attempts (initial fetch + retries) when CreateRegistration `fetch()` throws. */
export const FID_REGISTRATION_FETCH_MAX_ATTEMPTS = 3;

/** Base delay in ms; backoff is `BASE * 2^attempt` after each failed attempt. */
export const FID_REGISTRATION_FETCH_BASE_BACKOFF_MS = 1000;

export interface ApiResponse {
  token?: string;
  /**
   * CreateRegistration resource name, e.g. `projects/{projectId}/registrations/{fid}`.
   * A legacy plain FID string (no `/`) is also accepted.
   */
  name?: string;
  error?: { message: string };
}

export interface ApiRequestBody {
  // eslint-disable-next-line camelcase
  fcm_sdk_version?: string;
  /**
   * Client identifier for the registration: the site host (e.g. `www.example.com`) when the
   * service worker scope is a URL, otherwise the app name.
   */
  origin: string;
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
  const body = getBody(
    subscriptionOptions,
    firebaseDependencies.appConfig.appName,
    /* includeSdkVersion= */ false
  );

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
      errorInfo: (err as Error)?.toString()
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

/**
 * Creates (or refreshes) an FCM Web registration via CreateRegistration.
 *
 * This is used by the FID-based register path, where we don't require the returned FCM token, but
 * we do require a non-empty `name` (echoing the Firebase Installation ID) in the success response body.
 */
export interface CreateRegistrationResult {
  /** Firebase Installation ID parsed from the CreateRegistration response `name` field. */
  responseFid: string;
}

export async function requestCreateRegistration(
  firebaseDependencies: FirebaseInternalDependencies,
  subscriptionOptions: SubscriptionOptions
): Promise<CreateRegistrationResult> {
  const headers = await getHeaders(firebaseDependencies);
  const body = getBody(
    subscriptionOptions,
    firebaseDependencies.appConfig.appName,
    /* includeSdkVersion= */ true
  );

  const subscribeOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  };

  let response: Response;
  try {
    response = await fetchWithExponentialRetry(
      () =>
        fetch(getEndpoint(firebaseDependencies.appConfig), subscribeOptions),
      FID_REGISTRATION_FETCH_MAX_ATTEMPTS,
      FID_REGISTRATION_FETCH_BASE_BACKOFF_MS
    );
  } catch (err) {
    throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
      errorInfo: (err as Error)?.toString()
    });
  }

  if (response.ok) {
    const responseFid = await parseCreateRegistrationSuccessFid(response);
    return { responseFid };
  }

  // `fetch()` succeeded, but the backend returned a non-2xx response.
  // Best-effort parse the body to extract `error.message`, but always fail with
  // `FID_REGISTRATION_FAILED` to keep the error surface uniform.
  // Best-effort extraction of error details; the main signal is response.ok / status.
  let responseData: ApiResponse;
  try {
    responseData = (await response.json()) as ApiResponse;
  } catch (err) {
    throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
      errorInfo: response.statusText
    });
  }
  const message = responseData.error?.message ?? response.statusText;
  throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
    errorInfo: message
  });
}

/**
 * Parses a successful CreateRegistration body. The backend must return JSON with a non-empty
 * string `name`: either a resource name `projects/{projectId}/registrations/{fid}` or a legacy
 * plain FID.
 */
async function parseCreateRegistrationSuccessFid(
  response: Response
): Promise<string> {
  const text = await response.text();
  if (!text.trim()) {
    throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
      errorInfo: 'CreateRegistration succeeded but response body is empty'
    });
  }
  let data: ApiResponse;
  try {
    data = JSON.parse(text) as ApiResponse;
  } catch {
    throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
      errorInfo:
        'CreateRegistration succeeded but response body is not valid JSON'
    });
  }
  const name = data.name;
  if (typeof name !== 'string' || name.length === 0) {
    throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
      errorInfo:
        'CreateRegistration succeeded but response did not include a non-empty name'
    });
  }
  return parseFidFromRegistrationResourceName(name);
}

const REGISTRATIONS_NAME_SEGMENT = '/registrations/';

/** Extracts the Firebase Installation ID from `name` (resource path or legacy plain FID). */
function parseFidFromRegistrationResourceName(name: string): string {
  const segmentIndex = name.indexOf(REGISTRATIONS_NAME_SEGMENT);
  if (segmentIndex !== -1) {
    const fid = name.slice(segmentIndex + REGISTRATIONS_NAME_SEGMENT.length);
    if (fid.length > 0) {
      return fid;
    }
  }
  if (!name.includes('/')) {
    return name;
  }
  throw ERROR_FACTORY.create(ErrorCode.FID_REGISTRATION_FAILED, {
    errorInfo:
      'CreateRegistration succeeded but response name is not a valid registration resource name'
  });
}

export async function requestUpdateToken(
  firebaseDependencies: FirebaseInternalDependencies,
  tokenDetails: TokenDetails
): Promise<string> {
  const headers = await getHeaders(firebaseDependencies);
  const body = getBody(
    tokenDetails.subscriptionOptions!,
    firebaseDependencies.appConfig.appName,
    /* includeSdkVersion= */ false
  );

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
      errorInfo: (err as Error)?.toString()
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
      errorInfo: (err as Error)?.toString()
    });
  }
}

/**
 * Re-runs `operation` when it throws, with exponential backoff between attempts.
 * Rethrows the last error if all attempts fail.
 */
async function fetchWithExponentialRetry(
  operation: () => Promise<Response>,
  maxAttempts: number,
  baseBackoffMs: number
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delayMs = baseBackoffMs * Math.pow(2, attempt);
        await new Promise<void>(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
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

/**
 * Hostname for the registering web client (e.g. `www.example.com`), or the app name
 * (`appNameFallback`) when the scope cannot be resolved (e.g. some test environments).
 */
export function getRegistrationOrigin(
  swScope: string,
  appNameFallback: string
): string {
  try {
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(swScope)) {
      return new URL(swScope).host;
    }
  } catch {
    // Fall through to relative-scope handling.
  }
  try {
    if (typeof self !== 'undefined' && self.location?.href) {
      return new URL(swScope, self.location.origin).host;
    }
  } catch {
    // Fall through.
  }
  if (typeof self !== 'undefined' && self.location?.host) {
    return self.location.host;
  }
  return appNameFallback;
}

function getBody(
  { p256dh, auth, endpoint, vapidKey, swScope }: SubscriptionOptions,
  appNameFallback: string,
  includeSdkVersion: boolean
): ApiRequestBody {
  const body: ApiRequestBody = {
    origin: getRegistrationOrigin(swScope, appNameFallback),
    web: {
      endpoint,
      auth,
      p256dh
    }
  };

  if (includeSdkVersion) {
    // eslint-disable-next-line camelcase
    body.fcm_sdk_version = fcmSdkVersion;
  }

  if (vapidKey !== DEFAULT_VAPID_KEY) {
    body.web.applicationPubKey = vapidKey;
  }

  return body;
}
