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
import { User } from '../../../src/auth/user';
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { View } from '../../../src/core/view';
import {
  Persistence,
  PersistenceTransaction
} from '../../../src/local/persistence';
import { TargetCache } from '../../../src/local/target_cache';
import { QueryEngine } from '../../../src/local/query_engine';
import { IndexFreeQueryEngine } from '../../../src/local/index_free_query_engine';
import { LocalDocumentsView } from '../../../src/local/local_documents_view';
import { MemoryIndexManager } from '../../../src/local/memory_index_manager';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { documentKeySet, DocumentMap } from '../../../src/model/collections';
import { MaybeDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { DocumentSet } from '../../../src/model/document_set';
import { debugAssert } from '../../../src/util/assert';
import { testMemoryEagerPersistence } from './persistence_test_helpers';
import { doc, filter, key, orderBy, path, version } from '../../util/helpers';

const TEST_TARGET_ID = 1;

const MATCHING_DOC_A = doc('coll/a', 1, { matches: true, order: 1 });
const NON_MATCHING_DOC_A = doc('coll/a', 1, { matches: false, order: 1 });
const PENDING_MATCHING_DOC_A = doc(
  'coll/a',
  1,
  { matches: true, order: 1 },
  { hasLocalMutations: true }
);
const PENDING_NON_MATCHING_DOC_A = doc(
  'coll/a',
  1,
  { matches: false, order: 1 },
  { hasLocalMutations: true }
);
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
  expectIndexFreeExecution: boolean | undefined;

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap> {
    const indexFreeExecution = !SnapshotVersion.min().isEqual(sinceReadTime);

    expect(indexFreeExecution).to.eq(
      this.expectIndexFreeExecution,
      'Observed query execution mode did not match expectation'
    );

    return super.getDocumentsMatchingQuery(transaction, query, sinceReadTime);
  }
}

