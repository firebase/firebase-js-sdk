/**
 * @license
 * Copyright 2020 Google LLC
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

import '../testing/setup';

import { register } from './register';
import { MessagingService } from '../messaging-service';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { stub } from 'sinon';
import { expect } from 'chai';
import * as updateVapidKeyModule from '../helpers/updateVapidKey';
import * as updateSwRegModule from '../helpers/updateSwReg';
import { Stub } from '../testing/sinon-types';

describe('register', () => {
  let messaging: MessagingService;
  let updateVapidKeyStub: Stub<typeof updateVapidKeyModule.updateVapidKey>;
  let updateSwRegStub: Stub<typeof updateSwRegModule.updateSwReg>;

  beforeEach(() => {
    stub(Notification, 'permission').value('granted');
    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = new FakeServiceWorkerRegistration();

    updateVapidKeyStub = stub(
      updateVapidKeyModule,
      'updateVapidKey'
    ).resolves() as Stub<typeof updateVapidKeyModule.updateVapidKey>;
    updateSwRegStub = stub(
      updateSwRegModule,
      'updateSwReg'
    ).resolves() as Stub<typeof updateSwRegModule.updateSwReg>;
  });

  it('calls updateVapidKey and updateSwReg then delivers FID via onRegisteredHandler', async () => {
    const onRegisteredSpy = stub();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);

    expect(updateVapidKeyStub).to.have.been.calledOnceWith(messaging, undefined);
    expect(updateSwRegStub).to.have.been.calledOnceWith(
      messaging,
      undefined
    );
    expect(onRegisteredSpy).to.have.been.calledOnceWith('FID');
  });

  it('passes options to updateVapidKey and updateSwReg when provided', async () => {
    const swReg = new FakeServiceWorkerRegistration();
    const options = {
      vapidKey: 'custom-vapid',
      serviceWorkerRegistration: swReg
    };

    await register(messaging, options);

    expect(updateVapidKeyStub).to.have.been.calledOnceWith(
      messaging,
      'custom-vapid'
    );
    expect(updateSwRegStub).to.have.been.calledOnceWith(messaging, swReg);
  });

  it('does not throw when onRegisteredHandler is null', async () => {
    messaging.onRegisteredHandler = null;

    await expect(register(messaging)).to.not.be.rejected;
    expect(updateVapidKeyStub).to.have.been.calledOnce;
    expect(updateSwRegStub).to.have.been.calledOnce;
  });

  it('calls observer.next when onRegisteredHandler is an observer object', async () => {
    const observer = {
      next: stub(),
      error: stub(),
      complete: stub()
    };
    messaging.onRegisteredHandler = observer;

    await register(messaging);

    expect(observer.next).to.have.been.calledOnceWith('FID');
  });

  it('uses FID from installations.getId()', async () => {
    const customFid = 'custom-installation-id';
    const customInstallations = getFakeInstallations();
    stub(customInstallations, 'getId').resolves(customFid);
    messaging = new MessagingService(
      getFakeApp(),
      customInstallations,
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = new FakeServiceWorkerRegistration();

    const onRegisteredSpy = stub();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);

    expect(onRegisteredSpy).to.have.been.calledOnceWith(customFid);
  });
});
