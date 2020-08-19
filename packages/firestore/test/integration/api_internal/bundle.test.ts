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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';
import {
  apiDescribe,
  toDataArray,
  withAlternateTestDb,
  withTestDb
} from '../util/helpers';
import { DatabaseId } from '../../../src/core/database_info';
import { key } from '../../util/helpers';
import { EventsAccumulator } from '../util/events_accumulator';
import { TestBundleBuilder } from '../../unit/util/bundle_data';
import { newTextEncoder } from '../../../src/platform/serializer';
import { collectionReference } from '../../util/api_helpers';

// TODO(b/162594908): Move this to api/ instead of api_internal.

export const encoder = newTextEncoder();

function verifySuccessProgress(p: firestore.LoadBundleTaskProgress): void {
  expect(p.taskState).to.equal('Success');
  expect(p.bytesLoaded).to.be.equal(p.totalBytes);
  expect(p.documentsLoaded).to.equal(p.totalDocuments);
}

function verifyInProgress(
  p: firestore.LoadBundleTaskProgress,
  expectedDocuments: number
): void {
  expect(p.taskState).to.equal('Running');
  expect(p.bytesLoaded <= p.totalBytes).to.be.true;
  expect(p.documentsLoaded <= p.totalDocuments).to.be.true;
  expect(p.documentsLoaded).to.equal(expectedDocuments);
}

apiDescribe('Bundles', (persistence: boolean) => {
  const testDocs: { [key: string]: firestore.DocumentData } = {
    a: { k: { stringValue: 'a' }, bar: { integerValue: 1 } },
    b: { k: { stringValue: 'b' }, bar: { integerValue: 2 } }
  };

  function bundleWithTestDocsAndQueries(
    db: firestore.FirebaseFirestore
  ): TestBundleBuilder {
    const a = key('coll-1/a');
    const b = key('coll-1/b');
    const builder = new TestBundleBuilder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)._databaseId as DatabaseId
    );

    builder.addNamedQuery(
      'limit',
      { seconds: 1000, nanos: 9999 },
      (collectionReference('coll-1')
        .orderBy('bar', 'desc')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .limit(1) as any)._query
    );
    builder.addNamedQuery(
      'limit-to-last',
      { seconds: 1000, nanos: 9999 },
      (collectionReference('coll-1')
        .orderBy('bar', 'desc')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .limitToLast(1) as any)._query
    );

    builder.addDocumentMetadata(a, { seconds: 1000, nanos: 9999 }, true);
    builder.addDocument(
      a,
      { seconds: 1, nanos: 9 },
      { seconds: 1, nanos: 9 },
      testDocs.a
    );
    builder.addDocumentMetadata(b, { seconds: 1000, nanos: 9999 }, true);
    builder.addDocument(
      b,
      { seconds: 1, nanos: 9 },
      { seconds: 1, nanos: 9 },
      testDocs.b
    );

    return builder;
  }

  function verifySnapEqualTestDocs(snap: firestore.QuerySnapshot): void {
    expect(toDataArray(snap)).to.deep.equal([
      { k: 'a', bar: 1 },
      { k: 'b', bar: 2 }
    ]);
  }

  it('load with documents only with on progress and promise interface', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocsAndQueries(db);

      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      let completeCalled = false;
      const task = db.loadBundle(
        builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
      );
      task.onProgress(
        progress => {
          progressEvents.push(progress);
        },
        undefined,
        () => {
          completeCalled = true;
        }
      );
      await task;
      let fulfillProgress: firestore.LoadBundleTaskProgress;
      await task.then(progress => {
        fulfillProgress = progress;
      });

      expect(completeCalled).to.be.true;
      expect(progressEvents.length).to.equal(4);
      verifyInProgress(progressEvents[0], 0);
      verifyInProgress(progressEvents[1], 1);
      verifyInProgress(progressEvents[2], 2);
      verifySuccessProgress(progressEvents[3]);
      expect(fulfillProgress!).to.deep.equal(progressEvents[3]);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      let snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualTestDocs(snap);

      snap = await (await db.namedQuery('limit'))!.get({ source: 'cache' });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'b', bar: 2 }]);

      snap = await (await db.namedQuery('limit-to-last'))!.get({
        source: 'cache'
      });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'a', bar: 1 }]);
    });
  });

  it('load with documents and queries with promise interface', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocsAndQueries(db);

      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
        builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
      );

      verifySuccessProgress(fulfillProgress!);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      const snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualTestDocs(snap);
    });
  });

  it('load for a second time skips', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocsAndQueries(db);

      await db.loadBundle(
        builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
      );

      let completeCalled = false;
      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      const task = db.loadBundle(
        encoder.encode(
          builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
        )
      );
      task.onProgress(
        progress => {
          progressEvents.push(progress);
        },
        error => {},
        () => {
          completeCalled = true;
        }
      );
      await task;

      expect(completeCalled).to.be.true;
      // No loading actually happened in the second `loadBundle` call only the
      // success progress is recorded.
      expect(progressEvents.length).to.equal(1);
      verifySuccessProgress(progressEvents[0]);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      const snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualTestDocs(snap);
    });
  });

  it('load with documents already pulled from backend', () => {
    return withTestDb(persistence, async db => {
      await db.doc('coll-1/a').set({ k: 'a', bar: 0 });
      await db.doc('coll-1/b').set({ k: 'b', bar: 0 });

      const accumulator = new EventsAccumulator<firestore.QuerySnapshot>();
      db.collection('coll-1').onSnapshot(accumulator.storeEvent);
      await accumulator.awaitEvent();

      const builder = bundleWithTestDocsAndQueries(db);
      const progress = await db.loadBundle(
        // Testing passing in non-string bundles.
        encoder.encode(
          builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
        )
      );

      verifySuccessProgress(progress);
      // The test bundle is holding ancient documents, so no events are
      // generated as a result. The case where a bundle has newer doc than
      // cache can only be tested in spec tests.
      await accumulator.assertNoAdditionalEvents();

      let snap = await (await db.namedQuery('limit'))!.get();
      expect(toDataArray(snap)).to.deep.equal([{ k: 'b', bar: 0 }]);

      snap = await (await db.namedQuery('limit-to-last'))!.get();
      expect(toDataArray(snap)).to.deep.equal([{ k: 'a', bar: 0 }]);
    });
  });

  it('loaded documents should not be GC-ed right away', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocsAndQueries(db);

      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
        builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
      );

      verifySuccessProgress(fulfillProgress!);

      // Read a different collection, this will trigger GC.
      let snap = await db.collection('coll-other').get();
      expect(snap.empty).to.be.true;

      // Read the loaded documents, expecting document in cache. With memory
      // GC, the documents would get GC-ed if we did not hold the document keys
      // in a "umbrella" target. See local_store.ts for details.
      snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualTestDocs(snap);
    });
  });

  it('load with documents from other projects fails', () => {
    return withTestDb(persistence, async db => {
      let builder = bundleWithTestDocsAndQueries(db);
      return withAlternateTestDb(persistence, async otherDb => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await expect(
          otherDb.loadBundle(
            builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
          )
        ).to.be.rejectedWith('Tried to deserialize key from different project');

        // Verify otherDb still functions, despite loaded a problematic bundle.
        builder = bundleWithTestDocsAndQueries(otherDb);
        const finalProgress = await otherDb.loadBundle(
          builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
        );
        verifySuccessProgress(finalProgress);

        // Read from cache. These documents do not exist in backend, so they can
        // only be read from cache.
        const snap = await otherDb
          .collection('coll-1')
          .get({ source: 'cache' });
        verifySnapEqualTestDocs(snap);
      });
    });
  });
});
