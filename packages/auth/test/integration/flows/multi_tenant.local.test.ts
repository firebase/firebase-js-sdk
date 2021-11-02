/**
 * @license
 * Copyright 2021 Google LLC
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
import {
  Auth,
  signInAnonymously,
} from '@firebase/auth';

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { createNewTenant } from '../../helpers/integration/emulator_rest_helpers';
import {
  cleanUpTestInstance,
  getTestInstance,
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

describe('Integration test: multi-tenant', () => {
  let auth: Auth;
  let tenantA: string;
  let tenantB: string;

  beforeEach(async () => {
    auth = getTestInstance(/* requireEmulator */ true);
    tenantA = await createNewTenant();
    tenantB = await createNewTenant();
  });

  afterEach(async () => {
    await cleanUpTestInstance(auth);
  });

  it('sets the correct tenantId on the underlying user', async () => {
    auth.tenantId = tenantA;
    const {user} = await signInAnonymously(auth);
    expect(user.tenantId).to.eq(tenantA);
  });

  it('allows updateCurrentUser to be called when TID matches', async () => {
    auth.tenantId = tenantA;
    const {user} = await signInAnonymously(auth);
    await expect(auth.updateCurrentUser(user)).not.to.be.rejected;
  });

  it('throws for mismatched TID', async () => {
    auth.tenantId = tenantA;
    const {user} = await signInAnonymously(auth);
    auth.tenantId = tenantB;
    await expect(auth.updateCurrentUser(user)).to.be.rejectedWith('auth/tenant-id-mismatch');
  });

  it('allows users to be deleted', async () => {
    auth.tenantId = tenantA;
    const {user} = await signInAnonymously(auth);
    await user.delete();
    expect(auth.currentUser).to.be.null;
  });

  // The rest of the tenantId tests are in the respective flow tests
});