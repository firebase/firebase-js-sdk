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

import { expect } from 'chai';
import { SinonStub, stub, useFakeTimers } from 'sinon';
import '../testing/setup';
import {
  fetchDynamicConfig,
  fetchDynamicConfigWithRetry,
  AppFields,
  LONG_RETRY_FACTOR
} from './get-config';
import { DYNAMIC_CONFIG_URL } from './constants';
import { getFakeApp } from '../testing/get-fake-firebase-services';
import { DynamicConfig, MinimalDynamicConfig } from '@firebase/analytics-types';
import { AnalyticsError } from './errors';

const fakeMeasurementId = 'abcd-efgh-ijkl';
const fakeAppId = 'abcdefgh12345:23405';
const fakeAppParams = { appId: fakeAppId, apiKey: 'AAbbCCdd12345' };
const fakeUrl = DYNAMIC_CONFIG_URL.replace('{app-id}', fakeAppId);
const successObject = { measurementId: fakeMeasurementId, appId: fakeAppId };
let fetchStub: SinonStub;

function stubFetch(status: number, body: { [key: string]: any }): void {
  fetchStub = stub(window, 'fetch');
  const mockResponse = new window.Response(JSON.stringify(body), {
    status
  });
  fetchStub.returns(Promise.resolve(mockResponse));
}

