/**
 * @license
 * Copyright 2017 Google LLC
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

import { arrayUnion, increment, Pipeline, Timestamp } from '../../../src';
import { User } from '../../../src/auth/user';
import { BundledDocuments, NamedQuery } from '../../../src/core/bundle';
import { BundleConverterImpl } from '../../../src/core/bundle_impl';
import {
  LimitType,
  Query,
  queryEquals,
  queryToTarget,
  queryWithLimit
} from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { Target } from '../../../src/core/target';
import { BatchId, TargetId } from '../../../src/core/types';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { LocalStore } from '../../../src/local/local_store';
import {
  localStoreAcknowledgeBatch,
  localStoreAllocateTarget,
  localStoreApplyBundledDocuments,
  localStoreApplyRemoteEventToLocalCache,
  localStoreExecuteQuery as prodLocalStoreExecuteQuery,
  localStoreGetHighestUnacknowledgedBatchId,
  localStoreGetTargetData,
  localStoreGetNamedQuery,
  localStoreSetIndexAutoCreationEnabled,
  localStoreHasNewerBundle,
  localStoreWriteLocally,
  LocalWriteResult,
  localStoreNotifyLocalViewChanges,
  localStoreReadDocument,
  localStoreRejectBatch,
  localStoreReleaseTarget,
  localStoreSaveBundle,
  localStoreSaveNamedQuery,
  newLocalStore
} from '../../../src/local/local_store_impl';
import { LocalViewChanges } from '../../../src/local/local_view_changes';
import { Persistence } from '../../../src/local/persistence';
import {
  DocumentKeySet,
  documentKeySet,
  DocumentMap
} from '../../../src/model/collections';
import { Document } from '../../../src/model/document';
import { FieldMask } from '../../../src/model/field_mask';
import {
  FieldTransform,
  Mutation,
  MutationResult,
  MutationType,
  PatchMutation,
  Precondition
} from '../../../src/model/mutation';
import {
  MutationBatch,
  MutationBatchResult
} from '../../../src/model/mutation_batch';
import { ObjectValue } from '../../../src/model/object_value';
import { serverTimestamp } from '../../../src/model/server_timestamps';
import { ServerTimestampTransform } from '../../../src/model/transform_operation';
import { BundleMetadata as ProtoBundleMetadata } from '../../../src/protos/firestore_bundle_proto';
import * as api from '../../../src/protos/firestore_proto_api';
import { RemoteEvent } from '../../../src/remote/remote_event';
import {
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import { debugAssert } from '../../../src/util/assert';
import { ByteString } from '../../../src/util/byte_string';
import { BATCHID_UNKNOWN } from '../../../src/util/types';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  bundledDocuments,
  bundleMetadata,
  byteStringFromString,
  deletedDoc,
  deleteMutation,
  doc,
  docAddedRemoteEvent,
  docUpdateRemoteEvent,
  existenceFilterEvent,
  expectEqual,
  field,
  filter,
  key,
  localViewChanges,
  mapAsArray,
  namedQuery,
  noChangeEvent,
  orderBy,
  patchMutation,
  query,
  setMutation,
  TestBundledDocuments,
  TestNamedQuery,
  TestSnapshotVersion,
  unknownDoc,
  version
} from '../../util/helpers';

import { CountingQueryEngine } from './counting_query_engine';
import * as persistenceHelpers from './persistence_test_helpers';
import { JSON_SERIALIZER } from './persistence_test_helpers';
import { TargetOrPipeline, toPipeline } from '../../../src/core/pipeline-util';
import { newTestFirestore } from '../../util/api_helpers';
import { toCorePipeline } from '../../util/pipelines';

export interface LocalStoreComponents {
  queryEngine: CountingQueryEngine;
  persistence: Persistence;
  localStore: LocalStore;
}

class LocalStoreTester {
  private promiseChain: Promise<void> = Promise.resolve();
  private lastChanges: DocumentMap | null = null;
  private lastTargetId: TargetId | null = null;
  private batches: MutationBatch[] = [];
  private bundleConverter: BundleConverterImpl;

  private queryExecutionCount = 0;

  constructor(
    public localStore: LocalStore,
    private readonly persistence: Persistence,
    private readonly queryEngine: CountingQueryEngine,
    readonly options: { gcIsEager: boolean; convertToPipeline: boolean }
  ) {
    this.bundleConverter = new BundleConverterImpl(JSON_SERIALIZER);
  }

  private prepareNextStep(): void {
    this.promiseChain = this.promiseChain.then(() => {
      this.lastChanges = null;
      this.lastTargetId = null;
      this.queryEngine.resetCounts();
    });
  }

  after(
    op:
      | Mutation
      | Mutation[]
      | RemoteEvent
      | LocalViewChanges
      | TestBundledDocuments
      | TestNamedQuery
  ): LocalStoreTester {
    if (op instanceof Mutation) {
      return this.afterMutations([op]);
    } else if (op instanceof Array) {
      return this.afterMutations(op);
    } else if (op instanceof LocalViewChanges) {
      return this.afterViewChanges(op);
    } else if (op instanceof RemoteEvent) {
      return this.afterRemoteEvent(op);
    } else if (op instanceof TestBundledDocuments) {
      return this.afterBundleDocuments(op.documents, op.bundleName);
    } else {
      return this.afterNamedQuery(op);
    }
  }

  afterMutations(mutations: Mutation[]): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain
      .then(() => localStoreWriteLocally(this.localStore, mutations))
      .then((result: LocalWriteResult) => {
        this.batches.push(
          new MutationBatch(result.batchId, Timestamp.now(), [], mutations)
        );
        this.lastChanges = result.changes;
      });
    return this;
  }

  afterRemoteEvent(remoteEvent: RemoteEvent): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain
      .then(() =>
        localStoreApplyRemoteEventToLocalCache(this.localStore, remoteEvent)
      )
      .then((result: DocumentMap) => {
        this.lastChanges = result;
      });
    return this;
  }

  afterBundleDocuments(
    documents: BundledDocuments,
    bundleName?: string
  ): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain
      .then(() =>
        localStoreApplyBundledDocuments(
          this.localStore,
          this.bundleConverter,
          documents,
          bundleName || ''
        )
      )
      .then(result => {
        this.lastChanges = result;
      });
    return this;
  }

  afterNamedQuery(testQuery: TestNamedQuery): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      localStoreSaveNamedQuery(
        this.localStore,
        testQuery.namedQuery,
        testQuery.matchingDocuments
      )
    );
    return this;
  }

  afterViewChanges(viewChanges: LocalViewChanges): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      localStoreNotifyLocalViewChanges(this.localStore, [viewChanges])
    );
    return this;
  }

  afterAcknowledgingMutation(options: {
    documentVersion: TestSnapshotVersion;
    transformResults?: api.Value[];
  }): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain
      .then(() => {
        const batch = this.batches.shift()!;
        const ver = version(options.documentVersion);
        const mutationResults = options.transformResults
          ? options.transformResults.map(
              value => new MutationResult(ver, [value])
            )
          : [new MutationResult(ver, [])];
        const write = MutationBatchResult.from(batch, ver, mutationResults);

        return localStoreAcknowledgeBatch(this.localStore, write);
      })
      .then((changes: DocumentMap) => {
        this.lastChanges = changes;
      });
    return this;
  }

  afterRejectingMutation(): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain
      .then(() =>
        localStoreRejectBatch(this.localStore, this.batches.shift()!.batchId)
      )
      .then((changes: DocumentMap) => {
        this.lastChanges = changes;
      });
    return this;
  }

  afterAllocatingQuery(query: Query): LocalStoreTester {
    if (this.options.convertToPipeline) {
      return this.afterAllocatingTarget(
        toCorePipeline(toPipeline(query, newTestFirestore()))
      );
    }
    return this.afterAllocatingTarget(queryToTarget(query));
  }

  afterAllocatingTarget(target: TargetOrPipeline): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      localStoreAllocateTarget(this.localStore, target).then(result => {
        this.lastTargetId = result.targetId;
      })
    );
    return this;
  }

  afterReleasingTarget(targetId: number): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      localStoreReleaseTarget(
        this.localStore,
        targetId,
        /*keepPersistedTargetData=*/ false
      )
    );
    return this;
  }

  afterExecutingQuery(query: Query): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      prodLocalStoreExecuteQuery(
        this.localStore,
        this.options.convertToPipeline
          ? toCorePipeline(toPipeline(query, newTestFirestore()))
          : query,
        /* usePreviousResults= */ true
      ).then(({ documents }) => {
        this.queryExecutionCount++;
        this.lastChanges = documents;
      })
    );
    return this;
  }

  /**
   * Asserts the expected number of mutations and documents read by
   * the MutationQueue and the RemoteDocumentCache.
   *
   * @param expectedCount.mutationsByQuery - The number of mutations read by
   * executing a collection scan against the MutationQueue.
   * @param expectedCount.mutationsByKey - The number of mutations read by
   * document key lookups.
   * @param expectedCount.documentsByQuery - The number of mutations read by
   * executing a collection scan against the RemoteDocumentCache.
   * @param expectedCount.documentsByKey - The number of documents read by
   * document key lookups.
   */
  toHaveRead(expectedCount: {
    overlaysByCollection?: number;
    overlaysByKey?: number;
    documentsByCollection?: number;
    documentsByKey?: number;
    overlayTypes?: { [k: string]: MutationType };
  }): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      const actualCount: typeof expectedCount = {};
      if (expectedCount.overlaysByCollection !== undefined) {
        actualCount.overlaysByCollection =
          this.queryEngine.overlaysReadByCollection;
      }
      if (expectedCount.overlaysByKey !== undefined) {
        actualCount.overlaysByKey = this.queryEngine.overlaysReadByKey;
      }
      if (expectedCount.overlayTypes !== undefined) {
        actualCount.overlayTypes = this.queryEngine.overlayTypes;
      }
      if (expectedCount.documentsByCollection !== undefined) {
        actualCount.documentsByCollection =
          this.queryEngine.documentsReadByCollection;
      }
      if (expectedCount.documentsByKey !== undefined) {
        actualCount.documentsByKey = this.queryEngine.documentsReadByKey;
      }
      expect(actualCount).to.deep.eq(
        expectedCount,
        `query execution #${this.queryExecutionCount}`
      );
    });
    return this;
  }

  toReturnTargetId(id: TargetId): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      expect(this.lastTargetId).to.equal(id);
    });
    return this;
  }

  toContainTargetData(
    target: TargetOrPipeline,
    snapshotVersion: number,
    lastLimboFreeSnapshotVersion: number,
    resumeToken: ByteString
  ): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(async () => {
      const targetData = await this.persistence.runTransaction(
        'getTargetData',
        'readonly',
        txn => localStoreGetTargetData(this.localStore, txn, target)
      );
      expect(targetData!.snapshotVersion.isEqual(version(snapshotVersion))).to
        .be.true;
      expect(
        targetData!.lastLimboFreeSnapshotVersion.isEqual(
          version(lastLimboFreeSnapshotVersion)
        )
      ).to.be.true;
      expect(targetData!.resumeToken.isEqual(resumeToken)).to.be.true;
    });
    return this;
  }

  toReturnChangedInternal(
    docs: Document[],
    isEqual?: (lhs: Document | null, rhs: Document | null) => boolean
  ): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      debugAssert(
        this.lastChanges !== null,
        'Called toReturnChanged() without prior after()'
      );
      expect(this.lastChanges.size).to.equal(docs.length, 'number of changes');
      for (const doc of docs) {
        const returned = this.lastChanges.get(doc.key);
        const message = `Expected '${returned}' to equal '${doc}'.`;
        if (isEqual) {
          expect(isEqual(doc, returned)).to.equal(true, message);
        } else {
          expectEqual(doc, returned, message);
        }
      }
      this.lastChanges = null;
    });
    return this;
  }

  toReturnChanged(...docs: Document[]): LocalStoreTester {
    return this.toReturnChangedInternal(docs);
  }

  toReturnChangedWithDocComparator(
    isEqual: (lhs: Document | null, rhs: Document | null) => boolean,
    ...docs: Document[]
  ): LocalStoreTester {
    return this.toReturnChangedInternal(docs, isEqual);
  }

  toReturnRemoved(...keyStrings: string[]): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      debugAssert(
        this.lastChanges !== null,
        'Called toReturnRemoved() without prior after()'
      );
      expect(this.lastChanges.size).to.equal(
        keyStrings.length,
        'Number of actual changes mismatched number of expected changes'
      );
      for (const keyString of keyStrings) {
        const returned = this.lastChanges.get(key(keyString));
        expect(returned?.isFoundDocument()).to.be.false;
      }
      this.lastChanges = null;
    });
    return this;
  }

  toContain(
    doc: Document,
    isEqual?: (lhs: Document, rhs: Document) => boolean
  ): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return localStoreReadDocument(this.localStore, doc.key).then(result => {
        const message = `Expected ${
          result ? result.toString() : null
        } to match ${doc.toString()}.`;
        if (isEqual) {
          expect(isEqual(result, doc)).to.equal(true, message);
        } else {
          expectEqual(result, doc, message);
        }
      });
    });
    return this;
  }

  toNotContain(keyStr: string): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() =>
      localStoreReadDocument(this.localStore, key(keyStr)).then(result => {
        expect(result.isValidDocument()).to.be.false;
      })
    );
    return this;
  }

  toNotContainIfEager(doc: Document): LocalStoreTester {
    if (this.options.gcIsEager) {
      return this.toNotContain(doc.key.toString());
    } else {
      return this.toContain(doc);
    }
  }

  toReturnHighestUnacknowledgeBatchId(expectedId: BatchId): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() =>
      localStoreGetHighestUnacknowledgedBatchId(this.localStore).then(
        actual => {
          expect(actual).to.equal(expectedId);
        }
      )
    );
    return this;
  }

  toHaveQueryDocumentMapping(
    persistence: Persistence,
    targetId: TargetId,
    expectedKeys: DocumentKeySet
  ): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return persistence.runTransaction(
        'toHaveQueryDocumentMapping',
        'readonly',
        transaction => {
          return persistence
            .getTargetCache()
            .getMatchingKeysForTargetId(transaction, targetId)
            .next(matchedKeys => {
              expect(matchedKeys.isEqual(expectedKeys)).to.be.true;
            });
        }
      );
    });

    return this;
  }

  toHaveNewerBundle(
    metadata: ProtoBundleMetadata,
    expected: boolean
  ): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return localStoreHasNewerBundle(this.localStore, metadata).then(
        actual => {
          expect(actual).to.equal(expected);
        }
      );
    });
    return this;
  }

  toHaveNamedQuery(namedQuery: NamedQuery): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return localStoreGetNamedQuery(this.localStore, namedQuery.name).then(
        actual => {
          expect(actual).to.exist;
          expect(actual!.name).to.equal(namedQuery.name);
          expect(namedQuery.readTime.isEqual(actual!.readTime)).to.be.true;
          expect(queryEquals(actual!.query, namedQuery.query)).to.be.true;
        }
      );
    });
    return this;
  }

  afterSavingBundle(metadata: ProtoBundleMetadata): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() =>
      localStoreSaveBundle(this.localStore, metadata)
    );
    return this;
  }

  finish(): Promise<void> {
    return this.promiseChain;
  }
}

