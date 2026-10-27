/**
 * @license
 * Copyright 2026 Google LLC
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
    expect(auth.currentUser).toBe(userCred.user);
    expect(userCred.operationType).toBe(OperationType.SIGN_IN);
    const user = userCred.user;
    expect(user).toBe(auth.currentUser);
    expect(user.isAnonymous).toBe(true);
    expect(typeof user.uid).toBe('string');
    expect(user.emailVerified).toBe(false);
    expect(user.providerData.length).toBe(0);

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
        expect(user.uid).toBe(serverAuthUser.uid);
        expect(user.isAnonymous).toBe(serverAuthUser.isAnonymous);
        expect(user.emailVerified).toBe(serverAuthUser.emailVerified);
        expect(user.providerData.length).toBe(
          serverAuthUser.providerData.length
        );
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(numberServerLogins).toBe(1);

    await deleteApp(serverApp);
  });

  it('getToken operations fulfilled or rejected', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).toBe(userCred.user);
    expect(userCred.operationType).toBe(OperationType.SIGN_IN);
    const user = userCred.user;
    expect(user).toBe(auth.currentUser);
    expect(user.isAnonymous).toBe(true);
    expect(typeof user.uid).toBe('string');

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
        expect(user.uid).toBe(serverAuthUser.uid);
        expect(serverAppAuth).not.toBeNull();
        expect(serverAuthUser.getIdToken);
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).toBe(serverAuthUser);
        }
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(numberServerLogins).toBe(1);
    expect(serverAppAuth.currentUser).not.toBeNull();
    if (serverAppAuth.currentUser) {
      const idToken = await serverAppAuth.currentUser.getIdToken(
        /*forceRefresh=*/ false
      );
      expect(idToken).not.toBeNull();
      await expect(
        serverAppAuth.currentUser.getIdToken(/*forceRefresh=*/ true)
      ).rejects.toThrow();
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
    expect(auth.currentUser).toBe(userCred.user);
    expect(userCred.operationType).toBe(OperationType.SIGN_IN);

    const additionalUserInfo = getAdditionalUserInfo(userCred)!;
    expect(additionalUserInfo.isNewUser).toBe(true);
    expect(additionalUserInfo.providerId).toBe('password');
    expect(user.isAnonymous).toBe(false);
    expect(user.email).toBe(email);

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
        expect(serverAppAuth).not.toBeNull();
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).toBe(serverAuthUser);
        }
        expect(user.uid).toBe(serverAuthUser.uid);
        expect(serverAuthUser.refreshToken).toHaveLength(0);
        expect(user.isAnonymous).toBe(serverAuthUser.isAnonymous);
        expect(user.emailVerified).toBe(serverAuthUser.emailVerified);
        expect(user.providerData.length).toBe(
          serverAuthUser.providerData.length
        );
        expect(user.email).toBe(serverAuthUser.email);
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(numberServerLogins).toBe(1);

    await deleteApp(serverApp);
  });

  it('can reload user', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).toBe(userCred.user);

    const user = userCred.user;
    expect(user).toBe(auth.currentUser);
    expect(typeof user.uid).toBe('string');

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
        expect(user.uid).toBe(serverAuthUser.uid);
        expect(serverAppAuth).not.toBeNull();
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).toBe(serverAuthUser);
        }
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(serverAppAuth.currentUser).not.toBeNull();
    if (serverAppAuth.currentUser) {
      await serverAppAuth.currentUser.reload();
    }
    expect(numberServerLogins).toBe(1);

    await deleteApp(serverApp);
  });

  it('can update server based user profile', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).toBe(userCred.user);

    const user = userCred.user;
    expect(user).toBe(auth.currentUser);
    expect(typeof user.uid).toBe('string');
    expect(user.displayName).toBeNull();

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
        expect(serverAppAuth).not.toBeNull();
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).toBe(serverAuthUser);
        }
        expect(user.uid).toBe(serverAuthUser.uid);
        expect(user.displayName).toBeNull();
        void updateProfile(serverAuthUser, {
          displayName: newDisplayName
        });
      }
    });

    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(serverAppAuth.currentUser).not.toBeNull();

    if (serverAppAuth.currentUser) {
      await serverAppAuth.currentUser.reload();
    }

    expect(numberServerLogins).toBe(1);
    expect(serverAppAuth).not.toBeNull();
    if (serverAppAuth) {
      expect(serverAppAuth.currentUser).not.toBeNull();
      expect(serverAppAuth.currentUser?.displayName).not.toBeNull();
      expect(serverAppAuth.currentUser?.displayName).toBe(newDisplayName);
    }

    await deleteApp(serverApp);
  });

  it('can sign out of main auth and still use server auth', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).toBe(userCred.user);

    const user = userCred.user;
    expect(user).toBe(auth.currentUser);
    expect(typeof user.uid).toBe('string');
    expect(user.displayName).toBeNull();

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
        expect(serverAppAuth).not.toBeNull();
        expect(user.uid).toBe(serverAuthUser.uid);
        expect(user.displayName).toBeNull();
        if (serverAppAuth) {
          expect(serverAppAuth.currentUser).toBe(serverAuthUser);
        }
      }
    });

    await signOut(auth);
    await new Promise(resolve => {
      setTimeout(resolve, signInWaitDuration);
    });

    expect(serverAppAuth.currentUser).not.toBeNull();

    if (serverAppAuth.currentUser) {
      await serverAppAuth.currentUser.reload();
    }

    expect(numberServerLogins).toBe(1);
    expect(serverAppAuth).not.toBeNull();
    if (serverAppAuth) {
      expect(serverAppAuth.currentUser).not.toBeNull();
    }

    await deleteApp(serverApp);
  });

  it('auth operations fail correctly on FirebaseServerApp instances', async () => {
    if (isBrowser()) {
      return;
    }
    const userCred = await signInAnonymously(auth);
    expect(auth.currentUser).toBe(userCred.user);

    const user = userCred.user;
    expect(user).toBe(auth.currentUser);
    expect(typeof user.uid).toBe('string');

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

    expect(serverAppAuth.currentUser).not.toBeNull();
    const email = randomEmail();
    const password = 'password';

    // Auth tests:
    const promise = createUserWithEmailAndPassword(
      serverAppAuth,
      email,
      password
    );
    await expect(promise).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise).rejects.toBeInstanceOf(FirebaseError);
    const promise2 = signInWithRedirect(
      serverAppAuth,
      new GoogleAuthProvider()
    );
    await expect(promise2).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise2).rejects.toBeInstanceOf(FirebaseError);
    const promise3 = getRedirectResult(serverAppAuth);
    await expect(promise3).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise3).rejects.toBeInstanceOf(FirebaseError);
    const promise4 = signInAnonymously(serverAppAuth);
    await expect(promise4).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise4).rejects.toBeInstanceOf(FirebaseError);

    const credential = EmailAuthProvider.credential(email, password);
    const promise5 = signInWithCredential(serverAppAuth, credential);
    await expect(promise5).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise5).rejects.toBeInstanceOf(FirebaseError);

    const promise6 = signInWithCustomToken(serverAppAuth, 'custom token');
    await expect(promise6).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise6).rejects.toBeInstanceOf(FirebaseError);
    const promise7 = signInWithEmailAndPassword(serverAppAuth, email, password);
    await expect(promise7).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise7).rejects.toBeInstanceOf(FirebaseError);
    const promise8 = signInWithEmailLink(serverAppAuth, email, 'email link');
    await expect(promise8).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise8).rejects.toBeInstanceOf(FirebaseError);
    const promise9 = updateCurrentUser(
      serverAppAuth,
      serverAppAuth.currentUser
    );
    await expect(promise9).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise9).rejects.toBeInstanceOf(FirebaseError);
    const promise10 = updateCurrentUser(
      serverAppAuth,
      serverAppAuth.currentUser
    );
    await expect(promise10).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise10).rejects.toBeInstanceOf(FirebaseError);
    const promise11 = signOut(serverAppAuth);
    await expect(promise11).rejects.toThrow(
      'operation-not-supported-in-this-environment'
    );
    await expect(promise11).rejects.toBeInstanceOf(FirebaseError);

    if (serverAppAuth.currentUser !== null) {
      const promise12 = reauthenticateWithCredential(
        serverAppAuth.currentUser,
        credential
      );
      await expect(promise12).rejects.toThrow(
        'operation-not-supported-in-this-environment'
      );
      await expect(promise12).rejects.toBeInstanceOf(FirebaseError);

      const promise13 = serverAppAuth.currentUser.delete();
      await expect(promise13).rejects.toThrow(
        'operation-not-supported-in-this-environment'
      );
      await expect(promise13).rejects.toBeInstanceOf(FirebaseError);

      const promise14 = updateEmail(serverAppAuth.currentUser, email);
      await expect(promise14).rejects.toThrow(
        'operation-not-supported-in-this-environment'
      );
      await expect(promise14).rejects.toBeInstanceOf(FirebaseError);
    }

    await deleteApp(serverApp);
  });
});
