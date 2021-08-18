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
import { Api } from './api_service';
import { Trace } from '../resources/trace';
import { createNetworkRequestEntry } from '../resources/network_request';
import { TRACE_MEASURE_PREFIX } from '../constants';
import { getIid } from './iid_service';

const FID_WAIT_TIME_MS = 5000;

export function setupOobResources(): void {
  // Do not initialize unless iid is available.
  if (!getIid()) {
    return;
  }
  // The load event might not have fired yet, and that means performance navigation timing
  // object has a duration of 0. The setup should run after all current tasks in js queue.
  setTimeout(() => setupOobTraces(), 0);
  setTimeout(() => setupNetworkRequests(), 0);
  setTimeout(() => setupUserTimingTraces(), 0);
}

function setupNetworkRequests(): void {
  const api = Api.getInstance();
  const resources = api.getEntriesByType('resource');
  for (const resource of resources) {
    createNetworkRequestEntry(resource);
  }
  api.setupObserver('resource', createNetworkRequestEntry);
}

function setupOobTraces(): void {
  const api = Api.getInstance();
  const navigationTimings = api.getEntriesByType(
    'navigation'
  ) as PerformanceNavigationTiming[];
  const paintTimings = api.getEntriesByType('paint');
  // If First Input Desly polyfill is added to the page, report the fid value.
  // https://github.com/GoogleChromeLabs/first-input-delay
  if (api.onFirstInputDelay) {
    // If the fid call back is not called for certain time, continue without it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timeoutId: any = setTimeout(() => {
      Trace.createOobTrace(navigationTimings, paintTimings);
      timeoutId = undefined;
    }, FID_WAIT_TIME_MS);
    api.onFirstInputDelay((fid: number) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        Trace.createOobTrace(navigationTimings, paintTimings, fid);
      }
    });
  } else {
    Trace.createOobTrace(navigationTimings, paintTimings);
  }
}

function setupUserTimingTraces(): void {
  const api = Api.getInstance();
  // Run through the measure performance entries collected up to this point.
  const measures = api.getEntriesByType('measure');
  for (const measure of measures) {
    createUserTimingTrace(measure);
  }
  // Setup an observer to capture the measures from this point on.
  api.setupObserver('measure', createUserTimingTrace);
}

function createUserTimingTrace(measure: PerformanceEntry): void {
  const measureName = measure.name;
  // Do not create a trace, if the user timing marks and measures are created by the sdk itself.
  if (
    measureName.substring(0, TRACE_MEASURE_PREFIX.length) ===
    TRACE_MEASURE_PREFIX
  ) {
    return;
  }
  Trace.createUserTimingTrace(measureName);
}
