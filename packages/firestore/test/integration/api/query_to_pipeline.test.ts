/**
 * @license
 * Copyright 2024 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { PipelineSnapshot } from '../../../src/lite-api/pipeline-result';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  doc,
  DocumentData,
  setDoc,
  setLogLevel,
  query,
  where,
  FieldPath,
  orderBy,
  limit,
  limitToLast,
  startAt,
  startAfter,
  endAt,
  endBefore,
  collectionGroup,
  collection,
  and,
  documentId,
  addDoc,
  getDoc,
  or
} from '../util/firebase_export';
import {
  apiDescribe,
  PERSISTENCE_MODE_UNSPECIFIED,
  withTestCollection,
  itIf
} from '../util/helpers';
import { execute } from '../util/pipeline_export';

use(chaiAsPromised);

setLogLevel('debug');

const testUnsupportedFeatures = false;

// This is the Query integration tests from the lite API (no cache support)
// with some additional test cases added for more complete coverage.
apiDescribe.only('Query to Pipeline', persistence => {
  addEqualityMatcher();

  function verifyResults(
    actual: PipelineSnapshot,
    ...expected: DocumentData[]
  ): void {
    const results = actual.results;
    expect(results.length).to.equal(expected.length);

    for (let i = 0; i < expected.length; ++i) {
      expect(results[i].data()).to.deep.equal(expected[i]);
    }
  }

  it('supports default query', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      { 1: { foo: 1 } },
      async (collRef, db) => {
        const snapshot = await execute(db.pipeline().createFrom(collRef));
        verifyResults(snapshot, { foo: 1 });
      }
    );
  });

  it('supports filtered query', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('foo', '==', 1));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1 });
      }
    );
  });

  it('supports filtered query (with FieldPath)', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where(new FieldPath('foo'), '==', 1));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1 });
      }
    );
  });

  it('supports ordered query (with default order)', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1 }, { foo: 2 });
      }
    );
  });

  it('supports ordered query (with asc)', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo', 'asc'));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1 }, { foo: 2 });
      }
    );
  });

  it('supports ordered query (with desc)', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo', 'desc'));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2 }, { foo: 1 });
      }
    );
  });

  it('supports limit query', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'), limit(1));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1 });
      }
    );
  });

  it('supports limitToLast query', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 },
        3: { foo: 3 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'), limitToLast(2));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2 }, { foo: 3 });
      }
    );
  });

  it('supports startAt', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'), startAt(2));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2 });
      }
    );
  });

  it('supports startAt with limitToLast', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 },
        3: { foo: 3 },
        4: { foo: 4 },
        5: { foo: 5 }
      },
      async (collRef, db) => {
        const query1 = query(
          collRef,
          orderBy('foo'),
          startAt(3),
          limitToLast(4)
        );
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 3 }, { foo: 4 }, { foo: 5 });
      }
    );
  });

  it('supports endAt with limitToLast', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 },
        3: { foo: 3 },
        4: { foo: 4 },
        5: { foo: 5 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'), endAt(3), limitToLast(2));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2 }, { foo: 3 });
      }
    );
  });

  // sort on __name__ is not working
  itIf(testUnsupportedFeatures)(
    'supports startAfter (with DocumentSnapshot)',
    () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { id: 1, foo: 1, bar: 1, baz: 1 },
          2: { id: 2, foo: 1, bar: 1, baz: 2 },
          3: { id: 3, foo: 1, bar: 1, baz: 2 },
          4: { id: 4, foo: 1, bar: 2, baz: 1 },
          5: { id: 5, foo: 1, bar: 2, baz: 2 },
          6: { id: 6, foo: 1, bar: 2, baz: 2 },
          7: { id: 7, foo: 2, bar: 1, baz: 1 },
          8: { id: 8, foo: 2, bar: 1, baz: 2 },
          9: { id: 9, foo: 2, bar: 1, baz: 2 },
          10: { id: 10, foo: 2, bar: 2, baz: 1 },
          11: { id: 11, foo: 2, bar: 2, baz: 2 },
          12: { id: 12, foo: 2, bar: 2, baz: 2 }
        },
        async (collRef, db) => {
          let docRef = await getDoc(doc(collRef, '2'));
          let query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAfter(docRef)
          );
          let snapshot = await execute(db.pipeline().createFrom(query1));
          verifyResults(
            snapshot,
            { id: 3, foo: 1, bar: 1, baz: 2 },
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );

          docRef = await getDoc(doc(collRef, '3'));
          query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAfter(docRef)
          );
          snapshot = await execute(db.pipeline().createFrom(query1));
          verifyResults(
            snapshot,
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );
        }
      );
    }
  );

  // sort on __name__ is not working
  itIf(testUnsupportedFeatures)(
    'supports startAt (with DocumentSnapshot)',
    () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { id: 1, foo: 1, bar: 1, baz: 1 },
          2: { id: 2, foo: 1, bar: 1, baz: 2 },
          3: { id: 3, foo: 1, bar: 1, baz: 2 },
          4: { id: 4, foo: 1, bar: 2, baz: 1 },
          5: { id: 5, foo: 1, bar: 2, baz: 2 },
          6: { id: 6, foo: 1, bar: 2, baz: 2 },
          7: { id: 7, foo: 2, bar: 1, baz: 1 },
          8: { id: 8, foo: 2, bar: 1, baz: 2 },
          9: { id: 9, foo: 2, bar: 1, baz: 2 },
          10: { id: 10, foo: 2, bar: 2, baz: 1 },
          11: { id: 11, foo: 2, bar: 2, baz: 2 },
          12: { id: 12, foo: 2, bar: 2, baz: 2 }
        },
        async (collRef, db) => {
          let docRef = await getDoc(doc(collRef, '2'));
          let query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAt(docRef)
          );
          let snapshot = await execute(db.pipeline().createFrom(query1));
          verifyResults(
            snapshot,
            { id: 2, foo: 1, bar: 1, baz: 2 },
            { id: 3, foo: 1, bar: 1, baz: 2 },
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );

          docRef = await getDoc(doc(collRef, '3'));
          query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAt(docRef)
          );
          snapshot = await execute(db.pipeline().createFrom(query1));
          verifyResults(
            snapshot,
            { id: 3, foo: 1, bar: 1, baz: 2 },
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );
        }
      );
    }
  );

  it('supports startAfter', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'), startAfter(1));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2 });
      }
    );
  });

  it('supports endAt', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'), endAt(1));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1 });
      }
    );
  });

  it('supports endBefore', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, orderBy('foo'), endBefore(2));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1 });
      }
    );
  });

  it('supports pagination', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        let query1 = query(collRef, orderBy('foo'), limit(1));
        const pipeline1 = db.pipeline().createFrom(query1);
        let snapshot = await execute(pipeline1);
        verifyResults(snapshot, { foo: 1 });

        // Pass the document snapshot from the previous snapshot
        query1 = query(query1, startAfter(snapshot.results[0].get('foo')));
        snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2 });
      }
    );
  });

  it('supports pagination on DocumentIds', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async (collRef, db) => {
        let query1 = query(
          collRef,
          orderBy('foo'),
          orderBy(documentId(), 'asc'),
          limit(1)
        );
        const pipeline1 = db.pipeline().createFrom(query1);
        let snapshot = await execute(pipeline1);
        verifyResults(snapshot, { foo: 1 });

        // Pass the document snapshot from the previous snapshot
        query1 = query(
          query1,
          startAfter(
            snapshot.results[0].get('foo'),
            snapshot.results[0].ref?.id
          )
        );
        snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2 });
      }
    );
  });

  // needs subcollection support
  itIf(testUnsupportedFeatures)('supports collection groups', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {},
      async (collRef, db) => {
        const collectionGroupId = `${collRef.id}group`;

        const fooDoc = doc(
          collRef.firestore,
          `${collRef.id}/foo/${collectionGroupId}/doc1`
        );
        const barDoc = doc(
          collRef.firestore,
          `${collRef.id}/bar/baz/boo/${collectionGroupId}/doc2`
        );
        await setDoc(fooDoc, { foo: 1 });
        await setDoc(barDoc, { bar: 1 });

        const query1 = collectionGroup(collRef.firestore, collectionGroupId);
        const snapshot = await execute(db.pipeline().createFrom(query1));

        verifyResults(snapshot, { bar: 1 }, { foo: 1 });
      }
    );
  });

  // needs subcollection support
  itIf(testUnsupportedFeatures)(
    'supports query over collection path with special characters',
    () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {},
        async (collRef, db) => {
          const docWithSpecials = doc(collRef, 'so!@#$%^&*()_+special');

          const collectionWithSpecials = collection(
            docWithSpecials,
            'so!@#$%^&*()_+special'
          );
          await addDoc(collectionWithSpecials, { foo: 1 });
          await addDoc(collectionWithSpecials, { foo: 2 });

          const snapshot = await execute(
            db
              .pipeline()
              .createFrom(query(collectionWithSpecials, orderBy('foo', 'asc')))
          );

          verifyResults(snapshot, { foo: 1 }, { foo: 2 });
        }
      );
    }
  );

  it('supports multiple inequality on same field', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        '01': { id: 1, foo: 1, bar: 1, baz: 1 },
        '02': { id: 2, foo: 1, bar: 1, baz: 2 },
        '03': { id: 3, foo: 1, bar: 1, baz: 2 },
        '04': { id: 4, foo: 1, bar: 2, baz: 1 },
        '05': { id: 5, foo: 1, bar: 2, baz: 2 },
        '06': { id: 6, foo: 1, bar: 2, baz: 2 },
        '07': { id: 7, foo: 2, bar: 1, baz: 1 },
        '08': { id: 8, foo: 2, bar: 1, baz: 2 },
        '09': { id: 9, foo: 2, bar: 1, baz: 2 },
        '10': { id: 10, foo: 2, bar: 2, baz: 1 },
        '11': { id: 11, foo: 2, bar: 2, baz: 2 },
        '12': { id: 12, foo: 2, bar: 2, baz: 2 }
      },
      async (collRef, db) => {
        const query1 = query(
          collRef,
          and(where('id', '>', 2), where('id', '<=', 10))
        );
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(
          snapshot,
          { id: 3, foo: 1, bar: 1, baz: 2 },
          { id: 4, foo: 1, bar: 2, baz: 1 },
          { id: 5, foo: 1, bar: 2, baz: 2 },
          { id: 6, foo: 1, bar: 2, baz: 2 },
          { id: 7, foo: 2, bar: 1, baz: 1 },
          { id: 8, foo: 2, bar: 1, baz: 2 },
          { id: 9, foo: 2, bar: 1, baz: 2 },
          { id: 10, foo: 2, bar: 2, baz: 1 }
        );
      }
    );
  });

  it('supports multiple inequality on different fields', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        '01': { id: 1, foo: 1, bar: 1, baz: 1 },
        '02': { id: 2, foo: 1, bar: 1, baz: 2 },
        '03': { id: 3, foo: 1, bar: 1, baz: 2 },
        '04': { id: 4, foo: 1, bar: 2, baz: 1 },
        '05': { id: 5, foo: 1, bar: 2, baz: 2 },
        '06': { id: 6, foo: 1, bar: 2, baz: 2 },
        '07': { id: 7, foo: 2, bar: 1, baz: 1 },
        '08': { id: 8, foo: 2, bar: 1, baz: 2 },
        '09': { id: 9, foo: 2, bar: 1, baz: 2 },
        '10': { id: 10, foo: 2, bar: 2, baz: 1 },
        '11': { id: 11, foo: 2, bar: 2, baz: 2 },
        '12': { id: 12, foo: 2, bar: 2, baz: 2 }
      },
      async (collRef, db) => {
        const query1 = query(
          collRef,
          and(where('id', '>=', 2), where('baz', '<', 2))
        );
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(
          snapshot,
          { id: 4, foo: 1, bar: 2, baz: 1 },
          { id: 7, foo: 2, bar: 1, baz: 1 },
          { id: 10, foo: 2, bar: 2, baz: 1 }
        );
      }
    );
  });

  it('supports collectionGroup query', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      { 1: { foo: 1 } },
      async (collRef, db) => {
        const snapshot = await execute(
          db.pipeline().createFrom(collectionGroup(db, collRef.id))
        );
        verifyResults(snapshot, { foo: 1 });
      }
    );
  });

  it('supports eq nan', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: NaN },
        2: { foo: 2, bar: 1 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', '==', NaN));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1, bar: NaN });
      }
    );
  });

  it('supports neq nan', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: NaN },
        2: { foo: 2, bar: 1 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', '!=', NaN));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2, bar: 1 });
      }
    );
  });

  it('supports eq null', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: null },
        2: { foo: 2, bar: 1 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', '==', null));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1, bar: null });
      }
    );
  });

  it('supports neq null', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: null },
        2: { foo: 2, bar: 1 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', '!=', null));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2, bar: 1 });
      }
    );
  });

  it('supports neq', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: 0 },
        2: { foo: 2, bar: 1 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', '!=', 0));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 2, bar: 1 });
      }
    );
  });

  it('supports array contains', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: [0, 2, 4, 6] },
        2: { foo: 2, bar: [1, 3, 5, 7] }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', 'array-contains', 4));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1, bar: [0, 2, 4, 6] });
      }
    );
  });

  // sorting on name required
  itIf(testUnsupportedFeatures)('supports array contains any', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: [0, 2, 4, 6] },
        2: { foo: 2, bar: [1, 3, 5, 7] },
        3: { foo: 3, bar: [10, 20, 30, 40] }
      },
      async (collRef, db) => {
        const query1 = query(
          collRef,
          where('bar', 'array-contains-any', [4, 5])
        );
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(
          snapshot,
          { foo: 1, bar: [0, 2, 4, 6] },
          { foo: 2, bar: [1, 3, 5, 7] }
        );
      }
    );
  });

  it('supports in', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: 2 },
        2: { foo: 2 },
        3: { foo: 3, bar: 10 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', 'in', [0, 10, 20]));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 3, bar: 10 });
      }
    );
  });

  it('supports in with 1', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: 2 },
        2: { foo: 2 },
        3: { foo: 3, bar: 10 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', 'in', [2]));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1, bar: 2 });
      }
    );
  });

  itIf(testUnsupportedFeatures)('supports not in', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: 2 },
        2: { foo: 2, bar: 1 },
        3: { foo: 3, bar: 10 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', 'not-in', [0, 10, 20]));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1, bar: 2 }, { foo: 2, bar: 1 });
      }
    );
  });

  it('supports not in with 1', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: 2 },
        2: { foo: 2 },
        3: { foo: 3, bar: 10 }
      },
      async (collRef, db) => {
        const query1 = query(collRef, where('bar', 'not-in', [2]));
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 3, bar: 10 });
      }
    );
  });

  it('supports or operator', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1, bar: 2 },
        2: { foo: 2, bar: 0 },
        3: { foo: 3, bar: 10 }
      },
      async (collRef, db) => {
        const query1 = query(
          collRef,
          or(where('bar', '==', 2), where('foo', '==', 3)),
          orderBy('foo')
        );
        const snapshot = await execute(db.pipeline().createFrom(query1));
        verifyResults(snapshot, { foo: 1, bar: 2 }, { foo: 3, bar: 10 });
      }
    );
  });
});
