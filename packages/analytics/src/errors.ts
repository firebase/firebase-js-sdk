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
import { ANALYTICS_ID_FIELD } from './constants';

export const enum AnalyticsError {
  NO_GA_ID = 'no-ga-id',
  ALREADY_EXISTS = 'already-exists',
  ALREADY_INITIALIZED = 'already-initialized',
  INTEROP_COMPONENT_REG_FAILED = 'interop-component-reg-failed',
  INDEXED_DB_UNSUPPORTED = 'indexedDB-unsupported',
  INVALID_INDEXED_DB_CONTEXT = 'invalid-indexedDB-context',
  COOKIES_NOT_ENABLED = 'cookies-not-enabled',
  INVALID_ANALYTICS_CONTEXT = 'invalid-analytics-context'
}

const ERRORS: ErrorMap<AnalyticsError> = {
  [AnalyticsError.NO_GA_ID]:
    `"${ANALYTICS_ID_FIELD}" field is empty in ` +
    'Firebase config. Firebase Analytics ' +
    'requires this field to contain a valid measurement ID.',
  [AnalyticsError.ALREADY_EXISTS]:
    'A Firebase Analytics instance with the measurement ID ${id} ' +
    ' already exists. ' +
    'Only one Firebase Analytics instance can be created for each measurement ID.',
  [AnalyticsError.ALREADY_INITIALIZED]:
    'Firebase Analytics has already been initialized.' +
    'settings() must be called before initializing any Analytics instance' +
    'or it will have no effect.',
  [AnalyticsError.INTEROP_COMPONENT_REG_FAILED]:
    'Firebase Analytics Interop Component failed to instantiate',
  [AnalyticsError.INDEXED_DB_UNSUPPORTED]:
    'IndexedDB is not supported by current browswer',
  [AnalyticsError.INVALID_INDEXED_DB_CONTEXT]:
    "Environment doesn't support IndexedDB: {$errorInfo}. " +
    'Wrap initialization of analytics in analytics.isSupported() ' +
    'to prevent initialization in unsupported environments',
  [AnalyticsError.COOKIES_NOT_ENABLED]:
    'Cookies are not enabled in this browser environment. Analytics requires cookies to be enabled.',
  [AnalyticsError.INVALID_ANALYTICS_CONTEXT]:
    'Firebase Analytics is not supported in browser extensions.'
};

interface ErrorParams {
  [AnalyticsError.ALREADY_EXISTS]: { id: string };
  [AnalyticsError.INTEROP_COMPONENT_REG_FAILED]: { reason: Error };
  [AnalyticsError.INVALID_INDEXED_DB_CONTEXT]: { errorInfo: string };
}

export const ERROR_FACTORY = new ErrorFactory<AnalyticsError, ErrorParams>(
  'analytics',
  'Analytics',
  ERRORS
);
