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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { expect } from 'chai';
import {
  SimpleDb,
  SimpleDbSchemaConverter
} from '../../../src/local/simple_db';

import { PersistencePromise } from '../../../src/local/persistence_promise';
import {
  SimpleDbStore,
  SimpleDbTransaction
} from '../../../src/local/simple_db';
import { fail } from '../../../src/util/assert';

chai.use(chaiAsPromised);

interface User {
  id: number;
  name: string;
  age: number;
}

const testData: User[] = [
  { id: 0, name: 'frank', age: 5 },
  { id: 1, name: 'joe', age: 6 },
  { id: 2, name: 'sally', age: 10 },
  { id: 3, name: 'denise', age: 8 },
  { id: 4, name: 'derek', age: 10 },
  { id: 5, name: 'greg', age: 10 },
  { id: 6, name: 'rachel', age: 10 },
  { id: 7, name: 'freddy', age: 11 }
];

const dummyUser = {
  id: 314,
  name: 'nobody',
  age: 7
};

/** Detects whether we are mocking IndexedDB using `IndexedDbShim`. */
function isIndexedDbMock(): boolean {
  return process.env.USE_MOCK_PERSISTENCE === 'YES';
}

class TestSchemaConverter implements SimpleDbSchemaConverter {
  createOrUpgrade(
    db: IDBDatabase,
    txn: SimpleDbTransaction,
    fromVersion: number,
    toVersion: number
  ): PersistencePromise<void> {
    const objectStore = db.createObjectStore('users', { keyPath: 'id' });
    objectStore.createIndex('age-name', ['age', 'name'], {
      unique: false
    });

    // A store that uses arrays as keys.
    db.createObjectStore('docs');
    return PersistencePromise.resolve();
  }
}