describe('Dynamic Config Fetch Functions', () => {
  describe('fetchDynamicConfig() - no retry', () => {
    it('successfully request and receives dynamic config JSON data', async () => {
      stubFetch(200, successObject);
      const config: DynamicConfig = await fetchDynamicConfig(fakeAppParams);
      expect(fetchStub.args[0][0]).to.equal(fakeUrl);
      expect(fetchStub.args[0][1].headers.get('x-goog-api-key')).to.equal(
        fakeAppParams.apiKey
      );
      expect(config.appId).to.equal(fakeAppId);
      expect(config.measurementId).to.equal(fakeMeasurementId);
    });
    it('throws error on failed response', async () => {
      stubFetch(500, {
        error: {
          /* no message */
        }
      });
      const app = getFakeApp(fakeAppParams);
      await expect(
        fetchDynamicConfig(app.options as AppFields)
      ).to.be.rejectedWith(AnalyticsError.CONFIG_FETCH_FAILED);
    });
    it('throws error on failed response, includes server error message if provided', async () => {
      stubFetch(500, { error: { message: 'Oops' } });
      const app = getFakeApp(fakeAppParams);
      await expect(
        fetchDynamicConfig(app.options as AppFields)
      ).to.be.rejectedWith(
        new RegExp(`Oops.+${AnalyticsError.CONFIG_FETCH_FAILED}`)
      );
    });
  });
  describe('fetchDynamicConfigWithRetry()', () => {
    it('successfully request and receives dynamic config JSON data', async () => {
      stubFetch(200, successObject);
      const app = getFakeApp(fakeAppParams);
      const config:
        | DynamicConfig
        | MinimalDynamicConfig = await fetchDynamicConfigWithRetry(app);
      expect(fetchStub.args[0][0]).to.equal(fakeUrl);
      expect(fetchStub.args[0][1].headers.get('x-goog-api-key')).to.equal(
        fakeAppParams.apiKey
      );
      expect(config.appId).to.equal(fakeAppId);
      expect(config.measurementId).to.equal(fakeMeasurementId);
    });
    it('throws error on non-retriable failed response', async () => {
      stubFetch(404, {
        error: {
          /* no message */
        }
      });
      const app = getFakeApp(fakeAppParams);
      await expect(fetchDynamicConfigWithRetry(app)).to.be.rejectedWith(
        AnalyticsError.CONFIG_FETCH_FAILED
      );
    });
    it('warns on non-retriable failed response if local measurementId available', async () => {
      stubFetch(404, {
        error: {
          /* no message */
        }
      });
      const consoleStub = stub(console, 'warn');
      const app = getFakeApp({
        ...fakeAppParams,
        measurementId: fakeMeasurementId
      });
      await fetchDynamicConfigWithRetry(app);
      expect(consoleStub.args[0][1]).to.include(fakeMeasurementId);
      consoleStub.restore();
    });
    it('retries on retriable error until success', async () => {
      // Configures Date.now() to advance clock from zero in 20ms increments, enabling
      // tests to assert a known throttle end time and allow setTimeout to work.
      const clock = useFakeTimers({ shouldAdvanceTime: true });

      // Ensures backoff is always zero, which simplifies reasoning about timer.
      const powSpy = stub(Math, 'pow').returns(0);
      const randomSpy = stub(Math, 'random').returns(0.5);
      const fakeRetryData = {
        throttleMetadata: {},
        getThrottleMetadata: stub(),
        setThrottleMetadata: stub(),
        deleteThrottleMetadata: stub(),
        intervalMillis: 5
      };

      // Returns responses with each of 4 retriable statuses, then a success response.
      const retriableStatuses = [429, 500, 503, 504];
      fetchStub = stub(window, 'fetch');
      retriableStatuses.forEach((status, index) => {
        const failResponse = new window.Response(JSON.stringify({}), {
          status
        });
        fetchStub.onCall(index).resolves(failResponse);
      });
      const successResponse = new window.Response(
        JSON.stringify(successObject),
        {
          status: 200
        }
      );
      fetchStub.onCall(retriableStatuses.length).resolves(successResponse);

      const app = getFakeApp(fakeAppParams);
      const config:
        | DynamicConfig
        | MinimalDynamicConfig = await fetchDynamicConfigWithRetry(
        app,
        fakeRetryData
      );

      // Verify retryData.setThrottleMetadata() was called on each retry.
      for (let i = 0; i < retriableStatuses.length; i++) {
        retriableStatuses[i];
        expect(fakeRetryData.setThrottleMetadata.args[i][1]).to.deep.equal({
          backoffCount: i + 1,
          throttleEndTimeMillis: (i + 1) * 20
        });
      }

      expect(fetchStub.args[0][0]).to.equal(fakeUrl);
      expect(fetchStub.args[0][1].headers.get('x-goog-api-key')).to.equal(
        fakeAppParams.apiKey
      );
      expect(config.appId).to.equal(fakeAppId);
      expect(config.measurementId).to.equal(fakeMeasurementId);

      powSpy.restore();
      randomSpy.restore();
      clock.restore();
    });
    it('retries on retriable error until aborted by timeout', async () => {
      const fakeRetryData = {
        throttleMetadata: {},
        getThrottleMetadata: stub(),
        setThrottleMetadata: stub(),
        deleteThrottleMetadata: stub(),
        intervalMillis: 10
      };

      // Always returns retriable server error.
      stubFetch(500, {});

      const app = getFakeApp(fakeAppParams);
      // Set fetch timeout to 50 ms.
      const fetchPromise = fetchDynamicConfigWithRetry(app, fakeRetryData, 50);
      await expect(fetchPromise).to.be.rejectedWith(
        AnalyticsError.FETCH_THROTTLE
      );
      // Should be enough time for at least 2 retries, including fuzzing.
      expect(fakeRetryData.setThrottleMetadata.callCount).to.be.greaterThan(1);
    });
    it('retries on 503 error until aborted by timeout', async () => {
      const fakeRetryData = {
        throttleMetadata: {},
        getThrottleMetadata: stub(),
        setThrottleMetadata: stub(),
        deleteThrottleMetadata: stub(),
        intervalMillis: 10
      };

      // Always returns retriable server error.
      stubFetch(503, {});

      const app = getFakeApp(fakeAppParams);
      // Set fetch timeout to 50 ms.
      const fetchPromise = fetchDynamicConfigWithRetry(app, fakeRetryData, 50);
      await expect(fetchPromise).to.be.rejectedWith(
        AnalyticsError.FETCH_THROTTLE
      );
      const retryTime1 =
        fakeRetryData.setThrottleMetadata.args[0][1].throttleEndTimeMillis;
      const retryTime2 =
        fakeRetryData.setThrottleMetadata.args[1][1].throttleEndTimeMillis;
      expect(fakeRetryData.setThrottleMetadata).to.be.called;
      // Interval between first and second retry should be greater than lowest fuzzable
      // value of LONG_RETRY_FACTOR.
      expect(retryTime2 - retryTime1).to.be.at.least(
        Math.floor(LONG_RETRY_FACTOR / 2) * fakeRetryData.intervalMillis
      );
    });
    it(
      'retries on retriable error until aborted by timeout,' +
        ' then uses local measurementId if available',
      async () => {
        const fakeRetryData = {
          throttleMetadata: {},
          getThrottleMetadata: stub(),
          setThrottleMetadata: stub(),
          deleteThrottleMetadata: stub(),
          intervalMillis: 10
        };

        // Always returns retriable server error.
        stubFetch(500, {});
        const consoleStub = stub(console, 'warn');

        const app = getFakeApp({
          ...fakeAppParams,
          measurementId: fakeMeasurementId
        });
        // Set fetch timeout to 50 ms.
        await fetchDynamicConfigWithRetry(app, fakeRetryData, 50);
        expect(consoleStub.args[0][1]).to.include(fakeMeasurementId);
        consoleStub.restore();
      }
    );
  });
});
