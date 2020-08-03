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

import {
  FIRST_PAINT_COUNTER_NAME,
  FIRST_CONTENTFUL_PAINT_COUNTER_NAME,
  FIRST_INPUT_DELAY_COUNTER_NAME,
  OOB_TRACE_PAGE_LOAD_PREFIX
} from '../constants';
import { consoleLogger } from '../utils/console_logger';

const MAX_METRIC_NAME_LENGTH = 100;
const RESERVED_AUTO_PREFIX = '_';
const oobMetrics = [
  FIRST_PAINT_COUNTER_NAME,
  FIRST_CONTENTFUL_PAINT_COUNTER_NAME,
  FIRST_INPUT_DELAY_COUNTER_NAME
];

/**
 * Returns true if the metric is custom and does not start with reserved prefix, or if
 * the metric is one of out of the box page load trace metrics.
 */
export function isValidMetricName(name: string, traceName?: string): boolean {
  if (name.length === 0 || name.length > MAX_METRIC_NAME_LENGTH) {
    return false;
  }
  return (
    (traceName &&
      traceName.startsWith(OOB_TRACE_PAGE_LOAD_PREFIX) &&
      oobMetrics.indexOf(name) > -1) ||
    !name.startsWith(RESERVED_AUTO_PREFIX)
  );
}

/**
 * Converts the provided value to an integer value to be used in case of a metric.
 * @param providedValue Provided number value of the metric that needs to be converted to an integer.
 *
 * @returns Converted integer number to be set for the metric.
 */
export function convertMetricValueToInteger(providedValue: number): number {
  const valueAsInteger: number = Math.floor(providedValue);
  if (valueAsInteger < providedValue) {
    consoleLogger.info(
      `Metric value should be an Integer, setting the value as : ${valueAsInteger}.`
    );
  }
  return valueAsInteger;
}
