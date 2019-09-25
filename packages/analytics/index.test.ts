/**
 * @license
 * Copyright 2019 Google Inc.
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
  resetGlobalVars
} from './index';
import { getFakeApp } from './testing/get-fake-app';
import { FirebaseApp } from '@firebase/app-types';
import { GtagCommand, EventName } from './src/constants';
import {
  findGtagScriptOnPage,
  removeGtagScript
} from './testing/gtag-script-util';

let analyticsInstance: FirebaseAnalytics = {} as FirebaseAnalytics;
const analyticsId = 'abcd-efgh';
const gtagStub: SinonStub = stub();
const customGtagName = 'customGtag';
const customDataLayerName = 'customDataLayer';

describe('FirebaseAnalytics instance tests', () => {
  it('Throws if no analyticsId in config', () => {
    const app = getFakeApp();
    expect(() => analyticsFactory(app, () => {})).to.throw('field is empty');
  });
  it('Throws if creating an instance with already-used analytics ID', () => {
    const app = getFakeApp(analyticsId);
    resetGlobalVars(false, { [analyticsId]: Promise.resolve() });
    expect(() => analyticsFactory(app, () => {})).to.throw('already exists');
  });
  describe('Standard app, page already has user gtag script', () => {
    let app: FirebaseApp = {} as FirebaseApp;
    before(() => {
      resetGlobalVars();
      app = getFakeApp(analyticsId);
      window['gtag'] = gtagStub;
      window['dataLayer'] = [];
      analyticsInstance = analyticsFactory(app, () => {});
    });
    after(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
    });
    afterEach(() => {
      gtagStub.reset();
    });
    it('Contains reference to parent app', () => {
      expect(analyticsInstance.app).to.equal(app);
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      analyticsInstance.logEvent(EventName.ADD_PAYMENT_INFO, {
        currency: 'USD'
      });
      // Clear event stack of async FID call.
      await Promise.resolve();
      expect(gtagStub).to.have.been.calledWith('js');
      expect(gtagStub).to.have.been.calledWith(
        GtagCommand.CONFIG,
        analyticsId,
        {
          'firebase_id': 'fid-1234',
          origin: 'firebase',
          update: true
        }
      );
      // Clear event stack of initialization promise.
      await Promise.resolve();
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

  describe('Page has user gtag script with custom gtag and dataLayer names', () => {
    before(() => {
      resetGlobalVars();
      const app = getFakeApp(analyticsId);
      window[customGtagName] = gtagStub;
      window[customDataLayerName] = [];
      analyticsSettings({
        dataLayerName: customDataLayerName,
        gtagName: customGtagName
      });
      analyticsInstance = analyticsFactory(app, () => {});
    });
    after(() => {
      delete window[customGtagName];
      delete window[customDataLayerName];
      removeGtagScript();
    });
    afterEach(() => {
      gtagStub.reset();
    });
    it('Calls gtag correctly on logEvent (instance)', async () => {
      analyticsInstance.logEvent(EventName.ADD_PAYMENT_INFO, {
        currency: 'USD'
      });
      // Clear event stack of async FID call.
      await Promise.resolve();
      expect(gtagStub).to.have.been.calledWith('js');
      expect(gtagStub).to.have.been.calledWith(
        GtagCommand.CONFIG,
        analyticsId,
        {
          'firebase_id': 'fid-1234',
          origin: 'firebase',
          update: true
        }
      );
      // Clear event stack of initialization promise.
      await Promise.resolve();
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
      const app = getFakeApp(analyticsId);
      analyticsInstance = analyticsFactory(app, () => {});
    });
    after(() => {
      delete window['gtag'];
      delete window['dataLayer'];
      removeGtagScript();
    });
    it('Adds the script tag to the page', () => {
      expect(findGtagScriptOnPage()).to.not.be.null;
    });
  });
});
