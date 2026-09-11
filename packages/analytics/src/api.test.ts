/**
 * @license
 * Copyright 2019 Google LLC
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

import { expect, vi } from 'vitest';
import '../testing/setup';
import { getFullApp } from '../testing/get-fake-firebase-services';
import {
  getAnalytics,
  initializeAnalytics,
  setConsent,
  setDefaultEventParameters
} from './api';
import { FirebaseApp, deleteApp } from '@firebase/app';
import { AnalyticsError } from './errors';
import * as init from './initialize-analytics';
const fakeAppParams = { appId: 'abcdefgh12345:23405', apiKey: 'AAbbCCdd12345' };

const { mockInitializeAnalytics } = vi.hoisted(() => ({
  mockInitializeAnalytics: vi.fn()
}));

vi.mock('./initialize-analytics', async importOriginal => {
  const actual =
    await importOriginal<typeof import('./initialize-analytics')>();
  return {
    ...actual,
    _initializeAnalytics: mockInitializeAnalytics
  };
});

import { _setWrappedGtagFunction } from './factory';

import {
  defaultConsentSettingsForInit,
  defaultEventParametersForInit
} from './functions';
import { ConsentSettings } from './public-types';

describe('FirebaseAnalytics API tests', () => {
  let app: FirebaseApp;
  const wrappedGtag = vi.fn();

  beforeEach(() => {
    mockInitializeAnalytics.mockResolvedValue('FAKE_MEASUREMENT_ID');
    _setWrappedGtagFunction(undefined);
  });

  afterEach(async () => {
    await mockInitializeAnalytics();
    mockInitializeAnalytics.mockReset();
    _setWrappedGtagFunction(undefined);
    wrappedGtag.mockReset();
    if (app) {
      return deleteApp(app);
    }
  });

  afterAll(() => {
    delete window['gtag'];
    delete window['dataLayer'];
  });

  it('initializeAnalytics() with same (no) options returns same instance', () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = initializeAnalytics(app);
    const newInstance = initializeAnalytics(app);
    expect(analyticsInstance).toBe(newInstance);
  });
  it('initializeAnalytics() with same options returns same instance', () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = initializeAnalytics(app, {
      config: { 'send_page_view': false }
    });
    const newInstance = initializeAnalytics(app, {
      config: { 'send_page_view': false }
    });
    expect(analyticsInstance).toBe(newInstance);
  });
  it('initializeAnalytics() with different options throws', () => {
    app = getFullApp(fakeAppParams);
    initializeAnalytics(app, {
      config: { 'send_page_view': false }
    });
    expect(() =>
      initializeAnalytics(app, {
        config: { 'send_page_view': true }
      })
    ).toThrow(AnalyticsError.ALREADY_INITIALIZED);
  });
  it('initializeAnalytics() with different options (one undefined) throws', () => {
    app = getFullApp(fakeAppParams);
    initializeAnalytics(app);
    expect(() =>
      initializeAnalytics(app, {
        config: { 'send_page_view': true }
      })
    ).toThrow(AnalyticsError.ALREADY_INITIALIZED);
  });
  it('getAnalytics() returns same instance created by previous getAnalytics()', () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = getAnalytics(app);
    expect(getAnalytics(app)).toBe(analyticsInstance);
  });
  it('getAnalytics() returns same instance created by initializeAnalytics()', () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = initializeAnalytics(app);
    expect(getAnalytics(app)).toBe(analyticsInstance);
  });
  it('setDefaultEventParameters() updates defaultEventParametersForInit if gtag does not exist ', () => {
    const eventParametersForInit = {
      'github_user': 'dwyfrequency',
      'company': 'google'
    };
    app = getFullApp(fakeAppParams);
    setDefaultEventParameters(eventParametersForInit);
    expect(defaultEventParametersForInit).toEqual(eventParametersForInit);
  });
  it('setDefaultEventParameters() calls gtag set if wrappedGtagFunction exists', () => {
    const eventParametersForInit = {
      'github_user': 'dwyfrequency',
      'company': 'google'
    };
    _setWrappedGtagFunction(wrappedGtag);
    app = getFullApp(fakeAppParams);
    setDefaultEventParameters(eventParametersForInit);
    expect(wrappedGtag).toHaveBeenCalledWith('set', eventParametersForInit);
  });
  it('setConsent() updates defaultConsentSettingsForInit if gtag does not exist ', () => {
    const consentParametersForInit: ConsentSettings = {
      'analytics_storage': 'granted',
      'functionality_storage': 'denied'
    };
    _setWrappedGtagFunction(undefined);
    app = getFullApp(fakeAppParams);
    setConsent(consentParametersForInit);
    expect(defaultConsentSettingsForInit).toEqual(consentParametersForInit);
  });
  it('setConsent() calls gtag consent "update" if wrappedGtagFunction exists', () => {
    const consentParametersForInit: ConsentSettings = {
      'analytics_storage': 'granted',
      'functionality_storage': 'denied'
    };
    _setWrappedGtagFunction(wrappedGtag);
    app = getFullApp(fakeAppParams);
    setConsent(consentParametersForInit);
    expect(wrappedGtag).toHaveBeenCalledWith(
      'consent',
      'update',
      consentParametersForInit
    );
  });
});
