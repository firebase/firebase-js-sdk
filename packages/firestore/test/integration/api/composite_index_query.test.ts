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

import { apiDescribe, toIds } from '../util/helpers';
import { where, getDocs, orderBy } from '../util/firebase_export';
import { CompositeIndexTestHelper } from '../util/composite_index_test_helper';

apiDescribe.skip('Queries', persistence => {
  describe('query with OrderBy fields', () => {
    it('can query by field and use order by', () => {
      const testDocs = {
        doc1: { key: 'a', sort: 3 },
        doc2: { key: 'b', sort: 2 },
        doc3: { key: 'c', sort: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const filteredQuery = testHelper.query(coll, where('key', '!=', 'c'));
        const result = await getDocs(filteredQuery);
        expect(toIds(result)).to.deep.equal(['doc1', 'doc2']);
      });
    });

    it('can query by field and use order by', () => {
      const testDocs = {
        doc1: { key: 'a', sort: 1 },
        doc2: { key: 'b', sort: 2, v: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const filteredQuery = testHelper.query(coll, where('key', '!=', 'd'));
        const result = await getDocs(filteredQuery);
        expect(toIds(result)).to.deep.equal(['doc1', 'doc2']);
      });
    });
  });
});
