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

import { StorageCache } from '../storage/storage_cache';
import {
  FetchResponse,
  RemoteConfigFetchClient,
  FetchRequest
} from './remote_config_fetch_client';
import { Storage } from '../storage/storage';
import { Logger } from '@firebase/logger';

/**
 * Implements the {@link RemoteConfigClient} abstraction with success response caching.
 *
 * <p>Comparable to the browser's Cache API for responses, but the Cache API requires a Service
 * Worker, which requires HTTPS, which would significantly complicate SDK installation. Also, the
 * Cache API doesn't support matching entries by time.
 */
export class CachingClient implements RemoteConfigFetchClient {
  constructor(
    private readonly client: RemoteConfigFetchClient,
    private readonly storage: Storage,
    private readonly storageCache: StorageCache,
    private readonly logger: Logger
  ) {}

  /**
   * Returns true if the age of the cached fetched configs is less than or equal to
   * {@link Settings#minimumFetchIntervalInSeconds}.
   *
   * <p>This is comparable to passing `headers = { 'Cache-Control': max-age <maxAge> }` to the
   * native Fetch API.
   *
   * <p>Visible for testing.
   */
  isCachedDataFresh(
    cacheMaxAgeMillis: number,
    lastSuccessfulFetchTimestampMillis: number | undefined
  ): boolean {
    // Cache can only be fresh if it's populated.
    if (!lastSuccessfulFetchTimestampMillis) {
      this.logger.debug('Config fetch cache check. Cache unpopulated.');
      return false;
    }

    // Calculates age of cache entry.
    const cacheAgeMillis = Date.now() - lastSuccessfulFetchTimestampMillis;

    const isCachedDataFresh = cacheAgeMillis <= cacheMaxAgeMillis;

    this.logger.debug(
      'Config fetch cache check.' +
        ` Cache age millis: ${cacheAgeMillis}.` +
        ` Cache max age millis (minimumFetchIntervalMillis setting): ${cacheMaxAgeMillis}.` +
        ` Is cache hit: ${isCachedDataFresh}.`
    );

    return isCachedDataFresh;
  }

  async fetch(request: FetchRequest): Promise<FetchResponse> {
    // Reads from persisted storage to avoid cache miss if callers don't wait on initialization.
    const [
      lastSuccessfulFetchTimestampMillis,
      lastSuccessfulFetchResponse
    ] = await Promise.all([
      this.storage.getLastSuccessfulFetchTimestampMillis(),
      this.storage.getLastSuccessfulFetchResponse()
    ]);

    // Exits early on cache hit.
    if (
      lastSuccessfulFetchResponse &&
      this.isCachedDataFresh(
        request.cacheMaxAgeMillis,
        lastSuccessfulFetchTimestampMillis
      )
    ) {
      return lastSuccessfulFetchResponse;
    }

    // Deviates from pure decorator by not honoring a passed ETag since we don't have a public API
    // that allows the caller to pass an ETag.
    request.eTag =
      lastSuccessfulFetchResponse && lastSuccessfulFetchResponse.eTag;

    // Falls back to service on cache miss.
    const response = await this.client.fetch(request);

    // Fetch throws for non-success responses, so success is guaranteed here.

    const storageOperations = [
      // Uses write-through cache for consistency with synchronous public API.
      this.storageCache.setLastSuccessfulFetchTimestampMillis(Date.now())
    ];

    if (response.status === 200) {
      // Caches response only if it has changed, ie non-304 responses.
      storageOperations.push(
        this.storage.setLastSuccessfulFetchResponse(response)
      );
    }

    await Promise.all(storageOperations);

    return response;
  }
}
