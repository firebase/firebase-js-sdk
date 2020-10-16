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
import * as testBundles from './test_bundles.json';
import { EventsAccumulator } from '../util/events_accumulator';

// TODO(b/162594908): Move this to api/ instead of api_internal.

export const encoder = new TextEncoder();

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
  function verifySnapEqualTestDocs(snap: firestore.QuerySnapshot): void {
    expect(toDataArray(snap)).to.deep.equal([
      { k: 'a', bar: 1 },
      { k: 'b', bar: 2 }
    ]);
  }

  function bundleString(db: firestore.FirebaseFirestore): string {
    const projectId: string = db.app.options.projectId;
    const bundleString = (testBundles as { [key: string]: string })[projectId];
    expect(bundleString).not.to.be.undefined;
    return bundleString!;
  }

  it('load with documents only with on progress and promise interface', () => {
    return withTestDb(persistence, async db => {
      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      let completeCalled = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const task: firestore.LoadBundleTask = (db as any)._loadBundle(bundleString(db));
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snap = await (await (db as any)._namedQuery('limit'))!.get({
        source: 'cache'
      });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'b', bar: 2 }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snap = await (await (db as any)._namedQuery('limit-to-last'))!.get({
        source: 'cache'
      });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'a', bar: 1 }]);
    });
  });

  it('load with documents and queries with promise interface', () => {
    return withTestDb(persistence, async db => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fulfillProgress: firestore.LoadBundleTaskProgress = await (db as any)._loadBundle(
        bundleString(db)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)._loadBundle(bundleString(db));

      let completeCalled = false;
      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const task: firestore.LoadBundleTask = (db as any)._loadBundle(
        encoder.encode(bundleString(db))
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progress = await (db as any)._loadBundle(
        // Testing passing in non-string bundles.
        encoder.encode(bundleString(db))
      );

      verifySuccessProgress(progress);
      // The test bundle is holding ancient documents, so no events are
      // generated as a result. The case where a bundle has newer doc than
      // cache can only be tested in spec tests.
      await accumulator.assertNoAdditionalEvents();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let snap = await (await (db as any)._namedQuery('limit'))!.get();
      expect(toDataArray(snap)).to.deep.equal([{ k: 'b', bar: 0 }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snap = await (await (db as any)._namedQuery('limit-to-last'))!.get();
      expect(toDataArray(snap)).to.deep.equal([{ k: 'a', bar: 0 }]);
    });
  });

  it('loaded documents should not be GC-ed right away', () => {
    return withTestDb(persistence, async db => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fulfillProgress: firestore.LoadBundleTaskProgress = await (db as any)._loadBundle(
        bundleString(db)
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
      return withAlternateTestDb(persistence, async otherDb => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (otherDb as any)._loadBundle(bundleString(db))
        ).to.be.rejectedWith('Tried to deserialize key from different project');

        // Verify otherDb still functions, despite loaded a problematic bundle.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalProgress = await (otherDb as any)._loadBundle(
          bundleString(otherDb)
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
