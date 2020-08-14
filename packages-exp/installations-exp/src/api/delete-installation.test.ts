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

import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import * as deleteInstallationRequestModule from '../functions/delete-installation-request';
import { get, set } from '../helpers/idb-manager';
import {
  FirebaseInstallations,
  AppConfig
} from '@firebase/installations-types-exp';
import {
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from '../interfaces/installation-entry';
import { getFakeInstallations } from '../testing/fake-generators';
import '../testing/setup';
import { ErrorCode } from '../util/errors';
import { sleep } from '../util/sleep';
import { deleteInstallation } from './delete-installation';

const FID = 'children-of-the-damned';

describe('deleteInstallation', () => {
  let installations: FirebaseInstallations;
  let deleteInstallationRequestSpy: SinonStub<
    [AppConfig, RegisteredInstallationEntry],
    Promise<void>
  >;

  beforeEach(() => {
    installations = getFakeInstallations();

    deleteInstallationRequestSpy = stub(
      deleteInstallationRequestModule,
      'deleteInstallationRequest'
    ).callsFake(
      () => sleep(100) // Request would take some time
    );
  });

  it('resolves without calling server API if there is no installation', async () => {
    await expect(deleteInstallation(installations)).to.be.fulfilled;
    expect(deleteInstallationRequestSpy).not.to.have.been.called;
  });

  it('deletes and resolves without calling server API if the installation is unregistered', async () => {
    const entry: UnregisteredInstallationEntry = {
      registrationStatus: RequestStatus.NOT_STARTED,
      fid: FID
    };
    await set(installations.appConfig, entry);

    await expect(deleteInstallation(installations)).to.be.fulfilled;
    expect(deleteInstallationRequestSpy).not.to.have.been.called;
    await expect(get(installations.appConfig)).to.eventually.be.undefined;
  });

  it('rejects without calling server API if the installation is pending', async () => {
    const entry: InProgressInstallationEntry = {
      fid: FID,
      registrationStatus: RequestStatus.IN_PROGRESS,
      registrationTime: Date.now() - 3 * 1000
    };
    await set(installations.appConfig, entry);

    await expect(deleteInstallation(installations)).to.be.rejectedWith(
      ErrorCode.DELETE_PENDING_REGISTRATION
    );
    expect(deleteInstallationRequestSpy).not.to.have.been.called;
  });

  it('rejects without calling server API if the installation is registered and app is offline', async () => {
    const entry: RegisteredInstallationEntry = {
      fid: FID,
      registrationStatus: RequestStatus.COMPLETED,
      refreshToken: 'refreshToken',
      authToken: {
        token: 'authToken',
        expiresIn: 123456,
        requestStatus: RequestStatus.COMPLETED,
        creationTime: Date.now()
      }
    };
    await set(installations.appConfig, entry);
    stub(navigator, 'onLine').value(false);

    await expect(deleteInstallation(installations)).to.be.rejectedWith(
      ErrorCode.APP_OFFLINE
    );
    expect(deleteInstallationRequestSpy).not.to.have.been.called;
  });

  it('deletes and resolves after calling server API if the installation is registered', async () => {
    const entry: RegisteredInstallationEntry = {
      fid: FID,
      registrationStatus: RequestStatus.COMPLETED,
      refreshToken: 'refreshToken',
      authToken: {
        token: 'authToken',
        expiresIn: 123456,
        requestStatus: RequestStatus.COMPLETED,
        creationTime: Date.now()
      }
    };
    await set(installations.appConfig, entry);

    await expect(deleteInstallation(installations)).to.be.fulfilled;
    expect(deleteInstallationRequestSpy).to.have.been.calledOnceWith(
      installations.appConfig,
      entry
    );
    await expect(get(installations.appConfig)).to.eventually.be.undefined;
  });
});
