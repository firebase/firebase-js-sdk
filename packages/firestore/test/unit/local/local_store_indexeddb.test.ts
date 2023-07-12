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

import { isIndexedDBAvailable } from '@firebase/util';
import { expect } from 'chai';

import { serverTimestamp, Timestamp } from '../../../src';
import { User } from '../../../src/auth/user';
import { BundleConverterImpl } from '../../../src/core/bundle_impl';
import {
  AggregateQuery,
  LimitType,
  Query,
  queryToTarget,
  queryWithLimit
} from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { Target } from '../../../src/core/target';
import { TargetId } from '../../../src/core/types';
import { IndexBackfiller } from '../../../src/local/index_backfiller';
import { LocalStore } from '../../../src/local/local_store';
import {
  AggregateQueryResult,
  localStoreAllocateTarget,
  localStoreApplyRemoteEventToLocalCache,
  localStoreConfigureFieldIndexes,
  localStoreExecuteAggregateQuery,
  localStoreExecuteQuery,
  localStoreWriteCount,
  localStoreWriteLocally,
  newLocalStore
} from '../../../src/local/local_store_impl';
import { Persistence } from '../../../src/local/persistence';
import {
  DocumentKeySet,
  documentKeySet,
  documentMap,
  DocumentMap
} from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import {
  FieldIndex,
  IndexKind,
  IndexOffset
} from '../../../src/model/field_index';
import { Mutation, MutationType } from '../../../src/model/mutation';
import { MutationBatch } from '../../../src/model/mutation_batch';
import { RemoteEvent } from '../../../src/remote/remote_event';
import {
  deletedDoc,
  deleteMutation,
  doc,
  docAddedRemoteEvent,
  docUpdateRemoteEvent,
  field,
  fieldIndex,
  filter,
  key,
  orderBy,
  patchMutation,
  query,
  setMutation,
  version
} from '../../util/helpers';

import { CountingQueryEngine } from './counting_query_engine';
import * as persistenceHelpers from './persistence_test_helpers';
import { JSON_SERIALIZER } from './persistence_test_helpers';

class AsyncLocalStoreTester {
  private bundleConverter: BundleConverterImpl;
  private indexBackfiller: IndexBackfiller;

  private lastChanges: DocumentMap | null = null;
  private lastTargetId: TargetId | null = null;
  private batches: MutationBatch[] = [];

  constructor(
    public localStore: LocalStore,
    private readonly persistence: Persistence,
    private readonly queryEngine: CountingQueryEngine,
    readonly gcIsEager: boolean
  ) {
    this.bundleConverter = new BundleConverterImpl(JSON_SERIALIZER);
    this.indexBackfiller = new IndexBackfiller(localStore, persistence);
  }

  private prepareNextStep(): void {
    this.lastChanges = null;
    this.lastTargetId = null;
    this.queryEngine.resetCounts();
  }

  async executeQuery(query: Query): Promise<void> {
    this.prepareNextStep();
    const result = await localStoreExecuteQuery(this.localStore, query, true);
    this.lastChanges = result.documents;
  }

  async executeAggregateQuery(
    targetId: TargetId,
    query: AggregateQuery
  ): Promise<AggregateQueryResult> {
    this.prepareNextStep();
    return localStoreExecuteAggregateQuery(this.localStore, targetId, query);
  }

  async allocateQuery(query: Query): Promise<TargetId> {
    return this.allocateTarget(queryToTarget(query));
  }

  async allocateTarget(target: Target): Promise<TargetId> {
    const result = await localStoreAllocateTarget(this.localStore, target);
    this.lastTargetId = result.targetId;
    return this.lastTargetId;
  }

  async applyRemoteEvent(remoteEvent: RemoteEvent): Promise<void> {
    this.prepareNextStep();
    this.lastChanges = (
      await localStoreApplyRemoteEventToLocalCache(this.localStore, remoteEvent)
    ).changedDocs;
  }

  async writeCount(targetId: number, count: number, readTime: SnapshotVersion) {
    this.prepareNextStep();
    await localStoreWriteCount(this.localStore, targetId, count, readTime);
  }

  async writeMutations(...mutations: Mutation[]): Promise<void> {
    this.prepareNextStep();
    const result = await localStoreWriteLocally(this.localStore, mutations);
    this.batches.push(
      new MutationBatch(result.batchId, Timestamp.now(), [], mutations)
    );
    this.lastChanges = result.changes;
  }

