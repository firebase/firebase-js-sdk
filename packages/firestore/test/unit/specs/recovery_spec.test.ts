/**
 * @license
 * Copyright 2020 Google LLC
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

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec(
  'Persistence Recovery',
  ['durable-persistence', 'no-ios', 'no-android'],
  () => {
    specTest('Recovers from failed write', [], () => {
      return spec()
        .userSets('collection/key1', { foo: 'a' })
        .expectNumOutstandingWrites(1)
        .userSets('collection/key2', { bar: 'b' })
        .failDatabaseTransaction({ rejectedDocs: ['collection/key2'] })
        .expectNumOutstandingWrites(1)
        .userSets('collection/key3', { baz: 'c' })
        .expectNumOutstandingWrites(2)
        .writeAcks('collection/key1', 1)
        .writeAcks('collection/key3', 2)
        .expectNumOutstandingWrites(0);
    });
  }
);
