/**
 * @license
 * Copyright 2023 Google LLC
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

import { CompositeIndexTestHelper } from '../util/composite_index_test_helper';
import { where, getDocs, orderBy, getDoc, doc } from '../util/firebase_export';
import { apiDescribe, toDataArray, toIds } from '../util/helpers';

apiDescribe('Queries', persistence => {
  // eslint-disable-next-line no-restricted-properties
  describe.only('query with OrderBy fields', () => {
    it('can run composite index query', () => {
      const testDocs = {
        doc1: { key: 'a', sort: 3 },
        doc2: { key: 'a', sort: 2 },
        doc3: { key: 'b', sort: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const filteredQuery = testHelper.query(
          coll,
          where('key', '==', 'a'),
          orderBy('sort')
        );
        const result = await getDocs(filteredQuery);
        expect(toIds(result)).to.deep.equal(['doc2', 'doc1']);
      });
    });

    it('data isolation is working', () => {
      const testDocs = {
        doc1: { key: 'a', sort: 1 },
        doc2: { key: 'a', sort: 2 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const filteredQuery = testHelper.query(
          coll,
          where('key', '==', 'a'),
          orderBy('sort')
        );
        const result = await getDocs(filteredQuery);
        expect(toIds(result)).to.deep.equal(['doc1', 'doc2']);
      });
    });

    it('can do addDoc and setDoc', () => {
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withEmptyCollection(persistence, async coll => {
        const docRef1 = await testHelper.addDoc(coll, { key: 'a', sort: 1 });
        const docRef2 = doc(coll, 'setDoc');
        await testHelper.setDoc(docRef2, { key: 'a', sort: 2 });

        const docSnap1 = await getDoc(docRef1);
        const docSnap2 = await getDoc(docRef2);

        const filteredQuery = testHelper.query(
          coll,
          where('key', '==', 'a'),
          orderBy('sort')
        );
        const result = await getDocs(filteredQuery);
        expect(toDataArray(result)).to.deep.equal([
          docSnap1.data(),
          docSnap2.data()
        ]);
      });
    });
  });
});
