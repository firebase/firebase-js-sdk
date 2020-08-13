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

import { stub } from 'sinon';
import { expect } from 'chai';
import {
  getIid,
  getIidPromise,
  getAuthenticationToken,
  getAuthTokenPromise
} from './iid_service';
import '../../test/setup';
import { FirebaseInstallations } from '@firebase/installations-types';

describe('Firebase Perofmrance > iid_service', () => {
  const IID = 'fid';
  const AUTH_TOKEN = 'authToken';

  let fakeInstallations: FirebaseInstallations;
  before(() => {
    const getId = stub().resolves(IID);
    const getToken = stub().resolves(AUTH_TOKEN);
    fakeInstallations = ({
      getId,
      getToken
    } as unknown) as FirebaseInstallations;
  });

  describe('getIidPromise', () => {
    it('provides iid', async () => {
      const iid = await getIidPromise(fakeInstallations);

      expect(iid).to.be.equal(IID);
      expect(getIid()).to.be.equal(IID);
    });
  });

  describe('getAuthTokenPromise', () => {
    it('provides authentication token', async () => {
      const token = await getAuthTokenPromise(fakeInstallations);

      expect(token).to.be.equal(AUTH_TOKEN);
      expect(getAuthenticationToken()).to.be.equal(AUTH_TOKEN);
    });
  });
});
