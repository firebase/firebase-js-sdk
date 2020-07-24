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

import { newQueryForPath, Query } from '../../../src/core/query';
import {
  doc,
  query,
  filter,
  TestSnapshotVersion,
  version,
  wrapObject
} from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { TestBundleBuilder } from '../util/bundle_data';
import {
  JSON_SERIALIZER,
  TEST_DATABASE_ID
} from '../local/persistence_test_helpers';
import { DocumentKey } from '../../../src/model/document_key';
import { toVersion } from '../../../src/remote/serializer';
import { JsonObject } from '../../../src/model/object_value';
import { LimitType } from '../../../src/protos/firestore_bundle_proto';

interface TestBundleDocument {
  key: DocumentKey;
  readTime: TestSnapshotVersion;
  createTime?: TestSnapshotVersion;
  updateTime?: TestSnapshotVersion;
  content?: JsonObject<unknown>;
}

interface TestBundledQuery {
  name: string;
  readTime: TestSnapshotVersion;
  query: Query;
  limitType?: LimitType;
}

function bundleWithDocumentAndQuery(
  testDoc: TestBundleDocument,
  testQuery?: TestBundledQuery
): string {
  const builder = new TestBundleBuilder(TEST_DATABASE_ID);

  if (testQuery) {
    builder.addNamedQuery(
      testQuery.name,
      toVersion(JSON_SERIALIZER, version(testQuery.readTime)),
      testQuery.query,
      testQuery.limitType
    );
  }

  builder.addDocumentMetadata(
    testDoc.key,
    toVersion(JSON_SERIALIZER, version(testDoc.readTime)),
    !!testDoc.createTime
  );
  if (testDoc.createTime) {
    builder.addDocument(
      testDoc.key,
      toVersion(JSON_SERIALIZER, version(testDoc.createTime)),
      toVersion(JSON_SERIALIZER, version(testDoc.updateTime!)),
      wrapObject(testDoc.content!).proto.mapValue.fields!
    );
  }
  return builder.build(
    'test-bundle',
    toVersion(JSON_SERIALIZER, version(testDoc.readTime))
  );
}

