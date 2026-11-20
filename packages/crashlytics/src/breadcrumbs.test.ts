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

import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { NavigationTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import { UserActionInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/user-action';
import { WebVitalsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/web-vitals';
import {
  all,
  breadcrumbs,
  fetchRequests,
  webVitals,
  xhrRequests
} from './breadcrumbs';
import {
  BreadcrumbInstrumentationInternal,
  CrashlyticsFeatureInternal
} from './types';

describe('breadcrumbs', () => {
  let mockLoggerProvider: LoggerProvider;
  let features: CrashlyticsFeatureInternal[] = [];

  /**
   * Creates a breadcrumbs feature that is unregistered after the test, even if the test fails.
   */
  function createFeature(
    options?: Parameters<typeof breadcrumbs>[0]
  ): CrashlyticsFeatureInternal {
    const feature = breadcrumbs(options) as CrashlyticsFeatureInternal;
    features.push(feature);
    return feature;
  }

  beforeEach(() => {
    mockLoggerProvider = {
      getLogger: vi.fn()
    } as unknown as LoggerProvider;
  });

  afterEach(() => {
    for (const feature of features) {
      feature.unregisterInstrumentations();
    }
    features = [];
    vi.restoreAllMocks();
  });

  it('initializeLoggerInstrumentations() and initializeTracingInstrumentations() enable every instrumentation returned from all()', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const navEnableSpy = vi.spyOn(
      NavigationTimingInstrumentation.prototype,
      'enable'
    );
    const webVitalsEnableSpy = vi.spyOn(
      WebVitalsInstrumentation.prototype,
      'enable'
    );
    const userActionEnableSpy = vi.spyOn(
      UserActionInstrumentation.prototype,
      'enable'
    );
    const fetchEnableSpy = vi.spyOn(FetchInstrumentation.prototype, 'enable');
    const xhrEnableSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'enable'
    );
    const documentLoadEnableSpy = vi.spyOn(
      DocumentLoadInstrumentation.prototype,
      'enable'
    );

    const instrumentations = all() as BreadcrumbInstrumentationInternal[];
    const names = instrumentations.map(instrumentation => instrumentation.name);

    expect(names).toEqual([
      'navigationTimings',
      'webVitals',
      'userActions',
      'fetchRequests',
      'xhrRequests',
      'documentLoads',
      'routeChanges',
      'lifecycleEvents'
    ]);

    // Passing the instrumentations in capture is all that is needed to enable them.
    const feature = createFeature({ capture: instrumentations });
    feature.initializeLoggerInstrumentations(mockLoggerProvider);
    feature.initializeTracingInstrumentations({ ignoreUrls: [] });

    // The logger instrumentations are enabled with the logger provider.
    expect(navEnableSpy).toHaveBeenCalledWith({
      loggerProvider: mockLoggerProvider
    });
    expect(webVitalsEnableSpy).toHaveBeenCalledWith({
      loggerProvider: mockLoggerProvider
    });
    expect(userActionEnableSpy).toHaveBeenCalledWith({
      loggerProvider: mockLoggerProvider
    });
    // The tracing instrumentations are not given a provider. They use the global tracer provider.
    expect(fetchEnableSpy).toHaveBeenCalled();
    expect(xhrEnableSpy).toHaveBeenCalled();
    expect(documentLoadEnableSpy).toHaveBeenCalled();
    // routeChanges() and lifecycleEvents() are not asserted on: they have no instrumentation to
    // enable and only gate logs that are emitted elsewhere.
  });

  it('initializeLoggerInstrumentations() and initializeTracingInstrumentations() enable no instrumentations in Node environments', () => {
    if (typeof window !== 'undefined') {
      return;
    }

    const navEnableSpy = vi.spyOn(
      NavigationTimingInstrumentation.prototype,
      'enable'
    );
    const webVitalsEnableSpy = vi.spyOn(
      WebVitalsInstrumentation.prototype,
      'enable'
    );
    const userActionEnableSpy = vi.spyOn(
      UserActionInstrumentation.prototype,
      'enable'
    );
    const fetchSetConfigSpy = vi.spyOn(
      FetchInstrumentation.prototype,
      'setConfig'
    );
    const xhrSetConfigSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'setConfig'
    );
    const documentLoadSetConfigSpy = vi.spyOn(
      DocumentLoadInstrumentation.prototype,
      'setConfig'
    );

    const feature = createFeature({ capture: all() });
    feature.initializeLoggerInstrumentations(mockLoggerProvider);
    feature.initializeTracingInstrumentations({ ignoreUrls: [] });

    expect(navEnableSpy).not.toHaveBeenCalled();
    expect(webVitalsEnableSpy).not.toHaveBeenCalled();
    expect(userActionEnableSpy).not.toHaveBeenCalled();
    expect(fetchSetConfigSpy).not.toHaveBeenCalled();
    expect(xhrSetConfigSpy).not.toHaveBeenCalled();
    expect(documentLoadSetConfigSpy).not.toHaveBeenCalled();
  });

  it('enables no instrumentations when capture is omitted', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const navEnableSpy = vi.spyOn(
      NavigationTimingInstrumentation.prototype,
      'enable'
    );
    const webVitalsEnableSpy = vi.spyOn(
      WebVitalsInstrumentation.prototype,
      'enable'
    );
    const userActionEnableSpy = vi.spyOn(
      UserActionInstrumentation.prototype,
      'enable'
    );
    const fetchSetConfigSpy = vi.spyOn(
      FetchInstrumentation.prototype,
      'setConfig'
    );
    const xhrSetConfigSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'setConfig'
    );
    const documentLoadSetConfigSpy = vi.spyOn(
      DocumentLoadInstrumentation.prototype,
      'setConfig'
    );

    const feature = createFeature();
    feature.initializeLoggerInstrumentations(mockLoggerProvider);
    feature.initializeTracingInstrumentations({ ignoreUrls: [] });

    expect(feature.instrumentations).toEqual([]);
    expect(navEnableSpy).not.toHaveBeenCalled();
    expect(webVitalsEnableSpy).not.toHaveBeenCalled();
    expect(userActionEnableSpy).not.toHaveBeenCalled();
    expect(fetchSetConfigSpy).not.toHaveBeenCalled();
    expect(xhrSetConfigSpy).not.toHaveBeenCalled();
    expect(documentLoadSetConfigSpy).not.toHaveBeenCalled();
  });

  it('breadcrumbs() ignores instrumentations that are repeated in capture', () => {
    const feature = createFeature({
      capture: [...all(), webVitals(), fetchRequests()]
    });

    // Enabling the same instrumentation twice would record its telemetry twice.
    expect(feature.instrumentations).toEqual(all());
  });

  it('initializeLoggerInstrumentations() enables only the logger instrumentations passed in capture', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const webVitalsEnableSpy = vi.spyOn(
      WebVitalsInstrumentation.prototype,
      'enable'
    );
    const fetchSetConfigSpy = vi.spyOn(
      FetchInstrumentation.prototype,
      'setConfig'
    );

    const feature = createFeature({
      capture: [webVitals(), fetchRequests()]
    });
    feature.initializeLoggerInstrumentations(mockLoggerProvider);

    // webVitals() is a logger instrumentation, so it is enabled.
    expect(webVitalsEnableSpy).toHaveBeenCalled();
    // fetchRequests() is a tracing instrumentation, so it is not created here.
    expect(fetchSetConfigSpy).not.toHaveBeenCalled();
  });

  it('initializeTracingInstrumentations() creates only the tracing instrumentations passed in capture, with the network config', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchSetConfigSpy = vi.spyOn(
      FetchInstrumentation.prototype,
      'setConfig'
    );
    const webVitalsEnableSpy = vi.spyOn(
      WebVitalsInstrumentation.prototype,
      'enable'
    );

    const ignoreUrls = [/^https:\/\/example\.com/];
    const feature = createFeature({
      capture: [fetchRequests(), webVitals()]
    });
    feature.initializeTracingInstrumentations({ ignoreUrls });

    // fetchRequests() is a tracing instrumentation, so it is created with the network config.
    expect(fetchSetConfigSpy).toHaveBeenCalled();
    expect((fetchSetConfigSpy.mock.calls[0][0] as any).ignoreUrls).toBe(
      ignoreUrls
    );
    // webVitals() is a logger instrumentation, so it is not enabled here.
    expect(webVitalsEnableSpy).not.toHaveBeenCalled();
  });

  it('keeps only one set of tracing instrumentations registered at a time', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchEnableSpy = vi.spyOn(FetchInstrumentation.prototype, 'enable');
    const fetchDisableSpy = vi.spyOn(FetchInstrumentation.prototype, 'disable');
    const xhrEnableSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'enable'
    );
    const xhrDisableSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'disable'
    );

    const first = createFeature({ capture: [fetchRequests()] });
    const second = createFeature({ capture: [xhrRequests()] });

    first.initializeTracingInstrumentations({ ignoreUrls: [] });
    expect(fetchEnableSpy).toHaveBeenCalled();

    // Registering a second set unregisters the first one.
    second.initializeTracingInstrumentations({ ignoreUrls: [] });
    expect(xhrEnableSpy).toHaveBeenCalled();
    expect(fetchDisableSpy).toHaveBeenCalled();
    expect(xhrDisableSpy).not.toHaveBeenCalled();
  });

  it('unregisterInstrumentations() disables the logger and tracing instrumentations', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const webVitalsDisableSpy = vi.spyOn(
      WebVitalsInstrumentation.prototype,
      'disable'
    );
    const fetchDisableSpy = vi.spyOn(FetchInstrumentation.prototype, 'disable');

    const feature = createFeature({ capture: [webVitals(), fetchRequests()] });
    feature.initializeLoggerInstrumentations(mockLoggerProvider);
    feature.initializeTracingInstrumentations({ ignoreUrls: [] });

    feature.unregisterInstrumentations();

    expect(webVitalsDisableSpy).toHaveBeenCalled();
    expect(fetchDisableSpy).toHaveBeenCalled();
  });
});
