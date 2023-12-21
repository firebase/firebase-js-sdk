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

import { User } from '../../../src/auth/user';
import { Query, queryToTarget } from '../../../src/core/query';
import { IndexBackfiller } from '../../../src/index/index_backfiller';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { LocalStore } from '../../../src/local/local_store';
import { newLocalStore } from '../../../src/local/local_store_impl';
import { Persistence } from '../../../src/local/persistence';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { PersistenceTransaction } from '../../../src/local/persistence_transaction';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { newMutationMap } from '../../../src/model/collections';
import { MutableDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import {
  FieldIndex,
  IndexKind,
  IndexOffset
} from '../../../src/model/field_index';
import { Mutation } from '../../../src/model/mutation';
import { AsyncQueue } from '../../../src/util/async_queue';
import { newAsyncQueue } from '../../../src/util/async_queue_impl';
import { key, version } from '../../util/helpers';
import * as Helpers from '../../util/helpers';

import { CountingQueryEngine } from '../local/counting_query_engine';
import { JSON_SERIALIZER } from '../local/persistence_test_helpers';
import * as PersistenceTestHelpers from '../local/persistence_test_helpers';
import { TestDocumentOverlayCache } from '../local/test_document_overlay_cache';
import { TestIndexManager } from '../local/test_index_manager';

describe('IndexedDb IndexBackfiller', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDb IndexBackfiller tests.');
    return;
  }
  genericIndexBackfillerTests(queue =>
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
      Helpers.doc('coll2/docA', 20, { ['bar']: 1 })
    );

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(2);
    }

    {
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(
        version(10)
      );
    }

    {
      const fieldIndex = await getFieldIndex('coll2');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(
        version(20)
      );
    }

    await addDocs(
      Helpers.doc('coll1/docB', 50, { ['foo']: 1 }),
      Helpers.doc('coll1/docC', 51, { ['foo']: 1 }),
      Helpers.doc('coll2/docA', 60, { ['bar']: 1 }),
      Helpers.doc('coll2/docC', 61, { ['bar']: 1 })
    );

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(4);
    }

    {
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(
        version(51)
      );
    }

    {
      const fieldIndex = await getFieldIndex('coll2');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(
        version(61)
      );
    }
  });

  it('Fetches documents after earliest read time', async () => {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll1', {
        fields: [['foo', IndexKind.ASCENDING]],
        offset: new IndexOffset(version(10), DocumentKey.empty(), -1)
      })
    );

    await addDocs(Helpers.doc('coll1/docA', 9, { ['foo']: 1 }));

    // Documents before read time should not be fetched.
    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(0);
    }

    {
      // Read time should be the highest read time from the cache.
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset).to.be.deep.equal(
        new IndexOffset(version(10), DocumentKey.empty(), -1)
      );
    }

    // Documents that are after the earliest read time but before field index read time are fetched.
    await addDocs(Helpers.doc('coll1/docB', 19, { ['boo']: 1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    {
      // Field indexes should now hold the latest read time
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(
        version(19)
      );
    }
  });

  it(`Writes Index Entries`, async () => {
    await addFieldIndex('coll1', 'foo');
    await addFieldIndex('coll2', 'bar');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 10, { ['bar']: 1 }),
      Helpers.doc('coll2/docA', 10, { ['bar']: 1 }),
      Helpers.doc('coll2/docB', 10, { ['bar']: 1 })
    );

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(4);
    }
  });

  it('Writes oldest document first', async () => {
    await addFieldIndex('coll1', 'foo');
    await addDocs(
      Helpers.doc('coll1/docA', 5, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 3, { ['foo']: 1 }),
      Helpers.doc('coll1/docC', 10, { ['foo']: 1 })
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB'
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB',
      'coll1/docC'
    );
  });

  it('Uses DocumentKey Offset for large Snapshots', async () => {
    await addFieldIndex('coll1', 'foo');

    await addDocs(
      Helpers.doc('coll1/docA', 1, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 1, { ['foo']: 1 }),
      Helpers.doc('coll1/docC', 1, { ['foo']: 1 })
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB'
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB',
      'coll1/docC'
    );
  });

  it('Updates collection groups', async () => {
    await addFieldIndex('coll1', 'foo');
    await addFieldIndex('coll2', 'foo');
    await addDocs(
      Helpers.doc('coll1/docA', 10, { ['foo']: 1 }),
      Helpers.doc('coll1/docB', 20, { ['foo']: 1 }),
      Helpers.doc('coll2/docA', 30, { ['foo']: 1 })
    );

    expect(await testIndexManager.getNextCollectionGroupToUpdate()).to.equal(
      'coll1'
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    expect(await testIndexManager.getNextCollectionGroupToUpdate()).to.equal(
      'coll2'
    );
  });

  it('Prioritizes new collection groups', async () => {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll1', {
        fields: [['foo', IndexKind.ASCENDING]],
        sequenceNumber: 1
      })
    );
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll2', {
        fields: [['foo', IndexKind.ASCENDING]],
        sequenceNumber: 2
      })
    );
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll3', {
        fields: [['foo', IndexKind.ASCENDING]],
        sequenceNumber: 0
      })
    );

    await addDocs(
      Helpers.doc('coll1/doc', 10, { ['foo']: 1 }),
      Helpers.doc('coll2/doc', 20, { ['foo']: 1 }),
      Helpers.doc('coll3/doc', 30, { ['foo']: 1 })
    );

    // Check that coll3 is the next collection ID the backfiller should update
    expect(await testIndexManager.getNextCollectionGroupToUpdate()).to.equal(
      'coll3'
    );

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
      Helpers.doc('coll2/docB', 40, { ['foo']: 1 })
    );

    const documentsProcessed = await backfiller.backfill(3);
    expect(documentsProcessed).to.equal(3);

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB'
    );

    await expectQueryResults(
      Helpers.query('coll2', Helpers.orderBy('foo')),
      'coll2/docA'
    );
  });

  it('Uses latest read time for empty collections', async () => {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll', {
        fields: [['foo', IndexKind.ASCENDING]],
        offset: new IndexOffset(version(1), DocumentKey.empty(), -1)
      })
    );
    await addDocs(Helpers.doc('readtime/doc', 1, { ['foo']: 1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(0);
    }

    await addDocs(
      Helpers.doc('coll/ignored', 2, { ['foo']: 1 }),
      Helpers.doc('coll/added', 3, { ['foo']: 1 })
    );

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
      Helpers.doc('coll1/docC', 30, { ['foo']: 1 })
    );
    await addSetMutationToOverlay(5, 'coll1/docD');

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB'
    );

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB',
      'coll1/docC',
      'coll1/docD'
    );
  });

  it('Mutations up to document limit and updates batchId on index', async () => {
    await addFieldIndex('coll1', 'foo');
    await addDocs(Helpers.doc('coll1/docA', 10, { ['foo']: 1 }));
    await addSetMutationToOverlay(2, 'coll1/docB');
    await addSetMutationToOverlay(3, 'coll1/docC');
    await addSetMutationToOverlay(4, 'coll1/docD');

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB'
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
      'coll1/docA',
      'coll1/docB',
      'coll1/docC',
      'coll1/docD'
    );

    {
      const fieldIndex = await getFieldIndex('coll1');
      expect(fieldIndex.indexState.offset.largestBatchId).to.be.equal(4);
    }
  });

  it('Mutation finishes mutation batch even if it exceeds limit', async () => {
    await addFieldIndex('coll1', 'foo');
    await addDocs(Helpers.doc('coll1/docA', 10, { ['foo']: 1 }));
    await addSetMutationToOverlay(2, 'coll1/docB', 'coll1/docC', 'coll1/docD');
    await addSetMutationToOverlay(3, 'coll1/docE');

    const documentsProcessed = await backfiller.backfill(2);
    expect(documentsProcessed).to.equal(4);

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB',
      'coll1/docC',
      'coll1/docD'
    );
  });

  it('Mutations from high water mark', async () => {
    await addFieldIndex('coll1', 'foo');
    await addDocs(Helpers.doc('coll1/docA', 10, { ['foo']: 1 }));
    await addSetMutationToOverlay(3, 'coll1/docB');

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(
      Helpers.query('coll1', Helpers.orderBy('foo')),
      'coll1/docA',
      'coll1/docB'
    );

    await addSetMutationToOverlay(1, 'coll1/docC');
    await addSetMutationToOverlay(2, 'coll1/docD');

    {
      const documentsProcessed = await backfiller.backfill(2);
      expect(documentsProcessed).to.equal(0);
    }
  });

  it('Updates existing doc to new value', async () => {
    const query = Helpers.query(
      'coll',
      Helpers.orderBy('foo'),
      Helpers.filter('foo', '==', 2)
    );
    await addFieldIndex('coll', 'foo');
    await addDocs(Helpers.doc('coll/doc', 10, { ['foo']: 1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(query);

    await addDocs(Helpers.doc('coll/doc', 40, { ['foo']: 2 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(query, 'coll/doc');
  });

  it('Updates docs that no longer match', async () => {
    const query = Helpers.query(
      'coll',
      Helpers.orderBy('foo'),
      Helpers.filter('foo', '>', 0)
    );
    await addFieldIndex('coll', 'foo');
    await addDocs(Helpers.doc('coll/doc', 10, { ['foo']: 1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(query, 'coll/doc');

    await addDocs(Helpers.doc('coll/doc', 40, { ['foo']: -1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(query);
  });

  it('Does not process same document twice', async () => {
    await addFieldIndex('coll', 'foo');
    await addDocs(Helpers.doc('coll/doc', 5, { ['foo']: 1 }));
    await addSetMutationToOverlay(1, 'coll/doc');

    const documentsProcessed = await backfiller.backfill();
    expect(documentsProcessed).to.equal(1);

    const fieldIndex = await getFieldIndex('coll');
    expect(fieldIndex.indexState.offset.readTime).to.be.deep.equal(version(5));
    expect(fieldIndex.indexState.offset.largestBatchId).to.be.equal(1);
  });

  it('Applies set to remote doc', async () => {
    await addFieldIndex('coll', 'foo');
    await addDocs(Helpers.doc('coll/doc', 5, { ['foo']: 1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    const mutation = Helpers.patchMutation('coll/doc', { 'foo': '1' });
    await addMutationToOverlay(1, 'coll/doc', mutation);

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(
      Helpers.query('coll', Helpers.orderBy('foo')),
      'coll/doc'
    );
  });

  it('Applies patch to remote doc', async () => {
    const queryA = Helpers.query('coll', Helpers.orderBy('a'));
    const queryB = Helpers.query('coll', Helpers.orderBy('b'));
    await addFieldIndex('coll', 'a');
    await addFieldIndex('coll', 'b');
    await addDocs(Helpers.doc('coll/doc', 5, { ['a']: 1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(queryA, 'coll/doc');
    await expectQueryResults(queryB);

    const mutation = Helpers.patchMutation('coll/doc', { 'b': '1' });
    await addMutationToOverlay(5, 'coll/doc', mutation);

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    await expectQueryResults(queryA, 'coll/doc');
    await expectQueryResults(queryB, 'coll/doc');
  });

  it('Applies delete to remote doc', async () => {
    const query = Helpers.query('coll', Helpers.filter('foo', '==', 1));
    await addFieldIndex('coll', 'foo');
    await addDocs(Helpers.doc('coll/doc', 5, { ['foo']: 1 }));

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    {
      const matching = await testIndexManager.getDocumentsMatchingTarget(
        queryToTarget(query)
      );
      expect(matching).is.not.eql([]);
    }

    const mutation = Helpers.deleteMutation('coll/doc');
    await addMutationToOverlay(5, 'coll/doc', mutation);

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(1);
    }

    {
      const matching = await testIndexManager.getDocumentsMatchingTarget(
        queryToTarget(query)
      );
      expect(matching).is.eql([]);
    }
  });

  it('Reindexes documents when new index is added', async () => {
    const queryA = Helpers.query('coll', Helpers.orderBy('a'));
    const queryB = Helpers.query('coll', Helpers.orderBy('b'));
    await addFieldIndex('coll', 'a');
    await addDocs(
      Helpers.doc('coll/doc1', 5, { ['a']: 1 }),
      Helpers.doc('coll/doc2', 5, { ['b']: 1 })
    );

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(queryA, 'coll/doc1');
    await expectQueryResults(queryB);

    await addFieldIndex('coll', 'b');

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(2);
    }

    await expectQueryResults(queryA, 'coll/doc1');
    await expectQueryResults(queryB, 'coll/doc2');
  });

  async function addFieldIndex(
    collectionGroup: string,
    fieldName: string
  ): Promise<void> {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex(collectionGroup, {
        fields: [[fieldName, IndexKind.ASCENDING]]
      })
    );
  }

  async function getFieldIndex(collectionGroup: string): Promise<FieldIndex> {
    const fieldIndexes = await testIndexManager.getFieldIndexes(
      collectionGroup
    );
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

  async function expectQueryResults(
    query: Query,
    ...expectedKeys: string[]
  ): Promise<void> {
    const actualKeys = await testIndexManager.getDocumentsMatchingTarget(
      queryToTarget(query)
    );
    if (actualKeys === null) {
      expect(expectedKeys).to.be.empty;
    } else {
      expect(actualKeys.map(k => k.path.canonicalString())).to.eql(
        expectedKeys
      );
    }
  }

  async function addDocs(...docs: MutableDocument[]): Promise<void> {
    await persistence.runTransaction('Prepare for test', 'readwrite', txn =>
      PersistencePromise.forEach(docs, (doc: MutableDocument) =>
        saveDocumentInRemoteDocumentCache(txn, doc)
      )
    );
  }

  async function addSetMutationToOverlay(
    largestBatch: number,
    ...paths: string[]
  ): Promise<void> {
    const mutationMap = newMutationMap();
    for (const path of paths) {
      mutationMap.set(key(path), Helpers.setMutation(path, { foo: 'bar' }));
    }
    await overlayCache.saveOverlays(largestBatch, mutationMap);
  }

  async function addMutationToOverlay(
    largestBatch: number,
    path: string,
    mutation: Mutation
  ): Promise<void> {
    const mutationMap = newMutationMap();
    mutationMap.set(key(path), mutation);
    await overlayCache.saveOverlays(largestBatch, mutationMap);
  }
}
