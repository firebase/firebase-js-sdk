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

import { FirebaseApp } from '@firebase/app';
import { AnyValueMap, Logger, LoggerProvider } from '@opentelemetry/api-logs';
import {
  LogRecordProcessor,
  LogRecordExporter
} from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';

/**
 * An instance of the Firebase Crashlytics SDK.
 *
 * Do not create this instance directly. Instead, use {@link getCrashlytics | getCrashlytics()}.
 *
 * @public
 */
export interface Crashlytics {
  /**
   * The {@link @firebase/app#FirebaseApp} this {@link Crashlytics} instance is associated with.
   */
  app: FirebaseApp;
}

/**
 * Options for initializing the Crashlytics service using {@link getCrashlytics | getCrashlytics()}.
 *
 * @public
 */
export interface CrashlyticsOptions {
  /**
   * The URL for the endpoint to which Crashlytics data should be sent, in the OpenTelemetry format.
   * By default, data will be sent to Firebase.
   */
  endpointUrl?: string;

  /**
   * The Google Cloud region where the Crashlytics data should be sent.
   *
   * By default, data will be sent to the "global" region.
   *
   * Refer to https://cloud.google.com/logging/docs/regions for the list of available regions.
   */
  region?: string;

  /**
   * The version of the application. This should be a unique string that identifies the snapshot of
   * code to be deployed, such as "1.0.2". If not specified, other default locations will be checked
   * for an identifier. Setting a value here takes precedence over any other values.
   */
  appVersion?: string;

  /**
   * Base set of custom attributes to send with automatic error collection.
   * Key-value pairs defined here will be sent with all error logs.
   * If custom attributes are also specified in `recordError()`, those values will
   * take precedence over the base set defined here.
   */
  customAttributes?: AnyValueMap;

  /**
   * Optional custom OpenTelemetry LoggerProvider instance.
   * When provided, Firebase Crashlytics will use this provider instead of creating its own.
   */
  loggerProvider?: LoggerProvider;

  /**
   * Optional custom OpenTelemetry Logger instance.
   * When provided, Crashlytics will emit logs directly through this Logger.
   */
  logger?: Logger;

  /**
   * If true, Crashlytics will use the global OpenTelemetry LoggerProvider (`logs.getLoggerProvider()`).
   * Defaults to false.
   */
  useGlobalLoggerProvider?: boolean;

  /**
   * If true, registers the created LoggerProvider as the global OpenTelemetry LoggerProvider
   * via `logs.setGlobalLoggerProvider()`.
   * Defaults to false.
   */
  registerGlobalLoggerProvider?: boolean;

  /**
   * Additional OpenTelemetry LogRecordProcessors to attach to the default LoggerProvider pipeline.
   */
  extraProcessors?: LogRecordProcessor[];

  /**
   * Additional OpenTelemetry LogRecordExporters to attach via BatchLogRecordProcessor.
   */
  extraExporters?: LogRecordExporter[];

  /**
   * Custom OpenTelemetry Resource instance to merge into the default Resource.
   */
  resource?: Resource;
}
