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

import { expect } from 'chai';
import { SinonStub, stub, useFakeTimers } from 'sinon';
import '../testing/setup';
import { settings } from './index';
import {
  getFakeApp,
  getFakeInstallations
} from '../testing/get-fake-firebase-services';
import { FirebaseApp } from '@firebase/app-exp';
import { GtagCommand } from './constants';
import { findGtagScriptOnPage } from './helpers';
import { removeGtagScript } from '../testing/gtag-script-util';
import { Deferred } from '@firebase/util';
import { AnalyticsError } from './errors';
import { logEvent } from './api';
import {
  AnalyticsService,
  getGlobalVars,
  resetGlobalVars,
  factory as analyticsFactory
} from './factory';
import { _FirebaseInstallationsInternal } from '@firebase/installations-exp';

let analyticsInstance: AnalyticsService = {} as AnalyticsService;
const fakeMeasurementId = 'abcd-efgh';
const fakeAppParams = { appId: 'abcdefgh12345:23405', apiKey: 'AAbbCCdd12345' };
let fetchStub: SinonStub = stub();
const customGtagName = 'customGtag';
const customDataLayerName = 'customDataLayer';
let clock: sinon.SinonFakeTimers;
let fakeInstallations: _FirebaseInstallationsInternal;

// Fake indexedDB.open() request
let fakeRequest = {
  onsuccess: () => {},
  result: {
    close: () => {}
  }
};
let idbOpenStub = stub();

function stubFetch(status: number, body: object): void {
  fetchStub = stub(window, 'fetch');
  const mockResponse = new Response(JSON.stringify(body), {
    status
  });
  fetchStub.returns(Promise.resolve(mockResponse));
}

// Stub indexedDB.open() because sinon's clock does not know
// how to wait for the real indexedDB callbacks to resolve.
function stubIdbOpen(): void {
  (fakeRequest = {
    onsuccess: () => {},
    result: {
      close: () => {}
    }
  }),
    (idbOpenStub = stub(indexedDB, 'open').returns(fakeRequest as any));
}

