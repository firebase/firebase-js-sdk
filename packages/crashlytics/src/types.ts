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
import { TracerProvider } from '@opentelemetry/api';
import { Crashlytics } from './public-types';
import { AttributesStore } from './attributes-store';
import { ALREADY_LOGGED_FLAG } from './constants';
import { OnErrorSpanProcessor } from './tracing/on-error-span-processor';
import { OnErrorLogRecordProcessor } from './logging/on-error-log-record-processor';

/**
 * Extended LoggerProvider with optional onErrorLogRecordProcessor.
 *
 * @internal
 */
export interface LoggerProviderWithOnError extends LoggerProvider {
  onErrorLogRecordProcessor?: OnErrorLogRecordProcessor;
}

/**
 * Extended TracerProvider with optional onErrorSpanProcessor.
 *
 * @internal
 */
export interface TracerProviderWithOnError extends TracerProvider {
  onErrorSpanProcessor?: OnErrorSpanProcessor;
}

/**
 * An internal interface for the Crashlytics service.
 *
 * @internal
 */
export interface CrashlyticsInternal extends Crashlytics {
  loggerProvider: LoggerProviderWithOnError;
  tracingProvider: TracerProviderWithOnError;
  attributesStore: AttributesStore;
}

type KeyValuePair = [key: string, value: string];

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

/**
 * An internal interface for error objects that have been flagged as already logged.
 *
 * @internal
 */
export interface ErrorWithSymbol extends Error {
  [ALREADY_LOGGED_FLAG]?: boolean;
}
