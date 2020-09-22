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

/**
 * @fileoverview Most logic is copied from packages/remote-config/src/client/retrying_client.ts
 */

import { FirebaseApp } from '@firebase/app-types';
import {
  DynamicConfig,
  ThrottleMetadata,
  MinimalDynamicConfig
} from '@firebase/analytics-types';
import { FirebaseError, calculateBackoffMillis } from '@firebase/util';
import { AnalyticsError, ERROR_FACTORY } from './errors';
import { DYNAMIC_CONFIG_URL, FETCH_TIMEOUT_MILLIS } from './constants';
import { logger } from './logger';

// App config fields needed by analytics.
export interface AppFields {
  appId: string;
  apiKey: string;
  measurementId?: string;
}

/**
 * Backoff factor for 503 errors, which we want to be conservative about
 * to avoid overloading servers. Each retry interval will be
 * BASE_INTERVAL_MILLIS * LONG_RETRY_FACTOR ^ retryCount, so the second one
 * will be ~30 seconds (with fuzzing).
 */
export const LONG_RETRY_FACTOR = 30;

/**
 * Base wait interval to multiplied by backoffFactor^backoffCount.
 */
const BASE_INTERVAL_MILLIS = 1000;

/**
 * Stubbable retry data storage class.
 */
class RetryData {
  constructor(
    public throttleMetadata: { [appId: string]: ThrottleMetadata } = {},
    public intervalMillis: number = BASE_INTERVAL_MILLIS
  ) {}

  getThrottleMetadata(appId: string): ThrottleMetadata {
    return this.throttleMetadata[appId];
  }

  setThrottleMetadata(appId: string, metadata: ThrottleMetadata): void {
    this.throttleMetadata[appId] = metadata;
  }

  deleteThrottleMetadata(appId: string): void {
    delete this.throttleMetadata[appId];
  }
}

const defaultRetryData = new RetryData();

/**
 * Set GET request headers.
 * @param apiKey App API key.
 */
function getHeaders(apiKey: string): Headers {
  return new Headers({
    Accept: 'application/json',
    'x-goog-api-key': apiKey
  });
}

/**
 * Fetches dynamic config from backend.
 * @param app Firebase app to fetch config for.
 */
export async function fetchDynamicConfig(
  appFields: AppFields
): Promise<DynamicConfig> {
  const { appId, apiKey } = appFields;
  const request: RequestInit = {
    method: 'GET',
    headers: getHeaders(apiKey)
  };
  const appUrl = DYNAMIC_CONFIG_URL.replace('{app-id}', appId);
  const response = await fetch(appUrl, request);
  if (response.status !== 200 && response.status !== 304) {
    let errorMessage = '';
    try {
      // Try to get any error message text from server response.
      const jsonResponse = (await response.json()) as {
        error?: { message?: string };
      };
      if (jsonResponse.error?.message) {
        errorMessage = jsonResponse.error.message;
      }
    } catch (_ignored) {}
    throw ERROR_FACTORY.create(AnalyticsError.CONFIG_FETCH_FAILED, {
      httpStatus: response.status,
      responseMessage: errorMessage
    });
  }
  return response.json();
}

/**
 * Fetches dynamic config from backend, retrying if failed.
 * @param app Firebase app to fetch config for.
 */
export async function fetchDynamicConfigWithRetry(
  app: FirebaseApp,
  // retryData and timeoutMillis are parameterized to allow passing a different value for testing.
  retryData: RetryData = defaultRetryData,
  timeoutMillis?: number
): Promise<DynamicConfig | MinimalDynamicConfig> {
  const { appId, apiKey, measurementId } = app.options;

  if (!appId) {
    throw ERROR_FACTORY.create(AnalyticsError.NO_APP_ID);
  }

  if (!apiKey) {
    if (measurementId) {
      return {
        measurementId,
        appId
      };
    }
    throw ERROR_FACTORY.create(AnalyticsError.NO_API_KEY);
  }

  const throttleMetadata: ThrottleMetadata = retryData.getThrottleMetadata(
    appId
  ) || {
    backoffCount: 0,
    throttleEndTimeMillis: Date.now()
  };

  const signal = new AnalyticsAbortSignal();

  setTimeout(
    async () => {
      // Note a very low delay, eg < 10ms, can elapse before listeners are initialized.
      signal.abort();
    },
    timeoutMillis !== undefined ? timeoutMillis : FETCH_TIMEOUT_MILLIS
  );

  return attemptFetchDynamicConfigWithRetry(
    { appId, apiKey, measurementId },
    throttleMetadata,
    signal,
    retryData
  );
}

/**
 * Runs one retry attempt.
 * @param appFields Necessary app config fields.
 * @param throttleMetadata Ongoing metadata to determine throttling times.
 * @param signal Abort signal.
 */
