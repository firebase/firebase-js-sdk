/**
 * @license
 * Copyright 2017 Google LLC
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
import { initializeApp, deleteApp } from '@firebase/app-exp';
import { expect } from 'chai';
import { DATABASE_ADDRESS, DATABASE_URL } from '../helpers/util';

import {
  getDatabase,
  goOffline,
  goOnline,
  ref,
  refFromURL
} from '../../exp/index';

export function createTestApp() {
  return initializeApp({ databaseURL: DATABASE_URL });
}

// TODO(database-exp): Re-enable these tests
describe.skip('Database Tests', () => {
  let defaultApp;

  beforeEach(() => {
    defaultApp = createTestApp();
  });

  afterEach(async () => {
    if (defaultApp) {
      return deleteApp(defaultApp);
    }
  });

  it('Can get database', () => {
    const db = getDatabase(defaultApp);
    expect(db).to.be.ok;
  });

  it('Can get database with custom URL', () => {
    const db = getDatabase(defaultApp, 'http://foo.bar.com');
    expect(db).to.be.ok;
    // The URL is assumed to be secure if no port is specified.
    expect(ref(db).toString()).to.equal('https://foo.bar.com/');
  });

  it('Can get app', () => {
    const db = getDatabase(defaultApp);
    expect(db.app).to.equal(defaultApp);
  });

  it('Can set and ge tref', async () => {
    const db = getDatabase(defaultApp);
    await ref(db, 'foo/bar').set('foobar');
    const snap = await ref(db, 'foo/bar').get();
    expect(snap.val()).to.equal('foobar');
  });

  it('Can get refFromUrl', async () => {
    const db = getDatabase(defaultApp);
    await refFromURL(db, `${DATABASE_ADDRESS}/foo/bar`).get();
  });

  it('Can goOffline/goOnline', async () => {
    const db = getDatabase(defaultApp);
    goOffline(db);
    try {
      await ref(db, 'foo/bar').get();
      expect.fail('Should have failed since we are offline');
    } catch (e) {
      expect(e.message).to.equal('Error: Client is offline.');
    }
    goOnline(db);
    await ref(db, 'foo/bar').get();
  });

  it('Can delete app', async () => {
    const db = getDatabase(defaultApp);
    await deleteApp(defaultApp);
    expect(() => ref(db)).to.throw('Cannot call ref on a deleted database.');
    defaultApp = undefined;
  });
});
