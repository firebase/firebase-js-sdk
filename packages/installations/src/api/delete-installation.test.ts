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

import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import { AppConfig } from '../interfaces/app-config';
import {
  RegisteredInstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';
import { compareHeaders } from '../testing/compare-headers';
import { getFakeAppConfig } from '../testing/get-fake-app';
import '../testing/setup';
import {
  INSTALLATIONS_API_URL,
  INTERNAL_AUTH_VERSION
} from '../util/constants';
import { deleteInstallation } from './delete-installation';

const FID = 'defenders-of-the-faith';

describe('deleteInstallation', () => {
  let appConfig: AppConfig;
  let fetchSpy: SinonStub<[RequestInfo, RequestInit?], Promise<Response>>;
  let registeredInstallationEntry: RegisteredInstallationEntry;

  beforeEach(() => {
    appConfig = getFakeAppConfig();

    registeredInstallationEntry = {
      fid: FID,
      registrationStatus: RequestStatus.COMPLETED,
      refreshToken: 'refreshToken',
      authToken: {
        requestStatus: RequestStatus.NOT_STARTED
      }
    };

    fetchSpy = stub(self, 'fetch').resolves(new Response());
  });

  it('calls the deleteInstallation server API with correct parameters', async () => {
    const expectedHeaders = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `${INTERNAL_AUTH_VERSION} refreshToken`,
      'x-goog-api-key': 'apiKey'
    });
    const expectedRequest: RequestInit = {
      method: 'DELETE',
      headers: expectedHeaders
    };
    const expectedEndpoint = `${INSTALLATIONS_API_URL}/projects/projectId/installations/${FID}`;

    await deleteInstallation(appConfig, registeredInstallationEntry);

    expect(fetchSpy).to.be.calledOnceWith(expectedEndpoint, expectedRequest);
    const actualHeaders = fetchSpy.lastCall.lastArg.headers;
    compareHeaders(expectedHeaders, actualHeaders);
  });
});
