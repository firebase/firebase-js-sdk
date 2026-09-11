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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  refreshFidRegistrationIfStored,
  subscribeFidChangeRegistration
} from './fid-change-registration';
import { MessagingService } from '../messaging-service';
import {
  getFakeAnalyticsProvider,
  getFakeApp
} from '../testing/fakes/firebase-dependencies';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import * as installationsApi from '@firebase/installations';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { dbDelete } from '../internals/idb-manager';

const {
  mockOnIdChange,
  mockRequestCreateRegistration,
  mockDbGetFidRegistration
} = vi.hoisted(() => ({
  mockOnIdChange: vi.fn(),
  mockRequestCreateRegistration: vi.fn(),
  mockDbGetFidRegistration: vi.fn()
}));

vi.mock('@firebase/installations', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@firebase/installations')>();
  return {
    ...actual,
    onIdChange: (...args: unknown[]) =>
      mockOnIdChange.getMockImplementation()
        ? mockOnIdChange(...args)
        : actual.onIdChange(...(args as [any, any]))
  };
});

vi.mock('../internals/requests', async importOriginal => {
  const actual = await importOriginal<typeof import('../internals/requests')>();
  return {
    ...actual,
    requestCreateRegistration: (...args: unknown[]) =>
      mockRequestCreateRegistration.getMockImplementation()
        ? mockRequestCreateRegistration(...args)
        : actual.requestCreateRegistration(...(args as [any, any]))
  };
});

vi.mock('../internals/idb-manager', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../internals/idb-manager')>();
  return {
    ...actual,
    dbGetFidRegistration: (...args: unknown[]) =>
      mockDbGetFidRegistration.getMockImplementation()
        ? mockDbGetFidRegistration(...args)
        : actual.dbGetFidRegistration(...(args as [any]))
  };
});

describe('refreshFidRegistrationIfStored', () => {
  let messaging: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    const app = getFakeApp();
    messaging = new MessagingService(
      app,
      {
        getId: async () => 'fid-1',
        getToken: async () => 'authToken'
      },
      getFakeAnalyticsProvider()
    );
    messaging.swRegistration =
      new FakeServiceWorkerRegistration() as unknown as ServiceWorkerRegistration;

    mockRequestCreateRegistration.mockReset().mockImplementation(async () => ({
      responseFid: 'fid-1'
    }));

    mockDbGetFidRegistration.mockReset().mockResolvedValue(undefined);
  });

  it('re-registers with FCM when FID metadata exists and notifies onRegistered', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;
    mockDbGetFidRegistration.mockResolvedValue({
      fid: 'fid-1',
      lastRegisterTime: Date.now()
    });

    await refreshFidRegistrationIfStored(messaging);

    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('fid-1');
  });

  it('uses stored VAPID key when available', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;
    mockDbGetFidRegistration.mockResolvedValue({
      fid: 'fid-1',
      lastRegisterTime: Date.now(),
      vapidKey: 'custom-vapid-key'
    });

    await refreshFidRegistrationIfStored(messaging);

    expect(messaging.vapidKey).toEqual('custom-vapid-key');
  });

  it('no-ops when the app instance was never registered with FCM', async () => {
    messaging.onRegisteredHandler = vi.fn() as any;
    mockDbGetFidRegistration.mockResolvedValue(undefined);

    await refreshFidRegistrationIfStored(messaging);

    expect(mockRequestCreateRegistration).not.toHaveBeenCalled();
  });
});

describe('subscribeFidChangeRegistration', () => {
  let messaging: MessagingService;
  /** Same object as `messaging.firebaseDependencies.installations`; `getId` tracks simulated rotation. */
  let installationsInternal: _FirebaseInstallationsInternal;
  let currentFid: string;
  let installations: installationsApi.Installations;
  let fidChangeCallback: installationsApi.IdChangeCallbackFn | undefined;
  let unsubscribeStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Notification, 'permission', 'get').mockReturnValue('granted');
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
    unsubscribeStub = vi.fn();
    mockOnIdChange
      .mockReset()
      .mockImplementation(
        (_installations: any, cb: installationsApi.IdChangeCallbackFn) => {
          fidChangeCallback = cb;
          return unsubscribeStub;
        }
      );

    mockRequestCreateRegistration.mockReset().mockImplementation(async () => ({
      responseFid: currentFid
    }));

    mockDbGetFidRegistration.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await dbDelete();
  });

  it('runs real register when Installations invokes the FID change callback and delivers the new FID via onRegistered', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;
    mockDbGetFidRegistration.mockResolvedValue({
      fid: 'fid-before-rotation',
      lastRegisterTime: Date.now()
    });

    subscribeFidChangeRegistration(messaging, installations);

    currentFid = 'fid-after-rotation';
    fidChangeCallback!('fid-after-rotation');

    // `register()` only assigns `_registerNotifyChain` after updateVapidKey/updateSwReg; wait for
    // that chain (and the inner getId/registerFcm work) to finish.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await messaging._registerNotifyChain;

    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('fid-after-rotation');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);
  });

  it('does not call register when the app instance was never registered with FCM', async () => {
    messaging.onRegisteredHandler = vi.fn() as any;
    mockDbGetFidRegistration.mockResolvedValue(undefined);

    subscribeFidChangeRegistration(messaging, installations);

    currentFid = 'new-fid';
    fidChangeCallback!('new-fid');

    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await messaging._registerNotifyChain;

    expect(mockRequestCreateRegistration).not.toHaveBeenCalled();
  });

  it('does not call register when onRegistered handler is not set', async () => {
    messaging.onRegisteredHandler = null;
    mockDbGetFidRegistration.mockResolvedValue({
      fid: 'fid-before-rotation',
      lastRegisterTime: Date.now()
    });

    subscribeFidChangeRegistration(messaging, installations);

    currentFid = 'new-fid';
    fidChangeCallback!('new-fid');

    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await messaging._registerNotifyChain;

    expect(mockRequestCreateRegistration).not.toHaveBeenCalled();
  });

  it('does not call the unsubscribe function when FID changes (unsubscribe is only for teardown)', async () => {
    messaging.onRegisteredHandler = vi.fn() as any;

    const unsubscribe = subscribeFidChangeRegistration(
      messaging,
      installations
    );
    expect(unsubscribe).toEqual(unsubscribeStub);

    currentFid = 'b';
    fidChangeCallback!('b');
    currentFid = 'c';
    fidChangeCallback!('c');

    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await messaging._registerNotifyChain;

    expect(unsubscribeStub).not.toHaveBeenCalled();
  });
});
