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
import { doc, path, TestSnapshotVersion, version } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { TestBundleBuilder } from '../../util/bundle_data';
import {
  JSON_SERIALIZER,
  TEST_DATABASE_ID
} from '../local/persistence_test_helpers';
import { DocumentKey } from '../../../src/model/document_key';
import * as api from '../../../src/protos/firestore_proto_api';
import { Value } from '../../../src/protos/firestore_proto_api';
import { TimerId } from '../../../src/util/async_queue';

interface TestBundleDocument {
  key: DocumentKey;
  readTime: TestSnapshotVersion;
  createTime?: TestSnapshotVersion;
  updateTime?: TestSnapshotVersion;
  content?: api.ApiClientObjectMap<Value>;
}
function bundleWithDocument(testDoc: TestBundleDocument): string {
  const builder = new TestBundleBuilder(TEST_DATABASE_ID);
  builder.addDocumentMetadata(
    testDoc.key,
    JSON_SERIALIZER.toVersion(version(testDoc.readTime)),
    !!testDoc.createTime
  );
  if (testDoc.createTime) {
    builder.addDocument(
      testDoc.key,
      JSON_SERIALIZER.toVersion(version(testDoc.createTime)),
      JSON_SERIALIZER.toVersion(version(testDoc.updateTime!)),
      testDoc.content!
    );
  }
  return builder.build(
    'test-bundle',
    JSON_SERIALIZER.toVersion(version(testDoc.readTime))
  );
}

