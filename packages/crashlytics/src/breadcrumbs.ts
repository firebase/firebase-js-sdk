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
import type { Instrumentation } from '@opentelemetry/instrumentation';
import type { Instrumentation as BrowserInstrumentation } from '@opentelemetry/browser-api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { NavigationTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import { UserActionInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/user-action';
import { WebVitalsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/web-vitals';
import {
  BreadcrumbInstrumentation,
  CrashlyticsFeature,
  CrashlyticsOptions
} from './public-types';
import {
  BreadcrumbInstrumentationInternal,
  CrashlyticsFeatureInternal,
  DynamicHeaderProvider,
  NetworkInstrumentationConfig
} from './types';
import { AttributesStore } from './attributes-store';
import { TelemetryStore } from './telemetry-store';
import { OnErrorLogRecordProcessor } from './logging/on-error-log-record-processor';
import {
  createTracingProvider,
  TracingProviderResult
} from './tracing/tracing-provider';

/*
 * Tracing instrumentations patch globals (such as fetch and XMLHttpRequest) and report to the
 * global TracerProvider, so they are tracked at module level and only one set is kept registered
 * at a time. Registering a new set unregisters the previous one first.
 */
let activeTracingUnregisterFn: (() => void) | undefined;

function unregisterTracingInstrumentations(): void {
  if (activeTracingUnregisterFn) {
    activeTracingUnregisterFn();
    activeTracingUnregisterFn = undefined;
  }
}

class NavigationTimingsBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'navigationTimings';
  readonly kind = 'logger';

  create(): BrowserInstrumentation {
    return new NavigationTimingInstrumentation();
  }
}

class WebVitalsBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'webVitals';
  readonly kind = 'logger';

  create(): BrowserInstrumentation {
    return new WebVitalsInstrumentation({
      // TODO: Consider making the raw attribution flag configurable in the future. Some customers
      // may want to disable this for performance or data reasons.
      includeRawAttribution: true
    });
  }
}

class UserActionsBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'userActions';
  readonly kind = 'logger';

  create(): BrowserInstrumentation {
    return new UserActionInstrumentation({
      autoCapturedActions: ['click']
    });
  }
}

class FetchRequestsBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'fetchRequests';
  readonly kind = 'tracer';

  create(
    networkInstrumentationConfig?: NetworkInstrumentationConfig
  ): Instrumentation {
    return new FetchInstrumentation(networkInstrumentationConfig);
  }
}

class XhrRequestsBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'xhrRequests';
  readonly kind = 'tracer';

  create(
    networkInstrumentationConfig?: NetworkInstrumentationConfig
  ): Instrumentation {
    return new XMLHttpRequestInstrumentation(networkInstrumentationConfig);
  }
}

class DocumentLoadsBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'documentLoads';
  readonly kind = 'tracer';

  create(): Instrumentation {
    return new DocumentLoadInstrumentation();
  }
}

class RouteChangesBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'routeChanges';
  readonly kind = 'framework';
}

class LifecycleEventsBreadcrumb implements BreadcrumbInstrumentationInternal {
  readonly name = 'lifecycleEvents';
  readonly kind = 'core';
}

class BreadcrumbsFeatureImpl implements CrashlyticsFeatureInternal {
  readonly name = 'breadcrumbs';
  // TODO: `getCrashlytics()` compares options with `deepEqual`, which compares this list in order.
  // The same instrumentations passed in a different order are treated as different options.
  readonly instrumentations: BreadcrumbInstrumentation[];
  private _unregisterLoggerInstrumentationsFn?: () => void;

  constructor(instrumentations: BreadcrumbInstrumentation[]) {
    this.instrumentations = instrumentations;
  }

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
    const instrumentations =
      this.createInstrumentations<BrowserInstrumentation>('logger');

    if (this._unregisterLoggerInstrumentationsFn) {
      this._unregisterLoggerInstrumentationsFn();
    }

    for (const instrumentation of instrumentations) {
      instrumentation.enable({ loggerProvider });
    }

    const unregister = (): void => {
      for (const instrumentation of instrumentations) {
        instrumentation.disable();
      }
    };

    // Define as non-enumerable to exempt this function from the `deepEqual(options1, options2)`
    // check in `getCrashlytics()`.
    Object.defineProperty(this, '_unregisterLoggerInstrumentationsFn', {
      value: unregister,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }

  initializeTracingInstrumentations(
    networkInstrumentationConfig: NetworkInstrumentationConfig
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    unregisterTracingInstrumentations();

    activeTracingUnregisterFn = registerInstrumentations({
      instrumentations: this.createInstrumentations<Instrumentation>(
        'tracer',
        networkInstrumentationConfig
      )
    });
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
      this._unregisterLoggerInstrumentationsFn = undefined;
    }
    unregisterTracingInstrumentations();
  }

