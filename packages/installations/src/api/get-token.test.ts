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
import * as createInstallationRequestModule from '../functions/create-installation-request';
import * as generateAuthTokenRequestModule from '../functions/generate-auth-token-request';

vi.mock('../functions/create-installation-request', { spy: true });
vi.mock('../functions/generate-auth-token-request', { spy: true });

import { get, set } from '../helpers/idb-manager';
import {
  CompletedAuthToken,
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from '../interfaces/installation-entry';
import { getFakeInstallations } from '../testing/fake-generators';
import '../testing/setup';
import { TOKEN_EXPIRATION_BUFFER } from '../util/constants';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { sleep } from '../util/sleep';
import { getToken } from './get-token';
import {
  AppConfig,
  FirebaseInstallationsImpl
} from '../interfaces/installation-impl';

const FID = 'dont-talk-to-strangers';
const AUTH_TOKEN = 'authToken';
const NEW_AUTH_TOKEN = 'newAuthToken';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A map of different states of the database and a function that creates the
 * said state.
 */
const setupInstallationEntryMap: Map<
  string,
  (appConfig: AppConfig) => Promise<void>
> = new Map([
  [
    'existing and valid auth token',
    async (appConfig: AppConfig) => {
      const entry: RegisteredInstallationEntry = {
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
      await set(appConfig, entry);
    }
  ],
  [
    'expired auth token',
    async (appConfig: AppConfig) => {
      const entry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now() - 2 * ONE_WEEK_MS
        }
      };
      await set(appConfig, entry);
    }
  ],
  [
    'pending auth token',
    async (appConfig: AppConfig) => {
      const entry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          requestStatus: RequestStatus.IN_PROGRESS,
          requestTime: Date.now() - 3 * 1000
        }
      };

      await set(appConfig, entry);

      // Finish pending request after 500 ms
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      sleep(500).then(async () => {
        const updatedEntry: RegisteredInstallationEntry = {
          ...entry,
          authToken: {
            token: NEW_AUTH_TOKEN,
            expiresIn: ONE_WEEK_MS,
            requestStatus: RequestStatus.COMPLETED,
            creationTime: Date.now()
          }
        };
        await set(appConfig, updatedEntry);
      });
    }
  ],
  [
    'no auth token',
    async (appConfig: AppConfig) => {
      const entry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          requestStatus: RequestStatus.NOT_STARTED
        }
      };
      await set(appConfig, entry);
    }
  ],
  [
    'pending fid registration',
    async (appConfig: AppConfig) => {
      const entry: InProgressInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: Date.now() - 3 * 1000
      };

      await set(appConfig, entry);

      // Finish pending request after 500 ms
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      sleep(500).then(async () => {
        const updatedEntry: RegisteredInstallationEntry = {
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
        await set(appConfig, updatedEntry);
      });
    }
  ],
  [
    'unregistered fid',
    async (appConfig: AppConfig) => {
      const entry: UnregisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      };

      await set(appConfig, entry);
    }
  ]
]);

