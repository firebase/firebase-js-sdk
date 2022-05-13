/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect } from 'chai';

import {Persistence} from "../../../src/local/persistence";
import * as PersistenceTestHelpers from "./persistence_test_helpers";
import {newAsyncQueue} from "../../../src/util/async_queue_impl";
import {User} from "../../../src/auth/user";
import {IndexedDbPersistence} from "../../../src/local/indexeddb_persistence";
import {AsyncQueue} from "../../../src/util/async_queue";
import * as Helpers from '../../util/helpers';
import {
  FieldIndex,
  IndexKind,
  IndexOffset
} from "../../../src/model/field_index";
import {PersistenceTransaction} from "../../../src/local/persistence_transaction";
import {PersistencePromise} from "../../../src/local/persistence_promise";
import {key, TestSnapshotVersion, version} from "../../util/helpers";
import {RemoteDocumentCache} from "../../../src/local/remote_document_cache";
import {MutableDocument} from "../../../src/model/document";
import {IndexBackfiller} from "../../../src/local/index_backfiller";
import {LocalStore} from "../../../src/local/local_store";
import {TestIndexManager} from "./test_index_manager";
import {JSON_SERIALIZER} from "./persistence_test_helpers";
import {newLocalStore} from "../../../src/local/local_store_impl";
import {CountingQueryEngine} from "./counting_query_engine";
import {DocumentKey} from "../../../src/model/document_key";
import {Query, queryToTarget} from '../../../src/core/query';
import {DocumentOverlayCache} from "../../../src/local/document_overlay_cache";
import {newMutationMap} from "../../../src/model/collections";
import {TestDocumentOverlayCache} from "./test_document_overlay_cache";

describe.only('IndexedDb IndexBackfiller', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDb IndexBackfiller tests.');
    return;
  }
  genericIndexBackfillerTests((queue) =>
    PersistenceTestHelpers.testIndexedDbPersistence({ queue })
  );
});

