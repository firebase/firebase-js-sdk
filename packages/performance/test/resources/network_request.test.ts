/**
 * @license
 * Copyright 2019 Google Inc.
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

import * as sinon from 'sinon';
import {
  NetworkRequest,
  createNetworkRequestEntry
} from '../../src/resources/network_request';
import { expect } from 'chai';
import { Api } from '../../src/services/api_service';
import * as perfLogger from '../../src/services/perf_logger';

describe('Firebase Performance > network_request', () => {
  const sandbox = sinon.createSandbox();
  let mockApi;

  beforeEach(() => {
    mockApi = {
      mark: sandbox.spy(),
      measure: sandbox.spy(),
      getEntriesByName: sandbox.spy(),
      getEntriesByType: sandbox.spy(),
      getTimeOrigin: sandbox.stub().returns(1528521843799.5032)
    };
    sandbox.stub(Api, 'getInstance').returns(mockApi);
    sandbox.stub(perfLogger, 'logNetworkRequest');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#createNetworkRequestEntry', () => {
    it('logs network request when all required fields present', () => {
      const PERFORMANCE_ENTRY: PerformanceResourceTiming = {
        name: 'http://some.test.website.com',
        transferSize: 500,
        startTime: 1645352.632345,
        responseStart: 1645360.244323,
        responseEnd: 1645360.832443
      };

      const EXPECTED_NETWORK_REQUEST = {
        url: 'http://some.test.website.com',
        responsePayloadBytes: 500,
        startTimeUs: 1528523489152135,
        timeToResponseInitiatedUs: 7611,
        timeToResponseCompletedUs: 8200
      };

      createNetworkRequestEntry(PERFORMANCE_ENTRY);

      expect(
        (perfLogger.logNetworkRequest as any).calledWith(
          EXPECTED_NETWORK_REQUEST
        )
      ).to.be.true;
    });

    it('logs network request without timeToResponseInitiatedUs when responseStart is absent', () => {
      const PERFORMANCE_ENTRY: PerformanceResourceTiming = {
        name: 'http://some.test.website.com',
        transferSize: 500,
        startTime: 1645352.632345,
        responseEnd: 1645360.832443
      };

      const EXPECTED_NETWORK_REQUEST: NetworkRequest = {
        url: 'http://some.test.website.com',
        responsePayloadBytes: 500,
        startTimeUs: 1528523489152135,
        timeToResponseInitiatedUs: undefined,
        timeToResponseCompletedUs: 8200
      };

      createNetworkRequestEntry(PERFORMANCE_ENTRY);

      expect(
        (perfLogger.logNetworkRequest as any).calledWith(
          EXPECTED_NETWORK_REQUEST
        )
      ).to.be.true;
    });
  });
});
