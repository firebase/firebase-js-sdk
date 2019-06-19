/**
 * @license
 * Copyright 2018 Google Inc.
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

import { DbInterface } from '../src/models/db-interface';

import { deleteDatabase } from './testing-utils/db-helper';

const VALUE = {
  key: 'key-value',
  index: 'index-value',
  otherValue: 'other-value'
};
const DIFFERENT_VALUE = {
  key: 'different-key-value',
  index: 'different-index-value',
  otherValue: 'different-other-value'
};

class MockDbInterface extends DbInterface {
  readonly dbName: string = 'test-db';
  readonly dbVersion: number = 1;
  readonly objectStoreName: string = 'test-obj-store';

  protected onDbUpgrade(
    request: IDBOpenDBRequest,
    _event: IDBVersionChangeEvent
  ): void {
    const db: IDBDatabase = request.result;

    const objectStore = db.createObjectStore(this.objectStoreName, {
      keyPath: 'key'
    });

    objectStore.createIndex('indexName', 'index');
  }
}

describe('DbInterface', () => {
  let dbInterface: MockDbInterface;

  beforeEach(() => {
    dbInterface = new MockDbInterface();
  });

  afterEach(async () => {
    await dbInterface.closeDatabase();
    await deleteDatabase(dbInterface.dbName);
  });

  describe('get', () => {
    beforeEach(async () => {
      await dbInterface.put(VALUE);
    });

    it('gets a value that exists', async () => {
      const value = await dbInterface.get<string>(VALUE.key);
      expect(value).to.deep.equal(VALUE);
    });

    it('returns undefined for a key that does not exist', async () => {
      const value = await dbInterface.get<string>('randomKey');
      expect(value).to.be.undefined;
    });
  });

  describe('getIndex', () => {
    beforeEach(async () => {
      await dbInterface.put(VALUE);
    });

    it('gets a value that exists', async () => {
      const value = await dbInterface.getIndex<string>(
        'indexName',
        VALUE.index
      );
      expect(value).to.deep.equal(VALUE);
    });

    it('returns undefined for an index that does not exist', async () => {
      const value = await dbInterface.getIndex<string>(
        'indexName',
        'randomIndexValue'
      );
      expect(value).to.be.undefined;
    });
  });

  describe('put', () => {
    it('puts a value', async () => {
      await dbInterface.put(VALUE);
      expect(await dbInterface.get(VALUE.key)).to.deep.equal(VALUE);
    });

    it('puts multiple values', async () => {
      await dbInterface.put(VALUE);
      await dbInterface.put(DIFFERENT_VALUE);
      expect(await dbInterface.get(VALUE.key)).to.deep.equal(VALUE);
      expect(await dbInterface.get(DIFFERENT_VALUE.key)).to.deep.equal(
        DIFFERENT_VALUE
      );
    });
  });

  describe('delete', () => {
    it('deletes a value', async () => {
      await dbInterface.put(VALUE);
      await dbInterface.delete(VALUE.key);
      expect(await dbInterface.get(VALUE.key)).to.be.undefined;
    });

    it('does not throw if key does not exist', async () => {
      await dbInterface.delete('randomKey');
      expect(await dbInterface.get('randomKey')).to.be.undefined;
    });
  });
});
