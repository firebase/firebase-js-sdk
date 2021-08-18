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

import '../setup';
import { expect } from 'chai';
import {
  RemoteConfigFetchClient,
  FetchResponse,
  FetchRequest,
  RemoteConfigAbortSignal
} from '../../src/client/remote_config_fetch_client';
import * as sinon from 'sinon';
import { CachingClient } from '../../src/client/caching_client';
import { StorageCache } from '../../src/storage/storage_cache';
import { Storage } from '../../src/storage/storage';
import { Logger } from '@firebase/logger';

const DEFAULT_REQUEST: FetchRequest = {
  // Invalidates cache by default.
  cacheMaxAgeMillis: 0,
  signal: new RemoteConfigAbortSignal()
};

describe('CachingClient', () => {
  const backingClient = {} as RemoteConfigFetchClient;
  const storageCache = {} as StorageCache;
  const logger = {} as Logger;
  const storage = {} as Storage;
  let cachingClient: CachingClient;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    logger.debug = sinon.stub();
    cachingClient = new CachingClient(
      backingClient,
      storage,
      storageCache,
      logger
    );
    clock = sinon.useFakeTimers({ now: 3000 }); // Mocks Date.now as 3000.
  });

  afterEach(() => {
    clock.restore();
  });

  describe('isCacheDataFresh', () => {
    it('returns false if cached response is older than max age', () => {
      expect(
        cachingClient.isCachedDataFresh(
          // Mocks a cache set when Date.now was 1000, ie it's two seconds old.
          1000,
          // Tolerates a cache one second old.
          1000
        )
      ).to.be.false;
    });

    it('returns true if cached response is equal to max age', () => {
      expect(cachingClient.isCachedDataFresh(2000, 1000)).to.be.true;
    });

    it('returns true if cached response is younger than max age', () => {
      expect(cachingClient.isCachedDataFresh(3000, 1000)).to.be.true;
    });
  });

  describe('fetch', () => {
    beforeEach(() => {
      storage.getLastSuccessfulFetchTimestampMillis = sinon
        .stub()
        .returns(1000); // Mocks a cache set when Date.now was 1000, ie it's two seconds old.
      storageCache.setLastSuccessfulFetchTimestampMillis = sinon.stub();
      storage.getLastSuccessfulFetchResponse = sinon.stub();
      storage.setLastSuccessfulFetchResponse = sinon.stub();
      backingClient.fetch = sinon.stub().returns(Promise.resolve({}));
    });

    it('exits early on cache hit', async () => {
      const expectedResponse = { config: { eTag: 'etag', color: 'taupe' } };
      storage.getLastSuccessfulFetchResponse = sinon
        .stub()
        .returns(expectedResponse);

      const actualResponse = await cachingClient.fetch({
        cacheMaxAgeMillis: 2000,
        signal: new RemoteConfigAbortSignal()
      });

      expect(actualResponse).to.deep.eq(expectedResponse);
      expect(backingClient.fetch).not.to.have.been.called;
    });

    it('fetches on cache miss', async () => {
      await cachingClient.fetch(DEFAULT_REQUEST);

      expect(backingClient.fetch).to.have.been.called;
    });

    it('passes etag from last successful fetch', async () => {
      const lastSuccessfulFetchResponse = { eTag: 'etag' } as FetchResponse;
      storage.getLastSuccessfulFetchResponse = sinon
        .stub()
        .returns(lastSuccessfulFetchResponse);

      await cachingClient.fetch(DEFAULT_REQUEST);

      expect(backingClient.fetch).to.have.been.calledWith(
        Object.assign({}, DEFAULT_REQUEST, {
          eTag: lastSuccessfulFetchResponse.eTag
        })
      );
    });

    it('caches timestamp and response if status is 200', async () => {
      const response = {
        status: 200,
        eTag: 'etag',
        config: { color: 'clear' }
      };
      backingClient.fetch = sinon.stub().returns(Promise.resolve(response));

      await cachingClient.fetch(DEFAULT_REQUEST);

      expect(
        storageCache.setLastSuccessfulFetchTimestampMillis
      ).to.have.been.calledWith(3000); // Based on mock timer in beforeEach.
      expect(storage.setLastSuccessfulFetchResponse).to.have.been.calledWith(
        response
      );
    });

    it('sets timestamp, but not config, if 304', async () => {
      backingClient.fetch = sinon
        .stub()
        .returns(Promise.resolve({ status: 304 }));

      await cachingClient.fetch(DEFAULT_REQUEST);

      expect(
        storageCache.setLastSuccessfulFetchTimestampMillis
      ).to.have.been.calledWith(3000); // Based on mock timer in beforeEach.
      expect(storage.setLastSuccessfulFetchResponse).not.to.have.been.called;
    });
  });
});
