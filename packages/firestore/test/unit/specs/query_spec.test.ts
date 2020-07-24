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
  newQueryForCollectionGroup,
  newQueryForPath,
  queryWithAddedFilter
} from '../../../src/core/query';
import { doc, filter, query } from '../../util/helpers';

import { Document } from '../../../src/model/document';
import { describeSpec, specTest } from './describe_spec';
import { spec, SpecBuilder } from './spec_builder';

// Helper to seed the cache with the specified docs by listening to each one.
function specWithCachedDocs(...docs: Document[]): SpecBuilder {
  let builder = spec();
  for (const doc of docs) {
    const query1 = newQueryForPath(doc.key.path);
    builder = builder
      .userListens(query1)
      .watchAcksFull(query1, 1000, doc)
      .expectEvents(query1, { added: [doc] });
  }
  return builder;
}

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
    const toWrite1 = doc('cg/2', 0, { val: 2 }, { hasLocalMutations: true });
    const toWrite2 = doc(
      'not-cg/nope/cg/3',
      0,
      { val: 1 },
      { hasLocalMutations: true }
    );
    const toWrite3 = doc(
      'not-cg2/nope',
      0,
      { val: 1 },
      { hasLocalMutations: true }
    );

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
      const docAv2Local = doc(
        'collection/a',
        1000,
        { match: true },
        { hasLocalMutations: true }
      );

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
