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

import { describe, beforeEach, it, expect, vi } from 'vitest';
import * as generateAuthTokenRequestModule from '../functions/generate-auth-token-request';

vi.mock('../functions/generate-auth-token-request', { spy: true });

import {
  CompletedAuthToken,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from '../interfaces/installation-entry';
import { getFakeInstallations } from '../testing/fake-generators';
import '../testing/setup';
import { TOKEN_EXPIRATION_BUFFER } from '../util/constants';
import { sleep } from '../util/sleep';
import { get, set } from './idb-manager';
import { refreshAuthToken } from './refresh-auth-token';
import { FirebaseInstallationsImpl } from '../interfaces/installation-impl';

const FID = 'carry-the-blessed-home';
const AUTH_TOKEN = 'authTokenFromServer';
const DB_AUTH_TOKEN = 'authTokenFromDB';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe('refreshAuthToken', () => {
  let installations: FirebaseInstallationsImpl;

  beforeEach(() => {
    installations = getFakeInstallations();

    vi.mocked(
      generateAuthTokenRequestModule.generateAuthTokenRequest
    ).mockImplementation(async () => {
      await sleep(100); // Request would take some time
      const result: CompletedAuthToken = {
        token: AUTH_TOKEN,
        expiresIn: ONE_WEEK_MS,
        requestStatus: RequestStatus.COMPLETED,
        creationTime: Date.now()
      };
      return result;
    });
  });

  it('throws when there is no installation in the DB', async () => {
    await expect(refreshAuthToken(installations)).rejects.toThrow();
  });

  it('throws when there is an unregistered installation in the db', async () => {
    const installationEntry: UnregisteredInstallationEntry = {
      fid: FID,
      registrationStatus: RequestStatus.NOT_STARTED
    };
    await set(installations.appConfig, installationEntry);

    await expect(refreshAuthToken(installations)).rejects.toThrow();
  });

  describe('when there is a valid auth token in the DB', () => {
    beforeEach(async () => {
      const installationEntry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now()
        }
      };
      await set(installations.appConfig, installationEntry);
    });

    it('returns the token from the DB', async () => {
      const { token } = await refreshAuthToken(installations);
      expect(token).toBe(AUTH_TOKEN);
    });

    it('does not call any server APIs', async () => {
      await refreshAuthToken(installations);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).not.toHaveBeenCalled();
    });

    it('works even if the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const { token } = await refreshAuthToken(installations);
      expect(token).toBe(AUTH_TOKEN);
    });
  });

  describe('when there is an auth token that is about to expire in the DB', () => {
    beforeEach(async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const installationEntry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: DB_AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime:
            // Expires in ten minutes
            Date.now() - ONE_WEEK_MS + TOKEN_EXPIRATION_BUFFER + 10 * 60 * 1000
        }
      };
      await set(installations.appConfig, installationEntry);
    });

    it('returns a different token after expiration', async () => {
      const token1 = await refreshAuthToken(installations);
      expect(token1.token).toBe(DB_AUTH_TOKEN);

      // Wait 30 minutes.
      vi.advanceTimersByTime(30 * 60 * 1000);

      const token2 = await refreshAuthToken(installations);
      expect(token2.token).toBe(AUTH_TOKEN);
      expect(token2.token).not.toBe(DB_AUTH_TOKEN);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('when there is an expired auth token in the DB', () => {
    beforeEach(async () => {
      const installationEntry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: DB_AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now() - 2 * ONE_WEEK_MS
        }
      };
      await set(installations.appConfig, installationEntry);
    });

    it('does not call generateAuthToken twice on subsequent calls', async () => {
      await refreshAuthToken(installations);
      await refreshAuthToken(installations);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('does not call generateAuthToken twice on simultaneous calls', async () => {
      await Promise.all([
        refreshAuthToken(installations),
        refreshAuthToken(installations)
      ]);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('returns a new token', async () => {
      const { token } = await refreshAuthToken(installations);
      expect(token).toBe(AUTH_TOKEN);
      expect(token).not.toBe(DB_AUTH_TOKEN);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('throws if the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      await expect(refreshAuthToken(installations)).rejects.toThrow();
    });

    it('saves the new token in the DB', async () => {
      const { token } = await refreshAuthToken(installations);

      const installationEntry = (await get(
        installations.appConfig
      )) as RegisteredInstallationEntry;
      expect(installationEntry).toBeDefined();
      expect(installationEntry.registrationStatus).toBe(
        RequestStatus.COMPLETED
      );

      const authToken = installationEntry.authToken as CompletedAuthToken;
      expect(authToken.requestStatus).toBe(RequestStatus.COMPLETED);
      expect(authToken.token).toBe(token);
    });
  });
});
