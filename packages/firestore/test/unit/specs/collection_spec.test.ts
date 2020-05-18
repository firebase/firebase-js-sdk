/**
 * @license
 * Copyright 2017 Google LLC
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
import { doc, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Collections:', [], () => {
  specTest('Events are raised after watch ack', [], () => {
    const query1 = Query.atPath(path('collection'));
    const doc1 = doc('collection/key', 1000, { foo: 'bar' });
    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1001, doc1)
      .expectEvents(query1, {
        added: [doc1]
      });
  });

  specTest('Events are raised for local sets before watch ack', [], () => {
    const query1 = Query.atPath(path('collection'));
    const doc1 = doc(
      'collection/key',
      0,
      { foo: 'bar' },
      { hasLocalMutations: true }
    );
    return spec()
      .userListens(query1)
      .userSets('collection/key', { foo: 'bar' })
      .expectEvents(query1, {
        hasPendingWrites: true,
        fromCache: true,
        added: [doc1]
      });
  });
});
