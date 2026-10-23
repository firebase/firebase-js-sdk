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

import { FirebaseError } from '@firebase/util';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { Deferred } from '../../util/promise';
import {
  Timestamp,
  CollectionReference,
  DocumentData,
  Firestore
} from '../util/firebase_export';
import { apiDescribe, withTestCollection } from '../util/helpers';
import {
  sum,
  descending,
  execute,
  count,
  average,
  countAll,
  toUpper,
  countIf,
  first,
  last,
  arrayAgg,
  arrayAggDistinct,
  maximum,
  minimum,
  multiply,
  field,
  constant,
  ascending,
  countDistinct,
  rank
} from '../util/pipeline_export';
import { expectResults } from '../util/pipeline_helpers';
import { getRunComprehensiveTests } from '../util/settings';

/**
 * Test data for the window function suites below.
 *
 * The sales are deliberately constructed so that:
 * - `product` and `region` give overlapping, non-nested partitions,
 * - `salesPrice` has ties (30 and 60 both appear twice), which exercises
 *   `range` framing and ranking peers, and
 * - `date` is strictly increasing and has an 11 day gap before the final sale,
 *   which exercises time based `range` framing.
 */
const windowTestDocs: { [id: string]: DocumentData } = {
  sale1: {
    product: 'phone',
    region: 'east',
    salesPrice: 12,
    quantity: 1,
    date: Timestamp.fromDate(new Date('2026-07-01T12:00:00Z'))
  },
  sale2: {
    product: 'phone',
    region: 'west',
    salesPrice: 30,
    quantity: 2,
    date: Timestamp.fromDate(new Date('2026-07-02T12:00:00Z'))
  },
  sale3: {
    product: 'tablet',
    region: 'east',
    salesPrice: 30,
    quantity: 3,
    date: Timestamp.fromDate(new Date('2026-07-02T18:00:00Z'))
  },
  sale4: {
    product: 'tablet',
    region: 'west',
    salesPrice: 60,
    quantity: 4,
    date: Timestamp.fromDate(new Date('2026-07-04T12:00:00Z'))
  },
  sale5: {
    product: 'tablet',
    region: 'east',
    salesPrice: 60,
    quantity: 5,
    date: Timestamp.fromDate(new Date('2026-07-15T12:00:00Z'))
  }
};

apiDescribe.skipClassic('Pipeline window functions', persistence => {
  addEqualityMatcher();

  let firestore: Firestore;
  let productSales: CollectionReference;

  let testDeferred: Deferred<void>;
  let withTestCollectionPromise: Promise<unknown>;

  beforeAll(async () => {
    const setupDeferred = new Deferred<void>();
    testDeferred = new Deferred<void>();
    withTestCollectionPromise = withTestCollection(
      persistence,
      windowTestDocs,
      async (col, db) => {
        productSales = col;
        firestore = db;
        setupDeferred.resolve();
        return testDeferred.promise;
      }
    );
    await setupDeferred.promise;
  });

  afterAll(async () => {
    testDeferred?.resolve();
    await withTestCollectionPromise;
  });

  it('computes running aggregates over a documents frame partitioned by a field and an expression and sorted by multiple keys', async () => {
    const snapshot = await execute(
      firestore
        .pipeline()
        .collection(productSales)
        .addWindowFields(
          {
            partition: ['product', toUpper('region')],
            sort: [ascending('date'), descending('salesPrice')],
            documents: { preceding: 'unbounded', following: constant(0) }
          },
          sum('salesPrice').as('stats.runningTotal'),
          arrayAgg('quantity').as('quantities'),
          countAll().as('count')
        )
        .sort(ascending('date'))
        .select('product', 'stats', 'quantities', 'count')
    );

    expectResults(
      snapshot,
      {
        product: 'phone',
        stats: { runningTotal: 12 },
        quantities: [1],
        count: 1
      },
      {
        product: 'phone',
        stats: { runningTotal: 30 },
        quantities: [2],
        count: 1
      },
      {
        product: 'tablet',
        stats: { runningTotal: 30 },
        quantities: [3],
        count: 1
      },
      {
        product: 'tablet',
        stats: { runningTotal: 60 },
        quantities: [4],
        count: 1
      },
      {
        product: 'tablet',
        stats: { runningTotal: 90 },
        quantities: [3, 5],
        count: 2
      }
    );
  });

  it('counts documents in a time unit range frame using the options overload', async () => {
    const snapshot = await execute(
      firestore
        .pipeline()
        .collection(productSales.path)
        .addWindowFields({
          window: {
            sort: ascending('date'),
            range: {
              preceding: 12,
              following: 'current',
              unit: 'hour'
            }
          },
          fields: [count('quantity').as('windowCount')]
        })
        .sort(ascending('date'))
        .select('product', 'windowCount')
    );

    expectResults(
      snapshot,
      { product: 'phone', windowCount: 1 },
      { product: 'phone', windowCount: 1 },
      { product: 'tablet', windowCount: 2 },
      { product: 'tablet', windowCount: 1 },
      { product: 'tablet', windowCount: 1 }
    );
  });

  it('computes look ahead and nearby aggregates with accumulator level frames', async () => {
    const snapshot = await execute(
      firestore
        .pipeline()
        .collection(productSales)
        .addWindowFields(
          { sort: ascending('quantity') },
          average('salesPrice')
            .over({ documents: { preceding: -1, following: 2 } })
            .as('lookAheadAverage'),
          sum('salesPrice')
            .over({ range: { preceding: 1.5, following: 0.5 } })
            .as('nearbyTotal')
        )
        .sort(ascending('date'))
        .select('product', 'lookAheadAverage', 'nearbyTotal')
    );

    expectResults(
      snapshot,
      { product: 'phone', lookAheadAverage: 30, nearbyTotal: 12 },
      { product: 'phone', lookAheadAverage: 45, nearbyTotal: 42 },
      { product: 'tablet', lookAheadAverage: 60, nearbyTotal: 60 },
      { product: 'tablet', lookAheadAverage: 60, nearbyTotal: 90 },
      { product: 'tablet', lookAheadAverage: null, nearbyTotal: 120 }
    );
  });

  it('rejects a range frame without a sort', async () => {
    await expect(
      execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { range: { preceding: 'unbounded', following: 'current' } },
            count('quantity').as('windowCount')
          )
      )
    ).rejects.toThrow(/range/i);
  });

  it('rejects duplicate aliases and unsupported field values', async () => {
    expect(() =>
      firestore
        .pipeline()
        .collection(productSales)
        .addWindowFields(
          { partition: ['product'] },
          sum('salesPrice').as('total'),
          average('salesPrice').as('total')
        )
    ).to.throw(FirebaseError, /Duplicate alias or field 'total'/);

    expect(() =>
      execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: [constant(undefined as unknown as string)] },
            countAll().as('windowCount')
          )
      )
    ).to.throw(FirebaseError, /Unsupported field value: undefined/);
  });
});

