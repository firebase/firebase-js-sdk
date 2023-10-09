/**
 * @license
 * Copyright 2022 Google LLC
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
  collection,
  collectionGroup,
  disableNetwork,
  doc,
  orderBy,
  DocumentData,
  getCountFromServer,
  getAggregateFromServer,
  query,
  QueryDocumentSnapshot,
  terminate,
  where,
  writeBatch,
  count,
  sum,
  average,
  startAt,
  AggregateSpec,
  documentId
} from '../util/firebase_export';
import {
  apiDescribe,
  withEmptyTestCollection,
  withTestCollection,
  withTestDb
} from '../util/helpers';
import { USE_EMULATOR } from '../util/settings';

apiDescribe('Count queries', persistence => {
  it('can run count query getCountFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getCountFromServer(coll);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it("count query doesn't use converter", () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    const throwingConverter = {
      toFirestore(obj: never): DocumentData {
        throw new Error('should never be called');
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): never {
        throw new Error('should never be called');
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const query_ = query(
        coll,
        where('author', '==', 'authorA')
      ).withConverter(throwingConverter);
      const snapshot = await getCountFromServer(query_);
      expect(snapshot.data().count).to.equal(1);
    });
  });

  it('count query supports collection groups', () => {
    return withTestDb(persistence, async db => {
      const collectionGroupId = doc(collection(db, 'aggregateQueryTest')).id;
      const docPaths = [
        `${collectionGroupId}/cg-doc1`,
        `abc/123/${collectionGroupId}/cg-doc2`,
        `zzz${collectionGroupId}/cg-doc3`,
        `abc/123/zzz${collectionGroupId}/cg-doc4`,
        `abc/123/zzz/${collectionGroupId}`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();
      const snapshot = await getCountFromServer(
        collectionGroup(db, collectionGroupId)
      );
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('getCountFromServer fails if firestore is terminated', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await terminate(firestore);
      expect(() => getCountFromServer(coll)).to.throw(
        'The client has already been terminated.'
      );
    });
  });

  it("terminate doesn't crash when there is count query in flight", () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      void getCountFromServer(coll);
      await terminate(firestore);
    });
  });

  // TODO(b/277628384): Re-enable this test once b/277628384 is fixed.
  // eslint-disable-next-line no-restricted-properties
  it.skip('getCountFromServer fails if user is offline', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await disableNetwork(firestore);
      await expect(getCountFromServer(coll)).to.be.eventually.rejectedWith(
        'Failed to get aggregate result because the client is offline'
      );
    });
  });

  // Only verify the error message for missing indexes when running against
  // production, since the Firestore Emulator does not require index creation
  // and will, therefore, never fail in this situation.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'getCountFromServer error message is good if missing index',
    () => {
      return withEmptyTestCollection(persistence, async coll => {
        const query_ = query(
          coll,
          where('key1', '==', 42),
          where('key2', '<', 42)
        );
        if (coll.firestore._databaseId.isDefaultDatabase) {
          await expect(
            getCountFromServer(query_)
          ).to.be.eventually.rejectedWith(
            /index.*https:\/\/console\.firebase\.google\.com/
          );
        } else {
          await expect(getCountFromServer(query_)).to.be.eventually.rejected;
        }
      });
    }
  );
});

apiDescribe('Aggregation queries', persistence => {
  it('can run count query getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        count: count()
      });
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('can alias aggrregations using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        foo: count(),
        'with.dots': count()
      });
      expect(snapshot.data().foo).to.equal(2);
      expect(snapshot.data()['with.dots']).to.equal(2);
    });
  });

  it('allows special chars in aliases when using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        'with-un/su+pp[or]ted': count()
      });

      expect(snapshot.data()['with-un/su+pp[or]ted']).to.equal(2);
    });
  });

  it('allows backticks in aliases when using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        '`with-un/su+pp[or]ted`': count()
      });

      expect(snapshot.data()['`with-un/su+pp[or]ted`']).to.equal(2);
    });
  });

  it('allows backslash in aliases when using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        'with\\backshash\\es': count()
      });

      expect(snapshot.data()['with\\backshash\\es']).to.equal(2);
    });
  });

  it('allows aliases with length greater than 1500 bytes', () => {
    // Alias string length is bytes of UTF-8 encoded alias + 1;
    let longAlias = '';
    for (let i = 0; i < 150; i++) {
      longAlias += '0123456789';
    }

    const longerAlias = longAlias + longAlias;

    const testDocs = {
      a: { num: 3 },
      b: { num: 5 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        [longAlias]: count(),
        [longerAlias]: count()
      });

      expect(snapshot.data()[longAlias]).to.equal(2);
      expect(snapshot.data()[longerAlias]).to.equal(2);
    });
  });

  it('can get duplicate aggregations using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        count: count(),
        foo: count()
      });
      expect(snapshot.data().foo).to.equal(2);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it("getAggregationFromServer doesn't use converter", () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    const throwingConverter = {
      toFirestore(obj: never): DocumentData {
        throw new Error('should never be called');
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): never {
        throw new Error('should never be called');
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const query_ = query(
        coll,
        where('author', '==', 'authorA')
      ).withConverter(throwingConverter);
      const snapshot = await getAggregateFromServer(query_, { count: count() });
      expect(snapshot.data().count).to.equal(1);
    });
  });

  it('aggregate query supports collection groups', () => {
    return withTestDb(persistence, async db => {
      const collectionGroupId = doc(collection(db, 'aggregateQueryTest')).id;
      const docPaths = [
        `${collectionGroupId}/cg-doc1`,
        `abc/123/${collectionGroupId}/cg-doc2`,
        `zzz${collectionGroupId}/cg-doc3`,
        `abc/123/zzz${collectionGroupId}/cg-doc4`,
        `abc/123/zzz/${collectionGroupId}`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();
      const snapshot = await getAggregateFromServer(
        collectionGroup(db, collectionGroupId),
        { count: count() }
      );
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('getAggregateFromServer fails if firestore is terminated', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await terminate(firestore);
      expect(() => getAggregateFromServer(coll, { count: count() })).to.throw(
        'The client has already been terminated.'
      );
    });
  });

  it("terminate doesn't crash when there is aggregate query in flight", () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      void getAggregateFromServer(coll, { count: count() });
      await terminate(firestore);
    });
  });

  // TODO(b/277628384): Re-enable this test once b/277628384 is fixed.
  // eslint-disable-next-line no-restricted-properties
  it.skip('getAggregateFromServer fails if user is offline', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await disableNetwork(firestore);
      await expect(getCountFromServer(coll)).to.be.eventually.rejectedWith(
        'Failed to get aggregate result because the client is offline'
      );
    });
  });

  // Only verify the error message for missing indexes when running against
  // production, since the Firestore Emulator does not require index creation
  // and will, therefore, never fail in this situation.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'getAggregateFromServer error message is good if missing index',
    () => {
      return withEmptyTestCollection(persistence, async coll => {
        const query_ = query(
          coll,
          where('key1', '==', 42),
          where('key2', '<', 42)
        );
        if (coll.firestore._databaseId.isDefaultDatabase) {
          await expect(
            getAggregateFromServer(query_, {
              count: count()
            })
          ).to.be.eventually.rejectedWith(
            /index.*https:\/\/console\.firebase\.google\.com/
          );
        } else {
          await expect(
            getAggregateFromServer(query_, {
              count: count()
            })
          ).to.be.eventually.rejected;
        }
      });
    }
  );
});

apiDescribe.only(
  'Aggregation query with order-by and cursor permutations',
  persistence => {
    // Test definitions:
    // [aggregate, filter, order-by, cursor, expected result]
    const tests: Array<Array<string | number>> = [
      // When we don't use a cursor, we can aggregate with or without
      // order-bys. There are no special concerns in this case.
      ['sum(a)', '-', '-', '-', 5],
      ['sum(a)', 'a = 1', '-', '-', 1],
      ['sum(a)', 'a = 1', 'a ASC', '-', 1],
      ['sum(a)', 'a > 1', '-', '-', 4],
      ['sum(a)', 'a > 1', 'a ASC', '-', 4],
      ['sum(a)', 'a > 1', 'a ASC b ASC', '-', 4],
      ['sum(a)', 'b = 1', '-', '-', 2],
      ['sum(a)', 'b = 1', 'b ASC', '-', 2],
      ['sum(a)', 'b > 1', '-', '-', 3],
      ['sum(a)', 'b > 1', 'b ASC', '-', 3],
      ['sum(a)', 'b > 1', 'b ASC a ASC', '-', 3],

      // When we use a value-based cursor (no document reference or snapshot),
      // then we only need to ensure that our order-by specifies the field
      // the cursor will reference. This is the same as non-aggregate queries,
      // except that we also must explicity specify the order-by field when
      // using inequalities.
      ['sum(a)', 'a = 1', 'a ASC', 2, 0],
      ['sum(a)', 'a > 1', 'a ASC', 2, 4],
      ['sum(a)', 'b > 1', 'b ASC', 2, 3],
      ['sum(a)', 'b > 1', 'b ASC', 3, 2],
      ['sum(a)', '-', 'a ASC', 2, 4],
      ['sum(a)', '-', 'b ASC', 3, 2],

      // For aggregate queries with a cursor using a document snapshot,
      // these are allowed only if the order-by is explicit for all fields.
      ['sum(a)', '-', 'a ASC __name__ ASC', 'snap(col/a)', 5],
      ['sum(a)', '-', 'a ASC __name__ ASC', 'snap(col/b)', 4],
      ['sum(a)', '-', 'a ASC __name__ ASC', 'snap(col/c)', 2],
      ['sum(a)', 'a > 1', 'a ASC __name__ ASC', 'snap(col/a)', 4],
      ['sum(a)', 'a > 1', 'a ASC __name__ ASC', 'snap(col/b)', 4],
      ['sum(a)', 'a > 1', 'a ASC __name__ ASC', 'snap(col/c)', 2],
      // The inequality field "b", must come before the aggregate field "a"
      ['sum(a)', 'b > 1', 'b ASC a ASC __name__ ASC', 'snap(col/a)', 3],
      ['sum(a)', 'b > 1', 'b ASC a ASC __name__ ASC', 'snap(col/c)', 2],

      // For aggregate queries with a cursor using a document reference,
      // these are allowed only if the order-by is explicit for all fields.
      // Note that your cursor must include all fields in the order-by
      ['sum(a)', 'a = 1', '__name__ ASC', 'ref(col/a)', 1],
      ['sum(a)', 'a > 1', 'a ASC __name__ ASC', '1 ref(col/a)', 4],
      ['sum(a)', 'b > 1', 'b ASC a ASC __name__ ASC', '1 1 ref(col/a)', 3]
    ];

    // Aggregate queries over a field (sum, avg, etc) do not support
    // usage of cursors with document reference or document snapshot,
    // unless the aggregated field(s), in-equality field(s),
    // and cursor field(s) are explicity set in the order-by(s).
    // Some of these cases may be supported in a later release.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const unsupportedCases: Array<Array<string | number>> = [
      // For aggregate queries with cursor using a document snapshot,
      // the query must use an explicit order by of fields in
      // this order: "inequality-field(s), aggregate-field(s), docId".
      // Hint: the following do not have complete explicit order-bys.
      ['sum(a)', '-', '-', 'snap(col/a)', 150],
      ['sum(a)', 'a = 1', '-', 'snap(col/a)', 150],
      ['sum(a)', 'a = 1', 'a ASC', 'snap(col/a)', 1],
      ['sum(a)', 'a > 1', '-', 'snap(col/a)', 4],
      ['sum(a)', 'a > 1', 'a ASC', 'snap(col/a)', 4],
      ['sum(a)', 'a > 1', 'b ASC', 'snap(col/a)', 4],
      ['sum(a)', 'b = 1', '-', 'snap(col/a)', 100],
      ['sum(a)', 'b = 1', 'b ASC', 'snap(col/a)', 100],
      ['sum(a)', 'b > 1', '-', 'snap(col/a)', 100],
      ['sum(a)', 'b > 1', '__name__ ASC', 'snap(col/a)', 100],
      ['sum(a)', 'b > 1', 'b ASC', 'snap(col/a)', 100],
      ['sum(a)', 'b > 1', 'a ASC', 'snap(col/a)', 100],

      // Hint: the order-by is missing the aggregate field "a".
      // This may pass against the emulator but not against prod.
      ['sum(a)', 'b > 1', 'b ASC __name__ ASC', 'snap(col/a)', 3],

      // Inequality field must come before the aggregate field.
      ['sum(a)', 'b > 1', 'a ASC b ASC __name__ ASC', 'snap(col/c)', 2],

      // Aggregate queries with using a document reference will not work
      // without an explicit order-by on
      // "inequality-fields, aggregate-fields, docId"
      ['sum(a)', '-', '-', 'ref(col/a)', 5],
      ['sum(a)', 'a = 1', '-', 'ref(col/a)', 1],
      ['sum(a)', 'a > 1', '-', 'ref(col/a)', 2],
      ['sum(a)', 'a > 1', '__name__ ASC', 'ref(col/a)', 2], //3 INVALID_ARGUMENT: inequality filter property and first sort order must be the same: a and __key__
      ['sum(a)', 'b > 1', '__name__ ASC', 'ref(col/a)', 3], // 3 INVALID_ARGUMENT: This query requires an index that has fields [a] after __name__ and Firestore does not currently support such an index.
      ['sum(a)', 'b > 1', 'b ASC __name__ ASC', 'ref(col/a)', 3], // 3 INVALID_ARGUMENT: This query requires an index that has fields [a] after __name__ and Firestore does not currently support such an index.
      ['sum(a)', 'b > 1', 'b ASC __name__ ASC', 'ref(col/c)', 1], // 3 INVALID_ARGUMENT: This query requires an index that has fields [a] after __name__ and Firestore does not currently support such an index.

      // When using a document reference in a cursor with an inequality,
      // THE ORDER-BY AND THE CURSOR must both specify the inequality and
      // document id fields. Hint: in these cases the order-by is correct
      // but the cursor is not.
      ['sum(a)', 'a > 1', 'a ASC __name__ ASC', 'ref(col/a)', 4],
      ['sum(a)', 'b > 1', 'b ASC a ASC __name__ ASC', 'ref(col/a)', 3],

      // Aggregate queries with an inequality and a cursor require an order-by.
      // The same behavior is seen in non-aggregate queries.
      ['sum(a)', 'a > 1', '-', 2, 4],
      ['sum(a)', 'a > 0', '-', 2, 5],
      ['sum(a)', 'b > 1', '-', 2, 3],
      ['sum(a)', 'b > 1', '-', 3, 2]
    ];

    tests.forEach(testCase => {
      const [aggregateOp, whereOp, orderByOp, startAtOp, result] = testCase;

      it(`aggregate: SELECT ${aggregateOp} FROM coll WHERE ${whereOp} ORDER BY ${orderByOp} START AT ${startAtOp}`, () => {
        const testDocs = {
          a: { a: 1, b: 2 },
          b: { a: 2, b: 1 },
          c: { a: 2, b: 3 }
        };
        const testHelper = new CompositeIndexTestHelper();
        return testHelper.withTestDocs(persistence, testDocs, async coll => {
          let q = query(coll, where('testId', '==', testHelper.testId));

          // whereOp
          if (whereOp === 'a > 0') {
            q = query(q, where('a', '>', 0));
          }
          if (whereOp === 'a > 1') {
            q = query(q, where('a', '>', 1));
          } else if (whereOp === 'a = 1') {
            q = query(q, where('a', '==', 1));
          } else if (whereOp === 'b > 1') {
            q = query(q, where('b', '>', 1));
          } else if (whereOp === 'b = 1') {
            q = query(q, where('b', '==', 1));
          }

          // orderByOp
          if (orderByOp === 'a ASC') {
            q = query(q, orderBy('a', 'asc'));
          } else if (orderByOp === 'b ASC') {
            q = query(q, orderBy('b', 'asc'));
          } else if (orderByOp === 'a ASC b ASC') {
            q = query(q, orderBy('a', 'asc'), orderBy('b', 'asc'));
          } else if (orderByOp === 'b ASC a ASC') {
            q = query(q, orderBy('b', 'asc'), orderBy('a', 'asc'));
          } else if (orderByOp === '__name__ ASC') {
            q = query(q, orderBy(documentId(), 'asc'));
          } else if (orderByOp === 'a ASC __name__ ASC') {
            q = query(q, orderBy('a', 'asc'), orderBy(documentId(), 'asc'));
          } else if (orderByOp === 'b ASC __name__ ASC') {
            q = query(q, orderBy('b', 'asc'), orderBy(documentId(), 'asc'));
          } else if (orderByOp === 'a ASC b ASC __name__ ASC') {
            q = query(
              q,
              orderBy('a', 'asc'),
              orderBy('b', 'asc'),
              orderBy(documentId(), 'asc')
            );
          } else if (orderByOp === 'b ASC a ASC __name__ ASC') {
            q = query(
              q,
              orderBy('b', 'asc'),
              orderBy('a', 'asc'),
              orderBy(documentId(), 'asc')
            );
          }

          // startAtOp
          if (startAtOp === 'snap(col/a)') {
            const snap = await testHelper.getDoc(
              testHelper.getDocRef(coll, 'a')
            );
            q = query(q, startAt(snap));
          } else if (startAtOp === 'ref(col/a)') {
            const snap = await testHelper.getDoc(
              testHelper.getDocRef(coll, 'a')
            );
            q = query(q, startAt(snap.id));
          } else if (startAtOp === '1 ref(col/a)') {
            const snap = await testHelper.getDoc(
              testHelper.getDocRef(coll, 'a')
            );
            q = query(q, startAt(1, snap.id));
          } else if (startAtOp === '1 1 ref(col/a)') {
            const snap = await testHelper.getDoc(
              testHelper.getDocRef(coll, 'a')
            );
            q = query(q, startAt(1, 1, snap.id));
          } else if (startAtOp === 'snap(col/b)') {
            const snap = await testHelper.getDoc(
              testHelper.getDocRef(coll, 'b')
            );
            q = query(q, startAt(snap));
          } else if (startAtOp === 'snap(col/c)') {
            const snap = await testHelper.getDoc(
              testHelper.getDocRef(coll, 'c')
            );
            q = query(q, startAt(snap));
          } else if (startAtOp === 'ref(col/b)') {
            const snap = await testHelper.getDoc(
              testHelper.getDocRef(coll, 'b')
            );
            q = query(q, startAt(snap.id));
          } else if (startAtOp !== '-') {
            q = query(q, startAt(startAtOp));
          }

          const aggregateSpec: AggregateSpec = {};
          if (aggregateOp === 'sum(a)') {
            aggregateSpec.totalPages = sum('a');
          }

          const snapshot = await getAggregateFromServer(q, aggregateSpec);
          expect(snapshot.data().totalPages).to.equal(result);
        });
      }).timeout(20000);
    });
  }
);

apiDescribe('Aggregation queries - sum / average', persistence => {
  it('can run sum query getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA', pages: 100 },
      b: { author: 'authorB', title: 'titleB', pages: 50 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(
        query(coll, orderBy('pages')),
        {
          totalPages: sum('pages')
        }
      );
      expect(snapshot.data().totalPages).to.equal(150);
    });
  });

  it('can run average query getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA', pages: 100 },
      b: { author: 'authorB', title: 'titleB', pages: 50 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averagePages: average('pages')
      });
      expect(snapshot.data().averagePages).to.equal(75);
    });
  });

  it('can get multiple aggregations using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA', pages: 100 },
      b: { author: 'authorB', title: 'titleB', pages: 50 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalPages: sum('pages'),
        averagePages: average('pages'),
        count: count()
      });
      expect(snapshot.data().totalPages).to.equal(150);
      expect(snapshot.data().averagePages).to.equal(75);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('can get duplicate aggregations using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA', pages: 100 },
      b: { author: 'authorB', title: 'titleB', pages: 50 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalPages: sum('pages'),
        averagePages: average('pages'),
        totalPagesX: sum('pages'),
        averagePagesY: average('pages')
      });
      expect(snapshot.data().totalPages).to.equal(150);
      expect(snapshot.data().averagePages).to.equal(75);
      expect(snapshot.data().totalPagesX).to.equal(150);
      expect(snapshot.data().averagePagesY).to.equal(75);
    });
  });

  it('can perform max (5) aggregations using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA', pages: 100 },
      b: { author: 'authorB', title: 'titleB', pages: 50 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalPages: sum('pages'),
        averagePages: average('pages'),
        count: count(),
        totalPagesX: sum('pages'),
        averagePagesY: average('pages')
      });
      expect(snapshot.data().totalPages).to.equal(150);
      expect(snapshot.data().averagePages).to.equal(75);
      expect(snapshot.data().count).to.equal(2);
      expect(snapshot.data().totalPagesX).to.equal(150);
      expect(snapshot.data().averagePagesY).to.equal(75);
    });
  });

  it('fails when exceeding the max (5) aggregations using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA', pages: 100 },
      b: { author: 'authorB', title: 'titleB', pages: 50 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const promise = getAggregateFromServer(coll, {
        totalPages: sum('pages'),
        averagePages: average('pages'),
        count: count(),
        totalPagesX: sum('pages'),
        averagePagesY: average('pages'),
        countZ: count()
      });

      await expect(promise).to.eventually.be.rejectedWith(
        /maximum number of aggregations/
      );
    });
  });

  it('returns undefined when getting the result of an unrequested aggregation', () => {
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
        rating: 3
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: 0
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating'),
        averageRating: average('rating')
      });

      // @ts-expect-error
      const totalPages = snapshot.data().totalPages;
      expect(totalPages).to.equal(undefined);
    });
  });

  it('performs aggregates when using `in` operator getAggregationFromServer', () => {
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
        rating: 3
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: 0
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(
        query(coll, where('rating', 'in', [5, 3])),
        {
          totalRating: sum('rating'),
          averageRating: average('rating'),
          countOfDocs: count()
        }
      );
      expect(snapshot.data().totalRating).to.equal(8);
      expect(snapshot.data().averageRating).to.equal(4);
      expect(snapshot.data().countOfDocs).to.equal(2);
    });
  });

  it('performs aggregations on nested map values using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        metadata: { pages: 100, rating: { critic: 2, user: 5 } }
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        metadata: { pages: 50, rating: { critic: 4, user: 4 } }
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalPages: sum('metadata.pages'),
        averagePages: average('metadata.pages'),
        count: count()
      });
      expect(snapshot.data().totalPages).to.equal(150);
      expect(snapshot.data().averagePages).to.equal(75);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('performs sum that results in float using getAggregationFromServer', () => {
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
        rating: 4.5
      },
      c: {
        author: 'authorB',
        title: 'titleB',
        pages: 150,
        year: 2021,
        rating: 3
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(12.5);
    });
  });

  it('performs sum of ints and floats that results in an int using getAggregationFromServer', () => {
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
        rating: 4.5
      },
      c: {
        author: 'authorB',
        title: 'titleB',
        pages: 150,
        year: 2021,
        rating: 3.5
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(13);
    });
  });

  it('performs sum that overflows max int using getAggregationFromServer', () => {
    // A large value that will be represented as a Long on the server, but
    // doubling (2x) this value must overflow Long and force the result to be
    // represented as a Double type on the server.
    const maxLong = Math.pow(2, 63) - 1;

    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: maxLong
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: maxLong
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(maxLong + maxLong);
    });
  });

  it('performs sum that can overflow integer values during accumulation using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MAX_SAFE_INTEGER
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 1
      },
      c: {
        author: 'authorC',
        title: 'titleC',
        pages: 50,
        year: 2020,
        rating: -101
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(
        Number.MAX_SAFE_INTEGER - 100
      );
    });
  });

  it('performs sum that is negative using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MAX_SAFE_INTEGER
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: Number.MIN_SAFE_INTEGER
      },
      c: {
        author: 'authorC',
        title: 'titleC',
        pages: 50,
        year: 2020,
        rating: -101
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: -10000
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(-10101);
    });
  });

  it('performs sum that is positive infinity using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MAX_VALUE
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: Number.MAX_VALUE
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(Number.POSITIVE_INFINITY);
    });
  });

  it('performs sum that is positive infinity using getAggregationFromServer v2', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MAX_VALUE
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 1e293
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(Number.POSITIVE_INFINITY);
    });
  });

  it('performs sum that is negative infinity using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: -Number.MAX_VALUE
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: -Number.MAX_VALUE
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(Number.NEGATIVE_INFINITY);
    });
  });

  it('performs sum that is valid but could overflow during aggregation using getAggregationFromServer', () => {
    // Sum of rating would be 0, but if the accumulation overflow, we expect infinity
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MAX_VALUE
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: Number.MAX_VALUE
      },
      c: {
        author: 'authorC',
        title: 'titleC',
        pages: 100,
        year: 1980,
        rating: -Number.MAX_VALUE
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: -Number.MAX_VALUE
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.oneOf([
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        0
      ]);
    });
  });

  it('performs sum that includes NaN using getAggregationFromServer', () => {
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
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.be.NaN;
    });
  });

  it('performs sum over a result set of zero documents using getAggregationFromServer', () => {
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
        rating: 3
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: 0
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(
        query(coll, where('pages', '>', 200)),
        {
          totalPages: sum('pages')
        }
      );
      expect(snapshot.data().totalPages).to.equal(0);
    });
  });

  it('performs sum only on numeric fields using getAggregationFromServer', () => {
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
        rating: '3'
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: 1
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating'),
        countOfDocs: count()
      });
      expect(snapshot.data().totalRating).to.equal(10);
      expect(snapshot.data().countOfDocs).to.equal(4);
    });
  });

  it('performs sum of min IEEE754 using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MIN_VALUE
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        totalRating: sum('rating')
      });
      expect(snapshot.data().totalRating).to.equal(Number.MIN_VALUE);
    });
  });

  it('performs average of ints that results in an int using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: 10
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 5
      },
      c: {
        author: 'authorB',
        title: 'titleB',
        pages: 150,
        year: 2021,
        rating: 0
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(5);
    });
  });

  it('performs average of floats that results in an int using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: 10.5
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 9.5
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(10);
    });
  });

  it('performs average of floats and ints that results in an int using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: 10
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 9.5
      },
      c: {
        author: 'authorC',
        title: 'titleC',
        pages: 150,
        year: 2021,
        rating: 10.5
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(10);
    });
  });

  it('performs average of float that results in float using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: 5.5
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 4.5
      },
      c: {
        author: 'authorB',
        title: 'titleB',
        pages: 150,
        year: 2021,
        rating: 3.5
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(4.5);
    });
  });

  it('performs average of floats and ints that results in a float using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: 8.6
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 9
      },
      c: {
        author: 'authorC',
        title: 'titleC',
        pages: 150,
        year: 2021,
        rating: 10
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.be.approximately(9.2, 0.0000001);
    });
  });

  it('performs average of ints that results in a float using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: 10
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 9
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(9.5);
    });
  });

  it('performs average causing underflow using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MIN_VALUE
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: 0
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(0);
    });
  });

  it('performs average of min IEEE754 using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MIN_VALUE
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(Number.MIN_VALUE);
    });
  });

  it('performs average that overflows IEEE754 during accumulation using getAggregationFromServer', () => {
    const testDocs = {
      a: {
        author: 'authorA',
        title: 'titleA',
        pages: 100,
        year: 1980,
        rating: Number.MAX_VALUE
      },
      b: {
        author: 'authorB',
        title: 'titleB',
        pages: 50,
        year: 2020,
        rating: Number.MAX_VALUE
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.equal(Number.POSITIVE_INFINITY);
    });
  });

  it('performs average that includes NaN using getAggregationFromServer', () => {
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
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating')
      });
      expect(snapshot.data().averageRating).to.be.NaN;
    });
  });

  it('performs average over a result set of zero documents using getAggregationFromServer', () => {
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
        rating: 3
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: 0
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(
        query(coll, where('pages', '>', 200)),
        {
          averagePages: average('pages')
        }
      );
      expect(snapshot.data().averagePages).to.be.null;
    });
  });

  it('performs average only on numeric fields using getAggregationFromServer', () => {
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
        rating: '3'
      },
      d: {
        author: 'authorD',
        title: 'titleD',
        pages: 50,
        year: 2020,
        rating: 6
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        averageRating: average('rating'),
        countOfDocs: count()
      });
      expect(snapshot.data().averageRating).to.equal(5);
      expect(snapshot.data().countOfDocs).to.equal(4);
    });
  });

  // Only run tests that require indexes against the emulator, because we don't
  // have a way to dynamically create the indexes when running the tests.
  (USE_EMULATOR ? apiDescribe : apiDescribe.skip)(
    'queries requiring indexes',
    () => {
      it('aggregate query supports collection groups - multi-aggregate', () => {
        return withTestDb(persistence, async db => {
          const collectionGroupId = doc(
            collection(db, 'aggregateQueryTest')
          ).id;
          const docPaths = [
            `${collectionGroupId}/cg-doc1`,
            `abc/123/${collectionGroupId}/cg-doc2`,
            `zzz${collectionGroupId}/cg-doc3`,
            `abc/123/zzz${collectionGroupId}/cg-doc4`,
            `abc/123/zzz/${collectionGroupId}`
          ];
          const batch = writeBatch(db);
          for (const docPath of docPaths) {
            batch.set(doc(db, docPath), { x: 2 });
          }
          await batch.commit();
          const snapshot = await getAggregateFromServer(
            collectionGroup(db, collectionGroupId),
            {
              count: count(),
              sum: sum('x'),
              avg: average('x')
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
        return withTestCollection(persistence, testDocs, async coll => {
          const snapshot = await getAggregateFromServer(coll, {
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
        return withTestCollection(persistence, testDocs, async coll => {
          const snapshot = await getAggregateFromServer(coll, {
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
        return withTestCollection(persistence, testDocs, async coll => {
          const snapshot = await getAggregateFromServer(
            query(coll, where('rating', 'array-contains-any', [5, 3])),
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
    }
  );
});
