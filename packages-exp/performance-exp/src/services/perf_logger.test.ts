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

import { stub, SinonStub, useFakeTimers, SinonFakeTimers } from 'sinon';
import { Trace } from '../resources/trace';
import * as transportService from './transport_service';
import * as iidService from './iid_service';
import { expect } from 'chai';
import { Api, setupApi } from './api_service';
import { SettingsService } from './settings_service';
import { FirebaseApp } from '@firebase/app-types-exp';
import * as initializationService from './initialization_service';
import { SDK_VERSION } from '../constants';
import * as attributeUtils from '../utils/attributes_utils';
import { createNetworkRequestEntry } from '../resources/network_request';
import '../../test/setup';
import { mergeStrings } from '../utils/string_merger';
import { FirebaseInstallations } from '@firebase/installations-types';
import { PerformanceController } from '../controllers/perf';

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
  // Perf event header which is constant across tests in this file.
  const WEBAPP_INFO = `"application_info":{"google_app_id":"${APP_ID}",\
"app_instance_id":"${IID}","web_app_info":{"sdk_version":"${SDK_VERSION}",\
"page_url":"${PAGE_URL}","service_worker_status":${SERVICE_WORKER_STATUS},\
"visibility_state":${VISIBILITY_STATE},"effective_connection_type":${EFFECTIVE_CONNECTION_TYPE}},\
"application_process_state":0}`;

  let addToQueueStub: SinonStub<
    Array<{ message: string; eventTime: number }>,
    void
  >;
  let getIidStub: SinonStub<[], string | undefined>;
  let clock: SinonFakeTimers;

  function mockTransportHandler(
    serializer: (...args: any[]) => string
  ): (...args: any[]) => void {
    return (...args) => {
      const message = serializer(...args);
      addToQueueStub({
        message,
        eventTime: Date.now()
      });
    };
  }

  setupApi(self);
  const fakeFirebaseApp = ({
    options: { appId: APP_ID }
  } as unknown) as FirebaseApp;

  const fakeInstallations = ({} as unknown) as FirebaseInstallations;
  const performanceController = new PerformanceController(
    fakeFirebaseApp,
    fakeInstallations
  );

  beforeEach(() => {
    getIidStub = stub(iidService, 'getIid');
    addToQueueStub = stub();
    stub(transportService, 'transportHandler').callsFake(mockTransportHandler);
    stub(Api.prototype, 'getUrl').returns(PAGE_URL);
    stub(Api.prototype, 'getTimeOrigin').returns(TIME_ORIGIN);
    stub(attributeUtils, 'getEffectiveConnectionType').returns(
      EFFECTIVE_CONNECTION_TYPE
    );
    stub(attributeUtils, 'getServiceWorkerStatus').returns(
      SERVICE_WORKER_STATUS
    );
    clock = useFakeTimers();
  });

  describe('logTrace', () => {
    it('will not drop custom events sent before initialization finishes', async () => {
      getIidStub.returns(IID);
      stub(attributeUtils, 'getVisibilityState').returns(VISIBILITY_STATE);
      stub(initializationService, 'isPerfInitialized').returns(false);

      // Simulates logging being enabled after initialization completes.
      const initializationPromise = Promise.resolve().then(() => {
        SettingsService.getInstance().loggingEnabled = true;
        SettingsService.getInstance().logTraceAfterSampling = true;
      });
      stub(initializationService, 'getInitializationPromise').returns(
        initializationPromise
      );

      const trace = new Trace(performanceController, TRACE_NAME);
      trace.record(START_TIME, DURATION);
      await initializationPromise.then(() => {
        clock.tick(1);
      });

      expect(addToQueueStub).to.be.called;
    });

    it('creates, serializes and sends a trace to transport service', () => {
      const EXPECTED_TRACE_MESSAGE =
        `{` +
        WEBAPP_INFO +
        `,"trace_metric":{"name":"${TRACE_NAME}","is_auto":false,\
"client_start_time_us":${START_TIME * 1000},"duration_us":${DURATION * 1000},\
"counters":{"counter1":3},"custom_attributes":{"attr":"val"}}}`;
      getIidStub.returns(IID);
      stub(attributeUtils, 'getVisibilityState').returns(VISIBILITY_STATE);
      stub(initializationService, 'isPerfInitialized').returns(true);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logTraceAfterSampling = true;
      const trace = new Trace(performanceController, TRACE_NAME);
      trace.putAttribute('attr', 'val');
      trace.putMetric('counter1', 3);
      trace.record(START_TIME, DURATION);
      clock.tick(1);

      expect(addToQueueStub).to.be.called;
      expect(addToQueueStub.getCall(0).args[0].message).to.be.equal(
        EXPECTED_TRACE_MESSAGE
      );
    });

    it('does not log an event if cookies are disabled in the browser', () => {
      stub(Api.prototype, 'requiredApisAvailable').returns(false);
      stub(attributeUtils, 'getVisibilityState').returns(VISIBILITY_STATE);
      stub(initializationService, 'isPerfInitialized').returns(true);
      const trace = new Trace(performanceController, TRACE_NAME);
      trace.record(START_TIME, DURATION);
      clock.tick(1);

      expect(addToQueueStub).not.to.be.called;
    });

    it('ascertains that the max number of customMetric allowed is 32', () => {
      const EXPECTED_TRACE_MESSAGE =
        `{` +
        WEBAPP_INFO +
        `,"trace_metric":{"name":"${TRACE_NAME}","is_auto":false,\
"client_start_time_us":${START_TIME * 1000},"duration_us":${DURATION * 1000},\
"counters":{"counter1":1,"counter2":2,"counter3":3,"counter4":4,"counter5":5,"counter6":6,\
"counter7":7,"counter8":8,"counter9":9,"counter10":10,"counter11":11,"counter12":12,\
"counter13":13,"counter14":14,"counter15":15,"counter16":16,"counter17":17,"counter18":18,\
"counter19":19,"counter20":20,"counter21":21,"counter22":22,"counter23":23,"counter24":24,\
"counter25":25,"counter26":26,"counter27":27,"counter28":28,"counter29":29,"counter30":30,\
"counter31":31,"counter32":32}}}`;
      getIidStub.returns(IID);
      stub(attributeUtils, 'getVisibilityState').returns(VISIBILITY_STATE);
      stub(initializationService, 'isPerfInitialized').returns(true);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logTraceAfterSampling = true;
      const trace = new Trace(performanceController, TRACE_NAME);
      for (let i = 1; i <= 32; i++) {
        trace.putMetric('counter' + i, i);
      }
      trace.record(START_TIME, DURATION);
      clock.tick(1);

      expect(addToQueueStub).to.be.called;
      expect(addToQueueStub.getCall(0).args[0].message).to.be.equal(
        EXPECTED_TRACE_MESSAGE
      );
    });

    it('ascertains that the max number of custom attributes allowed is 5', () => {
      const EXPECTED_TRACE_MESSAGE =
        `{` +
        WEBAPP_INFO +
        `,"trace_metric":{"name":"${TRACE_NAME}","is_auto":false,\
"client_start_time_us":${START_TIME * 1000},"duration_us":${DURATION * 1000},\
"custom_attributes":{"attr1":"val1","attr2":"val2","attr3":"val3","attr4":"val4","attr5":"val5"}}}`;
      getIidStub.returns(IID);
      stub(attributeUtils, 'getVisibilityState').returns(VISIBILITY_STATE);
      stub(initializationService, 'isPerfInitialized').returns(true);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logTraceAfterSampling = true;
      const trace = new Trace(performanceController, TRACE_NAME);
      for (let i = 1; i <= 5; i++) {
        trace.putAttribute('attr' + i, 'val' + i);
      }
      trace.record(START_TIME, DURATION);
      clock.tick(1);

      expect(addToQueueStub).to.be.called;
      expect(addToQueueStub.getCall(0).args[0].message).to.be.equal(
        EXPECTED_TRACE_MESSAGE
      );
    });
  });

  describe('logPageLoadTrace', () => {
    it('creates, serializes and sends a page load trace to cc service', () => {
      const flooredStartTime = Math.floor(TIME_ORIGIN * 1000);
      const EXPECTED_TRACE_MESSAGE = `{"application_info":{"google_app_id":"${APP_ID}",\
"app_instance_id":"${IID}","web_app_info":{"sdk_version":"${SDK_VERSION}",\
"page_url":"${PAGE_URL}","service_worker_status":${SERVICE_WORKER_STATUS},\
"visibility_state":${
        attributeUtils.VisibilityState.VISIBLE
      },"effective_connection_type":${EFFECTIVE_CONNECTION_TYPE}},\
"application_process_state":0},"trace_metric":{"name":"_wt_${PAGE_URL}","is_auto":true,\
"client_start_time_us":${flooredStartTime},"duration_us":${DURATION * 1000},\
"counters":{"domInteractive":10000,"domContentLoadedEventEnd":20000,"loadEventEnd":10000,\
"_fp":40000,"_fcp":50000,"_fid":90000}}}`;
      stub(initializationService, 'isPerfInitialized').returns(true);
      getIidStub.returns(IID);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logTraceAfterSampling = true;

      stub(attributeUtils, 'getVisibilityState').returns(
        attributeUtils.VisibilityState.VISIBLE
      );

      const navigationTiming: PerformanceNavigationTiming = {
        domComplete: 100,
        domContentLoadedEventEnd: 20,
        domContentLoadedEventStart: 10,
        domInteractive: 10,
        loadEventEnd: 10,
        loadEventStart: 10,
        redirectCount: 10,
        type: 'navigate',
        unloadEventEnd: 10,
        unloadEventStart: 10,
        duration: DURATION
      } as PerformanceNavigationTiming;

      const navigationTimings: PerformanceNavigationTiming[] = [
        navigationTiming
      ];

      const firstPaint: PerformanceEntry = {
        name: 'first-paint',
        startTime: 40,
        duration: 100,
        entryType: 'url',
        toJSON() {}
      };

      const firstContentfulPaint: PerformanceEntry = {
        name: 'first-contentful-paint',
        startTime: 50,
        duration: 100,
        entryType: 'url',
        toJSON() {}
      };

      const paintTimings: PerformanceEntry[] = [
        firstPaint,
        firstContentfulPaint
      ];

      Trace.createOobTrace(
        performanceController,
        navigationTimings,
        paintTimings,
        90
      );
      clock.tick(1);

      expect(addToQueueStub).to.be.called;
      expect(addToQueueStub.getCall(0).args[0].message).to.be.equal(
        EXPECTED_TRACE_MESSAGE
      );
    });
  });

  describe('logNetworkRequest', () => {
    it('creates, serializes and sends a network request to transport service', () => {
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
      const EXPECTED_NETWORK_MESSAGE =
        `{` +
        WEBAPP_INFO +
        `,\
"network_request_metric":{"url":"${RESOURCE_PERFORMANCE_ENTRY.name}",\
"http_method":0,"http_response_code":200,\
"response_payload_bytes":${RESOURCE_PERFORMANCE_ENTRY.transferSize},\
"client_start_time_us":${START_TIME},\
"time_to_response_completed_us":${TIME_TO_RESPONSE_COMPLETED}}}`;
      stub(initializationService, 'isPerfInitialized').returns(true);
      getIidStub.returns(IID);
      stub(attributeUtils, 'getVisibilityState').returns(VISIBILITY_STATE);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logNetworkAfterSampling = true;
      // Calls logNetworkRequest under the hood.
      createNetworkRequestEntry(
        performanceController,
        RESOURCE_PERFORMANCE_ENTRY
      );
      clock.tick(1);

      expect(addToQueueStub).to.be.called;
      expect(addToQueueStub.getCall(0).args[0].message).to.be.equal(
        EXPECTED_NETWORK_MESSAGE
      );
    });

    // Performance SDK doesn't instrument requests sent from SDK itself, therefore blacklist
    // requests sent to cc endpoint.
    it('skips performance collection if domain is cc', () => {
      const CC_NETWORK_PERFORMANCE_ENTRY: PerformanceResourceTiming = {
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
        name: 'https://firebaselogging.googleapis.com/v0cc/log?message=a',
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
      stub(initializationService, 'isPerfInitialized').returns(true);
      getIidStub.returns(IID);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logNetworkAfterSampling = true;
      // Calls logNetworkRequest under the hood.
      createNetworkRequestEntry(
        performanceController,
        CC_NETWORK_PERFORMANCE_ENTRY
      );
      clock.tick(1);

      expect(addToQueueStub).not.called;
    });

    // Performance SDK doesn't instrument requests sent from SDK itself, therefore blacklist
    // requests sent to fl endpoint.
    it('skips performance collection if domain is fl', () => {
      const FL_NETWORK_PERFORMANCE_ENTRY: PerformanceResourceTiming = {
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
        name: mergeStrings(
          'hts/frbslgigp.ogepscmv/ieo/eaylg',
          'tp:/ieaeogn-agolai.o/1frlglgc/o'
        ),
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
      stub(initializationService, 'isPerfInitialized').returns(true);
      getIidStub.returns(IID);
      SettingsService.getInstance().loggingEnabled = true;
      SettingsService.getInstance().logNetworkAfterSampling = true;
      // Calls logNetworkRequest under the hood.
      createNetworkRequestEntry(
        performanceController,
        FL_NETWORK_PERFORMANCE_ENTRY
      );
      clock.tick(1);

      expect(addToQueueStub).not.called;
    });
  });
});