function genericIndexBackfillerTests(
  newPersistence: (queue: AsyncQueue) => Promise<Persistence>
): void {
  const queue = newAsyncQueue();

  beforeEach(async () => {
    await queue.enqueue(async () => {
      if (persistence && persistence.started) {
        await persistence.shutdown();
        await PersistenceTestHelpers.clearTestPersistence();
      }
    });
    persistence = await newPersistence(queue);
    const indexManager = persistence.getIndexManager(User.UNAUTHENTICATED);
    remoteDocumentCache = persistence.getRemoteDocumentCache();
    remoteDocumentCache.setIndexManager(indexManager);
    const queryEngine = new CountingQueryEngine();
    const localStore: LocalStore = newLocalStore(
      persistence,
      queryEngine,
      User.UNAUTHENTICATED,
      JSON_SERIALIZER
    );
    backfiller = new IndexBackfiller(localStore, persistence);

    testIndexManager = new TestIndexManager(persistence, indexManager);
    overlayCache = new TestDocumentOverlayCache(
      persistence,
      persistence.getDocumentOverlayCache(User.UNAUTHENTICATED)
    );
  });

  afterEach(async () => {
    await queue.enqueue(async () => {
      await persistence.shutdown();
      await PersistenceTestHelpers.clearTestPersistence();
    });
  });

  let persistence: Persistence;
  let testIndexManager: TestIndexManager;
  let overlayCache: TestDocumentOverlayCache;
  let remoteDocumentCache: RemoteDocumentCache;
  let backfiller: IndexBackfiller;

  it('Writes latest read time to FieldIndex on completion', async () => {
    await addFieldIndex('coll1', 'foo');
    await addFieldIndex('coll2', 'bar');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
      Helpers.doc('coll2/docA', 20, { ['bar']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(2);
    }

    {
      const fieldIndex = await getFieldIndex( 'coll1');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(version(10));
    }

    {
      const fieldIndex = await getFieldIndex( 'coll2');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(version(20));
    }

    await addDocs(
      Helpers.doc('coll1/docB', 50, { ['foo']: 1 }),
      Helpers.doc('coll1/docC', 51, { ['foo']: 1 }),
      Helpers.doc('coll2/docA', 60, { ['bar']: 1 }),
      Helpers.doc('coll2/docC', 61, { ['bar']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(4);
    }

    {
      const fieldIndex = await getFieldIndex( 'coll1');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(version(51));
    }

    {
      const fieldIndex = await getFieldIndex( 'coll2');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(version(61));
    }
  });

  it('Fetches documents after earliest read time', async () => {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll1', {
        fields: [['foo', IndexKind.ASCENDING]],
        offset: new IndexOffset(version(10), DocumentKey.empty(), -1)
      })
    );

    // Documents before read time should not be fetched.
    await addDocs(
      Helpers.doc('coll1/docA', 9, { ['foo']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(0);
    }

    { // Read time should be the highest read time from the cache.
      const fieldIndex = await getFieldIndex('coll1')
      expect(fieldIndex.indexState.offset).to.be.deep.equal(
        new IndexOffset(version(10), DocumentKey.empty(), -1)
      );
    }

    // Documents that are after the earliest read time but before field index read time are fetched.
    await addDocs(
      Helpers.doc('coll1/docB', 19, { ['boo']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    { // Field indexes should now hold the latest read time
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(version(19));
    }
  });

  it(`Writes Index Entries`, async () => {
    await addFieldIndex('coll1', 'foo');
    await addFieldIndex('coll2', 'bar');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 10, { ['bar']: 1 }),
      Helpers.doc('coll2/docA', 10, { ['bar']: 1 }),
      Helpers.doc('coll2/docB', 10, { ['bar']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(4);
    }

  })

  it('Writes oldest document first', async () => {
    await addFieldIndex('coll1', 'foo');
    await addDocs(
      Helpers.doc('coll1/docA', 5, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 3, { ['foo']: 1 }),
      Helpers.doc('coll1/docC', 10, { ['foo']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA', 'coll1/docB'
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA', 'coll1/docB', 'coll1/docC'
    );
  });

  it('Updates collection groups', async () => {
    await addFieldIndex('coll1', 'foo');
    await addFieldIndex('coll2', 'foo');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 20, { ['foo']: 1 }),
      Helpers.doc('coll2/docA', 30, { ['foo']: 1 }),
    )

    expect(await testIndexManager.getNextCollectionGroupToUpdate()).to.equal('coll1');

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    expect(await testIndexManager.getNextCollectionGroupToUpdate()).to.equal('coll2');
  });

  it('Prioritizes new collection groups', async () => {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll1', { fields: [['foo', IndexKind.ASCENDING]], sequenceNumber: 1 })
    );
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll2', { fields: [['foo', IndexKind.ASCENDING]], sequenceNumber: 2 })
    );
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll3', { fields: [['foo', IndexKind.ASCENDING]], sequenceNumber: 0 })
    );

    await addDocs(
      Helpers.doc('coll1/doc', 10, { ['foo']: 1 }),
      Helpers.doc('coll2/doc', 20, { ['foo']: 1 }),
      Helpers.doc('coll3/doc', 30, { ['foo']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill(1);
      expect(documentsProcessed).to.equal(1);
    }

    // Check that coll3 is the next collection ID the backfiller should update
    expect(await testIndexManager.getNextCollectionGroupToUpdate()).to.equal('coll3');

    {
      const documentsProcessed = await backfiller.backfill(1);
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(
      Helpers.query('coll3', Helpers.orderBy('foo')),
      'coll3/doc'
    );
  });

  it('Writes until cap', async () => {
    await addFieldIndex('coll1', 'foo');
    await addFieldIndex('coll2', 'foo');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 20, { ['foo']: 1 }),
      Helpers.doc('coll2/docA', 30, { ['foo']: 1 }),
      Helpers.doc('coll2/docB', 40, { ['foo']: 1 }),
    )

    const documentsProcessed = await backfiller.backfill(3);
    expect(documentsProcessed).to.equal(3);

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA', 'coll1/docB'
    );

    await expectQueryResults(
      Helpers.query('coll2', Helpers.orderBy('foo')),
      'coll2/docA'
    );
  });

  it('Uses latest read time for empty collections', async () => {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll1', {
        fields: [['foo', IndexKind.ASCENDING]],
        offset: new IndexOffset(version(1), DocumentKey.empty(), -1)
      })
    );
    await addDocs(
      Helpers.doc('readtime/doc', 1, { ['foo']: 1 })
    );

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(0);
    }

    await addDocs(
      Helpers.doc('coll/ignored', 2, { ['foo']: 1 }),
      Helpers.doc('coll/added', 3, { ['foo']: 1 }),
    )

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(2);
    }
  });

  it('Handles local mutations after remote docs', async () => {
    await addFieldIndex('coll1', 'foo');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 20, { ['foo']: 1 }),
      Helpers.doc('coll1/docC', 30, { ['foo']: 1 }),
    )
    await addSetMutationToOverlay(5, 'coll1/docD');

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA', 'coll1/docB'
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA', 'coll1/docB', 'coll1/docC', 'coll1/docD'
    );
  })

  it('Mutations up to document limit and updates batchId on index', async () => {
    await addFieldIndex('coll1', 'foo');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
    )
    await addSetMutationToOverlay(2, 'coll1/docB');
    await addSetMutationToOverlay(3, 'coll1/docC');
    await addSetMutationToOverlay(4, 'coll1/docD');

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA', 'coll1/docB'
    );

    {
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset.largestBatchId).to.be.equal(2);
    }

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA', 'coll1/docB', 'coll1/docC', 'coll1/docD'
    );

    {
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset.largestBatchId).to.be.equal(4);
    }
  })
