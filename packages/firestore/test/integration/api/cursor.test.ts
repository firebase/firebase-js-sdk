/**
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
import { asyncIt, toDataArray } from '../../util/helpers';
import firebase from '../util/firebase_export';
import {
  apiDescribe,
  withTestCollection,
  withTestDb,
  withTestDbs
} from '../util/helpers';

apiDescribe('Cursors', persistence => {
  asyncIt('can page through items', () => {
    const testDocs = {
      a: { v: 'a' },
      b: { v: 'b' },
      c: { v: 'c' },
      d: { v: 'd' },
      e: { v: 'e' },
      f: { v: 'f' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .limit(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ v: 'a' }, { v: 'b' }]);
          const lastDoc = docs.docs[docs.docs.length - 1];
          return coll
            .limit(3)
            .startAfter(lastDoc)
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { v: 'c' },
            { v: 'd' },
            { v: 'e' }
          ]);
          const lastDoc = docs.docs[docs.docs.length - 1];
          return coll
            .limit(1)
            .startAfter(lastDoc)
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ v: 'f' }]);
          const lastDoc = docs.docs[docs.docs.length - 1];
          return coll
            .limit(3)
            .startAfter(lastDoc)
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([]);
        });
    });
  });

  asyncIt('can be created from documents', () => {
    const testDocs = {
      a: { k: 'a', sort: 1 },
      b: { k: 'b', sort: 2 },
      c: { k: 'c', sort: 2 },
      d: { k: 'd', sort: 2 },
      e: { k: 'e', sort: 0 },
      f: { k: 'f', nosort: 1 } // should not show up
    };
    return withTestCollection(persistence, testDocs, coll => {
      const query = coll.orderBy('sort');
      return coll
        .doc('c')
        .get()
        .then(doc => {
          expect(doc.data()).to.deep.equal({ k: 'c', sort: 2 });
          return query
            .startAt(doc)
            .get()
            .then(docs => {
              expect(toDataArray(docs)).to.deep.equal([
                { k: 'c', sort: 2 },
                { k: 'd', sort: 2 }
              ]);
              return query.endBefore(doc).get();
            });
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'e', sort: 0 },
            { k: 'a', sort: 1 },
            { k: 'b', sort: 2 }
          ]);
        });
    });
  });

  asyncIt('can be created from values', () => {
    const testDocs = {
      a: { k: 'a', sort: 1 },
      b: { k: 'b', sort: 2 },
      c: { k: 'c', sort: 2 },
      d: { k: 'd', sort: 2 },
      e: { k: 'e', sort: 0 },
      f: { k: 'f', nosort: 1 } // should not show up
    };
    return withTestCollection(persistence, testDocs, coll => {
      const query = coll.orderBy('sort');
      return query
        .startAt(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'b', sort: 2 },
            { k: 'c', sort: 2 },
            { k: 'd', sort: 2 }
          ]);
          return query.endBefore(2).get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'e', sort: 0 },
            { k: 'a', sort: 1 }
          ]);
        });
    });
  });

  asyncIt('can be created using document id', () => {
    const testDocs: { [key: string]: {} } = {
      a: { k: 'a' },
      b: { k: 'b' },
      c: { k: 'c' },
      d: { k: 'd' },
      e: { k: 'e' }
    };
    return withTestDbs(persistence, 2, ([reader, writer]) => {
      // Create random subcollection with documents pre-filled. Note that
      // we use subcollections to test the relative nature of __id__.
      const writerCollection = writer
        .collection('parent-collection')
        .doc()
        .collection('sub-collection');
      const readerCollection = reader.collection(writerCollection.path);
      const sets: Array<Promise<void>> = [];
      Object.keys(testDocs).forEach((key: string) => {
        sets.push(writerCollection.doc(key).set(testDocs[key]));
      });

      return Promise.all(sets)
        .then(() => {
          return readerCollection
            .orderBy(firebase.firestore.FieldPath.documentId())
            .startAt('b')
            .endBefore('d')
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ k: 'b' }, { k: 'c' }]);
        });
    });
  });

  asyncIt('can be used with reference values', () => {
    // We require a db to create reference values
    return withTestDb(persistence, db => {
      const testDocs = {
        a: { k: '1a', ref: db.collection('1').doc('a') },
        b: { k: '1b', ref: db.collection('1').doc('b') },
        c: { k: '2a', ref: db.collection('2').doc('a') },
        d: { k: '2b', ref: db.collection('2').doc('b') },
        e: { k: '3a', ref: db.collection('3').doc('a') }
      };
      return withTestCollection(persistence, testDocs, coll => {
        const query = coll.orderBy('ref');
        return query
          .startAfter(db.collection('1').doc('a'))
          .endAt(db.collection('2').doc('b'))
          .get()
          .then(docs => {
            expect(toDataArray(docs).map(v => v['k'])).to.deep.equal([
              '1b',
              '2a',
              '2b'
            ]);
          });
      });
    });
  });

  asyncIt('can be used in descending queries', () => {
    const testDocs = {
      a: { k: 'a', sort: 1 },
      b: { k: 'b', sort: 2 },
      c: { k: 'c', sort: 2 },
      d: { k: 'd', sort: 3 },
      e: { k: 'e', sort: 0 },
      f: { k: 'f', nosort: 1 } // should not show up
    };
    return withTestCollection(persistence, testDocs, coll => {
      const query = coll
        .orderBy('sort', 'desc')
        // default indexes reverse the key ordering for descending sorts
        .orderBy(firebase.firestore.FieldPath.documentId(), 'desc');
      return query
        .startAt(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'c', sort: 2 },
            { k: 'b', sort: 2 },
            { k: 'a', sort: 1 },
            { k: 'e', sort: 0 }
          ]);
          return query.endBefore(2).get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ k: 'd', sort: 3 }]);
        });
    });
  });
});
