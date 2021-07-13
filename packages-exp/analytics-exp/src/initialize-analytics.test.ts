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
import { SinonStub, stub } from 'sinon';
import '../testing/setup';
import { initializeAnalytics } from './initialize-analytics';
import {
  getFakeApp,
  getFakeInstallations
} from '../testing/get-fake-firebase-services';
import { GtagCommand } from './constants';
import { DynamicConfig } from './types';
import { FirebaseApp } from '@firebase/app-exp';
import { Deferred } from '@firebase/util';
import { _FirebaseInstallationsInternal } from '@firebase/installations-exp';
import { removeGtagScript } from '../testing/gtag-script-util';

const fakeMeasurementId = 'abcd-efgh-ijkl';
const fakeFid = 'fid-1234-zyxw';
const fakeAppId = 'abcdefgh12345:23405';
const fakeAppParams = { appId: fakeAppId, apiKey: 'AAbbCCdd12345' };
let fetchStub: SinonStub;
let fakeInstallations: _FirebaseInstallationsInternal;

function stubFetch(): void {
  fetchStub = stub(window, 'fetch');
  const mockResponse = new window.Response(
    JSON.stringify({ measurementId: fakeMeasurementId, appId: fakeAppId }),
    {
      status: 200
    }
  );
  fetchStub.returns(Promise.resolve(mockResponse));
}

describe('initializeAnalytics()', () => {
  const gtagStub: SinonStub = stub();
  const dynamicPromisesList: Array<Promise<DynamicConfig>> = [];
  const measurementIdToAppId: { [key: string]: string } = {};
  let app: FirebaseApp;
  let fidDeferred: Deferred<string>;
  beforeEach(() => {
    fidDeferred = new Deferred<string>();
    app = getFakeApp(fakeAppParams);
    fakeInstallations = getFakeInstallations(fakeFid, fidDeferred.resolve);
  });
  afterEach(() => {
    fetchStub.restore();
    removeGtagScript();
  });
  it('gets FID and measurement ID and calls gtag config with them', async () => {
    stubFetch();
    await initializeAnalytics(
      app,
      dynamicPromisesList,
      measurementIdToAppId,
      fakeInstallations,
      gtagStub,
      'dataLayer'
    );
    expect(gtagStub).to.be.calledWith(GtagCommand.CONFIG, fakeMeasurementId, {
      'firebase_id': fakeFid,
      'origin': 'firebase',
      update: true
    });
  });
  it('calls gtag config with options if provided', async () => {
    stubFetch();
    await initializeAnalytics(
      app,
      dynamicPromisesList,
      measurementIdToAppId,
      fakeInstallations,
      gtagStub,
      'dataLayer',
      { config: { 'send_page_view': false } }
    );
    expect(gtagStub).to.be.calledWith(GtagCommand.CONFIG, fakeMeasurementId, {
      'firebase_id': fakeFid,
      'origin': 'firebase',
      update: true,
      'send_page_view': false
    });
  });
  it('puts dynamic fetch promise into dynamic promises list', async () => {
    stubFetch();
    await initializeAnalytics(
      app,
      dynamicPromisesList,
      measurementIdToAppId,
      fakeInstallations,
      gtagStub,
      'dataLayer'
    );
    const dynamicPromiseResult = await dynamicPromisesList[0];
    expect(dynamicPromiseResult.measurementId).to.equal(fakeMeasurementId);
    expect(dynamicPromiseResult.appId).to.equal(fakeAppId);
  });
  it('puts dynamically fetched measurementId into lookup table', async () => {
    stubFetch();
    await initializeAnalytics(
      app,
      dynamicPromisesList,
      measurementIdToAppId,
      fakeInstallations,
      gtagStub,
      'dataLayer'
    );
    expect(measurementIdToAppId[fakeMeasurementId]).to.equal(fakeAppId);
  });
  it('warns on local/fetched measurement ID mismatch', async () => {
    stubFetch();
    const consoleStub = stub(console, 'warn');
    await initializeAnalytics(
      getFakeApp({ ...fakeAppParams, measurementId: 'old-measurement-id' }),
      dynamicPromisesList,
      measurementIdToAppId,
      fakeInstallations,
      gtagStub,
      'dataLayer'
    );
    expect(consoleStub.args[0][1]).to.include(fakeMeasurementId);
    expect(consoleStub.args[0][1]).to.include('old-measurement-id');
    expect(consoleStub.args[0][1]).to.include('does not match');
    consoleStub.restore();
  });
});
