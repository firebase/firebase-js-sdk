// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Auth,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getAdditionalUserInfo,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  OperationType,
  ProviderId,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  unlink,
  updateEmail,
  updatePassword,
  updateProfile
} from '@firebase/auth';

import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { createNewTenant } from '../../helpers/integration/emulator_rest_helpers';
import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
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