describe('getToken', () => {
  let installations: FirebaseInstallationsImpl;

  beforeEach(() => {
    installations = getFakeInstallations();

    vi.mocked(
      createInstallationRequestModule.createInstallationRequest
    ).mockImplementation(async (_, installationEntry) => {
      await sleep(100); // Request would take some time
      const result: RegisteredInstallationEntry = {
        fid: installationEntry.fid,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: NEW_AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now()
        }
      };
      return result;
    });

    vi.mocked(
      generateAuthTokenRequestModule.generateAuthTokenRequest
    ).mockImplementation(async () => {
      await sleep(100); // Request would take some time
      const result: CompletedAuthToken = {
        token: NEW_AUTH_TOKEN,
        expiresIn: ONE_WEEK_MS,
        requestStatus: RequestStatus.COMPLETED,
        creationTime: Date.now()
      };
      return result;
    });
  });

  describe('basic functionality', () => {
    for (const [title, setup] of setupInstallationEntryMap.entries()) {
      describe(`when ${title} in the DB`, () => {
        beforeEach(() => setup(installations.appConfig));

        it('resolves with an auth token', async () => {
          const token = await getToken(installations);
          expect([AUTH_TOKEN, NEW_AUTH_TOKEN]).toContain(token);
        });

        it('saves the token in the DB', async () => {
          const token = await getToken(installations);
          const installationEntry = (await get(
            installations.appConfig
          )) as RegisteredInstallationEntry;
          expect(installationEntry).toBeDefined();
          expect(installationEntry.registrationStatus).toBe(
            RequestStatus.COMPLETED
          );
          expect(installationEntry.authToken.requestStatus).toBe(
            RequestStatus.COMPLETED
          );
          expect(
            (installationEntry.authToken as CompletedAuthToken).token
          ).toBe(token);
        });

        it('returns the same token on subsequent calls', async () => {
          const token1 = await getToken(installations);
          const token2 = await getToken(installations);
          expect(token1).toBe(token2);
        });
      });
    }
  });

  describe('when there is no FID in the DB', () => {
    it('gets the token by registering a new FID', async () => {
      await getToken(installations);
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalled();
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).not.toHaveBeenCalled();
    });

    it('does not register a new FID on subsequent calls', async () => {
      await getToken(installations);
      await getToken(installations);
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('throws if the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      await expect(getToken(installations)).rejects.toThrow();
    });
  });

  describe('when there is a FID in the DB, but no auth token', () => {
    let installationEntry: RegisteredInstallationEntry;

    beforeEach(async () => {
      installationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          requestStatus: RequestStatus.NOT_STARTED
        }
      };
      await set(installations.appConfig, installationEntry);
    });

    it('gets the token by calling generateAuthToken', async () => {
      await getToken(installations);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalled();
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
    });

    it('does not call generateAuthToken twice on subsequent calls', async () => {
      await getToken(installations);
      await getToken(installations);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('does not call generateAuthToken twice on simultaneous calls', async () => {
      await Promise.all([getToken(installations), getToken(installations)]);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('throws if the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      await expect(getToken(installations)).rejects.toThrow();
    });

    describe('and the server returns an error', () => {
      it('removes the FID from the DB if the server returns a 401 response', async () => {
        vi.mocked(
          generateAuthTokenRequestModule.generateAuthTokenRequest
        ).mockImplementation(async () => {
          throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
            requestName: 'Generate Auth Token',
            serverCode: 401,
            serverStatus: 'UNAUTHENTICATED',
            serverMessage: 'Invalid Authentication.'
          });
        });

        await expect(getToken(installations)).rejects.toThrow();
        expect(await get(installations.appConfig)).toBeUndefined();
      });

      it('removes the FID from the DB if the server returns a 404 response', async () => {
        vi.mocked(
          generateAuthTokenRequestModule.generateAuthTokenRequest
        ).mockImplementation(async () => {
          throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
            requestName: 'Generate Auth Token',
            serverCode: 404,
            serverStatus: 'NOT_FOUND',
            serverMessage: 'FID not found.'
          });
        });

        await expect(getToken(installations)).rejects.toThrow();
        expect(await get(installations.appConfig)).toBeUndefined();
      });

      it('does not remove the FID from the DB if the server returns any other response', async () => {
        vi.mocked(
          generateAuthTokenRequestModule.generateAuthTokenRequest
        ).mockImplementation(async () => {
          throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
            requestName: 'Generate Auth Token',
            serverCode: 500,
            serverStatus: 'INTERNAL',
            serverMessage: 'Internal server error.'
          });
        });

        await expect(getToken(installations)).rejects.toThrow();
        expect(await get(installations.appConfig)).toEqual(installationEntry);
      });
    });
  });

  describe('when there is a registered auth token in the DB', () => {
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

    it('does not call any server APIs', async () => {
      await getToken(installations);
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).not.toHaveBeenCalled();
    });

    it('refreshes the token if forceRefresh is true', async () => {
      const token = await getToken(installations, true);
      expect(token).toBe(NEW_AUTH_TOKEN);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalled();
    });

    it('works even if the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const token = await getToken(installations);
      expect(token).toBe(AUTH_TOKEN);
    });

    it('throws if the app is offline and forceRefresh is true', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      await expect(getToken(installations, true)).rejects.toThrow();
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
          token: AUTH_TOKEN,
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
      const token1 = await getToken(installations);
      expect(token1).toBe(AUTH_TOKEN);

      // Wait 30 minutes.
      vi.advanceTimersByTime(30 * 60 * 1000);

      const token2 = await getToken(installations);
      expect(token2).toBe(NEW_AUTH_TOKEN);
      expect(token2).not.toBe(token1);
    });
  });

  describe('when there is an expired auth token in the DB', () => {
    beforeEach(async () => {
      const installationEntry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now() - 2 * ONE_WEEK_MS
        }
      };
      await set(installations.appConfig, installationEntry);
    });

    it('returns a different token', async () => {
      const token = await getToken(installations);
      expect(token).toBe(NEW_AUTH_TOKEN);
      expect(
        generateAuthTokenRequestModule.generateAuthTokenRequest
      ).toHaveBeenCalled();
    });

    it('throws if the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      await expect(getToken(installations)).rejects.toThrow();
    });
  });
});