describe('SimpleDb', () => {
  if (!SimpleDb.isAvailable()) {
    console.warn('Skipping SimpleDb tests due to lack of indexedDB support.');
    return;
  }

  const dbName = 'simpledb-tests';
  let db: SimpleDb;

  // helper to reduce test boilerplate.
  function runTransaction<T>(
    fn: (
      store: SimpleDbStore<number, User>,
      transaction: SimpleDbTransaction
    ) => PersistencePromise<T>
  ): Promise<T> {
    return db.runTransaction<T>('readwrite', ['users'], txn => {
      return fn(txn.store<number, User>('users'), txn);
    });
  }

  function writeTestData(): Promise<void> {
    return runTransaction(store =>
      PersistencePromise.waitFor(testData.map(user => store.put(user)))
    );
  }

  beforeEach(() => {
    return SimpleDb.delete(dbName)
      .then(() => {
        return SimpleDb.openOrCreate(dbName, 1, new TestSchemaConverter());
      })
      .then(simpleDb => {
        db = simpleDb;
        return writeTestData();
      });
  });

  afterEach(() => db.close());

  after(() => SimpleDb.delete(dbName));

  it('regex test', () => {
    const iPhoneSafariAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 10_14_4 like Mac OS X)' +
      ' AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B411' +
      ' Safari/600.1.4';
    const iPadSafariAgent =
      'Mozilla/5.0 (iPad; CPU iPad OS 9_0 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko)' +
      ' Version/9.0 Mobile/13A344 Safari/601';
    const androidAgent =
      'Mozilla/5.0 (Linux; U; Android 2.2.1; fr-fr; Desire HD Build/FRG83D)' +
      ' AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';
    expect(SimpleDb.getIOSVersion(iPhoneSafariAgent)).to.equal(10.14);
    expect(SimpleDb.getIOSVersion(iPadSafariAgent)).to.equal(9.0);
    expect(SimpleDb.getAndroidVersion(androidAgent)).to.equal(2.2);
  });

  it('can get', async () => {
    await runTransaction(store => {
      return store
        .get(42)
        .next(user => {
          expect(user).to.equal(null);
          return store.get(1);
        })
        .next(user => {
          expect(user).to.deep.equal(testData[1]);
        });
    });
  });

  it('can put', async () => {
    await runTransaction(store => {
      return store.put(dummyUser);
    });
    await runTransaction(store => {
      return store.get(dummyUser.id).next(user => {
        expect(user).to.deep.equal(dummyUser);
      });
    });
  });

  it('lets you explicitly abort transactions', async () => {
    await runTransaction((store, txn) => {
      return store.put(dummyUser).next(() => {
        txn.abort();
      });
    });

    await runTransaction(store => {
      return store.get(dummyUser.id).next(user => {
        expect(user).to.deep.equal(null);
      });
    });
  });

  it('aborts transactions when an error happens', async () => {
    await expect(
      runTransaction(store => {
        return store.put(dummyUser).next(() => {
          throw new Error('Generated error');
        });
      })
    ).to.eventually.be.rejectedWith('Generated error');

    await runTransaction(store => {
      return store.get(dummyUser.id).next(user => {
        expect(user).to.deep.equal(null);
      });
    });
  });

  it('aborts transactions when persistence promise is rejected', async () => {
    await expect(
      runTransaction(store => {
        return store.put(dummyUser).next(() => {
          return PersistencePromise.reject(new Error('Generated error'));
        });
      })
    ).to.eventually.be.rejectedWith('Generated error');

    await runTransaction(store => {
      return store.get(dummyUser.id).next(user => {
        expect(user).to.deep.equal(null);
      });
    });
  });

  it('exposes error from inside a transaction', async () => {
    await expect(
      runTransaction(store => {
        return store.put(dummyUser).next(() => {
          throw new Error('Generated error');
        });
      }).then(() => {}, error => Promise.reject(error))
    ).to.eventually.be.rejectedWith('Generated error');

    await runTransaction(store => {
      return store.get(dummyUser.id).next(user => {
        expect(user).to.deep.equal(null);
      });
    });
  });

  it('can delete', async () => {
    await runTransaction(store => {
      return store.delete(3);
    });
    await runTransaction(store => {
      return store.loadAll().next(users => {
        expect(users.length).to.deep.equal(testData.length - 1);
        expect(users).to.deep.equal(testData.filter(user => user.id !== 3));
      });
    });
  });

  it('loadAll', async () => {
    const range = IDBKeyRange.bound(3, 5);
    await runTransaction(store => {
      return store.loadAll(range).next(users => {
        const expected = testData.filter(user => user.id >= 3 && user.id <= 5);
        expect(users.length).to.deep.equal(expected.length);
        expect(users).to.deep.equal(expected);
      });
    });
    await runTransaction(store => {
      return store.loadAll().next(users => {
        const expected = testData;
        expect(users.length).to.deep.equal(expected.length);
        expect(users).to.deep.equal(expected);
      });
    });
    const indexRange = IDBKeyRange.bound([8], [10, 're']);
    await runTransaction(store => {
      return store.loadAll('age-name', indexRange).next(users => {
        const expected = testData.filter(user => user.id >= 3 && user.id <= 6);
        expect(users.length).to.deep.equal(expected.length);
        expect(users).to.deep.equal(expected);
      });
    });
  });

  it('deleteAll', async () => {
    await runTransaction(store => {
      return store
        .deleteAll()
        .next(() => {
          return store.loadAll();
        })
        .next(users => {
          expect(users).to.deep.equal([]);
        });
    });
  });

  it('deleteAll in key range', async () => {
    const range = IDBKeyRange.bound(3, 5);
    await runTransaction(store => {
      return store
        .deleteAll(range)
        .next(() => {
          return store.loadAll();
        })
        .next(users => {
          const expected = testData.filter(user => user.id < 3 || user.id > 5);
          expect(users.length).to.deep.equal(expected.length);
          expect(users).to.deep.equal(expected);
        });
    });
  });

  it('deleteAll in index range', async () => {
    const indexRange = IDBKeyRange.bound([8], [10, 're']);
    await runTransaction(store => {
      return store
        .deleteAll('age-name', indexRange)
        .next(() => {
          return store.loadAll();
        })
        .next(users => {
          const expected = testData.filter(user => user.id < 3 || user.id > 6);
          expect(users.length).to.deep.equal(expected.length);
          expect(users).to.deep.equal(expected);
        });
    });
  });

  it('can iterate', async () => {
    return runTransaction(store => {
      const iterated: User[] = [];
      return store
        .iterate((key, value) => {
          iterated.push(value);
        })
        .next(() => {
          expect(iterated).to.deep.equal(testData);
        });
    });
  });

  it('can iterate and skip keys', async () => {
    return runTransaction(store => {
      const iterated: User[] = [];
      // Just pull out all the even keys
      return store
        .iterate((key, value, control) => {
          iterated.push(value);
          control.skip(value.id + 2);
        })
        .next(() => {
          expect(iterated).to.deep.equal(testData.filter(v => v.id % 2 === 0));
        });
    });
  });

  it('stops iteration after rejected promise', async () => {
    return runTransaction(store => {
      const iterated: User[] = [];
      return store
        .iterate((key, value) => {
          iterated.push(value);
          return PersistencePromise.reject(new Error('Expected error'));
        })
        .next(() => fail('Promise not rejected'))
        .catch(err => {
          expect(err.message).to.eq('Expected error');
          expect(iterated).to.deep.equal([testData[0]]);
        });
    });
  });

  it('can iterate in reverse', async () => {
    return runTransaction(store => {
      const iterated: User[] = [];
      return store
        .iterate({ reverse: true }, (key, value) => {
          iterated.push(value);
        })
        .next(() => {
          const expected = testData.slice();
          expected.reverse();
          expect(iterated).to.deep.equal(expected);
        });
    });
  });

  // Note: This tests is failing under `IndexedDBShim`.
  (isIndexedDbMock() ? it.skip : it)(
    'can iterate and skip keys in reverse',
    async () => {
      return runTransaction(store => {
        const iterated: User[] = [];
        // Only get the odd keys
        return store
          .iterate({ reverse: true }, (key, value, control) => {
            iterated.push(value);
            control.skip(value.id - 2);
          })
          .next(() => {
            const expected = testData.filter(user => user.id % 2 === 1);
            expected.reverse();
            expect(iterated).to.deep.equal(expected);
          });
      });
    }
  );

  it('can iterate and skip over the index', async () => {
    return runTransaction(store => {
      const range = IDBKeyRange.lowerBound([10, 'greg']);
      const iterated: User[] = [];
      return store
        .iterate({ index: 'age-name', range }, (key, value, control) => {
          iterated.push(value);
          if (value.name === 'sally') {
            control.done();
          } else {
            // Don't skip directly to sally, but skip past rachel.
            control.skip([10, 're']);
          }
        })
        .next(() => {
          // should have gotten greg and sally but not derek or rachel.
          expect(iterated.length).to.equal(2);
          expect(iterated[0].name).to.equal('greg');
          expect(iterated[1].name).to.equal('sally');
        });
    });
  });

  it('can iterate using index and range and stop before end', async () => {
    return runTransaction(store => {
      const range = IDBKeyRange.lowerBound([10, 'greg']);
      const iterated: User[] = [];
      return store
        .iterate({ index: 'age-name', range }, (key, value, control) => {
          iterated.push(value);
          if (value.name === 'rachel') {
            control.done();
          }
        })
        .next(() => {
          // should have gotten greg and rachel but not derek or sally.
          expect(iterated.length).to.equal(2);
          expect(iterated[0].name).to.equal('greg');
          expect(iterated[1].name).to.equal('rachel');
        });
    });
  });

  it('can iterate over index as keys-only', () => {
    return runTransaction(store => {
      const iterated: number[] = [];
      return store
        .iterate(
          { index: 'age-name', keysOnly: true },
          (key, value, control) => {
            expect(value).to.equal(undefined);
            iterated.push(key);
          }
        )
        .next(() => {
          const expected = testData
            .sort((a, b) =>
              a.age !== b.age ? a.age - b.age : a.name.localeCompare(b.name)
            )
            .map(user => user.id);
          expect(iterated).to.deep.equal(expected);
        });
    });
  });

  it('can iterate over index using a partial bound', () => {
    return runTransaction(store => {
      // All the users at least 10 but less than 11.
      const range = IDBKeyRange.bound([10], [11], false, true);
      const iterated: User[] = [];
      return store
        .iterate({ index: 'age-name', range }, (key, value) => {
          iterated.push(value);
        })
        .next(() => {
          // should have gotten greg and rachel but not derek or sally.
          expect(iterated.length).to.equal(4);
          expect(iterated.map(u => u.name)).to.deep.equal([
            'derek',
            'greg',
            'rachel',
            'sally'
          ]);
        });
    });
  });

  it('can use arrays as keys and do partial bounds ranges', async () => {
    const keys = [
      ['fo'],
      ['foo'],
      ['foo', 'bar', 'baz'],
      ['foo', 'd'],
      ['foob']
    ];
    await db.runTransaction('readwrite', ['users', 'docs'], txn => {
      const docsStore = txn.store<string[], string>('docs');
      return PersistencePromise.waitFor(
        keys.map(key => {
          const value = 'doc ' + key.join('/');
          return docsStore.put(key, value);
        })
      );
    });

    await db.runTransaction('readonly', ['docs'], txn => {
      const store = txn.store<string[], string>('docs');
      const range = IDBKeyRange.bound(['foo'], ['foo', 'c']);
      return store.loadAll(range).next(results => {
        expect(results).to.deep.equal(['doc foo', 'doc foo/bar/baz']);
      });
    });
  });

  // tslint:disable-next-line:ban A little perf test for convenient benchmarking
  it.skip('Perf', () => {
    return runTransaction(store => {
      const start = new Date().getTime();
      const promises: Array<PersistencePromise<void>> = [];
      for (let i = 0; i < 1000; ++i) {
        promises.push(store.put({ id: i, name: 'frank', age: i }));
      }
      return PersistencePromise.waitFor(promises).next(() => {
        const end = new Date().getTime();
        // tslint:disable-next-line:no-console
        console.log(`Writing: ${end - start} ms`);
      });
    }).then(() => {
      return runTransaction(store => {
        const start = new Date().getTime();
        const promises: Array<PersistencePromise<User | null>> = [];
        for (let i = 0; i < 1000; ++i) {
          promises.push(store.get(i));
        }
        return PersistencePromise.waitFor(promises).next(() => {
          const end = new Date().getTime();
          // tslint:disable-next-line:no-console
          console.log(`Reading: ${end - start} ms`);
        });
      });
    });
  });
});
