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
import { SinonFakeTimers, stub, useFakeTimers } from 'sinon';
import '../testing/setup';
import { getFullApp } from '../testing/get-fake-firebase-services';
import { getAnalytics, initializeAnalytics } from './api';
import { FirebaseApp, deleteApp } from '@firebase/app-exp';
import { AnalyticsError } from './errors';
import { removeGtagScript } from '../testing/gtag-script-util';
import * as getConfig from './get-config';
const fakeAppParams = { appId: 'abcdefgh12345:23405', apiKey: 'AAbbCCdd12345' };

const fakeDynamicConfig = stub(
  getConfig,
  'fetchDynamicConfigWithRetry'
).resolves({
  appId: 'FAKE_APP_ID',
  measurementId: 'FAKE_MEASUREMENT_ID'
});

// Fake indexedDB.open() request
let fakeRequest = {
  onsuccess: () => {},
  result: {
    close: () => {}
  }
};
let idbOpenStub = stub();

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

describe('FirebaseAnalytics API tests', () => {
  let app: FirebaseApp;
  let clock: SinonFakeTimers;

  beforeEach(() => {
    stubIdbOpen();
    clock = useFakeTimers();
  });

  afterEach(async () => {
    clock.restore();
    idbOpenStub.restore();
    removeGtagScript();
    if (app) {
      return deleteApp(app);
    }
  });

  after(() => {
    delete window['gtag'];
    delete window['dataLayer'];
    fakeDynamicConfig.restore();
  });

  it('initializeAnalytics() returns an Analytics instance', async () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = initializeAnalytics(app);
    expect(analyticsInstance.app).to.equal(app);
    await clock.runAllAsync();
  });
  it('initializeAnalytics() with same (no) options returns same instance', async () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = initializeAnalytics(app);
    const newInstance = initializeAnalytics(app);
    expect(analyticsInstance).to.equal(newInstance);
    await clock.runAllAsync();
  });
  it('initializeAnalytics() with same options returns same instance', () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = initializeAnalytics(app, {
      config: { 'send_page_view': false }
    });
    const newInstance = initializeAnalytics(app, {
      config: { 'send_page_view': false }
    });
    expect(analyticsInstance).to.equal(newInstance);
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
    ).to.throw(AnalyticsError.ALREADY_INITIALIZED);
  });
  it('initializeAnalytics() with different options (one undefined) throws', () => {
    app = getFullApp(fakeAppParams);
    initializeAnalytics(app);
    expect(() =>
      initializeAnalytics(app, {
        config: { 'send_page_view': true }
      })
    ).to.throw(AnalyticsError.ALREADY_INITIALIZED);
  });
  it('getAnalytics() returns same instance created by previous getAnalytics()', () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = getAnalytics(app);
    expect(getAnalytics(app)).to.equal(analyticsInstance);
  });
  it('getAnalytics() returns same instance created by initializeAnalytics()', () => {
    app = getFullApp(fakeAppParams);
    const analyticsInstance = initializeAnalytics(app);
    expect(getAnalytics(app)).to.equal(analyticsInstance);
  });
});