// Comprehensive window function functional tests. Skipped by default on CI and
// local runs because the backend already tests window function semantics, and
// the active suite above exercises the SDK's window function code paths, server
// errors, and client-side validation. Set FIRESTORE_RUN_COMPREHENSIVE_TESTS=true
// to run the full matrix.
const comprehensiveDescribe = getRunComprehensiveTests()
  ? apiDescribe.skipClassic
  : apiDescribe.skip;

comprehensiveDescribe('Pipeline window functions (count)', persistence => {
  addEqualityMatcher();

  let firestore: Firestore;
  let productSales: CollectionReference;

  let testDeferred: Deferred<void>;
  let withTestCollectionPromise: Promise<unknown>;

  beforeAll(async () => {
    const setupDeferred = new Deferred<void>();
    testDeferred = new Deferred<void>();
    withTestCollectionPromise = withTestCollection(
      persistence,
      windowTestDocs,
      async (col, db) => {
        productSales = col;
        firestore = db;
        setupDeferred.resolve();
        return testDeferred.promise;
      }
    );
    await setupDeferred.promise;
  });

  afterAll(async () => {
    testDeferred?.resolve();
    await withTestCollectionPromise;
  });

  describe('partitioning', () => {
    it('treats an empty window spec as a single global window', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields({}, count('quantity').as('windowCount'))
          .sort(ascending('date'))
          .select('product', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', windowCount: 5 },
        { product: 'phone', windowCount: 5 },
        { product: 'tablet', windowCount: 5 },
        { product: 'tablet', windowCount: 5 },
        { product: 'tablet', windowCount: 5 }
      );
    });

    it('partitions by a single field name', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'] },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('product', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', windowCount: 2 },
        { product: 'phone', windowCount: 2 },
        { product: 'tablet', windowCount: 3 },
        { product: 'tablet', windowCount: 3 },
        { product: 'tablet', windowCount: 3 }
      );
    });

    it('partitions by multiple fields', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product', 'region'] },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('product', 'region', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', region: 'east', windowCount: 1 },
        { product: 'phone', region: 'west', windowCount: 1 },
        { product: 'tablet', region: 'east', windowCount: 2 },
        { product: 'tablet', region: 'west', windowCount: 1 },
        { product: 'tablet', region: 'east', windowCount: 2 }
      );
    });

    it('partitions by an expression', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: [toUpper('region')] },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('region', 'windowCount')
      );

      expectResults(
        snapshot,
        { region: 'east', windowCount: 3 },
        { region: 'west', windowCount: 2 },
        { region: 'east', windowCount: 3 },
        { region: 'west', windowCount: 2 },
        { region: 'east', windowCount: 3 }
      );
    });
  });

  describe('sorting and default framing', () => {
    it('computes a running count with the default (sorted) frame', async () => {
      // The implicit default frame when `sort` is specified is a `range` frame
      // from `'unbounded'` preceding to `'current'` following (peer-inclusive).
      // `quantity` is 1..5 in the same order as `date` and has no ties, so the
      // running count is 1..5.
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { sort: ascending('quantity') },
            count('quantity').as('runningCount')
          )
          .sort(ascending('date'))
          .select('product', 'runningCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', runningCount: 1 },
        { product: 'phone', runningCount: 2 },
        { product: 'tablet', runningCount: 3 },
        { product: 'tablet', runningCount: 4 },
        { product: 'tablet', runningCount: 5 }
      );
    });

    it('computes a running count within each partition', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'], sort: ascending('quantity') },
            count('quantity').as('runningCount')
          )
          .sort(ascending('date'))
          .select('product', 'runningCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', runningCount: 1 },
        { product: 'phone', runningCount: 2 },
        { product: 'tablet', runningCount: 1 },
        { product: 'tablet', runningCount: 2 },
        { product: 'tablet', runningCount: 3 }
      );
    });

    it('honors a descending sort', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: descending('date'),
              documents: { preceding: 'unbounded', following: 'current' }
            },
            count('quantity').as('runningCount')
          )
          .sort(ascending('date'))
          .select('product', 'runningCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', runningCount: 5 },
        { product: 'phone', runningCount: 4 },
        { product: 'tablet', runningCount: 3 },
        { product: 'tablet', runningCount: 2 },
        { product: 'tablet', runningCount: 1 }
      );
    });

    it('honors multiple sort orderings', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: [ascending('product'), ascending('date')],
              documents: { preceding: 'unbounded', following: 'current' }
            },
            count('quantity').as('runningCount')
          )
          .sort(ascending('date'))
          .select('product', 'runningCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', runningCount: 1 },
        { product: 'phone', runningCount: 2 },
        { product: 'tablet', runningCount: 3 },
        { product: 'tablet', runningCount: 4 },
        { product: 'tablet', runningCount: 5 }
      );
    });
  });

  describe('documents framing', () => {
    it("supports 'unbounded' preceding to 'current' following", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: ascending('date'),
              documents: { preceding: 'unbounded', following: 'current' }
            },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('product', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', windowCount: 1 },
        { product: 'phone', windowCount: 2 },
        { product: 'tablet', windowCount: 3 },
        { product: 'tablet', windowCount: 4 },
        { product: 'tablet', windowCount: 5 }
      );
    });

    it("supports 'unbounded' preceding to 'unbounded' following", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              partition: ['product'],
              sort: ascending('date'),
              documents: { preceding: 'unbounded', following: 'unbounded' }
            },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('product', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', windowCount: 2 },
        { product: 'phone', windowCount: 2 },
        { product: 'tablet', windowCount: 3 },
        { product: 'tablet', windowCount: 3 },
        { product: 'tablet', windowCount: 3 }
      );
    });

    it("supports 'current' preceding to 'current' following", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: ascending('date'),
              documents: { preceding: 'current', following: 'current' }
            },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('product', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', windowCount: 1 },
        { product: 'phone', windowCount: 1 },
        { product: 'tablet', windowCount: 1 },
        { product: 'tablet', windowCount: 1 },
        { product: 'tablet', windowCount: 1 }
      );
    });

    it("excludes tied peers with 'unbounded' preceding to 'current' following", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: ascending('salesPrice'),
              documents: { preceding: 'unbounded', following: 'current' }
            },
            count('quantity').as('runningCount')
          )
          .sort(ascending('runningCount'))
          .select('salesPrice', 'runningCount')
      );

      expectResults(
        snapshot,
        { salesPrice: 12, runningCount: 1 },
        { salesPrice: 30, runningCount: 2 },
        { salesPrice: 30, runningCount: 3 },
        { salesPrice: 60, runningCount: 4 },
        { salesPrice: 60, runningCount: 5 }
      );
    });
  });

  describe('range framing', () => {
    // In a `range` frame the `'current'` sentinel is peer-inclusive (like SQL
    // `CURRENT ROW` in RANGE mode), equivalent to a numeric `0` offset: it
    // includes every document whose sort value(s) tie with the current
    // document.
    it("counts tied peers with 'current' to 'current'", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              partition: ['product'],
              sort: ascending('salesPrice'),
              range: { preceding: 'current', following: 'current' }
            },
            count('quantity').as('samePriceCount')
          )
          .sort(ascending('date'))
          .select('product', 'salesPrice', 'samePriceCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', salesPrice: 12, samePriceCount: 1 },
        { product: 'phone', salesPrice: 30, samePriceCount: 1 },
        { product: 'tablet', salesPrice: 30, samePriceCount: 1 },
        { product: 'tablet', salesPrice: 60, samePriceCount: 2 },
        { product: 'tablet', salesPrice: 60, samePriceCount: 2 }
      );
    });

    it('counts tied peers with a zero offset on both bounds', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              partition: ['product'],
              sort: ascending('salesPrice'),
              range: { preceding: 0, following: 0 }
            },
            count('quantity').as('samePriceCount')
          )
          .sort(ascending('date'))
          .select('product', 'salesPrice', 'samePriceCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', salesPrice: 12, samePriceCount: 1 },
        { product: 'phone', salesPrice: 30, samePriceCount: 1 },
        { product: 'tablet', salesPrice: 30, samePriceCount: 1 },
        { product: 'tablet', salesPrice: 60, samePriceCount: 2 },
        { product: 'tablet', salesPrice: 60, samePriceCount: 2 }
      );
    });

    it("includes tied peers with 'unbounded' preceding to 'current' following", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: ascending('salesPrice'),
              range: { preceding: 'unbounded', following: 'current' }
            },
            count('quantity').as('cumulativeCount')
          )
          .sort(ascending('date'))
          .select('salesPrice', 'cumulativeCount')
      );

      expectResults(
        snapshot,
        { salesPrice: 12, cumulativeCount: 1 },
        { salesPrice: 30, cumulativeCount: 3 },
        { salesPrice: 30, cumulativeCount: 3 },
        { salesPrice: 60, cumulativeCount: 5 },
        { salesPrice: 60, cumulativeCount: 5 }
      );
    });

    it("includes tied peers with 'unbounded' preceding to a zero offset", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: ascending('salesPrice'),
              range: { preceding: 'unbounded', following: 0 }
            },
            count('quantity').as('cumulativeCount')
          )
          .sort(ascending('date'))
          .select('salesPrice', 'cumulativeCount')
      );

      expectResults(
        snapshot,
        { salesPrice: 12, cumulativeCount: 1 },
        { salesPrice: 30, cumulativeCount: 3 },
        { salesPrice: 30, cumulativeCount: 3 },
        { salesPrice: 60, cumulativeCount: 5 },
        { salesPrice: 60, cumulativeCount: 5 }
      );
    });

    it("supports a string sort key when bounds are 'unbounded' and 'current'", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: ascending('product'),
              range: { preceding: 'unbounded', following: 'current' }
            },
            count('quantity').as('cumulativeCount')
          )
          .sort(ascending('date'))
          .select('product', 'cumulativeCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', cumulativeCount: 2 },
        { product: 'phone', cumulativeCount: 2 },
        { product: 'tablet', cumulativeCount: 5 },
        { product: 'tablet', cumulativeCount: 5 },
        { product: 'tablet', cumulativeCount: 5 }
      );
    });

    it("supports multiple sort orderings when bounds are 'unbounded' and 'current'", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: [ascending('product'), ascending('region')],
              range: { preceding: 'unbounded', following: 'current' }
            },
            count('quantity').as('cumulativeCount')
          )
          .sort(ascending('date'))
          .select('product', 'region', 'cumulativeCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', region: 'east', cumulativeCount: 1 },
        { product: 'phone', region: 'west', cumulativeCount: 2 },
        { product: 'tablet', region: 'east', cumulativeCount: 4 },
        { product: 'tablet', region: 'west', cumulativeCount: 5 },
        { product: 'tablet', region: 'east', cumulativeCount: 4 }
      );
    });

    it("supports 'unbounded' to 'unbounded'", async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              partition: ['product'],
              sort: ascending('salesPrice'),
              range: { preceding: 'unbounded', following: 'unbounded' }
            },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('product', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', windowCount: 2 },
        { product: 'phone', windowCount: 2 },
        { product: 'tablet', windowCount: 3 },
        { product: 'tablet', windowCount: 3 },
        { product: 'tablet', windowCount: 3 }
      );
    });

    it('applies the time unit to a range frame offset', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            {
              sort: ascending('date'),
              range: {
                preceding: 12,
                following: 'current',
                unit: 'hour'
              }
            },
            count('quantity').as('windowCount')
          )
          .sort(ascending('date'))
          .select('product', 'windowCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', windowCount: 1 },
        { product: 'phone', windowCount: 1 },
        { product: 'tablet', windowCount: 2 },
        { product: 'tablet', windowCount: 1 },
        { product: 'tablet', windowCount: 1 }
      );
    });
  });

  describe('accumulator level framing', () => {
    it('evaluates each accumulator over its own frame', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'], sort: ascending('date') },
            count('quantity')
              .over({
                documents: { preceding: 'unbounded', following: 'current' }
              })
              .as('runningCount'),
            count('quantity')
              .over({
                documents: { preceding: 'unbounded', following: 'unbounded' }
              })
              .as('partitionCount')
          )
          .sort(ascending('date'))
          .select('product', 'runningCount', 'partitionCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', runningCount: 1, partitionCount: 2 },
        { product: 'phone', runningCount: 2, partitionCount: 2 },
        { product: 'tablet', runningCount: 1, partitionCount: 3 },
        { product: 'tablet', runningCount: 2, partitionCount: 3 },
        { product: 'tablet', runningCount: 3, partitionCount: 3 }
      );
    });

    it('supports a range frame in over()', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'], sort: ascending('salesPrice') },
            count('quantity')
              .over({ range: { preceding: 0, following: 0 } })
              .as('samePriceCount')
          )
          .sort(ascending('date'))
          .select('product', 'salesPrice', 'samePriceCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', salesPrice: 12, samePriceCount: 1 },
        { product: 'phone', salesPrice: 30, samePriceCount: 1 },
        { product: 'tablet', salesPrice: 30, samePriceCount: 1 },
        { product: 'tablet', salesPrice: 60, samePriceCount: 2 },
        { product: 'tablet', salesPrice: 60, samePriceCount: 2 }
      );
    });
  });

  describe('output fields and composition', () => {
    it('supports multiple output fields in a single stage', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'] },
            count('quantity').as('productCount'),
            count('quantity').as('productCountCopy')
          )
          .sort(ascending('date'))
          .select('product', 'productCount', 'productCountCopy')
      );

      expectResults(
        snapshot,
        { product: 'phone', productCount: 2, productCountCopy: 2 },
        { product: 'phone', productCount: 2, productCountCopy: 2 },
        { product: 'tablet', productCount: 3, productCountCopy: 3 },
        { product: 'tablet', productCount: 3, productCountCopy: 3 },
        { product: 'tablet', productCount: 3, productCountCopy: 3 }
      );
    });

    it('supports nested output field paths', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'] },
            count('quantity').as('stats.productCount')
          )
          .sort(ascending('date'))
          .select('product', 'stats')
      );

      expectResults(
        snapshot,
        { product: 'phone', stats: { productCount: 2 } },
        { product: 'phone', stats: { productCount: 2 } },
        { product: 'tablet', stats: { productCount: 3 } },
        { product: 'tablet', stats: { productCount: 3 } },
        { product: 'tablet', stats: { productCount: 3 } }
      );
    });

    it('supports chaining multiple addWindowFields stages', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'] },
            count('quantity').as('productCount')
          )
          .addWindowFields(
            { partition: ['region'] },
            count('quantity').as('regionCount')
          )
          .sort(ascending('date'))
          .select('product', 'region', 'productCount', 'regionCount')
      );

      expectResults(
        snapshot,
        {
          product: 'phone',
          region: 'east',
          productCount: 2,
          regionCount: 3
        },
        {
          product: 'phone',
          region: 'west',
          productCount: 2,
          regionCount: 2
        },
        {
          product: 'tablet',
          region: 'east',
          productCount: 3,
          regionCount: 3
        },
        {
          product: 'tablet',
          region: 'west',
          productCount: 3,
          regionCount: 2
        },
        {
          product: 'tablet',
          region: 'east',
          productCount: 3,
          regionCount: 3
        }
      );
    });

    it('supports filtering on a window field in a later stage', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'] },
            count('quantity').as('productCount')
          )
          .where(field('productCount').greaterThan(2))
          .sort(ascending('date'))
          .select('product', 'productCount')
      );

      expectResults(
        snapshot,
        { product: 'tablet', productCount: 3 },
        { product: 'tablet', productCount: 3 },
        { product: 'tablet', productCount: 3 }
      );
    });

    it('supports sorting on a window field in a later stage', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { partition: ['product'] },
            count('quantity').as('productCount')
          )
          .sort(ascending('productCount'), ascending('date'))
          .select('product', 'productCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', productCount: 2 },
        { product: 'phone', productCount: 2 },
        { product: 'tablet', productCount: 3 },
        { product: 'tablet', productCount: 3 },
        { product: 'tablet', productCount: 3 }
      );
    });
  });

  describe('options overload', () => {
    it('supports the options object signature', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales.path)
          .addWindowFields({
            window: {
              partition: ['product'],
              sort: ascending('date'),
              documents: { preceding: 'unbounded', following: 'current' }
            },
            fields: [
              count('quantity').as('runningCount'),
              count('salesPrice').as('runningPriceCount')
            ]
          })
          .sort(ascending('date'))
          .select('product', 'runningCount', 'runningPriceCount')
      );

      expectResults(
        snapshot,
        { product: 'phone', runningCount: 1, runningPriceCount: 1 },
        { product: 'phone', runningCount: 2, runningPriceCount: 2 },
        { product: 'tablet', runningCount: 1, runningPriceCount: 1 },
        { product: 'tablet', runningCount: 2, runningPriceCount: 2 },
        { product: 'tablet', runningCount: 3, runningPriceCount: 3 }
      );
    });
  });

  describe('error handling', () => {
    it('rejects a range frame without a sort', async () => {
      await expect(
        execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              { range: { preceding: 'unbounded', following: 'current' } },
              count('quantity').as('windowCount')
            )
        )
      ).rejects.toThrow(/range/i);
    });

    it('rejects mixing stage level and accumulator level framing', async () => {
      await expect(
        execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('date'),
                documents: { preceding: 'unbounded', following: 'current' }
              },
              count('quantity')
                .over({
                  documents: { preceding: 'unbounded', following: 'unbounded' }
                })
                .as('windowCount')
            )
        )
      ).rejects.toThrow(FirebaseError);
    });

    it('evaluates accumulators without over() using the default frame when others use over()', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(productSales)
          .addWindowFields(
            { sort: ascending('date') },
            count('quantity')
              .over({ documents: { preceding: 0, following: 0 } })
              .as('framed'),
            count('quantity').as('unframed')
          )
          .sort(ascending('date'))
          .select('product', 'framed', 'unframed')
      );

      expectResults(
        snapshot,
        { product: 'phone', framed: 1, unframed: 1 },
        { product: 'phone', framed: 1, unframed: 2 },
        { product: 'tablet', framed: 1, unframed: 3 },
        { product: 'tablet', framed: 1, unframed: 4 },
        { product: 'tablet', framed: 1, unframed: 5 }
      );
    });
  });
});

