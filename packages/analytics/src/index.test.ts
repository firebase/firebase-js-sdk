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

import { expect, vi, MockInstance } from 'vitest';
import '../testing/setup';
import { settings } from './index';
import {
  getFakeApp,
  getFakeInstallations
} from '../testing/get-fake-firebase-services';
import { FirebaseApp } from '@firebase/app';
import { GtagCommand } from './constants';
import { findGtagScriptOnPage } from './helpers';
import { removeGtagScripts } from '../testing/gtag-script-util';
import { Deferred } from '@firebase/util';
import { AnalyticsError } from './errors';
import { logEvent } from './api';
import {
  AnalyticsService,
  getGlobalVars,
  resetGlobalVars,
  factory as analyticsFactory
} from './factory';
import { _FirebaseInstallationsInternal } from '@firebase/installations';

let analyticsInstance: AnalyticsService = {} as AnalyticsService;
const fakeMeasurementId = 'abcd-efgh';
const fakeAppParams = { appId: 'abcdefgh12345:23405', apiKey: 'AAbbCCdd12345' };
let fetchStub: MockInstance = vi.fn();
const customGtagName = 'customGtag';
const customDataLayerName = 'customDataLayer';
let fakeInstallations: _FirebaseInstallationsInternal;

// Fake indexedDB.open() request
const fakeRequest = {
  onsuccess: () => {},
  result: {
    close: () => {}
  }
};
let idbOpenStub: MockInstance = vi.fn();

function stubFetch(status: number, body: object): void {
  fetchStub = vi.spyOn(window, 'fetch');
  const mockResponse = new Response(JSON.stringify(body), {
    status
  });
  fetchStub.mockResolvedValue(mockResponse);
}

// Stub indexedDB.open() because sinon's clock does not know
// how to wait for the real indexedDB callbacks to resolve.
function stubIdbOpen(): void {
  idbOpenStub = vi.spyOn(indexedDB, 'open').mockReturnValue(fakeRequest as any);
}

