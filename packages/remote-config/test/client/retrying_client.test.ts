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

import { expect, vi } from 'vitest';
import { Storage, ThrottleMetadata } from '../../src/storage/storage';
import { FetchResponse } from '../../src';
import {
  RemoteConfigFetchClient,
  FetchRequest,
  RemoteConfigAbortSignal
} from '../../src/client/remote_config_fetch_client';
import {
  setAbortableTimeout,
  RetryingClient
} from '../../src/client/retrying_client';
import { ErrorCode, ERROR_FACTORY } from '../../src/errors';
import '../setup';

const DEFAULT_REQUEST: FetchRequest = {
  cacheMaxAgeMillis: 1,
  signal: new RemoteConfigAbortSignal()
};

describe('RetryingClient', () => {
  let backingClient: RemoteConfigFetchClient;
  let storage: Storage;
  let retryingClient: RetryingClient;
  let abortSignal: RemoteConfigAbortSignal;

  beforeEach(() => {
    backingClient = {} as RemoteConfigFetchClient;
    storage = {} as Storage;
    retryingClient = new RetryingClient(backingClient, storage);
    storage.getThrottleMetadata = vi.fn().mockResolvedValue(undefined);
    storage.deleteThrottleMetadata = vi.fn().mockResolvedValue(undefined);
    storage.setThrottleMetadata = vi.fn().mockResolvedValue(undefined);
    backingClient.fetch = vi.fn().mockResolvedValue({ status: 200 });
    abortSignal = new RemoteConfigAbortSignal();
  });

  describe('setAbortableTimeout', () => {
    it('Derives backoff from end time', async () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      const timeoutPromise = setAbortableTimeout(abortSignal, Date.now() + 1);

      await timeoutPromise;

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.anything(), 1);
      setTimeoutSpy.mockRestore();
    });

    it('Normalizes end time in the past to zero backoff', async () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
      const timeoutPromise = setAbortableTimeout(abortSignal, Date.now() - 1);

      await timeoutPromise;

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.anything(), 0);
      setTimeoutSpy.mockRestore();
    });

    it('listens for abort event and rejects promise', async () => {
      const throttleEndTimeMillis = 1000;

      const timeoutPromise = setAbortableTimeout(
        abortSignal,
        throttleEndTimeMillis
      );

      abortSignal.abort();

      const expectedError = ERROR_FACTORY.create(ErrorCode.FETCH_THROTTLE, {
        throttleEndTimeMillis
      });

      await expect(timeoutPromise).rejects.toThrow(expectedError.message);
    });
  });

  describe('fetch', () => {
    it('returns success response', async () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

      const expectedResponse: FetchResponse = {
        status: 200,
        eTag: 'etag',
        config: {}
      };
      backingClient.fetch = vi.fn().mockResolvedValue(expectedResponse);

      const actualResponse = retryingClient.fetch(DEFAULT_REQUEST);
      await expect(actualResponse).resolves.toEqual(expectedResponse);

      // Asserts setTimeout is passed a zero delay, since throttleEndTimeMillis is set to Date.now,
      // which is faked to be a constant.
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.anything(), 0);

      expect(storage.deleteThrottleMetadata).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it('rethrows unretriable errors rather than retrying', async () => {
      const expectedError = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
        httpStatus: 400
      });
      backingClient.fetch = vi.fn().mockRejectedValue(expectedError);

      const fetchPromise = retryingClient.fetch(DEFAULT_REQUEST);

      await expect(fetchPromise).rejects.toThrow(expectedError);
    });

    it('retries on retriable errors', async () => {
      // Configures Date.now() to advance clock from zero in 20ms increments, enabling
      // tests to assert a known throttle end time and allow setTimeout to work.
      vi.useFakeTimers({
        now: 0,
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
      });

      // Ensures backoff is always zero, which simplifies reasoning about timer.
      const powSpy = vi.spyOn(Math, 'pow').mockReturnValue(0);
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // Simulates a service call that returns errors several times before returning success.
      // Error codes from logs.
      const errorResponseStatuses = [429, 500, 503, 504];
      const errorResponseCount = errorResponseStatuses.length;

      backingClient.fetch = vi.fn().mockImplementation(() => {
        const httpStatus = errorResponseStatuses.pop();

        if (httpStatus) {
          // Triggers retry by returning a retriable status code.
          const expectedError = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
            httpStatus
          });
          return Promise.reject(expectedError);
        }

        // Halts retrying by returning success.
        // Note backoff never terminates if the server always errors.
        return Promise.resolve({ status: 200 });
      });

      await retryingClient.fetch(DEFAULT_REQUEST);

      // Asserts throttle metadata was persisted after each error response.
      for (let i = 1; i <= errorResponseCount; i++) {
        expect(storage.setThrottleMetadata).toHaveBeenCalledWith({
          backoffCount: i,
          throttleEndTimeMillis: i * 20
        });
      }

      powSpy.mockRestore();
      randomSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('attemptFetch', () => {
    it('honors metadata when initializing', async () => {
      vi.useFakeTimers({ now: 0, shouldAdvanceTime: true });
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

      const throttleMetadata = {
        throttleEndTimeMillis: 123
      } as ThrottleMetadata;

      await retryingClient.attemptFetch(DEFAULT_REQUEST, throttleMetadata);

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.anything(), 123);

      vi.useRealTimers();
      setTimeoutSpy.mockRestore();
    });
  });
});
