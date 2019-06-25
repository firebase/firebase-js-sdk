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

import { stub, SinonStub, useFakeTimers, SinonFakeTimers } from 'sinon';
import { Trace } from '../resources/trace';
import { LogHandler, Logger, LogLevel } from '@firebase/logger';
import * as ccService from './cc_service';
import * as iidService from './iid_service';
import { expect } from 'chai';
import { Api, setupApi } from './api_service';
import { SettingsService } from './settings_service';
import { FirebaseApp } from '@firebase/app-types';
import * as initializationService from './initialization_service';
import { SDK_VERSION } from '../constants';
import * as attributeUtils from '../utils/attributes_utils';
import { createNetworkRequestEntry } from '../resources/network_request';
import '../../test/setup';

describe('Performance Monitoring > perf_logger', () => {
  const IID = 'idasdfsffe';
  const PAGE_URL = 'http://mock-page.com';
  const APP_ID = '1:123:web:2er';
  const VISIBILITY_STATE = 3;
  const EFFECTIVE_CONNECTION_TYPE = 2;
  const SERVICE_WORKER_STATUS = 3;
  const TIME_ORIGIN = 1556512199893.9033;
  const TRACE_NAME = 'testTrace';
  const START_TIME = 12345;
  const DURATION = 321;

  let addToQueueStub: SinonStub<
    Array<{ message: string; eventTime: number }>,
    void
  >;
  let getIidStub: SinonStub<[], string | undefined>;
  let clock: SinonFakeTimers;

  function mockCcHandler(serializer: (...args: any[]) => string): LogHandler {
    return (_loggerInstance: Logger, _level: LogLevel, ...args) => {
      const message = serializer(...args);
      addToQueueStub({
        message,
        eventTime: Date.now()
      });
    };
  }

  setupApi(self);

  beforeEach(() => {
    getIidStub = stub(iidService, 'getIid');
    addToQueueStub = stub();
    stub(ccService, 'ccHandler').callsFake(mockCcHandler);
    stub(Api.prototype, 'getUrl').returns(PAGE_URL);
    stub(Api.prototype, 'getTimeOrigin').returns(TIME_ORIGIN);
    stub(initializationService, 'isPerfInitialized').returns(true);
    stub(attributeUtils, 'getVisibilityState').returns(VISIBILITY_STATE);
    stub(attributeUtils, 'getEffectiveConnectionType').returns(
      EFFECTIVE_CONNECTION_TYPE
    );
    stub(attributeUtils, 'getServiceWorkerStatus').returns(
      SERVICE_WORKER_STATUS
    );
    SettingsService.prototype.firebaseAppInstance = ({
      options: { appId: APP_ID }
    } as unknown) as FirebaseApp;
    clock = useFakeTimers();
  });

  describe('logTrace', () => {
    it('creates, serializes and sends a trace to cc service', () => {
      const EXPECTED_TRACE_MESSAGE = `{"application_info":{"google_app_id":"${APP_ID}",\
"app_instance_id":"${IID}","web_app_info":{"sdk_version":"${SDK_VERSION}",\
"page_url":"${PAGE_URL}","service_worker_status":${SERVICE_WORKER_STATUS},\
"visibility_state":${VISIBILITY_STATE},"effective_connection_type":${EFFECTIVE_CONNECTION_TYPE}},\
"application_process_state":0},"trace_metric":{"name":"${TRACE_NAME}","is_auto":false,\
"client_start_time_us":${START_TIME * 1000},"duration_us":${DURATION * 1000}}}`;
      getIidStub.returns(IID);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logTraceAfterSampling = true;
      const trace = new Trace(TRACE_NAME);
      trace.record(START_TIME, DURATION);
      clock.tick(1);

      expect(addToQueueStub).to.be.called;
      expect(addToQueueStub.getCall(0).args[0].message).to.be.equal(
        EXPECTED_TRACE_MESSAGE
      );
    });

    it('does not log an event if cookies are disabled in the browser', () => {
      stub(Api.prototype, 'requiredApisAvailable').returns(false);
      const trace = new Trace(TRACE_NAME);
      trace.record(START_TIME, DURATION);
      clock.tick(1);

      expect(addToQueueStub).not.to.be.called;
    });
  });

  describe('logNetworkRequest', () => {
    it('creates, serializes and sends a network request to cc service', () => {
      const RESOURCE_PERFORMANCE_ENTRY: PerformanceResourceTiming = {
        connectEnd: 0,
        connectStart: 0,
        decodedBodySize: 0,
        domainLookupEnd: 0,
        domainLookupStart: 0,
        duration: 39.610000094398856,
        encodedBodySize: 0,
        entryType: 'resource',
        fetchStart: 5645.689999917522,
        initiatorType: 'fetch',
        name: 'https://test.com/abc',
        nextHopProtocol: 'http/2+quic/43',
        redirectEnd: 0,
        redirectStart: 0,
        requestStart: 0,
        responseEnd: 5685.300000011921,
        responseStart: 0,
        secureConnectionStart: 0,
        startTime: 5645.689999917522,
        transferSize: 0,
        workerStart: 0,
        toJSON: () => {}
      };
      const START_TIME = Math.floor(
        (TIME_ORIGIN + RESOURCE_PERFORMANCE_ENTRY.startTime) * 1000
      );
      const TIME_TO_RESPONSE_COMPLETED = Math.floor(
        (RESOURCE_PERFORMANCE_ENTRY.responseEnd -
          RESOURCE_PERFORMANCE_ENTRY.startTime) *
          1000
      );
      const EXPECTED_NETWORK_MESSAGE = `{"application_info":{"google_app_id":"${APP_ID}",\
"app_instance_id":"${IID}","web_app_info":{"sdk_version":"${SDK_VERSION}",\
"page_url":"${PAGE_URL}","service_worker_status":${SERVICE_WORKER_STATUS},\
"visibility_state":${VISIBILITY_STATE},"effective_connection_type":${EFFECTIVE_CONNECTION_TYPE}},\
"application_process_state":0},\
"network_request_metric":{"url":"${RESOURCE_PERFORMANCE_ENTRY.name}",\
"http_method":0,"http_response_code":200,\
"response_payload_bytes":${RESOURCE_PERFORMANCE_ENTRY.transferSize},\
"client_start_time_us":${START_TIME},\
"time_to_response_completed_us":${TIME_TO_RESPONSE_COMPLETED}}}`;
      getIidStub.returns(IID);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logNetworkAfterSampling = true;
      // Calls logNetworkRequest under the hood.
      createNetworkRequestEntry(RESOURCE_PERFORMANCE_ENTRY);
      clock.tick(1);

      expect(addToQueueStub).to.be.called;
      expect(addToQueueStub.getCall(0).args[0].message).to.be.equal(
        EXPECTED_NETWORK_MESSAGE
      );
    });
  });
});
