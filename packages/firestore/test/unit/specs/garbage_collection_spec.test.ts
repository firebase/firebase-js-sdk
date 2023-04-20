/**
 * @license
 * Copyright 2023 Google LLC
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

import { doc, filter, query } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

describeSpec('Garbage Collection:', [], () => {
  specTest(
    'Contents of query are cleared when listen is removed.',
    ['eager-gc'],
    'Explicitly tests eager GC behavior',
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          // should get no events.
          .userListens(query1)
      );
    }
  );

  specTest('Contents of query are kept after listen is removed.', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { key: 'a' });
    return spec()
      .ensureManualLruGC()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .userUnlistens(query1)
      .userListens(query1)
      .expectListen(query1, { resumeToken: 'resume-token-1000' })
      .expectEvents(query1, { added: [docA], fromCache: true });
  });

  specTest(
    'Contents of query are kept after listen is removed, and GC threshold is not reached',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      return spec()
        .ensureManualLruGC()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .userUnlistens(query1)
        .triggerLruGC(1000_000_000)
        .userListens(query1)
        .expectListen(query1, { resumeToken: 'resume-token-1000' })
        .expectEvents(query1, { added: [docA], fromCache: true });
    }
  );

  specTest(
    'Contents of query are removed after listen is removed, and GC threshold is reached',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { key: 'a' });
      return (
        spec()
          .ensureManualLruGC()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userUnlistens(query1)
          .triggerLruGC(1)
          .removeExpectedTargetMapping(query1)
          // should get no events.
          .userListens(query1)
      );
    }
  );

  specTest(
    'Contents of active query are kept while inactive results are removed after GC',
    [],
    () => {
      const queryFull = query('collection');
      const queryA = query('collection', filter('key', '==', 'a'));
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docB = doc('collection/b', 1000, { key: 'b' });
      const docC = doc('collection/c', 1000, { key: 'c' });
      const docCMutated = doc('collection/c', 1000, {
        key: 'c',
        extra: 'extra'
      }).setHasLocalMutations();
      const docD = doc('collection/d', 1000, { key: 'd' });
      return (
        spec()
          .ensureManualLruGC()
          .userListens(queryFull)
          .watchAcksFull(queryFull, 1000, docA, docB, docC, docD)
          .expectEvents(queryFull, { added: [docA, docB, docC, docD] })
          .userUnlistens(queryFull)
          .userListens(queryA)
          .expectEvents(queryA, { added: [docA], fromCache: true })
          .watchAcksFull(queryA, 1500, docA)
          .expectEvents(queryA, { fromCache: false })
          .userSets('collection/c', { key: 'c', extra: 'extra' })
          .triggerLruGC(1)
          .removeExpectedTargetMapping(queryFull)
          .userUnlistens(queryA)
          // should get no events.
          .userListens(queryFull)
          .expectEvents(queryFull, {
            added: [docA, docCMutated],
            hasPendingWrites: true,
            fromCache: true
          })
      );
    }
  );
});
