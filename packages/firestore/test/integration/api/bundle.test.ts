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

/**
 * Returns a testing bundle string for the given projectId.
 *
 * The function is commented out, but kept for documentation purpose. It accesses SDK
 * internals, which is not available in test:minified.
 *
 * The tests uses `BUNDLE_TEMPLATE` as test data instead, which is generated from this function
 * and replaced with different project IDs when required. To update `BUNDLE_TEMPALTE`, you
 * need to uncomment the function, and copy/paste from the console output to `BUNDLE_TEMPALTE`.
 * It is manual, but should be required only rarely.
 */
/*
function bundleWithTestDocsAndQueries(projectId: string): string {
  const testDocs: { [key: string]: firestore.DocumentData } = {
    a: { k: { stringValue: 'a' }, bar: { integerValue: 1 } },
    b: { k: { stringValue: 'b' }, bar: { integerValue: 2 } }
  };

  const a = key('coll-1/a');
  const b = key('coll-1/b');
  const builder = new TestBundleBuilder(new DatabaseId(projectId));

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

  return builder
    .build('test-bundle', { seconds: 1001, nanos: 9999 })
    .toString();
}

console.log(
  `${bundleWithTestDocsAndQueries('test-project')}`
);
 */

const TEMPLATE_PROJECT_ID = 'test-project';
const BUNDLE_TEMPLATE =
  '125{"metadata":{"id":"test-bundle","createTime":{"seconds":1001,"nanos":9999},"version":1,"totalDocuments":2,"totalBytes":1503}}374{"namedQuery":{"name":"limit","readTime":{"seconds":1000,"nanos":9999},"bundledQuery":{"parent":"projects/test-project/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"coll-1"}],"orderBy":[{"field":{"fieldPath":"bar"},"direction":"DESCENDING"},{"field":{"fieldPath":"__name__"},"direction":"DESCENDING"}],"limit":{"value":1}},"limitType":"FIRST"}}}381{"namedQuery":{"name":"limit-to-last","readTime":{"seconds":1000,"nanos":9999},"bundledQuery":{"parent":"projects/test-project/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"coll-1"}],"orderBy":[{"field":{"fieldPath":"bar"},"direction":"DESCENDING"},{"field":{"fieldPath":"__name__"},"direction":"DESCENDING"}],"limit":{"value":1}},"limitType":"LAST"}}}147{"documentMetadata":{"name":"projects/test-project/databases/(default)/documents/coll-1/a","readTime":{"seconds":1000,"nanos":9999},"exists":true}}218{"document":{"name":"projects/test-project/databases/(default)/documents/coll-1/a","createTime":{"seconds":1,"nanos":9},"updateTime":{"seconds":1,"nanos":9},"fields":{"k":{"stringValue":"a"},"bar":{"integerValue":1}}}}147{"documentMetadata":{"name":"projects/test-project/databases/(default)/documents/coll-1/b","readTime":{"seconds":1000,"nanos":9999},"exists":true}}218{"document":{"name":"projects/test-project/databases/(default)/documents/coll-1/b","createTime":{"seconds":1,"nanos":9},"updateTime":{"seconds":1,"nanos":9},"fields":{"k":{"stringValue":"b"},"bar":{"integerValue":2}}}}';

apiDescribe('Bundles', (persistence: boolean) => {
  function verifySnapEqualTestDocs(snap: firestore.QuerySnapshot): void {
    expect(toDataArray(snap)).to.deep.equal([
      { k: 'a', bar: 1 },
      { k: 'b', bar: 2 }
    ]);
  }

  /**
   * Returns a valid bundle string from replacing project id in `BUNDLE_TEMPLATE` with the given
   * db project id (also recalculate length prefixes).
   */
  function bundleString(db: firestore.FirebaseFirestore): string {
    const projectId: string = db.app.options.projectId;

    // Extract elements from BUNDLE_TEMPLATE, and replace project ID.
    let runningElement: string = '';
    const elements: string[] = [];
    let depth = 0;
    for (const char of BUNDLE_TEMPLATE) {
      if (char === '{') {
        runningElement += char;
        depth += 1;
      } else if (depth > 0) {
        runningElement += char;
      }

      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          // Obviously assuming TEMPLATE_PROJECT_ID only appear as project id in
          // the bundle, not as document id or filed value.
          elements.push(runningElement.replace(TEMPLATE_PROJECT_ID, projectId));
          runningElement = '';
        }
      }
    }

    // Recalculating length prefixes for elements that are not BundleMetadata.
    let bundleContent = '';
    for (const element of elements.slice(1)) {
      const length = encoder.encode(element).byteLength;
      bundleContent += `${length}${element}`;
    }

    // Update BundleMetadata with new totalBytes.
    const totalBytes = encoder.encode(bundleContent).byteLength;
    const metadata = JSON.parse(elements[0]);
    metadata.metadata.totalBytes = totalBytes;
    const metadataContent = JSON.stringify(metadata);
    const metadataLength = encoder.encode(metadataContent).byteLength;
    return `${metadataLength}${metadataContent}${bundleContent}`;
  }

  it('load with documents only with on progress and promise interface', () => {
    return withTestDb(persistence, async db => {
      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      let completeCalled = false;
      const task: firestore.LoadBundleTask = db.loadBundle(bundleString(db));
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

      snap = await (await db.namedQuery('limit'))!.get({
        source: 'cache'
      });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'b', bar: 2 }]);

      snap = await (await db.namedQuery('limit-to-last'))!.get({
        source: 'cache'
      });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'a', bar: 1 }]);
    });
  });

  it('load with documents and queries with promise interface', () => {
    return withTestDb(persistence, async db => {
      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
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
      await db.loadBundle(bundleString(db));

      let completeCalled = false;
      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      const task: firestore.LoadBundleTask = db.loadBundle(
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

      const progress = await db.loadBundle(
        // Testing passing in non-string bundles.
        encoder.encode(bundleString(db))
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
      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
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
        await expect(otherDb.loadBundle(bundleString(db))).to.be.rejectedWith(
          'Tried to deserialize key from different project'
        );

        // Verify otherDb still functions, despite loaded a problematic bundle.
        const finalProgress = await otherDb.loadBundle(bundleString(otherDb));
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
