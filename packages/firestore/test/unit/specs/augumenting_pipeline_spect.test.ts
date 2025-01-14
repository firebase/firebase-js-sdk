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

import { Field, setLogLevel } from '../../../src';
import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';
import { newTestFirestore } from '../../util/api_helpers';

import { toCorePipeline } from '../../../src/core/pipeline-util';
import { Code } from '../../../src/util/error';

describeSpec(
  'Augmenting pipelines:',
  ['explicit-pipeline'],
  () => {
    const db = newTestFirestore();
    specTest(
      'Contents of pipeline are cleared when listen is removed.',
      ['eager-gc'],
      () => {
        const pipeline1 = toCorePipeline(
          db.pipeline().collection('collection').select('key')
        );
        const query1 = query('collection');
        const docA = doc('collection/a', 1000, { key: 'a', value: 42 });
        const docASelected = doc('collection/a', 1000, { key: 'a' });
        return (
          spec()
            .userListens(query1)
            .watchAcksFull(query1, 1000, docA)
            .expectEvents(query1, { added: [docA] })
            .userListens(pipeline1)
            .expectEvents(pipeline1, { added: [docASelected], fromCache: true })
            .watchAcksFull(pipeline1, 1000, docASelected)
            .expectEvents(pipeline1, { fromCache: false })
            .userUnlistens(query1)
            .userUnlistens(pipeline1)
            // should get no events.
            .userListens(pipeline1)
        );
      }
    );

    specTest('Can listen to augmenting pipelines for updates', [], () => {
      const query1 = toCorePipeline(
        db.pipeline().collection('collection').select('key')
      );
      const docA = doc('collection/a', 1000, { key: 'a' });
      const docAV2 = doc('collection/a', 2000, { key: 'v2' });
      const docAV3 = doc('collection/a', 3000, { key: 42 });
      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .watchSends({ removed: [query1] }, docA)
        .watchSnapshots(1001)
        .expectEvents(query1, { removed: [docA] })
        .watchSends({ affects: [query1] }, docAV2)
        .watchSnapshots(2000)
        .expectEvents(query1, { added: [docAV2] })
        .watchSends({ affects: [query1] }, docAV3)
        .watchSnapshots(3000)
        .expectEvents(query1, { modified: [docAV3] })
        .watchSends({ removed: [query1] }, docAV3)
        .watchSnapshots(4000)
        .expectEvents(query1, { removed: [docAV3] });
    });

    specTest('Can get results merged from cache and backend', [], () => {
      const query1 = toCorePipeline(
        db
          .pipeline()
          .collection('collection')
          .where(Field.of('key').like('_ab%c%'))
          .select('key')
      );
      const coll = query('collection');
      const docA = doc('collection/a', 800, { key: 'aabcc' });
      const docAV3 = doc('collection/a', 2100, { key: 'xxxxx' });
      const docB = doc('collection/b', 900, { key: 'abcc' });
      const docBV2 = doc('collection/b', 1500, { key: 'xabcc' });
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
          .watchRemoves(coll)
          // listen to augmenting pipelines
          .userListens(query1)
          .expectEvents(query1, { added: [docA], fromCache: true })
          .watchAcksFull(query1, 2000, docA, docBV2)
          .expectEvents(query1, { added: [docBV2], fromCache: false })
          .userUnlistens(query1)
          .watchRemoves(query1)
          // Listen to collection again, we do not see docBV2
          .userListens(coll, { resumeToken: 'resume-token-1000' })
          .expectEvents(coll, { added: [docA, docB, docC], fromCache: true })
          .watchAcksFull(coll, 2500, docAV3, docBV2, docCV3)
          .expectEvents(coll, {
            modified: [docAV3, docBV2, docCV3],
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
      // Initial doc in SDK's cache
      const docA2Local = doc('collection/a', 0, {
        key: 'a2'
      }).setHasLocalMutations();
      const docB2Local = doc('collection/a', 0, {
        key: 'b2'
      }).setHasLocalMutations();
      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .userSets('collection/a', { key: 'a2' })
        .expectEvents(query1, {
          modified: [docA2Local],
          hasPendingWrites: true
        })
        .userSets('collection/a', { key: 'b2' })
        .expectEvents(query1, {
          removed: [docA2Local],
          hasPendingWrites: true
        })
        .userSets('collection/a', { key: 'a2' })
        .expectEvents(query1, { added: [docA2Local], hasPendingWrites: true })
        .watchRemovesDoc(docA.key, query1)
        .watchCurrents(query1, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(query1, { removed: [docA2Local] });
    });

    specTest(
      'Can raise initial snapshots with local mutations and update with subsequent mutations',
      [],
      () => {
        const coll = query('collection');
        const query1 = toCorePipeline(
          db
            .pipeline()
            .collection('collection')
            .where(Field.of('key').startsWith('a'))
            .select('key')
        );
        const docA = doc('collection/a', 1000, { key: 'a' });
        // Initial doc in SDK's cache
        const docA2Local = doc('collection/a', 1000, {
          key: 'a2'
        }).setHasLocalMutations();
        const docA3 = doc('collection/a', 2000, {
          key: 'a3'
        });
        const docA3Local = doc('collection/a', 2000, {
          key: 'a3aa'
        }).setHasLocalMutations();
        return (
          spec()
            .ensureManualLruGC()
            // Setting up document cache to have docA
            .userListens(coll)
            .watchAcksFull(coll, 1000, docA)
            .expectEvents(coll, { added: [docA] })
            .userUnlistens(coll)
            .watchRemoves(coll)
            // update the cache to docA2Local
            .userPatches('collection/a', { key: 'a2' })
            // listen to augmenting pipelines
            .userListens(query1)
            .expectEvents(query1, {
              added: [docA2Local],
              fromCache: true,
              hasPendingWrites: true
            })
            .watchAcksFull(query1, 1000, docA3)
            .expectEvents(query1, { modified: [docA3] })
            .userSets('collection/a', { key: 'a3aa' })
            .expectEvents(query1, {
              modified: [docA3Local],
              hasPendingWrites: true
            })
            .userDeletes('collection/a')
            .expectEvents(query1, {
              removed: [docA3Local],
              hasPendingWrites: true
            })
        );
      }
    );

    specTest('Can handle mutation acknowledgement', [], () => {
      const query1 = toCorePipeline(
        db
          .pipeline()
          .collection('collection')
          .where(Field.of('key').startsWith('a'))
          .select('key')
      );
      const docA = doc('collection/a', 1000, { key: 'a' });
      // Initial doc in SDK's cache
      const docA2Local = doc('collection/a', 0, {
        key: 'a2'
      }).setHasLocalMutations();
      const docA2Ack = doc('collection/a', 2000, {
        key: 'a2'
      }).setHasCommittedMutations();
      const docA2Sync = doc('collection/a', 2000, {
        key: 'a2'
      });
      const docA3Local = doc('collection/a', 0, {
        key: 'a3'
      }).setHasLocalMutations();
      const docA3Ack = doc('collection/a', 3000, {
        key: 'a3'
      }).setHasCommittedMutations();
      const docA3Sync = doc('collection/a', 3000, {
        key: 'a3'
      });
      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .userSets('collection/a', { key: 'a2' })
        .expectEvents(query1, {
          modified: [docA2Local],
          hasPendingWrites: true
        })
        .writeAcks('collection/a', 2000)
        .expectEvents(query1, {
          metadata: [docA2Ack],
          hasPendingWrites: true
        })
        .watchSends({ affects: [query1] }, docA2Sync)
        .watchCurrents(query1, 'resume-token-2000')
        .watchSnapshots(2000)
        .expectEvents(query1, {
          metadata: [docA2Sync]
        })
        .userPatches('collection/a', { key: 'a3' })
        .expectEvents(query1, {
          modified: [docA3Local],
          hasPendingWrites: true
        })
        .writeAcks('collection/a', 3000)
        .expectEvents(query1, {
          metadata: [docA3Ack],
          hasPendingWrites: true
        })
        .watchSends({ affects: [query1] }, docA3Sync)
        .watchCurrents(query1, 'resume-token-3000')
        .watchSnapshots(3000)
        .expectEvents(query1, { metadata: [docA3Sync], fromCache: false });
    });

    specTest('Can handle mutation rejection', [], () => {
      const query1 = toCorePipeline(
        db
          .pipeline()
          .collection('collection')
          .where(Field.of('key').endsWith('aa'))
          .select('key')
      );
      const docA = doc('collection/a', 1000, { key: 'aa', noise: 'noise' });
      // Initial doc in SDK's cache
      const docA2Local = doc('collection/a', 0, {
        key: '2aa'
      }).setHasLocalMutations();
      const docA3Local = doc('collection/a', 0, {
        key: '3aa'
      }).setHasLocalMutations();
      return (
        spec()
          .userListens(query1)
          .watchAcksFull(query1, 1000, docA)
          .expectEvents(query1, { added: [docA] })
          .userSets('collection/a', { key: 'a2', noise: 'more noise' })
          .expectEvents(query1, {
            removed: [docA],
            hasPendingWrites: true
          })
          .failWrite(
            'collection/a',
            new RpcError(Code.FAILED_PRECONDITION, 'failure')
          )
          .expectEvents(query1, {
            added: [docA]
          })
          .userDeletes('collection/a')
          .expectEvents(query1, {
            removed: [docA],
            hasPendingWrites: true
          })
          .userSets('collection/a', { key: '2aa' })
          .expectEvents(query1, {
            added: [docA2Local],
            hasPendingWrites: true
          })
          .userPatches('collection/a', { key: '3aa' })
          .expectEvents(query1, {
            modified: [docA3Local],
            hasPendingWrites: true
          })
          // failing the delete
          .failWrite(
            'collection/a',
            new RpcError(Code.FAILED_PRECONDITION, 'failure')
          )
          // expect no events
          // failing the set
          .failWrite(
            'collection/a',
            new RpcError(Code.FAILED_PRECONDITION, 'failure')
          )
          // expect no events because a blind patch is not visible in the cache
          // failing the update
          .failWrite(
            'collection/a',
            new RpcError(Code.FAILED_PRECONDITION, 'failure')
          )
          .expectEvents(query1, {
            modified: [docA]
          })
      );
    });
  }

  // TODO: limits, user switch, GC, Multitab, view refactor, etc
);