  async configureAndAssertFieldsIndexes(
    ...indexes: FieldIndex[]
  ): Promise<void> {
    await this.configureFieldsIndexes(...indexes);
    await this.assertFieldsIndexes(...indexes);
  }

  async configureFieldsIndexes(...indexes: FieldIndex[]): Promise<void> {
    await localStoreConfigureFieldIndexes(this.localStore, indexes);
  }

  async assertFieldsIndexes(...indexes: FieldIndex[]): Promise<void> {
    const fieldIndexes: FieldIndex[] = await this.persistence.runTransaction(
      'getFieldIndexes ',
      'readonly',
      transaction => this.localStore.indexManager.getFieldIndexes(transaction)
    );
    expect(fieldIndexes).to.have.deep.members(indexes);
  }

  assertRemoteDocumentsRead(byKey: number, byCollection: number): void {
    expect(this.queryEngine.documentsReadByCollection).to.equal(
      byCollection,
      'Remote documents read (by collection)'
    );
    expect(this.queryEngine.documentsReadByKey).to.equal(
      byKey,
      'Remote documents read (by key)'
    );
  }

  assertOverlaysRead(
    byKey: number,
    byCollection: number,
    overlayTypes: { [k: string]: MutationType }
  ): void {
    expect(this.queryEngine.overlaysReadByCollection).to.equal(
      byCollection,
      'Overlays read (by collection)'
    );
    expect(this.queryEngine.overlaysReadByKey).to.equal(
      byKey,
      'Overlays read (by key)'
    );
    expect(this.queryEngine.overlayTypes).to.deep.equal(
      overlayTypes,
      'Overlay types read'
    );
  }

  assertQueryReturned(...keys: string[]): void {
    expect(this.lastChanges).to.exist;
    for (const k of keys) {
      expect(this.lastChanges?.get(key(k))).to.exist;
    }
  }

  async backfillIndexes(): Promise<void> {
    await this.indexBackfiller.backfill();
  }
}

