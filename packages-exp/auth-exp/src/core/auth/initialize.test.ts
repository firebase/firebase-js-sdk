/**
 * @license
 * Copyright 2020 Google LLC
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

import { Auth, User } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { endpointUrl, mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { _getFinalTarget, Endpoint } from '../../api';
import { _castAuth } from './auth_impl';
import { useEmulator } from './initialize';

describe('core/auth/initialize', () => {
  let auth: Auth;
  let user: User;
  let normalEndpoint: fetch.Route;
  let emulatorEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(_castAuth(auth), 'uid', 'email', true);
    fetch.setUp();
    normalEndpoint = mockEndpoint(Endpoint.DELETE_ACCOUNT, {});
    emulatorEndpoint = fetch.mock(
      `http://localhost:2020/${endpointUrl(Endpoint.DELETE_ACCOUNT).replace(
        /^.*:\/\//,
        ''
      )}`,
      {}
    );
  });

  afterEach(() => {
    fetch.tearDown();
  });

  context('useEmulator', () => {
    it('fails if a network request has already been made', async () => {
      await user.delete();
      expect(() => useEmulator(auth, 'localhost', 2020)).to.throw(
        FirebaseError,
        'auth/emulator-config-failed'
      );
    });

    it('updates the endpoint appropriately', async () => {
      useEmulator(auth, 'localhost', 2020);
      await user.delete();
      expect(normalEndpoint.calls.length).to.eq(0);
      expect(emulatorEndpoint.calls.length).to.eq(1);
    });
  });
});
