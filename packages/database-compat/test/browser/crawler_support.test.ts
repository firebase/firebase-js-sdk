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

import { _TEST_ACCESS_forceRestClient as forceRestClient } from '@firebase/database';
import { expect } from 'chai';

import { getRandomNode, getFreshRepoFromReference } from '../helpers/util';

// Some sanity checks for the ReadonlyRestClient crawler support.
describe('Crawler Support', () => {
  let initialData;
  let normalRef;
  let restRef;

  beforeEach(done => {
    normalRef = getRandomNode();

    forceRestClient(true);
    restRef = getFreshRepoFromReference(normalRef);
    forceRestClient(false);

    setInitialData(done);
  });

  function setInitialData(done) {
    // Set some initial data.
    initialData = {
      leaf: 42,
      securedLeaf: 'secret',
      leafWithPriority: { '.value': 42, '.priority': 'pri' },
      obj: { a: 1, b: 2 },
      list: {
        10: { name: 'amy', age: 75, '.priority': 22 },
        20: { name: 'becky', age: 42, '.priority': 52 },
        30: { name: 'fred', age: 35, '.priority': 23 },
        40: { name: 'fred', age: 29, '.priority': 26 },
        50: { name: 'sally', age: 21, '.priority': 96 },
        60: { name: 'tom', age: 16, '.priority': 15 },
        70: { name: 'victor', age: 4, '.priority': 47 }
      },
      valueList: {
        10: 'c',
        20: 'b',
        30: 'e',
        40: 'f',
        50: 'a',
        60: 'd',
        70: 'e'
      }
    };

    return normalRef.set(initialData, error => {
      expect(error).to.not.be.ok;
      done();
    });
  }

  it('set() is a no-op', done => {
    normalRef.child('leaf').on('value', s => {
      expect(s.val()).to.equal(42);
    });

    restRef.child('leaf').set('hello');

    // We need to wait long enough to be sure that our 'hello' didn't actually get set, but there's
    // no good way to do that.  So we just do a couple round-trips via the REST client and assume
    // that's good enough.
    restRef.child('obj').once('value', s => {
      expect(s.val()).to.deep.equal(initialData.obj);

      restRef.child('obj').once('value', s => {
        expect(s.val()).to.deep.equal(initialData.obj);

        normalRef.child('leaf').off();
        done();
      });
    });
  });

  it('set() is a no-op (Promise)', () => {
    // This test mostly exists to make sure restRef really is using ReadonlyRestClient
    // and we're not accidentally testing a normal Firebase connection.

    normalRef.child('leaf').on('value', s => {
      expect(s.val()).to.equal(42);
    });

    restRef.child('leaf').set('hello');

    // We need to wait long enough to be sure that our 'hello' didn't actually get set, but there's
    // no good way to do that.  So we just do a couple round-trips via the REST client and assume
    // that's good enough.
    return restRef
      .child('obj')
      .once('value')
      .then(s => {
        expect(s.val()).to.deep.equal(initialData.obj);

        return restRef.child('obj').once('value');
      })
      .then(
        s => {
          expect(s.val()).to.deep.equal(initialData.obj);
          normalRef.child('leaf').off();
        },
        reason => {
          normalRef.child('leaf').off();
          return Promise.reject(reason);
        }
      );
  });

  it('.info/connected fires with true', done => {
    restRef.root.child('.info/connected').on('value', s => {
      if (s.val() === true) {
        done();
      }
    });
  });

  it('Leaf read works.', done => {
    restRef.child('leaf').once('value', s => {
      expect(s.val()).to.equal(initialData.leaf);
      done();
    });
  });

  it('Leaf read works. (Promise)', () => {
    return restRef
      .child('leaf')
      .once('value')
      .then(s => {
        expect(s.val()).to.equal(initialData.leaf);
      });
  });

  it('Object read works.', done => {
    restRef.child('obj').once('value', s => {
      expect(s.val()).to.deep.equal(initialData.obj);
      done();
    });
  });

  it('Object read works. (Promise)', () => {
    return restRef
      .child('obj')
      .once('value')
      .then(s => {
        expect(s.val()).to.deep.equal(initialData.obj);
      });
  });

  it('Leaf with priority read works.', done => {
    restRef.child('leafWithPriority').once('value', s => {
      expect(s.exportVal()).to.deep.equal(initialData.leafWithPriority);
      done();
    });
  });

  it('Leaf with priority read works. (Promise)', () => {
    return restRef
      .child('leafWithPriority')
      .once('value')
      .then(s => {
        expect(s.exportVal()).to.deep.equal(initialData.leafWithPriority);
      });
  });

  it('Null read works.', done => {
    restRef.child('nonexistent').once('value', s => {
      expect(s.val()).to.equal(null);
      done();
    });
  });

  it('Null read works. (Promise)', () => {
    return restRef
      .child('nonexistent')
      .once('value')
      .then(s => {
        expect(s.val()).to.equal(null);
      });
  });

  it('on works.', done => {
    restRef.child('leaf').on('value', s => {
      expect(s.val()).to.equal(initialData.leaf);
      restRef.child('leaf').off();
      done();
    });
  });
});
