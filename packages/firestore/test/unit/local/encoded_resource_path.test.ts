/**
 * @license
 * Copyright 2017 Google Inc.
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
import * as EncodedResourcePath from '../../../src/local/encoded_resource_path';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import {
  SimpleDb,
  SimpleDbSchemaConverter,
  SimpleDbStore,
  SimpleDbTransaction
} from '../../../src/local/simple_db';
import { ResourcePath } from '../../../src/model/path';
import { path } from '../../util/helpers';

let db: SimpleDb;
const sep = '\u0001\u0001';

class EncodedResourcePathSchemaConverter implements SimpleDbSchemaConverter {
  createOrUpgrade(
    db: IDBDatabase,
    txn: SimpleDbTransaction,
    fromVersion: number,
    toVersion: number
  ): PersistencePromise<void> {
    db.createObjectStore('test');
    return PersistencePromise.resolve();
  }
}

describe('EncodedResourcePath', () => {
  if (!SimpleDb.isAvailable()) {
    console.warn('No IndexedDB. Skipping EncodedResourcePath tests.');
    return;
  }

  const dbName = 'resource-path-tests';

  beforeEach(() => {
    return SimpleDb.delete(dbName)
      .then(() => {
        return SimpleDb.openOrCreate(
          dbName,
          1,
          new EncodedResourcePathSchemaConverter()
        );
      })
      .then(simpleDb => {
        db = simpleDb;
      });
  });

  afterEach(() => {
    db.close();
  });

  after(() => SimpleDb.delete(dbName));

  it('encodes resource paths', async () => {
    await assertEncoded(sep, ResourcePath.EMPTY_PATH);
    await assertEncoded('\u0001\u0010' + sep, path('\0'));
    await assertEncoded('\u0002' + sep, path('\u0002'));

    await assertEncoded('foo\u0001\u0010' + sep, path('foo\0'));
    await assertEncoded('\u0001\u0010foo' + sep, path('\0foo'));

    // Server specials we don't care about here.
    await assertEncoded('.' + sep, path('.'));
    await assertEncoded('..' + sep, path('..'));
    await assertEncoded('/' + sep, new ResourcePath(['/']));

    await assertEncoded('a' + sep + 'b' + sep + 'c' + sep, path('a/b/c'));
    await assertEncoded(
      'a/b' +
        sep +
        'b.c' +
        sep +
        'c\u0001\u0010d' +
        sep +
        'd\u0001\u0011e' +
        sep,
      new ResourcePath(['a/b', 'b.c', 'c\0d', 'd\u0001e'])
    );
  });

  it('orders resource paths', async () => {
    await assertOrdered([
      ResourcePath.EMPTY_PATH,
      path('\0'),
      path('\u0001'),
      path('\u0002'),
      path('\t'),
      path(' '),
      path('%'),
      path('.'),
      new ResourcePath(['/']),
      path('0'),
      path('z'),
      path('~')
    ]);

    await assertOrdered([
      ResourcePath.EMPTY_PATH,
      path('foo'),
      new ResourcePath(['foo', '']),
      new ResourcePath(['foo', 'bar']),
      new ResourcePath(['foo/', 'bar']),
      path('foob'),
      path('foobar'),
      path('food')
    ]);
  });

  it('prefixes successors correctly', async () => {
    assertPrefixSuccessorEquals('\u0001\u0002', ResourcePath.EMPTY_PATH);
    assertPrefixSuccessorEquals(
      'foo' + sep + 'bar\u0001\u0002',
      path('foo/bar')
    );
  });
});

function assertPrefixSuccessorEquals(
  expected: string,
  path: ResourcePath
): void {
  expect(
    EncodedResourcePath.prefixSuccessor(EncodedResourcePath.encode(path))
  ).to.deep.equal(expected);
}

function assertEncoded(expected: string, path: ResourcePath): Promise<void> {
  const encoded = EncodedResourcePath.encode(path);
  expect(encoded).to.deep.equal(expected);
  const decoded = EncodedResourcePath.decode(encoded);
  expect(decoded.toArray()).to.deep.equal(path.toArray());

  let store: SimpleDbStore<string, boolean>;
  return runTransaction(simpleStore => {
    store = simpleStore;
    return store
      .put(encoded, true)
      .next(() => {
        return store.get(encoded);
      })
      .next(exists => {
        expect(exists).to.equal(true);
        return store.delete(encoded);
      });
  });
}

async function assertOrdered(paths: ResourcePath[]): Promise<void> {
  // Compute the encoded forms of all the given paths
  const encoded: string[] = [];
  for (const path of paths) {
    encoded.push(EncodedResourcePath.encode(path));
  }

  // Insert those all into a table, but backwards
  paths.reverse();
  await runTransaction(store => {
    const promises: Array<PersistencePromise<void>> = [];
    for (const path of encoded) {
      promises.push(store.put(path, true));
    }
    return PersistencePromise.waitFor(promises);
  });
  paths.reverse();

  const selected: string[] = [];
  await runTransaction(simpleStore => {
    return simpleStore.iterate({ keysOnly: true }, key => {
      selected.push(key);
    });
  });

  // Finally, verify all the orderings.
  for (let i = 0; i < paths.length; i++) {
    for (let j = 0; j < encoded.length; j++) {
      if (i < j) {
        expect(ResourcePath.comparator(paths[i], paths[j])).to.equal(-1);
        expect(encoded[i] < encoded[j]).to.equal(true);
        expect(selected[i] < selected[j]).to.equal(true);
      } else if (i > j) {
        expect(ResourcePath.comparator(paths[i], paths[j])).to.equal(1);
        expect(encoded[i] > encoded[j]).to.equal(true);
        expect(selected[i] > selected[j]).to.equal(true);
      } else {
        expect(ResourcePath.comparator(paths[i], paths[j])).to.equal(0);
        expect(encoded[i]).to.deep.equal(encoded[j]);
        expect(selected[i]).to.deep.equal(selected[j]);
      }
    }
  }
}

// helper to reduce test boilerplate.
function runTransaction<T>(
  fn: (
    store: SimpleDbStore<string, boolean>,
    transaction: SimpleDbTransaction
  ) => PersistencePromise<T>
): Promise<T> {
  return db.runTransaction<T>('readwrite', ['test'], txn => {
    return fn(txn.store<string, boolean>('test'), txn);
  });
}
