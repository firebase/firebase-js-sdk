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
  queryToTarget,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithLimit
} from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { View } from '../../../src/core/view';
import { DocumentOverlayCache } from '../../../src/local/document_overlay_cache';
import {
  displayNameForIndexType,
  IndexType
} from '../../../src/local/index_manager';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { LocalDocumentsView } from '../../../src/local/local_documents_view';
import { MutationQueue } from '../../../src/local/mutation_queue';
import { Persistence } from '../../../src/local/persistence';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { PersistenceTransaction } from '../../../src/local/persistence_transaction';
import { QueryContext } from '../../../src/local/query_context';
import { QueryEngine } from '../../../src/local/query_engine';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { TargetCache } from '../../../src/local/target_cache';
import {
  documentKeySet,
  DocumentMap,
  documentMap,
  newMutationMap
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
  andFilter,
  deleteMutation,
  doc,
  fieldIndex,
  filter,
  key,
  orderBy,
  orFilter,
  patchMutation,
  query,
  setMutation,
  version
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestIndexManager } from './test_index_manager';
import { FieldIndexManagementApiImpl } from '../../../src/index/field_index_management';

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
    offset: IndexOffset,
    context?: QueryContext
  ): PersistencePromise<DocumentMap> {
    const skipsDocumentsBeforeSnapshot =
      indexOffsetComparator(IndexOffset.min(), offset) !== 0;

    expect(skipsDocumentsBeforeSnapshot).to.eq(
      !this.expectFullCollectionScan,
      'Observed query execution mode did not match expectation'
    );

    return super.getDocumentsMatchingQuery(transaction, query, offset, context);
  }
}

describe('QueryEngine', async () => {
  describe('MemoryEagerPersistence', async () => {
    /* not durable and without client side indexing */
    genericQueryEngineTest(
      persistenceHelpers.testMemoryEagerPersistence,
      false
    );
  });

  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbQueryEngine tests.');
    return;
  }

  describe('IndexedDbPersistence configureCsi=false', async () => {
    /* durable but without client side indexing */
    genericQueryEngineTest(persistenceHelpers.testIndexedDbPersistence, false);
  });

  describe('IndexedDbQueryEngine configureCsi=true', async () => {
    /* durable and with client side indexing */
    genericQueryEngineTest(persistenceHelpers.testIndexedDbPersistence, true);
  });
});

/**
 * Defines the set of tests to run against the memory and IndexedDB-backed
 * query engine.
 *
 * @param persistencePromise A factory function that returns an initialized
 * persistence layer.
 * @param configureCsi Whether tests should configure client side indexing
 * or use full table scans.
 */
