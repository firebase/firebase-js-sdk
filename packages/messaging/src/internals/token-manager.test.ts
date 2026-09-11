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

import '../testing/setup';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { unregister } from '../api/unregister';
import {
  dbGet,
  dbGetFidRegistration,
  dbSet,
  dbSetFidRegistration
} from './idb-manager';
import { getTokenInternal, revokeRegistrationInternal } from './token-manager';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';

import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { MessagingService } from '../messaging-service';
import { TokenDetails } from '../interfaces/registration-details';
import { getFakeTokenDetails } from '../testing/fakes/token-details';

const {
  mockRequestGetToken,
  mockRequestUpdateToken,
  mockRequestDeleteToken,
  mockRequestDeleteRegistration,
  mockDbRemoveFidRegistration
} = vi.hoisted(() => ({
  mockRequestGetToken: vi.fn(),
  mockRequestUpdateToken: vi.fn(),
  mockRequestDeleteToken: vi.fn(),
  mockRequestDeleteRegistration: vi.fn(),
  mockDbRemoveFidRegistration: vi.fn()
}));

vi.mock('./requests', async importOriginal => {
  const actual = await importOriginal<typeof import('./requests')>();
  return {
    ...actual,
    requestGetToken: (...args: unknown[]) =>
      mockRequestGetToken.getMockImplementation()
        ? mockRequestGetToken(...args)
        : actual.requestGetToken(...(args as [any, any])),
    requestUpdateToken: (...args: unknown[]) =>
      mockRequestUpdateToken.getMockImplementation()
        ? mockRequestUpdateToken(...args)
        : actual.requestUpdateToken(...(args as [any, any])),
    requestDeleteToken: (...args: unknown[]) =>
      mockRequestDeleteToken.getMockImplementation()
        ? mockRequestDeleteToken(...args)
        : actual.requestDeleteToken(...(args as [any, any])),
    requestDeleteRegistration: (...args: unknown[]) =>
      mockRequestDeleteRegistration.getMockImplementation()
        ? mockRequestDeleteRegistration(...args)
        : actual.requestDeleteRegistration(...(args as [any, any]))
  };
});

vi.mock('./idb-manager', async importOriginal => {
  const actual = await importOriginal<typeof import('./idb-manager')>();
  return {
    ...actual,
    dbRemoveFidRegistration: (...args: unknown[]) =>
      mockDbRemoveFidRegistration.getMockImplementation()
        ? mockDbRemoveFidRegistration(...args)
        : actual.dbRemoveFidRegistration(...(args as [any]))
  };
});

