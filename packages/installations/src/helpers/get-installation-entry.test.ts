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

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import * as createInstallationRequestModule from '../functions/create-installation-request';
import * as generateFidModule from './generate-fid';

vi.mock('../functions/create-installation-request', { spy: true });
vi.mock('./generate-fid', { spy: true });

import {
  AppConfig,
  FirebaseInstallationsImpl
} from '../interfaces/installation-impl';
import {
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from '../interfaces/installation-entry';
import { getFakeInstallations } from '../testing/fake-generators';
import '../testing/setup';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { sleep } from '../util/sleep';
import { getInstallationEntry } from './get-installation-entry';
import { get, set } from './idb-manager';

const FID = 'cry-of-the-black-birds';

describe('getInstallationEntry', () => {
  let fakeInstallations: FirebaseInstallationsImpl;
  let appConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ now: 1_000_000 });
    fakeInstallations = getFakeInstallations();
    appConfig = fakeInstallations.appConfig;

    vi.mocked(
      createInstallationRequestModule.createInstallationRequest
    ).mockImplementation(
      async (_, installationEntry): Promise<RegisteredInstallationEntry> => {
        await sleep(500); // Request would take some time
        const registeredInstallationEntry: RegisteredInstallationEntry = {
          // Returns new FID if client FID is invalid.
          fid: installationEntry.fid || FID,
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

  afterEach(async () => {
    // Clean up all pending requests.
    await vi.runAllTimersAsync();
  });

  it('saves the InstallationEntry in the database before returning it', async () => {
    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).toBeUndefined();

    const { installationEntry } = await getInstallationEntry(fakeInstallations);

    const newDbEntry = await get(appConfig);
    expect(newDbEntry).toEqual(installationEntry);
  });

  it('saves the InstallationEntry in the database if app is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).toBeUndefined();

    const { installationEntry } = await getInstallationEntry(fakeInstallations);

    const newDbEntry = await get(appConfig);
    expect(newDbEntry).toEqual(installationEntry);
  });

  it('saves the InstallationEntry in the database when registration completes', async () => {
    const { installationEntry, registrationPromise } =
      await getInstallationEntry(fakeInstallations);
    expect(installationEntry.registrationStatus).toBe(
      RequestStatus.IN_PROGRESS
    );
    expect(registrationPromise).toBeInstanceOf(Promise);

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).toEqual(installationEntry);

    await vi.advanceTimersToNextTimerAsync(); // Finish registration request.
    await expect(registrationPromise).resolves.toBeDefined();

    const newDbEntry = await get(appConfig);
    expect(newDbEntry!.registrationStatus).toBe(RequestStatus.COMPLETED);
  });

  it('saves the InstallationEntry in the database when registration fails', async () => {
    vi.mocked(
      createInstallationRequestModule.createInstallationRequest
    ).mockImplementation(async () => {
      await sleep(500); // Request would take some time
      throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
        requestName: 'Create Installation',
        serverCode: 500,
        serverStatus: 'INTERNAL',
        serverMessage: 'Internal server error.'
      });
    });

    const { installationEntry, registrationPromise } =
      await getInstallationEntry(fakeInstallations);
    expect(installationEntry.registrationStatus).toBe(
      RequestStatus.IN_PROGRESS
    );
    expect(registrationPromise).toBeInstanceOf(Promise);

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).toEqual(installationEntry);

    await vi.advanceTimersToNextTimerAsync(); // Finish registration request.
    await expect(registrationPromise).rejects.toThrow();

    const newDbEntry = await get(appConfig);
    expect(newDbEntry!.registrationStatus).toBe(RequestStatus.NOT_STARTED);
  });

  it('removes the InstallationEntry from the database when registration fails with 409', async () => {
    vi.mocked(
      createInstallationRequestModule.createInstallationRequest
    ).mockImplementation(async () => {
      await sleep(500); // Request would take some time
      throw ERROR_FACTORY.create(ErrorCode.REQUEST_FAILED, {
        requestName: 'Create Installation',
        serverCode: 409,
        serverStatus: 'INVALID_ARGUMENT',
        serverMessage: 'FID cannot be used.'
      });
    });

    const { installationEntry, registrationPromise } =
      await getInstallationEntry(fakeInstallations);
    expect(installationEntry.registrationStatus).toBe(
      RequestStatus.IN_PROGRESS
    );

    const oldDbEntry = await get(appConfig);
    expect(oldDbEntry).toEqual(installationEntry);

    await vi.advanceTimersToNextTimerAsync(); // Finish registration request.
    await expect(registrationPromise).rejects.toThrow();

    const newDbEntry = await get(appConfig);
    expect(newDbEntry).toBeUndefined();
  });

  it('returns the same FID on subsequent calls', async () => {
    const { installationEntry: entry1 } =
      await getInstallationEntry(fakeInstallations);
    const { installationEntry: entry2 } =
      await getInstallationEntry(fakeInstallations);
    expect(entry1.fid).toBe(entry2.fid);
  });

  describe('when there is no InstallationEntry in database', () => {
    beforeEach(() => {
      vi.mocked(generateFidModule.generateFid).mockReturnValue(FID);
    });

    it('returns a new pending InstallationEntry and triggers createInstallation', async () => {
      const { installationEntry, registrationPromise } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry.registrationStatus).toBe(
        RequestStatus.IN_PROGRESS
      );
      expect(registrationPromise).toBeInstanceOf(Promise);
      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: (installationEntry as InProgressInstallationEntry)
          .registrationTime
      });
      expect(generateFidModule.generateFid).toHaveBeenCalled();
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalled();
    });

    it('returns a new unregistered InstallationEntry if app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const { installationEntry } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });
      expect(generateFidModule.generateFid).toHaveBeenCalled();
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
    });

    it('does not trigger createInstallation REST call on subsequent calls', async () => {
      await getInstallationEntry(fakeInstallations);
      await getInstallationEntry(fakeInstallations);

      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('returns a registrationPromise on subsequent calls before initial promise resolves', async () => {
      const { registrationPromise: promise1 } =
        await getInstallationEntry(fakeInstallations);
      const { registrationPromise: promise2 } =
        await getInstallationEntry(fakeInstallations);

      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalledTimes(1);
      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });

    it('does not return a registrationPromise on subsequent calls after initial promise resolves', async () => {
      const { registrationPromise: promise1 } =
        await getInstallationEntry(fakeInstallations);
      expect(promise1).toBeInstanceOf(Promise);

      await vi.advanceTimersToNextTimerAsync(); // Finish registration request.
      await expect(promise1).resolves.toBeDefined();

      const { registrationPromise: promise2 } =
        await getInstallationEntry(fakeInstallations);
      expect(promise2).toBeUndefined();

      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('waits for the FID from the server if FID generation fails', async () => {
      vi.useRealTimers();
      vi.useFakeTimers({
        now: 1_000_000,
        shouldAdvanceTime: true /* Needed to allow the createInstallation request to complete. */
      });

      // FID generation fails.
      vi.mocked(generateFidModule.generateFid).mockReturnValue(
        generateFidModule.INVALID_FID
      );

      const getInstallationEntryPromise =
        getInstallationEntry(fakeInstallations);

      const { installationEntry, registrationPromise } =
        await getInstallationEntryPromise;

      expect(installationEntry.fid).toBe(FID);
      expect(registrationPromise).toBeUndefined();
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
      const { installationEntry, registrationPromise } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry.registrationStatus).toBe(
        RequestStatus.IN_PROGRESS
      );
      expect(registrationPromise).toBeInstanceOf(Promise);
      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: (installationEntry as InProgressInstallationEntry)
          .registrationTime
      });
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('returns the same InstallationEntry if the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const { installationEntry } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
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
      vi.setSystemTime(1_001_000); // One second after the request was initiated.

      const { installationEntry } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: 1_000_000
      });
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
    });

    it('updates the InstallationEntry and triggers createInstallation if the request fails', async () => {
      vi.useRealTimers();
      vi.useFakeTimers({
        now: 1_001_000 /* One second after the request was initiated. */,
        shouldAdvanceTime: true /* Needed to allow the createInstallation request to complete. */
      });
      vi.clearAllMocks();

      const installationEntryPromise = getInstallationEntry(fakeInstallations);

      // The pending request fails after a while.
      await vi.advanceTimersByTimeAsync(3000);
      await set(appConfig, {
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });

      const { registrationPromise } = await installationEntryPromise;

      // Let the new getInstallationEntry process start.
      await sleep(250);

      const tokenDetails = (await get(
        appConfig
      )) as InProgressInstallationEntry;
      expect(tokenDetails.registrationTime).toBeGreaterThanOrEqual(
        /* When the first pending request failed. */ 1_004_000
      );
      expect(tokenDetails).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        // Ignore registrationTime as we already checked it.
        registrationTime: tokenDetails.registrationTime
      });

      expect(registrationPromise).toBeInstanceOf(Promise);
      await registrationPromise;
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('updates the InstallationEntry if the request fails and the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      vi.useRealTimers();
      vi.useFakeTimers({
        now: 1_001_000 /* One second after the request was initiated. */,
        shouldAdvanceTime: true /* Needed to allow the createInstallation request to complete. */
      });

      const installationEntryPromise = getInstallationEntry(fakeInstallations);

      // The pending request fails after a while.
      await vi.advanceTimersByTimeAsync(3000);
      await set(appConfig, {
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });

      const { registrationPromise } = await installationEntryPromise;

      // Let the new getInstallationEntry process start.
      await sleep(250);

      expect(await get(appConfig)).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });

      expect(registrationPromise).toBeInstanceOf(Promise);
      await expect(registrationPromise).rejects.toThrow('Application offline');
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
    });

    it('returns a new pending InstallationEntry and triggers createInstallation if the request had already timed out', async () => {
      vi.setSystemTime(1_015_000); // Fifteen seconds after the request was initiated.

      const { installationEntry } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.IN_PROGRESS,
        registrationTime: 1_015_000
      });
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).toHaveBeenCalledTimes(1);
    });

    it('returns a new unregistered InstallationEntry if the request had already timed out and the app is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      vi.setSystemTime(1_015_000); // Fifteen seconds after the request was initiated.

      const { installationEntry } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      });
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
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
      const { installationEntry } =
        await getInstallationEntry(fakeInstallations);

      expect(installationEntry).toEqual({
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: { requestStatus: RequestStatus.NOT_STARTED }
      });
      expect(
        createInstallationRequestModule.createInstallationRequest
      ).not.toHaveBeenCalled();
    });
  });
});