  private createInstrumentations<T>(
    kind: 'logger' | 'tracer',
    networkInstrumentationConfig?: NetworkInstrumentationConfig
  ): T[] {
    const created: T[] = [];
    for (const instrumentation of this
      .instrumentations as BreadcrumbInstrumentationInternal[]) {
      if (instrumentation.kind === kind && instrumentation.create) {
        created.push(instrumentation.create(networkInstrumentationConfig) as T);
      }
    }
    return created;
  }
}

/**
 * <b>(EXPERIMENTAL)</b> Enables Crashlytics breadcrumb and trace telemetry collection when passed in
 * {@link CrashlyticsOptions.features}. The `capture` option selects which instrumentations
 * Crashlytics runs automatically, such as OpenTelemetry spans (Fetch, XMLHttpRequest, and Document
 * Load) and breadcrumb logs (navigation events, Web Vitals, user actions, and visibility lifecycle
 * events). Captured telemetry is buffered in memory and exported when an error occurs. If `capture`
 * is omitted, no instrumentations are enabled; pass {@link all | all()} to enable all of them. Only
 * the instrumentations that are imported are included in the application bundle.
 *
 * @example
 * ```ts
 * import {
 *   getCrashlytics,
 *   breadcrumbs,
 *   webVitals,
 *   fetchRequests
 * } from 'firebase/crashlytics';
 *
 * const crashlytics = getCrashlytics(app, {
 *   features: [breadcrumbs({ capture: [webVitals(), fetchRequests()] })]
 * });
 * ```
 *
 * @param options - Optional. `capture` is the list of instrumentations to enable.
 *
 * @public
 */
export function breadcrumbs(options?: {
  capture?: BreadcrumbInstrumentation[];
}): CrashlyticsFeature {
  // Keep only the first instrumentation of each name. Enabling the same instrumentation twice
  // would record its telemetry twice.
  const seen = new Set<string>();
  const instrumentations = (options?.capture ?? []).filter(instrumentation => {
    const { name } = instrumentation as BreadcrumbInstrumentationInternal;
    if (seen.has(name)) {
      return false;
    }
    seen.add(name);
    return true;
  });
  return new BreadcrumbsFeatureImpl(instrumentations);
}

/**
 * <b>(EXPERIMENTAL)</b> Returns every available breadcrumb instrumentation, for use as the `capture`
 * option of {@link breadcrumbs}. Using this includes all instrumentations in the application bundle.
 *
 * @example
 * ```ts
 * import {
 *   getCrashlytics,
 *   breadcrumbs,
 *   all
 * } from 'firebase/crashlytics';
 *
 * const crashlytics = getCrashlytics(app, {
 *   features: [breadcrumbs({ capture: all() })]
 * });
 * ```
 *
 * @public
 */
export function all(): BreadcrumbInstrumentation[] {
  return [
    navigationTimings(),
    webVitals(),
    userActions(),
    fetchRequests(),
    xhrRequests(),
    documentLoads(),
    routeChanges(),
    lifecycleEvents()
  ];
}

/**
 * <b>(EXPERIMENTAL)</b> Captures browser navigation timing for page loads as breadcrumb logs.
 *
 * @public
 */
export function navigationTimings(): BreadcrumbInstrumentation {
  return new NavigationTimingsBreadcrumb();
}

/**
 * <b>(EXPERIMENTAL)</b> Captures Core Web Vitals as breadcrumb logs.
 *
 * @public
 */
export function webVitals(): BreadcrumbInstrumentation {
  return new WebVitalsBreadcrumb();
}

/**
 * <b>(EXPERIMENTAL)</b> Captures user actions (clicks) as breadcrumb logs.
 *
 * @public
 */
export function userActions(): BreadcrumbInstrumentation {
  return new UserActionsBreadcrumb();
}

/**
 * <b>(EXPERIMENTAL)</b> Captures `fetch` requests as spans.
 *
 * @public
 */
export function fetchRequests(): BreadcrumbInstrumentation {
  return new FetchRequestsBreadcrumb();
}

/**
 * <b>(EXPERIMENTAL)</b> Captures `XMLHttpRequest` requests as spans.
 *
 * @public
 */
export function xhrRequests(): BreadcrumbInstrumentation {
  return new XhrRequestsBreadcrumb();
}

/**
 * <b>(EXPERIMENTAL)</b> Captures document load timing as spans.
 *
 * @public
 */
export function documentLoads(): BreadcrumbInstrumentation {
  return new DocumentLoadsBreadcrumb();
}

/**
 * <b>(EXPERIMENTAL)</b> Captures route changes (navigation events) as breadcrumb logs. This requires
 * one of the Crashlytics framework integrations (React Router, Next.js, or Angular) to report
 * navigations.
 *
 * @public
 */
export function routeChanges(): BreadcrumbInstrumentation {
  return new RouteChangesBreadcrumb();
}

/**
 * <b>(EXPERIMENTAL)</b> Captures page lifecycle events (the page moving to the foreground or the
 * background) as breadcrumb logs.
 *
 * @public
 */
export function lifecycleEvents(): BreadcrumbInstrumentation {
  return new LifecycleEventsBreadcrumb();
}
