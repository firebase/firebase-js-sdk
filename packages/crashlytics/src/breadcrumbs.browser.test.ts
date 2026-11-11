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

import {
  LoggerProvider,
  LogRecordProcessor,
  SdkLogRecord
} from '@opentelemetry/sdk-logs';
import { breadcrumbs } from './breadcrumbs';
import { CrashlyticsFeatureInternal } from './types';

describe('breadcrumbs() logger instrumentations', () => {
  let records: SdkLogRecord[];
  let loggerProvider: LoggerProvider;
  let feature: CrashlyticsFeatureInternal;
  let button: HTMLButtonElement;

  function eventNames(): Array<string | undefined> {
    return records.map(record => record.eventName);
  }

  beforeEach(() => {
    records = [];
    const collector: LogRecordProcessor = {
      onEmit: record => records.push(record),
      forceFlush: () => Promise.resolve(),
      shutdown: () => Promise.resolve()
    };
    loggerProvider = new LoggerProvider({ processors: [collector] });
    feature = breadcrumbs() as CrashlyticsFeatureInternal;
    button = document.createElement('button');
    document.body.appendChild(button);
  });

  afterEach(() => {
    feature.unregisterInstrumentations();
    button.remove();
  });

  it('sends click breadcrumbs to the given logger provider', () => {
    feature.initializeLoggerInstrumentations(loggerProvider);

    button.click();

    expect(eventNames()).toContain('browser.user_action.click');
  });

  it('sends the navigation timing to the given logger provider when the page is already loaded', async () => {
    expect(document.readyState).toBe('complete');

    feature.initializeLoggerInstrumentations(loggerProvider);

    await vi.waitFor(() =>
      expect(eventNames()).toContain('browser.navigation_timing')
    );
  });

  it('stops sending breadcrumbs after unregisterInstrumentations()', () => {
    feature.initializeLoggerInstrumentations(loggerProvider);
    feature.unregisterInstrumentations();
    records = [];

    button.click();

    expect(eventNames()).not.toContain('browser.user_action.click');
  });

  it('only sends breadcrumbs once after being initialized twice', () => {
    feature.initializeLoggerInstrumentations(loggerProvider);
    feature.initializeLoggerInstrumentations(loggerProvider);
    records = [];

    button.click();

    expect(
      eventNames().filter(name => name === 'browser.user_action.click')
    ).toHaveLength(1);
  });
});
