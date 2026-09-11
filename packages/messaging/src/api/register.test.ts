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
import { deleteToken } from './deleteToken';
import { getToken } from './getToken';
import { register } from './register';
import { dbGet, dbGetFidRegistration } from '../internals/idb-manager';
import { MessagingService } from '../messaging-service';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';

function makeSwRegistration(): ServiceWorkerRegistration {
  return new FakeServiceWorkerRegistration() as unknown as ServiceWorkerRegistration;
}

const {
  mockUpdateVapidKey,
  mockUpdateSwReg,
  mockRequestCreateRegistration,
  mockRequestDeleteRegistration,
  mockRequestGetToken,
  mockRequestDeleteToken,
  mockDbSetFidRegistration,
  mockDbRemove
} = vi.hoisted(() => ({
  mockUpdateVapidKey: vi.fn(),
  mockUpdateSwReg: vi.fn(),
  mockRequestCreateRegistration: vi.fn(),
  mockRequestDeleteRegistration: vi.fn(),
  mockRequestGetToken: vi.fn(),
  mockRequestDeleteToken: vi.fn(),
  mockDbSetFidRegistration: vi.fn(),
  mockDbRemove: vi.fn()
}));

vi.mock('../helpers/updateVapidKey', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../helpers/updateVapidKey')>();
  return {
    ...actual,
    updateVapidKey: (...args: unknown[]) =>
      mockUpdateVapidKey.getMockImplementation()
        ? mockUpdateVapidKey(...args)
        : actual.updateVapidKey(...(args as [any, any]))
  };
});

vi.mock('../helpers/updateSwReg', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../helpers/updateSwReg')>();
  return {
    ...actual,
    updateSwReg: (...args: unknown[]) =>
      mockUpdateSwReg.getMockImplementation()
        ? mockUpdateSwReg(...args)
        : actual.updateSwReg(...(args as [any, any]))
  };
});

vi.mock('../internals/requests', async importOriginal => {
  const actual = await importOriginal<typeof import('../internals/requests')>();
  return {
    ...actual,
    requestCreateRegistration: (...args: unknown[]) =>
      mockRequestCreateRegistration.getMockImplementation()
        ? mockRequestCreateRegistration(...args)
        : actual.requestCreateRegistration(...(args as [any, any])),
    requestDeleteRegistration: (...args: unknown[]) =>
      mockRequestDeleteRegistration.getMockImplementation()
        ? mockRequestDeleteRegistration(...args)
        : actual.requestDeleteRegistration(...(args as [any, any])),
    requestGetToken: (...args: unknown[]) =>
      mockRequestGetToken.getMockImplementation()
        ? mockRequestGetToken(...args)
        : actual.requestGetToken(...(args as [any, any])),
    requestDeleteToken: (...args: unknown[]) =>
      mockRequestDeleteToken.getMockImplementation()
        ? mockRequestDeleteToken(...args)
        : actual.requestDeleteToken(...(args as [any, any]))
  };
});

vi.mock('../internals/idb-manager', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../internals/idb-manager')>();
  return {
    ...actual,
    dbSetFidRegistration: (...args: unknown[]) =>
      mockDbSetFidRegistration.getMockImplementation()
        ? mockDbSetFidRegistration(...args)
        : actual.dbSetFidRegistration(...(args as [any, any])),
    dbRemove: (...args: unknown[]) =>
      mockDbRemove.getMockImplementation()
        ? mockDbRemove(...args)
        : actual.dbRemove(...(args as [any]))
  };
});

