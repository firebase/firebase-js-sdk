/**
 * @license
 * Copyright 2023 Google LLC
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

// eslint-disable-next-line import/no-extraneous-dependencies
import { Auth, validatePassword } from '@firebase/auth';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  cleanUpTestInstance,
  generateValidPassword,
  getTestInstance
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

describe('Integration test: password validation', () => {
  let auth: Auth;

  beforeEach(() => {
    auth = getTestInstance();
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
  });

  context('validatePassword', () => {
    // Password will always be invalid since the minimum min length is 6.
    const INVALID_PASSWORD = 'a';

    it('considers valid passwords valid against the policy configured for the project', async () => {
      const password = await generateValidPassword(auth);
      expect((await validatePassword(auth, password)).isValid).to.be.true;
    });

    it('considers invalid passwords invalid against the policy configured for the project', async () => {
      expect((await validatePassword(auth, INVALID_PASSWORD)).isValid).to.be
        .false;
    });
  });
});
