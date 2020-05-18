/**
 * @license
 * Copyright 2017 Google LLC
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

import { version } from '../package.json';

export const SDK_VERSION = version;
/** The prefix for start User Timing marks used for creating Traces. */
export const TRACE_START_MARK_PREFIX = 'FB-PERF-TRACE-START';
/** The prefix for stop User Timing marks used for creating Traces. */
export const TRACE_STOP_MARK_PREFIX = 'FB-PERF-TRACE-STOP';
/** The prefix for User Timing measure used for creating Traces. */
export const TRACE_MEASURE_PREFIX = 'FB-PERF-TRACE-MEASURE';
/** The prefix for out of the box page load Trace name. */
export const OOB_TRACE_PAGE_LOAD_PREFIX = '_wt_';

export const FIRST_PAINT_COUNTER_NAME = '_fp';

export const FIRST_CONTENTFUL_PAINT_COUNTER_NAME = '_fcp';

export const FIRST_INPUT_DELAY_COUNTER_NAME = '_fid';

export const CONFIG_LOCAL_STORAGE_KEY = '@firebase/performance/config';

export const CONFIG_EXPIRY_LOCAL_STORAGE_KEY =
  '@firebase/performance/configexpire';

export const SERVICE = 'performance';
export const SERVICE_NAME = 'Performance';
