/**
 * @license
 * Copyright 2019 Google LLC
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

import { Timestamp } from '../../../src';
import { User } from '../../../src/auth/user';
import {
  LimitType,
  Query,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithLimit
} from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { View } from '../../../src/core/view';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  INDEXING_ENABLED,
  INDEXING_SCHEMA_VERSION
} from '../../../src/local/indexeddb_schema';
import { LocalDocumentsView } from '../../../src/local/local_documents_view';
import { MutationQueue } from '../../../src/local/mutation_queue';
import { Persistence } from '../../../src/local/persistence';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { PersistenceTransaction } from '../../../src/local/persistence_transaction';
import { QueryEngine } from '../../../src/local/query_engine';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { TargetCache } from '../../../src/local/target_cache';
import {
  documentKeySet,
  documentMap,
  DocumentMap
} from '../../../src/model/collections';
import { Document, MutableDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { DocumentSet } from '../../../src/model/document_set';
import {
  IndexKind,
  IndexOffset,
  indexOffsetComparator,
  newIndexOffsetFromDocument
} from '../../../src/model/field_index';
import { Mutation } from '../../../src/model/mutation';
import { debugAssert } from '../../../src/util/assert';
import {
  doc,
  fieldIndex,
  filter,
  key,
  orderBy,
  patchMutation,
  query,
  setMutation,
  version
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestIndexManager } from './test_index_manager';

const TEST_TARGET_ID = 1;

const MATCHING_DOC_A = doc('coll/a', 1, { matches: true, order: 1 });
const NON_MATCHING_DOC_A = doc('coll/a', 1, { matches: false, order: 1 });
const UPDATED_DOC_A = doc('coll/a', 11, { matches: true, order: 1 });
const MATCHING_DOC_B = doc('coll/b', 1, { matches: true, order: 2 });
const UPDATED_MATCHING_DOC_B = doc('coll/b', 11, { matches: true, order: 2 });

const LAST_LIMBO_FREE_SNAPSHOT = version(10);
const MISSING_LAST_LIMBO_FREE_SNAPSHOT = SnapshotVersion.min();

/**
 * A LocalDocumentsView wrapper that inspects the arguments to
 * `getDocumentsMatchingQuery()` to detect index-free execution.
 */
class TestLocalDocumentsView extends LocalDocumentsView {
  expectFullCollectionScan: boolean | undefined;

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    offset: IndexOffset
  ): PersistencePromise<DocumentMap> {
    const skipsDocumentsBeforeSnapshot =
      indexOffsetComparator(IndexOffset.min(), offset) !== 0;

    expect(skipsDocumentsBeforeSnapshot).to.eq(
      !this.expectFullCollectionScan,
      'Observed query execution mode did not match expectation'
    );

    return super.getDocumentsMatchingQuery(transaction, query, offset);
  }
}

describe('MemoryQueryEngine', async () => {
  genericQueryEngineTest(
    /* durable= */ false,
    persistenceHelpers.testMemoryEagerPersistence
  );
});

describe('IndexedDbQueryEngine', async () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbQueryEngine tests.');
    return;
  }

  let persistencePromise: Promise<Persistence>;
  beforeEach(async () => {
    persistencePromise = persistenceHelpers.testIndexedDbPersistence({
      schemaVersion: INDEXING_SCHEMA_VERSION
    });
  });

  genericQueryEngineTest(/* durable= */ true, () => persistencePromise);
});

/**
 * Defines the set of tests to run against the memory and IndexedDB-backed
 * query engine.
 *
 * @param durable Whether the provided persistence is backed by IndexedDB
 * @param persistencePromise A factory function that returns an initialized
 * persistence layer.
 */
