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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessagingService } from '../messaging-service';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { unregister } from './unregister';

const {
  mockDbGetFidRegistration,
  mockDbRemoveFidRegistration,
  mockDbRemove,
  mockRequestDeleteRegistration,
  mockRequestDeleteToken
} = vi.hoisted(() => ({
  mockDbGetFidRegistration: vi.fn(),
  mockDbRemoveFidRegistration: vi.fn(),
  mockDbRemove: vi.fn(),
  mockRequestDeleteRegistration: vi.fn(),
  mockRequestDeleteToken: vi.fn()
}));

vi.mock('../internals/idb-manager', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../internals/idb-manager')>();
  return {
    ...actual,
    dbGetFidRegistration: (...args: unknown[]) =>
      mockDbGetFidRegistration.getMockImplementation()
        ? mockDbGetFidRegistration(...args)
        : actual.dbGetFidRegistration(...(args as [any])),
    dbRemoveFidRegistration: (...args: unknown[]) =>
      mockDbRemoveFidRegistration.getMockImplementation()
        ? mockDbRemoveFidRegistration(...args)
        : actual.dbRemoveFidRegistration(...(args as [any])),
    dbRemove: (...args: unknown[]) =>
      mockDbRemove.getMockImplementation()
        ? mockDbRemove(...args)
        : actual.dbRemove(...(args as [any]))
  };
});

vi.mock('../internals/requests', async importOriginal => {
  const actual = await importOriginal<typeof import('../internals/requests')>();
  return {
    ...actual,
    requestDeleteRegistration: (...args: unknown[]) =>
      mockRequestDeleteRegistration.getMockImplementation()
        ? mockRequestDeleteRegistration(...args)
        : actual.requestDeleteRegistration(...(args as [any, any])),
    requestDeleteToken: (...args: unknown[]) =>
      mockRequestDeleteToken.getMockImplementation()
        ? mockRequestDeleteToken(...args)
        : actual.requestDeleteToken(...(args as [any, any]))
  };
});

describe('unregister', () => {
  let messaging: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
  });

  it('deletes the stored FID registration and notifies onUnregisteredHandler', async () => {
    const fid = 'FID_STORED';
    const onUnregisteredSpy = vi.fn();
    messaging.onUnregisteredHandler = onUnregisteredSpy;

    mockDbGetFidRegistration.mockResolvedValue({
      fid,
      lastRegisterTime: Date.now()
    });
    mockDbRemoveFidRegistration.mockResolvedValue(undefined);
    mockRequestDeleteRegistration.mockResolvedValue(undefined);
    const getIdSpy = vi
      .spyOn(messaging.firebaseDependencies.installations, 'getId')
      .mockResolvedValue('FID_SHOULD_NOT_BE_USED');

    await unregister(messaging);

    expect(mockDbGetFidRegistration).toHaveBeenCalledTimes(1);
    expect(mockRequestDeleteRegistration).toHaveBeenCalledTimes(1);
    expect(mockRequestDeleteRegistration).toHaveBeenCalledWith(
      messaging.firebaseDependencies,
      fid
    );
    expect(mockDbRemoveFidRegistration).toHaveBeenCalledTimes(1);
    expect(getIdSpy).not.toHaveBeenCalled();
    expect(onUnregisteredSpy).toHaveBeenCalledTimes(1);
    expect(onUnregisteredSpy).toHaveBeenCalledWith(fid);
  });

  it('falls back to installations.getId() when no stored FID registration exists', async () => {
    const fid = 'FID_FROM_INSTALLATIONS';
    messaging.onUnregisteredHandler = vi.fn() as any;

    mockDbGetFidRegistration.mockResolvedValue(undefined);
    mockDbRemoveFidRegistration.mockResolvedValue(undefined);
    mockRequestDeleteRegistration.mockResolvedValue(undefined);
    const getIdSpy = vi
      .spyOn(messaging.firebaseDependencies.installations, 'getId')
      .mockResolvedValue(fid);

    await unregister(messaging);

    expect(mockDbGetFidRegistration).toHaveBeenCalledTimes(1);
    expect(getIdSpy).toHaveBeenCalledTimes(1);
    expect(mockRequestDeleteRegistration).toHaveBeenCalledTimes(1);
    expect(mockRequestDeleteRegistration).toHaveBeenCalledWith(
      messaging.firebaseDependencies,
      fid
    );
    expect(mockDbRemoveFidRegistration).toHaveBeenCalledTimes(1);
  });

  it('does not throw if onUnregisteredHandler is not set', async () => {
    const fid = 'FID';
    messaging.onUnregisteredHandler = null;

    mockDbGetFidRegistration.mockResolvedValue({
      fid,
      lastRegisterTime: Date.now()
    });
    mockDbRemoveFidRegistration.mockResolvedValue(undefined);
    mockRequestDeleteRegistration.mockResolvedValue(undefined);

    await unregister(messaging);
  });

  it('cleans up legacy FCM token stored via getToken() without touching legacy delete token request', async () => {
    const fid = 'FID_STORED';
    const onUnregisteredSpy = vi.fn();
    messaging.onUnregisteredHandler = onUnregisteredSpy;

    mockDbGetFidRegistration.mockResolvedValue({
      fid,
      lastRegisterTime: Date.now()
    });
    mockDbRemoveFidRegistration.mockResolvedValue(undefined);
    mockRequestDeleteRegistration.mockResolvedValue(undefined);

    // Guard rails: unregister() should clean up legacy token DB, but must not call legacy
    // requestDeleteToken(). The DB cleanup is best-effort.
    mockDbRemove.mockResolvedValue(undefined);
    mockRequestDeleteToken.mockImplementation(() => {
      throw new Error('unexpected requestDeleteToken()');
    });

    await unregister(messaging);

    expect(mockRequestDeleteRegistration).toHaveBeenCalledTimes(1);
    expect(mockRequestDeleteRegistration).toHaveBeenCalledWith(
      messaging.firebaseDependencies,
      fid
    );
    expect(onUnregisteredSpy).toHaveBeenCalledTimes(1);
    expect(onUnregisteredSpy).toHaveBeenCalledWith(fid);
    expect(mockDbRemove).toHaveBeenCalledTimes(1);
    expect(mockDbRemove).toHaveBeenCalledWith(messaging.firebaseDependencies);
    expect(mockRequestDeleteToken).not.toHaveBeenCalled();
  });

  it('does not notify onUnregisteredHandler when delete registration fails', async () => {
    const fid = 'FID';
    const onUnregisteredSpy = vi.fn();
    messaging.onUnregisteredHandler = onUnregisteredSpy;

    mockDbGetFidRegistration.mockResolvedValue({
      fid,
      lastRegisterTime: Date.now()
    });
    mockDbRemoveFidRegistration.mockResolvedValue(undefined);
    mockRequestDeleteRegistration.mockRejectedValue(new Error('boom'));

    await expect(unregister(messaging)).rejects.toThrow('boom');
    expect(onUnregisteredSpy).not.toHaveBeenCalled();
    expect(mockDbRemoveFidRegistration).not.toHaveBeenCalled();
  });
});
