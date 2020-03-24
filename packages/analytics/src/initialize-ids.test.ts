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
import { initializeIds } from './initialize-ids';
import {
  getFakeApp,
  getFakeInstallations
} from '../testing/get-fake-firebase-services';
import { GtagCommand } from './constants';
import { DynamicConfig } from '@firebase/analytics-types';
import { FirebaseInstallations } from '@firebase/installations-types';
import { FirebaseApp } from '@firebase/app-types';
import { Deferred } from '@firebase/util';

const fakeMeasurementId = 'abcd-efgh-ijkl';
const fakeFid = 'fid-1234-zyxw';
const fakeAppId = 'abcdefgh12345:23405';
const fakeAppParams = { appId: fakeAppId, apiKey: 'AAbbCCdd12345' };
let fetchStub: SinonStub;

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

describe('initializeIds()', () => {
  const gtagStub: SinonStub = stub();
  const dynamicPromisesList: Array<Promise<DynamicConfig>> = [];
  const measurementIdToAppId: { [key: string]: string } = {};
  let app: FirebaseApp;
  let installations: FirebaseInstallations;
  let fidDeferred: Deferred<string>;
  beforeEach(() => {
    fidDeferred = new Deferred<string>();
    app = getFakeApp(fakeAppParams);
    installations = getFakeInstallations(fakeFid, fidDeferred.resolve);
  });
  afterEach(() => {
    fetchStub.restore();
  });
  it('gets FID and measurement ID and calls gtag config with them', async () => {
    stubFetch();
    await initializeIds(
      app,
      dynamicPromisesList,
      measurementIdToAppId,
      installations,
      gtagStub
    );
    expect(gtagStub).to.be.calledWith(GtagCommand.CONFIG, fakeMeasurementId, {
      'firebase_id': fakeFid,
      'origin': 'firebase',
      update: true
    });
  });
  it('puts dynamic fetch promise into dynamic promises list', async () => {
    stubFetch();
    await initializeIds(
      app,
      dynamicPromisesList,
      measurementIdToAppId,
      installations,
      gtagStub
    );
    const dynamicPromiseResult = await dynamicPromisesList[0];
    expect(dynamicPromiseResult.measurementId).to.equal(fakeMeasurementId);
    expect(dynamicPromiseResult.appId).to.equal(fakeAppId);
  });
  it('puts dynamically fetched measurementId into lookup table', async () => {
    stubFetch();
    await initializeIds(
      app,
      dynamicPromisesList,
      measurementIdToAppId,
      installations,
      gtagStub
    );
    expect(measurementIdToAppId[fakeMeasurementId]).to.equal(fakeAppId);
  });
});