function genericQueryEngineTest(
  durable: boolean,
  persistencePromise: () => Promise<Persistence>
): void {
  let persistence!: Persistence;
  let remoteDocumentCache!: RemoteDocumentCache;
  let targetCache!: TargetCache;
  let queryEngine!: QueryEngine;
  let indexManager!: TestIndexManager;
  let mutationQueue!: MutationQueue;
  let localDocuments!: TestLocalDocumentsView;

  /** Adds the provided documents to the query target mapping.  */
  function persistQueryMapping(...documentKeys: DocumentKey[]): Promise<void> {
    return persistence.runTransaction(
      'persistQueryMapping',
      'readwrite',
      txn => {
        const remoteKeys = documentKeySet(...documentKeys);
        return targetCache.addMatchingKeys(txn, remoteKeys, TEST_TARGET_ID);
      }
    );
  }

  /** Adds the provided documents to the remote document cache.  */
  function addDocument(...docs: MutableDocument[]): Promise<void> {
    return persistence.runTransaction('addDocument', 'readwrite', txn => {
      const changeBuffer = remoteDocumentCache.newChangeBuffer();
      return PersistencePromise.forEach(docs, (doc: MutableDocument) =>
        changeBuffer
          .getEntry(txn, doc.key)
          .next(() => changeBuffer.addEntry(doc))
      ).next(() => changeBuffer.apply(txn));
    });
  }

  /** Adds a mutation to the mutation queue. */
  async function addMutation(mutation: Mutation): Promise<void> {
    await persistence.runTransaction('addMutation', 'readwrite', txn =>
      mutationQueue.addMutationBatch(txn, Timestamp.now(), [], [mutation])
    );
  }

  async function expectOptimizedCollectionQuery<T>(
    op: () => Promise<T>
  ): Promise<T> {
    try {
      localDocuments.expectFullCollectionScan = false;
      return await op();
    } finally {
      localDocuments.expectFullCollectionScan = undefined;
    }
  }

  async function expectFullCollectionQuery<T>(
    op: () => Promise<T>
  ): Promise<T> {
    try {
      localDocuments.expectFullCollectionScan = true;
      return await op();
    } finally {
      localDocuments.expectFullCollectionScan = undefined;
    }
  }

  function runQuery(
    query: Query,
    lastLimboFreeSnapshot: SnapshotVersion
  ): Promise<DocumentSet> {
    debugAssert(
      localDocuments.expectFullCollectionScan !== undefined,
      'Encountered runQuery() call not wrapped in ' +
        'expectOptimizedCollectionQuery()/expectFullCollectionQuery()'
    );

    return persistence.runTransaction('runQuery', 'readonly', txn => {
      return targetCache
        .getMatchingKeysForTargetId(txn, TEST_TARGET_ID)
        .next(remoteKeys => {
          return queryEngine
            .getDocumentsMatchingQuery(
              txn,
              query,
              lastLimboFreeSnapshot,
              remoteKeys
            )
            .next(docs => {
              const view = new View(query, remoteKeys);
              const viewDocChanges = view.computeDocChanges(docs);
              return view.applyChanges(
                viewDocChanges,
                /*updateLimboDocuments=*/ true
              ).snapshot!.docs;
            });
        });
    });
  }

  beforeEach(async () => {
    persistence = await persistencePromise();
    targetCache = persistence.getTargetCache();
    queryEngine = new QueryEngine();

    const underlyingIndexManager = persistence.getIndexManager(
      User.UNAUTHENTICATED
    );
    remoteDocumentCache = persistence.getRemoteDocumentCache();
    remoteDocumentCache.setIndexManager(underlyingIndexManager);
    mutationQueue = persistence.getMutationQueue(
      User.UNAUTHENTICATED,
      underlyingIndexManager
    );

    localDocuments = new TestLocalDocumentsView(
      remoteDocumentCache,
      mutationQueue,
      underlyingIndexManager
    );
    queryEngine.initialize(localDocuments, underlyingIndexManager);

    indexManager = new TestIndexManager(persistence, underlyingIndexManager);
  });

  afterEach(async () => {
    if (persistence.started) {
      await persistence.shutdown();
      await persistenceHelpers.clearTestPersistence();
    }
  });

  it('uses target mapping for initial view', async () => {
    const query1 = query('coll', filter('matches', '==', true));

    await addDocument(MATCHING_DOC_A, MATCHING_DOC_B);
    await persistQueryMapping(MATCHING_DOC_A.key, MATCHING_DOC_B.key);

    const docs = await expectOptimizedCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_A, MATCHING_DOC_B]);
  });

  it('filters non-matching changes since initial results', async () => {
    const query1 = query('coll', filter('matches', '==', true));

    await addDocument(MATCHING_DOC_A, MATCHING_DOC_B);
    await persistQueryMapping(MATCHING_DOC_A.key, MATCHING_DOC_B.key);

    // Add a mutation that is not yet part of query's set of remote keys.
    await addMutation(patchMutation('coll/a', { 'matches': false }));

    const docs = await expectOptimizedCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('includes changes since initial results', async () => {
    const query1 = query('coll', filter('matches', '==', true));

    await addDocument(MATCHING_DOC_A, MATCHING_DOC_B);
    await persistQueryMapping(MATCHING_DOC_A.key, MATCHING_DOC_B.key);

    let docs = await expectOptimizedCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_A, MATCHING_DOC_B]);

    // Add a mutated document that is not yet part of query's set of remote keys.
    await addDocument(UPDATED_MATCHING_DOC_B);

    docs = await expectOptimizedCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_A, UPDATED_MATCHING_DOC_B]);
  });

  it('does not use initial results without limbo free snapshot version', async () => {
    const query1 = query('coll', filter('matches', '==', true));

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, []);
  });

  it('does not use initial results for unfiltered collection query', async () => {
    const query1 = query('coll');

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, []);
  });

  it('does not use initial results for limit query with document removal', async () => {
    const query1 = queryWithLimit(
      query('coll', filter('matches', '==', true)),
      1,
      LimitType.First
    );

    // While the backend would never add DocA to the set of remote keys, this
    // allows us to easily simulate what would happen when a document no longer
    // matches due to an out-of-band update.
    await addDocument(NON_MATCHING_DOC_A);
    await persistQueryMapping(NON_MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limitToLast query with document removal', async () => {
    const query1 = queryWithLimit(
      query('coll', filter('matches', '==', true), orderBy('order', 'desc')),
      1,
      LimitType.Last
    );

    // While the backend would never add DocA to the set of remote keys, this
    // allows us to easily simulate what would happen when a document no longer
    // matches due to an out-of-band update.
    await addDocument(NON_MATCHING_DOC_A);
    await persistQueryMapping(NON_MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limit query when last document has pending write', async () => {
    const query1 = queryWithLimit(
      query('coll', filter('matches', '==', true), orderBy('order', 'desc')),
      1,
      LimitType.First
    );

    // Add a query mapping for a document that matches, but that sorts below
    // another document due to a pending write.
    await addDocument(MATCHING_DOC_A);
    await addMutation(patchMutation('coll/a', { order: 1 }));
    await persistQueryMapping(MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limitToLast query when first document has pending write', async () => {
    const query1 = queryWithLimit(
      query('coll', filter('matches', '==', true), orderBy('order')),
      1,
      LimitType.Last
    );
    // Add a query mapping for a document that matches, but that sorts below
    // another document due to a pending write.
    await addDocument(MATCHING_DOC_A);
    await addMutation(patchMutation('coll/a', { order: 2 }));
    await persistQueryMapping(MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limit query when last document has been updated out of band', async () => {
    const query1 = queryWithLimit(
      query('coll', filter('matches', '==', true), orderBy('order', 'desc')),
      1,
      LimitType.First
    );

    // Add a query mapping for a document that matches, but that sorts below
    // another document based on an update that the SDK received after the
    // query's snapshot was persisted.
    await addDocument(UPDATED_DOC_A);
    await persistQueryMapping(UPDATED_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limitToLast query when first document in limit has been updated out of band', async () => {
    const query1 = queryWithLimit(
      query('coll', filter('matches', '==', true), orderBy('order')),
      1,
      LimitType.Last
    );
    // Add a query mapping for a document that matches, but that sorts below
    // another document based on an update that the SDK received after the
    // query's snapshot was persisted.
    await addDocument(UPDATED_DOC_A);
    await persistQueryMapping(UPDATED_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('uses initial results if last document in limit is unchanged', async () => {
    const query1 = queryWithLimit(
      query('coll', orderBy('order')),
      2,
      LimitType.First
    );

    await addDocument(doc('coll/a', 1, { order: 1 }));
    await addDocument(doc('coll/b', 1, { order: 3 }));
    await persistQueryMapping(key('coll/a'), key('coll/b'));

    // Update "coll/a" but make sure it still sorts before "coll/b"
    await addMutation(patchMutation('coll/a', { order: 2 }));

    // Since the last document in the limit didn't change (and hence we know
    // that all documents written prior to query execution still sort after
    // "coll/b"), we should use an Index-Free query.
    const docs = await expectOptimizedCollectionQuery(() =>
      runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [
      doc('coll/a', 1, { order: 2 }).setHasLocalMutations(),
      doc('coll/b', 1, { order: 3 })
    ]);
  });

  if (!durable) {
    return;
  }

  if (!INDEXING_ENABLED) {
    return;
  }

  it('combines indexed with non-indexed results', async () => {
    debugAssert(durable, 'Test requires durable persistence');

    const doc1 = doc('coll/a', 1, { 'foo': true });
    const doc2 = doc('coll/b', 2, { 'foo': true });
    const doc3 = doc('coll/c', 3, { 'foo': true });
    const doc4 = doc('coll/d', 3, { 'foo': true }).setHasLocalMutations();

    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['foo', IndexKind.ASCENDING]] })
    );

    await addDocument(doc1);
    await addDocument(doc2);
    await indexManager.updateIndexEntries(documentMap(doc1, doc2));
    await indexManager.updateCollectionGroup(
      'coll',
      newIndexOffsetFromDocument(doc2)
    );

    await addDocument(doc3);
    await addMutation(setMutation('coll/d', { 'foo': true }));

    const queryWithFilter = queryWithAddedFilter(
      query('coll'),
      filter('foo', '==', true)
    );
    const results = await expectOptimizedCollectionQuery(() =>
      runQuery(queryWithFilter, SnapshotVersion.min())
    );

    verifyResult(results, [doc1, doc2, doc3, doc4]);
  });

  it('uses partial index for limit queries', async () => {
    debugAssert(durable, 'Test requires durable persistence');

    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': 0 });
    const doc2 = doc('coll/2', 1, { 'a': 1, 'b': 1 });
    const doc3 = doc('coll/3', 1, { 'a': 1, 'b': 2 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': 3 });
    const doc5 = doc('coll/5', 1, { 'a': 2, 'b': 3 });
    await addDocument(doc1, doc2, doc3, doc4, doc5);

    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
    );
    await indexManager.updateIndexEntries(
      documentMap(doc1, doc2, doc3, doc4, doc5)
    );
    await indexManager.updateCollectionGroup(
      'coll',
      newIndexOffsetFromDocument(doc5)
    );

    const q = queryWithLimit(
      queryWithAddedFilter(
        queryWithAddedFilter(query('coll'), filter('a', '==', 1)),
        filter('b', '==', 1)
      ),
      3,
      LimitType.First
    );
    const results = await expectOptimizedCollectionQuery(() =>
      runQuery(q, SnapshotVersion.min())
    );

    verifyResult(results, [doc2]);
  });

  it('re-fills indexed limit queries', async () => {
    debugAssert(durable, 'Test requires durable persistence');

    const doc1 = doc('coll/1', 1, { 'a': 1 });
    const doc2 = doc('coll/2', 1, { 'a': 2 });
    const doc3 = doc('coll/3', 1, { 'a': 3 });
    const doc4 = doc('coll/4', 1, { 'a': 4 });
    await addDocument(doc1, doc2, doc3, doc4);

    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
    );
    await indexManager.updateIndexEntries(documentMap(doc1, doc2, doc3, doc4));
    await indexManager.updateCollectionGroup(
      'coll',
      newIndexOffsetFromDocument(doc4)
    );

    await addMutation(patchMutation('coll/3', { 'a': 5 }));

    const q = queryWithLimit(
      queryWithAddedOrderBy(query('coll'), orderBy('a')),
      3,
      LimitType.First
    );
    const results = await expectOptimizedCollectionQuery(() =>
      runQuery(q, SnapshotVersion.min())
    );

    verifyResult(results, [doc1, doc2, doc4]);
  });
}

function verifyResult(actualDocs: DocumentSet, expectedDocs: Document[]): void {
  for (const doc of expectedDocs) {
    expect(actualDocs.has(doc.key)).to.equal(
      true,
      `Expected result to contain document for ${doc.key.toString()}`
    );
  }

  expect(actualDocs.size).to.equal(
    expectedDocs.length,
    'Result count does not match'
  );
}
