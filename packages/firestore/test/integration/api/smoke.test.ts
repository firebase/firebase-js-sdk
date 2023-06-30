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

import { expect } from 'chai';

import { EventsAccumulator } from '../util/events_accumulator';
import {
  collection,
  doc,
  DocumentReference,
  DocumentSnapshot,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  setDoc,
  where
} from '../util/firebase_export';
import {
  apiDescribe,
  toDataArray,
  withTestCollection,
  withTestDbs,
  withTestDoc
} from '../util/helpers';

apiDescribe('Smoke Test', persistence => {
  it('can write a single document', () => {
    return withTestDoc(persistence, ref => {
      return setDoc(ref, {
        name: 'Patryk',
        message: 'We are actually writing data!'
      });
    });
  });

  it('can read a written document', () => {
    return withTestDoc(persistence, ref => {
      const data = {
        name: 'Patryk',
        message: 'We are actually writing data!'
      };
      return setDoc(ref, data)
        .then(() => getDoc(ref))
        .then(doc => {
          expect(doc.data()).to.deep.equal(data);
        });
    });
  });

  it('can read a written document with DocumentKey', () => {
    return withTestDoc(persistence, (ref1, db) => {
      const ref2 = doc(collection(db, 'users'));
      const data = { user: ref2, message: 'We are writing data' };
      return setDoc(ref2, { name: 'patryk' }).then(() => {
        return setDoc(ref1, data)
          .then(() => getDoc(ref1))
          .then(doc => {
            const recv = doc.data()!;
            expect(recv['message']).to.deep.equal(data.message);
            const user = recv['user'];
            expect(user).to.be.an.instanceof(DocumentReference);
            expect(user.id).to.deep.equal(ref2.id);
          });
      });
    });
  });

  it('will fire local and remote events', () => {
    return withTestDbs(persistence, 2, ([reader, writer]) => {
      const readerRef = doc(collection(reader, 'rooms/firestore/messages'));
      const writerRef = doc(writer, readerRef.path);
      const data = {
        name: 'Patryk',
        message: 'We are actually writing data!'
      };

      const accum = new EventsAccumulator<DocumentSnapshot>();
      return setDoc(writerRef, data).then(() => {
        const unlisten = onSnapshot(readerRef, accum.storeEvent);
        return accum
          .awaitEvent()
          .then(docSnap => {
            expect(docSnap.exists()).to.equal(true);
            expect(docSnap.data()).to.deep.equal(data);
          })
          .then(() => unlisten());
      });
    });
  });

  it('will fire value events for empty collections', () => {
    return withTestCollection(persistence, {}, collection => {
      const accum = new EventsAccumulator<QuerySnapshot>();
      const unlisten = onSnapshot(collection, accum.storeEvent);
      return accum
        .awaitEvent()
        .then(querySnap => {
          expect(querySnap.empty).to.equal(true);
          expect(querySnap.size).to.equal(0);
          expect(querySnap.docs.length).to.equal(0);
        })
        .then(() => unlisten());
    });
  });

  it('can get collection query', () => {
    const testDocs = {
      '1': {
        name: 'Patryk',
        message: 'We are actually writing data!'
      },
      '2': { name: 'Gil', message: 'Yep!' },
      '3': { name: 'Jonny', message: 'Crazy!' }
    };
    return withTestCollection(persistence, testDocs, ref => {
      return getDocs(ref).then(result => {
        expect(result.empty).to.equal(false);
        expect(result.size).to.equal(3);
        expect(toDataArray(result)).to.deep.equal([
          testDocs[1],
          testDocs[2],
          testDocs[3]
        ]);
      });
    });
  });

  // TODO (b/33691136): temporarily disable failed test
  // This broken because it requires a composite index on filter,sort
  // eslint-disable-next-line no-restricted-properties
  it.skip('can query by field and use order by', () => {
    const testDocs = {
      '1': { sort: 1, filter: true, key: '1' },
      '2': { sort: 2, filter: true, key: '2' },
      '3': { sort: 2, filter: true, key: '3' },
      '4': { sort: 3, filter: false, key: '4' }
    };
    return withTestCollection(persistence, testDocs, coll => {
      const filteredQuery = query(
        coll,
        where('filter', '==', true),
        orderBy('sort', 'desc')
      );
      return getDocs(filteredQuery).then(result => {
        expect(toDataArray(result)).to.deep.equal([
          testDocs[2],
          testDocs[3],
          testDocs[1]
        ]);
      });
    });
  });
});