describe('Token Manager', () => {
  let tokenDetails: TokenDetails;
  let messaging: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ now: 1234567890 });

    tokenDetails = getFakeTokenDetails();
    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
    // base64 value of 'vapid-key-value' set in fakeTokenDetails
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = new FakeServiceWorkerRegistration();

    mockRequestGetToken.mockReset().mockResolvedValue('token-value');
    mockRequestUpdateToken.mockReset().mockResolvedValue(tokenDetails.token);
    mockRequestDeleteToken.mockReset().mockResolvedValue(undefined);
    mockRequestDeleteRegistration.mockReset().mockResolvedValue(undefined);
    mockDbRemoveFidRegistration.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTokenInternal', () => {
    it('gets a new token if there is none', async () => {
      // Act
      const token = await getTokenInternal(messaging);

      // Assert
      expect(token).toEqual('token-value');
      expect(mockRequestGetToken).toHaveBeenCalledTimes(1);
      expect(mockRequestGetToken).toHaveBeenCalledWith(
        messaging.firebaseDependencies,
        tokenDetails.subscriptionOptions
      );
      expect(mockRequestUpdateToken).not.toHaveBeenCalled();
      expect(mockRequestDeleteToken).not.toHaveBeenCalled();

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(token).toEqual(tokenFromDb!.token);
      expect(tokenFromDb).toEqual({
        ...tokenDetails,
        token: 'token-value'
      });
    });

    it('returns the token if it is valid', async () => {
      // Arrange
      await dbSet(messaging.firebaseDependencies, tokenDetails);

      // Act
      const token = await getTokenInternal(messaging);

      // Assert
      expect(token).toEqual(tokenDetails.token);
      expect(mockRequestGetToken).not.toHaveBeenCalled();
      expect(mockRequestUpdateToken).not.toHaveBeenCalled();
      expect(mockRequestDeleteToken).not.toHaveBeenCalled();

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(tokenFromDb).toEqual(tokenDetails);
    });

    it('gets a fresh token after unregister clears the stored token details', async () => {
      const firstToken = await getTokenInternal(messaging);

      expect(firstToken).toEqual('token-value');
      expect(mockRequestGetToken).toHaveBeenCalledTimes(1);

      await unregister(messaging);

      expect(mockRequestDeleteRegistration).toHaveBeenCalledTimes(1);
      expect(mockRequestDeleteRegistration).toHaveBeenCalledWith(
        messaging.firebaseDependencies,
        'FID'
      );

      const secondToken = await getTokenInternal(messaging);

      expect(secondToken).toEqual('token-value');
      expect(mockRequestGetToken).toHaveBeenCalledTimes(2);
      expect(mockRequestUpdateToken).not.toHaveBeenCalled();
      expect(mockRequestDeleteToken).not.toHaveBeenCalled();
    });

    it('cleans up stored FID registration metadata without calling FID unregister', async () => {
      await dbSetFidRegistration(messaging.firebaseDependencies, {
        fid: 'FID',
        lastRegisterTime: Date.now()
      });

      const token = await getTokenInternal(messaging);

      expect(token).toEqual('token-value');
      expect(mockRequestGetToken).toHaveBeenCalledTimes(1);
      expect(
        await dbGetFidRegistration(messaging.firebaseDependencies)
      ).toBeUndefined();
      expect(mockRequestDeleteRegistration).not.toHaveBeenCalled();
    });

    it('update the token if it was last updated more than a week ago', async () => {
      // Change create time to be older than a week.
      tokenDetails.createTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days

      await dbSet(messaging.firebaseDependencies, tokenDetails);

      const token = await getTokenInternal(messaging);
      const expectedTokenDetails: TokenDetails = {
        ...tokenDetails,
        createTime: Date.now()
      };

      expect(token).toEqual(tokenDetails.token); // Same token.
      expect(mockRequestGetToken).not.toHaveBeenCalled();
      expect(mockRequestUpdateToken).toHaveBeenCalledTimes(1);
      expect(mockRequestUpdateToken).toHaveBeenCalledWith(
        messaging.firebaseDependencies,
        expectedTokenDetails
      );
      expect(mockRequestDeleteToken).not.toHaveBeenCalled();

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(token).toEqual(tokenFromDb!.token);
      expect(tokenFromDb).toEqual(expectedTokenDetails);
    });

    it('retains the token upon update failure due to potential server error, allowing for future update attempts', async () => {
      // Arrange
      tokenDetails.createTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago, triggering an update
      await dbSet(messaging.firebaseDependencies, tokenDetails);
      mockRequestUpdateToken.mockRejectedValue(
        new Error('Temporary server error')
      );

      // Act
      await expect(getTokenInternal(messaging)).rejects.toThrow(
        'Temporary server error'
      );

      // Assert
      expect(mockRequestUpdateToken).toHaveBeenCalled();
      expect(mockRequestDeleteToken).not.toHaveBeenCalled();

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(tokenFromDb).not.toBeNull();
    });
  });

  describe('revokeRegistrationInternal', () => {
    it('returns if there is no token in the db', async () => {
      await revokeRegistrationInternal(messaging);

      expect(mockRequestGetToken).not.toHaveBeenCalled();
      expect(mockRequestUpdateToken).not.toHaveBeenCalled();
      expect(mockRequestDeleteToken).not.toHaveBeenCalled();
      expect(mockRequestDeleteRegistration).not.toHaveBeenCalled();
    });

    it('calls requestDeleteRegistration and onUnregistered when only FID metadata exists', async () => {
      const fid = 'FID_IN_DB';
      await dbSetFidRegistration(messaging.firebaseDependencies, {
        fid,
        lastRegisterTime: Date.now()
      });
      const onUnregisteredSpy = vi.fn();
      messaging.onUnregisteredHandler = onUnregisteredSpy;

      await revokeRegistrationInternal(messaging);

      expect(mockRequestDeleteToken).not.toHaveBeenCalled();
      expect(mockRequestDeleteRegistration).toHaveBeenCalledTimes(1);
      expect(mockRequestDeleteRegistration).toHaveBeenCalledWith(
        messaging.firebaseDependencies,
        fid
      );
      expect(
        await dbGetFidRegistration(messaging.firebaseDependencies)
      ).toBeUndefined();
      expect(onUnregisteredSpy).toHaveBeenCalledTimes(1);
      expect(onUnregisteredSpy).toHaveBeenCalledWith(fid);
    });

    it('does not remove FID metadata or notify onUnregistered when requestDeleteRegistration fails', async () => {
      const fid = 'FID_IN_DB';
      await dbSetFidRegistration(messaging.firebaseDependencies, {
        fid,
        lastRegisterTime: Date.now()
      });
      mockRequestDeleteRegistration.mockRejectedValue(new Error('network'));
      const onUnregisteredSpy = vi.fn();
      messaging.onUnregisteredHandler = onUnregisteredSpy;

      await expect(revokeRegistrationInternal(messaging)).rejects.toThrow(
        'network'
      );

      expect(
        (await dbGetFidRegistration(messaging.firebaseDependencies))?.fid
      ).toEqual(fid);
      expect(onUnregisteredSpy).not.toHaveBeenCalled();
    });

    it('does not throw when only FID metadata exists and onUnregisteredHandler is unset', async () => {
      const fid = 'FID_IN_DB';
      await dbSetFidRegistration(messaging.firebaseDependencies, {
        fid,
        lastRegisterTime: Date.now()
      });
      messaging.onUnregisteredHandler = null;

      await revokeRegistrationInternal(messaging);

      expect(mockRequestDeleteRegistration).toHaveBeenCalledTimes(1);
      expect(mockRequestDeleteRegistration).toHaveBeenCalledWith(
        messaging.firebaseDependencies,
        fid
      );
    });

    it('removes token from the db, calls requestDeleteToken and unsubscribes the push subscription', async () => {
      const sub = await messaging.swRegistration!.pushManager.subscribe();
      const unsubscribeSpy = vi.spyOn(sub, 'unsubscribe');
      await dbSet(messaging.firebaseDependencies, tokenDetails);

      await revokeRegistrationInternal(messaging);

      expect(await dbGet(messaging.firebaseDependencies)).toBeUndefined();
      expect(mockRequestGetToken).not.toHaveBeenCalled();
      expect(mockRequestUpdateToken).not.toHaveBeenCalled();
      expect(mockRequestDeleteToken).toHaveBeenCalledTimes(1);
      expect(mockRequestDeleteToken).toHaveBeenCalledWith(
        messaging.firebaseDependencies,
        tokenDetails.token
      );
      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('also cleans up stored FID registration metadata', async () => {
      mockDbRemoveFidRegistration.mockResolvedValue(undefined);

      await revokeRegistrationInternal(messaging);

      expect(mockDbRemoveFidRegistration).toHaveBeenCalledTimes(1);
      expect(mockDbRemoveFidRegistration).toHaveBeenCalledWith(
        messaging.firebaseDependencies
      );
    });
  });
});