describe('FirebaseAnalytics instance tests', () => {
  describe('Initialization', () => {
    beforeEach(() => {
      clock = useFakeTimers();
      resetGlobalVars();
      fakeInstallations = getFakeInstallations();
    });
    afterEach(() => {
      clock.restore();
    });

    it('Throws if no appId in config', () => {
      const app = getFakeApp({ apiKey: fakeAppParams.apiKey });
      expect(() => analyticsFactory(app, fakeInstallations)).to.throw(
        AnalyticsError.NO_APP_ID
      );
    });
    it('Throws if no apiKey or measurementId in config', () => {
      const app = getFakeApp({ appId: fakeAppParams.appId });
      expect(() => analyticsFactory(app, fakeInstallations)).to.throw(
        AnalyticsError.NO_API_KEY
      );
    });
    it('Warns if config has no apiKey but does have a measurementId', async () => {
      // Since this is a warning and doesn't block the rest of initialization
      // all the async stuff needs to be stubbed and cleaned up.
      const warnStub = stub(console, 'warn');
      const docStub = stub(document, 'createElement');
      stubFetch(200, { measurementId: fakeMeasurementId });
      const app = getFakeApp({
        appId: fakeAppParams.appId,
        measurementId: fakeMeasurementId
      });
      stubIdbOpen();
      analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
      // Lets async IDB validation process complete.
      // await clock.runAllAsync();
      expect(warnStub.args[0][1]).to.include(
        `Falling back to the measurement ID ${fakeMeasurementId}`
      );
      warnStub.restore();
      docStub.restore();
      fetchStub.restore();
      idbOpenStub.restore();
      delete window['gtag'];
      delete window['dataLayer'];
    });
    it('Throws if creating an instance with already-used appId', () => {
      const app = getFakeApp(fakeAppParams);
      resetGlobalVars(false, { [fakeAppParams.appId]: Promise.resolve() });
      expect(() => analyticsFactory(app, fakeInstallations)).to.throw(
        AnalyticsError.ALREADY_EXISTS
      );
    });
  });
  describe('Standard app, page already has user gtag script', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    let fidDeferred: Deferred<void>;
    const gtagStub: SinonStub = stub();
    before(async () => {
      clock = useFakeTimers();
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
    after(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
      fetchStub.restore();
      clock.restore();
      idbOpenStub.restore();
    });
    it('Contains reference to parent app', () => {
      expect(analyticsInstance.app).to.equal(app);
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      logEvent(analyticsInstance, 'add_payment_info', {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await clock.runAllAsync();
      expect(gtagStub).to.have.been.calledWith('js');
      expect(gtagStub).to.have.been.calledWith(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        {
          'firebase_id': 'fid-1234',
          origin: 'firebase',
          update: true
        }
      );
      expect(gtagStub).to.have.been.calledWith(
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
    const gtagStub: SinonStub = stub();
    let fidDeferred: Deferred<void>;
    let warnStub: SinonStub;
    let cookieStub: SinonStub;
    beforeEach(() => {
      clock = useFakeTimers();
      resetGlobalVars();
      app = getFakeApp(fakeAppParams);
      fidDeferred = new Deferred<void>();
      fakeInstallations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      window['gtag'] = gtagStub;
      window['dataLayer'] = [];
      stubFetch(200, { measurementId: fakeMeasurementId });
      warnStub = stub(console, 'warn');
      stubIdbOpen();
    });
    afterEach(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
      fetchStub.restore();
      clock.restore();
      warnStub.restore();
      idbOpenStub.restore();
      gtagStub.resetHistory();
    });
    it('Warns on initialization if cookies not available', async () => {
      cookieStub = stub(navigator, 'cookieEnabled').value(false);
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.INVALID_ANALYTICS_CONTEXT
      );
      expect(warnStub.args[0][1]).to.include('Cookies');
      cookieStub.restore();
    });
    it('Warns on initialization if in browser extension', async () => {
      window.chrome = { runtime: { id: 'blah' } };
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.INVALID_ANALYTICS_CONTEXT
      );
      expect(warnStub.args[0][1]).to.include('browser extension');
      window.chrome = undefined;
    });
    it('Warns on logEvent if indexedDB API not available', async () => {
      const idbStub = stub(window, 'indexedDB').value(undefined);
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      logEvent(analyticsInstance, 'add_payment_info', {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await clock.runAllAsync();
      // gtag config call omits FID
      expect(gtagStub).to.be.calledWith('config', 'abcd-efgh', {
        update: true,
        origin: 'firebase'
      });
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.INDEXEDDB_UNAVAILABLE
      );
      expect(warnStub.args[0][1]).to.include('IndexedDB is not available');
      idbStub.restore();
    });
    it('Warns on logEvent if indexedDB.open() not allowed', async () => {
      idbOpenStub.restore();
      idbOpenStub = stub(indexedDB, 'open').throws('idb open error test');
      analyticsInstance = analyticsFactory(app, fakeInstallations);
      logEvent(analyticsInstance, 'add_payment_info', {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await clock.runAllAsync();
      // gtag config call omits FID
      expect(gtagStub).to.be.calledWith('config', 'abcd-efgh', {
        update: true,
        origin: 'firebase'
      });
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.INDEXEDDB_UNAVAILABLE
      );
      expect(warnStub.args[0][1]).to.include('idb open error test');
    });
  });

  describe('Page has user gtag script with custom gtag and dataLayer names', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    let fidDeferred: Deferred<void>;
    const gtagStub: SinonStub = stub();
    before(() => {
      clock = useFakeTimers();
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
    after(() => {
      delete window[customGtagName];
      delete window[customDataLayerName];
      removeGtagScript();
      fetchStub.restore();
      clock.restore();
      idbOpenStub.restore();
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      logEvent(analyticsInstance, 'add_payment_info', {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await clock.runAllAsync();
      expect(gtagStub).to.have.been.calledWith('js');
      expect(gtagStub).to.have.been.calledWith(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        {
          'firebase_id': 'fid-1234',
          origin: 'firebase',
          update: true
        }
      );
      expect(gtagStub).to.have.been.calledWith(
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
      expect(findGtagScriptOnPage()).to.not.be.null;
      expect(typeof window['gtag']).to.equal('function');
      expect(Array.isArray(window['dataLayer'])).to.be.true;

      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
      fetchStub.restore();
      idbOpenStub.restore();
    });
  });
});
