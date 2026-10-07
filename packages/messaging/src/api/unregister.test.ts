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

import { expect } from 'chai';
import { SinonStub, spy, stub } from 'sinon';
import { MessagingService } from '../messaging-service';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { Stub } from '../testing/sinon-types';
import { unregister } from './unregister';
import * as idbManager from '../internals/idb-manager';
import * as requestsModule from '../internals/requests';

describe('unregister', () => {
  let messaging: MessagingService;

  beforeEach(() => {
    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
  });

  it('deletes the stored FID registration and notifies onUnregisteredHandler', async () => {
    const fid = 'FID_STORED';
    const onUnregisteredSpy = stub();
    messaging.onUnregisteredHandler = onUnregisteredSpy;

    const dbGetStub = stub(idbManager, 'dbGetFidRegistration').resolves({
      fid,
      lastRegisterTime: Date.now()
    });
    const dbRemoveStub = stub(idbManager, 'dbRemoveFidRegistration').resolves();
    const deleteRegStub = stub(
      requestsModule,
      'requestDeleteRegistration'
    ).resolves();
    const getIdStub = stub(
      messaging.firebaseDependencies.installations,
      'getId'
    ).resolves('FID_SHOULD_NOT_BE_USED');

    await unregister(messaging);

    expect(dbGetStub).to.have.been.calledOnce;
    expect(deleteRegStub).to.have.been.calledOnceWith(
      messaging.firebaseDependencies,
      fid
    );
    expect(dbRemoveStub).to.have.been.calledOnce;
    expect(getIdStub).to.not.have.been.called;
    expect(onUnregisteredSpy).to.have.been.calledOnceWith(fid);
  });

  it('falls back to installations.getId() when no stored FID registration exists', async () => {
    const fid = 'FID_FROM_INSTALLATIONS';
    messaging.onUnregisteredHandler = stub();

    const dbGetStub = stub(idbManager, 'dbGetFidRegistration').resolves(
      undefined
    );
    const dbRemoveStub = stub(idbManager, 'dbRemoveFidRegistration').resolves();
    const deleteRegStub = stub(
      requestsModule,
      'requestDeleteRegistration'
    ).resolves();
    const getIdStub = stub(
      messaging.firebaseDependencies.installations,
      'getId'
    ).resolves(fid);

    await unregister(messaging);

    expect(dbGetStub).to.have.been.calledOnce;
    expect(getIdStub).to.have.been.calledOnce;
    expect(deleteRegStub).to.have.been.calledOnceWith(
      messaging.firebaseDependencies,
      fid
    );
    expect(dbRemoveStub).to.have.been.calledOnce;
  });

  it('does not throw if onUnregisteredHandler is not set', async () => {
    const fid = 'FID';
    messaging.onUnregisteredHandler = null;

    stub(idbManager, 'dbGetFidRegistration').resolves({
      fid,
      lastRegisterTime: Date.now()
    });
    stub(idbManager, 'dbRemoveFidRegistration').resolves();
    stub(requestsModule, 'requestDeleteRegistration').resolves();

    await unregister(messaging);
  });

  it('cleans up legacy FCM token stored via getToken() without touching legacy delete token request', async () => {
    const fid = 'FID_STORED';
    const onUnregisteredSpy = stub();
    messaging.onUnregisteredHandler = onUnregisteredSpy;

    stub(idbManager, 'dbGetFidRegistration').resolves({
      fid,
      lastRegisterTime: Date.now()
    });
    stub(idbManager, 'dbRemoveFidRegistration').resolves();
    const deleteRegStub = stub(
      requestsModule,
      'requestDeleteRegistration'
    ).resolves();

    // Guard rails: unregister() should clean up legacy token DB, but must not call legacy
    // requestDeleteToken(). The DB cleanup is best-effort.
    const legacyDbRemoveStub = stub(idbManager, 'dbRemove').resolves();
    const legacyDeleteTokenReqStub = stub(
      requestsModule,
      'requestDeleteToken'
    ).throws(new Error('unexpected requestDeleteToken()'));

    await unregister(messaging);

    expect(deleteRegStub).to.have.been.calledOnceWith(
      messaging.firebaseDependencies,
      fid
    );
    expect(onUnregisteredSpy).to.have.been.calledOnceWith(fid);
    expect(legacyDbRemoveStub).to.have.been.calledOnceWith(
      messaging.firebaseDependencies
    );
    expect(legacyDeleteTokenReqStub).to.not.have.been.called;
  });

  it('does not notify onUnregisteredHandler when delete registration fails', async () => {
    const fid = 'FID';
    const onUnregisteredSpy = stub();
    messaging.onUnregisteredHandler = onUnregisteredSpy;

    stub(idbManager, 'dbGetFidRegistration').resolves({
      fid,
      lastRegisterTime: Date.now()
    });
    const dbRemoveStub = stub(idbManager, 'dbRemoveFidRegistration').resolves();
    stub(requestsModule, 'requestDeleteRegistration').rejects(
      new Error('boom')
    );

    await expect(unregister(messaging)).to.be.rejectedWith('boom');
    expect(onUnregisteredSpy).to.not.have.been.called;
    expect(dbRemoveStub).to.not.have.been.called;
  });

  describe('push subscription', () => {
    let swRegistration: FakeServiceWorkerRegistration;
    let onUnregisteredSpy: SinonStub;
    let deleteRegStub: Stub<
      (typeof requestsModule)['requestDeleteRegistration']
    >;
    let dbRemoveFidRegStub: Stub<
      (typeof idbManager)['dbRemoveFidRegistration']
    >;
    let dbRemoveStub: Stub<(typeof idbManager)['dbRemove']>;

    beforeEach(() => {
      swRegistration = new FakeServiceWorkerRegistration();
      messaging.swRegistration = swRegistration;
      onUnregisteredSpy = stub();
      messaging.onUnregisteredHandler = onUnregisteredSpy;

      stub(idbManager, 'dbGetFidRegistration').resolves({
        fid: 'FID',
        lastRegisterTime: Date.now()
      });
      dbRemoveFidRegStub = stub(
        idbManager,
        'dbRemoveFidRegistration'
      ).resolves();
      dbRemoveStub = stub(idbManager, 'dbRemove').resolves();
      deleteRegStub = stub(
        requestsModule,
        'requestDeleteRegistration'
      ).resolves();
    });

    it('unsubscribes the push subscription after deleting the registration', async () => {
      const subscription = await swRegistration.pushManager.subscribe();
      const unsubscribeSpy = spy(subscription, 'unsubscribe');

      await unregister(messaging);

      expect(unsubscribeSpy).to.have.been.calledOnce;
      expect(unsubscribeSpy).to.have.been.calledAfter(deleteRegStub);
      expect(unsubscribeSpy).to.have.been.calledAfter(dbRemoveFidRegStub);
      expect(unsubscribeSpy).to.have.been.calledAfter(dbRemoveStub);
      expect(unsubscribeSpy).to.have.been.calledBefore(onUnregisteredSpy);
      expect(onUnregisteredSpy).to.have.been.calledOnceWith('FID');
    });

    it('does not unsubscribe the push subscription when deleting the registration fails', async () => {
      const subscription = await swRegistration.pushManager.subscribe();
      const unsubscribeSpy = spy(subscription, 'unsubscribe');
      deleteRegStub.rejects(new Error('boom'));

      await expect(unregister(messaging)).to.be.rejectedWith('boom');

      expect(unsubscribeSpy).to.not.have.been.called;
      expect(onUnregisteredSpy).to.not.have.been.called;
    });

    it('still resolves and notifies onUnregistered when unsubscribing fails', async () => {
      const subscription = await swRegistration.pushManager.subscribe();
      const error = new Error('unsubscribe failed');
      const unsubscribeStub = stub(subscription, 'unsubscribe').rejects(error);
      const consoleWarnStub = stub(console, 'warn');

      await unregister(messaging);

      expect(unsubscribeStub).to.have.been.calledOnce;
      expect(consoleWarnStub).to.have.been.calledOnce;
      expect(consoleWarnStub.firstCall.args).to.include(error);
      expect(onUnregisteredSpy).to.have.been.calledOnceWith('FID');
    });
  });
});
