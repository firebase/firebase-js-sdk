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
import { breadcrumbs } from './breadcrumbs';
import { CrashlyticsFeatureInternal } from './types';

describe('breadcrumbs', () => {
  let mockLoggerProvider: LoggerProvider;
  let features: CrashlyticsFeatureInternal[] = [];

  /**
   * Creates a breadcrumbs feature that is unregistered after the test, even if the test fails.
   */
  function createFeature(): CrashlyticsFeatureInternal {
    const feature = breadcrumbs() as CrashlyticsFeatureInternal;
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

    const feature = createFeature();
    feature.initializeLoggerInstrumentations(mockLoggerProvider);
    feature.initializeTracingInstrumentations({ ignoreUrls: [] });

    expect(navEnableSpy).not.toHaveBeenCalled();
    expect(webVitalsEnableSpy).not.toHaveBeenCalled();
    expect(userActionEnableSpy).not.toHaveBeenCalled();
    expect(fetchSetConfigSpy).not.toHaveBeenCalled();
    expect(xhrSetConfigSpy).not.toHaveBeenCalled();
    expect(documentLoadSetConfigSpy).not.toHaveBeenCalled();
  });

  it('enables browser logger instrumentations with loggerProvider and disables them on unregister', () => {
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
    const navDisableSpy = vi.spyOn(
      NavigationTimingInstrumentation.prototype,
      'disable'
    );
    const webVitalsDisableSpy = vi.spyOn(
      WebVitalsInstrumentation.prototype,
      'disable'
    );
    const userActionDisableSpy = vi.spyOn(
      UserActionInstrumentation.prototype,
      'disable'
    );

    const feature = createFeature();
    feature.initializeLoggerInstrumentations(mockLoggerProvider);

    expect(navEnableSpy).toHaveBeenCalledTimes(1);
    expect(navEnableSpy).toHaveBeenCalledWith({
      loggerProvider: mockLoggerProvider
    });
    expect(webVitalsEnableSpy).toHaveBeenCalledTimes(1);
    expect(webVitalsEnableSpy).toHaveBeenCalledWith({
      loggerProvider: mockLoggerProvider
    });
    expect(userActionEnableSpy).toHaveBeenCalledTimes(1);
    expect(userActionEnableSpy).toHaveBeenCalledWith({
      loggerProvider: mockLoggerProvider
    });

    // _unregisterLoggerInstrumentationsFn must remain non-enumerable for deepEqual checks.
    expect(Object.keys(feature)).toEqual(['name']);

    // Re-initializing should disable the previous set of instrumentations first.
    feature.initializeLoggerInstrumentations(mockLoggerProvider);

    expect(navDisableSpy).toHaveBeenCalledTimes(1);
    expect(webVitalsDisableSpy).toHaveBeenCalledTimes(1);
    expect(userActionDisableSpy).toHaveBeenCalledTimes(1);
    expect(navEnableSpy).toHaveBeenCalledTimes(2);
    expect(webVitalsEnableSpy).toHaveBeenCalledTimes(2);
    expect(userActionEnableSpy).toHaveBeenCalledTimes(2);

    feature.unregisterInstrumentations();

    expect(navDisableSpy).toHaveBeenCalledTimes(2);
    expect(webVitalsDisableSpy).toHaveBeenCalledTimes(2);
    expect(userActionDisableSpy).toHaveBeenCalledTimes(2);
  });

  it('initializeTracingInstrumentations() registers tracing instrumentations with the network config and disables them on unregister', () => {
    if (typeof window === 'undefined') {
      return;
    }

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
    const fetchEnableSpy = vi.spyOn(FetchInstrumentation.prototype, 'enable');
    const xhrEnableSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'enable'
    );
    const documentLoadEnableSpy = vi.spyOn(
      DocumentLoadInstrumentation.prototype,
      'enable'
    );
    const fetchDisableSpy = vi.spyOn(FetchInstrumentation.prototype, 'disable');
    const xhrDisableSpy = vi.spyOn(
      XMLHttpRequestInstrumentation.prototype,
      'disable'
    );
    const documentLoadDisableSpy = vi.spyOn(
      DocumentLoadInstrumentation.prototype,
      'disable'
    );

    const ignoreUrls = [/^https:\/\/example\.com/];
    const feature = createFeature();
    feature.initializeTracingInstrumentations({ ignoreUrls });

    expect(fetchSetConfigSpy).toHaveBeenCalled();
    expect((fetchSetConfigSpy.mock.calls[0][0] as any).ignoreUrls).toBe(
      ignoreUrls
    );
    expect(xhrSetConfigSpy).toHaveBeenCalled();
    expect((xhrSetConfigSpy.mock.calls[0][0] as any).ignoreUrls).toBe(
      ignoreUrls
    );
    expect(documentLoadSetConfigSpy).toHaveBeenCalled();
    expect(fetchEnableSpy).toHaveBeenCalled();
    expect(xhrEnableSpy).toHaveBeenCalled();
    expect(documentLoadEnableSpy).toHaveBeenCalled();

    feature.unregisterInstrumentations();

    expect(fetchDisableSpy).toHaveBeenCalled();
    expect(xhrDisableSpy).toHaveBeenCalled();
    expect(documentLoadDisableSpy).toHaveBeenCalled();
  });

  it('keeps only one set of tracing instrumentations registered at a time', () => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchEnableSpy = vi.spyOn(FetchInstrumentation.prototype, 'enable');
    const fetchDisableSpy = vi.spyOn(FetchInstrumentation.prototype, 'disable');

    const first = createFeature();
    const second = createFeature();

    first.initializeTracingInstrumentations({ ignoreUrls: [] });
    expect(fetchEnableSpy).toHaveBeenCalledTimes(1);
    expect(fetchDisableSpy).not.toHaveBeenCalled();

    // Registering a second set unregisters the first one.
    second.initializeTracingInstrumentations({ ignoreUrls: [] });
    expect(fetchDisableSpy).toHaveBeenCalledTimes(1);
    expect(fetchEnableSpy).toHaveBeenCalledTimes(2);
  });
});
