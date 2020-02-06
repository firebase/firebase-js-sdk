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
import { fail } from 'assert';
import { FirebaseApp } from '@firebase/app-types';
import { initializeAuth } from '../../../src/core/initialize_auth';
import { signInAnonymously } from '../../../src/core/strategies/anonymous';
import { UserCredential } from '../../../src/model/user_credential';
import { inMemoryPersistence } from '../../../src/core/persistence/in_memory';
import { browserSessionPersistence } from '../../../src/core/persistence/browser_session';
import { browserLocalPersistence } from '../../../src/core/persistence/browser_local';
import { indexedDBLocalPersistence } from '../../../src/core/persistence/indexed_db';
import { User } from '../../../src/model/user';

import * as PROJECT_CONFIG from '../../../../../config/project.json';
import {
  PRODUCTION_URL,
  SignUpResponse,
  SIGN_UP_RESPONSE_KIND
} from '../../../src/api/authentication';
import { restoreFetch, mockFetch } from '../../util/fetch-mock';
import { Provider, encodeIdToken, IdToken } from '../../../src/model/id_token';
import { signOut } from '../../../src/model/auth';
import {
  fullKeyName_,
  AUTH_USER_KEY_NAME_
} from '../../../src/core/persistence/user_mananger';

const EXPIRATION_TIME = 3600;

function generateJWT(provider: Provider, uid: string): IdToken {
  const timestamp = Math.floor(Date.now() / 1000);
  return encodeIdToken(
    {
      alg: 'RS256',
      kid: 'firebase-key-id-123456abcdef',
      typ: 'JWT'
    },
    {
      provider_id: provider, // eslint-disable-line camelcase
      iss: `https://securetoken.google.com/${PROJECT_CONFIG.projectId}`,
      aud: PROJECT_CONFIG.projectId,
      auth_time: timestamp, // eslint-disable-line camelcase
      user_id: uid, // eslint-disable-line camelcase
      sub: uid,
      iat: timestamp,
      exp: timestamp + EXPIRATION_TIME,
      firebase: {
        identities: {},
        sign_in_provider: provider // eslint-disable-line camelcase
      }
    },
    'SIGNATURE'
  );
}

describe('signInAnonymously', () => {
  let app: FirebaseApp;

  before(() => {
    app = firebase.initializeApp(
      { apiKey: PROJECT_CONFIG.apiKey, projectId: PROJECT_CONFIG.projectId },
      'test-app-auth-test'
    );
  });

  beforeEach(() => {
    const uid = 'abcdef123556';
    const response: SignUpResponse = {
      kind: SIGN_UP_RESPONSE_KIND,
      idToken: generateJWT(Provider.ANONYMOUS, uid),
      refreshToken: 'super-long-refresh-token',
      expiresIn: `${EXPIRATION_TIME}`,
      localId: uid
    };
    mockFetch(
      `${PRODUCTION_URL}/v1/accounts:signUp?key=${PROJECT_CONFIG.apiKey}`,
      JSON.stringify(response)
    );
  });

  afterEach(() => {
    restoreFetch();
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
    expect(idTokenResult.signInProvider).to.eq(Provider.ANONYMOUS);
    expect(idTokenResult.signInSecondFactor).to.be.null;
  });

  describe('persistence', () => {
    for (const persistence of [
      inMemoryPersistence,
      browserSessionPersistence,
      browserLocalPersistence,
      indexedDBLocalPersistence
    ]) {
      context('with ' + persistence.constructor.name, () => {
        it('should work', async () => {
          const auth = initializeAuth(app, { persistence });
          await auth.signOut();
          const beforeSignin = await persistence.get(
            fullKeyName_(AUTH_USER_KEY_NAME_, PROJECT_CONFIG.apiKey, auth.name)
          );
          expect(beforeSignin).to.be.null;
          expect(auth.currentUser).to.be.null;

          const userCredential = await signInAnonymously(auth);
          expect(userCredential).to.be.instanceOf(UserCredential);
          expect(auth.currentUser).to.eq(userCredential.user);

          const user = await persistence.get<User>(
            fullKeyName_(AUTH_USER_KEY_NAME_, PROJECT_CONFIG.apiKey, auth.name)
          );
          expect(user).to.not.be.null;
          expect(userCredential.user.uid).to.eq(user!.uid);

          // re initialization should pull from persistence instead of creating a new user
          const reinitializedAuth = initializeAuth(app, { persistence });
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
          expect(auth.currentUser).to.be.null;
        });
      });
    }
  });

  describe('onAuthStateChanged', () => {
    it('should fire if registered after initialize but before sign in', async () => {
      let callbackNum = 0;
      const auth = initializeAuth(app);
      await auth.isInitialized();
      const promise = new Promise((resolve, reject) => {
        auth.onAuthStateChanged((user: User | null) => {
          switch (++callbackNum) {
            case 1:
              expect(user).to.be.null;
              break;
            case 2:
              expect(user).to.not.be.null;
              expect(user).to.eq(auth.currentUser);
              resolve();
              break;
            default:
              fail('expected only 2 callbacks');
              reject();
          }
        });
      });
      await signInAnonymously(auth);
      return promise;
    });

    it('should fire if registered after sign in', async () => {
      const auth = initializeAuth(app);
      await signInAnonymously(auth);
      return new Promise(resolve => {
        auth.onAuthStateChanged((user: User | null) => {
          expect(user).to.not.be.null;
          expect(user).to.eq(auth.currentUser);
          resolve();
        });
      });
    });

    it('should fire if reinitialized from persistence', async () => {
      const auth = initializeAuth(app, {
        persistence: browserSessionPersistence
      });
      await signInAnonymously(auth);
      const reinitializedAuth = initializeAuth(app, {
        persistence: browserSessionPersistence
      });
      await reinitializedAuth.isInitialized();
      return new Promise(resolve => {
        reinitializedAuth.onAuthStateChanged((user: User | null) => {
          expect(user!.uid).to.eq(auth.currentUser!.uid);
          resolve();
        });
      });
    });

    it('should accept multiple observers', async () => {
      const auth = initializeAuth(app);
      await signInAnonymously(auth);
      let numCallbacks = 0;
      return new Promise(resolve => {
        const callbackFn = (): void => {
          if (++numCallbacks === 2) {
            resolve();
          }
        };
        auth.onAuthStateChanged(callbackFn);
        auth.onAuthStateChanged(callbackFn);
      });
    });

    it('should accept observer object', async () => {
      const auth = initializeAuth(app);
      await signInAnonymously(auth);
      return new Promise((resolve, reject) => {
        auth.onAuthStateChanged({
          next: resolve,
          error: reject,
          complete: reject
        });
      });
    });

    it('should fire after signOut', async () => {
      const auth = initializeAuth(app);
      await signInAnonymously(auth);
      await signOut(auth);
      return new Promise(resolve => {
        auth.onAuthStateChanged((user: User | null) => {
          expect(user).to.be.null;
          resolve();
        });
      });
    });

    it('should not fire if unsubscribed', async () => {
      const auth = initializeAuth(app);
      await auth.isInitialized();
      const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
        fail('expected calback to be unsubscribed');
      });
      unsubscribe();
      await signInAnonymously(auth);
    });
  });
});
