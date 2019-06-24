/**
 * @license
 * Copyright 2017 Google Inc.
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

import { Query } from '../../../src/core/query';
import { doc, orderBy, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('OrderBy:', [], () => {
  specTest('orderBy applies filtering based on local state', [], () => {
    const query1 = Query.atPath(path('collection')).addOrderBy(
      orderBy('sort', 'asc')
    );
    const doc1 = doc(
      'collection/a',
      0,
      { key: 'a', sort: 1 },
      { hasLocalMutations: true }
    );
    const doc2a = doc('collection/b', 1001, { key: 'b' });
    const doc2b = doc(
      'collection/b',
      1001,
      { key: 'b', sort: 2 },
      { hasLocalMutations: true }
    );
    return (
      spec()
        // user set should show up in results
        .userSets('collection/a', { key: 'a', sort: 1 })
        // patch should show up in results
        .userPatches('collection/b', { sort: 2 })
        // should not show up, missing sort field
        .userSets('collection/c', { key: 'b' })
        .userListens(query1)
        .expectEvents(query1, {
          fromCache: true,
          hasPendingWrites: true,
          added: [doc1]
        })
        .watchAcksFull(query1, 2000, doc2a)
        .expectEvents(query1, { hasPendingWrites: true, added: [doc2b] })
    );
  });

  specTest('orderBy applies to existing documents', [], () => {
    const query = Query.atPath(path('collection')).addOrderBy(
      orderBy('sort', 'asc')
    );
    const docA = doc('collection/a', 1000, { key: 'a', sort: 2 });
    const docB = doc('collection/b', 1001, { key: 'b', sort: 1 });

    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchAcksFull(query, 1002, docA, docB)
      .expectEvents(query, { added: [docB, docA] })
      .userUnlistens(query)
      .watchRemoves(query)
      .userListens(query, 'resume-token-1002')
      .expectEvents(query, { added: [docB, docA], fromCache: true })
      .watchAcksFull(query, 1002)
      .expectEvents(query, {});
  });
});
