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
import { FirebaseAnalytics } from '@firebase/analytics-types';
import { SinonStub, stub, useFakeTimers } from 'sinon';
import './testing/setup';
import {
  settings as analyticsSettings,
  factory as analyticsFactory,
  resetGlobalVars,
  getGlobalVars
} from './index';
import {
  getFakeApp,
  getFakeInstallations
} from './testing/get-fake-firebase-services';
import { FirebaseApp } from '@firebase/app-types';
import { GtagCommand, EventName } from './src/constants';
import { findGtagScriptOnPage } from './src/helpers';
import { removeGtagScript } from './testing/gtag-script-util';
import { Deferred } from '@firebase/util';
import { AnalyticsError } from './src/errors';

let analyticsInstance: FirebaseAnalytics = {} as FirebaseAnalytics;
const fakeMeasurementId = 'abcd-efgh';
const fakeAppParams = { appId: 'abcdefgh12345:23405', apiKey: 'AAbbCCdd12345' };
let fetchStub: SinonStub = stub();
const customGtagName = 'customGtag';
const customDataLayerName = 'customDataLayer';
let clock: sinon.SinonFakeTimers;

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
    beforeEach(() => resetGlobalVars());

    it('Throws if no appId in config', () => {
      const app = getFakeApp({ apiKey: fakeAppParams.apiKey });
      const installations = getFakeInstallations();
      expect(() => analyticsFactory(app, installations)).to.throw(
        AnalyticsError.NO_APP_ID
      );
    });
    it('Throws if no apiKey or measurementId in config', () => {
      const app = getFakeApp({ appId: fakeAppParams.appId });
      const installations = getFakeInstallations();
      expect(() => analyticsFactory(app, installations)).to.throw(
        AnalyticsError.NO_API_KEY
      );
    });
    it('Warns if config has no apiKey but does have a measurementId', () => {
      const warnStub = stub(console, 'warn');
      const app = getFakeApp({
        appId: fakeAppParams.appId,
        measurementId: fakeMeasurementId
      });
      const installations = getFakeInstallations();
      analyticsFactory(app, installations);
      expect(warnStub.args[0][1]).to.include(
        `Falling back to the measurement ID ${fakeMeasurementId}`
      );
      warnStub.restore();
    });
    it('Warns if cookies are not enabled', () => {
      const warnStub = stub(console, 'warn');
      const cookieStub = stub(navigator, 'cookieEnabled').value(false);
      const app = getFakeApp({
        appId: fakeAppParams.appId,
        apiKey: fakeAppParams.apiKey
      });
      const installations = getFakeInstallations();
      analyticsFactory(app, installations);
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.COOKIES_NOT_ENABLED
      );
      warnStub.restore();
      cookieStub.restore();
    });
    it('Warns if browser extension environment', () => {
      const warnStub = stub(console, 'warn');
      window.chrome = { runtime: { id: 'blah' } };
      const app = getFakeApp({
        appId: fakeAppParams.appId,
        apiKey: fakeAppParams.apiKey
      });
      const installations = getFakeInstallations();
      analyticsFactory(app, installations);
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.INVALID_ANALYTICS_CONTEXT
      );
      warnStub.restore();
      window.chrome = undefined;
    });
    it('Warns if indexedDB does not exist', () => {
      const warnStub = stub(console, 'warn');
      const idbStub = stub(window, 'indexedDB').value(undefined);
      const app = getFakeApp({
        appId: fakeAppParams.appId,
        apiKey: fakeAppParams.apiKey
      });
      const installations = getFakeInstallations();
      analyticsFactory(app, installations);
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.INDEXED_DB_UNSUPPORTED
      );
      warnStub.restore();
      idbStub.restore();
    });
    it('Throws if creating an instance with already-used appId', () => {
      const app = getFakeApp(fakeAppParams);
      const installations = getFakeInstallations();
      resetGlobalVars(false, { [fakeAppParams.appId]: Promise.resolve() });
      expect(() => analyticsFactory(app, installations)).to.throw(
        AnalyticsError.ALREADY_EXISTS
      );
    });
  });
  describe('Standard app, page already has user gtag script', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    let fidDeferred: Deferred<void>;
    const gtagStub: SinonStub = stub();
    before(() => {
      clock = useFakeTimers();
      resetGlobalVars();
      app = getFakeApp(fakeAppParams);
      fidDeferred = new Deferred<void>();
      const installations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      window['gtag'] = gtagStub;
      window['dataLayer'] = [];
      stubFetch(200, { measurementId: fakeMeasurementId });
      stubIdbOpen();
      analyticsInstance = analyticsFactory(app, installations);
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
      analyticsInstance.logEvent(EventName.ADD_PAYMENT_INFO, {
        currency: 'USD'
      });
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
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
        EventName.ADD_PAYMENT_INFO,
        {
          'send_to': 'abcd-efgh',
          currency: 'USD'
        }
      );
    });
    it('setCurrentScreen() method exists on instance', () => {
      expect(analyticsInstance.setCurrentScreen).to.be.instanceOf(Function);
    });
    it('setUserId() method exists on instance', () => {
      expect(analyticsInstance.setUserId).to.be.instanceOf(Function);
    });
    it('setUserProperties() method exists on instance', () => {
      expect(analyticsInstance.setUserProperties).to.be.instanceOf(Function);
    });
    it('setAnalyticsCollectionEnabled() method exists on instance', () => {
      expect(analyticsInstance.setAnalyticsCollectionEnabled).to.be.instanceOf(
        Function
      );
    });
  });

  describe('Standard app, indexedDB.open not available', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    let fidDeferred: Deferred<void>;
    const gtagStub: SinonStub = stub();
    let warnStub: SinonStub;
    before(() => {
      clock = useFakeTimers();
      resetGlobalVars();
      app = getFakeApp(fakeAppParams);
      fidDeferred = new Deferred<void>();
      const installations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      window['gtag'] = gtagStub;
      window['dataLayer'] = [];
      stubFetch(200, { measurementId: fakeMeasurementId });
      warnStub = stub(console, 'warn');
      idbOpenStub = stub(indexedDB, 'open').throws('idb open error');
      analyticsInstance = analyticsFactory(app, installations);
    });
    after(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
      fetchStub.restore();
      clock.restore();
      idbOpenStub.restore();
      warnStub.restore();
    });
    it('Does not call gtag on logEvent but does not throw', async () => {
      analyticsInstance.logEvent(EventName.ADD_PAYMENT_INFO, {
        currency: 'USD'
      });
      // Clear promise chain started by logEvent.
      await clock.runAllAsync();
      expect(gtagStub).to.not.have.been.called;
      expect(warnStub.args[0][1]).to.include(
        AnalyticsError.INVALID_INDEXED_DB_CONTEXT
      );
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
      const installations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      window[customGtagName] = gtagStub;
      window[customDataLayerName] = [];
      analyticsSettings({
        dataLayerName: customDataLayerName,
        gtagName: customGtagName
      });
      stubIdbOpen();
      stubFetch(200, { measurementId: fakeMeasurementId });
      analyticsInstance = analyticsFactory(app, installations);
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
      analyticsInstance.logEvent(EventName.ADD_PAYMENT_INFO, {
        currency: 'USD'
      });
      // Successfully resolves fake IDB open request.
      fakeRequest.onsuccess();
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
        EventName.ADD_PAYMENT_INFO,
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
      const installations = getFakeInstallations();
      stubFetch(200, {});
      stubIdbOpen();
      analyticsInstance = analyticsFactory(app, installations);

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
