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
  CLSMetricWithAttribution,
  INPMetricWithAttribution,
  LCPMetricWithAttribution
} from 'web-vitals/attribution';

import { TRACE_MEASURE_PREFIX } from '../constants';
import { PerformanceController } from '../controllers/perf';
import { createNetworkRequestEntry } from '../resources/network_request';
import { Trace } from '../resources/trace';
import { WebVitalMetrics } from '../resources/web_vitals';

import { Api } from './api_service';
import { getIid } from './iid_service';

const FID_WAIT_TIME_MS = 5000;

let webVitalMetrics: WebVitalMetrics = {};
let sentPageLoadTrace: boolean = false;
let firstInputDelay: number | undefined;

export function setupOobResources(
  performanceController: PerformanceController
): void {
  // Do not initialize unless iid is available.
  if (!getIid()) {
    return;
  }
  // The load event might not have fired yet, and that means performance
  // navigation timing object has a duration of 0. The setup should run after
  // all current tasks in js queue.
  setTimeout(() => setupOobTraces(performanceController), 0);
  setTimeout(() => setupNetworkRequests(performanceController), 0);
  setTimeout(() => setupUserTimingTraces(performanceController), 0);
}

function setupNetworkRequests(
  performanceController: PerformanceController
): void {
  const api = Api.getInstance();
  const resources = api.getEntriesByType('resource');
  for (const resource of resources) {
    createNetworkRequestEntry(performanceController, resource);
  }
  api.setupObserver('resource', entry =>
    createNetworkRequestEntry(performanceController, entry)
  );
}

function setupOobTraces(performanceController: PerformanceController): void {
  const api = Api.getInstance();
  // Better support for Safari
  if ('onpagehide' in window) {
    api.document.addEventListener('pagehide', () =>
      sendOobTrace(performanceController)
    );
  } else {
    api.document.addEventListener('unload', () =>
      sendOobTrace(performanceController)
    );
  }
  api.document.addEventListener('visibilitychange', () => {
    if (api.document.visibilityState === 'hidden') {
      sendOobTrace(performanceController);
    }
  });

  if (api.onFirstInputDelay) {
    api.onFirstInputDelay((fid: number) => {
      firstInputDelay = fid;
    });
  }

  api.onLCP((metric: LCPMetricWithAttribution) => {
    webVitalMetrics.lcp = {
      value: metric.value,
      elementAttribution: metric.attribution?.element
    };
  });
  api.onCLS((metric: CLSMetricWithAttribution) => {
    webVitalMetrics.cls = {
      value: metric.value,
      elementAttribution: metric.attribution?.largestShiftTarget
    };
  });
  api.onINP((metric: INPMetricWithAttribution) => {
    webVitalMetrics.inp = {
      value: metric.value,
      elementAttribution: metric.attribution?.interactionTarget
    };
  });
}

function setupUserTimingTraces(
  performanceController: PerformanceController
): void {
  const api = Api.getInstance();
  // Run through the measure performance entries collected up to this point.
  const measures = api.getEntriesByType('measure');
  for (const measure of measures) {
    createUserTimingTrace(performanceController, measure);
  }
  // Setup an observer to capture the measures from this point on.
  api.setupObserver('measure', entry =>
    createUserTimingTrace(performanceController, entry)
  );
}

function createUserTimingTrace(
  performanceController: PerformanceController,
  measure: PerformanceEntry
): void {
  const measureName = measure.name;
  // Do not create a trace, if the user timing marks and measures are created by
  // the sdk itself.
  if (
    measureName.substring(0, TRACE_MEASURE_PREFIX.length) ===
    TRACE_MEASURE_PREFIX
  ) {
    return;
  }
  Trace.createUserTimingTrace(performanceController, measureName);
}

function sendOobTrace(performanceController: PerformanceController): void {
  if (!sentPageLoadTrace) {
    sentPageLoadTrace = true;
    const api = Api.getInstance();
    const navigationTimings = api.getEntriesByType(
      'navigation'
    ) as PerformanceNavigationTiming[];
    const paintTimings = api.getEntriesByType('paint');
    // If First Input Delay polyfill is added to the page, report the fid value.
    // https://github.com/GoogleChromeLabs/first-input-delay
    if (api.onFirstInputDelay && !firstInputDelay) {
      setTimeout(() => {
        Trace.createOobTrace(
          performanceController,
          navigationTimings,
          paintTimings,
          webVitalMetrics,
          firstInputDelay
        );
      }, FID_WAIT_TIME_MS);
    } else {
      Trace.createOobTrace(
        performanceController,
        navigationTimings,
        paintTimings,
        webVitalMetrics,
        firstInputDelay
      );
    }
  }
}

/**
 * This service will only export the page load trace once. This function allows
 * resetting it for unit tests
 */
export function resetForUnitTests(): void {
  sentPageLoadTrace = false;
  firstInputDelay = undefined;
  webVitalMetrics = {};
}
