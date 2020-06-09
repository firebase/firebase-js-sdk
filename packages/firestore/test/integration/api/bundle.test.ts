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
import { TestBundleBuilder } from '../../util/bundle_data';
import { DatabaseId } from '../../../src/core/database_info';
import { key } from '../../util/helpers';
import { EventsAccumulator } from '../util/events_accumulator';

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
  expect(p.bytesLoaded).lte(p.totalBytes);
  expect(p.documentsLoaded).lte(p.totalDocuments);
  expect(p.documentsLoaded).to.equal(expectedDocuments);
}

apiDescribe('Bundles', (persistence: boolean) => {
  const encoder = new TextEncoder();
  const testDocs: { [key: string]: firestore.DocumentData } = {
    a: { k: { stringValue: 'a' }, bar: { integerValue: 1 } },
    b: { k: { stringValue: 'b' }, bar: { integerValue: 2 } }
  };

  function bundleWithTestDocs(
    db: firestore.FirebaseFirestore
  ): TestBundleBuilder {
    const a = key('coll-1/a');
    const b = key('coll-1/b');
    const builder = new TestBundleBuilder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)._databaseId as DatabaseId
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

  it('load with documents only with on progress and promise interface.', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocs(db);

      const progresses: firestore.LoadBundleTaskProgress[] = [];
      let completeProgress: firestore.LoadBundleTaskProgress,
        fulfillProgress: firestore.LoadBundleTaskProgress;
      await db
        .loadBundle(
          encoder.encode(
            builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
          )
        )
        .onProgress(
          progress => {
            progresses.push(progress);
          },
          err => {
            throw err;
          },
          progress => {
            completeProgress = progress!;
            return progress;
          }
        )
        .then(progress => {
          fulfillProgress = progress;
        })
        .catch(err => {
          throw err;
        });

      verifySuccessProgress(completeProgress!);
      verifySuccessProgress(fulfillProgress!);
      expect(progresses.length).to.equal(3);
      verifyInProgress(progresses[0], 0);
      verifyInProgress(progresses[1], 1);
      verifyInProgress(progresses[2], 2);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      const snap = await db.collection('coll-1').get({ source: 'cache' });
      expect(toDataArray(snap)).to.deep.equal([
        { k: 'a', bar: 1 },
        { k: 'b', bar: 2 }
      ]);
    });
  });

  it('load with documents with promise interface.', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocs(db);

      let fulfillProgress: firestore.LoadBundleTaskProgress;
      await db
        .loadBundle(
          encoder.encode(
            builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
          )
        )
        .then(progress => {
          fulfillProgress = progress;
        })
        .catch(err => {
          throw err;
        });

      verifySuccessProgress(fulfillProgress!);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      const snap = await db.collection('coll-1').get({ source: 'cache' });
      expect(toDataArray(snap)).to.deep.equal([
        { k: 'a', bar: 1 },
        { k: 'b', bar: 2 }
      ]);
    });
  });

  it('load for a second time skips.', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocs(db);

      await db.loadBundle(
        encoder.encode(
          builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
        )
      );

      let completeProgress: firestore.LoadBundleTaskProgress;
      const progresses: firestore.LoadBundleTaskProgress[] = [];
      await db
        .loadBundle(
          encoder.encode(
            builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
          )
        )
        .onProgress(
          progress => {
            progresses.push(progress);
          },
          error => {},
          progress => {
            completeProgress = progress!;
          }
        );

      // No loading actually happened in the second `loadBundle` call.
      expect(progresses).to.be.empty;
      verifySuccessProgress(completeProgress!);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      const snap = await db.collection('coll-1').get({ source: 'cache' });
      expect(toDataArray(snap)).to.deep.equal([
        { k: 'a', bar: 1 },
        { k: 'b', bar: 2 }
      ]);
    });
  });

  it('load with documents already pulled from backend.', () => {
    return withTestDb(persistence, async db => {
      await db.doc('coll-1/a').set({ k: 'a', bar: 0 });
      await db.doc('coll-1/b').set({ k: 'b', bar: 0 });

      const accumulator = new EventsAccumulator<firestore.QuerySnapshot>();
      db.collection('coll-1').onSnapshot(accumulator.storeEvent);
      await accumulator.awaitEvent();

      const builder = bundleWithTestDocs(db);
      const progress = await db.loadBundle(
        encoder.encode(
          builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
        )
      );

      verifySuccessProgress(progress);
      // The test bundle is holding ancient documents, so no events are
      // generated as a result. The case where a bundle has newer doc than
      // cache can only be tested in spec tests.
      await accumulator.assertNoAdditionalEvents();

      const snap = await db.collection('coll-1').get();
      expect(toDataArray(snap)).to.deep.equal([
        { k: 'a', bar: 0 },
        { k: 'b', bar: 0 }
      ]);
    });
  });

  it('load with documents from other projects fails.', () => {
    return withTestDb(persistence, async db => {
      const builder = bundleWithTestDocs(db);
      return withAlternateTestDb(persistence, async otherDb => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        expect(
          otherDb.loadBundle(
            encoder.encode(
              builder.build('test-bundle', { seconds: 1001, nanos: 9999 })
            )
          )
        ).to.be.rejectedWith('Tried to deserialize key from different project');
      });
    });
  });
});
