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
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  OperationType,
  reauthenticateWithCredential,
  signInAnonymously,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithRedirect,
  signOut,
  updateCurrentUser,
  updateEmail,
  updateProfile
} from '@firebase/auth';
import { isBrowser, FirebaseError } from '@firebase/util';
import { initializeServerApp, deleteApp } from '@firebase/app';

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

  beforeEach(() => {
    auth = getTestInstance();
  });

  afterEach(async () => {
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
    const serverAppAuth = getTestInstanceForServerApp(serverApp);

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

    await deleteApp(serverApp);
  });

  it('getToken operations fulfilled or rejected', async () => {
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
    const serverAppAuth = getTestInstanceForServerApp(serverApp);
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

    await deleteApp(serverApp);
  });

  it('signs in with email credentials user', async () => {
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
    const serverAppAuth = getTestInstanceForServerApp(serverApp);
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

    await deleteApp(serverApp);
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
    const serverAppAuth = getTestInstanceForServerApp(serverApp);
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

    await deleteApp(serverApp);
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
    const serverAppAuth = getTestInstanceForServerApp(serverApp);
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

    await deleteApp(serverApp);
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
    const serverAppAuth = getTestInstanceForServerApp(serverApp);
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

    await deleteApp(serverApp);
  });

  it('auth operations fail correctly on FirebaseServerApp instances', async () => {
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

    const serverAppAuth = getTestInstanceForServerApp(serverApp);
    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(serverAppAuth.currentUser).to.not.be.null;
    const email = randomEmail();
    const password = 'password';

    // Auth tests:
    await expect(
      createUserWithEmailAndPassword(serverAppAuth, email, password)
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(
      signInWithRedirect(serverAppAuth, new GoogleAuthProvider())
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(getRedirectResult(serverAppAuth)).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(signInAnonymously(serverAppAuth)).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );

    const credential = EmailAuthProvider.credential(email, password);
    await expect(
      signInWithCredential(serverAppAuth, credential)
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );

    await expect(
      signInWithCustomToken(serverAppAuth, 'custom token')
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(
      signInWithEmailAndPassword(serverAppAuth, email, password)
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(
      signInWithEmailLink(serverAppAuth, email, 'email link')
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(
      updateCurrentUser(serverAppAuth, serverAppAuth.currentUser)
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(
      updateCurrentUser(serverAppAuth, serverAppAuth.currentUser)
    ).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );
    await expect(signOut(serverAppAuth)).to.be.rejectedWith(
      FirebaseError,
      'operation-not-supported-in-this-environment'
    );

    if (serverAppAuth.currentUser !== null) {
      await expect(
        reauthenticateWithCredential(serverAppAuth.currentUser, credential)
      ).to.be.rejectedWith(
        FirebaseError,
        'operation-not-supported-in-this-environment'
      );

      await expect(serverAppAuth.currentUser.delete()).to.be.rejectedWith(
        FirebaseError,
        'operation-not-supported-in-this-environment'
      );

      await expect(
        updateEmail(serverAppAuth.currentUser, email)
      ).to.be.rejectedWith(
        FirebaseError,
        'operation-not-supported-in-this-environment'
      );
    }

    await deleteApp(serverApp);
  });
});
