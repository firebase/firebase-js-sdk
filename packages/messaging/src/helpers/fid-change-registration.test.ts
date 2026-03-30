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

import { subscribeFidChangeRegistration } from './fid-change-registration';
import { MessagingService } from '../messaging-service';
import {
  getFakeAnalyticsProvider,
  getFakeApp
} from '../testing/fakes/firebase-dependencies';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { stub } from 'sinon';
import { expect } from 'chai';
import * as installationsApi from '@firebase/installations';
import * as requestsModule from '../internals/requests';
import { Stub } from '../testing/sinon-types';
import { _FirebaseInstallationsInternal } from '@firebase/installations';

describe('subscribeFidChangeRegistration', () => {
  let messaging: MessagingService;
  /** Same object as `messaging.firebaseDependencies.installations`; `getId` tracks simulated rotation. */
  let installationsInternal: _FirebaseInstallationsInternal;
  let currentFid: string;
  let installations: installationsApi.Installations;
  let onIdChangeStub: Stub<typeof installationsApi.onIdChange>;
  let requestCreateRegistrationStub: Stub<
    typeof requestsModule.requestCreateRegistration
  >;
  let fidChangeCallback: installationsApi.IdChangeCallbackFn | undefined;
  let unsubscribeStub: ReturnType<typeof stub>;

  beforeEach(() => {
    stub(Notification, 'permission').value('granted');
    const app = getFakeApp();
    currentFid = 'fid-before-rotation';
    installationsInternal = {
      getId: async () => currentFid,
      getToken: async () => 'authToken'
    };
    installations = { app } as installationsApi.Installations;
    messaging = new MessagingService(
      app,
      installationsInternal,
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    // Test-only: Fake registration is structurally compatible for our usage here.
    messaging.swRegistration =
      new FakeServiceWorkerRegistration() as unknown as ServiceWorkerRegistration;

    fidChangeCallback = undefined;
    unsubscribeStub = stub();
    onIdChangeStub = stub(installationsApi, 'onIdChange').callsFake(
      (_installations, cb: installationsApi.IdChangeCallbackFn) => {
        fidChangeCallback = cb;
        return unsubscribeStub;
      }
    ) as Stub<typeof installationsApi.onIdChange>;

    requestCreateRegistrationStub = stub(
      requestsModule,
      'requestCreateRegistration'
    ).resolves() as Stub<typeof requestsModule.requestCreateRegistration>;
  });

  afterEach(() => {
    onIdChangeStub.restore();
    requestCreateRegistrationStub.restore();
  });

  it('runs real register when Installations invokes the FID change callback and delivers the new FID via onRegistered', async () => {
    const onRegisteredSpy = stub();
    messaging.onRegisteredHandler = onRegisteredSpy;
    messaging.lastNotifiedFid = 'fid-before-rotation';

    subscribeFidChangeRegistration(messaging, installations);

    currentFid = 'fid-after-rotation';
    fidChangeCallback!('fid-after-rotation');

    // `register()` only assigns `_registerNotifyChain` after updateVapidKey/updateSwReg; wait for
    // that chain (and the inner getId/registerFcm work) to finish.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await messaging._registerNotifyChain;

    expect(onRegisteredSpy).to.have.been.calledOnceWith('fid-after-rotation');
    expect(requestCreateRegistrationStub).to.have.been.calledOnce;
  });

  it('does not call register when onRegistered handler is not set', async () => {
    messaging.onRegisteredHandler = null;

    subscribeFidChangeRegistration(messaging, installations);

    currentFid = 'new-fid';
    fidChangeCallback!('new-fid');

    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await messaging._registerNotifyChain;

    expect(requestCreateRegistrationStub).to.not.have.been.called;
  });

  it('does not call the unsubscribe function when FID changes (unsubscribe is only for teardown)', async () => {
    messaging.onRegisteredHandler = stub();

    const unsubscribe = subscribeFidChangeRegistration(
      messaging,
      installations
    );
    expect(unsubscribe).to.equal(unsubscribeStub);

    messaging.lastNotifiedFid = 'a';
    currentFid = 'b';
    fidChangeCallback!('b');
    currentFid = 'c';
    fidChangeCallback!('c');

    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await messaging._registerNotifyChain;

    expect(unsubscribeStub).to.not.have.been.called;
  });
});
