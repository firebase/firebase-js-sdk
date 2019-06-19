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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';
import { EventsAccumulator } from '../util/events_accumulator';
import * as integrationHelpers from '../util/helpers';

const apiDescribe = integrationHelpers.apiDescribe;

apiDescribe('Smoke Test', (persistence: boolean) => {
  it('can write a single document', () => {
    return integrationHelpers.withTestDoc(persistence, ref => {
      return ref.set({
        name: 'Patryk',
        message: 'We are actually writing data!'
      });
    });
  });

  it('can read a written document', () => {
    return integrationHelpers.withTestDoc(persistence, ref => {
      const data = {
        name: 'Patryk',
        message: 'We are actually writing data!'
      };
      return ref
        .set(data)
        .then(() => {
          return ref.get();
        })
        .then((doc: firestore.DocumentSnapshot) => {
          expect(doc.data()).to.deep.equal(data);
        });
    });
  });

  it('can read a written document with DocumentKey', () => {
    return integrationHelpers.withTestDoc(persistence, ref1 => {
      const ref2 = ref1.firestore.collection('users').doc();
      const data = { user: ref2, message: 'We are writing data' };
      return ref2.set({ name: 'patryk' }).then(() => {
        return ref1
          .set(data)
          .then(() => {
            return ref1.get();
          })
          .then((doc: firestore.DocumentSnapshot) => {
            const recv = doc.data()!;
            expect(recv['message']).to.deep.equal(data.message);
            const user = recv['user'];
            // Make sure it looks like a DocumentRef.
            expect(user.set).to.be.an.instanceof(Function);
            expect(user.onSnapshot).to.be.an.instanceof(Function);
            expect(user.id).to.deep.equal(ref2.id);
          });
      });
    });
  });

  it('will fire local and remote events', () => {
    return integrationHelpers.withTestDbs(
      persistence,
      2,
      ([reader, writer]) => {
        const readerRef = reader.collection('rooms/firestore/messages').doc();
        const writerRef = writer.doc(readerRef.path);
        const data = {
          name: 'Patryk',
          message: 'We are actually writing data!'
        };

        const accum = new EventsAccumulator<firestore.DocumentSnapshot>();
        return writerRef.set(data).then(() => {
          const unlisten = readerRef.onSnapshot(accum.storeEvent);
          return accum
            .awaitEvent()
            .then(docSnap => {
              expect(docSnap.exists).to.equal(true);
              expect(docSnap.data()).to.deep.equal(data);
            })
            .then(() => unlisten());
        });
      }
    );
  });

  it('will fire value events for empty collections', () => {
    return integrationHelpers.withTestCollection(
      persistence,
      {},
      collection => {
        const accum = new EventsAccumulator<firestore.QuerySnapshot>();
        const unlisten = collection.onSnapshot(accum.storeEvent);
        return accum
          .awaitEvent()
          .then(querySnap => {
            expect(querySnap.empty).to.equal(true);
            expect(querySnap.size).to.equal(0);
            expect(querySnap.docs.length).to.equal(0);
          })
          .then(() => unlisten());
      }
    );
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
    return integrationHelpers.withTestCollection(persistence, testDocs, ref => {
      return ref.get().then(result => {
        expect(result.empty).to.equal(false);
        expect(result.size).to.equal(3);
        expect(integrationHelpers.toDataArray(result)).to.deep.equal([
          testDocs[1],
          testDocs[2],
          testDocs[3]
        ]);
      });
    });
  });

  // TODO (b/33691136): temporarily disable failed test
  // This broken because it requires a composite index on filter,sort
  // tslint:disable-next-line:ban
  it.skip('can query by field and use order by', () => {
    const testDocs = {
      '1': { sort: 1, filter: true, key: '1' },
      '2': { sort: 2, filter: true, key: '2' },
      '3': { sort: 2, filter: true, key: '3' },
      '4': { sort: 3, filter: false, key: '4' }
    };
    return integrationHelpers.withTestCollection(
      persistence,
      testDocs,
      coll => {
        const query = coll.where('filter', '==', true).orderBy('sort', 'desc');
        return query.get().then(result => {
          expect(integrationHelpers.toDataArray(result)).to.deep.equal([
            testDocs[2],
            testDocs[3],
            testDocs[1]
          ]);
        });
      }
    );
  });
});
