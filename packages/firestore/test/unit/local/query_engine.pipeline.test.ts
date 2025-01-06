/**
 * @license
 * Copyright 2024 Google LLC
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

import { ascending, Field, Timestamp, useFluentPipelines } from '../../../src';
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
  expectEqual,
  fieldIndex,
  filter,
  key,
  orderBy,
  orFilter,
  patchMutation,
  query,
  setMutation,
  TestSnapshotVersion,
  version
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestIndexManager } from './test_index_manager';
import {
  isPipeline,
  QueryOrPipeline,
  toCorePipeline,
  toPipeline
} from '../../../src/core/pipeline-util';
import { newTestFirestore } from '../../util/api_helpers';
import { Pipeline } from '../../../src/lite-api/pipeline';
import { CorePipeline } from '../../../src/core/pipeline_run';
import { TestLocalDocumentsView } from './query_engine.test';
import {
  CREATE_TIME_NAME,
  DOCUMENT_KEY_NAME,
  FieldPath,
  UPDATE_TIME_NAME
} from '../../../src/model/path';

const TEST_TARGET_ID = 1;

const MATCHING_DOC_A = doc('coll/a', 1, { matches: true, order: 1 });
const NON_MATCHING_DOC_A = doc('coll/a', 1, { matches: false, order: 1 });
const UPDATED_DOC_A = doc('coll/a', 11, { matches: true, order: 1 });
const MATCHING_DOC_B = doc('coll/b', 1, { matches: true, order: 2 });
const UPDATED_MATCHING_DOC_B = doc('coll/b', 11, { matches: true, order: 2 });

const LAST_LIMBO_FREE_SNAPSHOT = version(10);
const MISSING_LAST_LIMBO_FREE_SNAPSHOT = SnapshotVersion.min();
const db = newTestFirestore();

useFluentPipelines();

describe('QueryEngine pipeline tests', async () => {
  describe('MemoryEagerPersistence', async () => {
    /* not durable and without client side indexing */
    genericQueryEnginePipelineTest(
      persistenceHelpers.testMemoryEagerPersistence
    );
  });

  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbQueryEngine tests.');
    return;
  }

  describe('IndexedDbPersistence', async () => {
    /* durable but without client side indexing */
    genericQueryEnginePipelineTest(persistenceHelpers.testIndexedDbPersistence);
  });
});

/**
 * Defines the set of tests to run against the memory and IndexedDB-backed
 * query engine.
 *
 * @param persistencePromise A factory function that returns an initialized
 * persistence layer.
 */
