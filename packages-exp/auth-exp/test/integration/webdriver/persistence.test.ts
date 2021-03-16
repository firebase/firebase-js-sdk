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
import { UserCredential } from '@firebase/auth-exp';
import { expect } from 'chai';
import { createAnonAccount } from '../../helpers/integration/emulator_rest_helpers';
import { API_KEY } from '../../helpers/integration/settings';
import { AnonFunction, PersistenceFunction } from './util/functions';
import { browserDescribe } from './util/test_runner';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function testPersistedUser() {
  const account = await createAnonAccount();
  return {
    uid: account.localId,
    emailVerified: false,
    isAnonymous: true,
    providerData: [],
    stsTokenManager: {
      refreshToken: account.refreshToken,
      accessToken: account.idToken,
      expirationTime: Date.now() + 3600 * 1000
    },
    createdAt: Date.now().toString(),
    lastLoginAt: Date.now().toString()
  };
}

browserDescribe('WebDriver persistence test', driver => {
  const fullPersistenceKey = `firebase:authUser:${API_KEY}:[DEFAULT]`;
  context('default persistence hierarchy (indexedDB > localStorage)', () => {
    it('stores user in indexedDB by default', async () => {
      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid = cred.user.uid;

      expect(await driver.getUserSnapshot()).to.eql(cred.user);
      expect(await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP)).to.eql(
        {}
      );
      expect(
        await driver.call(PersistenceFunction.SESSION_STORAGE_SNAP)
      ).to.eql({});

      const snap = await driver.call(PersistenceFunction.INDEXED_DB_SNAP);
      expect(snap).to.have.property(fullPersistenceKey).that.contains({ uid });

      // Persistence should survive a refresh:
      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      expect(await driver.getUserSnapshot()).to.contain({ uid });
    });

    it('should work fine if indexedDB is available while localStorage is not', async () => {
      await driver.webDriver.navigate().refresh();
      // Simulate browsers that do not support localStorage.
      await driver.webDriver.executeScript('delete window.localStorage;');
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();

      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid = cred.user.uid;

      expect(await driver.getUserSnapshot()).to.eql(cred.user);
      expect(await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP)).to.eql(
        {}
      );
      expect(
        await driver.call(PersistenceFunction.SESSION_STORAGE_SNAP)
      ).to.eql({});

      const snap = await driver.call(PersistenceFunction.INDEXED_DB_SNAP);
      expect(snap).to.have.property(fullPersistenceKey).that.contains({ uid });

      // Persistence should survive a refresh:
      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      expect(await driver.getUserSnapshot()).to.contain({ uid });
    });

    it('stores user in localStorage if indexedDB is not available', async () => {
      await driver.webDriver.navigate().refresh();
      // Simulate browsers that do not support indexedDB.
      await driver.webDriver.executeScript('delete window.indexedDB;');
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();

      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid = cred.user.uid;

      expect(await driver.getUserSnapshot()).to.eql(cred.user);
      expect(
        await driver.call(PersistenceFunction.SESSION_STORAGE_SNAP)
      ).to.eql({});

      const snap = await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP);
      expect(snap).to.have.property(fullPersistenceKey).that.contains({ uid });

      // Persistence should survive a refresh:
      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      expect(await driver.getUserSnapshot()).to.contain({ uid });
    });

    it('fall back to in-memory if neither indexedDB or localStorage is present', async () => {
      await driver.webDriver.navigate().refresh();
      // Simulate browsers that do not support indexedDB or localStorage.
      await driver.webDriver.executeScript(
        'delete window.indexedDB; delete window.localStorage;'
      );
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();

      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );

      expect(await driver.getUserSnapshot()).to.eql(cred.user);
      expect(
        await driver.call(PersistenceFunction.SESSION_STORAGE_SNAP)
      ).to.eql({});
      expect(await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP)).to.eql(
        {}
      );
      expect(await driver.call(PersistenceFunction.INDEXED_DB_SNAP)).to.eql({});

      // User will be gone (a.k.a. logged out) after refresh.
      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      expect(await driver.getUserSnapshot()).to.equal(null);
    });

    it('migrate stored user from localStorage if indexedDB is available', async () => {
      const persistedUser = await testPersistedUser();
      await driver.webDriver.navigate().refresh();
      await driver.call(PersistenceFunction.LOCAL_STORAGE_SET, {
        [fullPersistenceKey]: persistedUser
      });
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();

      // User from localStorage should be picked up.
      const user = await driver.getUserSnapshot();
      expect(user.uid).eql(persistedUser.uid);

      // User should be migrated to indexedDB, and the key in localStorage should be deleted.
      const snap = await driver.call(PersistenceFunction.INDEXED_DB_SNAP);
      expect(snap)
        .to.have.property(fullPersistenceKey)
        .that.contains({ uid: persistedUser.uid });
      expect(await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP)).to.eql(
        {}
      );
    });

    it('migrate stored user to localStorage if indexedDB is readonly', async () => {
      // Sign in first, which gets persisted in indexedDB.
      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid = cred.user.uid;

      await driver.webDriver.navigate().refresh();
      await driver.call(PersistenceFunction.MAKE_INDEXED_DB_READONLY);
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();

      // User from indexedDB should be picked up.
      const user = await driver.getUserSnapshot();
      expect(user.uid).eql(uid);

      // User should be migrated to localStorage, and the key in indexedDB should be deleted.
      const snap = await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP);
      expect(snap).to.have.property(fullPersistenceKey).that.contains({ uid });
      expect(await driver.call(PersistenceFunction.INDEXED_DB_SNAP)).to.eql({});
    });

    it('use in-memory and clear all persistences if indexedDB and localStorage are both broken', async () => {
      const persistedUser = await testPersistedUser();
      await driver.webDriver.navigate().refresh();
      await driver.call(PersistenceFunction.LOCAL_STORAGE_SET, {
        [fullPersistenceKey]: persistedUser
      });
      // Simulate browsers that do not support indexedDB.
      await driver.webDriver.executeScript('delete window.indexedDB;');
      // Simulate browsers denying writes to localStorage (e.g. Safari private browsing).
      await driver.webDriver.executeScript(
        'Storage.prototype.setItem = () => { throw new Error("setItem disabled for testing"); };'
      );
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();

      // User from localStorage should be picked up.
      const user = await driver.getUserSnapshot();
      expect(user.uid).eql(persistedUser.uid);

      // Both storage should be cleared.
      expect(await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP)).to.eql(
        {}
      );
      expect(await driver.call(PersistenceFunction.INDEXED_DB_SNAP)).to.eql({});

      // User will be gone (a.k.a. logged out) after refresh.
      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      expect(await driver.getUserSnapshot()).to.equal(null);
    });
  });

  // TODO: Compatibility tests (e.g. sign in with JS SDK and should stay logged in with TS SDK).
});
