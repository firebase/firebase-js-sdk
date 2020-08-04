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

import { stub, restore } from 'sinon';
import { createNetworkRequestEntry } from '../../src/resources/network_request';
import { expect } from 'chai';
import { Api, setupApi } from '../services/api_service';
import * as perfLogger from '../services/perf_logger';

import '../../test/setup';
import { FirebaseApp } from '@firebase/app-types-exp';
import { PerformanceController } from '../controllers/perf';
import { FirebaseInstallations } from '@firebase/installations-types';

describe('Firebase Performance > network_request', () => {
  setupApi(window);

  const fakeFirebaseApp = ({
    options: {}
  } as unknown) as FirebaseApp;

  const fakeInstallations = ({} as unknown) as FirebaseInstallations;
  const performance = new PerformanceController(
    fakeFirebaseApp,
    fakeInstallations
  );

  beforeEach(() => {
    stub(Api.prototype, 'getTimeOrigin').returns(1528521843799.5032);
    stub(perfLogger, 'logNetworkRequest');
  });

  afterEach(() => {
    restore();
  });

  describe('#createNetworkRequestEntry', () => {
    it('logs network request when all required fields present', () => {
      const PERFORMANCE_ENTRY = ({
        name: 'http://some.test.website.com',
        transferSize: 500,
        startTime: 1645352.632345,
        responseStart: 1645360.244323,
        responseEnd: 1645360.832443
      } as unknown) as PerformanceResourceTiming;

      const EXPECTED_NETWORK_REQUEST = {
        performance,
        url: 'http://some.test.website.com',
        responsePayloadBytes: 500,
        startTimeUs: 1528523489152135,
        timeToResponseInitiatedUs: 7611,
        timeToResponseCompletedUs: 8200
      };

      createNetworkRequestEntry(performance, PERFORMANCE_ENTRY);

      expect(
        (perfLogger.logNetworkRequest as any).calledWith(
          EXPECTED_NETWORK_REQUEST
        )
      ).to.be.true;
    });

    it('doesnt log network request when responseStart is absent', () => {
      const PERFORMANCE_ENTRY = ({
        name: 'http://some.test.website.com',
        transferSize: 500,
        startTime: 1645352.632345,
        responseEnd: 1645360.832443
      } as unknown) as PerformanceResourceTiming;

      createNetworkRequestEntry(performance, PERFORMANCE_ENTRY);

      expect(perfLogger.logNetworkRequest).to.not.have.been.called;
    });
  });
});