describe('IndexFreeQueryEngine', () => {
  let persistence!: Persistence;
  let remoteDocumentCache!: RemoteDocumentCache;
  let targetCache!: TargetCache;
  let queryEngine!: QueryEngine;
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
  function addDocument(...docs: MaybeDocument[]): Promise<void> {
    return persistence.runTransaction('addDocument', 'readwrite', txn => {
      const changeBuffer = remoteDocumentCache.newChangeBuffer();
      for (const doc of docs) {
        changeBuffer.addEntry(doc, doc.version);
      }
      return changeBuffer.apply(txn);
    });
  }

  async function expectIndexFreeQuery<T>(op: () => Promise<T>): Promise<T> {
    try {
      localDocuments.expectIndexFreeExecution = true;
      return await op();
    } finally {
      localDocuments.expectIndexFreeExecution = undefined;
    }
  }

  async function expectFullCollectionQuery<T>(
    op: () => Promise<T>
  ): Promise<T> {
    try {
      localDocuments.expectIndexFreeExecution = false;
      return await op();
    } finally {
      localDocuments.expectIndexFreeExecution = undefined;
    }
  }

  function runQuery(
    query: Query,
    lastLimboFreeSnapshot: SnapshotVersion
  ): Promise<DocumentSet> {
    debugAssert(
      localDocuments.expectIndexFreeExecution !== undefined,
      'Encountered runQuery() call not wrapped in expectIndexFreeQuery()/expectFullCollectionQuery()'
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
    persistence = await testMemoryEagerPersistence();
    targetCache = persistence.getTargetCache();
    queryEngine = new IndexFreeQueryEngine();

    remoteDocumentCache = persistence.getRemoteDocumentCache();

    localDocuments = new TestLocalDocumentsView(
      remoteDocumentCache,
      persistence.getMutationQueue(User.UNAUTHENTICATED),
      new MemoryIndexManager()
    );
    queryEngine.setLocalDocumentsView(localDocuments);
  });

  it('uses target mapping for initial view', async () => {
    const query = Query.atPath(path('coll')).addFilter(
      filter('matches', '==', true)
    );

    await addDocument(MATCHING_DOC_A, MATCHING_DOC_B);
    await persistQueryMapping(MATCHING_DOC_A.key, MATCHING_DOC_B.key);

    const docs = await expectIndexFreeQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_A, MATCHING_DOC_B]);
  });

  it('filters non-matching changes since initial results', async () => {
    const query = Query.atPath(path('coll')).addFilter(
      filter('matches', '==', true)
    );

    await addDocument(MATCHING_DOC_A, MATCHING_DOC_B);
    await persistQueryMapping(MATCHING_DOC_A.key, MATCHING_DOC_B.key);

    // Add a mutated document that is not yet part of query's set of remote keys.
    await addDocument(PENDING_NON_MATCHING_DOC_A);

    const docs = await expectIndexFreeQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('includes changes since initial results', async () => {
    const query = Query.atPath(path('coll')).addFilter(
      filter('matches', '==', true)
    );

    await addDocument(MATCHING_DOC_A, MATCHING_DOC_B);
    await persistQueryMapping(MATCHING_DOC_A.key, MATCHING_DOC_B.key);

    let docs = await expectIndexFreeQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_A, MATCHING_DOC_B]);

    // Add a mutated document that is not yet part of query's set of remote keys.
    await addDocument(UPDATED_MATCHING_DOC_B);

    docs = await expectIndexFreeQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_A, UPDATED_MATCHING_DOC_B]);
  });

  it('does not use initial results without limbo free snapshot version', async () => {
    const query = Query.atPath(path('coll')).addFilter(
      filter('matches', '==', true)
    );

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, MISSING_LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, []);
  });

  it('does not use initial results for unfiltered collection query', async () => {
    const query = Query.atPath(path('coll'));

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, []);
  });

  it('does not use initial results for limit query with document removal', async () => {
    const query = Query.atPath(path('coll'))
      .addFilter(filter('matches', '==', true))
      .withLimitToLast(1);

    // While the backend would never add DocA to the set of remote keys, this
    // allows us to easily simulate what would happen when a document no longer
    // matches due to an out-of-band update.
    await addDocument(NON_MATCHING_DOC_A);
    await persistQueryMapping(NON_MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limitToLast query with document removal', async () => {
    const query = Query.atPath(path('coll'))
      .addFilter(filter('matches', '==', true))
      .addOrderBy(orderBy('order', 'desc'))
      .withLimitToLast(1);

    // While the backend would never add DocA to the set of remote keys, this
    // allows us to easily simulate what would happen when a document no longer
    // matches due to an out-of-band update.
    await addDocument(NON_MATCHING_DOC_A);
    await persistQueryMapping(NON_MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );

    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limit query when last document has pending write', async () => {
    const query = Query.atPath(path('coll'))
      .addFilter(filter('matches', '==', true))
      .addOrderBy(orderBy('order', 'desc'))
      .withLimitToFirst(1);

    // Add a query mapping for a document that matches, but that sorts below
    // another document due to a pending write.
    await addDocument(PENDING_MATCHING_DOC_A);
    await persistQueryMapping(PENDING_MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limitToLast query when first document has pending write', async () => {
    const query = Query.atPath(path('coll'))
      .addFilter(filter('matches', '==', true))
      .addOrderBy(orderBy('order'))
      .withLimitToLast(1);

    // Add a query mapping for a document that matches, but that sorts below
    // another document due to a pending write.
    await addDocument(PENDING_MATCHING_DOC_A);
    await persistQueryMapping(PENDING_MATCHING_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limit query when last document has been updated out of band', async () => {
    const query = Query.atPath(path('coll'))
      .addFilter(filter('matches', '==', true))
      .addOrderBy(orderBy('order', 'desc'))
      .withLimitToFirst(1);

    // Add a query mapping for a document that matches, but that sorts below
    // another document based on an update that the SDK received after the
    // query's snapshot was persisted.
    await addDocument(UPDATED_DOC_A);
    await persistQueryMapping(UPDATED_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('does not use initial results for limitToLast query when first document in limit has been updated out of band', async () => {
    const query = Query.atPath(path('coll'))
      .addFilter(filter('matches', '==', true))
      .addOrderBy(orderBy('order'))
      .withLimitToLast(1);

    // Add a query mapping for a document that matches, but that sorts below
    // another document based on an update that the SDK received after the
    // query's snapshot was persisted.
    await addDocument(UPDATED_DOC_A);
    await persistQueryMapping(UPDATED_DOC_A.key);

    await addDocument(MATCHING_DOC_B);

    const docs = await expectFullCollectionQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [MATCHING_DOC_B]);
  });

  it('uses initial results if last document in limit is unchanged', async () => {
    const query = Query.atPath(path('coll'))
      .addOrderBy(orderBy('order'))
      .withLimitToFirst(2);

    await addDocument(doc('coll/a', 1, { order: 1 }));
    await addDocument(doc('coll/b', 1, { order: 3 }));
    await persistQueryMapping(key('coll/a'), key('coll/b'));

    // Update "coll/a" but make sure it still sorts before "coll/b"
    await addDocument(
      doc('coll/a', 1, { order: 2 }, { hasLocalMutations: true })
    );

    // Since the last document in the limit didn't change (and hence we know
    // that all documents written prior to query execution still sort after
    // "coll/b"), we should use an Index-Free query.
    const docs = await expectIndexFreeQuery(() =>
      runQuery(query, LAST_LIMBO_FREE_SNAPSHOT)
    );
    verifyResult(docs, [
      doc('coll/a', 1, { order: 2 }, { hasLocalMutations: true }),
      doc('coll/b', 1, { order: 3 })
    ]);
  });
});

function verifyResult(
  actualDocs: DocumentSet,
  expectedDocs: MaybeDocument[]
): void {
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