comprehensiveDescribe(
  'Pipeline window functions (aggregators)',
  persistence => {
    addEqualityMatcher();

    let firestore: Firestore;
    let productSales: CollectionReference;

    let testDeferred: Deferred<void>;
    let withTestCollectionPromise: Promise<unknown>;

    beforeAll(async () => {
      const setupDeferred = new Deferred<void>();
      testDeferred = new Deferred<void>();
      withTestCollectionPromise = withTestCollection(
        persistence,
        windowTestDocs,
        async (col, db) => {
          productSales = col;
          firestore = db;
          setupDeferred.resolve();
          return testDeferred.promise;
        }
      );
      await setupDeferred.promise;
    });

    afterAll(async () => {
      testDeferred?.resolve();
      await withTestCollectionPromise;
    });

    describe('numeric aggregators over a partition', () => {
      it('computes sum, average, minimum and maximum', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              { partition: ['product'] },
              sum('salesPrice').as('total'),
              average('salesPrice').as('averagePrice'),
              minimum('salesPrice').as('minimumPrice'),
              maximum('salesPrice').as('maximumPrice')
            )
            .sort(ascending('date'))
            .select(
              'product',
              'total',
              'averagePrice',
              'minimumPrice',
              'maximumPrice'
            )
        );

        expectResults(
          snapshot,
          {
            product: 'phone',
            total: 42,
            averagePrice: 21,
            minimumPrice: 12,
            maximumPrice: 30
          },
          {
            product: 'phone',
            total: 42,
            averagePrice: 21,
            minimumPrice: 12,
            maximumPrice: 30
          },
          {
            product: 'tablet',
            total: 150,
            averagePrice: 50,
            minimumPrice: 30,
            maximumPrice: 60
          },
          {
            product: 'tablet',
            total: 150,
            averagePrice: 50,
            minimumPrice: 30,
            maximumPrice: 60
          },
          {
            product: 'tablet',
            total: 150,
            averagePrice: 50,
            minimumPrice: 30,
            maximumPrice: 60
          }
        );
      });

      // Un-skip once the backend supports countIf and countDistinct in addWindowFields.
      // eslint-disable-next-line no-restricted-properties
      it.skip('computes countIf', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              { partition: ['product'] },
              countIf(field('salesPrice').greaterThan(20)).as('expensiveCount')
            )
            .sort(ascending('date'))
            .select('product', 'expensiveCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', expensiveCount: 1 },
          { product: 'phone', expensiveCount: 1 },
          { product: 'tablet', expensiveCount: 3 },
          { product: 'tablet', expensiveCount: 3 },
          { product: 'tablet', expensiveCount: 3 }
        );
      });

      // Un-skip once the backend supports countIf and countDistinct in addWindowFields.
      // eslint-disable-next-line no-restricted-properties
      it.skip('computes countDistinct', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              { partition: ['product'] },
              countDistinct('salesPrice').as('distinctPriceCount')
            )
            .sort(ascending('date'))
            .select('product', 'distinctPriceCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', distinctPriceCount: 2 },
          { product: 'phone', distinctPriceCount: 2 },
          { product: 'tablet', distinctPriceCount: 2 },
          { product: 'tablet', distinctPriceCount: 2 },
          { product: 'tablet', distinctPriceCount: 2 }
        );
      });

      it('aggregates over a computed expression', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              { partition: ['product'] },
              sum(multiply(field('salesPrice'), field('quantity'))).as(
                'totalRevenue'
              )
            )
            .sort(ascending('date'))
            .select('product', 'totalRevenue')
        );

        expectResults(
          snapshot,
          { product: 'phone', totalRevenue: 72 },
          { product: 'phone', totalRevenue: 72 },
          { product: 'tablet', totalRevenue: 630 },
          { product: 'tablet', totalRevenue: 630 },
          { product: 'tablet', totalRevenue: 630 }
        );
      });
    });

    describe('ordered aggregators', () => {
      it('computes first and last over the whole partition', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                partition: ['product'],
                sort: ascending('date'),
                documents: { preceding: 'unbounded', following: 'unbounded' }
              },
              first('salesPrice').as('firstPrice'),
              last('salesPrice').as('lastPrice')
            )
            .sort(ascending('date'))
            .select('product', 'firstPrice', 'lastPrice')
        );

        expectResults(
          snapshot,
          { product: 'phone', firstPrice: 12, lastPrice: 30 },
          { product: 'phone', firstPrice: 12, lastPrice: 30 },
          { product: 'tablet', firstPrice: 30, lastPrice: 60 },
          { product: 'tablet', firstPrice: 30, lastPrice: 60 },
          { product: 'tablet', firstPrice: 30, lastPrice: 60 }
        );
      });

      it('computes arrayAgg and arrayAggDistinct', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                partition: ['product'],
                sort: ascending('date'),
                documents: { preceding: 'unbounded', following: 'unbounded' }
              },
              arrayAgg('salesPrice').as('allPrices'),
              arrayAggDistinct('salesPrice').as('distinctPrices')
            )
            .sort(ascending('date'))
            .select('product', 'allPrices', 'distinctPrices')
        );

        const results = snapshot.results.map(r => {
          const data = r.data();
          data['distinctPrices'].sort((a: number, b: number) => a - b);
          return data;
        });

        expect(results).to.deep.equal([
          {
            product: 'phone',
            allPrices: [12, 30],
            distinctPrices: [12, 30]
          },
          {
            product: 'phone',
            allPrices: [12, 30],
            distinctPrices: [12, 30]
          },
          {
            product: 'tablet',
            allPrices: [30, 60, 60],
            distinctPrices: [30, 60]
          },
          {
            product: 'tablet',
            allPrices: [30, 60, 60],
            distinctPrices: [30, 60]
          },
          {
            product: 'tablet',
            allPrices: [30, 60, 60],
            distinctPrices: [30, 60]
          }
        ]);
      });

      it('computes a running total', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('date'),
                documents: { preceding: 'unbounded', following: 'current' }
              },
              sum('salesPrice').as('runningTotal')
            )
            .sort(ascending('date'))
            .select('product', 'runningTotal')
        );

        expectResults(
          snapshot,
          { product: 'phone', runningTotal: 12 },
          { product: 'phone', runningTotal: 42 },
          { product: 'tablet', runningTotal: 72 },
          { product: 'tablet', runningTotal: 132 },
          { product: 'tablet', runningTotal: 192 }
        );
      });
    });

    describe('numeric documents offsets', () => {
      it('computes a centered moving average', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('date'),
                documents: { preceding: 1, following: 1 }
              },
              average('salesPrice').as('movingAverage'),
              countAll().as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'movingAverage', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', movingAverage: 21, windowCount: 2 },
          { product: 'phone', movingAverage: 24, windowCount: 3 },
          { product: 'tablet', movingAverage: 40, windowCount: 3 },
          { product: 'tablet', movingAverage: 50, windowCount: 3 },
          { product: 'tablet', movingAverage: 60, windowCount: 2 }
        );
      });

      it('computes a trailing sum', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('date'),
                documents: { preceding: 2, following: 0 }
              },
              sum('salesPrice').as('trailingTotal')
            )
            .sort(ascending('date'))
            .select('product', 'trailingTotal')
        );

        expectResults(
          snapshot,
          { product: 'phone', trailingTotal: 12 },
          { product: 'phone', trailingTotal: 42 },
          { product: 'tablet', trailingTotal: 72 },
          { product: 'tablet', trailingTotal: 120 },
          { product: 'tablet', trailingTotal: 150 }
        );
      });

      it('computes a look ahead average with a negative preceding bound', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                // Equivalent to "documents between 1 following and 2
                // following": the window is [index - preceding, index +
                // following].
                sort: ascending('date'),
                documents: { preceding: -1, following: 2 }
              },
              average('salesPrice').as('lookAheadAverage'),
              countAll().as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'lookAheadAverage', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', lookAheadAverage: 30, windowCount: 2 },
          { product: 'phone', lookAheadAverage: 45, windowCount: 2 },
          { product: 'tablet', lookAheadAverage: 60, windowCount: 2 },
          { product: 'tablet', lookAheadAverage: 60, windowCount: 1 },
          { product: 'tablet', lookAheadAverage: null, windowCount: 0 }
        );
      });

      it('computes a look behind average with a negative following bound', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                // Equivalent to "documents between 2 preceding and 1
                // preceding": the window is [index - preceding, index +
                // following].
                sort: ascending('date'),
                documents: { preceding: 2, following: -1 }
              },
              average('salesPrice').as('lookBehindAverage'),
              countAll().as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'lookBehindAverage', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', lookBehindAverage: null, windowCount: 0 },
          { product: 'phone', lookBehindAverage: 12, windowCount: 1 },
          { product: 'tablet', lookBehindAverage: 21, windowCount: 2 },
          { product: 'tablet', lookBehindAverage: 30, windowCount: 2 },
          { product: 'tablet', lookBehindAverage: 45, windowCount: 2 }
        );
      });

      it('computes a range look behind average with a negative following bound', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                // Equivalent to a range frame of [value - Infinity, value - 1],
                // including only documents with a strictly lower salesPrice.
                sort: ascending('salesPrice'),
                range: { preceding: 'unbounded', following: -1 }
              },
              average('salesPrice').as('lookBehindAverage'),
              countAll().as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'lookBehindAverage', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', lookBehindAverage: null, windowCount: 0 },
          { product: 'phone', lookBehindAverage: 12, windowCount: 1 },
          { product: 'tablet', lookBehindAverage: 12, windowCount: 1 },
          { product: 'tablet', lookBehindAverage: 24, windowCount: 3 },
          { product: 'tablet', lookBehindAverage: 24, windowCount: 3 }
        );
      });

      it('computes a range look ahead average with a negative preceding bound', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                // Equivalent to a range frame of [value + 1, value + Infinity],
                // including only documents with a strictly higher salesPrice.
                sort: ascending('salesPrice'),
                range: { preceding: -1, following: 'unbounded' }
              },
              average('salesPrice').as('lookAheadAverage'),
              countAll().as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'lookAheadAverage', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', lookAheadAverage: 45, windowCount: 4 },
          { product: 'phone', lookAheadAverage: 60, windowCount: 2 },
          { product: 'tablet', lookAheadAverage: 60, windowCount: 2 },
          { product: 'tablet', lookAheadAverage: null, windowCount: 0 },
          { product: 'tablet', lookAheadAverage: null, windowCount: 0 }
        );
      });
    });

    describe('numeric and time range offsets', () => {
      it('computes a value based range window', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('salesPrice'),
                range: { preceding: 20, following: 0 }
              },
              sum('salesPrice').as('nearbyTotal')
            )
            .sort(ascending('date'))
            .select('salesPrice', 'nearbyTotal')
        );

        expectResults(
          snapshot,
          { salesPrice: 12, nearbyTotal: 12 },
          { salesPrice: 30, nearbyTotal: 72 },
          { salesPrice: 30, nearbyTotal: 72 },
          { salesPrice: 60, nearbyTotal: 120 },
          { salesPrice: 60, nearbyTotal: 120 }
        );
      });

      it('computes a value based range window with fractional offsets', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('salesPrice'),
                range: { preceding: 17.5, following: 0.5 }
              },
              sum('salesPrice').as('nearbyTotal')
            )
            .sort(ascending('date'))
            .select('salesPrice', 'nearbyTotal')
        );

        expectResults(
          snapshot,
          { salesPrice: 12, nearbyTotal: 12 },
          { salesPrice: 30, nearbyTotal: 60 },
          { salesPrice: 30, nearbyTotal: 60 },
          { salesPrice: 60, nearbyTotal: 120 },
          { salesPrice: 60, nearbyTotal: 120 }
        );
      });

      it('computes a trailing 3 day total', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('date'),
                range: { preceding: 3, following: 'current', unit: 'day' }
              },
              sum('salesPrice').as('threeDayTotal')
            )
            .sort(ascending('date'))
            .select('product', 'threeDayTotal')
        );

        expectResults(
          snapshot,
          { product: 'phone', threeDayTotal: 12 },
          { product: 'phone', threeDayTotal: 42 },
          { product: 'tablet', threeDayTotal: 72 },
          { product: 'tablet', threeDayTotal: 132 },
          { product: 'tablet', threeDayTotal: 60 }
        );
      });
    });

    describe('countAll', () => {
      it('counts every document in the window', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              { partition: ['product'] },
              countAll().as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', windowCount: 2 },
          { product: 'phone', windowCount: 2 },
          { product: 'tablet', windowCount: 3 },
          { product: 'tablet', windowCount: 3 },
          { product: 'tablet', windowCount: 3 }
        );
      });
    });

    describe('documents framing with numeric offsets', () => {
      it('supports zero preceding and zero following', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('date'),
                documents: { preceding: 0, following: 0 }
              },
              count('quantity').as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', windowCount: 1 },
          { product: 'phone', windowCount: 1 },
          { product: 'tablet', windowCount: 1 },
          { product: 'tablet', windowCount: 1 },
          { product: 'tablet', windowCount: 1 }
        );
      });

      it("supports zero preceding to 'unbounded' following", async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(productSales)
            .addWindowFields(
              {
                sort: ascending('date'),
                documents: { preceding: 0, following: 'unbounded' }
              },
              count('quantity').as('windowCount')
            )
            .sort(ascending('date'))
            .select('product', 'windowCount')
        );

        expectResults(
          snapshot,
          { product: 'phone', windowCount: 5 },
          { product: 'phone', windowCount: 4 },
          { product: 'tablet', windowCount: 3 },
          { product: 'tablet', windowCount: 2 },
          { product: 'tablet', windowCount: 1 }
        );
      });
    });
  }
);

