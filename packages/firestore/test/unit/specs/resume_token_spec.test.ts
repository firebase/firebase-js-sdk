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
import { Code } from '../../../src/util/error';
import { doc, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Resume tokens:', [], () => {
  specTest('Resume tokens are sent after watch stream restarts', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    return spec()
      .userListens(query)
      .watchAcks(query)
      .watchSends({ affects: [query] }, doc1)
      .watchCurrents(query, 'custom-query-resume-token')
      .watchSnapshots(1000)
      .expectEvents(query, { added: [doc1] })
      .watchStreamCloses(Code.UNAVAILABLE)
      .expectActiveTargets({ query, resumeToken: 'custom-query-resume-token' });
  });

  specTest('Resume tokens are used across new listens', [], () => {
    const query = Query.atPath(path('collection'));
    const doc1 = doc('collection/a', 1000, { key: 'a' });
    return spec()
      .withGCEnabled(false)
      .userListens(query)
      .watchAcks(query)
      .watchSends({ affects: [query] }, doc1)
      .watchCurrents(query, 'custom-query-resume-token')
      .watchSnapshots(1000)
      .expectEvents(query, { added: [doc1] })
      .userUnlistens(query)
      .userListens(query, 'custom-query-resume-token')
      .expectEvents(query, { fromCache: true, added: [doc1] })
      .watchAcks(query)
      .watchSnapshots(1001);
  });
});
