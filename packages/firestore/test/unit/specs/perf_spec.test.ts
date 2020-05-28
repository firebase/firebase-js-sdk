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
import { doc, filter, orderBy, path } from '../../util/helpers';

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
          const query = Query.atPath(path(`collection/${i}`));
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
            .userListens(query)
            .userSets(`collection/${i}`, { doc: i })
            .expectEvents(query, {
              added: [docLocal],
              fromCache: true,
              hasPendingWrites: true
            })
            .writeAcks(`collection/${i}`, docRemote.version.toMicroseconds())
            .watchAcksFull(query, ++currentVersion, docRemote)
            .expectEvents(query, { metadata: [docRemote] })
            .userUnlistens(query)
            .watchRemoves(query);
        }
        return steps;
      }
    );

    specTest('Write 100 documents and raise a snapshot', [], () => {
      const cachedDocumentCount = 100;

      const query = Query.atPath(path(`collection`)).addOrderBy(orderBy('v'));
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
          .userListens(query)
          .expectEvents(query, {
            added: docs,
            fromCache: true,
            hasPendingWrites: true
          })
          .userUnlistens(query);
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
        const query = Query.atPath(path(`collection/doc`));

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
          .userListens(query)
          .userSets(`collection/doc`, { v: 0 })
          .expectEvents(query, {
            added: [docLocal],
            fromCache: true,
            hasPendingWrites: true
          })
          .writeAcks(`collection/doc`, docRemote.version.toMicroseconds())
          .watchAcksFull(query, ++currentVersion, docRemote)
          .expectEvents(query, { metadata: [docRemote] });

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
            .expectEvents(query, {
              modified: [docLocal],
              hasPendingWrites: true
            })
            .writeAcks(`collection/doc`, docRemote.version.toMicroseconds())
            .watchSends({ affects: [query] }, docRemote)
            .watchSnapshots(++currentVersion)
            .expectEvents(query, { metadata: [docRemote] });
        }
        return steps;
      }
    );

    specTest(
      'Process 100 documents from Watch and wait for snapshot',
      [],
      () => {
        const documentsPerStep = 100;

        const query = Query.atPath(path(`collection`)).addOrderBy(orderBy('v'));
        const steps = spec().withGCEnabled(false);

        let currentVersion = 1;

        steps
          .userListens(query)
          .watchAcksFull(query, currentVersion)
          .expectEvents(query, {});

        for (let i = 1; i <= STEP_COUNT; ++i) {
          const docs: Document[] = [];

          for (let j = 0; j < documentsPerStep; ++j) {
            docs.push(
              doc(`collection/${j}`, ++currentVersion, { v: currentVersion })
            );
          }

          const changeType = i === 1 ? 'added' : 'modified';

          steps
            .watchSends({ affects: [query] }, ...docs)
            .watchSnapshots(++currentVersion)
            .expectEvents(query, { [changeType]: docs });
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
          const query = Query.atPath(path(collPath)).addOrderBy(orderBy('v'));

          const docs: Document[] = [];
          for (let j = 0; j < documentsPerStep; ++j) {
            docs.push(doc(`${collPath}/${j}`, ++currentVersion, { v: j }));
          }

          steps
            .userListens(query)
            .watchAcksFull(query, ++currentVersion, ...docs)
            .expectEvents(query, { added: docs })
            .userUnlistens(query)
            .watchRemoves(query)
            .userListens(query, 'resume-token-' + currentVersion)
            .expectEvents(query, { added: docs, fromCache: true })
            .watchAcksFull(query, ++currentVersion)
            .expectEvents(query, {})
            .userUnlistens(query)
            .watchRemoves(query);
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
          const query = Query.atPath(path(collPath)).addFilter(
            filter('val', '<=', j)
          );
          queries.push(query);
          steps.userListens(query).watchAcks(query);
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
        const query = Query.atPath(path(collPath)).addOrderBy(orderBy('val'));
        steps.userListens(query).watchAcks(query);

        const allDocs: Document[] = [];

        let currentVersion = 1;
        // Create `documentCount` documents.
        for (let j = 0; j < documentCount; ++j) {
          const document = doc(`${collPath}/doc${j}`, ++currentVersion, {
            val: j
          });
          allDocs.push(document);
          steps.watchSends({ affects: [query] }, document);
        }

        steps.watchCurrents(query, `current-version-${++currentVersion}`);
        steps.watchSnapshots(currentVersion);
        steps.expectEvents(query, { added: allDocs });
        steps.userUnlistens(query).watchRemoves(query);

        for (let i = 1; i <= STEP_COUNT; ++i) {
          // Create `queryCount` listens, each against collPath but with a
          // unique query constraint.
          for (let j = 0; j < queryCount; ++j) {
            const partialQuery = Query.atPath(path(collPath))
              .addFilter(filter('val', '>=', j * matchingCount))
              .addFilter(filter('val', '<', (j + 1) * matchingCount));
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