// @Test
// public void testBackfillMutationsUpToDocumentLimitAndUpdatesBatchIdOnIndex() {
//     backfiller.setMaxDocumentsToProcess(2);
//     addFieldIndex("coll1", "foo");
//     addDoc("coll1/docA", version(10), "foo", 1);
//     addSetMutationsToOverlay(2, "coll1/docB");
//     addSetMutationsToOverlay(3, "coll1/docC");
//     addSetMutationsToOverlay(4, "coll1/docD");
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(2, documentsProcessed);
//     expectQueryResults("coll1", "coll1/docA", "coll1/docB");
//     FieldIndex fieldIndex = indexManager.getFieldIndexes("coll1").iterator().next();
//     assertEquals(2, fieldIndex.getIndexState().getOffset().getLargestBatchId());
//
//     documentsProcessed = backfiller.backfill();
//     assertEquals(2, documentsProcessed);
//     expectQueryResults("coll1", "coll1/docA", "coll1/docB", "coll1/docC", "coll1/docD");
//     fieldIndex = indexManager.getFieldIndexes("coll1").iterator().next();
//     assertEquals(4, fieldIndex.getIndexState().getOffset().getLargestBatchId());
//   }
//
// @Test
// public void testBackfillMutationFinishesMutationBatchEvenIfItExceedsLimit() {
//     backfiller.setMaxDocumentsToProcess(2);
//     addFieldIndex("coll1", "foo");
//     addDoc("coll1/docA", version(10), "foo", 1);
//     addSetMutationsToOverlay(2, "coll1/docB", "coll1/docC", "coll1/docD");
//     addSetMutationsToOverlay(3, "coll1/docE");
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(4, documentsProcessed);
//     expectQueryResults("coll1", "coll1/docA", "coll1/docB", "coll1/docC", "coll1/docD");
//   }
//
// @Test
// public void testBackfillMutationsFromHighWaterMark() {
//     backfiller.setMaxDocumentsToProcess(2);
//     addFieldIndex("coll1", "foo");
//     addDoc("coll1/docA", version(10), "foo", 1);
//     addSetMutationsToOverlay(3, "coll1/docB");
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(2, documentsProcessed);
//     expectQueryResults("coll1", "coll1/docA", "coll1/docB");
//
//     addSetMutationsToOverlay(1, "coll1/docC");
//     addSetMutationsToOverlay(2, "coll1/docD");
//     documentsProcessed = backfiller.backfill();
//     assertEquals(0, documentsProcessed);
//   }
//
// @Test
// public void testBackfillUpdatesExistingDocToNewValue() {
//     Query queryA = query("coll").filter(filter("foo", "==", 2));
//     addFieldIndex("coll", "foo");
//
//     addDoc("coll/doc", version(10), "foo", 1);
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//     expectQueryResults(queryA);
//
//     // Update doc to new remote version with new value.
//     addDoc("coll/doc", version(40), "foo", 2);
//     documentsProcessed = backfiller.backfill();
//
//     expectQueryResults(queryA, "coll/doc");
//   }
//
// @Test
// public void testBackfillUpdatesDocsThatNoLongerMatch() {
//     Query queryA = query("coll").filter(filter("foo", ">", 0));
//     addFieldIndex("coll", "foo");
//     addDoc("coll/doc", version(10), "foo", 1);
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//     expectQueryResults(queryA, "coll/doc");
//
//     // Update doc to new remote version with new value that doesn't match field index.
//     addDoc("coll/doc", version(40), "foo", -1);
//
//     documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//     expectQueryResults(queryA);
//   }
//
// @Test
// public void testBackfillDoesNotProcessSameDocumentTwice() {
//     addFieldIndex("coll", "foo");
//     addDoc("coll/doc", version(5), "foo", 1);
//     addSetMutationsToOverlay(1, "coll/doc");
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//
//     FieldIndex fieldIndex = indexManager.getFieldIndexes("coll").iterator().next();
//     assertEquals(version(5), fieldIndex.getIndexState().getOffset().getReadTime());
//     assertEquals(1, fieldIndex.getIndexState().getOffset().getLargestBatchId());
//   }
//
// @Test
// public void testBackfillAppliesSetToRemoteDoc() {
//     addFieldIndex("coll", "foo");
//     addDoc("coll/doc", version(5), "boo", 1);
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//
//     Mutation patch = patchMutation("coll/doc", map("foo", 1));
//     addMutationToOverlay("coll/doc", patch);
//     documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//
//     expectQueryResults("coll", "coll/doc");
//   }
//
// @Test
// public void testBackfillAppliesPatchToRemoteDoc() {
//     Query queryA = query("coll").orderBy(orderBy("a"));
//     Query queryB = query("coll").orderBy(orderBy("b"));
//
//     addFieldIndex("coll", "a");
//     addFieldIndex("coll", "b");
//     addDoc("coll/doc", version(5), "a", 1);
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//
//     expectQueryResults(queryA, "coll/doc");
//     expectQueryResults(queryB);
//
//     Mutation patch = patchMutation("coll/doc", map("b", 1));
//     addMutationToOverlay("coll/doc", patch);
//     documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//
//     expectQueryResults(queryA, "coll/doc");
//     expectQueryResults(queryB, "coll/doc");
//   }
//
// @Test
// public void testBackfillAppliesDeleteToRemoteDoc() {
//     addFieldIndex("coll", "foo");
//     addDoc("coll/doc", version(5), "foo", 1);
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//
//     Mutation delete = deleteMutation("coll/doc");
//     addMutationToOverlay("coll/doc", delete);
//     documentsProcessed = backfiller.backfill();
//     assertEquals(1, documentsProcessed);
//
//     Target target = query("coll").filter(filter("foo", "==", 2)).toTarget();
//     List<DocumentKey> matching = indexManager.getDocumentsMatchingTarget(target);
//     assertTrue(matching.isEmpty());
//   }
//
// @Test
// public void testReindexesDocumentsWhenNewIndexIsAdded() {
//     Query queryA = query("coll").orderBy(orderBy("a"));
//     Query queryB = query("coll").orderBy(orderBy("b"));
//
//     addFieldIndex("coll", "a");
//     addDoc("coll/doc1", version(1), "a", 1);
//     addDoc("coll/doc2", version(1), "b", 1);
//
//     int documentsProcessed = backfiller.backfill();
//     assertEquals(2, documentsProcessed);
//     expectQueryResults(queryA, "coll/doc1");
//     expectQueryResults(queryB);
//
//     addFieldIndex("coll", "b");
//     documentsProcessed = backfiller.backfill();
//     assertEquals(2, documentsProcessed);
//
//     expectQueryResults(queryA, "coll/doc1");
//     expectQueryResults(queryB, "coll/doc2");
//   }
//
  async function addFieldIndex(collectionGroup: string, foo: string) {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex(collectionGroup, {fields: [[foo, IndexKind.ASCENDING]]})
    );
  }

  async function getFieldIndex(collectionGroup: string): Promise<FieldIndex> {
    const fieldIndexes = await testIndexManager.getFieldIndexes(collectionGroup)
    expect(fieldIndexes).length(1);
    return fieldIndexes[0];
  }

  function saveDocumentInRemoteDocumentCache(
    txn: PersistenceTransaction,
    doc: MutableDocument
  ): PersistencePromise<void> {
    const changeBuffer = remoteDocumentCache.newChangeBuffer();
    return changeBuffer.getEntry(txn, doc.key).next(() => {
      changeBuffer.addEntry(doc);
      return changeBuffer.apply(txn);
    });
  }

  async function expectQueryResults(query: Query, ...expectedKeys: string[]) {
    const actualKeys = await testIndexManager.getDocumentsMatchingTarget(queryToTarget(query));
    if (actualKeys === null) {
      expect(expectedKeys).to.be.empty;
    } else {
      expect(actualKeys.map(k => k.path.canonicalString())).to.eql(expectedKeys);
    }
  }

  async function addDocs(...docs: MutableDocument[]) {
    await persistence.runTransaction(
      'Prepare for test',
      'readwrite',
      txn => PersistencePromise.forEach(
        docs,
        (doc: MutableDocument) => saveDocumentInRemoteDocumentCache(txn, doc)
      )
    );
  }

  async function addSetMutationToOverlay(largestBatch: number, path: string) {
    const mutationMap = newMutationMap();
    mutationMap.set(key(path), Helpers.setMutation(path, {foo: 'bar'}))
    await overlayCache.saveOverlays(largestBatch, mutationMap)
  }
}