describeSpec('Bundles:', [], () => {
  specTest('Newer docs from bundles should overwrite cache.', [], () => {
    const query1 = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const docAChanged = doc('collection/a', 2999, { key: 'b' });

    const bundleString = bundleWithDocument({
      key: docA.key,
      readTime: 3000,
      createTime: 1999,
      updateTime: 2999,
      content: { key: { stringValue: 'b' } }
    });

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .loadBundle(bundleString)
      .expectEvents(query1, { modified: [docAChanged] });
  });

  specTest('Newer deleted docs from bundles should delete cache.', [], () => {
    const query1 = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });

    const bundleString = bundleWithDocument({
      key: docA.key,
      readTime: 3000
    });

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, 1000, docA)
      .expectEvents(query1, { added: [docA] })
      .loadBundle(bundleString)
      .expectEvents(query1, { removed: [docA] });
  });

  specTest('Older deleted docs from bundles should do nothing.', [], () => {
    const query1 = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });

    const bundleString = bundleWithDocument({
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
    'Newer docs from bundles should raise snapshot only when watch catches up with acknowledged writes.',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 250, { key: 'a' });

      const bundleString1 = bundleWithDocument({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { key: { stringValue: 'b' } }
      });

      const bundleString2 = bundleWithDocument({
        key: docA.key,
        readTime: 1001,
        createTime: 250,
        updateTime: 1001,
        content: { key: { stringValue: 'fromBundle' } }
      });
      return (
        spec()
          .withGCEnabled(false)
          .userListens(query)
          .watchAcksFull(query, 250, docA)
          .expectEvents(query, {
            added: [doc('collection/a', 250, { key: 'a' })]
          })
          .userPatches('collection/a', { key: 'patched' })
          .expectEvents(query, {
            modified: [
              doc(
                'collection/a',
                250,
                { key: 'patched' },
                { hasLocalMutations: true }
              )
            ],
            hasPendingWrites: true
          })
          .writeAcks('collection/a', 1000)
          // loading bundleString1 will not raise snapshots, because it is before
          // the acknowledged mutation.
          .loadBundle(bundleString1)
          // loading bundleString2 will raise a snapshot, because it is after
          // the acknowledged mutation.
          .loadBundle(bundleString2)
          .expectEvents(query, {
            modified: [doc('collection/a', 1001, { key: 'fromBundle' })]
          })
      );
    }
  );

  specTest(
    'Newer docs from bundles should keep not raise snapshot if there are unacknowledged writes.',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 250, { key: 'a' });

      const bundleString1 = bundleWithDocument({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { key: { stringValue: 'b' } }
      });

      const bundleString2 = bundleWithDocument({
        key: docA.key,
        readTime: 1001,
        createTime: 250,
        updateTime: 1001,
        content: { key: { stringValue: 'fromBundle' } }
      });

      return (
        spec()
          .withGCEnabled(false)
          .userListens(query)
          .watchAcksFull(query, 250, docA)
          .expectEvents(query, {
            added: [doc('collection/a', 250, { key: 'a' })]
          })
          .userPatches('collection/a', { key: 'patched' })
          .expectEvents(query, {
            modified: [
              doc(
                'collection/a',
                250,
                { key: 'patched' },
                { hasLocalMutations: true }
              )
            ],
            hasPendingWrites: true
          })
          // Loading both bundles will not raise snapshots, because of the
          // mutation is not acknowledged.
          .loadBundle(bundleString1)
          .loadBundle(bundleString2)
      );
    }
  );

  specTest('Newer docs from bundles might lead to limbo doc.', [], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 1000, { key: 'a' });
    const bundleString1 = bundleWithDocument({
      key: docA.key,
      readTime: 500,
      createTime: 250,
      updateTime: 500,
      content: { key: { stringValue: 'b' } }
    });

    return (
      spec()
        .withGCEnabled(false)
        .userListens(query)
        .watchAcksFull(query, 250)
        // Backend tells there is no such doc.
        .expectEvents(query, {})
        // Bundle tells otherwise, leads to limbo.
        .loadBundle(bundleString1)
        .expectEvents(query, {
          added: [doc('collection/a', 500, { key: 'b' })],
          fromCache: true
        })
        .expectLimboDocs(docA.key)
    );
  });

  specTest(
    'Load from secondary clients and observe from primary.',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 250, { key: 'a' });
      const bundleString1 = bundleWithDocument({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { key: { stringValue: 'b' } }
      });

      return (
        client(0)
          .userListens(query)
          .watchAcksFull(query, 250, docA)
          .expectEvents(query, {
            added: [docA]
          })
          .client(1)
          // Bundle tells otherwise, leads to limbo resolution.
          .loadBundle(bundleString1)
          .client(0)
          .becomeVisible()
        // TODO(wuandy): Loading from secondary client does not notify other
        // clients for now. We need to fix it and uncomment below.
        // .expectEvents(query, {
        //   modified: [doc('collection/a', 500, { key: 'b' })],
        // })
      );
    }
  );

  specTest('Load and observe from secondary clients.', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const docA = doc('collection/a', 250, { key: 'a' });
    const bundleString1 = bundleWithDocument({
      key: docA.key,
      readTime: 500,
      createTime: 250,
      updateTime: 500,
      content: { key: { stringValue: 'b' } }
    });

    return client(0)
      .userListens(query)
      .watchAcksFull(query, 250, docA)
      .expectEvents(query, {
        added: [docA]
      })
      .client(1)
      .userListens(query)
      .expectEvents(query, {
        added: [docA]
      })
      .loadBundle(bundleString1)
      .expectEvents(query, {
        modified: [doc('collection/a', 500, { key: 'b' })]
      });
  });

  specTest(
    'Load from primary client and observe from secondary.',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docA = doc('collection/a', 250, { key: 'a' });
      const bundleString1 = bundleWithDocument({
        key: docA.key,
        readTime: 500,
        createTime: 250,
        updateTime: 500,
        content: { key: { stringValue: 'b' } }
      });

      return (
        client(0)
          .userListens(query)
          .watchAcksFull(query, 250, docA)
          .expectEvents(query, {
            added: [docA]
          })
          .client(1)
          .stealPrimaryLease()
          .expectListen(query, 'resume-token-250')
          // Bundle tells otherwise, leads to limbo resolution.
          .loadBundle(bundleString1)
          .client(0)
          .runTimer(TimerId.ClientMetadataRefresh)
          // Client 0 recovers from its lease loss and applies the updates from
          // client 1
          .expectPrimaryState(false)
          .expectEvents(query, {
            modified: [doc('collection/a', 500, { key: 'b' })]
          })
      );
    }
  );
});
