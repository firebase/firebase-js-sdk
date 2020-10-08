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

import {
  RemoteConfigAbortSignal,
  RemoteConfigFetchClient,
  FetchResponse,
  FetchRequest
} from './remote_config_fetch_client';
import { ThrottleMetadata, Storage } from '../storage/storage';
import { ErrorCode, ERROR_FACTORY } from '../errors';
import { FirebaseError, calculateBackoffMillis } from '@firebase/util';

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
export function setAbortableTimeout(
  signal: RemoteConfigAbortSignal,
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
        ERROR_FACTORY.create(ErrorCode.FETCH_THROTTLE, {
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
 * Decorates a Client with retry logic.
 *
 * <p>Comparable to CachingClient, but uses backoff logic instead of cache max age and doesn't cache
 * responses (because the SDK has no use for error responses).
 */
export class RetryingClient implements RemoteConfigFetchClient {
  constructor(
    private readonly client: RemoteConfigFetchClient,
    private readonly storage: Storage
  ) {}

  async fetch(request: FetchRequest): Promise<FetchResponse> {
    const throttleMetadata = (await this.storage.getThrottleMetadata()) || {
      backoffCount: 0,
      throttleEndTimeMillis: Date.now()
    };

    return this.attemptFetch(request, throttleMetadata);
  }

  /**
   * A recursive helper for attempting a fetch request repeatedly.
   *
   * @throws any non-retriable errors.
   */
  async attemptFetch(
    request: FetchRequest,
    { throttleEndTimeMillis, backoffCount }: ThrottleMetadata
  ): Promise<FetchResponse> {
    // Starts with a (potentially zero) timeout to support resumption from stored state.
    // Ensures the throttle end time is honored if the last attempt timed out.
    // Note the SDK will never make a request if the fetch timeout expires at this point.
    await setAbortableTimeout(request.signal, throttleEndTimeMillis);

    try {
      const response = await this.client.fetch(request);

      // Note the SDK only clears throttle state if response is success or non-retriable.
      await this.storage.deleteThrottleMetadata();

      return response;
    } catch (e) {
      if (!isRetriableError(e)) {
        throw e;
      }

      // Increments backoff state.
      const throttleMetadata = {
        throttleEndTimeMillis:
          Date.now() + calculateBackoffMillis(backoffCount),
        backoffCount: backoffCount + 1
      };

      // Persists state.
      await this.storage.setThrottleMetadata(throttleMetadata);

      return this.attemptFetch(request, throttleMetadata);
    }
  }
}
