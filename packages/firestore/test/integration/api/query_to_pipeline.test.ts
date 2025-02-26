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

import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  doc,
  DocumentData,
  PipelineResult,
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
  execute
} from '../util/firebase_export';
import {
  apiDescribe,
  PERSISTENCE_MODE_UNSPECIFIED,
  withTestCollection
} from '../util/helpers';

use(chaiAsPromised);

setLogLevel('debug');

// This is the Query integration tests from the lite API (no cache support)
// with some additional test cases added for more complete coverage.
apiDescribe('Query to Pipeline', persistence => {
  addEqualityMatcher();

  function verifyResults(
    actual: Array<PipelineResult<DocumentData>>,
    ...expected: DocumentData[]
  ): void {
    expect(actual.length).to.equal(expected.length);

    for (let i = 0; i < expected.length; ++i) {
      expect(actual[i].data()).to.deep.equal(expected[i]);
    }
  }

  it('supports default query', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      { 1: { foo: 1 } },
      async collRef => {
        const result = await execute(collRef.pipeline());
        verifyResults(result, { foo: 1 });
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
      async collRef => {
        const query1 = query(collRef, where('foo', '==', 1));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 1 });
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
      async collRef => {
        const query1 = query(collRef, where(new FieldPath('foo'), '==', 1));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 1 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo'));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 1 }, { foo: 2 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo', 'asc'));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 1 }, { foo: 2 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo', 'desc'));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 2 }, { foo: 1 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), limit(1));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 1 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), limitToLast(2));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 2 }, { foo: 3 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), startAt(2));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 2 });
      }
    );
  });

  it('supports startAfter (with DocumentReference)', () => {
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
      async collRef => {
        let docRef = await getDoc(doc(collRef, '2'));
        let query1 = query(
          collRef,
          orderBy('foo'),
          orderBy('bar'),
          orderBy('baz'),
          startAfter(docRef)
        );
        let result = await execute(query1.pipeline());
        verifyResults(
          result,
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
        result = await execute(query1.pipeline());
        verifyResults(
          result,
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
  });

  it('supports startAt (with DocumentReference)', () => {
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
      async collRef => {
        let docRef = await getDoc(doc(collRef, '2'));
        let query1 = query(
          collRef,
          orderBy('foo'),
          orderBy('bar'),
          orderBy('baz'),
          startAt(docRef)
        );
        let result = await execute(query1.pipeline());
        verifyResults(
          result,
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
        result = await execute(query1.pipeline());
        verifyResults(
          result,
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
  });

  it('supports startAfter', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {
        1: { foo: 1 },
        2: { foo: 2 }
      },
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), startAfter(1));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 2 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), endAt(1));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 1 });
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
      async collRef => {
        const query1 = query(collRef, orderBy('foo'), endBefore(2));
        const result = await execute(query1.pipeline());
        verifyResults(result, { foo: 1 });
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
      async collRef => {
        let query1 = query(collRef, orderBy('foo'), limit(1));
        const pipeline1 = query1.pipeline();
        let result = await execute(pipeline1);
        verifyResults(result, { foo: 1 });

        // Pass the document snapshot from the previous result
        query1 = query(query1, startAfter(result[0].get('foo')));
        result = await execute(query1.pipeline());
        verifyResults(result, { foo: 2 });
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
      async collRef => {
        let query1 = query(
          collRef,
          orderBy('foo'),
          orderBy(documentId(), 'asc'),
          limit(1)
        );
        const pipeline1 = query1.pipeline();
        let result = await execute(pipeline1);
        verifyResults(result, { foo: 1 });

        // Pass the document snapshot from the previous result
        query1 = query(
          query1,
          startAfter(result[0].get('foo'), result[0].ref?.id)
        );
        result = await execute(query1.pipeline());
        verifyResults(result, { foo: 2 });
      }
    );
  });

  it('supports collection groups', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {},
      async collRef => {
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
        const result = await execute(query1.pipeline());

        verifyResults(result, { bar: 1 }, { foo: 1 });
      }
    );
  });

  it('supports query over collection path with special characters', () => {
    return withTestCollection(
      PERSISTENCE_MODE_UNSPECIFIED,
      {},
      async collRef => {
        const docWithSpecials = doc(collRef, 'so!@#$%^&*()_+special');

        const collectionWithSpecials = collection(
          docWithSpecials,
          'so!@#$%^&*()_+special'
        );
        await addDoc(collectionWithSpecials, { foo: 1 });
        await addDoc(collectionWithSpecials, { foo: 2 });

        const result = await execute(
          query(collectionWithSpecials, orderBy('foo', 'asc')).pipeline()
        );

        verifyResults(result, { foo: 1 }, { foo: 2 });
      }
    );
  });

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
      async collRef => {
        const query1 = query(
          collRef,
          and(where('id', '>', 2), where('id', '<=', 10))
        );
        const result = await execute(query1.pipeline());
        verifyResults(
          result,
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
      async collRef => {
        const query1 = query(
          collRef,
          and(where('id', '>=', 2), where('baz', '<', 2))
        );
        const result = await execute(query1.pipeline());
        verifyResults(
          result,
          { id: 4, foo: 1, bar: 2, baz: 1 },
          { id: 7, foo: 2, bar: 1, baz: 1 },
          { id: 10, foo: 2, bar: 2, baz: 1 }
        );
      }
    );
  });
});
