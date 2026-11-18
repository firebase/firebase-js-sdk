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
import { NavigationTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import { UserActionInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/user-action';
import { WebVitalsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/web-vitals';
import { breadcrumbs, unregisterLoggerInstrumentations } from './breadcrumbs';
import { CrashlyticsFeatureInternal } from './types';

describe('breadcrumbs', () => {
  let mockLoggerProvider: LoggerProvider;

  beforeEach(() => {
    mockLoggerProvider = {
      getLogger: vi.fn()
    } as unknown as LoggerProvider;
  });

  afterEach(() => {
    unregisterLoggerInstrumentations();
    vi.restoreAllMocks();
  });

  it('does not enable browser logger instrumentations in Node environments', () => {
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

    const feature = breadcrumbs() as CrashlyticsFeatureInternal;
    feature.initializeLoggerInstrumentations(mockLoggerProvider);

    expect(navEnableSpy).not.toHaveBeenCalled();
    expect(webVitalsEnableSpy).not.toHaveBeenCalled();
    expect(userActionEnableSpy).not.toHaveBeenCalled();
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

    const feature = breadcrumbs() as CrashlyticsFeatureInternal;
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
});
