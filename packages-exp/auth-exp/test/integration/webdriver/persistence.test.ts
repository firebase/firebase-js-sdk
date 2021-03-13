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
import { API_KEY } from '../../helpers/integration/settings';
import { AnonFunction, PersistenceFunction } from './util/functions';
import { browserDescribe } from './util/test_runner';

browserDescribe('WebDriver persistence test', driver => {
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
      expect(snap)
        .to.have.property(`firebase:authUser:${API_KEY}:[DEFAULT]`)
        .that.contains({ uid });

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
      expect(snap)
        .to.have.property(`firebase:authUser:${API_KEY}:[DEFAULT]`)
        .that.contains({ uid });

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
      expect(snap)
        .to.have.property(`firebase:authUser:${API_KEY}:[DEFAULT]`)
        .that.contains({ uid });

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
  });

  // TODO: Upgrade tests (e.g. migrate user from localStorage to indexedDB).

  // TODO: Compatibility tests (e.g. sign in with JS SDK and should stay logged in with TS SDK).
});
