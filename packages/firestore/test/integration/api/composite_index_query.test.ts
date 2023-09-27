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

import { CompositeIndexTestHelper } from '../util/composite_index_test_helper';
import {
  where,
  orderBy,
  limit,
  limitToLast,
  or
} from '../util/firebase_export';
import { apiDescribe } from '../util/helpers';

/*
 * Guidance for Creating Tests:
 * ----------------------------
 * When creating tests that require composite indexes, it is recommended to utilize the
 * "CompositeIndexTestHelper" class. This utility class provides methods for creating
 * and setting test documents and running queries with ease, ensuring proper data
 * isolation and query construction.
 *
 * Please remember to update the main index configuration file (firestore_index_config.tf)
 * with any new composite indexes needed for the tests. This ensures synchronization with
 * other testing environments, including CI. You can generate the required index link by
 * clicking on the Firebase console link in the error message while running tests locally.
 */

apiDescribe('Composite Index Queries', persistence => {
  // OR Query tests only run when the SDK's local cache is configured to use
  // LRU garbage collection (rather than eager garbage collection) because
  // they validate that the result from server and cache match.
  // eslint-disable-next-line no-restricted-properties
  (persistence.gc === 'lru' ? describe : describe.skip)('OR Queries', () => {
    it('can use query overloads', () => {
      const testDocs = {
        doc1: { a: 1, b: 0 },
        doc2: { a: 2, b: 1 },
        doc3: { a: 3, b: 2 },
        doc4: { a: 1, b: 3 },
        doc5: { a: 1, b: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        // a == 1, limit 2, b - desc
        await testHelper.assertOnlineAndOfflineResultsMatch(
          testHelper.query(
            coll,
            where('a', '==', 1),
            limit(2),
            orderBy('b', 'desc')
          ),
          'doc4',
          'doc5'
        );
      });
    });

    it('can use or queries', () => {
      const testDocs = {
        doc1: { a: 1, b: 0 },
        doc2: { a: 2, b: 1 },
        doc3: { a: 3, b: 2 },
        doc4: { a: 1, b: 3 },
        doc5: { a: 1, b: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        // with one inequality: a>2 || b==1.
        await testHelper.assertOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', '>', 2), where('b', '==', 1))
          ),
          'doc5',
          'doc2',
          'doc3'
        );

        // Test with limits (implicit order by ASC): (a==1) || (b > 0) LIMIT 2
        await testHelper.assertOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', '==', 1), where('b', '>', 0)),
            limit(2)
          ),
          'doc1',
          'doc2'
        );

        // Test with limits (explicit order by): (a==1) || (b > 0) LIMIT_TO_LAST 2
        // Note: The public query API does not allow implicit ordering when limitToLast is used.
        await testHelper.assertOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', '==', 1), where('b', '>', 0)),
            limitToLast(2),
            orderBy('b')
          ),
          'doc3',
          'doc4'
        );

        // Test with limits (explicit order by ASC): (a==2) || (b == 1) ORDER BY a LIMIT 1
        await testHelper.assertOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', '==', 2), where('b', '==', 1)),
            limit(1),
            orderBy('a')
          ),
          'doc5'
        );

        // Test with limits (explicit order by DESC): (a==2) || (b == 1) ORDER BY a LIMIT_TO_LAST 1
        await testHelper.assertOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', '==', 2), where('b', '==', 1)),
            limitToLast(1),
            orderBy('a')
          ),
          'doc2'
        );
      });
    });
  });
});
