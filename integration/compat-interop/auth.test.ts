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

import { getModularInstance } from '@firebase/util';
import { expect } from 'chai';
import { getAuth, signOut } from '@firebase/auth';
import firebase from '@firebase/app-compat';
import '@firebase/auth-compat';

import { TEST_PROJECT_CONFIG } from './util';

firebase.initializeApp(TEST_PROJECT_CONFIG);

const compatAuth = firebase.auth();
const modularAuth = getAuth();

describe('Auth compat interop', () => {
  it('Auth compat instance references modular Auth instance', () => {
    expect(getModularInstance(compatAuth)).to.equal(modularAuth);
  });

  it('Auth compat and modular Auth share the same user state', async () => {
    expect(compatAuth.currentUser).to.equal(null);
    expect(modularAuth.currentUser).to.equal(null);
    const userCred = await compatAuth.signInAnonymously();
    expect(userCred.user?.uid).to.equal(modularAuth.currentUser?.uid);
    expect(await userCred.user?.getIdToken()).to.equal(
      await modularAuth.currentUser?.getIdToken()
    );

    await signOut(modularAuth);
    expect(compatAuth.currentUser).to.equal(null);
    expect(modularAuth.currentUser).to.equal(null);
  });
});