// Un-skip once the backend supports `rank()`.
apiDescribe.skip('Pipeline window functions (ranking)', persistence => {
  addEqualityMatcher();

  let firestore: Firestore;
  let productSales: CollectionReference;

  let testDeferred: Deferred<void>;
  let withTestCollectionPromise: Promise<unknown>;

  beforeAll(async () => {
    const setupDeferred = new Deferred<void>();
    testDeferred = new Deferred<void>();
    withTestCollectionPromise = withTestCollection(
      persistence,
      windowTestDocs,
      async (col, db) => {
        productSales = col;
        firestore = db;
        setupDeferred.resolve();
        return testDeferred.promise;
      }
    );
    await setupDeferred.promise;
  });

  afterAll(async () => {
    testDeferred?.resolve();
    await withTestCollectionPromise;
  });

  it('computes rank', async () => {
    const snapshot = await execute(
      firestore
        .pipeline()
        .collection(productSales)
        .addWindowFields(
          { sort: [ascending('salesPrice'), ascending('date')] },
          rank().as('priceRank')
        )
        .sort(ascending('date'))
        .select('salesPrice', 'priceRank')
    );

    expectResults(
      snapshot,
      {
        salesPrice: 12,
        priceRank: 1
      },
      {
        salesPrice: 30,
        priceRank: 2
      },
      {
        salesPrice: 30,
        priceRank: 2
      },
      {
        salesPrice: 60,
        priceRank: 4
      },
      {
        salesPrice: 60,
        priceRank: 4
      }
    );
  });
});