// The `isEqual` method for the Document class does not compare createTime and
// readTime. For some tests, we'd like to verify that a certain createTime has
// been calculated for documents. In such cases we can use this comparator.
function compareDocsWithCreateTime(
  lhs: Document | null,
  rhs: Document | null
): boolean {
  return (
    (lhs === null && rhs === null) ||
    (lhs !== null &&
      rhs !== null &&
      lhs.isEqual(rhs) &&
      lhs.createTime.isEqual(rhs.createTime))
  );
}

describe('LocalStore w/ Memory Persistence', () => {
  async function initialize(): Promise<LocalStoreComponents> {
    const queryEngine = new CountingQueryEngine();
    const persistence = await persistenceHelpers.testMemoryEagerPersistence();
    const localStore = newLocalStore(
      persistence,
      queryEngine,
      User.UNAUTHENTICATED,
      JSON_SERIALIZER
    );
    return { queryEngine, persistence, localStore };
  }

  addEqualityMatcher();
  genericLocalStoreTests(initialize, {
    gcIsEager: true,
    convertToPipeline: false
  });
});

describe('LocalStore w/ Memory Persistence and Pipelines', () => {
  async function initialize(): Promise<LocalStoreComponents> {
    const queryEngine = new CountingQueryEngine();
    const persistence = await persistenceHelpers.testMemoryEagerPersistence();
    const localStore = newLocalStore(
      persistence,
      queryEngine,
      User.UNAUTHENTICATED,
      JSON_SERIALIZER
    );
    return { queryEngine, persistence, localStore };
  }

  addEqualityMatcher();
  genericLocalStoreTests(initialize, {
    gcIsEager: true,
    convertToPipeline: true
  });
});

describe('LocalStore w/ IndexedDB Persistence', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn(
      'No IndexedDB. Skipping LocalStore w/ IndexedDB persistence tests.'
    );
    return;
  }

  async function initialize(): Promise<LocalStoreComponents> {
    const queryEngine = new CountingQueryEngine();
    const persistence = await persistenceHelpers.testIndexedDbPersistence();
    const localStore = newLocalStore(
      persistence,
      queryEngine,
      User.UNAUTHENTICATED,
      JSON_SERIALIZER
    );
    return { queryEngine, persistence, localStore };
  }

  addEqualityMatcher();
  genericLocalStoreTests(initialize, {
    gcIsEager: false,
    convertToPipeline: false
  });
});

describe('LocalStore w/ IndexedDB Persistence and Pipeline', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn(
      'No IndexedDB. Skipping LocalStore w/ IndexedDB persistence tests.'
    );
    return;
  }

  async function initialize(): Promise<LocalStoreComponents> {
    const queryEngine = new CountingQueryEngine();
    const persistence = await persistenceHelpers.testIndexedDbPersistence();
    const localStore = newLocalStore(
      persistence,
      queryEngine,
      User.UNAUTHENTICATED,
      JSON_SERIALIZER
    );
    return { queryEngine, persistence, localStore };
  }

  addEqualityMatcher();
  genericLocalStoreTests(initialize, {
    gcIsEager: false,
    convertToPipeline: true
  });
});

