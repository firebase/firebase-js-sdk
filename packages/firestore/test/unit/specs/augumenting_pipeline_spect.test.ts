/**
 * @license
 * Copyright 2025 Google LLC
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

import { deletedDoc, doc, filter, orderBy, query } from '../../util/helpers';

import { Field } from '../../../src';
import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';
import { newTestFirestore } from '../../util/api_helpers';
import { toCorePipeline } from '../../util/pipelines';

describeSpec(
  'Augmenting pipelines:',
  ['explicit-pipeline', 'exclusive'],
  () => {
    const db = newTestFirestore();
    specTest(
      'Contents of pipeline are cleared when listen is removed.',
      ['eager-gc'],
      () => {
        const query1 = toCorePipeline(
          db.pipeline().collection('collection').select('key')
        );
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

    specTest('Can listen to augmenting pipelines for updates', [], () => {
      const query1 = toCorePipeline(
        db.pipeline().collection('collection').select('key')
      );
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docAV2 = doc('collection/a', 2000, { key: 'v2' });
      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .watchAcksFull(query1, 2000, docAV2)
        .expectEvents(query1, { modified: [docAV2] });
    });

    specTest('Can get results merged from cache and backend', [], () => {
      const query1 = toCorePipeline(
        db
          .pipeline()
          .collection('collection')
          .where(Field.of('key').like('?ab%c'))
          .select('key')
      );
      const coll = query('collection');
      const docA = doc('collection/a', 800, { key: 'aabcc' });
      const docAV3 = doc('collection/a', 2100, { key: 'xxxxx' });
      const docB = doc('collection/b', 900, { key: 'abcc' });
      const docBV2 = doc('collection/b', 1500, { key: 'aaaabcc' });
      const docC = doc('collection/c', 700, { key: 'bcca' });
      const docCV3 = doc('collection/c', 2500, { key: 'aabcc' });
      return (
        spec()
          .ensureManualLruGC()
          .userListens(coll)
          // Setting up document cache
          .watchAcksFull(coll, 1000, docA, docB, docC)
          .expectEvents(coll, { added: [docA, docB, docC] })
          .userUnlistens(coll)
          // listen to augmenting pipelines
          .userListens(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .watchAcksFull(query1, 2000, docA, docBV2)
          .expectEvents(query1, { added: [docBV2], fromCache: false })
          .userUnlistens(query1)
          // Listen to collection again, we do not see docBV2
          .userListens(coll)
          .expectEvents(coll, { added: [docA, docB, docC], fromCache: true })
          .watchAcksFull(query1, 2000, docAV3, docBV2, docCV3)
          .expectEvents(query1, {
            modified: [docAV3, docCV3],
            fromCache: false
          })
          // listen to augmenting pipelines again
          .userListens(query1)
          .expectEvents(query1, { added: [docBV2, docCV3], fromCache: true })
          .watchAcksFull(query1, 3000, docBV2, docCV3)
          .expectEvents(query1, { fromCache: false })
      );
    });

    specTest('Can listen to updates resulted from local mutations', [], () => {
      const query1 = toCorePipeline(
        db
          .pipeline()
          .collection('collection')
          .where(Field.of('key').startsWith('a'))
          .select('key')
      );
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docAModified = doc('collection/a', 1000, { key: 'a2' });
      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .userSets('collection/a', { key: 'a2' })
        .expectEvents(query1, {
          modified: [docAModified],
          hasPendingWrites: true
        })
        .userSets('collection/a', { key: 'b2' })
        .expectEvents(query1, {
          removed: [docAModified],
          hasPendingWrites: true
        })
        .userSets('collection/a', { key: 'a2' })
        .expectEvents(query1, { added: [docAModified], hasPendingWrites: true })
        .watchRemovesDoc(docA.key, query1)
        .watchCurrents(query1, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(query1, { removed: [docAModified] });
    });
  }

  // TODO: document deletion, GC, Multitab, etc
);
