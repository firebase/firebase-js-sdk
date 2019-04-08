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
import { restore, SinonStub, stub } from 'sinon';
import * as api from './api';
import { TOKEN_EXPIRATION_BUFFER } from './constants';
import { ERROR_FACTORY, ErrorCode } from './errors';
import { getAuthToken } from './get-auth-token';
import { clear, get, set } from './idb-manager';
import { AppConfig } from './interfaces/app-config';
import {
  CompletedAuthToken,
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from './interfaces/installation-entry';
import './testing/setup';
import { sleep } from './util/sleep';

const FID = 'dont-talk-to-strangers';
const AUTH_TOKEN = 'authTokenFromServer';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A map of different states of the database and a function that creates the
 * said state.
 */
const setupInstallationEntryMap: Map<string, () => Promise<void>> = new Map([
  [
    'existing and valid auth token',
    async () => {
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
      set('appId', entry);
    }
  ],
  [
    'expired auth token',
    async () => {
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
      set('appId', entry);
    }
  ],
  [
    'pending auth token',
    async () => {
      const entry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          requestStatus: RequestStatus.IN_PROGRESS,
          requestTime: Date.now() - 3 * 1000
        }
      };

      set('appId', entry);

      // Finish pending request in 10 ms
      sleep(50).then(() => {
        const updatedEntry: RegisteredInstallationEntry = {
          ...entry,
          authToken: {
            token: AUTH_TOKEN,
            expiresIn: ONE_WEEK_MS,
            requestStatus: RequestStatus.COMPLETED,
            creationTime: Date.now()
          }
        };
        set('appId', updatedEntry);
      });
    }
  ],
  [
    'no auth token',
    async () => {
      const entry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          requestStatus: RequestStatus.NOT_STARTED
        }
      };
      set('appId', entry);
    }
  ],
  [
    'pending fid registration',
    async () => {
      const entry: InProgressInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: Date.now() - 3 * 1000
      };

      set('appId', entry);

      // Finish pending request in 10 ms
      sleep(50).then(async () => {
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
        set('appId', updatedEntry);
      });
    }
  ],
  [
    'unregistered fid',
    async () => {
      const entry: UnregisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      };

      set('appId', entry);
    }
  ]
]);