describeSpec('Bundles:', ['no-ios', 'no-android'], () => {
  specTest('Newer docs from bundles should overwrite cache', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { value: 'a' });
    const docAChanged = doc('collection/a', 2999, { value: 'b' });

    const bundleString = bundleWithDocumentAndQuery({
      key: docA.key,
      readTime: 3000,
      createTime: 1999,
      updateTime: 2999,
      content: { value: 'b' }
    });

    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        // TODO(b/160876443): This currently raises snapshots with
        // `fromCache=false` if users already listen to some queries and bundles
        // has newer version.
        .loadBundle(bundleString)
        .expectEvents(query1, { modified: [docAChanged] })
    );
  });

  specTest(
    'Newer deleted docs from bundles should delete cached docs',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 1000, { value: 'a' });

      const bundleString = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 3000
      });

      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        .loadBundle(bundleString)
        .expectEvents(query1, { removed: [docA] });
    }
  );

  specTest('Older deleted docs from bundles should do nothing', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { value: 'a' });

    const bundleString = bundleWithDocumentAndQuery({
      key: docA.key,
      readTime: 999
    });

    return (
      spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, docA)
        .expectEvents(query1, { added: [docA] })
        // No events are expected here.
        .loadBundle(bundleString)
    );
  });

  specTest(
    'Newer docs from bundles should raise snapshot only when Watch catches up with acknowledged writes',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 250, { value: 'a' });

      const bundleBeforeMutationAck = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { value: 'b' }
      });

      const bundleAfterMutationAck = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 1001,
        createTime: 250,
        updateTime: 1001,
        content: { value: 'fromBundle' }
      });
      return (
        spec()
          // TODO(b/160878667): Figure out what happens when memory eager GC is on
          // a bundle is loaded.
          .withGCEnabled(false)
          .userListens(query1)
          .watchAcksFull(query1, 250, docA)
          .expectEvents(query1, {
            added: [doc('collection/a', 250, { value: 'a' })]
          })
          .userPatches('collection/a', { value: 'patched' })
          .expectEvents(query1, {
            modified: [
              doc(
                'collection/a',
                250,
                { value: 'patched' },
                { hasLocalMutations: true }
              )
            ],
            hasPendingWrites: true
          })
          .writeAcks('collection/a', 1000)
          // loading bundleBeforeMutationAck will not raise snapshots, because its
          // snapshot version is older than the acknowledged mutation.
          .loadBundle(bundleBeforeMutationAck)
          // loading bundleAfterMutationAck will raise a snapshot, because it is after
          // the acknowledged mutation.
          .loadBundle(bundleAfterMutationAck)
          .expectEvents(query1, {
            modified: [doc('collection/a', 1001, { value: 'fromBundle' })]
          })
      );
    }
  );

  specTest(
    'Newer docs from bundles should keep not raise snapshot if there are unacknowledged writes',
    [],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 250, { value: 'a' });

      const bundleString = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 1001,
        createTime: 250,
        updateTime: 1001,
        content: { value: 'fromBundle' }
      });

      return (
        spec()
          .withGCEnabled(false)
          .userListens(query1)
          .watchAcksFull(query1, 250, docA)
          .expectEvents(query1, {
            added: [doc('collection/a', 250, { value: 'a' })]
          })
          .userPatches('collection/a', { value: 'patched' })
          .expectEvents(query1, {
            modified: [
              doc(
                'collection/a',
                250,
                { value: 'patched' },
                { hasLocalMutations: true }
              )
            ],
            hasPendingWrites: true
          })
          // Loading the bundle will not raise snapshots, because the
          // mutation has not been acknowledged.
          .loadBundle(bundleString)
      );
    }
  );

  specTest('Newer docs from bundles might lead to limbo doc', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 1000, { value: 'a' });
    const bundleString1 = bundleWithDocumentAndQuery({
      key: docA.key,
      readTime: 500,
      createTime: 250,
      updateTime: 500,
      content: { value: 'b' }
    });
    const limboQuery = newQueryForPath(docA.key.path);

    return (
      spec()
        .withGCEnabled(false)
        .userListens(query1)
        .watchAcksFull(query1, 250)
        // Backend tells is there is no such doc.
        .expectEvents(query1, {})
        // Bundle tells otherwise, leads to limbo.
        .loadBundle(bundleString1)
        .expectLimboDocs(docA.key)
        .expectEvents(query1, {
          added: [doc('collection/a', 500, { value: 'b' })],
          fromCache: true
        })
        // .watchAcksFull(limboQuery, 1002, docA1)
        .watchAcks(limboQuery)
        .watchSends({ affects: [limboQuery] })
        .watchCurrents(limboQuery, 'resume-token-1002')
        .watchSnapshots(1002)
        .expectLimboDocs()
        .expectEvents(query1, {
          removed: [doc('collection/a', 500, { value: 'b' })],
          fromCache: false
        })
    );
  });

  specTest('Bundles query can be loaded and resumed.', [], () => {
    const query1 = query('collection');
    const docA = doc('collection/a', 100, { key: 'a' });
    const bundleString1 = bundleWithDocumentAndQuery(
      {
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { value: 'b' }
      },
      { name: 'bundled-query', readTime: 400, query: query1 }
    );

    return spec()
      .loadBundle(bundleString1)
      .userListensToNamedQuery('bundled-query', query1, 400)
      .expectEvents(query1, {
        added: [doc('collection/a', 500, { value: 'b' })],
        fromCache: true
      });
  });

  specTest(
    'Bundles query can be loaded and resumed from different tabs',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const query2 = query('collection', filter('value', '==', 'c'));
      const docA = doc('collection/a', 100, { value: 'a' });
      const bundleString1 = bundleWithDocumentAndQuery(
        {
          key: docA.key,
          readTime: 500,
          createTime: 250,
          updateTime: 500,
          content: { value: 'b' }
        },
        { name: 'bundled-query', readTime: 400, query: query1 }
      );

      const bundleString2 = bundleWithDocumentAndQuery(
        {
          key: docA.key,
          readTime: 600,
          createTime: 250,
          updateTime: 550,
          content: { value: 'c' }
        },
        { name: 'bundled-query', readTime: 560, query: query2 }
      );

      return (
        client(0)
          .loadBundle(bundleString1)
          // Read named query from loaded bundle by primary.
          .client(1)
          .userListensToNamedQuery('bundled-query', query1, 400)
          .expectEvents(query1, {
            added: [doc('collection/a', 500, { value: 'b' })],
            fromCache: true
          })
          // Loads a newer bundle.
          .loadBundle(bundleString2)
          .expectEvents(query1, {
            modified: [doc('collection/a', 550, { value: 'c' })],
            fromCache: true
          })
          .userUnlistens(query1)
          // Read named query from loaded bundle by secondary.
          .client(0)
          .userListensToNamedQuery('bundled-query', query2, 560)
          .expectEvents(query2, {
            added: [doc('collection/a', 550, { value: 'c' })],
            fromCache: true
          })
      );
    }
  );

  specTest(
    'Load from secondary clients and observe from primary',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 250, { value: 'a' });
      const bundleString1 = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { value: 'b' }
      });

      return client(0)
        .userListens(query1)
        .watchAcksFull(query1, 250, docA)
        .expectEvents(query1, {
          added: [docA]
        })
        .client(1)
        .loadBundle(bundleString1)
        .client(0)
        .expectEvents(query1, {
          modified: [doc('collection/a', 500, { value: 'b' })]
        });
    }
  );

  specTest(
    'Load and observe from same secondary client',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 250, { value: 'a' });
      const bundleString = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { value: 'b' }
      });

      return client(0)
        .userListens(query1)
        .watchAcksFull(query1, 250, docA)
        .expectEvents(query1, {
          added: [docA]
        })
        .client(1)
        .userListens(query1)
        .expectEvents(query1, {
          added: [docA]
        })
        .loadBundle(bundleString)
        .expectEvents(query1, {
          modified: [doc('collection/a', 500, { value: 'b' })]
        });
    }
  );

  specTest(
    'Load from primary client and observe from secondary',
    ['multi-client'],
    () => {
      const query1 = query('collection');
      const docA = doc('collection/a', 250, { value: 'a' });
      const bundleString1 = bundleWithDocumentAndQuery({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { value: 'b' }
      });

      return client(0)
        .userListens(query1)
        .watchAcksFull(query1, 250, docA)
        .expectEvents(query1, {
          added: [docA]
        })
        .client(1)
        .userListens(query1)
        .expectEvents(query1, {
          added: [docA]
        })
        .client(0)
        .loadBundle(bundleString1)
        .expectEvents(query1, {
          modified: [doc('collection/a', 500, { value: 'b' })]
        })
        .client(1)
        .expectEvents(query1, {
          modified: [doc('collection/a', 500, { value: 'b' })]
        });
    }
  );
});
