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

import {
  spy,
  stub,
  SinonSpy,
  SinonStub,
  useFakeTimers,
  SinonFakeTimers
} from 'sinon';
import { expect } from 'chai';
import { Api, setupApi, EntryType } from './api_service';
import * as iidService from './iid_service';
import { setupOobResources } from './oob_resources_service';
import { Trace } from '../resources/trace';
import '../../test/setup';
import { PerformanceController } from '../controllers/perf';
import { FirebaseApp } from '@firebase/app-types-exp';
import { FirebaseInstallations } from '@firebase/installations-types';

describe('Firebase Performance > oob_resources_service', () => {
  const MOCK_ID = 'idasdfsffe';

  const NAVIGATION_PERFORMANCE_ENTRY: PerformanceNavigationTiming = {
    connectEnd: 2.9499998781830072,
    connectStart: 2.9499998781830072,
    decodedBodySize: 1519,
    domComplete: 186.48499995470047,
    domContentLoadedEventEnd: 64.0499999281019,
    domContentLoadedEventStart: 62.440000008791685,
    domInteractive: 62.42000008933246,
    domainLookupEnd: 2.9499998781830072,
    domainLookupStart: 2.9499998781830072,
    duration: 187.7349999267608,
    encodedBodySize: 732,
    entryType: 'navigation',
    fetchStart: 2.9499998781830072,
    initiatorType: 'navigation',
    loadEventEnd: 187.7349999267608,
    loadEventStart: 187.72999988868833,
    name: 'https://test.firebase.com/',
    nextHopProtocol: 'h2',
    redirectCount: 0,
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 5.034999921917915,
    responseEnd: 9.305000072345138,
    responseStart: 8.940000087022781,
    secureConnectionStart: 0,
    startTime: 0,
    transferSize: 1259,
    type: 'reload',
    unloadEventEnd: 14.870000071823597,
    unloadEventStart: 14.870000071823597,
    workerStart: 0,
    toJSON: () => {}
  };

  const PAINT_PERFORMANCE_ENTRY: PerformanceEntry = {
    duration: 0,
    entryType: 'paint',
    name: 'first-contentful-paint',
    startTime: 122.18499998562038,
    toJSON: () => {}
  };

  let getIidStub: SinonStub<[], string | undefined>;
  let apiGetInstanceSpy: SinonSpy<[], Api>;
  let getEntriesByTypeStub: SinonStub<[EntryType], PerformanceEntry[]>;
  let setupObserverStub: SinonStub<
    [EntryType, (entry: PerformanceEntry) => void],
    void
  >;
  let createOobTraceStub: SinonStub<
    [
      PerformanceController,
      PerformanceNavigationTiming[],
      PerformanceEntry[],
      (number | undefined)?
    ],
    void
  >;
  let clock: SinonFakeTimers;

  setupApi(self);

  const fakeFirebaseConfig = {
    apiKey: 'api-key',
    authDomain: 'project-id.firebaseapp.com',
    databaseURL: 'https://project-id.firebaseio.com',
    projectId: 'project-id',
    storageBucket: 'project-id.appspot.com',
    messagingSenderId: 'sender-id',
    appId: '1:111:web:a1234'
  };

  const fakeFirebaseApp = ({
    options: fakeFirebaseConfig
  } as unknown) as FirebaseApp;

  const fakeInstallations = ({} as unknown) as FirebaseInstallations;
  const performanceController = new PerformanceController(
    fakeFirebaseApp,
    fakeInstallations
  );

  beforeEach(() => {
    getIidStub = stub(iidService, 'getIid');
    apiGetInstanceSpy = spy(Api, 'getInstance');
    clock = useFakeTimers();
    getEntriesByTypeStub = stub(Api.prototype, 'getEntriesByType').callsFake(
      entry => {
        if (entry === 'navigation') {
          return [NAVIGATION_PERFORMANCE_ENTRY];
        }
        return [PAINT_PERFORMANCE_ENTRY];
      }
    );
    setupObserverStub = stub(Api.prototype, 'setupObserver');
    createOobTraceStub = stub(Trace, 'createOobTrace');
  });

  afterEach(() => {
    clock.restore();
  });

  describe('setupOobResources', () => {
    it('does not start if there is no iid', () => {
      getIidStub.returns(undefined);
      setupOobResources(performanceController);

      expect(apiGetInstanceSpy).not.to.be.called;
    });

    it('sets up network request collection', () => {
      getIidStub.returns(MOCK_ID);
      setupOobResources(performanceController);
      clock.tick(1);

      expect(apiGetInstanceSpy).to.be.called;
      expect(getEntriesByTypeStub).to.be.calledWith('resource');
      expect(setupObserverStub).to.be.calledWith('resource');
    });

    it('sets up page load trace collection', () => {
      getIidStub.returns(MOCK_ID);
      setupOobResources(performanceController);
      clock.tick(1);

      expect(apiGetInstanceSpy).to.be.called;
      expect(getEntriesByTypeStub).to.be.calledWith('navigation');
      expect(getEntriesByTypeStub).to.be.calledWith('paint');
      expect(createOobTraceStub).to.be.calledWithExactly(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY]
      );
    });

    it('waits for first input delay if polyfill is available', () => {
      getIidStub.returns(MOCK_ID);
      const api = Api.getInstance();
      //@ts-ignore Assignment to read-only property.
      api.onFirstInputDelay = stub();
      setupOobResources(performanceController);
      clock.tick(1);

      expect(api.onFirstInputDelay).to.be.called;
      expect(createOobTraceStub).not.to.be.called;
      clock.tick(5000);
      expect(createOobTraceStub).to.be.calledWithExactly(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY]
      );
    });

    it('logs first input delay if polyfill is available and callback is called', () => {
      getIidStub.returns(MOCK_ID);
      const api = Api.getInstance();
      const FIRST_INPUT_DELAY = 123;
      // Underscore is to avoid compiler comlaining about variable being declared but not used.
      type FirstInputDelayCallback = (firstInputDelay: number) => void;
      let firstInputDelayCallback: FirstInputDelayCallback = (): void => {};
      //@ts-ignore Assignment to read-only property.
      api.onFirstInputDelay = (cb: FirstInputDelayCallback) => {
        firstInputDelayCallback = cb;
      };
      setupOobResources(performanceController);
      clock.tick(1);
      firstInputDelayCallback(FIRST_INPUT_DELAY);

      expect(createOobTraceStub).to.be.calledWithExactly(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        FIRST_INPUT_DELAY
      );
    });

    it('sets up user timing traces', () => {
      getIidStub.returns(MOCK_ID);
      setupOobResources(performanceController);
      clock.tick(1);

      expect(apiGetInstanceSpy).to.be.called;
      expect(getEntriesByTypeStub).to.be.calledWith('measure');
      expect(setupObserverStub).to.be.calledWith('measure');
    });
  });
});