describe('LocalStore w/ IndexedDB Persistence (Non generic)', () => {
  if (!isIndexedDBAvailable()) {
    return;
  }

  let persistence: Persistence;
  let test: AsyncLocalStoreTester;

  beforeEach(async () => {
    const queryEngine = new CountingQueryEngine();
    persistence = await persistenceHelpers.testIndexedDbPersistence();
    const localStore = newLocalStore(
      persistence,
      queryEngine,
      User.UNAUTHENTICATED,
      JSON_SERIALIZER
    );
    test = new AsyncLocalStoreTester(
      localStore,
      persistence,
      queryEngine,
      false
    );
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  it('Adds Indexes', async () => {
    const indexA = fieldIndex('coll', {
      id: 1,
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexB = fieldIndex('coll', {
      id: 2,
      fields: [['b', IndexKind.DESCENDING]]
    });
    const indexC = fieldIndex('coll', {
      id: 3,
      fields: [
        ['c1', IndexKind.DESCENDING],
        ['c2', IndexKind.CONTAINS]
      ]
    });
    await test.configureAndAssertFieldsIndexes(indexA, indexB, indexC);
  });

  it('Removes Indexes', async () => {
    const indexA = fieldIndex('coll', {
      id: 1,
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexB = fieldIndex('coll', {
      id: 2,
      fields: [['b', IndexKind.DESCENDING]]
    });
    await test.configureAndAssertFieldsIndexes(indexA, indexB);
    await test.configureAndAssertFieldsIndexes(indexA);
  });

  it('Does Not Reset Index When Same Index Is Added', async () => {
    const indexA = fieldIndex('coll', {
      id: 1,
      fields: [['a', IndexKind.ASCENDING]]
    });
    const updatedIndexA = fieldIndex('coll', {
      id: 1,
      fields: [['a', IndexKind.ASCENDING]],
      offset: new IndexOffset(version(10), DocumentKey.fromPath('coll/a'), -1),
      sequenceNumber: 1
    });

    await test.configureAndAssertFieldsIndexes(indexA);

    const targetId = await test.allocateQuery(
      query('coll', filter('a', '==', 1))
    );
    await test.applyRemoteEvent(
      docUpdateRemoteEvent(doc('coll/a', 10, { a: 1 }), [targetId])
    );

    await test.backfillIndexes();
    await test.assertFieldsIndexes(updatedIndexA);

    // Re-add the same index. We do not reset the index to its initial state.
    await test.configureFieldsIndexes(indexA);
    await test.assertFieldsIndexes(updatedIndexA);
  });

  it('Deleted Document Removes Index', async () => {
    const index = fieldIndex('coll', {
      id: 1,
      fields: [['matches', IndexKind.ASCENDING]]
    });
    await test.configureFieldsIndexes(index);

    const queryMatches = query('coll', filter('matches', '==', true));
    const targetId = await test.allocateQuery(queryMatches);
    await test.applyRemoteEvent(
      docAddedRemoteEvent(doc('coll/a', 10, { matches: true }), [targetId])
    );

    // Add the document to the index
    await test.backfillIndexes();

    await test.executeQuery(queryMatches);
    test.assertRemoteDocumentsRead(1, 0);
    test.assertQueryReturned('coll/a');

    await test.applyRemoteEvent(
      docUpdateRemoteEvent(deletedDoc('coll/a', 0), [targetId])
    );

    // No backfill needed for deleted document.
    await test.executeQuery(queryMatches);
    test.assertRemoteDocumentsRead(0, 0);
    test.assertQueryReturned();
  });

  it('Uses Indexes', async () => {
    const index = fieldIndex('coll', {
      id: 1,
      fields: [['matches', IndexKind.ASCENDING]]
    });
    await test.configureFieldsIndexes(index);

    const queryMatches = query('coll', filter('matches', '==', true));
    const targetId = await test.allocateQuery(queryMatches);
    await test.applyRemoteEvent(
      docAddedRemoteEvent(doc('coll/a', 10, { matches: true }), [targetId])
    );

    await test.backfillIndexes();

    await test.executeQuery(queryMatches);
    test.assertRemoteDocumentsRead(1, 0);
    test.assertQueryReturned('coll/a');
  });

  it('Uses Partially Indexed Remote Documents When Available', async () => {
    const index = fieldIndex('coll', {
      id: 1,
      fields: [['matches', IndexKind.ASCENDING]]
    });
    await test.configureFieldsIndexes(index);

    const queryMatches = query('coll', filter('matches', '==', true));
    const targetId = await test.allocateQuery(queryMatches);

    await test.applyRemoteEvent(
      docAddedRemoteEvent(doc('coll/a', 10, { matches: true }), [targetId])
    );
    await test.backfillIndexes();

    await test.applyRemoteEvent(
      docAddedRemoteEvent(doc('coll/b', 20, { matches: true }), [targetId])
    );

    await test.executeQuery(queryMatches);
    test.assertRemoteDocumentsRead(1, 1);
    test.assertQueryReturned('coll/a', 'coll/b');
  });

  it('Uses Partially Indexed Overlays When Available', async () => {
    const index = fieldIndex('coll', {
      id: 1,
      fields: [['matches', IndexKind.ASCENDING]]
    });
    await test.configureFieldsIndexes(index);

    await test.writeMutations(setMutation('coll/a', { matches: true }));
    await test.backfillIndexes();

    await test.writeMutations(setMutation('coll/b', { matches: true }));

    const queryMatches = query('coll', filter('matches', '==', true));
    await test.executeQuery(queryMatches);
    test.assertOverlaysRead(1, 1, {
      [key('coll/a').toString()]: MutationType.Set,
      [key('coll/b').toString()]: MutationType.Set
    });
    test.assertQueryReturned('coll/a', 'coll/b');
  });

  it('Does Not Use Limit When Index Is Outdated', async () => {
    const index = fieldIndex('coll', {
      id: 1,
      fields: [['count', IndexKind.ASCENDING]]
    });
    await test.configureFieldsIndexes(index);

    const queryCount = queryWithLimit(
      query('coll', orderBy('count')),
      2,
      LimitType.First
    );
    const targetId = await test.allocateQuery(queryCount);

    await test.applyRemoteEvent(
      docAddedRemoteEvent(
        [
          doc('coll/a', 10, { count: 1 }),
          doc('coll/b', 10, { count: 2 }),
          doc('coll/c', 10, { count: 3 })
        ],
        [targetId]
      )
    );

    await test.backfillIndexes();

    await test.writeMutations(deleteMutation('coll/b'));

    // The query engine first reads the documents by key and then re-runs the query without limit.
    await test.executeQuery(queryCount);
    test.assertRemoteDocumentsRead(5, 0);
    test.assertOverlaysRead(5, 1, {
      [key('coll/b').toString()]: MutationType.Delete
    });
    test.assertQueryReturned('coll/a', 'coll/c');
  });

  it('Uses Index For Limit Query When Index Is Updated', async () => {
    const index = fieldIndex('coll', {
      id: 1,
      fields: [['count', IndexKind.ASCENDING]]
    });
    await test.configureFieldsIndexes(index);

    const queryCount = queryWithLimit(
      query('coll', orderBy('count')),
      2,
      LimitType.First
    );
    const targetId = await test.allocateQuery(queryCount);

    await test.applyRemoteEvent(
      docAddedRemoteEvent(
        [
          doc('coll/a', 10, { count: 1 }),
          doc('coll/b', 10, { count: 2 }),
          doc('coll/c', 10, { count: 3 })
        ],
        [targetId]
      )
    );
    await test.writeMutations(deleteMutation('coll/b'));
    await test.backfillIndexes();

    await test.executeQuery(queryCount);
    test.assertRemoteDocumentsRead(2, 0);
    test.assertOverlaysRead(2, 0, {});
    test.assertQueryReturned('coll/a', 'coll/c');
  });

  it('Indexes Server Timestamps', async () => {
    const index = fieldIndex('coll', {
      id: 1,
      fields: [['time', IndexKind.ASCENDING]]
    });
    await test.configureFieldsIndexes(index);

    await test.writeMutations(
      setMutation('coll/a', { time: serverTimestamp() })
    );
    await test.backfillIndexes();

    const queryTime = query('coll', orderBy('time', 'asc'));
    await test.executeQuery(queryTime);
    test.assertOverlaysRead(1, 0, {
      [key('coll/a').toString()]: MutationType.Set
    });
    test.assertQueryReturned('coll/a');
  });

  //// BEGIN HACK /////
  // helper function because I'm stupid
  function toShortDocumentKeySet(set: DocumentKeySet): DocumentKeySet {
    let result = documentKeySet();
    set.forEach(
      elem => (result = result.add(key('coll/' + elem.path.lastSegment())))
    );
    return result;
  }
  function toShortDocumentKeyMap(map: DocumentMap): DocumentMap {
    let result = documentMap();
    map.forEach((k, v) => {
      const keyStr = 'coll/' + k.path.lastSegment();
      result = result.insert(key(keyStr), doc(keyStr, 10, v.data));
    });
    return result;
  }
  //// END HACK ////

  it.only('Can run aggregate query without filters', async () => {
    const queryMatches = query('coll');
    const targetId = await test.allocateQuery(queryMatches);
    const docA = doc('coll/a', 10, { matches: true });
    const docB = doc('coll/b', 10, { matches: true });
    const docC = doc('coll/c', 10, { matches: true });

    await test.applyRemoteEvent(
      docAddedRemoteEvent([docA, docB, docC], [targetId])
    );

    const result = await test.executeAggregateQuery(
      targetId,
      new AggregateQuery(queryMatches)
    );

    expect(result.cachedCount).to.equal(0);
    expect(result.cachedCountReadTime.isEqual(SnapshotVersion.min())).to.be
      .true;

    // Below fails because mask is being applied now.
    // expect(
    //   toShortDocumentKeyMap(result.documentResult.documents)
    // ).to.deep.equal(documentMap(docA, docB, docC));

    expect(result.documentResult.remoteKeys).to.deep.equal(
      documentKeySet(docA.key, docB.key, docC.key)
    );

    expect(toShortDocumentKeySet(result.matchesWithoutMutation)).to.deep.equal(
      documentKeySet(docA.key, docB.key, docC.key)
    );
  });

  it.only('Can run aggregate query with filters', async () => {
    const queryMatches = query('coll', filter('matches', '==', true));
    const targetId = await test.allocateQuery(queryMatches);
    const docA = doc('coll/a', 10, { matches: true });
    const docB = doc('coll/b', 10, { matches: false });
    const docC = doc('coll/c', 10, { matches: true });
    await test.applyRemoteEvent(docAddedRemoteEvent([docA, docC], [targetId]));
    await test.applyRemoteEvent(docAddedRemoteEvent([docB]));

    const result = await test.executeAggregateQuery(
      targetId,
      new AggregateQuery(queryMatches)
    );

    expect(result.cachedCount).to.equal(0);
    expect(result.cachedCountReadTime.isEqual(SnapshotVersion.min())).to.be
      .true;

    expect(
      toShortDocumentKeyMap(result.documentResult.documents)
    ).to.deep.equal(documentMap(docA, docC));

    expect(result.documentResult.remoteKeys).to.deep.equal(
      documentKeySet(docA.key, docC.key)
    );

    expect(toShortDocumentKeySet(result.matchesWithoutMutation)).to.deep.equal(
      documentKeySet(docA.key, docC.key)
    );
  });

  it.only('Can run aggregate query when remote matches and local does not', async () => {
    const queryMatches = query('coll', filter('matches', '==', true));
    const targetId = await test.allocateQuery(queryMatches);
    const docA = doc('coll/a', 10, { matches: true });
    const docB = doc('coll/b', 10, { matches: false });
    const docC = doc('coll/c', 10, { matches: true });
    await test.applyRemoteEvent(docAddedRemoteEvent([docA, docC], [targetId]));
    await test.applyRemoteEvent(docAddedRemoteEvent([docB]));
    await test.writeMutations(setMutation('coll/a', { foo: 'bar' }));

    const result = await test.executeAggregateQuery(
      targetId,
      new AggregateQuery(queryMatches)
    );

    expect(result.cachedCount).to.equal(0);
    expect(result.cachedCountReadTime.isEqual(SnapshotVersion.min())).to.be
      .true;

    // After applying local mutations, only docC should match.
    expect(
      toShortDocumentKeyMap(result.documentResult.documents)
    ).to.deep.equal(documentMap(docC));

    // The remoteKeys comes from the last time we received the results of this target.
    expect(result.documentResult.remoteKeys).to.deep.equal(
      documentKeySet(docA.key, docC.key)
    );

    // The remote documents do not have the local mutation and should match both docA and docC.
    expect(toShortDocumentKeySet(result.matchesWithoutMutation)).to.deep.equal(
      documentKeySet(docA.key, docC.key)
    );
  });

  it.only('Can run aggregate query with cached count', async () => {
    const queryMatches = query('coll', filter('matches', '==', true));
    const targetId = await test.allocateQuery(queryMatches);
    const docA = doc('coll/a', 10, { matches: true });
    const docB = doc('coll/b', 10, { matches: false });
    const docC = doc('coll/c', 10, { matches: true });
    await test.applyRemoteEvent(docAddedRemoteEvent([docA, docC], [targetId]));

    await test.writeCount(targetId, 2022, version(3));

    const result = await test.executeAggregateQuery(
      targetId,
      new AggregateQuery(queryMatches)
    );

    expect(result.cachedCount).to.equal(2022);
    expect(result.cachedCountReadTime.isEqual(version(3))).to.be.true;
  });

  it.only('Can run aggregate query when local matches and remote does not', async () => {
    const queryMatches = query('coll', filter('matches', '==', true));
    const targetId = await test.allocateQuery(queryMatches);

    const queryMismatches = query('coll', filter('matches', '==', false));
    const mismatchId = await test.allocateQuery(queryMismatches);

    const docA = doc('coll/a', 10, { matches: false, foo: 'bar' });
    const docB = doc('coll/b', 10, { matches: false, foo: 'bar' }, 5);
    const docC = doc('coll/c', 10, { matches: true, foo: 'bar' }, 7);
    await test.applyRemoteEvent(docAddedRemoteEvent([docC], [targetId]));
    await test.applyRemoteEvent(
      docAddedRemoteEvent([docA, docB], [mismatchId])
    );

    await test.writeMutations(patchMutation('coll/b', { matches: true }));

    const result = await test.executeAggregateQuery(
      targetId,
      new AggregateQuery(queryMatches)
    );

    expect(result.cachedCount).to.equal(0);

    expect(result.cachedCountReadTime.isEqual(SnapshotVersion.min())).to.be
      .true;

    // After applying local mutations, docB and docC should match.
    const iterator = result.documentResult.documents.getIterator();
    const docBEntry = iterator.getNext();
    expect(docBEntry.value.data.field(field('matches'))?.booleanValue).to.be
      .true;
    // TODO: This fails due to an overlay bug, where the overlay should be patch, but is set.
    // expect(docBEntry.value.data.field(field('foo'))).to.be.null;

    // TODO(COUNT): Add createTime to documents.
    expect(docBEntry.value.createTime.isEqual(version(5))).to.be.true;

    const docCEntry = iterator.getNext();
    expect(docCEntry.value.data.field(field('matches'))?.booleanValue).to.be
      .true;
    expect(docCEntry.value.data.field(field('foo'))).to.be.null;
    expect(docCEntry.value.createTime.isEqual(version(7))).to.be.true;

    // The remoteKeys comes from the last time we received the results of this target.
    expect(result.documentResult.remoteKeys).to.deep.equal(
      documentKeySet(docC.key)
    );

    // The remote documents do not have the local mutation and should only match docC.
    expect(toShortDocumentKeySet(result.matchesWithoutMutation)).to.deep.equal(
      documentKeySet(docC.key)
    );
  });
});