async function attemptFetchDynamicConfigWithRetry(
  appFields: AppFields,
  { throttleEndTimeMillis, backoffCount }: ThrottleMetadata,
  signal: AnalyticsAbortSignal,
  retryData: RetryData = defaultRetryData // for testing
): Promise<DynamicConfig | MinimalDynamicConfig> {
  const { appId, measurementId } = appFields;
  // Starts with a (potentially zero) timeout to support resumption from stored state.
  // Ensures the throttle end time is honored if the last attempt timed out.
  // Note the SDK will never make a request if the fetch timeout expires at this point.
  try {
    await setAbortableTimeout(signal, throttleEndTimeMillis);
  } catch (e) {
    if (measurementId) {
      logger.warn(
        `Timed out fetching this Firebase app's measurement ID from the server.` +
          ` Falling back to the measurement ID ${measurementId}` +
          ` provided in the "measurementId" field in the local Firebase config. [${e.message}]`
      );
      return { appId, measurementId };
    }
    throw e;
  }

  try {
    const response = await fetchDynamicConfig(appFields);

    // Note the SDK only clears throttle state if response is success or non-retriable.
    retryData.deleteThrottleMetadata(appId);

    return response;
  } catch (e) {
    if (!isRetriableError(e)) {
      retryData.deleteThrottleMetadata(appId);
      if (measurementId) {
        logger.warn(
          `Failed to fetch this Firebase app's measurement ID from the server.` +
            ` Falling back to the measurement ID ${measurementId}` +
            ` provided in the "measurementId" field in the local Firebase config. [${e.message}]`
        );
        return { appId, measurementId };
      } else {
        throw e;
      }
    }

    const backoffMillis =
      Number(e.httpStatus) === 503
        ? calculateBackoffMillis(
            backoffCount,
            retryData.intervalMillis,
            LONG_RETRY_FACTOR
          )
        : calculateBackoffMillis(backoffCount, retryData.intervalMillis);

    // Increments backoff state.
    const throttleMetadata = {
      throttleEndTimeMillis: Date.now() + backoffMillis,
      backoffCount: backoffCount + 1
    };

    // Persists state.
    retryData.setThrottleMetadata(appId, throttleMetadata);
    logger.debug(`Calling attemptFetch again in ${backoffMillis} millis`);

    return attemptFetchDynamicConfigWithRetry(
      appFields,
      throttleMetadata,
      signal,
      retryData
    );
  }
}

/**
 * Supports waiting on a backoff by:
 *
 * <ul>
 *   <li>Promisifying setTimeout, so we can set a timeout in our Promise chain</li>
 *   <li>Listening on a signal bus for abort events, just like the Fetch API</li>
 *   <li>Failing in the same way the Fetch API fails, so timing out a live request and a throttled
 *       request appear the same.</li>
 * </ul>
 *
 * <p>Visible for testing.
 */
function setAbortableTimeout(
  signal: AnalyticsAbortSignal,
  throttleEndTimeMillis: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Derives backoff from given end time, normalizing negative numbers to zero.
    const backoffMillis = Math.max(throttleEndTimeMillis - Date.now(), 0);

    const timeout = setTimeout(resolve, backoffMillis);

    // Adds listener, rather than sets onabort, because signal is a shared object.
    signal.addEventListener(() => {
      clearTimeout(timeout);
      // If the request completes before this timeout, the rejection has no effect.
      reject(
        ERROR_FACTORY.create(AnalyticsError.FETCH_THROTTLE, {
          throttleEndTimeMillis
        })
      );
    });
  });
}

/**
 * Returns true if the {@link Error} indicates a fetch request may succeed later.
 */
function isRetriableError(e: Error): boolean {
  if (!(e instanceof FirebaseError)) {
    return false;
  }

  // Uses string index defined by ErrorData, which FirebaseError implements.
  const httpStatus = Number(e['httpStatus']);

  return (
    httpStatus === 429 ||
    httpStatus === 500 ||
    httpStatus === 503 ||
    httpStatus === 504
  );
}

/**
 * Shims a minimal AbortSignal (copied from Remote Config).
 *
 * <p>AbortController's AbortSignal conveniently decouples fetch timeout logic from other aspects
 * of networking, such as retries. Firebase doesn't use AbortController enough to justify a
 * polyfill recommendation, like we do with the Fetch API, but this minimal shim can easily be
 * swapped out if/when we do.
 */
export class AnalyticsAbortSignal {
  listeners: Array<() => void> = [];
  addEventListener(listener: () => void): void {
    this.listeners.push(listener);
  }
  abort(): void {
    this.listeners.forEach(listener => listener());
  }
}