describe('register', () => {
  let messaging: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({
      now: 1_700_000_000_000,
      toFake: ['Date', 'setTimeout', 'clearTimeout']
    });
    vi.spyOn(Notification, 'permission', 'get').mockReturnValue('granted');

    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = makeSwRegistration();

    mockUpdateVapidKey.mockReset().mockResolvedValue(undefined);
    mockUpdateSwReg.mockReset().mockResolvedValue(undefined);
    mockRequestCreateRegistration
      .mockReset()
      .mockResolvedValue({ responseFid: 'FID' });
    mockRequestDeleteRegistration.mockReset().mockResolvedValue(undefined);
    mockRequestGetToken.mockReset();
    mockRequestDeleteToken.mockReset();
    mockDbSetFidRegistration.mockReset();
    mockDbRemove.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls updateVapidKey and updateSwReg then delivers FID via onRegisteredHandler', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);

    expect(mockUpdateVapidKey).toHaveBeenCalledTimes(1);
    expect(mockUpdateVapidKey).toHaveBeenCalledWith(messaging, undefined);
    expect(mockUpdateSwReg).toHaveBeenCalledTimes(1);
    expect(mockUpdateSwReg).toHaveBeenCalledWith(messaging, undefined);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);
  });

  it('passes options to updateVapidKey and updateSwReg when provided', async () => {
    messaging.onRegisteredHandler = vi.fn() as any;
    const swReg = makeSwRegistration();
    const options = {
      vapidKey: 'custom-vapid',
      serviceWorkerRegistration: swReg
    };

    await register(messaging, options);

    expect(mockUpdateVapidKey).toHaveBeenCalledTimes(1);
    expect(mockUpdateVapidKey).toHaveBeenCalledWith(messaging, 'custom-vapid');
    expect(mockUpdateSwReg).toHaveBeenCalledTimes(1);
    expect(mockUpdateSwReg).toHaveBeenCalledWith(messaging, swReg);
  });

  it('saves VAPID key in FID registration metadata', async () => {
    messaging.onRegisteredHandler = vi.fn() as any;
    const options = {
      vapidKey: 'custom-vapid'
    };

    mockDbSetFidRegistration.mockResolvedValue({
      fid: 'FID',
      lastRegisterTime: 1_700_000_000_000,
      vapidKey: 'custom-vapid'
    });

    mockUpdateVapidKey.mockImplementation(async (msg: any, key: any) => {
      if (key) {
        msg.vapidKey = key;
      }
    });

    await register(messaging, options);

    expect(mockDbSetFidRegistration).toHaveBeenCalledTimes(1);
    expect(mockDbSetFidRegistration).toHaveBeenCalledWith(
      messaging.firebaseDependencies,
      {
        fid: 'FID',
        lastRegisterTime: 1_700_000_000_000,
        vapidKey: 'custom-vapid'
      }
    );
  });

  it('throws when no onRegistered callback handler is provided or registered', async () => {
    messaging.onRegisteredHandler = null;

    await expect(register(messaging)).rejects.toThrow(
      'messaging/invalid-on-registered-handler'
    );
    expect(mockUpdateVapidKey).not.toHaveBeenCalled();
    expect(mockUpdateSwReg).not.toHaveBeenCalled();
  });

  it('calls observer.next when onRegisteredHandler is an observer object', async () => {
    const observer = {
      next: vi.fn(),
      error: vi.fn(),
      complete: vi.fn()
    };
    messaging.onRegisteredHandler = observer;

    await register(messaging);

    expect(observer.next).toHaveBeenCalledTimes(1);
    expect(observer.next).toHaveBeenCalledWith('FID');
  });

  it('retries CreateRegistration when response FID mismatches Installations then succeeds', async () => {
    const customInstallations = getFakeInstallations();
    const getTokenSpy = vi
      .spyOn(customInstallations, 'getToken')
      .mockImplementation(async (_force?: boolean) => 'authToken');
    messaging = new MessagingService(
      getFakeApp(),
      customInstallations,
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = makeSwRegistration();
    messaging.onRegisteredHandler = vi.fn() as any;

    mockRequestCreateRegistration
      .mockResolvedValueOnce({ responseFid: 'wrong-fid' })
      .mockResolvedValueOnce({ responseFid: 'FID' });

    await register(messaging);

    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(2);
    expect(getTokenSpy).toHaveBeenCalledTimes(1);
    expect(getTokenSpy).toHaveBeenCalledWith(true);
  });

  it('rejects when CreateRegistration FID never matches Installations after retries', async () => {
    const customInstallations = getFakeInstallations();
    const getTokenSpy = vi
      .spyOn(customInstallations, 'getToken')
      .mockImplementation(async () => 'authToken');
    messaging = new MessagingService(
      getFakeApp(),
      customInstallations,
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = makeSwRegistration();
    messaging.onRegisteredHandler = vi.fn() as any;

    let createRegistrationCalls = 0;
    mockRequestCreateRegistration.mockImplementation(async () => {
      createRegistrationCalls++;
      if (createRegistrationCalls > 3) {
        throw new Error('unexpected fourth CreateRegistration invocation');
      }
      return { responseFid: 'always-wrong' };
    });

    await expect(register(messaging)).rejects.toThrow(
      'messaging/fid-registration-failed'
    );

    expect(createRegistrationCalls).toEqual(3);
    expect(getTokenSpy).toHaveBeenCalledTimes(2);
    expect(getTokenSpy).toHaveBeenCalledWith(true);
  });

  it('uses FID from installations.getId()', async () => {
    const customFid = 'custom-installation-id';
    const customInstallations = getFakeInstallations();
    vi.spyOn(customInstallations, 'getId').mockResolvedValue(customFid);
    messaging = new MessagingService(
      getFakeApp(),
      customInstallations,
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = makeSwRegistration();

    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    mockRequestCreateRegistration.mockResolvedValue({ responseFid: customFid });

    await register(messaging);

    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith(customFid);
  });

  it('calls onRegisteredHandler again when FID unchanged but still delivers FID', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);
    await register(messaging);

    expect(onRegisteredSpy).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenNthCalledWith(2, 'FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);
  });

  it('does not clean up legacy token details when FID is unchanged within refresh window', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);

    mockDbRemove.mockResolvedValue(undefined);
    await register(messaging);

    expect(mockDbRemove).not.toHaveBeenCalled();
    expect(onRegisteredSpy).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenNthCalledWith(2, 'FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);
  });

  it('allows a later register call to retry after a previous register failure', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    mockRequestCreateRegistration
      .mockRejectedValueOnce(new Error('temporary network error'))
      .mockResolvedValueOnce({ responseFid: 'FID' });

    await expect(register(messaging)).rejects.toThrow(
      'temporary network error'
    );
    await register(messaging);

    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID');
  });

  it('calls backend again after deleteToken clears stored FID registration', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);

    await deleteToken(messaging);

    expect(mockRequestDeleteRegistration).toHaveBeenCalledTimes(1);
    expect(mockRequestDeleteRegistration).toHaveBeenCalledWith(
      messaging.firebaseDependencies,
      'FID'
    );

    await register(messaging);

    expect(onRegisteredSpy).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenNthCalledWith(2, 'FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(2);
  });

  it('deletes stored token for getToken -> register', async () => {
    const onRegisteredSpy = vi.fn();
    mockRequestGetToken.mockResolvedValue('legacy-token');
    mockRequestDeleteToken.mockImplementation(() => {
      throw new Error('unexpected requestDeleteToken()');
    });
    messaging.onRegisteredHandler = onRegisteredSpy;

    await getToken(messaging);

    expect(mockRequestGetToken).toHaveBeenCalledTimes(1);
    expect((await dbGet(messaging.firebaseDependencies))?.token).toEqual(
      'legacy-token'
    );

    await register(messaging);

    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID');
    expect(await dbGet(messaging.firebaseDependencies)).toBeUndefined();
    expect(mockRequestDeleteToken).not.toHaveBeenCalled();
  });

  it('deletes stored fid for register -> getToken', async () => {
    const onRegisteredSpy = vi.fn();
    mockRequestGetToken.mockResolvedValue('legacy-token');
    mockRequestDeleteRegistration.mockImplementation(() => {
      throw new Error('unexpected requestDeleteRegistration()');
    });
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);

    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID');
    expect(
      (await dbGetFidRegistration(messaging.firebaseDependencies))?.fid
    ).toEqual('FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);

    const token = await getToken(messaging);

    expect(token).toEqual('legacy-token');
    expect(mockRequestGetToken).toHaveBeenCalledTimes(1);
    expect(
      await dbGetFidRegistration(messaging.firebaseDependencies)
    ).toBeUndefined();
    expect(mockRequestDeleteRegistration).not.toHaveBeenCalled();
  });

  it('refreshes registration weekly even when FID unchanged and notifies onRegisteredHandler again', async () => {
    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    await register(messaging);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(1);

    // 8 days later: refresh should run and onRegistered should fire again even if FID unchanged.
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
    await register(messaging);

    expect(onRegisteredSpy).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenNthCalledWith(2, 'FID');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(2);
  });

  it('calls onRegisteredHandler when FID changed', async () => {
    const customInstallations = getFakeInstallations();
    const getIdSpy = vi
      .spyOn(customInstallations, 'getId')
      .mockResolvedValueOnce('FID_OLD')
      .mockResolvedValueOnce('FID_NEW');
    messaging = new MessagingService(
      getFakeApp(),
      customInstallations,
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = makeSwRegistration();

    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    mockRequestCreateRegistration
      .mockResolvedValueOnce({ responseFid: 'FID_OLD' })
      .mockResolvedValueOnce({ responseFid: 'FID_NEW' });

    await register(messaging);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID_OLD');

    await register(messaging);
    expect(getIdSpy).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenNthCalledWith(2, 'FID_NEW');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(2);
  });

  it('notifies on each register when FID unchanged and within refresh window', async () => {
    const customInstallations = getFakeInstallations();
    const getIdSpy = vi
      .spyOn(customInstallations, 'getId')
      .mockResolvedValueOnce('FID_A')
      .mockResolvedValueOnce('FID_B')
      .mockResolvedValueOnce('FID_B');
    messaging = new MessagingService(
      getFakeApp(),
      customInstallations,
      getFakeAnalyticsProvider()
    );
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = makeSwRegistration();

    const onRegisteredSpy = vi.fn();
    messaging.onRegisteredHandler = onRegisteredSpy;

    mockRequestCreateRegistration
      .mockResolvedValueOnce({ responseFid: 'FID_A' })
      .mockResolvedValueOnce({ responseFid: 'FID_B' });

    await register(messaging);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(1);
    expect(onRegisteredSpy).toHaveBeenCalledWith('FID_A');

    await register(messaging);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(2);
    expect(onRegisteredSpy).toHaveBeenNthCalledWith(2, 'FID_B');

    await register(messaging);
    expect(getIdSpy).toHaveBeenCalledTimes(3);
    expect(onRegisteredSpy).toHaveBeenCalledTimes(3);
    expect(onRegisteredSpy).toHaveBeenNthCalledWith(3, 'FID_B');
    expect(mockRequestCreateRegistration).toHaveBeenCalledTimes(2);
  });
});