describe('FirebaseAnalytics instance tests', () => {
  describe('Initialization', () => {
    beforeEach(() => {
      resetGlobalVars();
      fakeInstallations = getFakeInstallations();
    });

    it('Throws if no appId in config', () => {
      const app = getFakeApp({ apiKey: fakeAppParams.apiKey });
      expect(() => analyticsFactory(app, fakeInstallations)).toThrow(
        AnalyticsError.NO_APP_ID
      );
    });
    it('Throws if no apiKey or measurementId in config', () => {
      const app = getFakeApp({ appId: fakeAppParams.appId });
      expect(() => analyticsFactory(app, fakeInstallations)).toThrow(
        AnalyticsError.NO_API_KEY
      );
    });
    it('Warns if config has no apiKey but does have a measurementId', async () => {
      // Since this is a warning and doesn't block the rest of initialization
      // all the async stuff needs to be stubbed and cleaned up.
      const warnStub = vi.spyOn(console, 'warn');
      const docStub = vi.spyOn(document, 'createElement');
      stubFetch(200, { measurementId: fakeMeasurementId });
      const app = getFakeApp({
        appId: fakeAppParams.appId,
        measurementId: fakeMeasurementId
      });
      stubIdbOpen();
      analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
      const { initializationPromisesMap } = getGlobalVars();
      await initializationPromisesMap[fakeAppParams.appId];
      expect(warnStub.mock.calls[0][1]).toContain(
        `Falling back to the measurement ID ${fakeMeasurementId}`
      );
      warnStub.mockRestore();
      docStub.mockRestore();
      fetchStub.mockRestore();
      idbOpenStub.mockRestore();
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScripts();
    });
    it('Throws if creating an instance with already-used appId', () => {
      const app = getFakeApp(fakeAppParams);
      resetGlobalVars(false, { [fakeAppParams.appId]: Promise.resolve() });
      expect(() => analyticsFactory(app, fakeInstallations)).toThrow(
        AnalyticsError.ALREADY_EXISTS
      );
    });
  });
  describe('Standard app, page already has user gtag script', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    let fidDeferred: Deferred<void>;
    const gtagStub: MockInstance = vi.fn();
    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      resetGlobalVars();
      app = getFakeApp(fakeAppParams);
      fidDeferred = new Deferred<void>();
      fakeInstallations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      window['gtag'] = gtagStub;
      window['dataLayer'] = [];
      stubFetch(200, { measurementId: fakeMeasurementId });
      stubIdbOpen();
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
    });
    afterEach(async () => {
      await vi.runAllTimersAsync();
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScripts();
      fetchStub.mockRestore();
      idbOpenStub.mockRestore();
      vi.useRealTimers();
    });
    it('Contains reference to parent app', () => {
      expect(analyticsInstance.app).toBe(app);
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      logEvent(analyticsInstance, 'add_payment_info', {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await vi.runAllTimersAsync();
      expect(gtagStub).toHaveBeenCalledWith('js', expect.any(Date));
      expect(gtagStub).toHaveBeenCalledWith(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        {
          'firebase_id': 'fid-1234',
          origin: 'firebase',
          update: true
        }
      );
      expect(gtagStub).toHaveBeenCalledWith(
        GtagCommand.EVENT,
        'add_payment_info',
        {
          'send_to': 'abcd-efgh',
          currency: 'USD'
        }
      );
    });
  });

  describe('Standard app, mismatched environment', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    const gtagStub: MockInstance = vi.fn();
    let fidDeferred: Deferred<void>;
    let warnStub: MockInstance;
    let cookieStub: MockInstance;
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      resetGlobalVars();
      app = getFakeApp(fakeAppParams);
      fidDeferred = new Deferred<void>();
      fakeInstallations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      window['gtag'] = gtagStub;
      window['dataLayer'] = [];
      stubFetch(200, { measurementId: fakeMeasurementId });
      warnStub = vi.spyOn(console, 'warn');
      stubIdbOpen();
    });
    afterEach(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScripts();
      fetchStub.mockRestore();
      warnStub.mockRestore();
      idbOpenStub.mockRestore();
      gtagStub.mockClear();
      vi.useRealTimers();
    });
    it('Warns on initialization if cookies not available', async () => {
      cookieStub = vi
        .spyOn(navigator, 'cookieEnabled', 'get')
        .mockReturnValue(false);
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
      expect(warnStub.mock.calls[0][1]).toContain(
        AnalyticsError.INVALID_ANALYTICS_CONTEXT
      );
      expect(warnStub.mock.calls[0][1]).toContain('Cookies');
      cookieStub.mockRestore();
    });
    it('Warns on initialization if in browser extension', async () => {
      window.chrome = { runtime: { id: 'blah' } };
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
      expect(warnStub.mock.calls[0][1]).toContain(
        AnalyticsError.INVALID_ANALYTICS_CONTEXT
      );
      expect(warnStub.mock.calls[0][1]).toContain('browser extension');
      window.chrome = undefined;
    });
    it('Warns on logEvent if indexedDB API not available', async () => {
      idbOpenStub.mockRestore();
      const idbStub = vi
        .spyOn(window, 'indexedDB', 'get')
        .mockReturnValue(undefined as any);
      try {
        analyticsInstance = analyticsFactory(app, fakeInstallations);
        logEvent(analyticsInstance, 'add_payment_info', {
          currency: 'USD'
        });
        // Clear promise chain started by logEvent.
        await vi.runAllTimersAsync();
        // gtag config call omits FID
        expect(gtagStub).toHaveBeenCalledWith('config', 'abcd-efgh', {
          update: true,
          origin: 'firebase'
        });
        expect(warnStub.mock.calls[0][1]).toContain(
          AnalyticsError.INDEXEDDB_UNAVAILABLE
        );
        expect(warnStub.mock.calls[0][1]).toContain(
          'IndexedDB is not available'
        );
      } finally {
        idbStub.mockRestore();
        stubIdbOpen();
      }
    });
    it('Warns on logEvent if indexedDB.open() not allowed', async () => {
      idbOpenStub.mockRestore();
      idbOpenStub = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('idb open error test');
      });
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      logEvent(analyticsInstance, 'add_payment_info', {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await vi.runAllTimersAsync();
      // gtag config call omits FID
      expect(gtagStub).toHaveBeenCalledWith('config', 'abcd-efgh', {
        update: true,
        origin: 'firebase'
      });
      expect(warnStub.mock.calls[0][1]).toContain(
        AnalyticsError.INDEXEDDB_UNAVAILABLE
      );
      expect(warnStub.mock.calls[0][1]).toContain('idb open error test');
    });
  });

  describe('Page has user gtag script with custom gtag and dataLayer names', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    let fidDeferred: Deferred<void>;
    const gtagStub: MockInstance = vi.fn();
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      resetGlobalVars();
      app = getFakeApp(fakeAppParams);
      fidDeferred = new Deferred<void>();
      fakeInstallations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      window[customGtagName] = gtagStub;
      window[customDataLayerName] = [];
      settings({
        dataLayerName: customDataLayerName,
        gtagName: customGtagName
      });
      stubIdbOpen();
      stubFetch(200, { measurementId: fakeMeasurementId });
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
    });
    afterEach(async () => {
      await vi.runAllTimersAsync();
      delete window[customGtagName];
      delete window[customDataLayerName];
      removeGtagScripts();
      fetchStub.mockRestore();
      idbOpenStub.mockRestore();
      vi.useRealTimers();
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      logEvent(analyticsInstance, 'add_payment_info', {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await vi.runAllTimersAsync();
      expect(gtagStub).toHaveBeenCalledWith('js', expect.any(Date));
      expect(gtagStub).toHaveBeenCalledWith(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        {
          'firebase_id': 'fid-1234',
          origin: 'firebase',
          update: true
        }
      );
      expect(gtagStub).toHaveBeenCalledWith(
        GtagCommand.EVENT,
        'add_payment_info',
        {
          'send_to': 'abcd-efgh',
          currency: 'USD'
        }
      );
    });
  });

  describe('Page has no existing gtag script or dataLayer', () => {
    it('Adds the script tag to the page', async () => {
      resetGlobalVars();
      const app = getFakeApp(fakeAppParams);
      fakeInstallations = getFakeInstallations();
      stubFetch(200, {});
      stubIdbOpen();
      analyticsInstance = analyticsFactory(app, fakeInstallations);

      const { initializationPromisesMap } = getGlobalVars();
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
      await initializationPromisesMap[fakeAppParams.appId];
      expect(findGtagScriptOnPage('dataLayer')).not.toBeNull();
      expect(typeof window['gtag']).toBe('function');
      expect(Array.isArray(window['dataLayer'])).toBe(true);

      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScripts();
      fetchStub.mockRestore();
      idbOpenStub.mockRestore();
    });
  });
});
