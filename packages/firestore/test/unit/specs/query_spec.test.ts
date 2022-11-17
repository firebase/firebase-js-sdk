/**
 * @license
 * Copyright 2019 Google LLC
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

import {
  AggregateQuery,
  newQueryForCollectionGroup,
  newQueryForPath,
  Query,
  queryWithAddedFilter
} from '../../../src/core/query';
import { Document } from '../../../src/model/document';
import { doc, filter, path, query, version } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec, SpecBuilder } from './spec_builder';

// Helper to seed the cache with the specified docs by listening to each one.
function specWithCachedDocs(...docs: Document[]): SpecBuilder {
  let builder = spec();
  for (const doc of docs) {
    const query1 = newQueryForPath(doc.key.path);
    builder = builder
      .userListens(query1)
      .watchAcksFull(query1, 2000, doc)
      .expectEvents(query1, { added: [doc] })
      .userUnlistens(query1);
  }
  return builder;
}

function countFromQuery(base: Query): AggregateQuery {
  return new AggregateQuery(base);
}

describeSpec('Count Queries:', ['exclusive', 'durable-persistence'], () => {
  specTest('Raise expected count', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 1000),
      doc('coll/2', 1000, { val: 2 }, 1000),
      doc('coll/3', 1000, { val: 3 }, 1000),
      doc('coll/4', 1000, { val: 4 }, 1000),
      doc('coll/5', 1000, { val: 5 }, 1000)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 1000)
      .setCountValue(/*for queryWithFilter*/ 14, 9998, 1000)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 9998,
        fromCache: true
      });
  });

  // Below fails because it is currently unable to simulate createTime missing in
  // spec tests.
  // specTest('Simulate missing creatTime', [], () => {
  //   const query = newQueryForPath(path('coll'));
  //   const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
  //   const docs = [
  //     doc('coll/1', 1000, { val: 1 }),
  //     doc('coll/2', 1000, { val: 2 }),
  //     doc('coll/3', 1000, { val: 3 }),
  //     doc('coll/4', 1000, { val: 4 }),
  //     doc('coll/5', 1000, { val: 5 })
  //   ];
  //   return (
  //     specWithCachedDocs(...docs)
  //       .setCountValue(/*for query*/ 12, 10_000, 500)
  //       /*.setCountValue(for queryWithFilter 14, 0, 0)*/
  //       .userListensCount(countFromQuery(query))
  //       .expectCountEvents(countFromQuery(query), {
  //         count: 10_000,
  //         fromCache: true
  //       })
  //       .userListensCount(countFromQuery(queryWithFilter))
  //       .expectCountEvents(countFromQuery(queryWithFilter), {
  //         count: 2,
  //         fromCache: true
  //       })
  //   );
  // });

  specTest('Raise expected count case 1', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return (
      specWithCachedDocs(...docs)
        .setCountValue(/*for query*/ 12, 10_000, 500)
        /*.setCountValue(for queryWithFilter 14, 0, 0)*/
        .userListensCount(countFromQuery(query))
        .expectCountEvents(countFromQuery(query), {
          count: 10_005,
          fromCache: true
        })
        .userListensCount(countFromQuery(queryWithFilter))
        .expectCountEvents(countFromQuery(queryWithFilter), {
          count: 4,
          fromCache: true
        })
    );
  });

  specTest('Raise expected count case 1 mutations', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 500)
      .setCountValue(/*for queryWithFilter*/ 14, 9_999, 450)
      .userSets('coll/1', { val: 1000 })
      .userPatches('coll/5', { val: 6 })
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_005,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 10_004,
        fromCache: true
      });
  });

  specTest('Raise expected count case 2', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 900)
      .setCountValue(/*for queryWithFilter*/ 14, 9_999, 999)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 9_999,
        fromCache: true
      });
  });

  specTest('Raise expected count case 2 mutations', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 900)
      .setCountValue(/*for queryWithFilter*/ 14, 9_999, 999)
      .userSets('coll/1', { val: 1000 })
      .userPatches('coll/5', { val: 6 })
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 10_000,
        fromCache: true
      });
  });

  specTest('Raise expected count case 3', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 1001)
      .setCountValue(/*for queryWithFilter*/ 14, 9_000, 1999)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 9_000,
        fromCache: true
      });
  });

  specTest('Raise expected count case 3 mutations', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 1001)
      .setCountValue(/*for queryWithFilter*/ 14, 9_000, 1999)
      .userSets('coll/1', { val: 1000 })
      .userPatches('coll/5', { val: 6 })
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 9_001,
        fromCache: true
      });
  });

  specTest('Raise expected count case 4', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 2001)
      .setCountValue(/*for queryWithFilter*/ 14, 8000, 9999)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 8_000,
        fromCache: true
      });
  });

  specTest('Raise expected count case 4 mutations', [], () => {
    const query = newQueryForPath(path('coll'));
    const queryWithFilter = queryWithAddedFilter(query, filter('val', '>=', 2));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 2001)
      .setCountValue(/*for queryWithFilter*/ 14, 8000, 9999)
      .userSets('coll/1', { val: 1000 })
      .userPatches('coll/5', { val: 6 })
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userListensCount(countFromQuery(queryWithFilter))
      .expectCountEvents(countFromQuery(queryWithFilter), {
        count: 8_001,
        fromCache: true
      });
  });
});

