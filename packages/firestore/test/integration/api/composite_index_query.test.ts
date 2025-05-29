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
  collectionGroup,
  FieldPath,
  and,
  getCountFromServer,
  documentId,
  disableNetwork
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
          coll,
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
          coll,
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
          coll,
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
          coll,
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
          coll,
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
          coll,
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

  describe('Multiple Inequality', () => {
    it('can use multiple inequality filters', async () => {
      const testDocs = {
        doc1: { key: 'a', sort: 0, v: 0 },
        doc2: { key: 'b', sort: 3, v: 1 },
        doc3: { key: 'c', sort: 1, v: 3 },
        doc4: { key: 'd', sort: 2, v: 2 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        // Multiple inequality fields
        let snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '<=', 2),
            where('v', '>', 2)
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc3']);

        // Duplicate inequality fields
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '<=', 2),
            where('sort', '>', 1)
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc4']);

        // With multiple IN
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>=', 'a'),
            where('sort', '<=', 2),
            where('v', 'in', [2, 3, 4]),
            where('sort', 'in', [2, 3])
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc4']);

        // With NOT-IN
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>=', 'a'),
            where('sort', '<=', 2),
            where('v', 'not-in', [2, 4, 5])
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc1', 'doc3']);

        // With orderby
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>=', 'a'),
            where('sort', '<=', 2),
            orderBy('v', 'desc')
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc3',
          'doc4',
          'doc1'
        ]);

        // With limit
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>=', 'a'),
            where('sort', '<=', 2),
            orderBy('v', 'desc'),
            limit(2)
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc3', 'doc4']);

        // With limitToLast
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>=', 'a'),
            where('sort', '<=', 2),
            orderBy('v', 'desc'),
            limitToLast(2)
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc4', 'doc1']);
      });
    });

    it('can use on special values', async () => {
      const testDocs = {
        doc1: { key: 'a', sort: 0, v: 0 },
        doc2: { key: 'b', sort: NaN, v: 1 },
        doc3: { key: 'c', sort: null, v: 3 },
        doc4: { key: 'd', v: 0 },
        doc5: { key: 'e', sort: 1 },
        doc6: { key: 'f', sort: 1, v: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        let snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '<=', 2)
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc5', 'doc6']);

        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '<=', 2),
            where('v', '<=', 1)
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc6']);
      });
    });

    it('can use with array membership', async () => {
      const testDocs = {
        doc1: { key: 'a', sort: 0, v: [0] },
        doc2: { key: 'b', sort: 1, v: [0, 1, 3] },
        doc3: { key: 'c', sort: 1, v: [] },
        doc4: { key: 'd', sort: 2, v: [1] },
        doc5: { key: 'e', sort: 3, v: [2, 4] },
        doc6: { key: 'f', sort: 4, v: [NaN] },
        doc7: { key: 'g', sort: 4, v: [null] }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        let snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '>=', 1),
            where('v', 'array-contains', 0)
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc2']);

        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '>=', 1),
            where('v', 'array-contains-any', [0, 1])
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc2', 'doc4']);
      });
    });

    it('can use with nested field', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testData = (n?: number): any => {
        n = n || 1;
        return {
          name: 'room ' + n,
          metadata: {
            createdAt: n
          },
          field: 'field ' + n,
          'field.dot': n,
          'field\\slash': n
        };
      };

      const testDocs = {
        'doc1': testData(400),
        'doc2': testData(200),
        'doc3': testData(100),
        'doc4': testData(300)
      };

      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        let snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('metadata.createdAt', '<=', 500),
            where('metadata.createdAt', '>', 100),
            where('name', '!=', 'room 200'),
            orderBy('name')
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc4', 'doc1']);

        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('field', '>=', 'field 100'),
            where(new FieldPath('field.dot'), '!=', 300),
            where('field\\slash', '<', 400),
            orderBy('name', 'desc')
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc2', 'doc3']);
      });
    });

    it('can use with nested composite filters', async () => {
      const testDocs = {
        doc1: { key: 'a', sort: 0, v: 5 },
        doc2: { key: 'aa', sort: 4, v: 4 },
        doc3: { key: 'c', sort: 3, v: 3 },
        doc4: { key: 'b', sort: 2, v: 2 },
        doc5: { key: 'b', sort: 2, v: 1 },
        doc6: { key: 'b', sort: 0, v: 0 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        let snapshot = await testHelper.getDocs(
          testHelper.compositeQuery(
            coll,
            or(
              and(where('key', '==', 'b'), where('sort', '<=', 2)),
              and(where('key', '!=', 'b'), where('v', '>', 4))
            )
          )
        );
        // Implicitly ordered by: 'key' asc, 'sort' asc, 'v' asc, __name__ asc
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc1',
          'doc6',
          'doc5',
          'doc4'
        ]);

        snapshot = await testHelper.getDocs(
          testHelper.compositeQuery(
            coll,
            or(
              and(where('key', '==', 'b'), where('sort', '<=', 2)),
              and(where('key', '!=', 'b'), where('v', '>', 4))
            ),
            orderBy('sort', 'desc'),
            orderBy('key')
          )
        );
        // Ordered by: 'sort' desc, 'key' asc, 'v' asc, __name__ asc
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc5',
          'doc4',
          'doc1',
          'doc6'
        ]);

        snapshot = await testHelper.getDocs(
          testHelper.compositeQuery(
            coll,
            and(
              or(
                and(where('key', '==', 'b'), where('sort', '<=', 4)),
                and(where('key', '!=', 'b'), where('v', '>=', 4))
              ),
              or(
                and(where('key', '>', 'b'), where('sort', '>=', 1)),
                and(where('key', '<', 'b'), where('v', '>', 0))
              )
            )
          )
        );
        // Implicitly ordered by: 'key' asc, 'sort' asc, 'v' asc, __name__ asc
        testHelper.assertSnapshotResultIdsMatch(snapshot, ['doc1', 'doc2']);
      });
    });

    it('inequality fields will be implicitly ordered lexicographically', async () => {
      const testDocs = {
        doc1: { key: 'a', sort: 0, v: 5 },
        doc2: { key: 'aa', sort: 4, v: 4 },
        doc3: { key: 'b', sort: 3, v: 3 },
        doc4: { key: 'b', sort: 2, v: 2 },
        doc5: { key: 'b', sort: 2, v: 1 },
        doc6: { key: 'b', sort: 0, v: 0 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        // Implicitly ordered by: 'key' asc, 'sort' asc, __name__ asc
        let snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '>', 1),
            where('v', 'in', [1, 2, 3, 4])
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc2',
          'doc4',
          'doc5',
          'doc3'
        ]);

        // Implicitly ordered by:  'key' asc, 'sort' asc,__name__ asc
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('sort', '>', 1),
            where('key', '!=', 'a'),
            where('v', 'in', [1, 2, 3, 4])
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc2',
          'doc4',
          'doc5',
          'doc3'
        ]);
      });
    });

    it('can use multiple explicit order by field', async () => {
      const testDocs = {
        doc1: { key: 'a', sort: 5, v: 0 },
        doc2: { key: 'aa', sort: 4, v: 0 },
        doc3: { key: 'b', sort: 3, v: 1 },
        doc4: { key: 'b', sort: 2, v: 1 },
        doc5: { key: 'bb', sort: 1, v: 1 },
        doc6: { key: 'c', sort: 0, v: 2 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        // Ordered by: 'v' asc, 'key' asc, 'sort' asc, __name__ asc
        let snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>', 'a'),
            where('sort', '>=', 1),
            orderBy('v')
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc2',
          'doc4',
          'doc3',
          'doc5'
        ]);

        // Ordered by: 'v asc, 'sort' asc, 'key' asc,  __name__ asc
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>', 'a'),
            where('sort', '>=', 1),
            orderBy('v'),
            orderBy('sort')
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc2',
          'doc5',
          'doc4',
          'doc3'
        ]);

        // Implicit order by matches the direction of last explicit order by.
        // Ordered by: 'v' desc, 'key' desc, 'sort' desc, __name__ desc
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>', 'a'),
            where('sort', '>=', 1),
            orderBy('v', 'desc')
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc5',
          'doc3',
          'doc4',
          'doc2'
        ]);

        // Ordered by: 'v desc, 'sort' asc, 'key' asc,  __name__ asc
        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('key', '>', 'a'),
            where('sort', '>=', 1),
            orderBy('v', 'desc'),
            orderBy('sort')
          )
        );
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc5',
          'doc4',
          'doc3',
          'doc2'
        ]);
      });
    });

    it('can use in aggregate query', async () => {
      const testDocs = {
        doc1: { key: 'a', sort: 5, v: 0 },
        doc2: { key: 'aa', sort: 4, v: 0 },
        doc3: { key: 'b', sort: 3, v: 1 },
        doc4: { key: 'b', sort: 2, v: 1 },
        doc5: { key: 'bb', sort: 1, v: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        const snapshot1 = await getCountFromServer(
          testHelper.query(
            coll,
            where('key', '>', 'a'),
            where('sort', '>=', 1),
            orderBy('v')
          )
        );

        expect(snapshot1.data().count).to.equal(4);

        const snapshot2 = await getAggregateFromServer(
          testHelper.query(
            coll,
            where('key', '>', 'a'),
            where('sort', '>=', 1),
            where('v', '!=', 0)
          ),
          {
            count: count(),
            sum: sum('sort'),
            avg: average('v')
          }
        );
        expect(snapshot2.data().count).to.equal(3);
        expect(snapshot2.data().sum).to.equal(6);
        expect(snapshot2.data().avg).to.equal(1);
      });
    });

    it('can use document ID im multiple inequality query', () => {
      const testDocs = {
        doc1: { key: 'a', sort: 5 },
        doc2: { key: 'aa', sort: 4 },
        doc3: { key: 'b', sort: 3 },
        doc4: { key: 'b', sort: 2 },
        doc5: { key: 'bb', sort: 1 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(persistence, testDocs, async coll => {
        let snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where('sort', '>=', 1),
            where('key', '!=', 'a'),
            where(documentId(), '<', 'doc5')
          )
        );
        // Document Key in inequality field will implicitly ordered to the last.
        // Implicitly ordered by: 'key' asc, 'sort' asc, __name__ asc
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc2',
          'doc4',
          'doc3'
        ]);

        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where(documentId(), '<', 'doc5'),
            where('sort', '>=', 1),
            where('key', '!=', 'a')
          )
        );
        // Changing filters order will not effect implicit order.
        // Implicitly ordered by: 'key' asc, 'sort' asc, __name__ asc
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc2',
          'doc4',
          'doc3'
        ]);

        snapshot = await testHelper.getDocs(
          testHelper.query(
            coll,
            where(documentId(), '<', 'doc5'),
            where('sort', '>=', 1),
            where('key', '!=', 'a'),
            orderBy('sort', 'desc')
          )
        );
        // Ordered by: 'sort' desc,'key' desc,  __name__ desc
        testHelper.assertSnapshotResultIdsMatch(snapshot, [
          'doc2',
          'doc3',
          'doc4'
        ]);
      });
    });

    it('can get documents while offline', () => {
      const testDocs = {
        doc1: { key: 'a', sort: 1 },
        doc2: { key: 'aa', sort: 4 },
        doc3: { key: 'b', sort: 3 },
        doc4: { key: 'b', sort: 2 }
      };
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestDocs(
        persistence.toLruGc(),
        testDocs,
        async (coll, db) => {
          const query_ = testHelper.query(
            coll,
            where('key', '!=', 'a'),
            where('sort', '<=', 3)
          );
          //populate the cache.
          const snapshot1 = await testHelper.getDocs(query_);
          expect(snapshot1.size).to.equal(2);

          await disableNetwork(db);

          const snapshot2 = await testHelper.getDocs(query_);
          expect(snapshot2.metadata.fromCache).to.be.true;
          expect(snapshot2.metadata.hasPendingWrites).to.be.false;
          // Implicitly ordered by: 'key' asc, 'sort' asc, __name__ asc
          testHelper.assertSnapshotResultIdsMatch(snapshot2, ['doc4', 'doc3']);
        }
      );
    });

    // eslint-disable-next-line no-restricted-properties
    (persistence.gc === 'lru' ? it : it.skip)(
      'can get same result from server and cache',
      () => {
        const testDocs = {
          doc1: { a: 1, b: 0 },
          doc2: { a: 2, b: 1 },
          doc3: { a: 3, b: 2 },
          doc4: { a: 1, b: 3 },
          doc5: { a: 1, b: 1 }
        };
        const testHelper = new CompositeIndexTestHelper();
        return testHelper.withTestDocs(persistence, testDocs, async coll => {
          // implicit AND: a != 1 && b < 2
          await testHelper.assertOnlineAndOfflineResultsMatch(
            coll,
            testHelper.query(coll, where('a', '!=', 1), where('b', '<', 2)),
            'doc2'
          );

          // explicit AND: a != 1 && b < 2
          await testHelper.assertOnlineAndOfflineResultsMatch(
            coll,
            testHelper.compositeQuery(
              coll,
              and(where('a', '!=', 1), where('b', '<', 2))
            ),
            'doc2'
          );

          // explicit AND: a < 3 && b not-in [2, 3]
          // Implicitly ordered by: a asc, b asc, __name__ asc
          await testHelper.assertOnlineAndOfflineResultsMatch(
            coll,
            testHelper.compositeQuery(
              coll,
              and(where('a', '<', 3), where('b', 'not-in', [2, 3]))
            ),
            'doc1',
            'doc5',
            'doc2'
          );

          // a <3 && b != 0, implicitly ordered by: a asc, b asc, __name__ asc
          await testHelper.assertOnlineAndOfflineResultsMatch(
            coll,
            testHelper.query(
              coll,
              where('b', '!=', 0),
              where('a', '<', 3),
              limit(2)
            ),
            'doc5',
            'doc4'
          );

          // a <3 && b != 0, ordered by: b desc, a desc, __name__ desc
          await testHelper.assertOnlineAndOfflineResultsMatch(
            coll,
            testHelper.query(
              coll,
              where('a', '<', 3),
              where('b', '!=', 0),
              orderBy('b', 'desc'),
              limit(2)
            ),
            'doc4',
            'doc2'
          );

          // explicit OR: multiple inequality: a>2 || b<1.
          await testHelper.assertOnlineAndOfflineResultsMatch(
            coll,
            testHelper.compositeQuery(
              coll,
              or(where('a', '>', 2), where('b', '<', 1))
            ),
            'doc1',
            'doc3'
          );
        });
      }
    );

    it('inequality query will reject if document key is not the last orderBy field', () => {
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestCollection(persistence, async coll => {
        // Implicitly ordered by:  __name__ asc, 'key' asc,
        const queryForRejection = testHelper.query(
          coll,
          where('key', '!=', 42),
          orderBy(documentId())
        );

        await expect(
          testHelper.getDocs(queryForRejection)
        ).to.be.eventually.rejectedWith(
          /order by clause cannot contain more fields after the key/i
        );
      });
    });

    it('inequality query will reject if document key appears only in equality filter', () => {
      const testHelper = new CompositeIndexTestHelper();
      return testHelper.withTestCollection(persistence, async coll => {
        const query_ = testHelper.query(
          coll,
          where('key', '!=', 42),
          where(documentId(), '==', 'doc1')
        );
        await expect(testHelper.getDocs(query_)).to.be.eventually.rejectedWith(
          'Equality on key is not allowed if there are other inequality fields and key does not appear in inequalities.'
        );
      });
    });
  });
});
