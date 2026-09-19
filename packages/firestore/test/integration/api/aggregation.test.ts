/**
 * @license
 * Copyright 2026 Google LLC
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

import { it } from '../../util/mocha_extensions';
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
  addDoc
} from '../util/firebase_export';
import {
  apiDescribe,
  withEmptyTestCollection,
  withTestCollection,
  withTestDb
} from '../util/helpers';

apiDescribe('Count queries', persistence => {
  it('can run count query getCountFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getCountFromServer(coll);
      expect(snapshot.data().count).toBe(2);
    });
  });

  ['so!@#$%^&*()_+special/sub', 'b1/so!@#$%^&*()_+special'].forEach(
    documentPath => {
      it(
        'can run count query getCountFromServer with special chars in the document path: ' +
          documentPath,
        () => {
          return withTestCollection(persistence, {}, async coll => {
            const subColl1 = collection(coll, documentPath);
            await addDoc(subColl1, { foo: 'bar' });
            await addDoc(subColl1, { foo: 'baz' });
            const snapshot1 = await getCountFromServer(subColl1);
            expect(snapshot1.data().count).toBe(2);
          });
        }
      );
    }
  );

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
      expect(snapshot.data().count).toBe(1);
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
      expect(snapshot.data().count).toBe(2);
    });
  });

  it('getCountFromServer fails if firestore is terminated', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await terminate(firestore);
      expect(() => getCountFromServer(coll)).toThrow(
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
      await expect(getCountFromServer(coll)).rejects.toThrow(
        'Failed to get aggregate result because the client is offline'
      );
    });
  });

  // Only verify the error message for missing indexes when running against
  // production, since the Firestore Emulator does not require index creation
  // and will, therefore, never fail in this situation.
  // eslint-disable-next-line no-restricted-properties
  it.skipEnterprise.skipEmulator(
    'getCountFromServer error message contains console link if missing index',
    () => {
      return withEmptyTestCollection(persistence, async coll => {
        const query_ = query(
          coll,
          where('key1', '==', 42),
          where('key2', '<', 42)
        );
        // TODO(b/316359394) Remove the special logic for non-default databases
        // once cl/582465034 is rolled out to production.
        // @ts-ignore internal API usage
        if (coll.firestore._databaseId.isDefaultDatabase) {
          await expect(getCountFromServer(query_)).rejects.toThrow(
            /index.*https:\/\/console\.firebase\.google\.com/
          );
        } else {
          await expect(getCountFromServer(query_)).rejects.toThrow();
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
      expect(snapshot.data().count).toBe(2);
    });
  });

  it('can alias aggregations using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        foo: count(),
        'with.dots': count()
      });
      expect(snapshot.data().foo).toBe(2);
      expect(snapshot.data()['with.dots']).toBe(2);
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

      expect(snapshot.data()['with-un/su+pp[or]ted']).toBe(2);
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

      expect(snapshot.data()['`with-un/su+pp[or]ted`']).toBe(2);
    });
  });

  it('allows backslash in aliases when using getAggregationFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getAggregateFromServer(coll, {
        'with\\backslash\\es': count()
      });

      expect(snapshot.data()['with\\backslash\\es']).toBe(2);
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

      expect(snapshot.data()[longAlias]).toBe(2);
      expect(snapshot.data()[longerAlias]).toBe(2);
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
      expect(snapshot.data().foo).toBe(2);
      expect(snapshot.data().count).toBe(2);
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
      expect(snapshot.data().count).toBe(1);
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
      expect(snapshot.data().count).toBe(2);
    });
  });

  it('getAggregateFromServer fails if firestore is terminated', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await terminate(firestore);
      expect(() => getAggregateFromServer(coll, { count: count() })).toThrow(
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
      await expect(getCountFromServer(coll)).rejects.toThrow(
        'Failed to get aggregate result because the client is offline'
      );
    });
  });

  // Only verify the error message for missing indexes when running against
  // production, since the Firestore Emulator does not require index creation
  // and will, therefore, never fail in this situation.
  // eslint-disable-next-line no-restricted-properties
  it.skipEmulator.skipEnterprise(
    'getAggregateFromServer error message contains console link good if missing index',
    () => {
      return withEmptyTestCollection(persistence, async coll => {
        const query_ = query(
          coll,
          where('key1', '==', 42),
          where('key2', '<', 42)
        );
        // TODO(b/316359394) Remove the special logic for non-default databases
        // once cl/582465034 is rolled out to production.
        // @ts-ignore internal API usage
        if (coll.firestore._databaseId.isDefaultDatabase) {
          await expect(
            getAggregateFromServer(query_, {
              count: count()
            })
          ).rejects.toThrow(/index.*https:\/\/console\.firebase\.google\.com/);
        } else {
          await expect(
            getAggregateFromServer(query_, {
              count: count()
            })
          ).rejects.toThrow();
        }
      });
    }
  );
});

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
      expect(snapshot.data().totalPages).toBe(150);
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
      expect(snapshot.data().averagePages).toBe(75);
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
      expect(snapshot.data().totalPages).toBe(150);
      expect(snapshot.data().averagePages).toBe(75);
      expect(snapshot.data().count).toBe(2);
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
      expect(snapshot.data().totalPages).toBe(150);
      expect(snapshot.data().averagePages).toBe(75);
      expect(snapshot.data().totalPagesX).toBe(150);
      expect(snapshot.data().averagePagesY).toBe(75);
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
      expect(snapshot.data().totalPages).toBe(150);
      expect(snapshot.data().averagePages).toBe(75);
      expect(snapshot.data().count).toBe(2);
      expect(snapshot.data().totalPagesX).toBe(150);
      expect(snapshot.data().averagePagesY).toBe(75);
    });
  });

  it.skipEnterprise(
    'fails when exceeding the max (5) aggregations using getAggregationFromServer',
    () => {
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

        await expect(promise).rejects.toThrow(/maximum number of aggregations/);
      });
    }
  );

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
      expect(totalPages).toBe(undefined);
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
      expect(snapshot.data().totalRating).toBe(8);
      expect(snapshot.data().averageRating).toBe(4);
      expect(snapshot.data().countOfDocs).toBe(2);
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
      expect(snapshot.data().totalPages).toBe(150);
      expect(snapshot.data().averagePages).toBe(75);
      expect(snapshot.data().count).toBe(2);
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
      expect(snapshot.data().totalRating).toBe(12.5);
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
      expect(snapshot.data().totalRating).toBe(13);
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
      expect(snapshot.data().totalRating).toBe(maxLong + maxLong);
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
      expect(snapshot.data().totalRating).toBe(Number.MAX_SAFE_INTEGER - 100);
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
      expect(snapshot.data().totalRating).toBe(-10101);
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
      expect(snapshot.data().totalRating).toBe(Number.POSITIVE_INFINITY);
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
      expect(snapshot.data().totalRating).toBe(Number.POSITIVE_INFINITY);
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
      expect(snapshot.data().totalRating).toBe(Number.NEGATIVE_INFINITY);
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
      expect([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0]).toContain(
        snapshot.data().totalRating
      );
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
      expect(snapshot.data().totalRating).toBeNaN();
    });
  });

  it.skipEnterprise(
    'performs sum over a result set of zero documents using getAggregationFromServer',
    () => {
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
        expect(snapshot.data().totalPages).toBe(0);
      });
    }
  );

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
      expect(snapshot.data().totalRating).toBe(10);
      expect(snapshot.data().countOfDocs).toBe(4);
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
      expect(snapshot.data().totalRating).toBe(Number.MIN_VALUE);
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
      expect(snapshot.data().averageRating).toBe(5);
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
      expect(snapshot.data().averageRating).toBe(10);
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
      expect(snapshot.data().averageRating).toBe(10);
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
      expect(snapshot.data().averageRating).toBe(4.5);
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
      expect(
        Math.abs(snapshot.data().averageRating! - 9.2)
      ).toBeLessThanOrEqual(0.0000001);
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
      expect(snapshot.data().averageRating).toBe(9.5);
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
      expect(snapshot.data().averageRating).toBe(0);
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
      expect(snapshot.data().averageRating).toBe(Number.MIN_VALUE);
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
      expect(snapshot.data().averageRating).toBe(Number.POSITIVE_INFINITY);
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
      expect(snapshot.data().averageRating).toBeNaN();
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
      expect(snapshot.data().averagePages).toBeNull();
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
      expect(snapshot.data().averageRating).toBe(5);
      expect(snapshot.data().countOfDocs).toBe(4);
    });
  });
});
