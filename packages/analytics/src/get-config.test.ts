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

import { expect, vi, MockInstance } from 'vitest';
import '../testing/setup';
import {
  fetchDynamicConfig,
  fetchDynamicConfigWithRetry,
  AppFields,
  LONG_RETRY_FACTOR
} from './get-config';
import { DYNAMIC_CONFIG_URL } from './constants';
import { getFakeApp } from '../testing/get-fake-firebase-services';
import { DynamicConfig, MinimalDynamicConfig } from './types';
import { AnalyticsError } from './errors';

const fakeMeasurementId = 'abcd-efgh-ijkl';
const fakeAppId = 'abcdefgh12345:23405';
const fakeAppParams = { appId: fakeAppId, apiKey: 'AAbbCCdd12345' };
const fakeUrl = DYNAMIC_CONFIG_URL.replace('{app-id}', fakeAppId);
const successObject = { measurementId: fakeMeasurementId, appId: fakeAppId };
let fetchStub: MockInstance;

function stubFetch(status: number, body: { [key: string]: any }): void {
  fetchStub = vi.spyOn(window, 'fetch');
  const mockResponse = new window.Response(JSON.stringify(body), {
    status
  });
  fetchStub.mockResolvedValue(mockResponse);
}

describe('Dynamic Config Fetch Functions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('fetchDynamicConfig() - no retry', () => {
    it('successfully request and receives dynamic config JSON data', async () => {
      stubFetch(200, successObject);
      const config: DynamicConfig = await fetchDynamicConfig(fakeAppParams);
      expect(fetchStub.mock.calls[0][0]).toBe(fakeUrl);
      expect(fetchStub.mock.calls[0][1].headers.get('x-goog-api-key')).toBe(
        fakeAppParams.apiKey
      );
      expect(config.appId).toBe(fakeAppId);
      expect(config.measurementId).toBe(fakeMeasurementId);
    });
    it('throws error on failed response', async () => {
      stubFetch(500, {
        error: {/* no message */}
      });
      const app = getFakeApp(fakeAppParams);
      await expect(
        fetchDynamicConfig(app.options as AppFields)
      ).rejects.toThrow(AnalyticsError.CONFIG_FETCH_FAILED);
    });
    it('throws error on failed response, includes server error message if provided', async () => {
      stubFetch(500, { error: { message: 'Oops' } });
      const app = getFakeApp(fakeAppParams);
      await expect(
        fetchDynamicConfig(app.options as AppFields)
      ).rejects.toThrow(
        new RegExp(`Oops.+${AnalyticsError.CONFIG_FETCH_FAILED}`)
      );
    });
  });
  describe('fetchDynamicConfigWithRetry()', () => {
    it('successfully request and receives dynamic config JSON data', async () => {
      stubFetch(200, successObject);
      const app = getFakeApp(fakeAppParams);
      const config: DynamicConfig | MinimalDynamicConfig =
        await fetchDynamicConfigWithRetry(app);
      expect(fetchStub.mock.calls[0][0]).toBe(fakeUrl);
      expect(fetchStub.mock.calls[0][1].headers.get('x-goog-api-key')).toBe(
        fakeAppParams.apiKey
      );
      expect(config.appId).toBe(fakeAppId);
      expect(config.measurementId).toBe(fakeMeasurementId);
    });
    it('throws error on non-retriable failed response', async () => {
      stubFetch(404, {
        error: {/* no message */}
      });
      const app = getFakeApp(fakeAppParams);
      await expect(fetchDynamicConfigWithRetry(app)).rejects.toThrow(
        AnalyticsError.CONFIG_FETCH_FAILED
      );
    });
    it('warns on non-retriable failed response if local measurementId available', async () => {
      stubFetch(404, {
        error: {/* no message */}
      });
      const consoleStub = vi.spyOn(console, 'warn');
      const app = getFakeApp({
        ...fakeAppParams,
        measurementId: fakeMeasurementId
      });
      await fetchDynamicConfigWithRetry(app);
      expect(consoleStub.mock.calls[0][1]).toContain(fakeMeasurementId);
      consoleStub.mockRestore();
    });
    it('retries on retriable error until success', async () => {
      // Configures Date.now() to advance clock from zero in 20ms increments, enabling
      // tests to assert a known throttle end time and allow setTimeout to work.
      vi.useFakeTimers({ shouldAdvanceTime: true, now: 0 });

      // Ensures backoff is always zero, which simplifies reasoning about timer.
      const powSpy = vi.spyOn(Math, 'pow').mockReturnValue(0);
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const fakeRetryData = {
        throttleMetadata: {},
        getThrottleMetadata: vi.fn(),
        setThrottleMetadata: vi.fn(),
        deleteThrottleMetadata: vi.fn(),
        intervalMillis: 5
      };

      // Returns responses with each of 4 retriable statuses, then a success response.
      const retriableStatuses = [429, 500, 503, 504];
      fetchStub = vi.spyOn(window, 'fetch');
      retriableStatuses.forEach(status => {
        const failResponse = new window.Response(JSON.stringify({}), {
          status
        });
        fetchStub.mockResolvedValueOnce(failResponse);
      });
      const successResponse = new window.Response(
        JSON.stringify(successObject),
        {
          status: 200
        }
      );
      fetchStub.mockResolvedValueOnce(successResponse);

      const app = getFakeApp(fakeAppParams);
      const config: DynamicConfig | MinimalDynamicConfig =
        await fetchDynamicConfigWithRetry(app, fakeRetryData);

      // Verify retryData.setThrottleMetadata() was called on each retry.
      for (let i = 0; i < retriableStatuses.length; i++) {
        retriableStatuses[i];
        expect(fakeRetryData.setThrottleMetadata.mock.calls[i][1]).toEqual({
          backoffCount: i + 1,
          throttleEndTimeMillis: (i + 1) * 20
        });
      }

      expect(fetchStub.mock.calls[0][0]).toBe(fakeUrl);
      expect(fetchStub.mock.calls[0][1].headers.get('x-goog-api-key')).toBe(
        fakeAppParams.apiKey
      );
      expect(config.appId).toBe(fakeAppId);
      expect(config.measurementId).toBe(fakeMeasurementId);

      powSpy.mockRestore();
      randomSpy.mockRestore();
      vi.useRealTimers();
    });
    it('retries on retriable error until aborted by timeout', async () => {
      const fakeRetryData = {
        throttleMetadata: {},
        getThrottleMetadata: vi.fn(),
        setThrottleMetadata: vi.fn(),
        deleteThrottleMetadata: vi.fn(),
        intervalMillis: 10
      };

      // Always returns retriable server error.
      stubFetch(500, {});

      const app = getFakeApp(fakeAppParams);
      // Set fetch timeout to 50 ms.
      const fetchPromise = fetchDynamicConfigWithRetry(app, fakeRetryData, 50);
      await expect(fetchPromise).rejects.toThrow(AnalyticsError.FETCH_THROTTLE);
      // Should be enough time for at least 2 retries, including fuzzing.
      expect(
        fakeRetryData.setThrottleMetadata.mock.calls.length
      ).toBeGreaterThan(1);
    });
    it('retries on 503 error until aborted by timeout', async () => {
      const fakeRetryData = {
        throttleMetadata: {},
        getThrottleMetadata: vi.fn(),
        setThrottleMetadata: vi.fn(),
        deleteThrottleMetadata: vi.fn(),
        intervalMillis: 10
      };

      // Always returns retriable server error.
      stubFetch(503, {});

      const app = getFakeApp(fakeAppParams);
      // Set fetch timeout to 50 ms.
      const fetchPromise = fetchDynamicConfigWithRetry(app, fakeRetryData, 50);
      await expect(fetchPromise).rejects.toThrow(AnalyticsError.FETCH_THROTTLE);
      const retryTime1 =
        fakeRetryData.setThrottleMetadata.mock.calls[0][1]
          .throttleEndTimeMillis;
      const retryTime2 =
        fakeRetryData.setThrottleMetadata.mock.calls[1][1]
          .throttleEndTimeMillis;
      expect(fakeRetryData.setThrottleMetadata).toHaveBeenCalled();
      // Interval between first and second retry should be greater than lowest fuzzable
      // value of LONG_RETRY_FACTOR.
      expect(retryTime2 - retryTime1).toBeGreaterThanOrEqual(
        Math.floor(LONG_RETRY_FACTOR / 2) * fakeRetryData.intervalMillis
      );
    });
    it(
      'retries on retriable error until aborted by timeout,' +
        ' then uses local measurementId if available',
      async () => {
        const fakeRetryData = {
          throttleMetadata: {},
          getThrottleMetadata: vi.fn(),
          setThrottleMetadata: vi.fn(),
          deleteThrottleMetadata: vi.fn(),
          intervalMillis: 10
        };

        // Always returns retriable server error.
        stubFetch(500, {});
        const consoleStub = vi.spyOn(console, 'warn');

        const app = getFakeApp({
          ...fakeAppParams,
          measurementId: fakeMeasurementId
        });
        // Set fetch timeout to 50 ms.
        await fetchDynamicConfigWithRetry(app, fakeRetryData, 50);
        expect(consoleStub).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining(fakeMeasurementId)
        );
        consoleStub.mockRestore();
      }
    );
  });
});
