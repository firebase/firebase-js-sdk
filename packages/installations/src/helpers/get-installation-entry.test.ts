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

import { AssertionError, expect } from 'chai';
import { SinonFakeTimers, SinonStub, stub, useFakeTimers } from 'sinon';
import * as createInstallationModule from '../api/create-installation';
import { AppConfig } from '../interfaces/app-config';
import {
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from '../interfaces/installation-entry';
import { getFakeAppConfig } from '../testing/get-fake-app';
import '../testing/setup';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { sleep } from '../util/sleep';
import * as fidGenerator from './generate-fid';
import { getInstallationEntry } from './get-installation-entry';
import { get, set } from './idb-manager';

const FID = 'cry-of-the-black-birds';

describe('getInstallationEntry', () => {
  let clock: SinonFakeTimers;
  let appConfig: AppConfig;
  let createInstallationSpy: SinonStub<
    [AppConfig, InProgressInstallationEntry],
    Promise<RegisteredInstallationEntry>
  >;

  beforeEach(() => {
    clock = useFakeTimers();
    appConfig = getFakeAppConfig();
    createInstallationSpy = stub(
      createInstallationModule,
      'createInstallation'
    ).callsFake(
      async (_, installationEntry): Promise<RegisteredInstallationEntry> => {
        await sleep(100); // Request would take some time
        const registeredInstallationEntry: RegisteredInstallationEntry = {
          fid: installationEntry.fid,
          registrationStatus: RequestStatus.COMPLETED,
          refreshToken: 'refreshToken',
          authToken: {
            requestStatus: RequestStatus.COMPLETED,
            creationTime: Date.now(),
            token: 'token',
            expiresIn: 1_000_000_000
          }
        };
        return registeredInstallationEntry;
      }
    );
  });

  it('saves the InstallationEntry in the database before returning it', async () => {
    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).to.be.undefined;

    const { installationEntry } = await getInstallationEntry(appConfig);

    const newDbEntry = await get(appConfig);
    expect(newDbEntry).to.deep.equal(installationEntry);
  });

  it('saves the InstallationEntry in the database if app is offline', async () => {
    stub(navigator, 'onLine').value(false);

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).to.be.undefined;

    const { installationEntry } = await getInstallationEntry(appConfig);

    const newDbEntry = await get(appConfig);
    expect(newDbEntry).to.deep.equal(installationEntry);
  });

  it('saves the InstallationEntry in the database when registration completes', async () => {
    const {
      installationEntry,
      registrationPromise
    } = await getInstallationEntry(appConfig);
    expect(installationEntry.registrationStatus).to.equal(
      RequestStatus.IN_PROGRESS
    );
    expect(registrationPromise).to.be.an.instanceOf(Promise);

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).to.deep.equal(installationEntry);

    clock.next(); // Finish registration request.
    await expect(registrationPromise).to.be.fulfilled;

    const newDbEntry = (await get(appConfig)) as RegisteredInstallationEntry;
    expect(newDbEntry.registrationStatus).to.equal(RequestStatus.COMPLETED);
  });

  it('saves the InstallationEntry in the database when registration fails', async () => {
    createInstallationSpy.callsFake(async () => {
      await sleep(100); // Request would take some time
      throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
        requestName: 'Create Installation',
        serverCode: 500,
        serverStatus: 'INTERNAL',
        serverMessage: 'Internal server error.'
      });
    });

    const {
      installationEntry,
      registrationPromise
    } = await getInstallationEntry(appConfig);
    expect(installationEntry.registrationStatus).to.equal(
      RequestStatus.IN_PROGRESS
    );
    expect(registrationPromise).to.be.an.instanceOf(Promise);

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).to.deep.equal(installationEntry);

    clock.next(); // Finish registration request.
    await expect(registrationPromise).to.be.rejected;

    const newDbEntry = (await get(appConfig)) as UnregisteredInstallationEntry;
    expect(newDbEntry.registrationStatus).to.equal(RequestStatus.NOT_STARTED);
  });

  it('removes the InstallationEntry from the database when registration fails with 409', async () => {
    createInstallationSpy.callsFake(async () => {
      await sleep(100); // Request would take some time
      throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
        requestName: 'Create Installation',
        serverCode: 409,
        serverStatus: 'INVALID_ARGUMENT',
        serverMessage: 'FID can not be used.'
      });
    });

    const {
      installationEntry,
      registrationPromise
    } = await getInstallationEntry(appConfig);
    expect(installationEntry.registrationStatus).to.equal(
      RequestStatus.IN_PROGRESS
    );

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).to.deep.equal(installationEntry);

    clock.next(); // Finish registration request.
    await expect(registrationPromise).to.be.rejected;

    const newDbEntry = await get(appConfig);
    expect(newDbEntry).to.be.undefined;
  });

  it('returns the same FID on subsequent calls', async () => {
    const { installationEntry: entry1 } = await getInstallationEntry(appConfig);
    const { installationEntry: entry2 } = await getInstallationEntry(appConfig);
    expect(entry1.fid).to.equal(entry2.fid);
  });

  describe('when there is no InstallationEntry in database', () => {
    let generateInstallationEntrySpy: SinonStub<[], string>;

    beforeEach(() => {
      generateInstallationEntrySpy = stub(fidGenerator, 'generateFid').returns(
        FID
      );
    });

    it('returns a new pending InstallationEntry and triggers createInstallation', async () => {
      const {
        installationEntry,
        registrationPromise
      } = await getInstallationEntry(appConfig);

      if (installationEntry.registrationStatus !== RequestStatus.IN_PROGRESS) {
        throw new AssertionError('InstallationEntry is not IN_PROGRESS.');
      }

      expect(registrationPromise).to.be.an.instanceOf(Promise);
      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,

        // https://github.com/chaijs/chai/issues/644
        registrationTime: installationEntry.registrationTime
      });
      expect(generateInstallationEntrySpy).to.be.called;
      expect(createInstallationSpy).to.be.called;
    });

    it('returns a new unregistered InstallationEntry if app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      const { installationEntry } = await getInstallationEntry(appConfig);

      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });
      expect(generateInstallationEntrySpy).to.be.called;
      expect(createInstallationSpy).not.to.be.called;
    });

    it('does not trigger createInstallation REST call on subsequent calls', async () => {
      await getInstallationEntry(appConfig);
      await getInstallationEntry(appConfig);

      expect(createInstallationSpy).to.be.calledOnce;
    });

    it('returns a registrationPromise on subsequent calls before initial promise resolves', async () => {
      const { registrationPromise: promise1 } = await getInstallationEntry(
        appConfig
      );
      const { registrationPromise: promise2 } = await getInstallationEntry(
        appConfig
      );

      expect(createInstallationSpy).to.be.calledOnce;
      expect(promise1).to.be.an.instanceOf(Promise);
      expect(promise2).to.be.an.instanceOf(Promise);
    });

    it('does not return a registrationPromise on subsequent calls after initial promise resolves', async () => {
      const { registrationPromise: promise1 } = await getInstallationEntry(
        appConfig
      );
      expect(promise1).to.be.an.instanceOf(Promise);

      clock.next(); // Finish registration request.
      await expect(promise1).to.be.fulfilled;

      const { registrationPromise: promise2 } = await getInstallationEntry(
        appConfig
      );
      expect(promise2).to.be.undefined;

      expect(createInstallationSpy).to.be.calledOnce;
    });
  });

  describe('when there is an unregistered InstallationEntry in the database', () => {
    beforeEach(async () => {
      const unregisteredInstallationEntry: UnregisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      };
      await set(appConfig, unregisteredInstallationEntry);
    });

    it('returns a pending InstallationEntry and triggers createInstallation', async () => {
      const {
        installationEntry,
        registrationPromise
      } = await getInstallationEntry(appConfig);

      if (installationEntry.registrationStatus !== RequestStatus.IN_PROGRESS) {
        throw new AssertionError('InstallationEntry is not IN_PROGRESS.');
      }

      expect(registrationPromise).to.be.an.instanceOf(Promise);
      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        // https://github.com/chaijs/chai/issues/644
        registrationTime: installationEntry.registrationTime
      });
      expect(createInstallationSpy).to.be.calledOnce;
    });

    it('returns the same InstallationEntry if the app is offline', async () => {
      stub(navigator, 'onLine').value(false);

      const { installationEntry } = await getInstallationEntry(appConfig);

      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });
      expect(createInstallationSpy).not.to.be.called;
    });
  });

  describe('when there is a pending InstallationEntry in the database', () => {
    beforeEach(async () => {
      const inProgressInstallationEntry: InProgressInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: 1_000_000
      };
      await set(appConfig, inProgressInstallationEntry);
    });

    it("returns the same InstallationEntry if the request hasn't timed out", async () => {
      stub(Date, 'now').returns(1_001_000); // One second later

      const { installationEntry } = await getInstallationEntry(appConfig);

      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: 1_000_000
      });
      expect(createInstallationSpy).not.to.be.called;
    });

    it('returns a new pending InstallationEntry and triggers createInstallation if the request timed out', async () => {
      stub(Date, 'now').returns(1_015_000); // Fifteen seconds later

      const { installationEntry } = await getInstallationEntry(appConfig);

      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: 1_015_000
      });
      expect(createInstallationSpy).to.be.calledOnce;
    });

    it('returns a new unregistered InstallationEntry if the request timed out and the app is offline', async () => {
      stub(navigator, 'onLine').value(false);
      stub(Date, 'now').returns(1_015_000); // Fifteen seconds later

      const { installationEntry } = await getInstallationEntry(appConfig);

      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });
      expect(createInstallationSpy).not.to.be.called;
    });
  });

  describe('when there is a registered InstallationEntry in the database', () => {
    beforeEach(async () => {
      const registeredInstallationEntry: RegisteredInstallationEntry = {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: { requestStatus: RequestStatus.NOT_STARTED }
      };
      await set(appConfig, registeredInstallationEntry);
    });

    it('returns the InstallationEntry from the database', async () => {
      const { installationEntry } = await getInstallationEntry(appConfig);

      expect(installationEntry).to.deep.equal({
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: { requestStatus: RequestStatus.NOT_STARTED }
      });
      expect(createInstallationSpy).not.to.be.called;
    });
  });
});
