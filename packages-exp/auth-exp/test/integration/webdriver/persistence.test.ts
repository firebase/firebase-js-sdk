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
import { START_FUNCTION } from './util/auth_driver';
import {
  AnonFunction,
  CoreFunction,
  PersistenceFunction
} from './util/functions';
import { JsLoadCondition } from './util/js_load_condition';
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

browserDescribe('WebDriver persistence test', (driver, browser) => {
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

  context('setPersistence(...)', () => {
    it('clears storage when switching to in-memory', async () => {
      await driver.call(AnonFunction.SIGN_IN_ANONYMOUSLY);
      const user = await driver.getUserSnapshot();

      await driver.call(PersistenceFunction.SET_PERSISTENCE_MEMORY);

      const snapshotAfter = await driver.getUserSnapshot();
      expect(snapshotAfter.uid).to.eql(user.uid);
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

    it('migrates user when switching to session', async () => {
      await driver.call(AnonFunction.SIGN_IN_ANONYMOUSLY);
      const user = await driver.getUserSnapshot();

      await driver.call(PersistenceFunction.SET_PERSISTENCE_SESSION);

      const snapshotAfter = await driver.getUserSnapshot();
      expect(snapshotAfter.uid).to.eql(user.uid);
      expect(await driver.call(PersistenceFunction.INDEXED_DB_SNAP)).to.eql({});
      const snap = await driver.call(PersistenceFunction.SESSION_STORAGE_SNAP);
      expect(snap)
        .to.have.property(fullPersistenceKey)
        .that.contains({ uid: user.uid });

      // User will be gone (a.k.a. logged out) after refresh.
      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      expect(await driver.getUserSnapshot()).to.equal(null);
    });

    it('migrates user when switching from indexedDB to localStorage', async () => {
      // This test only works in the modular SDK: the compat package does not
      // make the distinction between indexedDB and local storage (both are just
      // 'local').
      if (driver.isCompatLayer()) {
        console.warn('Skipping indexedDB to local migration in compat test');
        return;
      }

      await driver.call(AnonFunction.SIGN_IN_ANONYMOUSLY);
      const user = await driver.getUserSnapshot();

      await driver.call(PersistenceFunction.SET_PERSISTENCE_LOCAL_STORAGE);

      expect((await driver.getUserSnapshot()).uid).to.eql(user.uid);
      expect(await driver.call(PersistenceFunction.INDEXED_DB_SNAP)).to.eql({});
      const snap = await driver.call(PersistenceFunction.LOCAL_STORAGE_SNAP);
      expect(snap)
        .to.have.property(fullPersistenceKey)
        .that.contains({ uid: user.uid });

      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      // User should be picked up from localStorage after refresh.
      expect((await driver.getUserSnapshot()).uid).to.eql(user.uid);
    });

    it('migrates user when switching from in-memory to indexedDB', async () => {
      await driver.call(PersistenceFunction.SET_PERSISTENCE_MEMORY);
      await driver.call(AnonFunction.SIGN_IN_ANONYMOUSLY);
      const user = await driver.getUserSnapshot();

      await driver.call(PersistenceFunction.SET_PERSISTENCE_INDEXED_DB);

      expect((await driver.getUserSnapshot()).uid).to.eql(user.uid);
      const snap = await driver.call(PersistenceFunction.INDEXED_DB_SNAP);
      expect(snap)
        .to.have.property(fullPersistenceKey)
        .that.contains({ uid: user.uid });

      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      // User should be picked up from indexedDB after refresh.
      expect((await driver.getUserSnapshot()).uid).to.eql(user.uid);
    });
  });

  context('persistence compatibility with legacy SDK', () => {
    it('stays logged in when switching to legacy SDK and then back', async () => {
      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid = cred.user.uid;

      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitLegacySDK();
      await driver.waitForLegacyAuthInit();
      const user = await driver.call(CoreFunction.LEGACY_USER_SNAPSHOT);
      expect(user).to.include({ uid });

      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      // User should be picked up from indexedDB after refresh.
      expect((await driver.getUserSnapshot()).uid).to.eql(uid);
    });

    it('stays logged in when switching from legacy SDK and then back', async () => {
      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitLegacySDK();
      await driver.waitForLegacyAuthInit();

      const result = await driver.call<{ user: { uid: string } }>(
        'legacyAuth.signInAnonymously'
      );
      const uid = result.user.uid;
      const persisted1 = await driver.call(PersistenceFunction.INDEXED_DB_SNAP);

      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      // User should be picked up from indexedDB after refresh.
      expect((await driver.getUserSnapshot()).uid).to.eql(uid);
      const persisted2 = await driver.call(PersistenceFunction.INDEXED_DB_SNAP);

      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitLegacySDK();
      await driver.waitForLegacyAuthInit();
      const user = await driver.call(CoreFunction.LEGACY_USER_SNAPSHOT);
      if (!user) {
        expect(
          persisted2,
          'user is not recognized by legacy SDK, possibly due to fields being different'
        ).to.eql(persisted1);
      } else {
        expect(user).to.include({ uid }); // and again in legacy SDK
      }
    });

    it('stays logged in when switching from legacy SDK and then back (no indexedDB support)', async () => {
      // Skip this test if running in Firefox. The Legacy SDK incorrectly
      // implements the db delete + reopen workaround for Firefox.
      if (browser === 'firefox') {
        return;
      }

      await driver.webDriver.navigate().refresh();
      // Simulate browsers that do not support indexedDB.
      await driver.webDriver.executeScript('delete window.indexedDB');
      await driver.injectConfigAndInitLegacySDK();
      await driver.waitForLegacyAuthInit();

      const result = await driver.call<{ user: { uid: string } }>(
        'legacyAuth.signInAnonymously'
      );
      const uid = result.user.uid;
      const persisted1 = await driver.call(
        PersistenceFunction.LOCAL_STORAGE_SNAP
      );

      await driver.webDriver.navigate().refresh();
      await driver.webDriver.executeScript('delete window.indexedDB');
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      // User should be picked up from localStorage after refresh.
      expect((await driver.getUserSnapshot()).uid).to.eql(uid);
      const persisted2 = await driver.call(
        PersistenceFunction.LOCAL_STORAGE_SNAP
      );

      await driver.webDriver.navigate().refresh();
      await driver.injectConfigAndInitLegacySDK();
      await driver.waitForLegacyAuthInit();
      const user = await driver.call(CoreFunction.LEGACY_USER_SNAPSHOT);
      if (!user) {
        expect(
          persisted2,
          'user is not recognized by legacy SDK, possibly due to fields being different'
        ).to.eql(persisted1);
      } else {
        expect(user).to.include({ uid }); // and again in legacy SDK
      }
    });
  });

  context('persistence sync across windows and tabs', () => {
    it('sync current user across windows with indexedDB', async () => {
      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid = cred.user.uid;
      await driver.webDriver.executeScript('window.open(".");');
      await driver.selectPopupWindow();
      await driver.webDriver.wait(new JsLoadCondition(START_FUNCTION));
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      const userInPopup = await driver.getUserSnapshot();
      expect(userInPopup).not.to.be.null;
      expect(userInPopup.uid).to.equal(uid);

      await driver.call(CoreFunction.SIGN_OUT);
      expect(await driver.getUserSnapshot()).to.be.null;
      await driver.selectMainWindow({ noWait: true });
      await driver.pause(500);
      expect(await driver.getUserSnapshot()).to.be.null;

      const cred2: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid2 = cred2.user.uid;

      await driver.selectPopupWindow();
      await driver.pause(500);
      expect(await driver.getUserSnapshot()).to.contain({ uid: uid2 });
    });

    it('sync current user across windows with localStorage', async () => {
      await driver.webDriver.navigate().refresh();
      // Simulate browsers that do not support indexedDB.
      await driver.webDriver.executeScript('delete window.indexedDB');
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      const cred: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid = cred.user.uid;
      await driver.webDriver.executeScript('window.open(".");');
      await driver.selectPopupWindow();
      await driver.webDriver.wait(new JsLoadCondition(START_FUNCTION));
      // Simulate browsers that do not support indexedDB.
      await driver.webDriver.executeScript('delete window.indexedDB');
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      const userInPopup = await driver.getUserSnapshot();
      expect(userInPopup).not.to.be.null;
      expect(userInPopup.uid).to.equal(uid);

      await driver.call(CoreFunction.SIGN_OUT);
      expect(await driver.getUserSnapshot()).to.be.null;
      await driver.selectMainWindow({ noWait: true });
      await driver.pause(500);
      expect(await driver.getUserSnapshot()).to.be.null;

      const cred2: UserCredential = await driver.call(
        AnonFunction.SIGN_IN_ANONYMOUSLY
      );
      const uid2 = cred2.user.uid;

      await driver.selectPopupWindow();
      await driver.pause(500);
      expect(await driver.getUserSnapshot()).to.contain({ uid: uid2 });
    });
  });
});