function genericQueryEngineTest(
  persistencePromise: () => Promise<Persistence>,
  configureCsi: boolean
): void {
  let persistence!: Persistence;
  let remoteDocumentCache!: RemoteDocumentCache;
  let documentOverlayCache!: DocumentOverlayCache;
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
  function addMutation(mutation: Mutation): Promise<void> {
    return persistence.runTransaction('addMutation', 'readwrite', txn => {
      return mutationQueue
        .addMutationBatch(txn, Timestamp.now(), [], [mutation])
        .next(batch => {
          const overlayMap = newMutationMap();
          overlayMap.set(mutation.key, mutation);
          return documentOverlayCache.saveOverlays(
            txn,
            batch.batchId,
            overlayMap
          );
        });
    });
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

    // NOTE: Use a `readwrite` transaction (instead of `readonly`) so that
    // client-side indexes can be written to persistence.
    return persistence.runTransaction('runQuery', 'readwrite', txn => {
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
                /* limboResolutionEnabled= */ true
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
    documentOverlayCache = persistence.getDocumentOverlayCache(
      User.UNAUTHENTICATED
    );
    localDocuments = new TestLocalDocumentsView(
      remoteDocumentCache,
      mutationQueue,
      documentOverlayCache,
      underlyingIndexManager
    );
    queryEngine.initialize(localDocuments);

    queryEngine.fieldIndexManagementApi = new FieldIndexManagementApiImpl();
    queryEngine.fieldIndexManagementApi.initialize(
      User.UNAUTHENTICATED,
      underlyingIndexManager
    );

    indexManager = new TestIndexManager(persistence, underlyingIndexManager);
  });

  afterEach(async () => {
    if (persistence.started) {
      await persistence.shutdown();
      await persistenceHelpers.clearTestPersistence();
    }
  });

  // Tests in this section do not support client side indexing
  if (!configureCsi) {
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

    it('does not include documents deleted by mutation', async () => {
      const query1 = query('coll');
      await addDocument(MATCHING_DOC_A, MATCHING_DOC_B);
      await persistQueryMapping(MATCHING_DOC_A.key, MATCHING_DOC_B.key);

      // Add an unacknowledged mutation
      await addMutation(deleteMutation('coll/b'));
      const docs = await expectFullCollectionQuery(() =>
        runQuery(query1, LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(docs, [MATCHING_DOC_A]);
    });

    it('can perform OR queries using full collection scan', async () => {
      const doc1 = doc('coll/1', 1, { 'a': 1, 'b': 0 });
      const doc2 = doc('coll/2', 1, { 'a': 2, 'b': 1 });
      const doc3 = doc('coll/3', 1, { 'a': 3, 'b': 2 });
      const doc4 = doc('coll/4', 1, { 'a': 1, 'b': 3 });
      const doc5 = doc('coll/5', 1, { 'a': 1, 'b': 1 });

      await addDocument(doc1, doc2, doc3, doc4, doc5);

      // Two equalities: a==1 || b==1.
      const query1 = query(
        'coll',
        orFilter(filter('a', '==', 1), filter('b', '==', 1))
      );
      const result1 = await expectFullCollectionQuery(() =>
        runQuery(query1, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result1, [doc1, doc2, doc4, doc5]);

      // with one inequality: a>2 || b==1.
      const query2 = query(
        'coll',
        orFilter(filter('a', '>', 2), filter('b', '==', 1))
      );
      const result2 = await expectFullCollectionQuery(() =>
        runQuery(query2, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result2, [doc2, doc3, doc5]);

      // (a==1 && b==0) || (a==3 && b==2)
      const query3 = query(
        'coll',
        orFilter(
          andFilter(filter('a', '==', 1), filter('b', '==', 0)),
          andFilter(filter('a', '==', 3), filter('b', '==', 2))
        )
      );
      const result3 = await expectFullCollectionQuery(() =>
        runQuery(query3, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result3, [doc1, doc3]);

      // a==1 && (b==0 || b==3)
      const query4 = query(
        'coll',
        andFilter(
          filter('a', '==', 1),
          orFilter(filter('b', '==', 0), filter('b', '==', 3))
        )
      );
      const result4 = await expectFullCollectionQuery(() =>
        runQuery(query4, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result4, [doc1, doc4]);

      // (a==2 || b==2) && (a==3 || b==3)
      const query5 = query(
        'coll',
        andFilter(
          orFilter(filter('a', '==', 2), filter('b', '==', 2)),
          orFilter(filter('a', '==', 3), filter('b', '==', 3))
        )
      );
      const result5 = await expectFullCollectionQuery(() =>
        runQuery(query5, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result5, [doc3]);

      // Test with limits (implicit order by ASC): (a==1) || (b > 0) LIMIT 2
      const query6 = queryWithLimit(
        query('coll', orFilter(filter('a', '==', 1), filter('b', '>', 0))),
        2,
        LimitType.First
      );
      const result6 = await expectFullCollectionQuery(() =>
        runQuery(query6, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result6, [doc1, doc2]);

      // Test with limits (implicit order by DESC): (a==1) || (b > 0) LIMIT_TO_LAST 2
      const query7 = queryWithLimit(
        query('coll', orFilter(filter('a', '==', 1), filter('b', '>', 0))),
        2,
        LimitType.Last
      );
      const result7 = await expectFullCollectionQuery(() =>
        runQuery(query7, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result7, [doc3, doc4]);

      // Test with limits (explicit order by ASC): (a==2) || (b == 1) ORDER BY a LIMIT 1
      const query8 = queryWithAddedOrderBy(
        queryWithLimit(
          query('coll', orFilter(filter('a', '==', 2), filter('b', '==', 1))),
          1,
          LimitType.First
        ),
        orderBy('a', 'asc')
      );
      const result8 = await expectFullCollectionQuery(() =>
        runQuery(query8, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result8, [doc5]);

      // Test with limits (explicit order by DESC): (a==2) || (b == 1) ORDER BY a LIMIT_TO_LAST 1
      const query9 = queryWithAddedOrderBy(
        queryWithLimit(
          query('coll', orFilter(filter('a', '==', 2), filter('b', '==', 1))),
          1,
          LimitType.Last
        ),
        orderBy('a', 'desc')
      );
      const result9 = await expectFullCollectionQuery(() =>
        runQuery(query9, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result9, [doc5]);

      // Test with limits without orderBy (the __name__ ordering is the tie breaker).
      const query10 = queryWithLimit(
        query('coll', orFilter(filter('a', '==', 2), filter('b', '==', 1))),
        1,
        LimitType.First
      );
      const result10 = await expectFullCollectionQuery(() =>
        runQuery(query10, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result10, [doc2]);
    });

    it('query does not include documents with missing fields', async () => {
      const doc1 = doc('coll/1', 1, { 'a': 1, 'b': 0 });
      const doc2 = doc('coll/2', 1, { 'b': 1 });
      const doc3 = doc('coll/3', 1, { 'a': 3, 'b': 2 });
      const doc4 = doc('coll/4', 1, { 'a': 1, 'b': 3 });
      const doc5 = doc('coll/5', 1, { 'a': 1 });
      const doc6 = doc('coll/6', 1, { 'a': 2 });
      await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

      // Query: a==1 || b==1 order by a.
      // doc2 should not be included because it's missing the field 'a', and we have "orderBy a".
      const query1 = query(
        'coll',
        orFilter(filter('a', '==', 1), filter('b', '==', 1)),
        orderBy('a', 'asc')
      );
      const result1 = await expectFullCollectionQuery(() =>
        runQuery(query1, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result1, [doc1, doc4, doc5]);

      // Query: a==1 || b==1 order by b.
      // doc5 should not be included because it's missing the field 'b', and we have "orderBy b".
      const query2 = query(
        'coll',
        orFilter(filter('a', '==', 1), filter('b', '==', 1)),
        orderBy('b', 'asc')
      );
      const result2 = await expectFullCollectionQuery(() =>
        runQuery(query2, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result2, [doc1, doc2, doc4]);

      // Query: a>2 || b==1.
      // This query has an implicit 'order by a'.
      // doc2 should not be included because it's missing the field 'a'.
      const query3 = query(
        'coll',
        orFilter(filter('a', '>', 2), filter('b', '==', 1))
      );
      const result3 = await expectFullCollectionQuery(() =>
        runQuery(query3, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result3, [doc3]);

      // Query: a>1 || b==1 order by a order by b.
      // doc6 should not be included because it's missing the field 'b'.
      // doc2 should not be included because it's missing the field 'a'.
      const query4 = query(
        'coll',
        orFilter(filter('a', '>', 1), filter('b', '==', 1)),
        orderBy('a', 'asc'),
        orderBy('b', 'asc')
      );
      const result4 = await expectFullCollectionQuery(() =>
        runQuery(query4, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result4, [doc3]);

      // Query: a==1 || b==1
      // There's no explicit nor implicit orderBy. Documents with missing 'a' or missing 'b' should be
      // allowed if the document matches at least one disjunction term.
      const query5 = query(
        'coll',
        orFilter(filter('a', '==', 1), filter('b', '==', 1))
      );
      const result5 = await expectFullCollectionQuery(() =>
        runQuery(query5, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
      );
      verifyResult(result5, [doc1, doc2, doc4, doc5]);
    });
  }

  // Tests in this section require client side indexing
  if (configureCsi) {
    it('combines indexed with non-indexed results', async () => {
      debugAssert(configureCsi, 'Test requires durable persistence');

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
      debugAssert(configureCsi, 'Test requires durable persistence');

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
      debugAssert(configureCsi, 'Test requires durable persistence');

      const doc1 = doc('coll/1', 1, { 'a': 1 });
      const doc2 = doc('coll/2', 1, { 'a': 2 });
      const doc3 = doc('coll/3', 1, { 'a': 3 });
      const doc4 = doc('coll/4', 1, { 'a': 4 });
      await addDocument(doc1, doc2, doc3, doc4);

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.updateIndexEntries(
        documentMap(doc1, doc2, doc3, doc4)
      );
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

    // A generic test for index auto-creation.
    // This function can be called with explicit parameters from it() methods.
    const testIndexAutoCreation = async (config: {
      indexAutoCreationEnabled: boolean;
      indexAutoCreationMinCollectionSize?: number;
      relativeIndexReadCostPerDocument?: number;
      matchingDocumentCount?: number;
      nonmatchingDocumentCount?: number;
      expectedPostQueryExecutionIndexType: IndexType;
    }): Promise<void> => {
      debugAssert(configureCsi, 'Test requires durable persistence');

      const matchingDocuments: MutableDocument[] = [];
      for (let i = 0; i < (config.matchingDocumentCount ?? 3); i++) {
        const matchingDocument = doc(`coll/A${i}`, 1, { 'foo': 'match' });
        matchingDocuments.push(matchingDocument);
      }
      await addDocument(...matchingDocuments);

      const nonmatchingDocuments: MutableDocument[] = [];
      for (let i = 0; i < (config.nonmatchingDocumentCount ?? 3); i++) {
        const nonmatchingDocument = doc(`coll/X${i}`, 1, { 'foo': 'nomatch' });
        nonmatchingDocuments.push(nonmatchingDocument);
      }
      await addDocument(...nonmatchingDocuments);

      const fieldIndexManagementApi = queryEngine.fieldIndexManagementApi;
      if (!(fieldIndexManagementApi instanceof FieldIndexManagementApiImpl)) {
        throw new Error(
          'queryEngine.fieldIndexManagementApi should be ' +
            'an instance of FieldIndexManagementApiImpl'
        );
      }

      fieldIndexManagementApi.indexAutoCreationEnabled =
        config.indexAutoCreationEnabled;

      if (config.indexAutoCreationMinCollectionSize !== undefined) {
        fieldIndexManagementApi.indexAutoCreationMinCollectionSize =
          config.indexAutoCreationMinCollectionSize;
      }
      if (config.relativeIndexReadCostPerDocument !== undefined) {
        fieldIndexManagementApi.relativeIndexReadCostPerDocument =
          config.relativeIndexReadCostPerDocument;
      }

      const q = query('coll', filter('foo', '==', 'match'));
      const target = queryToTarget(q);
      const preQueryExecutionIndexType = await indexManager.getIndexType(
        target
      );
      expect(
        preQueryExecutionIndexType,
        'index type for target _before_ running the query is ' +
          displayNameForIndexType(preQueryExecutionIndexType) +
          ', but expected ' +
          displayNameForIndexType(IndexType.NONE)
      ).to.equal(IndexType.NONE);

      const result = await expectFullCollectionQuery(() =>
        runQuery(q, SnapshotVersion.min())
      );
      verifyResult(result, matchingDocuments);

      const postQueryExecutionIndexType = await indexManager.getIndexType(
        target
      );
      expect(
        postQueryExecutionIndexType,
        'index type for target _after_ running the query is ' +
          displayNameForIndexType(postQueryExecutionIndexType) +
          ', but expected ' +
          displayNameForIndexType(config.expectedPostQueryExecutionIndexType)
      ).to.equal(config.expectedPostQueryExecutionIndexType);
    };

    it('creates indexes when indexAutoCreationEnabled=true', () =>
      testIndexAutoCreation({
        indexAutoCreationEnabled: true,
        indexAutoCreationMinCollectionSize: 0,
        relativeIndexReadCostPerDocument: 0,
        expectedPostQueryExecutionIndexType: IndexType.FULL
      }));

    it('does not create indexes when indexAutoCreationEnabled=false', () =>
      testIndexAutoCreation({
        indexAutoCreationEnabled: false,
        indexAutoCreationMinCollectionSize: 0,
        relativeIndexReadCostPerDocument: 0,
        expectedPostQueryExecutionIndexType: IndexType.NONE
      }));

    it(
      'creates indexes when ' +
        'min collection size is met exactly ' +
        'and relative cost is ever-so-slightly better',
      () =>
        testIndexAutoCreation({
          indexAutoCreationEnabled: true,
          indexAutoCreationMinCollectionSize: 10,
          relativeIndexReadCostPerDocument: 1.9999,
          matchingDocumentCount: 5,
          nonmatchingDocumentCount: 5,
          expectedPostQueryExecutionIndexType: IndexType.FULL
        })
    );

    it(
      'does not create indexes when ' +
        'min collection size is not met by only 1 document',
      () =>
        testIndexAutoCreation({
          indexAutoCreationEnabled: true,
          indexAutoCreationMinCollectionSize: 10,
          relativeIndexReadCostPerDocument: 0,
          matchingDocumentCount: 5,
          nonmatchingDocumentCount: 4,
          expectedPostQueryExecutionIndexType: IndexType.NONE
        })
    );

    it('does not create indexes when relative cost is equal', () =>
      testIndexAutoCreation({
        indexAutoCreationEnabled: true,
        indexAutoCreationMinCollectionSize: 0,
        relativeIndexReadCostPerDocument: 2,
        matchingDocumentCount: 5,
        nonmatchingDocumentCount: 5,
        expectedPostQueryExecutionIndexType: IndexType.NONE
      }));
  }

  // Tests below this line execute with and without client side indexing
  it('query with multiple ins on the same field', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': 0 });
    const doc2 = doc('coll/2', 1, { 'b': 1 });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': 2 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': 3 });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.DESCENDING]] })
      );
      await indexManager.updateIndexEntries(
        documentMap(doc1, doc3, doc4, doc5, doc6)
      );
      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    // a IN [1,2,3] && a IN [0,1,4] should result in "a==1".
    const query1 = query(
      'coll',
      andFilter(filter('a', 'in', [1, 2, 3]), filter('a', 'in', [0, 1, 4]))
    );
    const result1 = await expectFunction(() =>
      runQuery(query1, lastLimboFreeSnapshot)
    );
    verifyResult(result1, [doc1, doc4, doc5]);

    // a IN [2,3] && a IN [0,1,4] is never true and so the result should be an empty set.
    const query2 = query(
      'coll',
      andFilter(filter('a', 'in', [2, 3]), filter('a', 'in', [0, 1, 4]))
    );
    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, []);

    // a IN [0,3] || a IN [0,2] should union them (similar to: a IN [0,2,3]).
    const query3 = query(
      'coll',
      orFilter(filter('a', 'in', [0, 3]), filter('a', 'in', [0, 2]))
    );
    const result3 = await expectFunction(() =>
      runQuery(query3, lastLimboFreeSnapshot)
    );
    verifyResult(result3, [doc3, doc6]);

    // Nested composite filter: (a IN [0,1,2,3] && (a IN [0,2] || (b>1 && a IN [1,3]))
    const query4 = query(
      'coll',
      andFilter(
        filter('a', 'in', [1, 2, 3]),
        orFilter(
          filter('a', 'in', [0, 2]),
          andFilter(filter('b', '>=', 1), filter('a', 'in', [1, 3]))
        )
      )
    );
    const result4 = await expectFunction(() =>
      runQuery(query4, lastLimboFreeSnapshot)
    );
    verifyResult(result4, [doc3, doc4]);
  });

  it('query with ins and not-ins on the same field', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': 0 });
    const doc2 = doc('coll/2', 1, { 'b': 1 });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': 2 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': 3 });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.DESCENDING]] })
      );
      await indexManager.updateIndexEntries(
        documentMap(doc1, doc3, doc4, doc5, doc6)
      );
      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    // a IN [1,2,3] && a IN [0,1,3,4] && a NOT-IN [1] should result in
    // "a==1 && a!=1 || a==3 && a!=1" or just "a == 3"
    const query1 = query(
      'coll',
      andFilter(
        filter('a', 'in', [1, 2, 3]),
        filter('a', 'in', [0, 1, 3, 4]),
        filter('a', 'not-in', [1])
      )
    );
    const result1 = await expectFunction(() =>
      runQuery(query1, lastLimboFreeSnapshot)
    );
    verifyResult(result1, [doc3]);

    // a IN [2,3] && a IN [0,1,2,4] && a NOT-IN [1,2] is never true and so the
    // result should be an empty set.
    const query2 = query(
      'coll',
      andFilter(
        filter('a', 'in', [2, 3]),
        filter('a', 'in', [0, 1, 2, 4]),
        filter('a', 'not-in', [1, 2])
      )
    );
    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, []);

    // a IN [] || a NOT-IN [0,1,2] should union them (similar to: a NOT-IN [0,1,2]).
    const query3 = query(
      'coll',
      orFilter(filter('a', 'in', []), filter('a', 'not-in', [0, 1, 2]))
    );
    const result3 = await expectFunction(() =>
      runQuery(query3, lastLimboFreeSnapshot)
    );
    verifyResult(result3, [doc3]);

    const query4 = query(
      'coll',
      andFilter(
        filter('a', '<=', 1),
        filter('a', 'in', [1, 2, 3, 4]),
        filter('a', 'not-in', [0, 2])
      )
    );
    const result4 = await expectFunction(() =>
      runQuery(query4, lastLimboFreeSnapshot)
    );
    verifyResult(result4, [doc1, doc4, doc5]);
  });

  it('query with multiple ins on different fields', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': 0 });
    const doc2 = doc('coll/2', 1, { 'b': 1 });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': 2 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': 3 });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.DESCENDING]] })
      );
      await indexManager.updateIndexEntries(
        documentMap(doc1, doc2, doc3, doc4, doc5, doc6)
      );
      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    const query1 = query(
      'coll',
      orFilter(filter('a', 'in', [2, 3]), filter('b', 'in', [0, 2]))
    );
    const result1 = await expectFunction(() =>
      runQuery(query1, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(result1, [doc1, doc3, doc6]);

    const query2 = query(
      'coll',
      andFilter(filter('a', 'in', [2, 3]), filter('b', 'in', [0, 2]))
    );
    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, [doc3]);

    // Nested composite filter: (a IN [0,1,2,3] && (a IN [0,2] || (b>1 && a IN [1,3]))
    const query3 = query(
      'coll',
      andFilter(
        filter('b', 'in', [0, 3]),
        orFilter(
          filter('b', 'in', [1]),
          andFilter(filter('b', 'in', [2, 3]), filter('a', 'in', [1, 3]))
        )
      )
    );
    const result3 = await expectFunction(() =>
      runQuery(query3, lastLimboFreeSnapshot)
    );
    verifyResult(result3, [doc4]);
  });

  it('query in with array-contains-any', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': [0] });
    const doc2 = doc('coll/2', 1, { 'b': [1] });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': [2, 7], 'c': 10 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': [3, 7] });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2, 'c': 20 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.CONTAINS]] })
      );
      await indexManager.updateIndexEntries(
        documentMap(doc1, doc2, doc3, doc4, doc5, doc6)
      );
      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    const query1 = query(
      'coll',
      orFilter(
        filter('a', 'in', [2, 3]),
        filter('b', 'array-contains-any', [0, 7])
      )
    );
    const result1 = await expectFunction(() =>
      runQuery(query1, lastLimboFreeSnapshot)
    );
    verifyResult(result1, [doc1, doc3, doc4, doc6]);

    const query2 = query(
      'coll',
      andFilter(
        filter('a', 'in', [2, 3]),
        filter('b', 'array-contains-any', [0, 7])
      )
    );
    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, [doc3]);

    const query3 = query(
      'coll',
      orFilter(
        andFilter(filter('a', 'in', [2, 3]), filter('c', '==', 10)),
        filter('b', 'array-contains-any', [0, 7])
      )
    );
    const result3 = await expectFunction(() =>
      runQuery(query3, lastLimboFreeSnapshot)
    );
    verifyResult(result3, [doc1, doc3, doc4]);

    const query4 = query(
      'coll',
      andFilter(
        filter('a', 'in', [2, 3]),
        orFilter(
          filter('b', 'array-contains-any', [0, 7]),
          filter('c', '==', 20)
        )
      )
    );
    const result4 = await expectFunction(() =>
      runQuery(query4, lastLimboFreeSnapshot)
    );
    verifyResult(result4, [doc3, doc6]);
  });

  it('query in with array-contains', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': [0] });
    const doc2 = doc('coll/2', 1, { 'b': [1] });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': [2, 7], 'c': 10 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': [3, 7] });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2, 'c': 20 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.CONTAINS]] })
      );

      await indexManager.updateIndexEntries(
        documentMap(doc1, doc2, doc3, doc4, doc5, doc6)
      );

      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    const query1 = query(
      'coll',
      orFilter(filter('a', 'in', [2, 3]), filter('b', 'array-contains', 3))
    );
    const result1 = await expectFunction(() =>
      runQuery(query1, lastLimboFreeSnapshot)
    );
    verifyResult(result1, [doc3, doc4, doc6]);

    const query2 = query(
      'coll',
      andFilter(filter('a', 'in', [2, 3]), filter('b', 'array-contains', 7))
    );
    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, [doc3]);

    const query3 = query(
      'coll',
      orFilter(
        filter('a', 'in', [2, 3]),
        andFilter(filter('b', 'array-contains', 3), filter('a', '==', 1))
      )
    );
    const result3 = await expectFunction(() =>
      runQuery(query3, lastLimboFreeSnapshot)
    );
    verifyResult(result3, [doc3, doc4, doc6]);

    const query4 = query(
      'coll',
      andFilter(
        filter('a', 'in', [2, 3]),
        orFilter(filter('b', 'array-contains', 7), filter('a', '==', 1))
      )
    );
    const result4 = await expectFunction(() =>
      runQuery(query4, lastLimboFreeSnapshot)
    );
    verifyResult(result4, [doc3]);
  });

  it('order by equality', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': [0] });
    const doc2 = doc('coll/2', 1, { 'b': [1] });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': [2, 7], 'c': 10 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': [3, 7] });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2, 'c': 20 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.CONTAINS]] })
      );
      await indexManager.updateIndexEntries(
        documentMap(doc1, doc2, doc3, doc4, doc5, doc6)
      );
      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    const query1 = query('coll', filter('a', '==', 1), orderBy('a'));
    const result1 = await expectFunction(() =>
      runQuery(query1, lastLimboFreeSnapshot)
    );
    verifyResult(result1, [doc1, doc4, doc5]);

    const query2 = query('coll', filter('a', 'in', [2, 3]), orderBy('a'));

    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, [doc6, doc3]);
  });

  it('or query with in and not-in', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': 0 });
    const doc2 = doc('coll/2', 1, { 'b': 1 });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': 2 });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': 3 });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();

      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.DESCENDING]] })
      );

      await indexManager.updateIndexEntries(
        documentMap(doc1, doc2, doc3, doc4, doc5, doc6)
      );
      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    const query1 = query(
      'coll',
      orFilter(filter('a', '==', 2), filter('b', 'in', [2, 3]))
    );
    const result1 = await expectFunction(() =>
      runQuery(query1, lastLimboFreeSnapshot)
    );
    verifyResult(result1, [doc3, doc4, doc6]);

    // a==2 || (b != 2 && b != 3)
    // Has implicit "orderBy b"
    const query2 = query(
      'coll',
      orFilter(filter('a', '==', 2), filter('b', 'not-in', [2, 3]))
    );
    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, [doc1, doc2]);
  });

  it('query with array membership', async () => {
    const doc1 = doc('coll/1', 1, { 'a': 1, 'b': [0] });
    const doc2 = doc('coll/2', 1, { 'b': [1] });
    const doc3 = doc('coll/3', 1, { 'a': 3, 'b': [2, 7] });
    const doc4 = doc('coll/4', 1, { 'a': 1, 'b': [3, 7] });
    const doc5 = doc('coll/5', 1, { 'a': 1 });
    const doc6 = doc('coll/6', 1, { 'a': 2 });
    await addDocument(doc1, doc2, doc3, doc4, doc5, doc6);

    let expectFunction = expectFullCollectionQuery;
    let lastLimboFreeSnapshot = MISSING_LAST_LIMBO_FREE_SNAPSHOT;

    if (configureCsi) {
      expectFunction = expectOptimizedCollectionQuery;
      lastLimboFreeSnapshot = SnapshotVersion.min();
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['a', IndexKind.DESCENDING]] })
      );
      await indexManager.addFieldIndex(
        fieldIndex('coll', { fields: [['b', IndexKind.CONTAINS]] })
      );

      await indexManager.updateIndexEntries(
        documentMap(doc1, doc2, doc3, doc4, doc5, doc6)
      );
      await indexManager.updateCollectionGroup(
        'coll',
        newIndexOffsetFromDocument(doc6)
      );
    }

    const query1 = query(
      'coll',
      orFilter(filter('a', '==', 2), filter('b', 'array-contains', 7))
    );
    const result1 = await expectFunction(() =>
      runQuery(query1, lastLimboFreeSnapshot)
    );
    verifyResult(result1, [doc3, doc4, doc6]);

    const query2 = query(
      'coll',
      orFilter(filter('a', '==', 2), filter('b', 'array-contains-any', [0, 3]))
    );
    const result2 = await expectFunction(() =>
      runQuery(query2, lastLimboFreeSnapshot)
    );
    verifyResult(result2, [doc1, doc4, doc6]);
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
