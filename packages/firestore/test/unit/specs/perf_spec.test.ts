/**
 * @license
 * Copyright 2018 Google LLC
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
import { Document } from '../../../src/model/document';
import { doc, filter, orderBy, query } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { spec } from './spec_builder';

/** The number of iterations for the benchmark spec tests. */
const STEP_COUNT = 10;

describeSpec(
  `Performance Tests [${STEP_COUNT} iterations]:`,
  ['benchmark'],
  () => {
    specTest('Insert a new document', [], () => {
      const steps = spec().withGCEnabled(false);
      for (let i = 0; i < STEP_COUNT; ++i) {
        steps
          .userSets(`collection/{i}`, { doc: i })
          .writeAcks(`collection/{i}`, i + 1); // Prevent zero version
      }
      return steps;
    });

    specTest(
      'Start a listen, write a document, ack the write, handle watch snapshot, unlisten',
      [],
      () => {
        let currentVersion = 1;
        const steps = spec().withGCEnabled(false);

        for (let i = 0; i < STEP_COUNT; ++i) {
          const query1 = query(`collection/${i}`);
          const docLocal = doc(
            `collection/${i}`,
            0,
            { doc: i },
            { hasLocalMutations: true }
          );
          const docRemote = doc(`collection/${i}`, ++currentVersion, {
            doc: i
          });

          steps
            .userListens(query1)
            .userSets(`collection/${i}`, { doc: i })
            .expectEvents(query1, {
              added: [docLocal],
              fromCache: true,
              hasPendingWrites: true
            })
            .writeAcks(`collection/${i}`, docRemote.version.toMicroseconds())
            .watchAcksFull(query1, ++currentVersion, docRemote)
            .expectEvents(query1, { metadata: [docRemote] })
            .userUnlistens(query1)
            .watchRemoves(query1);
        }
        return steps;
      }
    );

    specTest('Write 100 documents and raise a snapshot', [], () => {
      const cachedDocumentCount = 100;
      9;
      const query1 = query(`collection`, orderBy('v'));
      const steps = spec().withGCEnabled(false);
      const docs: Document[] = [];

      for (let i = 0; i < cachedDocumentCount; ++i) {
        steps.userSets(`collection/${i}`, { v: i });
        docs.push(
          doc(`collection/${i}`, 0, { v: i }, { hasLocalMutations: true })
        );
      }

      for (let i = 1; i <= STEP_COUNT; ++i) {
        steps
          .userListens(query1)
          .expectEvents(query1, {
            added: docs,
            fromCache: true,
            hasPendingWrites: true
          })
          .userUnlistens(query1);
      }

      return steps;
    });

    specTest('Update a single document', [], () => {
      const steps = spec()
        .withGCEnabled(false)
        .userSets(`collection/doc`, { v: 0 });

      for (let i = 1; i <= STEP_COUNT; ++i) {
        steps
          .userPatches(`collection/doc`, { v: i })
          .writeAcks(`collection/doc`, i);
      }
      return steps;
    });

    specTest(
      'Update a document and wait for snapshot with existing listen',
      [],
      () => {
        const query1 = query(`collection/doc`);

        let currentVersion = 1;
        const steps = spec().withGCEnabled(false);

        let docLocal = doc(
          `collection/doc`,
          0,
          { v: 0 },
          { hasLocalMutations: true }
        );
        let docRemote = doc(`collection/doc`, ++currentVersion, { v: 0 });
        let lastRemoteVersion = currentVersion;

        steps
          .userListens(query1)
          .userSets(`collection/doc`, { v: 0 })
          .expectEvents(query1, {
            added: [docLocal],
            fromCache: true,
            hasPendingWrites: true
          })
          .writeAcks(`collection/doc`, docRemote.version.toMicroseconds())
          .watchAcksFull(query1, ++currentVersion, docRemote)
          .expectEvents(query1, { metadata: [docRemote] });

        for (let i = 1; i <= STEP_COUNT; ++i) {
          docLocal = doc(
            `collection/doc`,
            lastRemoteVersion,
            { v: i },
            { hasLocalMutations: true }
          );
          docRemote = doc(`collection/doc`, ++currentVersion, { v: i });
          lastRemoteVersion = currentVersion;

          steps
            .userPatches(`collection/doc`, { v: i })
            .expectEvents(query1, {
              modified: [docLocal],
              hasPendingWrites: true
            })
            .writeAcks(`collection/doc`, docRemote.version.toMicroseconds())
            .watchSends({ affects: [query1] }, docRemote)
            .watchSnapshots(++currentVersion)
            .expectEvents(query1, { metadata: [docRemote] });
        }
        return steps;
      }
    );

    specTest(
      'Process 100 documents from Watch and wait for snapshot',
      [],
      () => {
        const documentsPerStep = 100;

        const query1 = query(`collection`, orderBy('v'));
        const steps = spec().withGCEnabled(false);

        let currentVersion = 1;

        steps
          .userListens(query1)
          .watchAcksFull(query1, currentVersion)
          .expectEvents(query1, {});

        for (let i = 1; i <= STEP_COUNT; ++i) {
          const docs: Document[] = [];

          for (let j = 0; j < documentsPerStep; ++j) {
            docs.push(
              doc(`collection/${j}`, ++currentVersion, { v: currentVersion })
            );
          }

          const changeType = i === 1 ? 'added' : 'modified';

          steps
            .watchSends({ affects: [query1] }, ...docs)
            .watchSnapshots(++currentVersion)
            .expectEvents(query1, { [changeType]: docs });
        }

        return steps;
      }
    );

    specTest(
      'Process 100 documents from Watch and wait for snapshot, then unlisten and wait for a ' +
        'cached snapshot',
      [],
      () => {
        const documentsPerStep = 100;

        let currentVersion = 1;
        const steps = spec().withGCEnabled(false);

        for (let i = 1; i <= STEP_COUNT; ++i) {
          const collPath = `collection/${i}/coll`;
          const query1 = query(collPath, orderBy('v'));

          const docs: Document[] = [];
          for (let j = 0; j < documentsPerStep; ++j) {
            docs.push(doc(`${collPath}/${j}`, ++currentVersion, { v: j }));
          }

          steps
            .userListens(query1)
            .watchAcksFull(query1, ++currentVersion, ...docs)
            .expectEvents(query1, { added: docs })
            .userUnlistens(query1)
            .watchRemoves(query1)
            .userListens(query1, 'resume-token-' + currentVersion)
            .expectEvents(query1, { added: docs, fromCache: true })
            .watchAcksFull(query1, ++currentVersion)
            .expectEvents(query1, {})
            .userUnlistens(query1)
            .watchRemoves(query1);
        }

        return steps;
      }
    );

    specTest('Process 25 target updates and wait for snapshot', [], () => {
      const queriesPerStep = 25;

      let currentVersion = 1;
      const steps = spec().withGCEnabled(false);

      for (let i = 1; i <= STEP_COUNT; ++i) {
        // We use a different subcollection for each iteration to ensure
        // that we use distinct and non-overlapping collection queries.
        const collPath = `collection/${i}/coll`;
        const matchingDoc = doc(`${collPath}/matches`, ++currentVersion, {
          val: -1
        });

        const queries: Query[] = [];

        // Create `queriesPerStep` listens, each against collPath but with a
        // unique query constraint.
        for (let j = 0; j < queriesPerStep; ++j) {
          const query1 = query(collPath, filter('val', '<=', j));
          queries.push(query1);
          steps.userListens(query1).watchAcks(query1);
        }

        steps
          .watchSends({ affects: queries }, matchingDoc)
          .watchSnapshots(++currentVersion);

        // Registers the snapshot expectations with the spec runner.
        for (const query of queries) {
          steps.expectEvents(query, {
            added: [matchingDoc],
            fromCache: true
          });
        }

        // Unlisten and clean up the query.
        for (const query of queries) {
          steps.userUnlistens(query).watchRemoves(query);
        }
      }

      return steps;
    });

    specTest(
      'Add 500 documents, issue 10 queries that return 10 documents each, unlisten',
      [],
      () => {
        const documentCount = 500;
        const matchingCount = 10;
        const queryCount = 10;

        const steps = spec().withGCEnabled(false);

        const collPath = `collection`;
        const query1 = query(collPath, orderBy('val'));
        steps.userListens(query1).watchAcks(query1);

        const allDocs: Document[] = [];

        let currentVersion = 1;
        // Create `documentCount` documents.
        for (let j = 0; j < documentCount; ++j) {
          const document = doc(`${collPath}/doc${j}`, ++currentVersion, {
            val: j
          });
          allDocs.push(document);
          steps.watchSends({ affects: [query1] }, document);
        }

        steps.watchCurrents(query1, `current-version-${++currentVersion}`);
        steps.watchSnapshots(currentVersion);
        steps.expectEvents(query1, { added: allDocs });
        steps.userUnlistens(query1).watchRemoves(query1);

        for (let i = 1; i <= STEP_COUNT; ++i) {
          // Create `queryCount` listens, each against collPath but with a
          // unique query constraint.
          for (let j = 0; j < queryCount; ++j) {
            const partialQuery = query(
              collPath,
              filter('val', '>=', j * matchingCount),
              filter('val', '<', (j + 1) * matchingCount)
            );
            steps.userListens(partialQuery);
            steps.expectEvents(partialQuery, {
              added: allDocs.slice(j * matchingCount, (j + 1) * matchingCount),
              fromCache: true
            });
            steps.userUnlistens(partialQuery);
          }
        }

        return steps;
      }
    );
  }
);