function genericLocalStoreTests(
  getComponents: () => Promise<LocalStoreComponents>,
  options: {
    gcIsEager: boolean;
    convertToPipeline: boolean;
  }
): void {
  let persistence: Persistence;
  let localStore: LocalStore;
  let queryEngine: CountingQueryEngine;

  beforeEach(async () => {
    const components = await getComponents();
    persistence = components.persistence;
    localStore = components.localStore;
    queryEngine = components.queryEngine;
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  function expectLocalStore(): LocalStoreTester {
    return new LocalStoreTester(localStore, persistence, queryEngine, options);
  }

  function localStoreExecuteQuery(
    localStore: LocalStore,
    query: Query,
    usePreviousResult: boolean
  ) {
    return prodLocalStoreExecuteQuery(
      localStore,
      options.convertToPipeline
        ? toCorePipeline(toPipeline(query, newTestFirestore()))
        : query,
      false
    );
  }

  it('localStoreSetIndexAutoCreationEnabled()', () => {
    localStoreSetIndexAutoCreationEnabled(localStore, true);
    expect(queryEngine.indexAutoCreationEnabled).to.be.true;
    localStoreSetIndexAutoCreationEnabled(localStore, false);
    expect(queryEngine.indexAutoCreationEnabled).to.be.false;
    localStoreSetIndexAutoCreationEnabled(localStore, true);
    expect(queryEngine.indexAutoCreationEnabled).to.be.true;
    localStoreSetIndexAutoCreationEnabled(localStore, false);
    expect(queryEngine.indexAutoCreationEnabled).to.be.false;
  });

  it('handles SetMutation', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar' }).setHasCommittedMutations()
      )
      .toNotContainIfEager(
        doc('foo/bar', 1, { foo: 'bar' }).setHasCommittedMutations()
      )
      .finish();
  });

  it('handles SetMutation -> Document', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .afterAllocatingQuery(query('foo'))
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { it: 'changed' }), [2]))
      .toReturnChanged(doc('foo/bar', 2, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 2, { foo: 'bar' }).setHasLocalMutations())
      .finish();
  });

  it(
    'handles SetMutation -> Ack (Held) -> SetMutation -> Reject -> ' +
      'RemoteEvent (Release Ack)',
    () => {
      return (
        expectLocalStore()
          // Start a query so that acks must be held.
          .afterAllocatingQuery(query('foo'))
          .toReturnTargetId(2)
          .after(setMutation('foo/bar', { foo: 'bar' }))
          .toReturnChanged(
            doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations()
          )
          .toContain(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
          // Last seen version is zero, so this ack must be held.
          .afterAcknowledgingMutation({ documentVersion: 1 })
          .toReturnChanged(
            doc('foo/bar', 1, { foo: 'bar' }).setHasCommittedMutations()
          )
          .toNotContainIfEager(
            doc('foo/bar', 1, { foo: 'bar' }).setHasCommittedMutations()
          )
          .after(setMutation('bar/baz', { bar: 'baz' }))
          .toReturnChanged(
            doc('bar/baz', 0, { bar: 'baz' }).setHasLocalMutations()
          )
          .toContain(doc('bar/baz', 0, { bar: 'baz' }).setHasLocalMutations())
          .afterRejectingMutation()
          .toReturnRemoved('bar/baz')
          .toNotContain('bar/baz')
          .afterRemoteEvent(
            docAddedRemoteEvent(doc('foo/bar', 2, { it: 'changed' }), [2])
          )
          .toReturnChanged(doc('foo/bar', 2, { it: 'changed' }))
          .toContain(doc('foo/bar', 2, { it: 'changed' }))
          .toNotContain('bar/baz')
          .finish()
      );
    }
  );

  it('handles NoDocument -> SetMutation -> Ack', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [2]))
      .toReturnRemoved('foo/bar')
      .toNotContainIfEager(deletedDoc('foo/bar', 2))
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .afterReleasingTarget(2)
      .afterAcknowledgingMutation({ documentVersion: 3 })
      .toReturnChanged(
        doc('foo/bar', 3, { foo: 'bar' }).setHasCommittedMutations()
      )
      .toNotContainIfEager(
        doc('foo/bar', 3, { foo: 'bar' }).setHasCommittedMutations()
      )
      .finish();
  });

  it('handles SetMutation -> NoDocument', () => {
    return expectLocalStore()
      .afterAllocatingQuery(query('foo'))
      .toReturnTargetId(2)
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [2]))
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .finish();
  });

  it('handles Document -> SetMutation -> Ack ->  Document', () => {
    return (
      expectLocalStore()
        .afterAllocatingQuery(query('foo'))
        .toReturnTargetId(2)
        .after(docAddedRemoteEvent(doc('foo/bar', 2, { it: 'base' }), [2]))
        .toReturnChanged(doc('foo/bar', 2, { it: 'base' }))
        .toContain(doc('foo/bar', 2, { it: 'base' }))
        .after(setMutation('foo/bar', { foo: 'bar' }))
        .toReturnChanged(
          doc('foo/bar', 2, { foo: 'bar' }).setHasLocalMutations()
        )
        .toContain(doc('foo/bar', 2, { foo: 'bar' }).setHasLocalMutations())
        .afterAcknowledgingMutation({ documentVersion: 3 })
        // We haven't seen the remote event yet
        .toReturnChanged(
          doc('foo/bar', 3, { foo: 'bar' }).setHasCommittedMutations()
        )
        .toContain(doc('foo/bar', 3, { foo: 'bar' }).setHasCommittedMutations())
        .after(docUpdateRemoteEvent(doc('foo/bar', 3, { it: 'changed' }), [2]))
        .toReturnChanged(doc('foo/bar', 3, { it: 'changed' }))
        .toContain(doc('foo/bar', 3, { it: 'changed' }))
        .finish()
    );
  });

  it('handles PatchMutation without prior document', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(unknownDoc('foo/bar', 1))
      .toNotContainIfEager(unknownDoc('foo/bar', 1))
      .finish();
  });

  it('handles PatchMutation -> Document -> Ack', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAllocatingQuery(query('foo'))
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar', it: 'base' }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { foo: 'bar', it: 'base' }).setHasLocalMutations()
      )
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .toReturnChanged(
        doc('foo/bar', 2, { foo: 'bar', it: 'base' }).setHasCommittedMutations()
      )
      .after(
        docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'bar', it: 'base' }), [2])
      )
      .toReturnChanged(doc('foo/bar', 2, { foo: 'bar', it: 'base' }))
      .toContain(doc('foo/bar', 2, { foo: 'bar', it: 'base' }))
      .finish();
  });

  it('handles PatchMutation -> Ack -> Document', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(unknownDoc('foo/bar', 1))
      .toNotContainIfEager(unknownDoc('foo/bar', 1))
      .afterAllocatingQuery(query('foo'))
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
      .toContain(doc('foo/bar', 1, { it: 'base' }))
      .finish();
  });

  it('handles DeleteMutation -> Ack', () => {
    return expectLocalStore()
      .after(deleteMutation('foo/bar'))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0).setHasLocalMutations())
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnRemoved('foo/bar')
      .toNotContainIfEager(deletedDoc('foo/bar', 1).setHasCommittedMutations())
      .finish();
  });

  it('handles Document -> DeleteMutation -> Ack', () => {
    const query1 = query('foo');
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
        .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
        .toContain(doc('foo/bar', 1, { it: 'base' }))
        .after(deleteMutation('foo/bar'))
        .toReturnRemoved('foo/bar')
        .toContain(deletedDoc('foo/bar', 0).setHasLocalMutations())
        // remove the mutation so only the mutation is pinning the doc
        .afterReleasingTarget(2)
        .afterAcknowledgingMutation({ documentVersion: 2 })
        .toReturnRemoved('foo/bar')
        .toNotContainIfEager(
          deletedDoc('foo/bar', 2).setHasCommittedMutations()
        )
        .finish()
    );
  });

  it('handles DeleteMutation -> Document -> Ack', () => {
    const query1 = query('foo');
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(deleteMutation('foo/bar'))
        .toReturnRemoved('foo/bar')
        .toContain(deletedDoc('foo/bar', 0).setHasLocalMutations())
        .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
        .toReturnRemoved('foo/bar')
        .toContain(deletedDoc('foo/bar', 0).setHasLocalMutations())
        // Don't need to keep doc pinned anymore
        .afterReleasingTarget(2)
        .afterAcknowledgingMutation({ documentVersion: 2 })
        .toReturnRemoved('foo/bar')
        .toNotContainIfEager(
          deletedDoc('foo/bar', 2).setHasCommittedMutations()
        )
        .finish()
    );
  });

  it('handles Document -> NoDocument -> Document', () => {
    return expectLocalStore()
      .afterAllocatingQuery(query('foo'))
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
      .toContain(doc('foo/bar', 1, { it: 'base' }))
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [2]))
      .toReturnRemoved('foo/bar')
      .toNotContainIfEager(deletedDoc('foo/bar', 2))
      .after(docUpdateRemoteEvent(doc('foo/bar', 3, { it: 'changed' }), [2]))
      .toReturnChanged(doc('foo/bar', 3, { it: 'changed' }))
      .toContain(doc('foo/bar', 3, { it: 'changed' }))
      .finish();
  });

  it('handles SetMutation -> PatchMutation -> Document -> Ack -> Ack', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'old' }))
      .toReturnChanged(doc('foo/bar', 0, { foo: 'old' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { foo: 'old' }).setHasLocalMutations())
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(doc('foo/bar', 1, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 1, { foo: 'bar' }).setHasLocalMutations())
      .afterReleasingTarget(2)
      .afterAcknowledgingMutation({ documentVersion: 2 }) // delete mutation
      .toReturnChanged(doc('foo/bar', 2, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 2, { foo: 'bar' }).setHasLocalMutations())
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnChanged(
        doc('foo/bar', 3, { foo: 'bar' }).setHasCommittedMutations()
      )
      .toNotContainIfEager(
        doc('foo/bar', 3, { foo: 'bar' }).setHasCommittedMutations()
      )
      .finish();
  });

  it('handles SetMutation + PatchMutation', () => {
    return expectLocalStore()
      .after([
        setMutation('foo/bar', { foo: 'old' }),
        patchMutation('foo/bar', { foo: 'bar' })
      ])
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { foo: 'bar' }).setHasLocalMutations())
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it : it.skip)(
    'handles SetMutation -> Ack -> PatchMutation -> Reject',
    () => {
      return (
        expectLocalStore()
          .after(setMutation('foo/bar', { foo: 'old' }))
          .toContain(doc('foo/bar', 0, { foo: 'old' }).setHasLocalMutations())
          .afterAcknowledgingMutation({ documentVersion: 1 })
          // After having been ack'd, there is nothing pinning the document
          .toNotContain('foo/bar')
          .after(patchMutation('foo/bar', { foo: 'bar' }))
          // A blind patch is not visible in the cache
          .toNotContain('foo/bar')
          .afterRejectingMutation()
          .toNotContain('foo/bar')
          .finish()
      );
    }
  );

  it('handles SetMutation(A) + SetMutation(B) + PatchMutation(A)', () => {
    return expectLocalStore()
      .after([
        setMutation('foo/bar', { foo: 'old' }),
        setMutation('bar/baz', { bar: 'baz' }),
        patchMutation('foo/bar', { foo: 'bar' })
      ])
      .toReturnChanged(
        doc('bar/baz', 0, { bar: 'baz' }).setHasLocalMutations(),
        doc('bar/baz', 0, { bar: 'baz' }).setHasLocalMutations()
      )
      .finish();
  });

  it('handles DeleteMutation -> PatchMutation -> Ack -> Ack', () => {
    return expectLocalStore()
      .after(deleteMutation('foo/bar'))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0).setHasLocalMutations())
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0).setHasLocalMutations())
      .afterAcknowledgingMutation({ documentVersion: 2 }) // delete mutation
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 2).setHasLocalMutations())
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnChanged(unknownDoc('foo/bar', 3))
      .toNotContainIfEager(unknownDoc('foo/bar', 3))
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it : it.skip)(
    'collects garbage after ChangeBatch with no target ids',
    () => {
      return expectLocalStore()
        .after(docAddedRemoteEvent(deletedDoc('foo/bar', 2), [], [], [1]))
        .toNotContain('foo/bar')
        .after(
          docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'bar' }), [], [], [1])
        )
        .toNotContain('foo/bar')
        .finish();
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it : it.skip)(
    'collects garbage after ChangeBatch',
    () => {
      const query1 = query('foo');
      return expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(docAddedRemoteEvent(doc('foo/bar', 2, { foo: 'bar' }), [2]))
        .toContain(doc('foo/bar', 2, { foo: 'bar' }))
        .after(docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'baz' }), [], [2]))
        .toNotContain('foo/bar')
        .finish();
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it : it.skip)(
    'collects garbage after acknowledged mutation',
    () => {
      const query1 = query('foo');
      return (
        expectLocalStore()
          .afterAllocatingQuery(query1)
          .toReturnTargetId(2)
          .after(docAddedRemoteEvent(doc('foo/bar', 1, { foo: 'old' }), [2]))
          .after(patchMutation('foo/bar', { foo: 'bar' }))
          // Release the target so that our target count goes back to 0 and we are considered
          // up-to-date.
          .afterReleasingTarget(2)
          .after(setMutation('foo/bah', { foo: 'bah' }))
          .after(deleteMutation('foo/baz'))
          .toContain(doc('foo/bar', 1, { foo: 'bar' }).setHasLocalMutations())
          .toContain(doc('foo/bah', 0, { foo: 'bah' }).setHasLocalMutations())
          .toContain(deletedDoc('foo/baz', 0).setHasLocalMutations())
          .afterAcknowledgingMutation({ documentVersion: 3 })
          .toNotContain('foo/bar')
          .toContain(doc('foo/bah', 0, { foo: 'bah' }).setHasLocalMutations())
          .toContain(deletedDoc('foo/baz', 0).setHasLocalMutations())
          .afterAcknowledgingMutation({ documentVersion: 4 })
          .toNotContain('foo/bar')
          .toNotContain('foo/bah')
          .toContain(deletedDoc('foo/baz', 0).setHasLocalMutations())
          .afterAcknowledgingMutation({ documentVersion: 5 })
          .toNotContain('foo/bar')
          .toNotContain('foo/bah')
          .toNotContain('foo/baz')
          .finish()
      );
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it : it.skip)(
    'collects garbage after rejected mutation',
    () => {
      const query1 = query('foo');
      return (
        expectLocalStore()
          .afterAllocatingQuery(query1)
          .toReturnTargetId(2)
          .after(docAddedRemoteEvent(doc('foo/bar', 1, { foo: 'old' }), [2]))
          .after(patchMutation('foo/bar', { foo: 'bar' }))
          // Release the target so that our target count goes back to 0 and we are considered
          // up-to-date.
          .afterReleasingTarget(2)
          .after(setMutation('foo/bah', { foo: 'bah' }))
          .after(deleteMutation('foo/baz'))
          .toContain(doc('foo/bar', 1, { foo: 'bar' }).setHasLocalMutations())
          .toContain(doc('foo/bah', 0, { foo: 'bah' }).setHasLocalMutations())
          .toContain(deletedDoc('foo/baz', 0).setHasLocalMutations())
          .afterRejectingMutation() // patch mutation
          .toNotContain('foo/bar')
          .toContain(doc('foo/bah', 0, { foo: 'bah' }).setHasLocalMutations())
          .toContain(deletedDoc('foo/baz', 0).setHasLocalMutations())
          .afterRejectingMutation() // set mutation
          .toNotContain('foo/bar')
          .toNotContain('foo/bah')
          .toContain(deletedDoc('foo/baz', 0).setHasLocalMutations())
          .afterRejectingMutation() // delete mutation
          .toNotContain('foo/bar')
          .toNotContain('foo/bah')
          .toNotContain('foo/baz')
          .finish()
      );
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it : it.skip)('pins documents in the local view', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 1, { foo: 'bar' }), [2]))
      .after(setMutation('foo/baz', { foo: 'baz' }))
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/baz', 0, { foo: 'baz' }).setHasLocalMutations())
      .after(
        localViewChanges(2, /* fromCache= */ false, {
          added: ['foo/bar', 'foo/baz']
        })
      )
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { foo: 'bar' }), [], [2]))
      .after(docUpdateRemoteEvent(doc('foo/baz', 2, { foo: 'baz' }), [2]))
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/baz', 2, { foo: 'baz' }))
      .after(
        localViewChanges(2, /* fromCache= */ false, {
          removed: ['foo/bar', 'foo/baz']
        })
      )
      .afterReleasingTarget(2)
      .toNotContain('foo/bar')
      .toNotContain('foo/baz')
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it : it.skip)(
    'throws away documents with unknown target-ids immediately',
    () => {
      const targetId = 321;
      return expectLocalStore()
        .after(docAddedRemoteEvent(doc('foo/bar', 1, {}), [], [], [targetId]))
        .toNotContain('foo/bar')
        .finish();
    }
  );

  it('can execute document queries', () => {
    const localStore = expectLocalStore().localStore;
    return localStoreWriteLocally(localStore, [
      setMutation('foo/bar', { foo: 'bar' }),
      setMutation('foo/baz', { foo: 'baz' }),
      setMutation('foo/bar/Foo/Bar', { Foo: 'Bar' })
    ])
      .then(() => {
        return localStoreExecuteQuery(
          localStore,
          query('foo/bar'),
          /* usePreviousResults= */ true
        );
      })
      .then(({ documents }) => {
        expect(documents.size).to.equal(1);
        expectEqual(documents.minKey(), key('foo/bar'));
      });
  });

  it('can execute collection queries', () => {
    const localStore = expectLocalStore().localStore;
    return localStoreWriteLocally(localStore, [
      setMutation('fo/bar', { fo: 'bar' }),
      setMutation('foo/bar', { foo: 'bar' }),
      setMutation('foo/baz', { foo: 'baz' }),
      setMutation('foo/bar/Foo/Bar', { Foo: 'Bar' }),
      setMutation('fooo/blah', { fooo: 'blah' })
    ])
      .then(() => {
        return localStoreExecuteQuery(
          localStore,
          query('foo'),
          /* usePreviousResults= */ true
        );
      })
      .then(({ documents }) => {
        expect(documents.size).to.equal(2);
        expectEqual(documents.minKey(), key('foo/bar'));
        expectEqual(documents.maxKey(), key('foo/baz'));
      });
  });

  it('can execute mixed collection queries', async () => {
    const query1 = query('foo');
    const targetData = await localStoreAllocateTarget(
      localStore,
      queryToTarget(query1)
    );
    expect(targetData.targetId).to.equal(2);
    await localStoreApplyRemoteEventToLocalCache(
      localStore,
      docAddedRemoteEvent(doc('foo/baz', 10, { a: 'b' }), [2], [])
    );
    await localStoreApplyRemoteEventToLocalCache(
      localStore,
      docUpdateRemoteEvent(doc('foo/bar', 20, { a: 'b' }), [2], [])
    );
    await localStoreWriteLocally(localStore, [
      setMutation('foo/bonk', { a: 'b' })
    ]);
    const { documents } = await localStoreExecuteQuery(
      localStore,
      query1,
      /* usePreviousResults= */ true
    );
    expect(mapAsArray(documents)).to.deep.equal([
      { key: key('foo/bar'), value: doc('foo/bar', 20, { a: 'b' }) },
      { key: key('foo/baz'), value: doc('foo/baz', 10, { a: 'b' }) },
      {
        key: key('foo/bonk'),
        value: doc('foo/bonk', 0, { a: 'b' }).setHasLocalMutations()
      }
    ]);
  });

  it('reads all documents for initial collection queries', () => {
    const firstQuery = query('foo');
    const secondQuery = query('foo', filter('matches', '==', true));

    return expectLocalStore()
      .afterAllocatingQuery(firstQuery)
      .toReturnTargetId(2)
      .after(
        docAddedRemoteEvent(
          [
            doc('foo/bar', 10, { matches: true }),
            doc('foo/baz', 20, { matches: true })
          ],
          [2]
        )
      )
      .toReturnChanged(
        doc('foo/bar', 10, { matches: true }),
        doc('foo/baz', 20, { matches: true })
      )
      .after(setMutation('foo/bonk', { matches: true }))
      .toReturnChanged(
        doc('foo/bonk', 0, { matches: true }).setHasLocalMutations()
      )
      .afterAllocatingQuery(secondQuery)
      .toReturnTargetId(4)
      .afterExecutingQuery(secondQuery)
      .toReturnChanged(
        doc('foo/bar', 10, { matches: true }),
        doc('foo/baz', 20, { matches: true }),
        doc('foo/bonk', 0, { matches: true }).setHasLocalMutations()
      )
      .toHaveRead({
        documentsByCollection: 2,
        overlaysByCollection: 1,
        overlayTypes: { [key('foo/bonk').toString()]: MutationType.Set }
      })
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it.skip : it)('persists resume tokens', async () => {
    const query1 = query('foo/bar');
    const targetData = await localStoreAllocateTarget(
      localStore,
      queryToTarget(query1)
    );
    const targetId = targetData.targetId;
    const resumeToken = byteStringFromString('abc');
    const watchChange = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      resumeToken
    );
    const aggregator = new WatchChangeAggregator({
      getRemoteKeysForTarget: () => documentKeySet(),
      getTargetDataForTarget: () => targetData,
      getDatabaseId: () => persistenceHelpers.TEST_DATABASE_ID
    });
    aggregator.handleTargetChange(watchChange);
    const remoteEvent = aggregator.createRemoteEvent(version(1000));
    await localStoreApplyRemoteEventToLocalCache(localStore, remoteEvent);

    // Stop listening so that the query should become inactive (but persistent)
    await localStoreReleaseTarget(
      localStore,
      targetData.targetId,
      /*keepPersistedTargetData=*/ false
    );

    // Should come back with the same resume token
    const targetData2 = await localStoreAllocateTarget(
      localStore,
      queryToTarget(query1)
    );
    expect(targetData2.resumeToken).to.deep.equal(resumeToken);
  });

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it.skip : it)(
    'does not replace resume token with empty resume token',
    async () => {
      const query1 = query('foo/bar');
      const targetData = await localStoreAllocateTarget(
        localStore,
        queryToTarget(query1)
      );
      const targetId = targetData.targetId;
      const resumeToken = byteStringFromString('abc');

      const watchChange1 = new WatchTargetChange(
        WatchTargetChangeState.Current,
        [targetId],
        byteStringFromString('abc')
      );
      const aggregator1 = new WatchChangeAggregator({
        getRemoteKeysForTarget: () => documentKeySet(),
        getTargetDataForTarget: () => targetData,
        getDatabaseId: () => persistenceHelpers.TEST_DATABASE_ID
      });
      aggregator1.handleTargetChange(watchChange1);
      const remoteEvent1 = aggregator1.createRemoteEvent(version(1000));
      await localStoreApplyRemoteEventToLocalCache(localStore, remoteEvent1);

      const watchChange2 = new WatchTargetChange(
        WatchTargetChangeState.Current,
        [targetId],
        ByteString.EMPTY_BYTE_STRING
      );
      const aggregator2 = new WatchChangeAggregator({
        getRemoteKeysForTarget: () => documentKeySet(),
        getTargetDataForTarget: () => targetData,
        getDatabaseId: () => persistenceHelpers.TEST_DATABASE_ID
      });
      aggregator2.handleTargetChange(watchChange2);
      const remoteEvent2 = aggregator2.createRemoteEvent(version(2000));
      await localStoreApplyRemoteEventToLocalCache(localStore, remoteEvent2);

      // Stop listening so that the query should become inactive (but persistent)
      await localStoreReleaseTarget(
        localStore,
        targetId,
        /*keepPersistedTargetData=*/ false
      );

      // Should come back with the same resume token
      const targetData2 = await localStoreAllocateTarget(
        localStore,
        queryToTarget(query1)
      );
      expect(targetData2.resumeToken).to.deep.equal(resumeToken);
    }
  );

  // TODO(mrschmidt): The increment() field transform tests below
  // would probably be better implemented as spec tests but currently they don't
  // support transforms.

  it('handles SetMutation -> Transform -> Transform', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { sum: 0 }))
      .toReturnChanged(doc('foo/bar', 0, { sum: 0 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { sum: 0 }).setHasLocalMutations())
      .after(patchMutation('foo/bar', { sum: increment(1) }))
      .toReturnChanged(doc('foo/bar', 0, { sum: 1 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { sum: 1 }).setHasLocalMutations())
      .after(patchMutation('foo/bar', { sum: increment(2) }))
      .toReturnChanged(doc('foo/bar', 0, { sum: 3 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { sum: 3 }).setHasLocalMutations())
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it.skip : it)(
    'handles SetMutation -> Ack -> Transform -> Ack -> Transform',
    () => {
      return expectLocalStore()
        .after(setMutation('foo/bar', { sum: 0 }))
        .toReturnChanged(doc('foo/bar', 0, { sum: 0 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 0, { sum: 0 }).setHasLocalMutations())
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(
          doc('foo/bar', 1, { sum: 0 }).setHasCommittedMutations()
        )
        .toContain(doc('foo/bar', 1, { sum: 0 }).setHasCommittedMutations())
        .after(patchMutation('foo/bar', { sum: increment(1) }))
        .toReturnChanged(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
        .afterAcknowledgingMutation({
          documentVersion: 2,
          transformResults: [{ integerValue: 1 }]
        })
        .toReturnChanged(
          doc('foo/bar', 2, { sum: 1 }).setHasCommittedMutations()
        )
        .toContain(doc('foo/bar', 2, { sum: 1 }).setHasCommittedMutations())
        .after(patchMutation('foo/bar', { sum: increment(2) }))
        .toReturnChanged(doc('foo/bar', 2, { sum: 3 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 2, { sum: 3 }).setHasLocalMutations())
        .finish();
    }
  );

  it('handles SetMutation -> Transform-> RemoteEvent -> Transform', () => {
    const query1 = query('foo');
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(setMutation('foo/bar', { sum: 0 }))
        .toReturnChanged(doc('foo/bar', 0, { sum: 0 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 0, { sum: 0 }).setHasLocalMutations())
        .afterRemoteEvent(
          docAddedRemoteEvent(doc('foo/bar', 1, { sum: 0 }), [2])
        )
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(doc('foo/bar', 1, { sum: 0 }))
        .toContain(doc('foo/bar', 1, { sum: 0 }))
        .after(patchMutation('foo/bar', { sum: increment(1) }))
        .toReturnChanged(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
        // The value in this remote event gets ignored since we still have a
        // pending transform mutation.
        .afterRemoteEvent(
          docUpdateRemoteEvent(doc('foo/bar', 2, { sum: 1337 }), [2])
        )
        .toReturnChanged(doc('foo/bar', 2, { sum: 1 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 2, { sum: 1 }).setHasLocalMutations())
        // Add another increment. Note that we still compute the increment based
        // on the local value.
        .after(patchMutation('foo/bar', { sum: increment(2) }))
        .toReturnChanged(doc('foo/bar', 2, { sum: 3 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 2, { sum: 3 }).setHasLocalMutations())
        .afterAcknowledgingMutation({
          documentVersion: 3,
          transformResults: [{ integerValue: 1 }]
        })
        .toReturnChanged(doc('foo/bar', 3, { sum: 3 }).setHasLocalMutations())
        .toContain(doc('foo/bar', 3, { sum: 3 }).setHasLocalMutations())
        .afterAcknowledgingMutation({
          documentVersion: 4,
          transformResults: [{ integerValue: 1339 }]
        })
        .toReturnChanged(
          doc('foo/bar', 4, { sum: 1339 }).setHasCommittedMutations()
        )
        .toContain(doc('foo/bar', 4, { sum: 1339 }).setHasCommittedMutations())
        .finish()
    );
  });

  it('holds back transforms', () => {
    const query1 = query('foo');
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(setMutation('foo/bar', { sum: 0, arrayUnion: [] }))
        .toReturnChanged(
          doc('foo/bar', 0, { sum: 0, arrayUnion: [] }).setHasLocalMutations()
        )
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(
          doc('foo/bar', 1, {
            sum: 0,
            arrayUnion: []
          }).setHasCommittedMutations()
        )
        .afterRemoteEvent(
          docAddedRemoteEvent(
            doc('foo/bar', 1, {
              sum: 0,
              arrayUnion: []
            }),
            [2]
          )
        )
        .toReturnChanged(doc('foo/bar', 1, { sum: 0, arrayUnion: [] }))
        .after(patchMutation('foo/bar', { sum: increment(1) }))
        .toReturnChanged(
          doc('foo/bar', 1, {
            sum: 1,
            arrayUnion: []
          }).setHasLocalMutations()
        )
        .after(patchMutation('foo/bar', { arrayUnion: arrayUnion('foo') }))
        .toReturnChanged(
          doc('foo/bar', 1, {
            sum: 1,
            arrayUnion: ['foo']
          }).setHasLocalMutations()
        )
        // The sum transform and array union transform make the SDK ignore the
        // backend's updated value.
        .afterRemoteEvent(
          docUpdateRemoteEvent(
            doc('foo/bar', 2, { sum: 1337, arrayUnion: ['bar'] }),
            [2]
          )
        )
        .toReturnChanged(
          doc('foo/bar', 2, {
            sum: 1,
            arrayUnion: ['foo']
          }).setHasLocalMutations()
        )
        // With a field transform acknowledgement, the overlay is recalculated
        // with the remaining local mutations.
        .afterAcknowledgingMutation({
          documentVersion: 3,
          transformResults: [{ integerValue: 1338 }]
        })
        .toReturnChanged(
          doc('foo/bar', 3, {
            sum: 1338,
            arrayUnion: ['bar', 'foo']
          })
            .setReadTime(SnapshotVersion.fromTimestamp(new Timestamp(0, 3000)))
            .setHasLocalMutations()
        )
        .afterAcknowledgingMutation({
          documentVersion: 4,
          transformResults: [
            {
              arrayValue: {
                values: [{ stringValue: 'bar' }, { stringValue: 'foo' }]
              }
            }
          ]
        })
        .toReturnChanged(
          doc('foo/bar', 4, {
            sum: 1338,
            arrayUnion: ['bar', 'foo']
          })
            .setReadTime(SnapshotVersion.fromTimestamp(new Timestamp(0, 4000)))
            .setHasCommittedMutations()
        )
        .finish()
    );
  });

  it('handles MergeMutation with Transform -> RemoteEvent', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(
        patchMutation('foo/bar', { sum: increment(1) }, Precondition.none())
      )
      .toReturnChanged(doc('foo/bar', 0, { sum: 1 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { sum: 1 }).setHasLocalMutations())
      .afterRemoteEvent(
        docAddedRemoteEvent(doc('foo/bar', 1, { sum: 1337 }), [2])
      )
      .toReturnChanged(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .finish();
  });

  it('handles PatchMutation with Transform -> RemoteEvent', () => {
    // Note: This test reflects the current behavior, but it may be preferable
    // to replay the mutation once we receive the first value from the backend.

    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(patchMutation('foo/bar', { sum: increment(1) }))
      .toReturnChanged(deletedDoc('foo/bar', 0))
      .toNotContain('foo/bar')
      .afterRemoteEvent(
        docAddedRemoteEvent(doc('foo/bar', 1, { sum: 1337 }), [2])
      )
      .toReturnChanged(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .finish();
  });

  it('handles saving bundled documents', () => {
    return expectLocalStore()
      .after(
        bundledDocuments([
          doc('foo/bar', 1, { sum: 1337 }),
          deletedDoc('foo/bar1', 1)
        ])
      )
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1337 }),
        deletedDoc('foo/bar1', 1)
      )
      .toContain(doc('foo/bar', 1, { sum: 1337 }))
      .toContain(deletedDoc('foo/bar1', 1))
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 2,
        /*expectedKeys*/ documentKeySet(key('foo/bar'))
      )
      .finish();
  });

  it('handles saving bundled documents with newer existing version', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 2, { sum: 1337 }), [2]))
      .toContain(doc('foo/bar', 2, { sum: 1337 }))
      .after(
        bundledDocuments([
          doc('foo/bar', 1, { sum: 1336 }),
          deletedDoc('foo/bar1', 1)
        ])
      )
      .toReturnChanged(deletedDoc('foo/bar1', 1))
      .toContain(doc('foo/bar', 2, { sum: 1337 }))
      .toContain(deletedDoc('foo/bar1', 1))
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 4,
        /*expectedKeys*/ documentKeySet(key('foo/bar'))
      )
      .finish();
  });

  it('handles saving bundled documents with older existing version', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 1, { val: 'to-delete' }), [2]))
      .toContain(doc('foo/bar', 1, { val: 'to-delete' }))
      .after(
        bundledDocuments([
          doc('foo/new', 1, { sum: 1336 }),
          deletedDoc('foo/bar', 2)
        ])
      )
      .toReturnChanged(
        doc('foo/new', 1, { sum: 1336 }),
        deletedDoc('foo/bar', 2)
      )
      .toContain(doc('foo/new', 1, { sum: 1336 }))
      .toContain(deletedDoc('foo/bar', 2))
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 4,
        /*expectedKeys*/ documentKeySet(key('foo/new'))
      )
      .finish();
  });

  it('handles saving bundled documents with same existing version should not overwrite', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 1, { val: 'old' }), [2]))
      .toContain(doc('foo/bar', 1, { val: 'old' }))
      .after(bundledDocuments([doc('foo/bar', 1, { val: 'new' })]))
      .toReturnChanged()
      .toContain(doc('foo/bar', 1, { val: 'old' }))
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 4,
        /*expectedKeys*/ documentKeySet(key('foo/bar'))
      )
      .finish();
  });

  it('handles MergeMutation with Transform -> BundledDocuments', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(
        patchMutation('foo/bar', { sum: increment(1) }, Precondition.none())
      )
      .toReturnChanged(doc('foo/bar', 0, { sum: 1 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 0, { sum: 1 }).setHasLocalMutations())
      .after(bundledDocuments([doc('foo/bar', 1, { sum: 1337 })]))
      .toReturnChanged(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 4,
        /*expectedKeys*/ documentKeySet(key('foo/bar'))
      )
      .finish();
  });

  it('handles PatchMutation with Transform -> BundledDocuments', () => {
    // Note: see comments in `handles PatchMutation with Transform -> RemoteEvent`.
    // The behavior for this and remote event is the same.

    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(patchMutation('foo/bar', { sum: increment(1) }))
      .toReturnChanged(deletedDoc('foo/bar', 0))
      .toNotContain('foo/bar')
      .after(bundledDocuments([doc('foo/bar', 1, { sum: 1337 })]))
      .toReturnChanged(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .toContain(doc('foo/bar', 1, { sum: 1 }).setHasLocalMutations())
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 4,
        /*expectedKeys*/ documentKeySet(key('foo/bar'))
      )
      .finish();
  });

  it('handles saving and checking bundle metadata', () => {
    return expectLocalStore()
      .toHaveNewerBundle(bundleMetadata('test', 2), false)
      .afterSavingBundle(bundleMetadata('test', 2))
      .toHaveNewerBundle(bundleMetadata('test', 1), true)
      .finish();
  });

  it('add then update while offline', () => {
    return expectLocalStore()
      .afterMutations([
        setMutation('foo/bar', { 'foo': 'foo-value', 'bar': 1 })
      ])
      .toContain(
        doc('foo/bar', 0, {
          'foo': 'foo-value',
          'bar': 1
        }).setHasLocalMutations()
      )
      .afterMutations([patchMutation('foo/bar', { 'bar': 2 })])
      .toContain(
        doc('foo/bar', 0, {
          'foo': 'foo-value',
          'bar': 2
        }).setHasLocalMutations()
      )
      .finish();
  });

  it('handles saving and loading named queries', async () => {
    return expectLocalStore()
      .after(
        namedQuery(
          'testQueryName',
          query('coll'),
          /* limitType */ 'FIRST',
          SnapshotVersion.min()
        )
      )
      .toHaveNamedQuery({
        name: 'testQueryName',
        query: query('coll'),
        readTime: SnapshotVersion.min()
      })
      .finish();
  });

  it('loading named queries allocates targets and updates target document mapping', async () => {
    const expectedQueryDocumentMap = new Map([
      ['query-1', documentKeySet(key('foo1/bar'))],
      ['query-2', documentKeySet(key('foo2/bar'))]
    ]);
    const version1 = SnapshotVersion.fromTimestamp(Timestamp.fromMillis(10000));
    const version2 = SnapshotVersion.fromTimestamp(Timestamp.fromMillis(20000));

    return expectLocalStore()
      .after(
        bundledDocuments(
          [doc('foo1/bar', 1, { sum: 1337 }), doc('foo2/bar', 2, { sum: 42 })],
          [['query-1'], ['query-2']]
        )
      )
      .toReturnChanged(
        doc('foo1/bar', 1, { sum: 1337 }),
        doc('foo2/bar', 2, { sum: 42 })
      )
      .toContain(doc('foo1/bar', 1, { sum: 1337 }))
      .toContain(doc('foo2/bar', 2, { sum: 42 }))
      .after(
        namedQuery(
          'query-1',
          query('foo1'),
          /* limitType */ 'FIRST',
          version1,
          expectedQueryDocumentMap.get('query-1')
        )
      )
      .toHaveNamedQuery({
        name: 'query-1',
        query: query('foo1'),
        readTime: version1
      })
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 4,
        /*expectedKeys*/ documentKeySet(key('foo1/bar'))
      )
      .after(
        namedQuery(
          'query-2',
          query('foo2'),
          /* limitType */ 'FIRST',
          version2,
          expectedQueryDocumentMap.get('query-2')
        )
      )
      .toHaveNamedQuery({
        name: 'query-2',
        query: query('foo2'),
        readTime: version2
      })
      .toHaveQueryDocumentMapping(
        persistence,
        /*targetId*/ 6,
        /*expectedKeys*/ documentKeySet(key('foo2/bar'))
      )
      .finish();
  });

  it('handles saving and loading limit to last queries', async () => {
    const now = Timestamp.now();
    return expectLocalStore()
      .after(
        namedQuery(
          'testQueryName',
          queryWithLimit(query('coll', orderBy('sort')), 5, LimitType.First),
          /* limitType */ 'LAST',
          SnapshotVersion.fromTimestamp(now)
        )
      )
      .toHaveNamedQuery({
        name: 'testQueryName',
        query: queryWithLimit(
          query('coll', orderBy('sort')),
          5,
          LimitType.Last
        ),
        readTime: SnapshotVersion.fromTimestamp(now)
      })
      .finish();
  });

  it('computes highest unacknowledged batch id correctly', () => {
    return expectLocalStore()
      .toReturnHighestUnacknowledgeBatchId(BATCHID_UNKNOWN)
      .afterMutations([setMutation('foo/bar', {})])
      .toReturnHighestUnacknowledgeBatchId(1)
      .afterMutations([patchMutation('foo/bar', { abc: 123 })])
      .toReturnHighestUnacknowledgeBatchId(2)
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnHighestUnacknowledgeBatchId(2)
      .afterRejectingMutation()
      .toReturnHighestUnacknowledgeBatchId(BATCHID_UNKNOWN)
      .finish();
  });

  it('only persists updates for documents when version changes', () => {
    const query1 = query('foo');
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .afterRemoteEvent(
          docAddedRemoteEvent(doc('foo/bar', 1, { val: 'old' }), [2])
        )
        .toReturnChanged(doc('foo/bar', 1, { val: 'old' }))
        .toContain(doc('foo/bar', 1, { val: 'old' }))
        .afterRemoteEvent(
          docAddedRemoteEvent(
            [
              doc('foo/bar', 1, { val: 'new' }),
              doc('foo/baz', 2, { val: 'new' })
            ],
            [2]
          )
        )
        .toReturnChanged(doc('foo/baz', 2, { val: 'new' }))
        // The update to foo/bar is ignored.
        .toContain(doc('foo/bar', 1, { val: 'old' }))
        .toContain(doc('foo/baz', 2, { val: 'new' }))
        .finish()
    );
  });

  it('can handle batch Ack when pending batches have other docs', () => {
    // Prepare two batches, the first one will get rejected by the backend.
    // When the first batch is rejected, overlay is recalculated with only the
    // second batch, even though it has more documents than what is being
    // rejected.
    return expectLocalStore()
      .afterMutations([patchMutation('foo/bar', { 'foo': 'bar' })])
      .afterMutations([
        setMutation('foo/bar', { 'foo': 'bar-set' }),
        setMutation('foo/another', { 'foo': 'another' })
      ])
      .afterRejectingMutation()
      .toContain(doc('foo/bar', 0, { 'foo': 'bar-set' }).setHasLocalMutations())
      .toContain(
        doc('foo/another', 0, { 'foo': 'another' }).setHasLocalMutations()
      )
      .finish();
  });

  it('can handle multiple field patches on remote docs', () => {
    const query1 = query('foo', filter('matches', '==', true));
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .afterRemoteEvent(
        docAddedRemoteEvent(
          [doc('foo/bar', 1, { 'likes': 0, 'stars': 0 })],
          [2],
          []
        )
      )
      .toReturnChanged(doc('foo/bar', 1, { 'likes': 0, 'stars': 0 }))
      .toContain(doc('foo/bar', 1, { 'likes': 0, 'stars': 0 }))
      .after(patchMutation('foo/bar', { 'likes': 1 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 0 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 0 }).setHasLocalMutations()
      )
      .after(patchMutation('foo/bar', { 'stars': 1 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 1 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 1 }).setHasLocalMutations()
      )
      .after(patchMutation('foo/bar', { 'stars': 2 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 2 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 2 }).setHasLocalMutations()
      )
      .finish();
  });

  it('can handle multiple field patches in one batch on remote docs', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .afterRemoteEvent(
        docAddedRemoteEvent(
          [doc('foo/bar', 1, { 'likes': 0, 'stars': 0 })],
          [2],
          []
        )
      )
      .toReturnChanged(doc('foo/bar', 1, { 'likes': 0, 'stars': 0 }))
      .toContain(doc('foo/bar', 1, { 'likes': 0, 'stars': 0 }))
      .afterMutations([
        patchMutation('foo/bar', { 'likes': 1 }),
        patchMutation('foo/bar', { 'stars': 1 })
      ])
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 1 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 1 }).setHasLocalMutations()
      )
      .after(patchMutation('foo/bar', { 'stars': 2 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 2 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 2 }).setHasLocalMutations()
      )
      .finish();
  });

  it('can handle multiple field patches on local docs', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { 'likes': 0, 'stars': 0 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 0, 'stars': 0 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 0, 'stars': 0 }).setHasLocalMutations()
      )
      .after(patchMutation('foo/bar', { 'likes': 1 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 0 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 0 }).setHasLocalMutations()
      )
      .after(patchMutation('foo/bar', { 'stars': 1 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 1 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 1 }).setHasLocalMutations()
      )
      .after(patchMutation('foo/bar', { 'stars': 2 }))
      .toReturnChanged(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 2 }).setHasLocalMutations()
      )
      .toContain(
        doc('foo/bar', 1, { 'likes': 1, 'stars': 2 }).setHasLocalMutations()
      )
      .finish();
  });

  it('update on remote doc leads to update overlay', () => {
    expect(new Map([['a', 1]])).to.deep.equal(new Map([['a', 0]]));
    return expectLocalStore()
      .afterAllocatingQuery(query('foo'))
      .afterRemoteEvent(docUpdateRemoteEvent(doc('foo/baz', 10, { a: 1 }), [2]))
      .afterRemoteEvent(docUpdateRemoteEvent(doc('foo/bar', 20, {}), [2]))
      .afterMutations([patchMutation('foo/baz', { b: 2 })])
      .afterExecutingQuery(query('foo'))
      .toHaveRead({
        documentsByCollection: 2,
        overlaysByCollection: 1,
        overlayTypes: { [key('foo/baz').toString()]: MutationType.Patch }
      })
      .finish();
  });

  it('handles document creation time', () => {
    return (
      expectLocalStore()
        .afterAllocatingQuery(query('col'))
        .toReturnTargetId(2)
        .after(docAddedRemoteEvent(doc('col/doc1', 12, { foo: 'bar' }, 5), [2]))
        .toReturnChangedWithDocComparator(
          compareDocsWithCreateTime,
          doc('col/doc1', 12, { foo: 'bar' }, 5)
        )
        .toContain(
          doc('col/doc1', 12, { foo: 'bar' }, 5),
          compareDocsWithCreateTime
        )
        .after(setMutation('col/doc1', { foo: 'newBar' }))
        .toReturnChangedWithDocComparator(
          compareDocsWithCreateTime,
          doc('col/doc1', 12, { foo: 'newBar' }, 5).setHasLocalMutations()
        )
        .toContain(
          doc('col/doc1', 12, { foo: 'newBar' }, 5).setHasLocalMutations(),
          compareDocsWithCreateTime
        )
        .afterAcknowledgingMutation({ documentVersion: 13 })
        // We haven't seen the remote event yet
        .toReturnChangedWithDocComparator(
          compareDocsWithCreateTime,
          doc('col/doc1', 13, { foo: 'newBar' }, 5).setHasCommittedMutations()
        )
        .toContain(
          doc('col/doc1', 13, { foo: 'newBar' }, 5).setHasCommittedMutations(),
          compareDocsWithCreateTime
        )
        .finish()
    );
  });

  it('saves updateTime as createTime when receives ack for creating a new doc', () => {
    if (options.gcIsEager) {
      return;
    }

    return expectLocalStore()
      .after(setMutation('col/doc1', { foo: 'newBar' }))
      .afterAcknowledgingMutation({ documentVersion: 13 })
      .afterExecutingQuery(query('col'))
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations()
      )
      .toContain(
        doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations(),
        compareDocsWithCreateTime
      )
      .finish();
  });

  it('handles createTime for Set -> Ack -> RemoteEvent', () => {
    if (options.gcIsEager) {
      return;
    }

    return expectLocalStore()
      .after(setMutation('col/doc1', { foo: 'newBar' }))
      .afterAcknowledgingMutation({ documentVersion: 13 })
      .afterExecutingQuery(query('col'))
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations()
      )
      .toContain(
        doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations(),
        compareDocsWithCreateTime
      )
      .after(docAddedRemoteEvent(doc('col/doc1', 14, { foo: 'baz' }, 5), [2]))
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc('col/doc1', 14, { foo: 'baz' }, 5)
      )
      .toContain(
        doc('col/doc1', 14, { foo: 'baz' }, 5),
        compareDocsWithCreateTime
      )
      .finish();
  });

  it('handles createTime for Set -> RemoteEvent -> Ack', () => {
    if (options.gcIsEager) {
      return;
    }

    return expectLocalStore()
      .after(setMutation('col/doc1', { foo: 'newBar' }))
      .after(docAddedRemoteEvent(doc('col/doc1', 13, { foo: 'baz' }, 5), [2]))
      .afterAcknowledgingMutation({ documentVersion: 14 })
      .afterExecutingQuery(query('col'))
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc('col/doc1', 14, { foo: 'newBar' }, 5).setHasCommittedMutations()
      )
      .toContain(
        doc('col/doc1', 14, { foo: 'newBar' }, 5).setHasCommittedMutations(),
        compareDocsWithCreateTime
      )
      .finish();
  });

  it('saves updateTime as createTime when recreating a deleted doc', async () => {
    if (options.gcIsEager) {
      return;
    }

    return (
      expectLocalStore()
        .afterAllocatingQuery(query('col'))
        .toReturnTargetId(2)
        .after(docAddedRemoteEvent(deletedDoc('col/doc1', 12), [2]))
        .toReturnChanged(deletedDoc('col/doc1', 12))
        .toContain(deletedDoc('col/doc1', 12))
        .after(setMutation('col/doc1', { foo: 'newBar' }))
        .toReturnChangedWithDocComparator(
          compareDocsWithCreateTime,
          doc('col/doc1', 12, { foo: 'newBar' }, 12).setHasLocalMutations()
        )
        .toContain(
          doc('col/doc1', 12, { foo: 'newBar' }, 12).setHasLocalMutations(),
          compareDocsWithCreateTime
        )
        .afterAcknowledgingMutation({ documentVersion: 13 })
        // We haven't seen the remote event yet
        .toReturnChangedWithDocComparator(
          compareDocsWithCreateTime,
          doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations()
        )
        .toContain(
          doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations(),
          compareDocsWithCreateTime
        )
        .finish()
    );
  });

  it('document createTime is preserved through Set -> Ack -> Patch -> Ack', () => {
    if (options.gcIsEager) {
      return;
    }

    return expectLocalStore()
      .after(setMutation('col/doc1', { foo: 'newBar' }))
      .afterAcknowledgingMutation({ documentVersion: 13 })
      .afterExecutingQuery(query('col'))
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations()
      )
      .toContain(
        doc('col/doc1', 13, { foo: 'newBar' }, 13).setHasCommittedMutations(),
        compareDocsWithCreateTime
      )
      .afterMutations([patchMutation('col/doc1', { 'likes': 1 })])
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc(
          'col/doc1',
          13,
          { foo: 'newBar', likes: 1 },
          13
        ).setHasLocalMutations()
      )
      .toContain(
        doc(
          'col/doc1',
          13,
          { foo: 'newBar', likes: 1 },
          13
        ).setHasLocalMutations(),
        compareDocsWithCreateTime
      )
      .afterAcknowledgingMutation({ documentVersion: 14 })
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc(
          'col/doc1',
          14,
          { foo: 'newBar', likes: 1 },
          13
        ).setHasCommittedMutations()
      )
      .toContain(
        doc(
          'col/doc1',
          14,
          { foo: 'newBar', likes: 1 },
          13
        ).setHasCommittedMutations(),
        compareDocsWithCreateTime
      )
      .finish();
  });

  it('document createTime is preserved through Doc Added -> Patch -> Ack', () => {
    if (options.gcIsEager) {
      return;
    }
    return expectLocalStore()
      .afterAllocatingQuery(query('col'))
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('col/doc1', 12, { foo: 'bar' }, 5), [2]))
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc('col/doc1', 12, { foo: 'bar' }, 5)
      )
      .toContain(
        doc('col/doc1', 12, { foo: 'bar' }, 5),
        compareDocsWithCreateTime
      )
      .afterMutations([patchMutation('col/doc1', { 'likes': 1 })])
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc('col/doc1', 13, { foo: 'bar', likes: 1 }, 5).setHasLocalMutations()
      )
      .toContain(
        doc('col/doc1', 13, { foo: 'bar', likes: 1 }, 5).setHasLocalMutations(),
        compareDocsWithCreateTime
      )
      .afterAcknowledgingMutation({ documentVersion: 14 })
      .toReturnChangedWithDocComparator(
        compareDocsWithCreateTime,
        doc(
          'col/doc1',
          14,
          { foo: 'bar', likes: 1 },
          5
        ).setHasCommittedMutations()
      )
      .toContain(
        doc(
          'col/doc1',
          14,
          { foo: 'bar', likes: 1 },
          5
        ).setHasCommittedMutations(),
        compareDocsWithCreateTime
      )
      .finish();
  });

  it('deeply nested server timestamps do not cause stack overflow', async () => {
    const timestamp = Timestamp.now();
    const initialServerTimestamp = serverTimestamp(timestamp, null);
    const value: ObjectValue = ObjectValue.empty();
    value.set(
      field('timestamp'),
      serverTimestamp(timestamp, initialServerTimestamp)
    );

    const mutations: PatchMutation[] = [];
    for (let i = 0; i < 100; ++i) {
      mutations.push(
        new PatchMutation(
          key('foo/bar'),
          value,
          new FieldMask([field('timestamp')]),
          Precondition.none(),
          [
            new FieldTransform(
              field('timestamp'),
              new ServerTimestampTransform()
            )
          ]
        )
      );
    }
    await expect(expectLocalStore().afterMutations(mutations).finish()).to.not
      .be.eventually.rejected;
  });

  it('uses target mapping to execute queries', () => {
    if (options.gcIsEager) {
      return;
    }

    // This test verifies that once a target mapping has been written, only
    // documents that match the query are read from the RemoteDocumentCache.

    const query1 = query('foo', filter('matches', '==', true));
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(setMutation('foo/a', { matches: true }))
        .after(setMutation('foo/b', { matches: true }))
        .after(setMutation('foo/ignored', { matches: false }))
        .afterAcknowledgingMutation({ documentVersion: 10 })
        .afterAcknowledgingMutation({ documentVersion: 10 })
        .afterAcknowledgingMutation({ documentVersion: 10 })
        .afterExecutingQuery(query1)
        // Execute the query, but note that we read matching documents
        // from the RemoteDocumentCache since we do not yet have target
        // mapping.
        .toHaveRead({ documentsByCollection: 2 })
        .after(
          docAddedRemoteEvent(
            [
              doc('foo/a', 10, { matches: true }),
              doc('foo/b', 10, { matches: true })
            ],
            [2],
            []
          )
        )
        .after(
          noChangeEvent(
            /* targetId= */ 2,
            /* snapshotVersion= */ 10,
            /* resumeToken= */ byteStringFromString('foo')
          )
        )
        .after(localViewChanges(2, /* fromCache= */ false, {}))
        .afterExecutingQuery(query1)
        .toHaveRead({ documentsByKey: 2, documentsByCollection: 0 })
        .toReturnChanged(
          doc('foo/a', 10, { matches: true }),
          doc('foo/b', 10, { matches: true })
        )
        .finish()
    );
  });

  it('last limbo free snapshot is advanced during view processing', async () => {
    // This test verifies that the `lastLimboFreeSnapshot` version for TargetData
    // is advanced when we compute a limbo-free free view and that the mapping
    // is persisted when we release a query.

    const target = queryToTarget(query('foo'));

    const targetData = await localStoreAllocateTarget(localStore, target);

    // Advance the query snapshot
    await localStoreApplyRemoteEventToLocalCache(
      localStore,
      noChangeEvent(
        /* targetId= */ targetData.targetId,
        /* snapshotVersion= */ 10,
        /* resumeToken= */ byteStringFromString('foo')
      )
    );

    // At this point, we have not yet confirmed that the query is limbo free.
    let cachedTargetData = await persistence.runTransaction(
      'getTargetData',
      'readonly',
      txn => localStoreGetTargetData(localStore, txn, target)
    );
    expect(
      cachedTargetData!.lastLimboFreeSnapshotVersion.isEqual(
        SnapshotVersion.min()
      )
    ).to.be.true;

    // Mark the view synced, which updates the last limbo free snapshot version.
    await localStoreNotifyLocalViewChanges(localStore, [
      localViewChanges(2, /* fromCache= */ false, {})
    ]);
    cachedTargetData = await persistence.runTransaction(
      'getTargetData',
      'readonly',
      txn => localStoreGetTargetData(localStore, txn, target)
    );
    expect(cachedTargetData!.lastLimboFreeSnapshotVersion.isEqual(version(10)))
      .to.be.true;

    // The last limbo free snapshot version is persisted even if we release the
    // query.
    await localStoreReleaseTarget(
      localStore,
      targetData.targetId,
      /* keepPersistedTargetData= */ false
    );

    if (!options.gcIsEager) {
      cachedTargetData = await persistence.runTransaction(
        'getTargetData',
        'readonly',
        txn => localStoreGetTargetData(localStore, txn, target)
      );
      expect(
        cachedTargetData!.lastLimboFreeSnapshotVersion.isEqual(version(10))
      ).to.be.true;
    }
  });

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it.skip : it)(
    'ignores target mapping after existence filter mismatch',
    async () => {
      const query1 = query('foo', filter('matches', '==', true));
      const target = options.convertToPipeline
        ? toCorePipeline(toPipeline(query1, newTestFirestore()))
        : queryToTarget(query1);
      const targetId = 2;

      return (
        expectLocalStore()
          .afterAllocatingQuery(query1)
          .toReturnTargetId(targetId)
          // Persist a mapping with a single document
          .after(
            docAddedRemoteEvent(
              doc('foo/a', 10, { matches: true }),
              [targetId],
              [],
              [targetId]
            )
          )
          .after(noChangeEvent(targetId, 10, byteStringFromString('foo')))
          .after(localViewChanges(targetId, /* fromCache= */ false, {}))
          .afterExecutingQuery(query1)
          .toReturnChanged(doc('foo/a', 10, { matches: true }))
          .toHaveRead({ documentsByKey: 1 })
          .toContainTargetData(target, 10, 10, byteStringFromString('foo'))
          // Create an existence filter mismatch and verify that the last limbo
          // free snapshot version is deleted
          .after(
            existenceFilterEvent(targetId, documentKeySet(key('foo/a')), 2, 20)
          )
          .after(noChangeEvent(targetId, 20))
          .toContainTargetData(target, 0, 0, ByteString.EMPTY_BYTE_STRING)
          // Re-run the query as a collection scan
          .afterExecutingQuery(query1)
          .toReturnChanged(doc('foo/a', 10, { matches: true }))
          .toHaveRead({ documentsByCollection: 1 })
          .finish()
      );
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it.skip : it)(
    'queries include locally modified documents',
    () => {
      // This test verifies that queries that have a persisted TargetMapping
      // include documents that were modified by local edits after the target
      // mapping was written.

      const query1 = query('foo', filter('matches', '==', true));
      return (
        expectLocalStore()
          .afterAllocatingQuery(query1)
          .toReturnTargetId(2)
          .after(
            docAddedRemoteEvent([doc('foo/a', 10, { matches: true })], [2], [])
          )
          .after(localViewChanges(2, /* fromCache= */ false, {}))
          // Execute the query based on the RemoteEvent.
          .afterExecutingQuery(query1)
          .toReturnChanged(doc('foo/a', 10, { matches: true }))
          // Write a document.
          .after(setMutation('foo/b', { matches: true }))
          // Execute the query and make sure that the pending mutation is
          // included in the result.
          .afterExecutingQuery(query1)
          .toReturnChanged(
            doc('foo/a', 10, { matches: true }),
            doc('foo/b', 0, { matches: true }).setHasLocalMutations()
          )
          .afterAcknowledgingMutation({ documentVersion: 11 })
          // Execute the query and make sure that the acknowledged mutation is
          // included in the result.
          .afterExecutingQuery(query1)
          .toReturnChanged(
            doc('foo/a', 10, { matches: true }),
            doc('foo/b', 11, { matches: true }).setHasCommittedMutations()
          )
          .finish()
      );
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it.skip : it)(
    'queries include documents from other queries',
    () => {
      // This test verifies that queries that have a persisted TargetMapping
      // include documents that were modified by other queries after the target
      // mapping was written.

      const filteredQuery = query('foo', filter('matches', '==', true));
      const fullQuery = query('foo');
      return (
        expectLocalStore()
          .afterAllocatingQuery(filteredQuery)
          .toReturnTargetId(2)
          .after(
            docAddedRemoteEvent([doc('foo/a', 10, { matches: true })], [2], [])
          )
          .after(
            noChangeEvent(
              /* targetId= */ 2,
              /* snapshotVersion= */ 10,
              /* resumeToken= */ byteStringFromString('foo')
            )
          )
          .after(localViewChanges(2, /* fromCache= */ false, {}))
          .afterReleasingTarget(2)
          // Start another query and add more matching documents to the collection.
          .afterAllocatingQuery(fullQuery)
          .toReturnTargetId(4)
          .after(
            docAddedRemoteEvent(
              [
                doc('foo/a', 10, { matches: true }),
                doc('foo/b', 20, { matches: true })
              ],
              [4],
              []
            )
          )
          .afterReleasingTarget(4)
          // Run the original query again and ensure that both the original
          // matches as well as all new matches are included in the result set.
          .afterAllocatingQuery(filteredQuery)
          .afterExecutingQuery(filteredQuery)
          .toReturnChanged(
            doc('foo/a', 10, { matches: true }),
            doc('foo/b', 20, { matches: true })
          )
          .finish()
      );
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (options.gcIsEager ? it.skip : it)(
    'queries filter documents that no longer match',
    () => {
      // This test verifies that documents that once matched a query are
      // post-filtered if they no longer match the query filter.

      const filteredQuery = query('foo', filter('matches', '==', true));
      const fullQuery = query('foo');
      return (
        expectLocalStore()
          // Add two document results for a simple filter query
          .afterAllocatingQuery(filteredQuery)
          .toReturnTargetId(2)
          .after(
            docAddedRemoteEvent(
              [
                doc('foo/a', 10, { matches: true }),
                doc('foo/b', 10, { matches: true })
              ],
              [2],
              []
            )
          )
          .after(
            noChangeEvent(
              /* targetId= */ 2,
              /* snapshotVersion= */ 10,
              /* resumeToken= */ byteStringFromString('foo')
            )
          )
          .after(localViewChanges(2, /* fromCache= */ false, {}))
          .afterReleasingTarget(2)
          // Modify one of the documents to no longer match while the filtered
          // query is inactive.
          .afterAllocatingQuery(fullQuery)
          .toReturnTargetId(4)
          .after(
            docAddedRemoteEvent(
              [
                doc('foo/a', 10, { matches: true }),
                doc('foo/b', 20, { matches: false })
              ],
              [4],
              []
            )
          )
          .afterReleasingTarget(4)
          // Run the original query again and ensure that both the original
          // matches as well as all new matches are included in the result set.
          .afterAllocatingQuery(filteredQuery)
          .afterExecutingQuery(filteredQuery)
          // Re-run the filtered query and verify that the modified document is
          // no longer returned.
          .toReturnChanged(doc('foo/a', 10, { matches: true }))
          .finish()
      );
    }
  );
}
