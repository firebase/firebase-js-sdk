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

import type { FirebaseApp } from '@firebase/app';
import type {
  LoggerProvider,
  LogRecordExporter
} from '@opentelemetry/sdk-logs';
import type { TracerProvider } from '@opentelemetry/api';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import type { Instrumentation as BrowserInstrumentation } from '@opentelemetry/browser-api';
import {
  BreadcrumbInstrumentation,
  Crashlytics,
  CrashlyticsFeature,
  CrashlyticsOptions
} from './public-types';
import type { AttributesStore } from './attributes-store';
import { ALREADY_LOGGED_FLAG } from './constants';
import type { OnErrorSpanProcessor } from './tracing/on-error-span-processor';
import type { OnErrorLogRecordProcessor } from './logging/on-error-log-record-processor';
import type { TelemetryStore } from './telemetry-store';

/**
 * Configuration that Crashlytics applies to network (Fetch and XMLHttpRequest) instrumentations.
 *
 * @internal
 */
export interface NetworkInstrumentationConfig {
  ignoreUrls: RegExp[];
}

/**
 * Internal view of the opaque {@link BreadcrumbInstrumentation} objects. `logger` instrumentations
 * emit logs through the Crashlytics LoggerProvider and create a browser instrumentation, and
 * `tracer` instrumentations emit spans through the Crashlytics TracerProvider and create a standard
 * OpenTelemetry instrumentation. The other kinds have nothing to create: `framework`
 * instrumentations are implemented by the framework integrations (such as route change logging),
 * and `core` instrumentations are implemented by the Crashlytics core (such as visibility logging).
 *
 * @internal
 */
export interface BreadcrumbInstrumentationInternal extends BreadcrumbInstrumentation {
  readonly name: string;
  readonly kind: 'logger' | 'tracer' | 'framework' | 'core';
  create?(
    networkInstrumentationConfig?: NetworkInstrumentationConfig
  ): Instrumentation | BrowserInstrumentation;
}

/**
 * Names of the marker instrumentations: the `framework` and `core` kinds, which have nothing to
 * create and only gate logs that are emitted elsewhere. This keeps them apart from the `logger` and
 * `tracer` instrumentations, which Crashlytics creates and enables itself.
 *
 * @internal
 */
export type MarkerInstrumentationName = 'routeChanges' | 'lifecycleEvents';

/**
 * Internal interface implemented by Crashlytics feature plugins (such as {@link breadcrumbs}).
 *
 * @internal
 */
export interface CrashlyticsFeatureInternal extends CrashlyticsFeature {
  readonly name: string;
  readonly instrumentations: BreadcrumbInstrumentation[];
  createTelemetryStore(): TelemetryStore;
  createLogRecordProcessor(
    exporter: LogRecordExporter,
    telemetryStore: TelemetryStore
  ): OnErrorLogRecordProcessor;
  initializeLoggerInstrumentations(loggerProvider: LoggerProvider): void;
  initializeTracingInstrumentations(
    networkInstrumentationConfig: NetworkInstrumentationConfig
  ): void;
  createTracingProvider(
    app: FirebaseApp,
    crashlyticsOptions: CrashlyticsOptions,
    attributesStore: AttributesStore,
    telemetryStore: TelemetryStore,
    dynamicHeaderProviders?: DynamicHeaderProvider[]
  ): {
    tracingProvider: TracerProvider;
    onErrorSpanProcessor?: OnErrorSpanProcessor;
  };
  unregisterInstrumentations(): void;
}

/**
 * An internal interface for the Crashlytics service.
 *
 * @internal
 */
export interface CrashlyticsInternal extends Crashlytics {
  loggerProvider: LoggerProvider;
  tracingProvider: TracerProvider | null;
  attributesStore: AttributesStore;
  telemetryStore?: TelemetryStore;
  onErrorLogRecordProcessor?: OnErrorLogRecordProcessor;
  onErrorSpanProcessor?: OnErrorSpanProcessor;
  options?: CrashlyticsOptions;
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
