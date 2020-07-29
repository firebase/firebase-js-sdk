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
import { SinonStub, stub } from 'sinon';
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

let analyticsInstance: FirebaseAnalytics = {} as FirebaseAnalytics;
const fakeMeasurementId = 'abcd-efgh';
const fakeAppParams = { appId: 'abcdefgh12345:23405', apiKey: 'AAbbCCdd12345' };
const gtagStub: SinonStub = stub();
let fetchStub: SinonStub = stub();
const customGtagName = 'customGtag';
const customDataLayerName = 'customDataLayer';

function stubFetch(status: number, body: object): void {
  fetchStub = stub(window, 'fetch');
  const mockResponse = new Response(JSON.stringify(body), {
    status
  });
  fetchStub.returns(Promise.resolve(mockResponse));
}

describe('FirebaseAnalytics instance tests', () => {
  it('Throws if no appId in config', () => {
    const app = getFakeApp({ apiKey: fakeAppParams.apiKey });
    const installations = getFakeInstallations();
    expect(() => analyticsFactory(app, installations)).to.throw(
      'field is empty'
    );
  });
  it('Throws if no apiKey and no measurementId in config', () => {
    const app = getFakeApp({ appId: fakeAppParams.appId });
    const installations = getFakeInstallations();
    expect(() => analyticsFactory(app, installations)).to.throw(
      'field is empty'
    );
  });
  it('Warns if config has no apiKey but does have a measurementId', () => {
    const consoleStub = stub(console, 'warn');
    const app = getFakeApp({
      appId: fakeAppParams.appId,
      measurementId: fakeMeasurementId
    });
    const installations = getFakeInstallations();
    stubFetch(200, { measurementId: fakeMeasurementId });
    analyticsFactory(app, installations);
    expect(consoleStub.args[0][1]).to.include(fakeMeasurementId);
    consoleStub.restore();
    fetchStub.restore();
  });
  it('Throws if creating an instance with already-used analytics ID', () => {
    const app = getFakeApp(fakeAppParams);
    const installations = getFakeInstallations();
    resetGlobalVars(false, { [fakeAppParams.appId]: Promise.resolve() });
    stubFetch(200, { measurementId: fakeMeasurementId });
    expect(() => analyticsFactory(app, installations)).to.throw(
      'already exists'
    );
    fetchStub.restore();
  });
  // eslint-disable-next-line no-restricted-properties
  describe.only('Standard app, page already has user gtag script', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    let fidDeferred: Deferred<void>;
    before(() => {
      resetGlobalVars();

      app = getFakeApp(fakeAppParams);
      fidDeferred = new Deferred<void>();
      window['gtag'] = gtagStub;
      window['dataLayer'] = [];
    });
    after(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
    });
    afterEach(() => {
      gtagStub.reset();
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      const installations = getFakeInstallations('fid-1234', () =>
        fidDeferred.resolve()
      );
      stubFetch(200, { measurementId: fakeMeasurementId });
      analyticsInstance = analyticsFactory(app, installations);
      analyticsInstance.logEvent(EventName.ADD_PAYMENT_INFO, {
        currency: 'USD'
      });
      // Clear event stack of initialization promise.
      const { dynamicConfigPromisesList } = getGlobalVars();
      await Promise.all(Object.values(dynamicConfigPromisesList));
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
    it('Contains reference to parent app', () => {
      expect(analyticsInstance.app).to.equal(app);
    });
  });

  describe('Page has user gtag script with custom gtag and dataLayer names', () => {
    let fidDeferred: Deferred<void>;
    before(() => {
      resetGlobalVars();
      const app = getFakeApp(fakeAppParams);
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
      stubFetch(200, { measurementId: fakeMeasurementId });
      analyticsInstance = analyticsFactory(app, installations);
    });
    after(() => {
      delete window[customGtagName];
      delete window[customDataLayerName];
      removeGtagScript();
      fetchStub.restore();
    });
    afterEach(() => {
      gtagStub.reset();
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      analyticsInstance.logEvent(EventName.ADD_PAYMENT_INFO, {
        currency: 'USD'
      });
      // Clear event stack of initialization promise.
      const { dynamicConfigPromisesList } = getGlobalVars();
      await Promise.all(Object.values(dynamicConfigPromisesList));
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
    before(() => {
      resetGlobalVars();
      const app = getFakeApp(fakeAppParams);
      const installations = getFakeInstallations();
      analyticsInstance = analyticsFactory(app, installations);
    });
    after(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
      fetchStub.restore();
    });
    it('Adds the script tag to the page', async () => {
      stubFetch(200, {});
      const { initializationPromisesMap } = getGlobalVars();
      await initializationPromisesMap[fakeMeasurementId];
      expect(findGtagScriptOnPage()).to.not.be.null;
      expect(typeof window['gtag']).to.equal('function');
      expect(Array.isArray(window['dataLayer'])).to.be.true;
    });
  });
});
