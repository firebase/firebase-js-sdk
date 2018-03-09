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
import * as firestore from '@firebase/firestore-types';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { EventsAccumulator } from '../util/events_accumulator';
import firebase from '../util/firebase_export';
import {
  apiDescribe,
  toDataArray,
  withTestCollection,
  withTestDbs
} from '../util/helpers';
import { Deferred } from '../../util/promise';

const Timestamp = firebase.firestore.Timestamp;

apiDescribe('Queries', persistence => {
  addEqualityMatcher();

  it('can issue limit queries', () => {
    const testDocs = {
      a: { k: 'a' },
      b: { k: 'b' },
      c: { k: 'c' }
    };
    return withTestCollection(persistence, testDocs, collection => {
      return collection
        .limit(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ k: 'a' }, { k: 'b' }]);
        });
    });
  });

  it('can issue limit queries using descending sort order', () => {
    const testDocs = {
      a: { k: 'a', sort: 0 },
      b: { k: 'b', sort: 1 },
      c: { k: 'c', sort: 1 },
      d: { k: 'd', sort: 2 }
    };
    return withTestCollection(persistence, testDocs, collection => {
      return collection
        .orderBy('sort', 'desc')
        .limit(2)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            { k: 'd', sort: 2 },
            { k: 'c', sort: 1 }
          ]);
        });
    });
  });

  it('key order is descending for descending inequality', () => {
    const testDocs = {
      a: {
        foo: 42
      },
      b: {
        foo: 42.0
      },
      c: {
        foo: 42
      },
      d: {
        foo: 21
      },
      e: {
        foo: 21
      },
      f: {
        foo: 66
      },
      g: {
        foo: 66
      }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where('foo', '>', 21.0)
        .orderBy('foo', 'desc')
        .get()
        .then(docs => {
          expect(docs.docs.map(d => d.id)).to.deep.equal([
            'g',
            'f',
            'c',
            'b',
            'a'
          ]);
        });
    });
  });

  it('can use unary filters', () => {
    const testDocs = {
      a: { null: null, nan: NaN },
      b: { null: null, nan: 0 },
      c: { null: false, nan: NaN }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where('null', '==', null)
        .where('nan', '==', NaN)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ null: null, nan: NaN }]);
        });
    });
  });

  it('can filter on infinity', () => {
    const testDocs = {
      a: { inf: Infinity },
      b: { inf: -Infinity }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where('inf', '==', Infinity)
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([{ inf: Infinity }]);
        });
    });
  });

  it('will not get metadata only updates', () => {
    const testDocs = { a: { v: 'a' }, b: { v: 'b' } };
    return withTestCollection(persistence, testDocs, coll => {
      const storeEvent = new EventsAccumulator<firestore.QuerySnapshot>();
      let unlisten: (() => void) | null = null;
      return Promise.all([
        coll.doc('a').set({ v: 'a' }),
        coll.doc('b').set({ v: 'b' })
      ])
        .then(() => {
          unlisten = coll.onSnapshot(storeEvent.storeEvent);
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a' },
            { v: 'b' }
          ]);
          return coll.doc('a').set({ v: 'a1' });
        })
        .then(() => {
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          return storeEvent.assertNoAdditionalEvents();
        })
        .then(() => {
          unlisten!();
        });
    });
  });

  it('can listen for the same query with different options', () => {
    const testDocs = { a: { v: 'a' }, b: { v: 'b' } };
    return withTestCollection(persistence, testDocs, coll => {
      const storeEvent = new EventsAccumulator<firestore.QuerySnapshot>();
      const storeEventFull = new EventsAccumulator<firestore.QuerySnapshot>();
      let unlisten1: (() => void) | null = null;
      let unlisten2: (() => void) | null = null;
      return Promise.all([
        coll.doc('a').set({ v: 'a' }),
        coll.doc('b').set({ v: 'b' })
      ])
        .then(() => {
          unlisten1 = coll.onSnapshot(storeEvent.storeEvent);
          unlisten2 = coll.onSnapshot(
            { includeDocumentMetadataChanges: true },
            storeEventFull.storeEvent
          );
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a' },
            { v: 'b' }
          ]);
          return storeEventFull.awaitEvent();
        })
        .then(querySnap => {
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a' },
            { v: 'b' }
          ]);
          return coll.doc('a').set({ v: 'a1' });
        })
        .then(() => {
          return storeEventFull.awaitEvents(2);
        })
        .then(events => {
          // Expect two events for the write, once from latency compensation
          // and once from the acknowledgment from the server.
          expect(toDataArray(events[0])).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          expect(toDataArray(events[1])).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          const localResult = events[0].docs;
          expect(localResult[0].metadata.hasPendingWrites).to.equal(true);
          const syncedResults = events[1].docs;
          expect(syncedResults[0].metadata.hasPendingWrites).to.equal(false);

          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          // Expect only one event for the write.
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a1' },
            { v: 'b' }
          ]);
          return storeEvent.assertNoAdditionalEvents();
        })
        .then(() => {
          return coll.doc('b').set({ v: 'b1' });
        })
        .then(() => {
          return storeEvent.awaitEvent();
        })
        .then(querySnap => {
          // Expect only one event from the second write
          expect(toDataArray(querySnap)).to.deep.equal([
            { v: 'a1' },
            { v: 'b1' }
          ]);
          return storeEventFull.awaitEvents(2);
        })
        .then(events => {
          // Expect 2 events from the second write.
          expect(toDataArray(events[0])).to.deep.equal([
            { v: 'a1' },
            { v: 'b1' }
          ]);
          expect(toDataArray(events[1])).to.deep.equal([
            { v: 'a1' },
            { v: 'b1' }
          ]);
          const localResults = events[0].docs;
          expect(localResults[1].metadata.hasPendingWrites).to.equal(true);
          const syncedResults = events[1].docs;
          expect(syncedResults[1].metadata.hasPendingWrites).to.equal(false);
          return storeEvent.assertNoAdditionalEvents();
        })
        .then(() => {
          return storeEventFull.assertNoAdditionalEvents();
        })
        .then(() => {
          unlisten1!();
          unlisten2!();
        });
    });
  });

  it('can issue queries with Dates differing in milliseconds', () => {
    const date1 = new Date();
    date1.setMilliseconds(0);
    const date2 = new Date(date1.getTime());
    date2.setMilliseconds(1);
    const date3 = new Date(date1.getTime());
    date3.setMilliseconds(2);

    const testDocs = {
      '1': { id: '1', date: date1 },
      '2': { id: '2', date: date2 },
      '3': { id: '3', date: date3 }
    };
    return withTestCollection(persistence, testDocs, coll => {
      // Make sure to issue the queries in parallel
      const docs1Promise = coll.where('date', '>', date1).get();
      const docs2Promise = coll.where('date', '>', date2).get();

      return Promise.all([docs1Promise, docs2Promise]).then(results => {
        const docs1 = results[0];
        const docs2 = results[1];

        expect(toDataArray(docs1)).to.deep.equal([
          { id: '2', date: Timestamp.fromDate(date2) },
          { id: '3', date: Timestamp.fromDate(date3) }
        ]);
        expect(toDataArray(docs2)).to.deep.equal([
          { id: '3', date: Timestamp.fromDate(date3) }
        ]);
      });
    });
  });

  it('can listen for QueryMetadata changes', () => {
    const testDocs = {
      '1': { sort: 1, filter: true, key: '1' },
      '2': { sort: 2, filter: true, key: '2' },
      '3': { sort: 2, filter: true, key: '3' },
      '4': { sort: 3, filter: false, key: '4' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      const query = coll.where('key', '<', '4');
      const accum = new EventsAccumulator<firestore.QuerySnapshot>();
      let unlisten2: () => void;
      const unlisten1 = query.onSnapshot(result => {
        expect(toDataArray(result)).to.deep.equal([
          testDocs[1],
          testDocs[2],
          testDocs[3]
        ]);
        const query2 = coll.where('filter', '==', true);
        unlisten2 = query2.onSnapshot(
          {
            includeQueryMetadataChanges: true,
            includeDocumentMetadataChanges: false
          },
          accum.storeEvent
        );
      });
      return accum.awaitEvents(2).then(events => {
        const results1 = events[0];
        const results2 = events[1];
        expect(toDataArray(results1)).to.deep.equal([
          testDocs[1],
          testDocs[2],
          testDocs[3]
        ]);
        expect(toDataArray(results1)).to.deep.equal(toDataArray(results2));
        expect(results1.metadata.fromCache).to.equal(true);
        expect(results2.metadata.fromCache).to.equal(false);
        unlisten1();
        unlisten2();
      });
    });
  });

  it('can explicitly sort by document ID', () => {
    const testDocs = {
      a: { key: 'a' },
      b: { key: 'b' },
      c: { key: 'c' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      // Ideally this would be descending to validate it's different than
      // the default, but that requires an extra index
      return coll
        .orderBy(firebase.firestore.FieldPath.documentId())
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            testDocs['a'],
            testDocs['b'],
            testDocs['c']
          ]);
        });
    });
  });

  it('can query by document ID', () => {
    const testDocs = {
      aa: { key: 'aa' },
      ab: { key: 'ab' },
      ba: { key: 'ba' },
      bb: { key: 'bb' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where(firebase.firestore.FieldPath.documentId(), '==', 'ab')
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([testDocs['ab']]);
          return coll
            .where(firebase.firestore.FieldPath.documentId(), '>', 'aa')
            .where(firebase.firestore.FieldPath.documentId(), '<=', 'ba')
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            testDocs['ab'],
            testDocs['ba']
          ]);
        });
    });
  });

  it('can query by document ID using refs', () => {
    const testDocs = {
      aa: { key: 'aa' },
      ab: { key: 'ab' },
      ba: { key: 'ba' },
      bb: { key: 'bb' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where(firebase.firestore.FieldPath.documentId(), '==', coll.doc('ab'))
        .get()
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([testDocs['ab']]);
          return coll
            .where(
              firebase.firestore.FieldPath.documentId(),
              '>',
              coll.doc('aa')
            )
            .where(
              firebase.firestore.FieldPath.documentId(),
              '<=',
              coll.doc('ba')
            )
            .get();
        })
        .then(docs => {
          expect(toDataArray(docs)).to.deep.equal([
            testDocs['ab'],
            testDocs['ba']
          ]);
        });
    });
  });

  it('can query while reconnecting to network', () => {
    return withTestCollection(persistence, /* docs= */ {}, coll => {
      const deferred = new Deferred<void>();

      const unregister = coll.onSnapshot(
        { includeQueryMetadataChanges: true },
        snapshot => {
          if (!snapshot.empty && !snapshot.metadata.fromCache) {
            deferred.resolve();
          }
        }
      );

      coll.firestore.disableNetwork().then(() => {
        coll.doc().set({ a: 1 });
        coll.firestore.enableNetwork();
      });

      return deferred.promise.then(unregister);
    });
  });

  it('Queries trigger with isFromCache=true when offline', () => {
    return withTestCollection(persistence, { a: { foo: 1 } }, coll => {
      const firestore = coll.firestore;
      const accum = new EventsAccumulator<firestore.QuerySnapshot>();
      const unregister = coll.onSnapshot(
        { includeQueryMetadataChanges: true },
        accum.storeEvent
      );

      return accum
        .awaitEvent()
        .then(querySnap => {
          // initial event
          expect(querySnap.docs.map(doc => doc.data())).to.deep.equal([
            { foo: 1 }
          ]);
          expect(querySnap.metadata.fromCache).to.be.false;
        })
        .then(() => firestore.disableNetwork())
        .then(() => accum.awaitEvent())
        .then(querySnap => {
          // offline event with fromCache = true
          expect(querySnap.metadata.fromCache).to.be.true;
        })
        .then(() => firestore.enableNetwork())
        .then(() => accum.awaitEvent())
        .then(querySnap => {
          // back online event with fromCache = false
          expect(querySnap.metadata.fromCache).to.be.false;
          unregister();
        });
    });
  });
});
