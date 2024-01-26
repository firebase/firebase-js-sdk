/**
 * @license
 * Copyright 2024 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Auth,
  OperationType,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  updateProfile
} from '@firebase/auth';
import { isBrowser } from '@firebase/util';
import { initializeServerApp } from '@firebase/app';

import {
  cleanUpTestInstance,
  getTestInstance,
  getTestInstanceForServerApp,
  randomEmail
} from '../../helpers/integration/helpers';

import { getAppConfig } from '../../helpers/integration/settings';

use(chaiAsPromised);

const signInWaitDuration = 200;

describe('Integration test: Auth FirebaseServerApp tests', () => {
  let auth: Auth;
  let serverAppAuth: Auth | null;

  beforeEach(() => {
    auth = getTestInstance();
  });

  afterEach(async () => {
    if (serverAppAuth) {
      await signOut(serverAppAuth);
      serverAppAuth = null;
    }
    await cleanUpTestInstance(auth);
  });

  it('signs in with anonymous user', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);
    const user = userCred.user;
    expect(user).to.equal(auth.currentUser);
    expect(user.isAnonymous).to.be.true;
    expect(user.uid).to.be.a('string');
    expect(user.emailVerified).to.be.false;
    expect(user.providerData.length).to.equal(0);

    const authIdToken = await user.getIdToken();
    const firebaseServerAppSettings = { authIdToken };

    const serverApp = initializeServerApp(auth.app, firebaseServerAppSettings);
    serverAppAuth = getTestInstanceForServerApp(serverApp);

    console.log('auth.emulatorConfig ', auth.emulatorConfig);
    console.log('serverAuth.emulatorConfig ', serverAppAuth.emulatorConfig);

    let numberServerLogins = 0;
    onAuthStateChanged(serverAppAuth, serverAuthUser => {
      if (serverAuthUser) {
        numberServerLogins++;

        // Note, the serverAuthUser does not fully equal the standard Auth user
        // since the serverAuthUser does not have a refresh token.
        expect(user.uid).to.be.equal(serverAuthUser.uid);
        expect(user.isAnonymous).to.be.equal(serverAuthUser.isAnonymous);
        expect(user.emailVerified).to.be.equal(serverAuthUser.emailVerified);
        expect(user.providerData.length).to.eq(
          serverAuthUser.providerData.length
        );
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(numberServerLogins).to.equal(1);
  });

  it('getToken operations fullfilled or rejected', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);
    const user = userCred.user;
    expect(user).to.equal(auth.currentUser);
    expect(user.isAnonymous).to.be.true;
    expect(user.uid).to.be.a('string');

    const authIdToken = await user.getIdToken();
    const firebaseServerAppSettings = { authIdToken };

    const serverApp = initializeServerApp(
      getAppConfig(),
      firebaseServerAppSettings
    );
    serverAppAuth = getTestInstanceForServerApp(serverApp);
    let numberServerLogins = 0;
    onAuthStateChanged(serverAppAuth, serverAuthUser => {
      if (serverAuthUser) {
        numberServerLogins++;
        expect(user.uid).to.be.equal(serverAuthUser.uid);
        expect(serverAppAuth).to.not.be.null;
        expect(serverAuthUser.getIdToken);
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).to.equal(serverAuthUser);
        }
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(numberServerLogins).to.equal(1);
    expect(serverAppAuth.currentUser).to.not.be.null;
    if (serverAppAuth.currentUser) {
      const idToken = await serverAppAuth.currentUser.getIdToken(
        /*forceRefresh=*/ false
      );
      expect(idToken).to.not.be.null;
      await expect(serverAppAuth.currentUser.getIdToken(/*forceRefresh=*/ true))
        .to.be.rejected;
    }
  });

  it('invalid token does not sign in user', async () => {
    if (isBrowser()) {
      return;
    }
    const authIdToken = '{ invalid token }';
    const firebaseServerAppSettings = { authIdToken };

    const serverApp = initializeServerApp(
      getAppConfig(),
      firebaseServerAppSettings
    );
    serverAppAuth = getTestInstanceForServerApp(serverApp);
    expect(serverAppAuth.currentUser).to.be.null;

    let numberServerLogins = 0;
    onAuthStateChanged(serverAppAuth, serverAuthUser => {
      if (serverAuthUser) {
        numberServerLogins++;
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(numberServerLogins).to.equal(0);
    expect(serverAppAuth.currentUser).to.be.null;
  });

  it('signs in with email crednetial user', async () => {
    if (isBrowser()) {
      return;
    }
    const email = randomEmail();
    const password = 'password';
    const userCred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCred.user;
    expect(auth.currentUser).to.eq(userCred.user);
    expect(userCred.operationType).to.eq(OperationType.SIGN_IN);

    const additionalUserInfo = getAdditionalUserInfo(userCred)!;
    expect(additionalUserInfo.isNewUser).to.be.true;
    expect(additionalUserInfo.providerId).to.eq('password');
    expect(user.isAnonymous).to.be.false;
    expect(user.email).to.equal(email);

    const authIdToken = await user.getIdToken();
    const firebaseServerAppSettings = { authIdToken };

    const serverApp = initializeServerApp(
      getAppConfig(),
      firebaseServerAppSettings
    );
    serverAppAuth = getTestInstanceForServerApp(serverApp);
    let numberServerLogins = 0;
    onAuthStateChanged(serverAppAuth, serverAuthUser => {
      if (serverAuthUser) {
        numberServerLogins++;
        expect(serverAppAuth).to.not.be.null;
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).to.equal(serverAuthUser);
        }
        expect(user.uid).to.be.equal(serverAuthUser.uid);
        expect(serverAuthUser.refreshToken).to.be.empty;
        expect(user.isAnonymous).to.be.equal(serverAuthUser.isAnonymous);
        expect(user.emailVerified).to.be.equal(serverAuthUser.emailVerified);
        expect(user.providerData.length).to.eq(
          serverAuthUser.providerData.length
        );
        expect(user.email).to.equal(serverAuthUser.email);
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(numberServerLogins).to.equal(1);
  });

  it('can reload user', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).to.eq(userCred.user);

    const user = userCred.user;
    expect(user).to.equal(auth.currentUser);
    expect(user.uid).to.be.a('string');

    const authIdToken = await user.getIdToken();
    const firebaseServerAppSettings = { authIdToken };

    const serverApp = initializeServerApp(
      getAppConfig(),
      firebaseServerAppSettings
    );
    serverAppAuth = getTestInstanceForServerApp(serverApp);
    let numberServerLogins = 0;
    onAuthStateChanged(serverAppAuth, serverAuthUser => {
      if (serverAuthUser) {
        numberServerLogins++;
        expect(user.uid).to.be.equal(serverAuthUser.uid);
        expect(serverAppAuth).to.not.be.null;
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).to.equal(serverAuthUser);
        }
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(serverAppAuth.currentUser).to.not.be.null;
    if (serverAppAuth.currentUser) {
      await serverAppAuth.currentUser.reload();
    }
    expect(numberServerLogins).to.equal(1);
  });

  it('can update server based user profile', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).to.eq(userCred.user);

    const user = userCred.user;
    expect(user).to.equal(auth.currentUser);
    expect(user.uid).to.be.a('string');
    expect(user.displayName).to.be.null;

    const authIdToken = await user.getIdToken();
    const firebaseServerAppSettings = { authIdToken };

    const serverApp = initializeServerApp(
      getAppConfig(),
      firebaseServerAppSettings
    );
    serverAppAuth = getTestInstanceForServerApp(serverApp);
    let numberServerLogins = 0;
    const newDisplayName = 'newName';
    onAuthStateChanged(serverAppAuth, serverAuthUser => {
      if (serverAuthUser) {
        numberServerLogins++;
        expect(serverAppAuth).to.not.be.null;
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).to.equal(serverAuthUser);
        }
        expect(user.uid).to.be.equal(serverAuthUser.uid);
        expect(user.displayName).to.be.null;
        void updateProfile(serverAuthUser, {
          displayName: newDisplayName
        });
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(serverAppAuth.currentUser).to.not.be.null;

    if (serverAppAuth.currentUser) {
      await serverAppAuth.currentUser.reload();
    }

    expect(numberServerLogins).to.equal(1);
    expect(serverAppAuth).to.not.be.null;
    if (serverAppAuth) {
      expect(serverAppAuth.currentUser).to.not.be.null;
      expect(serverAppAuth.currentUser?.displayName).to.not.be.null;
      expect(serverAppAuth.currentUser?.displayName).to.equal(newDisplayName);
    }
  });

  it('can sign out of main auth and still use server auth', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).to.eq(userCred.user);

    const user = userCred.user;
    expect(user).to.equal(auth.currentUser);
    expect(user.uid).to.be.a('string');
    expect(user.displayName).to.be.null;

    const authIdToken = await user.getIdToken();
    const firebaseServerAppSettings = { authIdToken };

    const serverApp = initializeServerApp(
      getAppConfig(),
      firebaseServerAppSettings
    );
    serverAppAuth = getTestInstanceForServerApp(serverApp);
    let numberServerLogins = 0;
    onAuthStateChanged(serverAppAuth, serverAuthUser => {
      if (serverAuthUser) {
        numberServerLogins++;
        expect(serverAppAuth).to.not.be.null;
        expect(user.uid).to.be.equal(serverAuthUser.uid);
        expect(user.displayName).to.be.null;
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).to.equal(serverAuthUser);
        }
      }
    });

    await signOut(auth);
    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(serverAppAuth.currentUser).to.not.be.null;

    if (serverAppAuth.currentUser) {
      await serverAppAuth.currentUser.reload();
    }

    expect(numberServerLogins).to.equal(1);
    expect(serverAppAuth).to.not.be.null;
    if (serverAppAuth) {
      expect(serverAppAuth.currentUser).to.not.be.null;
    }
  });
});
