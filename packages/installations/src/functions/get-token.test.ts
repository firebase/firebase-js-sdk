/**
 * @license
 * Copyright 2019 Google Inc.
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

import { FirebaseApp } from '@firebase/app-types';
import { expect } from 'chai';
import { SinonFakeTimers, SinonStub, stub, useFakeTimers } from 'sinon';
import * as createInstallationModule from '../api/create-installation';
import * as generateAuthTokenModule from '../api/generate-auth-token';
import { extractAppConfig } from '../helpers/extract-app-config';
import { get, set } from '../helpers/idb-manager';
import { AppConfig } from '../interfaces/app-config';
import {
  CompletedAuthToken,
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from '../interfaces/installation-entry';
import { getFakeApp } from '../testing/get-fake-app';
import '../testing/setup';
import { TOKEN_EXPIRATION_BUFFER } from '../util/constants';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { sleep } from '../util/sleep';
import { getToken } from './get-token';

const FID = 'dont-talk-to-strangers';
const AUTH_TOKEN = 'authTokenFromServer';
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
      sleep(500).then(async () => {
        const updatedEntry: RegisteredInstallationEntry = {
          ...entry,
          authToken: {
            token: AUTH_TOKEN,
            expiresIn: ONE_WEEK_MS,
            requestStatus: RequestStatus.COMPLETED,
            creationTime: Date.now()
          }
        };
        set(appConfig, updatedEntry);
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
        set(appConfig, updatedEntry);
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
  let app: FirebaseApp;
  let appConfig: AppConfig;
  let createInstallationSpy: SinonStub<
    [AppConfig, InProgressInstallationEntry],
    Promise<RegisteredInstallationEntry>
  >;
  let generateAuthTokenSpy: SinonStub<
    [AppConfig, RegisteredInstallationEntry],
    Promise<CompletedAuthToken>
  >;

  beforeEach(() => {
    app = getFakeApp();
    appConfig = extractAppConfig(app);

    createInstallationSpy = stub(
      createInstallationModule,
      'createInstallation'
    ).callsFake(async (_, installationEntry) => {
      await sleep(100); // Request would take some time
      const result: RegisteredInstallationEntry = {
        fid: installationEntry.fid,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now()
        }
      };
      return result;
    });
    generateAuthTokenSpy = stub(
      generateAuthTokenModule,
      'generateAuthToken'
    ).callsFake(async () => {
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

  describe('basic functionality', () => {
    for (const [title, setup] of setupInstallationEntryMap.entries()) {
      describe(`when ${title} in the DB`, () => {
        beforeEach(() => setup(appConfig));

        it('resolves with an auth token', async () => {
          const token = await getToken(app);
          expect(token).to.equal(AUTH_TOKEN);
        });

        it('saves the token in the DB', async () => {
          const token = await getToken(app);
          const installationEntry = await get<RegisteredInstallationEntry>(
            appConfig
          );
          expect(installationEntry).not.to.be.undefined;
          expect(installationEntry!.registrationStatus).to.equal(
            RequestStatus.COMPLETED
          );
          expect(installationEntry!.authToken.requestStatus).to.equal(
            RequestStatus.COMPLETED
          );
          expect(
            (installationEntry!.authToken as CompletedAuthToken).token
          ).to.equal(token);
        });

        it('returns the same token on subsequent calls', async () => {
          const token1 = await getToken(app);
          const token2 = await getToken(app);
          expect(token1).to.equal(token2);
        });
      });
    }
  });

  describe('when there is no FID in the DB', () => {
    it('gets the token by registering a new FID', async () => {
      await getToken(app);
      expect(createInstallationSpy).to.be.called;
      expect(generateAuthTokenSpy).not.to.be.called;
    });

    it('does not register a new FID on subsequent calls', async () => {
      await getToken(app);
      await getToken(app);
      expect(createInstallationSpy).to.be.calledOnce;
    });

    it('throws if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      await expect(getToken(app)).to.be.rejected;
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
      await set(appConfig, installationEntry);
    });

    it('gets the token by calling generateAuthToken', async () => {
      await getToken(app);
      expect(generateAuthTokenSpy).to.be.called;
      expect(createInstallationSpy).not.to.be.called;
    });

    it('does not call generateAuthToken on subsequent calls', async () => {
      await getToken(app);
      await getToken(app);
      expect(generateAuthTokenSpy).to.be.calledOnce;
    });

    it('throws if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      await expect(getToken(app)).to.be.rejected;
    });

    describe('and the server returns an error', () => {
      it('removes the FID from the DB if the server returns a 401 response', async () => {
        generateAuthTokenSpy.callsFake(async () => {
          throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
            requestName: 'Generate Auth Token',
            serverCode: 401,
            serverStatus: 'UNAUTHENTICATED',
            serverMessage: 'Invalid Authentication.'
          });
        });

        await expect(getToken(app)).to.be.rejected;
        await expect(get(appConfig)).to.eventually.be.undefined;
      });

      it('removes the FID from the DB if the server returns a 404 response', async () => {
        generateAuthTokenSpy.callsFake(async () => {
          throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
            requestName: 'Generate Auth Token',
            serverCode: 404,
            serverStatus: 'NOT_FOUND',
            serverMessage: 'FID not found.'
          });
        });

        await expect(getToken(app)).to.be.rejected;
        await expect(get(appConfig)).to.eventually.be.undefined;
      });

      it('does not remove the FID from the DB if the server returns any other response', async () => {
        generateAuthTokenSpy.callsFake(async () => {
          throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
            requestName: 'Generate Auth Token',
            serverCode: 500,
            serverStatus: 'INTERNAL',
            serverMessage: 'Internal server error.'
          });
        });

        await expect(getToken(app)).to.be.rejected;
        await expect(get(appConfig)).to.eventually.deep.equal(
          installationEntry
        );
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
      await set(appConfig, installationEntry);
    });

    it('does not call any server APIs', async () => {
      await getToken(app);
      expect(createInstallationSpy).not.to.be.called;
      expect(generateAuthTokenSpy).not.to.be.called;
    });

    it('works even if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      const token = await getToken(app);
      expect(token).to.equal(AUTH_TOKEN);
    });
  });

  describe('when there is an auth token that is about to expire in the DB', () => {
    const DB_AUTH_TOKEN = 'authTokenFromDB';
    let clock: SinonFakeTimers;

    beforeEach(async () => {
      clock = useFakeTimers({ shouldAdvanceTime: true });
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
      await set(appConfig, installationEntry);
    });

    it('returns a different token after expiration', async () => {
      const token1 = await getToken(app);
      expect(token1).to.equal(DB_AUTH_TOKEN);

      // Wait 30 minutes.
      clock.tick('30:00');

      const token2 = await getToken(app);
      await expect(token2).to.equal(AUTH_TOKEN);
      await expect(token2).not.to.equal(token1);
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
      await set(appConfig, installationEntry);
    });

    it('throws if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      await expect(getToken(app)).to.be.rejected;
    });
  });
});
