/**
 * @license
 * Copyright 2025 Google LLC
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

import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { Telemetry } from './public-types';

/**
 * An internal interface for the Telemetry service.
 *
 * @internal
 */
export interface TelemetryInternal extends Telemetry {
  loggerProvider: LoggerProvider;
}

type KeyValuePair = [key: string, value: string];

/**
 * A type for Cloud Logging log entry attributes
 *
 * @internal
 */
export type LogEntryAttribute = KeyValuePair;

/**
 * An interface for classes that provide dynamic log entry attributes.
 *
 * Classes that implement this interface can be used to supply custom headers for logging.
 *
 * @internal
 */
export interface DynamicLogAttributeProvider {
  /**
   * Returns a record of attributes to be added to a log entry.
   *
   * @returns A {@link Promise} that resolves to a {@link LogEntryAttribute} key-value pair,
   * or null if no attribute is to be added.
   */
  getAttribute(): Promise<LogEntryAttribute | null>;
}

/**
 * A type for HTTP Headers
 *
 * @internal
 */
export type HttpHeader = KeyValuePair;

/**
 * An interface for classes that provide dynamic headers.
 *
 * Classes that implement this interface can be used to supply custom headers for logging.
 *
 * @internal
 */
export interface DynamicHeaderProvider {
  /**
   * Returns a record of headers to be added to a request.
   *
   * @returns A {@link Promise} that resolves to a {@link HttpHeader} key-value pair,
   * or null if no header is to be added.
   */
  getHeader(): Promise<HttpHeader | null>;
}
