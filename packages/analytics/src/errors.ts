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

import { ErrorFactory, ErrorMap } from '@firebase/util';

export const enum AnalyticsError {
  ALREADY_EXISTS = 'already-exists',
  ALREADY_INITIALIZED = 'already-initialized',
  INTEROP_COMPONENT_REG_FAILED = 'interop-component-reg-failed',
  INVALID_ANALYTICS_CONTEXT = 'invalid-analytics-context',
  FETCH_THROTTLE = 'fetch-throttle',
  CONFIG_FETCH_FAILED = 'config-fetch-failed',
  NO_API_KEY = 'no-api-key',
  NO_APP_ID = 'no-app-id',
  INDEXED_DB_UNSUPPORTED = 'indexedDB-unsupported',
  INVALID_INDEXED_DB_CONTEXT = 'invalid-indexedDB-context',
  COOKIES_NOT_ENABLED = 'cookies-not-enabled'
}

const ERRORS: ErrorMap<AnalyticsError> = {
  [AnalyticsError.ALREADY_EXISTS]:
    'A Firebase Analytics instance with the appId {$id} ' +
    ' already exists. ' +
    'Only one Firebase Analytics instance can be created for each appId.',
  [AnalyticsError.ALREADY_INITIALIZED]:
    'Firebase Analytics has already been initialized.' +
    'settings() must be called before initializing any Analytics instance' +
    'or it will have no effect.',
  [AnalyticsError.INTEROP_COMPONENT_REG_FAILED]:
    'Firebase Analytics Interop Component failed to instantiate: {$reason}',
  [AnalyticsError.INDEXED_DB_UNSUPPORTED]:
    'IndexedDB is not supported by current browswer',
  [AnalyticsError.INVALID_INDEXED_DB_CONTEXT]:
    "Environment doesn't support IndexedDB: {$errorInfo}. " +
    'Wrap initialization of analytics in analytics.isSupported() ' +
    'to prevent initialization in unsupported environments',
  [AnalyticsError.COOKIES_NOT_ENABLED]:
    'Cookies are not enabled in this browser environment. Analytics requires cookies to be enabled.',
  [AnalyticsError.INVALID_ANALYTICS_CONTEXT]:
    'Firebase Analytics is not supported in browser extensions.',
  [AnalyticsError.FETCH_THROTTLE]:
    'The config fetch request timed out while in an exponential backoff state.' +
    ' Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.',
  [AnalyticsError.CONFIG_FETCH_FAILED]:
    'Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}',
  [AnalyticsError.NO_API_KEY]:
    'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field to' +
    'contain a valid API key.',
  [AnalyticsError.NO_APP_ID]:
    'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field to' +
    'contain a valid app ID.',
  [AnalyticsError.INDEXED_DB_UNSUPPORTED]:
    'IndexedDB is not supported by current browswer',
  [AnalyticsError.INVALID_INDEXED_DB_CONTEXT]:
    "Environment doesn't support IndexedDB: {$errorInfo}. " +
    'Wrap initialization of analytics in analytics.isSupported() ' +
    'to prevent initialization in unsupported environments',
  [AnalyticsError.COOKIES_NOT_ENABLED]:
    'Cookies are not enabled in this browser environment. Analytics requires cookies to be enabled.'
};

interface ErrorParams {
  [AnalyticsError.ALREADY_EXISTS]: { id: string };
  [AnalyticsError.INTEROP_COMPONENT_REG_FAILED]: { reason: Error };
  [AnalyticsError.FETCH_THROTTLE]: { throttleEndTimeMillis: number };
  [AnalyticsError.CONFIG_FETCH_FAILED]: {
    httpStatus: number;
    responseMessage: string;
  };
  [AnalyticsError.INVALID_INDEXED_DB_CONTEXT]: { errorInfo: string };
}

export const ERROR_FACTORY = new ErrorFactory<AnalyticsError, ErrorParams>(
  'analytics',
  'Analytics',
  ERRORS
);
