/**
 * @license
 * Copyright 2026 Google LLC
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
import { stub, useFakeTimers } from 'sinon';
import { expect } from 'chai';
import * as updateVapidKeyModule from '../helpers/updateVapidKey';
import * as updateSwRegModule from '../helpers/updateSwReg';
import { Stub } from '../testing/sinon-types';
import * as requestsModule from '../internals/requests';

describe('register', () => {
  let messaging: MessagingService;
  let updateVapidKeyStub: Stub<typeof updateVapidKeyModule.updateVapidKey>;
  let updateSwRegStub: Stub<typeof updateSwRegModule.updateSwReg>;
  let requestCreateRegistrationStub: Stub<
    typeof requestsModule.requestCreateRegistration
  >;
  let clock: ReturnType<typeof useFakeTimers>;

  beforeEach(() => {
    clock = useFakeTimers({
      now: 1_700_000_000_000,
      toFake: ['Date', 'setTimeout', 'clearTimeout']
    });
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
    updateSwRegStub = stub(updateSwRegModule, 'updateSwReg').resolves() as Stub<
      typeof updateSwRegModule.updateSwReg
    >;

    requestCreateRegistrationStub = stub(
      requestsModule,
      'requestCreateRegistration'
    ).resolves();
  });

  afterEach(() => {
    clock.restore();
  });

  it('calls updateVapidKey and updateSwReg then delivers FID via onRegisteredHandler', async () => {
    const onRegisteredSpy = stub();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);

    expect(updateVapidKeyStub).to.have.been.calledOnceWith(
      messaging,
      undefined
    );
    expect(updateSwRegStub).to.have.been.calledOnceWith(messaging, undefined);
    expect(onRegisteredSpy).to.have.been.calledOnceWith('FID');
    expect(requestCreateRegistrationStub).to.have.been.calledOnce;
  });

  it('passes options to updateVapidKey and updateSwReg when provided', async () => {
    messaging.onRegisteredHandler = stub();
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

  it('throws when no onRegistered callback handler is provided or registered', async () => {
    messaging.onRegisteredHandler = null;

    await expect(register(messaging)).to.be.rejectedWith(
      'messaging/invalid-on-registered-handler'
    );
    expect(updateVapidKeyStub).to.not.have.been.called;
    expect(updateSwRegStub).to.not.have.been.called;
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

  it('does not call onRegisteredHandler again when FID unchanged', async () => {
    const onRegisteredSpy = stub();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);
    await register(messaging);

    expect(onRegisteredSpy).to.have.been.calledOnceWith('FID');
    expect(requestCreateRegistrationStub).to.have.been.calledOnce;
  });

  it('refreshes registration weekly even when FID unchanged, without re-notifying onRegisteredHandler', async () => {
    const onRegisteredSpy = stub();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);
    expect(onRegisteredSpy).to.have.been.calledOnceWith('FID');
    expect(requestCreateRegistrationStub).to.have.been.calledOnce;

    // 8 days later: refresh should run but onRegistered should not fire again.
    clock.tick(8 * 24 * 60 * 60 * 1000);
    await register(messaging);

    expect(onRegisteredSpy).to.have.been.calledOnce;
    expect(requestCreateRegistrationStub).to.have.been.calledTwice;
  });

  it('calls onRegisteredHandler when FID changed', async () => {
    const customInstallations = getFakeInstallations();
    const getIdStub = stub(customInstallations, 'getId')
      .onFirstCall()
      .resolves('FID_OLD')
      .onSecondCall()
      .resolves('FID_NEW');
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
    expect(onRegisteredSpy).to.have.been.calledOnceWith('FID_OLD');

    await register(messaging);
    expect(getIdStub).to.have.been.calledTwice;
    expect(onRegisteredSpy).to.have.been.calledTwice;
    expect(onRegisteredSpy.getCall(1)).to.have.been.calledWith('FID_NEW');
    expect(messaging.lastNotifiedFid).to.equal('FID_NEW');
    expect(requestCreateRegistrationStub).to.have.been.calledTwice;
  });

  it('calls onRegisteredHandler only when FID changes across three register calls', async () => {
    const customInstallations = getFakeInstallations();
    const getIdStub = stub(customInstallations, 'getId')
      .onFirstCall()
      .resolves('FID_A')
      .onSecondCall()
      .resolves('FID_B')
      .onThirdCall()
      .resolves('FID_B');
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
    expect(onRegisteredSpy).to.have.been.calledOnceWith('FID_A');

    await register(messaging);
    expect(onRegisteredSpy).to.have.been.calledTwice;
    expect(onRegisteredSpy.getCall(1)).to.have.been.calledWith('FID_B');

    await register(messaging);
    expect(getIdStub).to.have.been.calledThrice;
    expect(onRegisteredSpy).to.have.been.calledTwice;
    expect(messaging.lastNotifiedFid).to.equal('FID_B');
    expect(requestCreateRegistrationStub).to.have.been.calledTwice;
  });
});
