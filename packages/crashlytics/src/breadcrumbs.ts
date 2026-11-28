/**
 * @license
 * Copyright 2026 Google LLC
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
import { NavigationTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import { UserActionInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/user-action';
import { WebVitalsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/web-vitals';
import { CrashlyticsFeature, CrashlyticsOptions } from './public-types';
import { CrashlyticsFeatureInternal, DynamicHeaderProvider } from './types';
import { AttributesStore } from './attributes-store';
import { TelemetryStore } from './telemetry-store';
import { OnErrorLogRecordProcessor } from './logging/on-error-log-record-processor';
import {
  createTracingProvider,
  TracingProviderResult,
  unregisterTracingInstrumentations
} from './tracing/tracing-provider';

const activeUnregisterFns = new Set<() => void>();

/** @internal */
export function unregisterLoggerInstrumentations(): void {
  for (const unregister of activeUnregisterFns) {
    unregister();
  }
  activeUnregisterFns.clear();
}

class BreadcrumbsFeatureImpl implements CrashlyticsFeatureInternal {
  readonly name = 'breadcrumbs';
  private _unregisterLoggerInstrumentationsFn?: () => void;

  createTelemetryStore(): TelemetryStore {
    return new TelemetryStore();
  }

  createLogRecordProcessor(
    exporter: LogRecordExporter,
    telemetryStore: TelemetryStore
  ): OnErrorLogRecordProcessor {
    return new OnErrorLogRecordProcessor(exporter, telemetryStore);
  }

  initializeLoggerInstrumentations(loggerProvider: LoggerProvider): void {
    if (typeof window === 'undefined') {
      return;
    }
    /*
     * Browser instrumentations remain inactive after construction until enable({ loggerProvider })
     * is called, ensuring the loggerProvider is bound before any events (such as already-completed
     * navigation timing in SSR frameworks like Next.js) are emitted.
     */
    const navigationTiming = new NavigationTimingInstrumentation();
    const webVitals = new WebVitalsInstrumentation({
      // TODO: Consider making the raw attribution flag configurable in the future. Some customers
      // may want to disable this for performance or data reasons.
      includeRawAttribution: true
    });
    const userAction = new UserActionInstrumentation({
      autoCapturedActions: ['click']
    });

    if (this._unregisterLoggerInstrumentationsFn) {
      this._unregisterLoggerInstrumentationsFn();
      activeUnregisterFns.delete(this._unregisterLoggerInstrumentationsFn);
    }

    const instrumentations = [navigationTiming, webVitals, userAction];
    for (const instrumentation of instrumentations) {
      instrumentation.enable({ loggerProvider });
    }

    const unregister = (): void => {
      for (const instrumentation of instrumentations) {
        instrumentation.disable();
      }
    };

    // Define as non-enumerable so `deepEqual(options1, options2)` in `getCrashlytics()`
    // only compares enumerable properties (`name: 'breadcrumbs'`) across calls.
    Object.defineProperty(this, '_unregisterLoggerInstrumentationsFn', {
      value: unregister,
      writable: true,
      configurable: true,
      enumerable: false
    });
    activeUnregisterFns.add(unregister);
  }

  createTracingProvider(
    app: FirebaseApp,
    crashlyticsOptions: CrashlyticsOptions,
    attributesStore: AttributesStore,
    telemetryStore: TelemetryStore,
    dynamicHeaderProviders: DynamicHeaderProvider[] = []
  ): TracingProviderResult {
    return createTracingProvider(
      app,
      crashlyticsOptions,
      attributesStore,
      telemetryStore,
      dynamicHeaderProviders
    );
  }

  unregisterInstrumentations(): void {
    if (this._unregisterLoggerInstrumentationsFn) {
      this._unregisterLoggerInstrumentationsFn();
      activeUnregisterFns.delete(this._unregisterLoggerInstrumentationsFn);
      this._unregisterLoggerInstrumentationsFn = undefined;
    }
    unregisterTracingInstrumentations();
  }
}

/**
 * <b>(EXPERIMENTAL)</b> Enables Crashlytics breadcrumb and trace telemetry collection when passed in
 * {@link CrashlyticsOptions.features}.
 *
 * When enabled, Crashlytics collects OpenTelemetry spans (such as Fetch, XMLHttpRequest, and
 * Document Load) and breadcrumb logs (such as navigation events, Web Vitals, user actions,
 * and visibility lifecycle events), buffering them in memory and exporting them when an error occurs.
 *
 * @example
 * ```ts
 * import { getCrashlytics, breadcrumbs } from 'firebase/crashlytics';
 *
 * const crashlytics = getCrashlytics(app, {
 *   features: [breadcrumbs()]
 * });
 * ```
 *
 * @public
 */
export function breadcrumbs(): CrashlyticsFeature {
  return new BreadcrumbsFeatureImpl();
}
