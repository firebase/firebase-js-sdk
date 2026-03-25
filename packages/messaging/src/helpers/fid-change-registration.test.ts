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
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { stub } from 'sinon';
import { expect } from 'chai';
import * as registerModule from '../api/register';
import * as installationsApi from '@firebase/installations';
import { Stub } from '../testing/sinon-types';

describe('subscribeFidChangeRegistration', () => {
  let messaging: MessagingService;
  let onIdChangeStub: Stub<typeof installationsApi.onIdChange>;
  let registerStub: Stub<typeof registerModule.register>;
  let fidChangeCallback: installationsApi.IdChangeCallbackFn | undefined;

  beforeEach(() => {
    stub(Notification, 'permission').value('granted');
    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = new FakeServiceWorkerRegistration();

    fidChangeCallback = undefined;
    onIdChangeStub = stub(installationsApi, 'onIdChange').callsFake(
      (_installations, cb: installationsApi.IdChangeCallbackFn) => {
        fidChangeCallback = cb;
        return () => {};
      }
    ) as Stub<typeof installationsApi.onIdChange>;

    registerStub = stub(registerModule, 'register').resolves() as Stub<
      typeof registerModule.register
    >;
  });

  afterEach(() => {
    onIdChangeStub.restore();
    registerStub.restore();
  });

  it('calls register when Installations invokes the FID change callback and onRegistered is set', async () => {
    messaging.onRegisteredHandler = stub();

    subscribeFidChangeRegistration(
      messaging,
      {} as installationsApi.Installations
    );

    fidChangeCallback!('new-fid');

    await Promise.resolve();

    expect(registerStub).to.have.been.calledOnceWith(messaging);
  });

  it('does not call register when onRegistered handler is not set', () => {
    messaging.onRegisteredHandler = null;

    subscribeFidChangeRegistration(
      messaging,
      {} as installationsApi.Installations
    );

    fidChangeCallback!('new-fid');

    expect(registerStub).to.not.have.been.called;
  });
});
