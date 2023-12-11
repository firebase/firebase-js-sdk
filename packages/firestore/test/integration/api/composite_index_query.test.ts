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
import {
  where,
  orderBy,
  limit,
  limitToLast,
  or,
  getAggregateFromServer,
  sum,
  average,
  count,
  doc,
  writeBatch,
  collectionGroup
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
 * To get started, please refer to the instructions provided in the README file. This will guide you
 * through setting up your local testing environment and updating the Terraform configuration with
 * any new composite indexes required for your testing scenarios.
 *
 * Note: Whenever feasible, make use of the current document fields (such as 'a,' 'b,' 'author,'
 * 'title') to avoid introducing new composite indexes and surpassing the limit. Refer to the
 * guidelines at https://firebase.google.com/docs/firestore/quotas#indexes for further information.
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

  describe('Aggregation queries - sum / average', () => {
    it('aggregate query supports collection groups - multi-aggregate', () => {
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestCollection(persistence, async (coll, db) => {
        const collectionGroupId = coll.id;
        const docPaths = [
          `${collectionGroupId}/cg-doc1`,
          `abc/123/${collectionGroupId}/cg-doc2`,
          `zzz${collectionGroupId}/cg-doc3`,
          `abc/123/zzz${collectionGroupId}/cg-doc4`,
          `abc/123/zzz/${collectionGroupId}`
        ];
        const batch = writeBatch(db);
        for (const docPath of docPaths) {
          // Add test specific fields to the document value
          batch.set(
            doc(db, docPath),
            testHelper.addTestSpecificFieldsToDoc({ a: 2 })
          );
        }
        await batch.commit();
        const snapshot = await getAggregateFromServer(
          testHelper.query(collectionGroup(db, collectionGroupId)),
          {
            count: count(),
            sum: sum('a'),
            avg: average('a')
          }
        );
        expect(snapshot.data().count).to.equal(2);
        expect(snapshot.data().sum).to.equal(4);
        expect(snapshot.data().avg).to.equal(2);
      });
    });

    it('performs aggregations on documents with all aggregated fields using getAggregationFromServer', () => {
      const testDocs = {
        a: { author: 'authorA', title: 'titleA', pages: 100, year: 1980 },
        b: { author: 'authorB', title: 'titleB', pages: 50, year: 2020 },
        c: { author: 'authorC', title: 'titleC', pages: 150, year: 2021 },
        d: { author: 'authorD', title: 'titleD', pages: 50 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const snapshot = await getAggregateFromServer(testHelper.query(coll), {
          totalPages: sum('pages'),
          averagePages: average('pages'),
          averageYear: average('year'),
          count: count()
        });
        expect(snapshot.data().totalPages).to.equal(300);
        expect(snapshot.data().averagePages).to.equal(100);
        expect(snapshot.data().averageYear).to.equal(2007);
        expect(snapshot.data().count).to.equal(3);
      });
    });

    it('performs aggregates on multiple fields where one aggregate could cause short-circuit due to NaN using getAggregationFromServer', () => {
      const testDocs = {
        a: {
          author: 'authorA',
          title: 'titleA',
          pages: 100,
          year: 1980,
          rating: 5
        },
        b: {
          author: 'authorB',
          title: 'titleB',
          pages: 50,
          year: 2020,
          rating: 4
        },
        c: {
          author: 'authorC',
          title: 'titleC',
          pages: 100,
          year: 1980,
          rating: Number.NaN
        },
        d: {
          author: 'authorD',
          title: 'titleD',
          pages: 50,
          year: 2020,
          rating: 0
        }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const snapshot = await getAggregateFromServer(testHelper.query(coll), {
          totalRating: sum('rating'),
          totalPages: sum('pages'),
          averageYear: average('year')
        });
        expect(snapshot.data().totalRating).to.be.NaN;
        expect(snapshot.data().totalPages).to.equal(300);
        expect(snapshot.data().averageYear).to.equal(2000);
      });
    });

    it('performs aggregates when using `array-contains-any` operator getAggregationFromServer', () => {
      const testDocs = {
        a: {
          author: 'authorA',
          title: 'titleA',
          pages: 100,
          year: 1980,
          rating: [5, 1000]
        },
        b: {
          author: 'authorB',
          title: 'titleB',
          pages: 50,
          year: 2020,
          rating: [4]
        },
        c: {
          author: 'authorC',
          title: 'titleC',
          pages: 100,
          year: 1980,
          rating: [2222, 3]
        },
        d: {
          author: 'authorD',
          title: 'titleD',
          pages: 50,
          year: 2020,
          rating: [0]
        }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const snapshot = await getAggregateFromServer(
          testHelper.query(coll, where('rating', 'array-contains-any', [5, 3])),
          {
            totalRating: sum('rating'),
            averageRating: average('rating'),
            totalPages: sum('pages'),
            averagePages: average('pages'),
            countOfDocs: count()
          }
        );
        expect(snapshot.data().totalRating).to.equal(0);
        expect(snapshot.data().averageRating).to.be.null;
        expect(snapshot.data().totalPages).to.equal(200);
        expect(snapshot.data().averagePages).to.equal(100);
        expect(snapshot.data().countOfDocs).to.equal(2);
      });
    });
  });
});