describe('getAuthToken', () => {
  const app: FirebaseApp = {
    name: 'app',
    delete: async () => {},
    automaticDataCollectionEnabled: true,
    options: {
      projectId: 'projectId',
      apiKey: 'apiKey',
      appId: 'appId'
    }
  };
  let createInstallationSpy: SinonStub<
    [AppConfig, InProgressInstallationEntry],
    Promise<RegisteredInstallationEntry>
  >;
  let generateAuthTokenSpy: SinonStub<
    [AppConfig, RegisteredInstallationEntry],
    Promise<CompletedAuthToken>
  >;

  beforeEach(() => {
    createInstallationSpy = stub(api, 'createInstallation').callsFake(
      async (_, installationEntry) => {
        await sleep(50); // Request would take some time
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
      }
    );
    generateAuthTokenSpy = stub(api, 'generateAuthToken').callsFake(
      async () => {
        await sleep(50); // Request would take some time
        const result: CompletedAuthToken = {
          token: AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now()
        };
        return result;
      }
    );
  });

  afterEach(async () => {
    restore();

    // Clear the database after each test.
    await clear();
  });

  describe('basic functionality', () => {
    for (const [title, setup] of setupInstallationEntryMap.entries()) {
      describe(`when ${title} in the DB`, () => {
        beforeEach(setup);

        it('resolves with an auth token', async () => {
          const token = await getAuthToken(app);
          expect(token).to.equal(AUTH_TOKEN);
        });

        it('saves the token in the DB', async () => {
          const token = await getAuthToken(app);
          const installationEntry = await get<RegisteredInstallationEntry>(
            app.options.appId
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
          const token1 = await getAuthToken(app);
          const token2 = await getAuthToken(app);
          expect(token1).to.equal(token2);
        });
      });
    }
  });

  describe('when there is no FID in the DB', () => {
    it('gets the token by registering a new FID', async () => {
      await getAuthToken(app);
      expect(createInstallationSpy).to.be.called;
      expect(generateAuthTokenSpy).not.to.be.called;
    });

    it('does not register a new FID on subsequent calls', async () => {
      await getAuthToken(app);
      await getAuthToken(app);
      expect(createInstallationSpy).to.be.calledOnce;
    });

    it('throws if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      await expect(getAuthToken(app)).to.eventually.be.rejected;
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
      await set(app.options.appId, installationEntry);
    });

    it('gets the token by calling generateAuthToken', async () => {
      await getAuthToken(app);
      expect(generateAuthTokenSpy).to.be.called;
      expect(createInstallationSpy).not.to.be.called;
    });

    it('does not call generateAuthToken on subsequent calls', async () => {
      await getAuthToken(app);
      await getAuthToken(app);
      expect(generateAuthTokenSpy).to.be.calledOnce;
    });

    it('throws if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      await expect(getAuthToken(app)).to.eventually.be.rejected;
    });

    describe('and the server returns an error', () => {
      it('removes the FID from the DB if the server returns a 401 response', async () => {
        generateAuthTokenSpy.callsFake(async () => {
          await sleep(50); // Request would take some time
          throw ERROR_FACTORY.create(ErrorCode.GENERATE_TOKEN_REQUEST_FAILED, {
            serverCode: 401,
            serverStatus: 'UNAUTHENTICATED',
            serverMessage: 'Invalid Authentication.'
          });
        });

        await expect(getAuthToken(app)).to.eventually.be.rejected;
        await expect(get(app.options.appId)).to.eventually.be.undefined;
      });

      it('removes the FID from the DB if the server returns a 404 response', async () => {
        generateAuthTokenSpy.callsFake(async () => {
          await sleep(50); // Request would take some time
          throw ERROR_FACTORY.create(ErrorCode.GENERATE_TOKEN_REQUEST_FAILED, {
            serverCode: 404,
            serverStatus: 'NOT_FOUND',
            serverMessage: 'FID not found.'
          });
        });

        await expect(getAuthToken(app)).to.eventually.be.rejected;
        await expect(get(app.options.appId)).to.eventually.be.undefined;
      });

      it('does not remove the FID from the DB if the server returns any other response', async () => {
        generateAuthTokenSpy.callsFake(async () => {
          await sleep(50); // Request would take some time
          throw ERROR_FACTORY.create(ErrorCode.GENERATE_TOKEN_REQUEST_FAILED, {
            serverCode: 500,
            serverStatus: 'INTERNAL',
            serverMessage: 'Internal server error.'
          });
        });

        await expect(getAuthToken(app)).to.eventually.be.rejected;
        await expect(get(app.options.appId)).to.eventually.deep.equal(
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
      await set(app.options.appId, installationEntry);
    });

    it('does not call any server APIs', async () => {
      await getAuthToken(app);
      expect(createInstallationSpy).not.to.be.called;
      expect(generateAuthTokenSpy).not.to.be.called;
    });

    it('works even if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      const token = await getAuthToken(app);
      expect(token).to.equal(AUTH_TOKEN);
    });
  });

  describe('when there is an auth token that is about to expire in the DB', () => {
    const DB_AUTH_TOKEN = 'authTokenFromDB';

    beforeEach(async () => {
      const installationEntry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          token: DB_AUTH_TOKEN,
          expiresIn: ONE_WEEK_MS,
          requestStatus: RequestStatus.COMPLETED,
          creationTime: Date.now() - ONE_WEEK_MS + TOKEN_EXPIRATION_BUFFER + 10
        }
      };
      await set(app.options.appId, installationEntry);
    });

    it('returns a different token after expiration', async () => {
      const token1 = await getAuthToken(app);
      expect(token1).to.equal(DB_AUTH_TOKEN);

      // Wait until token expiration
      await sleep(100);

      const token2 = await getAuthToken(app);
      expect(token2).to.equal(AUTH_TOKEN);

      expect(token1).not.to.equal(token2);
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
      await set(app.options.appId, installationEntry);
    });

    it('throws if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      await expect(getAuthToken(app)).to.eventually.be.rejected;
    });
  });
});