function genericQueryEnginePipelineTest(
  persistencePromise: () => Promise<Persistence>
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

  async function updateCachedPipelineResults(
    executionTime: TestSnapshotVersion,
    results: MutableDocument[],
    deletes: DocumentKey[] = []
  ): Promise<void> {
    return persistence.runTransaction(
      'updateCachedPipelineResults',
      'readwrite',
      txn => {
        return persistence
          .getPipelineResultsCache()
          .updateResults(
            txn,
            TEST_TARGET_ID,
            version(executionTime),
            results,
            deletes
          );
      }
    );
  }

  async function setCachedPipelineResults(
    executionTime: TestSnapshotVersion,
    results: MutableDocument[],
    deletes: DocumentKey[] = []
  ): Promise<void> {
    return persistence.runTransaction(
      'setCachedPipelineResults',
      'readwrite',
      txn => {
        return persistence
          .getPipelineResultsCache()
          .setResults(
            txn,
            TEST_TARGET_ID,
            version(executionTime),
            results,
            deletes
          );
      }
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
    queryOrPipeline: QueryOrPipeline,
    lastLimboFreeSnapshot: SnapshotVersion
  ): Promise<DocumentSet> {
    debugAssert(
      localDocuments.expectFullCollectionScan !== undefined,
      'Encountered runQuery() call not wrapped in ' +
        'expectOptimizedCollectionQuery()/expectFullCollectionQuery()'
    );

    let query = queryOrPipeline;

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
              remoteKeys,
              TEST_TARGET_ID
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
      underlyingIndexManager,
      persistence.getPipelineResultsCache()
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

  it('handles pipeline with simple select', async () => {
    const pipeline = toCorePipeline(
      db.pipeline().collection('users').select('name', 'age')
    );

    const docs = [
      doc('users/alice', 1000, { name: 'Alice', age: 30, city: 'New York' }),
      doc('users/bob', 1000, { name: 'Bob', age: 25, city: 'London' })
    ];

    await addDocument(...docs);

    const results = await expectFullCollectionQuery(() =>
      runQuery(pipeline, SnapshotVersion.min())
    );

    expect(results.size).to.equal(2);
    verifyResult(results, [
      doc('users/alice', 1000, { name: 'Alice', age: 30 }),
      doc('users/bob', 1000, { name: 'Bob', age: 25 })
    ]);
  });

  it('handles pipeline with select and field renaming', async () => {
    const pipeline = toCorePipeline(
      db
        .pipeline()
        .collection('users')
        .select(Field.of('name').as('fullName'), 'age')
    );

    const docs = [
      doc('users/charlie', 1000, { name: 'Charlie', age: 35, city: 'Paris' }),
      doc('users/david', 1000, { name: 'David', age: 40, city: 'Berlin' })
    ];

    await addDocument(...docs);

    const results = await expectFullCollectionQuery(() =>
      runQuery(pipeline, SnapshotVersion.min())
    );

    expect(results.size).to.equal(2);
    verifyResult(results, [
      doc('users/charlie', 1000, { fullName: 'Charlie', age: 35 }),
      doc('users/david', 1000, { fullName: 'David', age: 40 })
    ]);
  });

  it('handles pipeline with select and update', async () => {
    const pipeline = toCorePipeline(
      db.pipeline().collection('users').select('name', 'score')
    );

    const initialDocs = [
      doc('users/eve', 1000, { name: 'Eve', score: 85, grade: 'B' }),
      doc('users/frank', 1000, { name: 'Frank', score: 90, grade: 'A' })
    ];

    await addDocument(...initialDocs);

    let results = await expectFullCollectionQuery(() =>
      runQuery(pipeline, LAST_LIMBO_FREE_SNAPSHOT)
    );

    expect(results.size).to.equal(2);
    verifyResult(results, [
      doc('users/eve', 1000, { name: 'Eve', score: 85 }),
      doc('users/frank', 1000, { name: 'Frank', score: 90 })
    ]);

    // Update a document
    const updatedDoc = doc('users/eve', 2000, {
      name: 'Eve',
      score: 95,
      grade: 'A'
    });
    await addDocument(updatedDoc);

    results = await expectFullCollectionQuery(() =>
      runQuery(pipeline, version(1500))
    );

    expect(results.size).to.equal(2);
    verifyResult(results, [
      doc('users/frank', 1000, { name: 'Frank', score: 90 }),
      doc('users/eve', 2000, { name: 'Eve', score: 95 })
    ]);
  });

  it('handles merging document cache and pipeline result cache', async () => {
    const pipeline = toCorePipeline(
      db
        .pipeline()
        .collection('users')
        .where(Field.of('score').gt(85))
        .select('name', 'score')
    );

    const initialDocs = [
      doc('users/alice', 1000, { name: 'Alice', score: 80, grade: 'B' }),
      doc('users/bob', 1000, { name: 'Bob', score: 90, grade: 'A' }),
      doc('users/charlie', 1000, { name: 'Charlie', score: 86, grade: 'B' }),
      doc('users/david', 1000, { name: 'David', score: 90, grade: 'A' }),
      doc('users/eve', 1000, { name: 'Eve', score: 85, grade: 'B' }),
      doc('users/frank', 1000, { name: 'Frank', score: 90, grade: 'A' })
    ];
    await addDocument(...initialDocs);

    const initialResults = [
      doc('users/bob', 2000, { name: 'Bob', score: 90 }),
      doc('users/charlie', 2000, { name: 'Charlie', score: 86 }),
      doc('users/frank', 2000, { name: 'Frank', score: 99 })
    ];
    setCachedPipelineResults(2000, initialResults);

    let results = await expectFullCollectionQuery(() =>
      runQuery(pipeline, SnapshotVersion.min())
    );
    verifyResult(results, [
      doc('users/bob', 2000, { name: 'Bob', score: 90 }),
      doc('users/charlie', 2000, { name: 'Charlie', score: 86 }),
      doc('users/frank', 2000, { name: 'Frank', score: 99 })
    ]);

    // Update a document to include in the result
    const updatedDoc = doc('users/eve', 3000, {
      name: 'Eve',
      score: 95,
      grade: 'A'
    });
    await addDocument(updatedDoc);
    // Update a document that is not changing the result
    await addDocument(
      doc('users/gary', 3000, { name: 'Gary', score: 0, grade: 'C' })
    );
    // Change a document to include in the result
    await addMutation(patchMutation('users/alice', { score: 99 }));
    // Change a document to exclude from the result
    await addMutation(patchMutation('users/charlie', { score: 60 }));
    // Delete a document from the result
    await addMutation(deleteMutation('users/frank'));
    // Delete a document that was not in the result
    await addMutation(deleteMutation('users/david'));
    results = await expectFullCollectionQuery(() =>
      runQuery(pipeline, SnapshotVersion.min())
    );

    verifyResult(results, [
      doc('users/alice', 2000, {
        name: 'Alice',
        score: 99
      }).setHasLocalMutations(),
      doc('users/bob', 2000, { name: 'Bob', score: 90 }),
      doc('users/eve', 3000, { name: 'Eve', score: 95 })
    ]);
  });
}

function verifyResult(actualDocs: DocumentSet, expectedDocs: Document[]): void {
  expect(actualDocs.size).to.equal(
    expectedDocs.length,
    'Result count does not match'
  );

  expectedDocs.forEach(expected => {
    expect(actualDocs.get(expected.key)).to.not.be.undefined;
    const actual = actualDocs.get(expected.key)?.data;
    actual?.delete(FieldPath.keyField());
    actual?.delete(FieldPath.fromServerFormat(CREATE_TIME_NAME));
    actual?.delete(FieldPath.fromServerFormat(UPDATE_TIME_NAME));
    expect(actual).to.deep.equal(
      expected.data,
      `Document (${expected.key.path}) does not match.`
    );
  });
}
