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
import * as getInstallationEntryModule from '../helpers/get-installation-entry';
import * as refreshAuthTokenModule from '../helpers/refresh-auth-token';

vi.mock('../helpers/get-installation-entry', { spy: true });
vi.mock('../helpers/refresh-auth-token', { spy: true });

import {
  RegisteredInstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';
import { getFakeInstallations } from '../testing/fake-generators';
import '../testing/setup';
import { getId } from './get-id';
import { FirebaseInstallationsImpl } from '../interfaces/installation-impl';

const FID = 'disciples-of-the-watch';

describe('getId', () => {
  let installations: FirebaseInstallationsImpl;

  beforeEach(() => {
    installations = getFakeInstallations();
  });

  it('returns the FID in InstallationEntry returned by getInstallationEntry', async () => {
    vi.mocked(
      getInstallationEntryModule.getInstallationEntry
    ).mockResolvedValue({
      installationEntry: {
        fid: FID,
        registrationStatus: RequestStatus.NOT_STARTED
      },
      registrationPromise: Promise.resolve({} as RegisteredInstallationEntry)
    });

    const fid = await getId(installations);
    expect(fid).toBe(FID);
    expect(
      getInstallationEntryModule.getInstallationEntry
    ).toHaveBeenCalledTimes(1);
  });

  it('calls refreshAuthToken if the installation is registered', async () => {
    vi.mocked(
      getInstallationEntryModule.getInstallationEntry
    ).mockResolvedValue({
      installationEntry: {
        fid: FID,
        registrationStatus: RequestStatus.COMPLETED,
        refreshToken: 'refreshToken',
        authToken: {
          requestStatus: RequestStatus.NOT_STARTED
        }
      }
    });

    vi.mocked(refreshAuthTokenModule.refreshAuthToken).mockResolvedValue({
      token: 'authToken',
      expiresIn: 123456,
      requestStatus: RequestStatus.COMPLETED,
      creationTime: Date.now()
    });

    await getId(installations);
    expect(refreshAuthTokenModule.refreshAuthToken).toHaveBeenCalledTimes(1);
  });
});
