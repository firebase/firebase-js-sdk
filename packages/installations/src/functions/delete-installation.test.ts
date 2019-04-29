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
import { SinonStub, stub } from 'sinon';
import * as deleteInstallationModule from '../api/delete-installation';
import { extractAppConfig } from '../helpers/extract-app-config';
import { get, set } from '../helpers/idb-manager';
import { AppConfig } from '../interfaces/app-config';
import {
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus,
  UnregisteredInstallationEntry
} from '../interfaces/installation-entry';
import { getFakeApp } from '../testing/get-fake-app';
import '../testing/setup';
import { ErrorCode } from '../util/errors';
import { sleep } from '../util/sleep';
import { deleteInstallation } from './delete-installation';

const FID = 'children-of-the-damned';

describe('deleteInstallation', () => {
  let app: FirebaseApp;
  let appConfig: AppConfig;
  let deleteInstallationSpy: SinonStub<
    [AppConfig, RegisteredInstallationEntry],
    Promise<void>
  >;

  beforeEach(() => {
    app = getFakeApp();
    appConfig = extractAppConfig(app);

    deleteInstallationSpy = stub(
      deleteInstallationModule,
      'deleteInstallation'
    ).callsFake(
      () => sleep(50) // Request would take some time
    );
  });

  it('resolves without calling server API if there is no installation', async () => {
    await expect(deleteInstallation(app)).to.eventually.be.fulfilled;
    expect(deleteInstallationSpy).not.to.have.been.called;
  });

  it('deletes and resolves without calling server API if the installation is unregistered', async () => {
    const entry: UnregisteredInstallationEntry = {
      registrationStatus: RequestStatus.NOT_STARTED,
      fid: FID
    };
    await set(appConfig, entry);

    await expect(deleteInstallation(app)).to.eventually.be.fulfilled;
    expect(deleteInstallationSpy).not.to.have.been.called;
    await expect(get(appConfig)).to.eventually.be.undefined;
  });

  it('rejects without calling server API if the installation is pending', async () => {
    const entry: InProgressInstallationEntry = {
      fid: FID,
      registrationStatus: RequestStatus.IN_PROGRESS,
      registrationTime: Date.now() - 3 * 1000
    };
    await set(appConfig, entry);

    await expect(deleteInstallation(app)).to.eventually.be.rejectedWith(
      ErrorCode.DELETE_PENDING_REGISTRATION
    );
    expect(deleteInstallationSpy).not.to.have.been.called;
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
    await set(appConfig, entry);
    stub(navigator, 'onLine').value(false);

    await expect(deleteInstallation(app)).to.eventually.be.rejectedWith(
      ErrorCode.APP_OFFLINE
    );
    expect(deleteInstallationSpy).not.to.have.been.called;
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
    await set(appConfig, entry);

    await expect(deleteInstallation(app)).to.eventually.be.fulfilled;
    expect(deleteInstallationSpy).to.have.been.calledOnceWith(appConfig, entry);
    await expect(get(appConfig)).to.eventually.be.undefined;
  });
});
