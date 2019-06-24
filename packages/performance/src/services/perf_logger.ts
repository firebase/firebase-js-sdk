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

import { getIid } from './iid_service';
import { NetworkRequest } from '../resources/network_request';
import { Trace } from '../resources/trace';
import { Api } from './api_service';
import { SettingsService } from './settings_service';
import {
  getServiceWorkerStatus,
  getVisibilityState,
  VisibilityState,
  getEffectiveConnectionType
} from '../utils/attributes_utils';
import {
  isPerfInitialized,
  getInitializationPromise
} from './initialization_service';
import { Logger } from '@firebase/logger';
import { ccHandler } from './cc_service';
import { SDK_VERSION } from '../constants';

const enum ResourceType {
  NetworkRequest,
  Trace
}

/* eslint-disable camelcase */
interface ApplicationInfo {
  google_app_id: string;
  app_instance_id?: string;
  web_app_info: WebAppInfo;
  application_process_state: number;
}

interface WebAppInfo {
  sdk_version: string;
  page_url: string;
  service_worker_status: number;
  visibility_state: number;
  effective_connection_type: number;
}

interface PerfNetworkLog {
  application_info: ApplicationInfo;
  network_request_metric: NetworkRequestMetric;
}

interface PerfTraceLog {
  application_info: ApplicationInfo;
  trace_metric: TraceMetric;
}

interface NetworkRequestMetric {
  url: string;
  http_method: number;
  http_response_code: number;
  response_payload_bytes?: number;
  client_start_time_us?: number;
  time_to_response_initiated_us?: number;
  time_to_response_completed_us?: number;
}

interface TraceMetric {
  name: string;
  is_auto: boolean;
  client_start_time_us: number;
  duration_us: number;
  counters?: Array<{ key: string; value: number }>;
  custom_attributes?: Array<{ key: string; value: string }>;
}
/* eslint-enble camelcase */

let logger: Logger | undefined;
// This method is not called before initialization.
function getLogger(): Logger {
  if (logger) {
    return logger;
  }
  const ccLogger = ccHandler(serializer);
  logger = new Logger('@firebase/performance/cc');
  logger.logHandler = ccLogger;
  return logger;
}

export function logTrace(trace: Trace): void {
  const settingsService = SettingsService.getInstance();
  // Do not log if trace is auto generated and instrumentation is disabled.
  if (!settingsService.instrumentationEnabled && trace.isAuto) {
    return;
  }
  // Do not log if trace is custom and data collection is disabled.
  if (!settingsService.dataCollectionEnabled && !trace.isAuto) {
    return;
  }
  // Do not log if required apis are not available.
  if (!Api.getInstance().requiredApisAvailable()) {
    return;
  }
  // Only log the page load auto traces if page is visible.
  if (trace.isAuto && getVisibilityState() !== VisibilityState.VISIBLE) {
    return;
  }

  if (
    !settingsService.loggingEnabled ||
    !settingsService.logTraceAfterSampling
  ) {
    return;
  }

  if (isPerfInitialized()) {
    sendTraceLog(trace);
  } else {
    // Custom traces can be used before the initialization but logging
    // should wait until after.
    getInitializationPromise().then(
      () => sendTraceLog(trace),
      () => sendTraceLog(trace)
    );
  }
}

function sendTraceLog(trace: Trace): void {
  if (getIid()) {
    setTimeout(() => getLogger().log(trace, ResourceType.Trace), 0);
  }
}

export function logNetworkRequest(networkRequest: NetworkRequest): void {
  const settingsService = SettingsService.getInstance();
  // Do not log network requests if instrumentation is disabled.
  if (!settingsService.instrumentationEnabled) {
    return;
  }
  // Do not log the js sdk's call to cc service to avoid unnecessary cycle.
  if (networkRequest.url === settingsService.logEndPointUrl.split('?')[0]) {
    return;
  }

  if (
    !settingsService.loggingEnabled ||
    !settingsService.logNetworkAfterSampling
  ) {
    return;
  }

  setTimeout(
    () => getLogger().log(networkRequest, ResourceType.NetworkRequest),
    0
  );
}

function serializer(resource: {}, resourceType: ResourceType): string {
  if (resourceType === ResourceType.NetworkRequest) {
    return serializeNetworkRequest(resource as NetworkRequest);
  }
  return serializeTrace(resource as Trace);
}

function serializeNetworkRequest(networkRequest: NetworkRequest): string {
  const networkRequestMetric: NetworkRequestMetric = {
    url: networkRequest.url,
    http_method: networkRequest.httpMethod || 0,
    http_response_code: 200,
    response_payload_bytes: networkRequest.responsePayloadBytes,
    client_start_time_us: networkRequest.startTimeUs,
    time_to_response_initiated_us: networkRequest.timeToResponseInitiatedUs,
    time_to_response_completed_us: networkRequest.timeToResponseCompletedUs
  };
  const perfMetric: PerfNetworkLog = {
    application_info: getApplicationInfo(),
    network_request_metric: networkRequestMetric
  };
  return JSON.stringify(perfMetric);
}

function serializeTrace(trace: Trace): string {
  const traceMetric: TraceMetric = {
    name: trace.name,
    is_auto: trace.isAuto,
    client_start_time_us: trace.startTimeUs,
    duration_us: trace.durationUs
  };

  if (Object.keys(trace.counters).length !== 0) {
    traceMetric.counters = convertToKeyValueArray(trace.counters);
  }
  const customAttributes = trace.getAttributes();
  if (Object.keys(customAttributes).length !== 0) {
    traceMetric.custom_attributes = convertToKeyValueArray(customAttributes);
  }

  const perfMetric: PerfTraceLog = {
    application_info: getApplicationInfo(),
    trace_metric: traceMetric
  };
  return JSON.stringify(perfMetric);
}

function getApplicationInfo(): ApplicationInfo {
  return {
    google_app_id: SettingsService.getInstance().getAppId(),
    app_instance_id: getIid(),
    web_app_info: {
      sdk_version: SDK_VERSION,
      page_url: Api.getInstance().getUrl(),
      service_worker_status: getServiceWorkerStatus(),
      visibility_state: getVisibilityState(),
      effective_connection_type: getEffectiveConnectionType()
    },
    application_process_state: 0
  };
}

function convertToKeyValueArray<T>(obj: {
  [key: string]: T;
}): Array<{
  key: string;
  value: T;
}> {
  const keys = Object.keys(obj);
  return keys.map(key => ({ key, value: obj[key] }));
}
