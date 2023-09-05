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

import { LogLevel, setLogLevel } from '@firebase/logger';

import { AggregateImpl } from '../../../src/core/aggregate';
import {
  AggregateQuery,
  newQueryForCollectionGroup,
  newQueryForPath,
  Query,
  queryWithAddedFilter
} from '../../../src/core/query';
import { Document } from '../../../src/model/document';
import { doc, filter, key, path, query } from '../../util/helpers';

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
  const countAggregate = new AggregateImpl('count', 'count');
  return new AggregateQuery(base, [countAggregate]);
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

  specTest('Raise expected count with remote event', [], () => {
    const query = newQueryForPath(path('coll'));
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 2001)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .watchAcksCount(countFromQuery(query), 12)
      .watchSendsCount(12, 80)
      .watchCurrentsCount(12, 'resume-token')
      .watchSnapshots(10_000)
      .expectCountEvents(countFromQuery(query), {
        count: 80
      });
  });

  specTest(
    'Raise expected count with remote event and matching base documents',
    [],
    () => {
      const query = queryWithAddedFilter(
        newQueryForPath(path('coll')),
        filter('val', '>=', 2)
      );
      const docs = [
        doc('coll/1', 1000, { val: 1 }, 800),
        doc('coll/2', 1000, { val: 2 }, 800),
        doc('coll/3', 1000, { val: 3 }, 800),
        doc('coll/4', 1000, { val: 4 }, 800),
        doc('coll/5', 1000, { val: 5 }, 800)
      ];
      return specWithCachedDocs(...docs)
        .setCountValue(/*for query*/ 12, 10_000, 2001)
        .userListensCount(countFromQuery(query))
        .expectCountEvents(countFromQuery(query), {
          count: 10_000,
          fromCache: true
        })
        .userPatches('coll/3', { val: 30 })
        .expectCountEvents(countFromQuery(query), {
          count: 10_000,
          fromCache: true
        })
        .watchAcksCount(countFromQuery(query), 12)
        .watchSendsCount(12, 80)
        .watchCurrentsCount(12, 'resume-token')
        .watchSnapshots(10_000)
        .expectCountEvents(countFromQuery(query), {
          count: 80
        });
    }
  );

  specTest(
    'Raise expected count with remote event and mis-matching base documents',
    [],
    () => {
      const query = queryWithAddedFilter(
        newQueryForPath(path('coll')),
        filter('val', '>=', 2)
      );
      const docs = [
        doc('coll/1', 1000, { val: 1 }, 800),
        doc('coll/2', 1000, { val: 2 }, 800),
        doc('coll/3', 1000, { val: 3 }, 800),
        doc('coll/4', 1000, { val: 4 }, 800),
        doc('coll/5', 1000, { val: 5 }, 800)
      ];
      return specWithCachedDocs(...docs)
        .userPatches('coll/1', { val: 100 })
        .setCountValue(/*for query*/ 12, 10_000, 2001)
        .userListensCount(countFromQuery(query))
        .expectCountEvents(countFromQuery(query), {
          count: 10_001,
          fromCache: true
        })
        .watchAcksCount(countFromQuery(query), 12)
        .watchSendsCount(12, 80)
        .watchCurrentsCount(12, 'resume-token')
        .watchSnapshots(10_000)
        .expectCountEvents(countFromQuery(query), {
          count: 81
        });
    }
  );

  specTest(
    'Raise expected count with remote event and document changes',
    [],
    () => {
      const query = queryWithAddedFilter(
        newQueryForPath(path('coll')),
        filter('val', '>=', 2)
      );

      const collQuery = queryWithAddedFilter(
        newQueryForPath(path('coll')),
        filter('val', '<', 5)
      );
      const docs = [
        doc('coll/1', 1000, { val: 1 }, 800),
        doc('coll/2', 1000, { val: 2 }, 800),
        doc('coll/3', 1000, { val: 3 }, 800),
        doc('coll/4', 1000, { val: 4 }, 800),
        doc('coll/5', 1000, { val: 5 }, 800)
      ];
      const doc6 = doc('coll/6', 4000, { val: 3 }, 3000);
      return specWithCachedDocs(...docs)
        .setCountValue(/*for query*/ 12, 10_000, 2001)
        .userListensCount(countFromQuery(query))
        .expectCountEvents(countFromQuery(query), {
          count: 10_000,
          fromCache: true
        })
        .userListens(collQuery)
        .expectEvents(collQuery, { added: docs.slice(0, 4), fromCache: true })
        .watchAcksFull(collQuery, 5000, doc6)
        .expectEvents(collQuery, { added: [doc6], fromCache: true })
        .expectCountEvents(countFromQuery(query), {
          count: 10_001,
          fromCache: true
        })
        .expectLimboDocs(
          key('coll/1'),
          key('coll/2'),
          key('coll/3'),
          key('coll/4')
        )
        .watchAcksCount(countFromQuery(query), 12)
        .watchSendsCount(12, 80)
        .watchCurrentsCount(12, 'resume-token')
        .watchSnapshots(10_000)
        .expectCountEvents(countFromQuery(query), {
          count: 80
        });
    }
  );

  specTest('With local muation case 2/3/4', [], () => {
    const query = queryWithAddedFilter(
      newQueryForPath(path('coll')),
      filter('val', '>', 2)
    );
    const docs = [
      doc('coll/1', 450, { val: 1 }, 400),
      doc('coll/2', 450, { val: 2 }, 400),
      doc('coll/3', 450, { val: 3 }, 400),
      doc('coll/4', 550, { val: 4 }, 400),
      doc('coll/5', 1000, { val: 5 }, 400)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 500)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userPatches('coll/2', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .userPatches('coll/3', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .userPatches('coll/4', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .userPatches('coll/5', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .watchAcksCount(countFromQuery(query), 12)
      .watchSendsCount(12, 80)
      .watchCurrentsCount(12, 'resume-token')
      .watchSnapshots(10_000)
      .expectCountEvents(countFromQuery(query), {
        count: 81
      });
  });

  specTest('With local mutation case 1', [], () => {
    const query = queryWithAddedFilter(
      newQueryForPath(path('coll')),
      filter('val', '>', 2)
    );
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 200)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_003,
        fromCache: true
      })
      .userPatches('coll/2', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_004,
        fromCache: true
      })
      .userPatches('coll/3', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_004,
        fromCache: true
      })
      .watchAcksCount(countFromQuery(query), 12)
      .watchSendsCount(12, 80)
      .watchCurrentsCount(12, 'resume-token')
      .watchSnapshots(10_000)
      .expectCountEvents(countFromQuery(query), {
        count: 81
      });
  });

  specTest('With local mutation case 1 and mutation ack', [], () => {
    const query = queryWithAddedFilter(
      newQueryForPath(path('coll')),
      filter('val', '>', 2)
    );
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 200)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_003,
        fromCache: true
      })
      .userPatches('coll/2', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_004,
        fromCache: true
      })
      .writeAcks('coll/2', 1200)
      .expectCountEvents(countFromQuery(query), {
        count: 10_004
      });
  });

  specTest('With local mutation case 2/3/4 with mutation ack', [], () => {
    const query = queryWithAddedFilter(
      newQueryForPath(path('coll')),
      filter('val', '>', 2)
    );
    const docs = [
      doc('coll/1', 450, { val: 1 }, 400),
      doc('coll/2', 450, { val: 2 }, 400),
      doc('coll/3', 450, { val: 3 }, 400),
      doc('coll/4', 550, { val: 4 }, 400),
      doc('coll/5', 1000, { val: 5 }, 400)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 500)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userPatches('coll/2', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .userPatches('coll/3', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .userPatches('coll/4', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .userPatches('coll/5', { val: 10 })
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .writeAcks('coll/2', 1100)
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .writeAcks('coll/3', 1100)
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .writeAcks('coll/4', 1200)
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      })
      .writeAcks('coll/5', 1300)
      .expectCountEvents(countFromQuery(query), {
        count: 10_001,
        fromCache: true
      });
  });

  specTest('Case 5 with query stays active', [], () => {
    setLogLevel(LogLevel.DEBUG);
    const query = queryWithAddedFilter(
      newQueryForPath(path('coll')),
      filter('val', '>=', 2)
    );
    const docs = [
      doc('coll/1', 1000, { val: 1 }, 800),
      doc('coll/2', 1000, { val: 2 }, 800),
      doc('coll/3', 1000, { val: 3 }, 800),
      doc('coll/4', 1000, { val: 4 }, 800),
      doc('coll/5', 1000, { val: 5 }, 800)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 2001)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .userPatches('coll/3', { val: 0 })
      .expectCountEvents(countFromQuery(query), {
        count: 9_999,
        fromCache: true
      })
      .watchAcksCount(countFromQuery(query), 12)
      .watchSendsCount(12, 80)
      .watchCurrentsCount(12, 'resume-token')
      .watchSnapshots(10_000)
      .expectCountEvents(countFromQuery(query), {
        count: 80
      });
  });

  specTest('Case 5 with query goes inactive', [], () => {
    setLogLevel(LogLevel.DEBUG);
    const query = queryWithAddedFilter(
      newQueryForPath(path('coll')),
      filter('val', '>', 2)
    );
    const docs = [
      doc('coll/1', 450, { val: 1 }, 400),
      doc('coll/2', 450, { val: 2 }, 400),
      doc('coll/3', 450, { val: 3 }, 400),
      doc('coll/4', 550, { val: 4 }, 400),
      doc('coll/5', 1000, { val: 5 }, 400)
    ];
    return specWithCachedDocs(...docs)
      .setCountValue(/*for query*/ 12, 10_000, 500)
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 10_000,
        fromCache: true
      })
      .watchAcksCount(countFromQuery(query), 12)
      .watchSendsCount(12, 80)
      .watchCurrentsCount(12, 'resume-token')
      .watchSnapshots(10_000)
      .expectCountEvents(countFromQuery(query), {
        count: 80
      })
      .userUnlistensCount(12, countFromQuery(query))
      .userPatches('coll/3', { val: 0 })
      .userListensCount(countFromQuery(query))
      .expectCountEvents(countFromQuery(query), {
        count: 79,
        fromCache: true
      })
      .watchAcksCount(countFromQuery(query), 12)
      .watchSendsCount(12, 78)
      .watchCurrentsCount(12, 'resume-token-1')
      .watchSnapshots(11_000)
      .expectCountEvents(countFromQuery(query), {
        count: 78
      })
      .writeAcks('coll/3', 10_000)
      .expectCountEvents(countFromQuery(query), {
        count: 78
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
