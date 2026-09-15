/**
 * @license
 * Copyright 2026 Google LLC
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

import { Api, setupApi, EntryType } from './api_service';
import * as iidService from './iid_service';
import { setupOobResources, resetForUnitTests } from './oob_resources_service';
import { Trace } from '../resources/trace';
import '../../test/setup';
import { PerformanceController } from '../controllers/perf';
import { FirebaseApp } from '@firebase/app';
import { FirebaseInstallations } from '@firebase/installations-types';
import { WebVitalMetrics } from '../resources/web_vitals';
import {
  CLSAttribution,
  CLSMetricWithAttribution,
  INPAttribution,
  INPMetricWithAttribution,
  LCPAttribution,
  LCPMetricWithAttribution
} from 'web-vitals/attribution';
import { vi, MockInstance } from 'vitest';

vi.mock('./iid_service', { spy: true });

// eslint-disable-next-line no-restricted-properties
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
    serverTiming: [],
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

  let getIidStub: MockInstance;
  let apiGetInstanceSpy: MockInstance;
  let eventListenerSpy: MockInstance;
  let getEntriesByTypeStub: MockInstance;
  let setupObserverStub: MockInstance;
  let createOobTraceSpy: MockInstance;
  let lcpSpy: MockInstance;
  let inpSpy: MockInstance;
  let clsSpy: MockInstance;

  const mockWindow = { ...self };
  setupApi(mockWindow);

  const fakeFirebaseConfig = {
    apiKey: 'api-key',
    authDomain: 'project-id.firebaseapp.com',
    databaseURL: 'https://project-id.firebaseio.com',
    projectId: 'project-id',
    storageBucket: 'project-id.appspot.com',
    messagingSenderId: 'sender-id',
    appId: '1:111:web:a1234'
  };

  const fakeFirebaseApp = {
    options: fakeFirebaseConfig
  } as unknown as FirebaseApp;

  const fakeInstallations = {} as unknown as FirebaseInstallations;
  const performanceController = new PerformanceController(
    fakeFirebaseApp,
    fakeInstallations
  );

  function callEventListener(name: string): void {
    for (let i = eventListenerSpy.mock.calls.length; i > 0; i--) {
      const [eventName, eventFn] = eventListenerSpy.mock.calls[i - 1];
      if (eventName === name) {
        if (typeof eventFn === 'function') {
          eventFn(new CustomEvent(name));
        }
      }
    }
  }

  beforeEach(() => {
    resetForUnitTests();
    getIidStub = vi.mocked(iidService.getIid);
    eventListenerSpy = vi.spyOn(mockWindow.document, 'addEventListener');

    vi.useFakeTimers();
    getEntriesByTypeStub = vi
      .spyOn(Api.prototype, 'getEntriesByType')
      .mockImplementation(entry => {
        if (entry === 'navigation') {
          return [NAVIGATION_PERFORMANCE_ENTRY];
        }
        return [PAINT_PERFORMANCE_ENTRY];
      });
    setupObserverStub = vi
      .spyOn(Api.prototype, 'setupObserver')
      .mockImplementation(() => {});
    createOobTraceSpy = vi.spyOn(Trace, 'createOobTrace');
    const api = Api.getInstance();
    lcpSpy = vi.spyOn(api, 'onLCP');
    inpSpy = vi.spyOn(api, 'onINP');
    clsSpy = vi.spyOn(api, 'onCLS');
    apiGetInstanceSpy = vi.spyOn(Api, 'getInstance');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    const api = Api.getInstance();
    //@ts-ignore Assignment to read-only property.
    api.onFirstInputDelay = undefined;
  });

  describe('setupOobResources', () => {
    it('does not start if there is no iid', () => {
      getIidStub.mockReturnValue(undefined);
      setupOobResources(performanceController);

      expect(apiGetInstanceSpy).not.toHaveBeenCalled();
    });

    it('sets up network request collection', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      expect(apiGetInstanceSpy).toHaveBeenCalled();
      expect(getEntriesByTypeStub).toHaveBeenCalledWith('resource');
      expect(setupObserverStub).toHaveBeenCalledWith(
        'resource',
        expect.any(Function)
      );
    });

    it('does not create page load trace before hidden', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      expect(apiGetInstanceSpy).toHaveBeenCalled();
      expect(createOobTraceSpy).not.toHaveBeenCalled();
    });

    it('creates page load trace after hidden', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      vi.spyOn(mockWindow.document, 'visibilityState', 'get').mockReturnValue(
        'hidden'
      );
      callEventListener('visibilitychange');
      vi.advanceTimersByTime(1);

      expect(getEntriesByTypeStub).toHaveBeenCalledWith('navigation');
      expect(getEntriesByTypeStub).toHaveBeenCalledWith('paint');
      expect(createOobTraceSpy).toHaveBeenCalledWith(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        {},
        undefined
      );
    });

    it('creates page load trace after pagehide', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      callEventListener('pagehide');
      vi.advanceTimersByTime(1);

      expect(getEntriesByTypeStub).toHaveBeenCalledWith('navigation');
      expect(getEntriesByTypeStub).toHaveBeenCalledWith('paint');
      expect(createOobTraceSpy).toHaveBeenCalledWith(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        {},
        undefined
      );
    });

    it('logs first input delay if polyfill is available and callback is called', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      const api = Api.getInstance();
      const FIRST_INPUT_DELAY = 123;
      // Underscore is to avoid compiler complaining about variable being declared but not used.
      type FirstInputDelayCallback = (firstInputDelay: number) => void;
      let firstInputDelayCallback: FirstInputDelayCallback = (): void => {};
      //@ts-ignore Assignment to read-only property.
      api.onFirstInputDelay = (cb: FirstInputDelayCallback) => {
        firstInputDelayCallback = cb;
      };
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);
      firstInputDelayCallback(FIRST_INPUT_DELAY);

      // Force the page load event to be sent
      vi.spyOn(mockWindow.document, 'visibilityState', 'get').mockReturnValue(
        'hidden'
      );
      callEventListener('visibilitychange');
      vi.advanceTimersByTime(1);

      expect(createOobTraceSpy).toHaveBeenCalledWith(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        {},
        FIRST_INPUT_DELAY
      );
    });

    it('sets up user timing traces', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      expect(apiGetInstanceSpy).toHaveBeenCalled();
      expect(getEntriesByTypeStub).toHaveBeenCalledWith('measure');
      expect(setupObserverStub).toHaveBeenCalledWith(
        'measure',
        expect.any(Function)
      );
    });

    it('sends LCP metrics with attribution', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      lcpSpy.mock.lastCall![0]({
        value: 12.34,
        attribution: {
          element: 'some-element'
        } as LCPAttribution
      } as LCPMetricWithAttribution);

      // Force the page load event to be sent
      vi.spyOn(mockWindow.document, 'visibilityState', 'get').mockReturnValue(
        'hidden'
      );
      callEventListener('visibilitychange');
      vi.advanceTimersByTime(1);

      expect(createOobTraceSpy).toHaveBeenCalledWith(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        {
          lcp: { value: 12.34, elementAttribution: 'some-element' }
        },
        undefined
      );
    });

    it('sends INP metrics with attribution', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      inpSpy.mock.lastCall![0]({
        value: 0.198,
        attribution: {
          interactionTarget: 'another-element'
        } as INPAttribution
      } as INPMetricWithAttribution);

      // Force the page load event to be sent
      vi.spyOn(mockWindow.document, 'visibilityState', 'get').mockReturnValue(
        'hidden'
      );
      callEventListener('visibilitychange');
      vi.advanceTimersByTime(1);

      expect(createOobTraceSpy).toHaveBeenCalledWith(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        {
          inp: { value: 0.198, elementAttribution: 'another-element' }
        },
        undefined
      );
    });

    it('sends CLS metrics with attribution', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      clsSpy.mock.lastCall![0]({
        value: 0.3,
        // eslint-disable-next-line
        attribution: {
          largestShiftTarget: 'large-shift-element'
        } as CLSAttribution
      } as CLSMetricWithAttribution);

      // Force the page load event to be sent
      vi.spyOn(mockWindow.document, 'visibilityState', 'get').mockReturnValue(
        'hidden'
      );
      callEventListener('visibilitychange');
      vi.advanceTimersByTime(1);

      expect(createOobTraceSpy).toHaveBeenCalledWith(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        {
          cls: { value: 0.3, elementAttribution: 'large-shift-element' }
        },
        undefined
      );
    });

    it('sends all core web vitals metrics', () => {
      getIidStub.mockReturnValue(MOCK_ID);
      setupOobResources(performanceController);
      vi.advanceTimersByTime(1);

      lcpSpy.mock.lastCall![0]({
        value: 5.91,
        attribution: { element: 'an-element' } as LCPAttribution
      } as LCPMetricWithAttribution);
      inpSpy.mock.lastCall![0]({
        value: 0.1
      } as INPMetricWithAttribution);
      clsSpy.mock.lastCall![0]({
        value: 0.3,
        attribution: {
          largestShiftTarget: 'large-shift-element'
        } as CLSAttribution
      } as CLSMetricWithAttribution);

      // Force the page load event to be sent
      vi.spyOn(mockWindow.document, 'visibilityState', 'get').mockReturnValue(
        'hidden'
      );
      callEventListener('visibilitychange');
      vi.advanceTimersByTime(1);

      expect(createOobTraceSpy).toHaveBeenCalledWith(
        performanceController,
        [NAVIGATION_PERFORMANCE_ENTRY],
        [PAINT_PERFORMANCE_ENTRY],
        {
          lcp: { value: 5.91, elementAttribution: 'an-element' },
          inp: { value: 0.1, elementAttribution: undefined },
          cls: { value: 0.3, elementAttribution: 'large-shift-element' }
        },
        undefined
      );
    });
  });
});
