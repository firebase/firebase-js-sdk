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
  and,
  limit,
  limitToLast,
  or
} from '../util/firebase_export';
import {
  apiDescribe,
  checkOnlineAndOfflineResultsMatch
} from '../util/helpers';

/*
 * Guidance for Creating Tests:
 * ----------------------------
 * When creating tests that require composite indexes, it is recommended to utilize the
 * "CompositeIndexTestHelper" class. This utility class provides methods for creating
 * and setting test documents and running queries with ease, ensuring proper data
 * isolation and query construction.
 *
 * Please remember to update the main index configuration file (firestore_index_config.tf)
 * with any new composite indexes required by the test cases to maintain synchronization
 * of other testing environments, including CI.
 */

apiDescribe('Queries', persistence => {
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
        await checkOnlineAndOfflineResultsMatch(
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
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', '>', 2), where('b', '==', 1))
          ),
          'doc5',
          'doc2',
          'doc3'
        );

        // Test with limits (implicit order by ASC): (a==1) || (b > 0) LIMIT 2
        await checkOnlineAndOfflineResultsMatch(
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
        await checkOnlineAndOfflineResultsMatch(
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
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', '==', 2), where('b', '==', 1)),
            limit(1),
            orderBy('a')
          ),
          'doc5'
        );

        // Test with limits (explicit order by DESC): (a==2) || (b == 1) ORDER BY a LIMIT_TO_LAST 1
        await checkOnlineAndOfflineResultsMatch(
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

    // eslint-disable-next-line no-restricted-properties
    it('supports multiple in ops', () => {
      const testDocs = {
        doc1: { a: 1, b: 0 },
        doc2: { b: 1 },
        doc3: { a: 3, b: 2 },
        doc4: { a: 1, b: 3 },
        doc5: { a: 1 },
        doc6: { a: 2 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        // Two IN operations on different fields with disjunction.
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', 'in', [2, 3]), where('b', 'in', [0, 2])),
            orderBy('a')
          ),
          'doc1',
          'doc6',
          'doc3'
        );

        // Two IN operations on different fields with conjunction.
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            and(where('a', 'in', [2, 3]), where('b', 'in', [0, 2])),
            orderBy('a')
          ),
          'doc3'
        );

        // Two IN operations on the same field.
        // a IN [1,2,3] && a IN [0,1,4] should result in "a==1".
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            and(where('a', 'in', [1, 2, 3]), where('a', 'in', [0, 1, 4]))
          ),
          'doc1',
          'doc4',
          'doc5'
        );

        // a IN [2,3] && a IN [0,1,4] is never true and so the result should be an
        // empty set.
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            and(where('a', 'in', [2, 3]), where('a', 'in', [0, 1, 4]))
          )
        );

        // a IN [0,3] || a IN [0,2] should union them (similar to: a IN [0,2,3]).
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            or(where('a', 'in', [0, 3]), where('a', 'in', [0, 2]))
          ),
          'doc3',
          'doc6'
        );

        // Nested composite filter on the same field.
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            and(
              where('a', 'in', [1, 3]),
              or(
                where('a', 'in', [0, 2]),
                and(where('b', '>=', 1), where('a', 'in', [1, 3]))
              )
            )
          ),
          'doc3',
          'doc4'
        );

        // Nested composite filter on the different fields.
        await checkOnlineAndOfflineResultsMatch(
          testHelper.compositeQuery(
            coll,
            and(
              where('b', 'in', [0, 3]),
              or(
                where('b', 'in', [1]),
                and(where('b', 'in', [2, 3]), where('a', 'in', [1, 3]))
              )
            )
          ),
          'doc4'
        );
      });
    });
  });
});
