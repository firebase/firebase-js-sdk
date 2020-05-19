/**
 * @license
 * Copyright 2019 Google LLC
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
import * as sinon from 'sinon';

import { testUser } from '../../../test/mock_auth';
import { PersistedBlob, Persistence, PersistenceType } from './';
import { browserLocalPersistence, browserSessionPersistence } from './browser';

describe('core/persistence/browser', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => sinon.restore());

  describe('browserLocalPersistence', () => {
    const persistence: Persistence = browserLocalPersistence as Persistence;

    it('should work with persistence type', async () => {
      const key = 'my-super-special-persistence-type';
      const value = PersistenceType.LOCAL;
      expect(await persistence.get(key)).to.be.null;
      await persistence.set(key, value);
      expect(await persistence.get(key)).to.be.eq(value);
      expect(await persistence.get('other-key')).to.be.null;
      await persistence.remove(key);
      expect(await persistence.get(key)).to.be.null;
    });

    it('should return persistedblob from user', async () => {
      const key = 'my-super-special-user';
      const value = testUser('some-uid');

      expect(await persistence.get(key)).to.be.null;
      await persistence.set(key, value.toPlainObject());
      const out = await persistence.get<PersistedBlob>(key);
      expect(out!['uid']).to.eql(value.uid);
      await persistence.remove(key);
      expect(await persistence.get(key)).to.be.null;
    });

    describe('#isAvailable', () => {
      it('should emit false if localStorage setItem throws', async () => {
        sinon.stub(localStorage, 'setItem').throws(new Error('nope'));
        expect(await persistence.isAvailable()).to.be.false;
      });

      it('should emit false if localStorage removeItem throws', async () => {
        sinon.stub(localStorage, 'removeItem').throws(new Error('nope'));
        expect(await persistence.isAvailable()).to.be.false;
      });

      it('should emit true if everything works properly', async () => {
        expect(await persistence.isAvailable()).to.be.true;
      });
    });
  });

  describe('browserSessionPersistence', () => {
    const persistence = browserSessionPersistence as Persistence;

    it('should work with persistence type', async () => {
      const key = 'my-super-special-persistence-type';
      const value = PersistenceType.SESSION;
      expect(await persistence.get(key)).to.be.null;
      await persistence.set(key, value);
      expect(await persistence.get(key)).to.be.eq(value);
      expect(await persistence.get('other-key')).to.be.null;
      await persistence.remove(key);
      expect(await persistence.get(key)).to.be.null;
    });

    it('should emit blobified persisted user', async () => {
      const key = 'my-super-special-user';
      const value = testUser('some-uid');

      expect(await persistence.get(key)).to.be.null;
      await persistence.set(key, value.toPlainObject());
      const out = await persistence.get<PersistedBlob>(key);
      expect(out!['uid']).to.eql(value.uid);
      await persistence.remove(key);
      expect(await persistence.get(key)).to.be.null;
    });

    describe('#isAvailable', () => {
      it('should emit false if sessionStorage setItem throws', async () => {
        sinon.stub(sessionStorage, 'setItem').throws(new Error('nope'));
        expect(await persistence.isAvailable()).to.be.false;
      });

      it('should emit false if sessionStorage removeItem throws', async () => {
        sinon.stub(sessionStorage, 'removeItem').throws(new Error('nope'));
        expect(await persistence.isAvailable()).to.be.false;
      });

      it('should emit true if everything works properly', async () => {
        expect(await persistence.isAvailable()).to.be.true;
      });
    });
  });
});
