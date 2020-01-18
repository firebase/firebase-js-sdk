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
import { firebase } from '@firebase/app';
import { signInAnonymously } from '../../src/core/strategies/anonymous';
import { UserCredential } from '../../src/model/user_credential';
import { initializeAuth } from '../../src/core/initialize_auth';
import { FirebaseApp } from '@firebase/app-types';
import { inMemoryPersistence } from '../../src/core/persistence/in_memory';
import { browserSessionPersistence } from '../../src/core/persistence/browser_session';
import { browserLocalPersistence } from '../../src/core/persistence/browser_local';
import { indexedDBLocalPersistence } from '../../src/core/persistence/indexed_db';

import * as PROJECT_CONFIG from '../../../../config/project.json';

describe('signInAnonymously', () => {
  let app: FirebaseApp;

  before(() => {
    app = firebase.initializeApp(
      { apiKey: PROJECT_CONFIG.apiKey, projectId: PROJECT_CONFIG.projectId },
      'test-app-auth-test'
    );
  });

  it('should work', async () => {
    const auth = initializeAuth(app);

    const userCredential = await signInAnonymously(auth);
    expect(userCredential).to.be.instanceOf(UserCredential);
    expect(userCredential.user.refreshToken).to.not.be.empty;
    expect(userCredential.user.isAnonymous).to.be.true;
    expect(userCredential.user.uid).to.not.be.empty;

    const idToken = await userCredential.user.getIdToken();
    expect(idToken).to.not.be.empty;

    const idTokenResult = await userCredential.user.getIdTokenResult();
    expect(idTokenResult.authTime).to.not.be.empty;
    expect(idTokenResult.claims).to.be.empty;
    expect(idTokenResult.expirationTime).to.not.be.empty;
    expect(idTokenResult.issuedAtTime).to.not.be.empty;
    expect(idTokenResult.signInProvider).to.eq('anonymous');
    expect(idTokenResult.signInSecondFactor).to.be.null;
  });

  describe('persistence', () => {
    for (const persistence of [
      // inMemoryPersistence,
      browserSessionPersistence,
      // browserLocalPersistence,
      // indexedDBLocalPersistence
    ]) {
      context('with ' + persistence.constructor.name, () => {
        it('should work', async () => {
          const auth = initializeAuth(app, { persistence });
          
          await auth.signOut();
          const beforeSignin = await persistence.get('authUser');
          expect(beforeSignin).to.be.null;
          expect(auth.currentUser).to.be.undefined

          const userCredential = await signInAnonymously(auth);
          expect(userCredential).to.be.instanceOf(UserCredential);
          expect(auth.currentUser).to.eq(userCredential.user);

          const user = await persistence.get('authUser');
          expect(user).to.not.be.null;
          expect(userCredential.user.uid).to.eq(JSON.parse(user!).uid);

          // re initialization should pull from persistence instead of cerating a new user
          const reinitializedAuth = initializeAuth(app, { persistence });
          // TODO: check that currentUser is properly initialized
          const reinitializedUserCredential = await signInAnonymously(
            reinitializedAuth
          );
          expect(reinitializedAuth.currentUser!.uid).to.eq(
            userCredential.user.uid
          );
          expect(reinitializedUserCredential.user.uid).to.eq(
            userCredential.user.uid
          );

          await auth.signOut();
          expect(auth.currentUser).to.be.undefined;
        });
      });
    }
  });
});
