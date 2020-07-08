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
import { _getInstance } from '../util/instantiator';
import { Persistence, PersistenceType } from './';
import { indexedDBLocalPersistence } from './indexed_db';

const persistence: Persistence = _getInstance(indexedDBLocalPersistence);

describe('core/persistence/indexed_db', () => {
  afterEach(sinon.restore);

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

  it('should return blobified user value', async () => {
    const key = 'my-super-special-user';
    const value = testUser({}, 'some-uid');

    expect(await persistence.get(key)).to.be.null;
    await persistence.set(key, value.toPlainObject());
    const out = await persistence.get(key);
    expect(out).to.eql(value.toPlainObject());
    await persistence.remove(key);
    expect(await persistence.get(key)).to.be.null;
  });

  describe('#isAvaliable', () => {
    it('should return true if db is available', async () => {
      expect(await persistence.isAvailable()).to.be.true;
    });

    it('should return false if db creation errors', async () => {
      sinon.stub(indexedDB, 'open').returns({
        addEventListener(evt: string, cb: () => void) {
          if (evt === 'error') {
            cb();
          }
        },
        error: new DOMException('yes there was an error')
      } as any);

      expect(await persistence.isAvailable()).to.be.false;
    });
  });
});