describeSpec('Queries:', [], () => {
  specTest('Collection Group query', [], () => {
    const cgQuery = newQueryForCollectionGroup('cg');
    const cgQueryWithFilter = queryWithAddedFilter(
      cgQuery,
      filter('val', '==', 1)
    );
    const docs = [
      doc('cg/1', 1000, { val: 1 }),
      doc('cg/2', 1000, { val: 2 }),
      doc('not-cg/nope/cg/3', 1000, { val: 1 }),
      doc('not-cg/nope', 1000, { val: 1 }),
      doc('cg/1/not-cg/nope', 1000, { val: 1 })
    ];
    return specWithCachedDocs(...docs)
      .userListens(cgQuery)
      .expectEvents(cgQuery, {
        added: docs.slice(0, 3), // first 3 docs match,
        fromCache: true
      })
      .userListens(cgQueryWithFilter)
      .expectEvents(cgQueryWithFilter, {
        added: [docs[0], docs[2]],
        fromCache: true
      });
  });

  specTest('Collection Group query with mutations', [], () => {
    const cgQuery = newQueryForCollectionGroup('cg');
    const cgQueryWithFilter = queryWithAddedFilter(
      cgQuery,
      filter('val', '==', 1)
    );
    const cachedDocs = [
      doc('cg/1', 1000, { val: 1 }),
      doc('not-cg/nope', 1000, { val: 1 })
    ];
    const toWrite1 = doc('cg/2', 0, { val: 2 }).setHasLocalMutations();
    const toWrite2 = doc('not-cg/nope/cg/3', 0, {
      val: 1
    }).setHasLocalMutations();
    const toWrite3 = doc('not-cg2/nope', 0, { val: 1 }).setHasLocalMutations();

    return specWithCachedDocs(...cachedDocs)
      .userSets(toWrite1.key.toString(), { val: 2 })
      .userSets(toWrite2.key.toString(), { val: 1 })
      .userSets(toWrite3.key.toString(), { val: 1 })
      .userListens(cgQuery)
      .expectEvents(cgQuery, {
        added: [cachedDocs[0], toWrite1, toWrite2],
        fromCache: true,
        hasPendingWrites: true
      })
      .userListens(cgQueryWithFilter)
      .expectEvents(cgQueryWithFilter, {
        added: [cachedDocs[0], toWrite2],
        fromCache: true,
        hasPendingWrites: true
      });
  });

  specTest(
    'Latency-compensated updates are included in query results',
    [],
    () => {
      const fullQuery = query('collection');
      const filteredQuery = queryWithAddedFilter(
        fullQuery,
        filter('match', '==', true)
      );
      const docA = doc('collection/a', 1000, { match: false });
      const docAv2Local = doc('collection/a', 1000, {
        match: true
      }).setHasLocalMutations();

      return (
        spec()
          .userListens(fullQuery)
          .watchAcksFull(fullQuery, 1000, docA)
          .expectEvents(fullQuery, { added: [docA] })

          // patch docA so that it will now match the filtered query.
          .userPatches('collection/a', { match: true })
          .expectEvents(fullQuery, {
            modified: [docAv2Local],
            hasPendingWrites: true
          })
          // Make sure docA shows up in filtered query.
          .userListens(filteredQuery)
          .expectEvents(filteredQuery, {
            added: [docAv2Local],
            fromCache: true,
            hasPendingWrites: true
          })
      );
    }
  );
});
