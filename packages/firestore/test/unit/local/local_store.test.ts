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

import * as api from '../../../src/protos/firestore_proto_api';

import { expect } from 'chai';
import { FieldValue } from '../../../src/api/field_value';
import { Timestamp } from '../../../src/api/timestamp';
import { User } from '../../../src/auth/user';
import {
  LimitType,
  Query,
  queryEquals,
  queryToTarget,
  queryWithLimit
} from '../../../src/core/query';
import { Target } from '../../../src/core/target';
import { BatchId, TargetId } from '../../../src/core/types';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { LocalStore } from '../../../src/local/local_store';
import { LocalViewChanges } from '../../../src/local/local_view_changes';
import { Persistence } from '../../../src/local/persistence';
import {
  DocumentKeySet,
  documentKeySet,
  MaybeDocumentMap
} from '../../../src/model/collections';
import { MaybeDocument, NoDocument } from '../../../src/model/document';
import {
  Mutation,
  MutationResult,
  Precondition
} from '../../../src/model/mutation';
import {
  BATCHID_UNKNOWN,
  MutationBatch,
  MutationBatchResult
} from '../../../src/model/mutation_batch';
import { RemoteEvent } from '../../../src/remote/remote_event';
import {
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import { debugAssert } from '../../../src/util/assert';
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
  expectEqual,
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
  transformMutation,
  unknownDoc,
  version
} from '../../util/helpers';

import { CountingQueryEngine } from './counting_query_engine';
import * as persistenceHelpers from './persistence_test_helpers';
import { JSON_SERIALIZER } from './persistence_test_helpers';
import { ByteString } from '../../../src/util/byte_string';
import { BundledDocuments, NamedQuery } from '../../../src/core/bundle';
import { BundleMetadata as ProtoBundleMetadata } from '../../../src/protos/firestore_bundle_proto';
import {
  acknowledgeBatch,
  allocateTarget,
  applyBundleDocuments,
  applyRemoteEventToLocalCache,
  executeQuery,
  getHighestUnacknowledgedBatchId,
  getLocalTargetData,
  getNamedQuery,
  hasNewerBundle,
  localWrite,
  LocalWriteResult,
  newLocalStore,
  notifyLocalViewChanges,
  readLocalDocument,
  rejectBatch,
  releaseTarget,
  saveBundle,
  saveNamedQuery,
  synchronizeLastDocumentChangeReadTime
} from '../../../src/local/local_store_impl';

export interface LocalStoreComponents {
  queryEngine: CountingQueryEngine;
  persistence: Persistence;
  localStore: LocalStore;
}

class LocalStoreTester {
  private promiseChain: Promise<void> = Promise.resolve();
  private lastChanges: MaybeDocumentMap | null = null;
  private lastTargetId: TargetId | null = null;
  private batches: MutationBatch[] = [];

  constructor(
    public localStore: LocalStore,
    private readonly queryEngine: CountingQueryEngine,
    readonly gcIsEager: boolean
  ) {}

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
      .then(() => localWrite(this.localStore, mutations))
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
      .then(() => applyRemoteEventToLocalCache(this.localStore, remoteEvent))
      .then((result: MaybeDocumentMap) => {
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
        applyBundleDocuments(this.localStore, documents, bundleName || '')
      )
      .then(result => {
        this.lastChanges = result;
      });
    return this;
  }

  afterNamedQuery(testQuery: TestNamedQuery): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      saveNamedQuery(
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
      notifyLocalViewChanges(this.localStore, [viewChanges])
    );
    return this;
  }

  afterAcknowledgingMutation(options: {
    documentVersion: TestSnapshotVersion;
    transformResult?: api.Value;
  }): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain
      .then(() => {
        const batch = this.batches.shift()!;
        expect(batch.mutations.length).to.equal(
          1,
          'Acknowledging more than one mutation not supported.'
        );
        const ver = version(options.documentVersion);
        const mutationResults = [
          new MutationResult(
            ver,
            options.transformResult ? [options.transformResult] : null
          )
        ];
        const write = MutationBatchResult.from(batch, ver, mutationResults);

        return acknowledgeBatch(this.localStore, write);
      })
      .then((changes: MaybeDocumentMap) => {
        this.lastChanges = changes;
      });
    return this;
  }

  afterRejectingMutation(): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain
      .then(() => rejectBatch(this.localStore, this.batches.shift()!.batchId))
      .then((changes: MaybeDocumentMap) => {
        this.lastChanges = changes;
      });
    return this;
  }

  afterAllocatingQuery(query: Query): LocalStoreTester {
    return this.afterAllocatingTarget(queryToTarget(query));
  }

  afterAllocatingTarget(target: Target): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      allocateTarget(this.localStore, target).then(result => {
        this.lastTargetId = result.targetId;
      })
    );
    return this;
  }

  afterReleasingTarget(targetId: number): LocalStoreTester {
    this.prepareNextStep();

    this.promiseChain = this.promiseChain.then(() =>
      releaseTarget(
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
      executeQuery(this.localStore, query, /* usePreviousResults= */ true).then(
        ({ documents }) => {
          this.lastChanges = documents;
        }
      )
    );
    return this;
  }

  /**
   * Asserts the expected number of mutations and documents read by
   * the MutationQueue and the RemoteDocumentCache.
   *
   * @param expectedCount.mutationsByQuery - The number of mutations read by
   * executing a query against the MutationQueue.
   * @param expectedCount.mutationsByKey - The number of mutations read by
   * document key lookups.
   * @param expectedCount.documentsByQuery - The number of mutations read by
   * executing a query against the RemoteDocumentCache.
   * @param expectedCount.documentsByKey - The number of documents read by
   * document key lookups.
   */
  toHaveRead(expectedCount: {
    mutationsByQuery?: number;
    mutationsByKey?: number;
    documentsByQuery?: number;
    documentsByKey?: number;
  }): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      if (expectedCount.mutationsByQuery !== undefined) {
        expect(this.queryEngine.mutationsReadByQuery).to.be.eq(
          expectedCount.mutationsByQuery,
          'Mutations read (by query)'
        );
      }
      if (expectedCount.mutationsByKey !== undefined) {
        expect(this.queryEngine.mutationsReadByKey).to.be.eq(
          expectedCount.mutationsByKey,
          'Mutations read (by key)'
        );
      }
      if (expectedCount.documentsByQuery !== undefined) {
        expect(this.queryEngine.documentsReadByQuery).to.be.eq(
          expectedCount.documentsByQuery,
          'Remote documents read (by query)'
        );
      }
      if (expectedCount.documentsByKey !== undefined) {
        expect(this.queryEngine.documentsReadByKey).to.be.eq(
          expectedCount.documentsByKey,
          'Remote documents read (by key)'
        );
      }
    });
    return this;
  }

  toReturnTargetId(id: TargetId): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      expect(this.lastTargetId).to.equal(id);
    });
    return this;
  }

  toReturnChanged(...docs: MaybeDocument[]): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      debugAssert(
        this.lastChanges !== null,
        'Called toReturnChanged() without prior after()'
      );
      expect(this.lastChanges.size).to.equal(docs.length, 'number of changes');
      for (const doc of docs) {
        const returned = this.lastChanges.get(doc.key);
        expectEqual(
          doc,
          returned,
          `Expected '${
            returned ? returned.toString() : null
          }' to equal '${doc.toString()}'.`
        );
      }
      this.lastChanges = null;
    });
    return this;
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
        expect(returned).to.be.an.instanceof(NoDocument);
      }
      this.lastChanges = null;
    });
    return this;
  }

  toContain(doc: MaybeDocument): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return readLocalDocument(this.localStore, doc.key).then(result => {
        expectEqual(
          result,
          doc,
          `Expected ${
            result ? result.toString() : null
          } to match ${doc.toString()}.`
        );
      });
    });
    return this;
  }

  toNotContain(keyStr: string): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() =>
      readLocalDocument(this.localStore, key(keyStr)).then(result => {
        expect(result).to.be.null;
      })
    );
    return this;
  }

  toNotContainIfEager(doc: MaybeDocument): LocalStoreTester {
    if (this.gcIsEager) {
      return this.toNotContain(doc.key.toString());
    } else {
      return this.toContain(doc);
    }
  }

  toReturnHighestUnacknowledgeBatchId(expectedId: BatchId): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() =>
      getHighestUnacknowledgedBatchId(this.localStore).then(actual => {
        expect(actual).to.equal(expectedId);
      })
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
      return hasNewerBundle(this.localStore, metadata).then(actual => {
        expect(actual).to.equal(expected);
      });
    });
    return this;
  }

  toHaveNamedQuery(namedQuery: NamedQuery): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return getNamedQuery(this.localStore, namedQuery.name).then(actual => {
        expect(actual).to.exist;
        expect(actual!.name).to.equal(namedQuery.name);
        expect(namedQuery.readTime.isEqual(actual!.readTime)).to.be.true;
        expect(queryEquals(actual!.query, namedQuery.query)).to.be.true;
      });
    });
    return this;
  }

  afterSavingBundle(metadata: ProtoBundleMetadata): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() =>
      saveBundle(this.localStore, metadata)
    );
    return this;
  }

  finish(): Promise<void> {
    return this.promiseChain;
  }
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
  genericLocalStoreTests(initialize, /* gcIsEager= */ true);
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
    await synchronizeLastDocumentChangeReadTime(localStore);
    return { queryEngine, persistence, localStore };
  }

  addEqualityMatcher();
  genericLocalStoreTests(initialize, /* gcIsEager= */ false);
});

function genericLocalStoreTests(
  getComponents: () => Promise<LocalStoreComponents>,
  gcIsEager: boolean
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
    return new LocalStoreTester(localStore, queryEngine, gcIsEager);
  }

  it('handles SetMutation', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .toNotContainIfEager(
        doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .finish();
  });

  it('handles SetMutation -> Document', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAllocatingQuery(query('foo'))
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { it: 'changed' }), [2]))
      .toReturnChanged(
        doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true }))
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
            doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
          )
          .toContain(
            doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
          )
          // Last seen version is zero, so this ack must be held.
          .afterAcknowledgingMutation({ documentVersion: 1 })
          .toReturnChanged(
            doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
          )
          .toNotContainIfEager(
            doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
          )
          .after(setMutation('bar/baz', { bar: 'baz' }))
          .toReturnChanged(
            doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true })
          )
          .toContain(
            doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true })
          )
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
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterReleasingTarget(2)
      .afterAcknowledgingMutation({ documentVersion: 3 })
      .toReturnChanged(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .toNotContainIfEager(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .finish();
  });

  it('handles SetMutation -> NoDocument', () => {
    return expectLocalStore()
      .afterAllocatingQuery(query('foo'))
      .toReturnTargetId(2)
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [2]))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
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
          doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
        )
        .toContain(
          doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
        )
        .afterAcknowledgingMutation({ documentVersion: 3 })
        // We haven't seen the remote event yet
        .toReturnChanged(
          doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
        )
        .toContain(
          doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
        )
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
        doc(
          'foo/bar',
          1,
          { foo: 'bar', it: 'base' },
          { hasLocalMutations: true }
        )
      )
      .toContain(
        doc(
          'foo/bar',
          1,
          { foo: 'bar', it: 'base' },
          { hasLocalMutations: true }
        )
      )
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .toReturnChanged(
        doc(
          'foo/bar',
          2,
          { foo: 'bar', it: 'base' },
          { hasCommittedMutations: true }
        )
      )
      .after(
        docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'bar', it: 'base' }), [2])
      )
      .toReturnChanged(
        doc(
          'foo/bar',
          2,
          { foo: 'bar', it: 'base' },
          { hasLocalMutations: false }
        )
      )
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
      .toContain(deletedDoc('foo/bar', 0))
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnRemoved('foo/bar')
      .toNotContainIfEager(
        deletedDoc('foo/bar', 1, { hasCommittedMutations: true })
      )
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
        .toContain(deletedDoc('foo/bar', 0))
        // remove the mutation so only the mutation is pinning the doc
        .afterReleasingTarget(2)
        .afterAcknowledgingMutation({ documentVersion: 2 })
        .toReturnRemoved('foo/bar')
        .toNotContainIfEager(
          deletedDoc('foo/bar', 2, { hasCommittedMutations: true })
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
        .toContain(deletedDoc('foo/bar', 0))
        .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
        .toReturnRemoved('foo/bar')
        .toContain(deletedDoc('foo/bar', 0))
        // Don't need to keep doc pinned anymore
        .afterReleasingTarget(2)
        .afterAcknowledgingMutation({ documentVersion: 2 })
        .toReturnRemoved('foo/bar')
        .toNotContainIfEager(
          deletedDoc('foo/bar', 2, { hasCommittedMutations: true })
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
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'old' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'old' }, { hasLocalMutations: true }))
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterReleasingTarget(2)
      .afterAcknowledgingMutation({ documentVersion: 2 }) // delete mutation
      .toReturnChanged(
        doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnChanged(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .toNotContainIfEager(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .finish();
  });

  it('handles SetMutation + PatchMutation', () => {
    return expectLocalStore()
      .after([
        setMutation('foo/bar', { foo: 'old' }),
        patchMutation('foo/bar', { foo: 'bar' })
      ])
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it : it.skip)(
    'handles SetMutation -> Ack -> PatchMutation -> Reject',
    () => {
      return (
        expectLocalStore()
          .after(setMutation('foo/bar', { foo: 'old' }))
          .toContain(
            doc('foo/bar', 0, { foo: 'old' }, { hasLocalMutations: true })
          )
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
        doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true }),
        doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true })
      )
      .finish();
  });

  it('handles DeleteMutation -> PatchMutation -> Ack -> Ack', () => {
    return expectLocalStore()
      .after(deleteMutation('foo/bar'))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .afterAcknowledgingMutation({ documentVersion: 2 }) // delete mutation
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 2, { hasCommittedMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnChanged(unknownDoc('foo/bar', 3))
      .toNotContainIfEager(unknownDoc('foo/bar', 3))
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it : it.skip)(
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
  (gcIsEager ? it : it.skip)('collects garbage after ChangeBatch', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 2, { foo: 'bar' }), [2]))
      .toContain(doc('foo/bar', 2, { foo: 'bar' }))
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'baz' }), [], [2]))
      .toNotContain('foo/bar')
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it : it.skip)(
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
          .toContain(
            doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true })
          )
          .toContain(
            doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
          )
          .toContain(deletedDoc('foo/baz', 0))
          .afterAcknowledgingMutation({ documentVersion: 3 })
          .toNotContain('foo/bar')
          .toContain(
            doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
          )
          .toContain(deletedDoc('foo/baz', 0))
          .afterAcknowledgingMutation({ documentVersion: 4 })
          .toNotContain('foo/bar')
          .toNotContain('foo/bah')
          .toContain(deletedDoc('foo/baz', 0))
          .afterAcknowledgingMutation({ documentVersion: 5 })
          .toNotContain('foo/bar')
          .toNotContain('foo/bah')
          .toNotContain('foo/baz')
          .finish()
      );
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it : it.skip)('collects garbage after rejected mutation', () => {
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
        .toContain(
          doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true })
        )
        .toContain(
          doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
        )
        .toContain(deletedDoc('foo/baz', 0))
        .afterRejectingMutation() // patch mutation
        .toNotContain('foo/bar')
        .toContain(
          doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
        )
        .toContain(deletedDoc('foo/baz', 0))
        .afterRejectingMutation() // set mutation
        .toNotContain('foo/bar')
        .toNotContain('foo/bah')
        .toContain(deletedDoc('foo/baz', 0))
        .afterRejectingMutation() // delete mutation
        .toNotContain('foo/bar')
        .toNotContain('foo/bah')
        .toNotContain('foo/baz')
        .finish()
    );
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it : it.skip)('pins documents in the local view', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 1, { foo: 'bar' }), [2]))
      .after(setMutation('foo/baz', { foo: 'baz' }))
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/baz', 0, { foo: 'baz' }, { hasLocalMutations: true }))
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
  (gcIsEager ? it : it.skip)(
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
    return localWrite(localStore, [
      setMutation('foo/bar', { foo: 'bar' }),
      setMutation('foo/baz', { foo: 'baz' }),
      setMutation('foo/bar/Foo/Bar', { Foo: 'Bar' })
    ])
      .then(() => {
        return executeQuery(
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
    return localWrite(localStore, [
      setMutation('fo/bar', { fo: 'bar' }),
      setMutation('foo/bar', { foo: 'bar' }),
      setMutation('foo/baz', { foo: 'baz' }),
      setMutation('foo/bar/Foo/Bar', { Foo: 'Bar' }),
      setMutation('fooo/blah', { fooo: 'blah' })
    ])
      .then(() => {
        return executeQuery(
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
    const targetData = await allocateTarget(localStore, queryToTarget(query1));
    expect(targetData.targetId).to.equal(2);
    await applyRemoteEventToLocalCache(
      localStore,
      docAddedRemoteEvent(doc('foo/baz', 10, { a: 'b' }), [2], [])
    );
    await applyRemoteEventToLocalCache(
      localStore,
      docUpdateRemoteEvent(doc('foo/bar', 20, { a: 'b' }), [2], [])
    );
    await localWrite(localStore, [setMutation('foo/bonk', { a: 'b' })]);
    const { documents } = await executeQuery(
      localStore,
      query1,
      /* usePreviousResults= */ true
    );
    expect(mapAsArray(documents)).to.deep.equal([
      { key: key('foo/bar'), value: doc('foo/bar', 20, { a: 'b' }) },
      { key: key('foo/baz'), value: doc('foo/baz', 10, { a: 'b' }) },
      {
        key: key('foo/bonk'),
        value: doc('foo/bonk', 0, { a: 'b' }, { hasLocalMutations: true })
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
        doc('foo/bonk', 0, { matches: true }, { hasLocalMutations: true })
      )
      .afterAllocatingQuery(secondQuery)
      .toReturnTargetId(4)
      .afterExecutingQuery(secondQuery)
      .toReturnChanged(
        doc('foo/bar', 10, { matches: true }),
        doc('foo/baz', 20, { matches: true }),
        doc('foo/bonk', 0, { matches: true }, { hasLocalMutations: true })
      )
      .toHaveRead({ documentsByQuery: 2, mutationsByQuery: 1 })
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it.skip : it)('persists resume tokens', async () => {
    const query1 = query('foo/bar');
    const targetData = await allocateTarget(localStore, queryToTarget(query1));
    const targetId = targetData.targetId;
    const resumeToken = byteStringFromString('abc');
    const watchChange = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      resumeToken
    );
    const aggregator = new WatchChangeAggregator({
      getRemoteKeysForTarget: () => documentKeySet(),
      getTargetDataForTarget: () => targetData
    });
    aggregator.handleTargetChange(watchChange);
    const remoteEvent = aggregator.createRemoteEvent(version(1000));
    await applyRemoteEventToLocalCache(localStore, remoteEvent);

    // Stop listening so that the query should become inactive (but persistent)
    await releaseTarget(
      localStore,
      targetData.targetId,
      /*keepPersistedTargetData=*/ false
    );

    // Should come back with the same resume token
    const targetData2 = await allocateTarget(localStore, queryToTarget(query1));
    expect(targetData2.resumeToken).to.deep.equal(resumeToken);
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it.skip : it)(
    'does not replace resume token with empty resume token',
    async () => {
      const query1 = query('foo/bar');
      const targetData = await allocateTarget(
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
        getTargetDataForTarget: () => targetData
      });
      aggregator1.handleTargetChange(watchChange1);
      const remoteEvent1 = aggregator1.createRemoteEvent(version(1000));
      await applyRemoteEventToLocalCache(localStore, remoteEvent1);

      const watchChange2 = new WatchTargetChange(
        WatchTargetChangeState.Current,
        [targetId],
        ByteString.EMPTY_BYTE_STRING
      );
      const aggregator2 = new WatchChangeAggregator({
        getRemoteKeysForTarget: () => documentKeySet(),
        getTargetDataForTarget: () => targetData
      });
      aggregator2.handleTargetChange(watchChange2);
      const remoteEvent2 = aggregator2.createRemoteEvent(version(2000));
      await applyRemoteEventToLocalCache(localStore, remoteEvent2);

      // Stop listening so that the query should become inactive (but persistent)
      await releaseTarget(
        localStore,
        targetId,
        /*keepPersistedTargetData=*/ false
      );

      // Should come back with the same resume token
      const targetData2 = await allocateTarget(
        localStore,
        queryToTarget(query1)
      );
      expect(targetData2.resumeToken).to.deep.equal(resumeToken);
    }
  );

  // TODO(mrschmidt): The FieldValue.increment() field transform tests below
  // would probably be better implemented as spec tests but currently they don't
  // support transforms.

  it('handles SetMutation -> TransformMutation -> TransformMutation', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { sum: 0 }))
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true }))
      .after(transformMutation('foo/bar', { sum: FieldValue.increment(1) }))
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true }))
      .after(transformMutation('foo/bar', { sum: FieldValue.increment(2) }))
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 3 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 3 }, { hasLocalMutations: true }))
      .finish();
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it.skip : it)(
    'handles SetMutation -> Ack -> TransformMutation -> Ack -> TransformMutation',
    () => {
      return expectLocalStore()
        .after(setMutation('foo/bar', { sum: 0 }))
        .toReturnChanged(
          doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true }))
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(
          doc('foo/bar', 1, { sum: 0 }, { hasCommittedMutations: true })
        )
        .toContain(
          doc('foo/bar', 1, { sum: 0 }, { hasCommittedMutations: true })
        )
        .after(transformMutation('foo/bar', { sum: FieldValue.increment(1) }))
        .toReturnChanged(
          doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
        .afterAcknowledgingMutation({
          documentVersion: 2,
          transformResult: { integerValue: 1 }
        })
        .toReturnChanged(
          doc('foo/bar', 2, { sum: 1 }, { hasCommittedMutations: true })
        )
        .toContain(
          doc('foo/bar', 2, { sum: 1 }, { hasCommittedMutations: true })
        )
        .after(transformMutation('foo/bar', { sum: FieldValue.increment(2) }))
        .toReturnChanged(
          doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true }))
        .finish();
    }
  );

  it('handles SetMutation -> TransformMutation -> RemoteEvent -> TransformMutation', () => {
    const query1 = query('foo');
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(setMutation('foo/bar', { sum: 0 }))
        .toReturnChanged(
          doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true }))
        .afterRemoteEvent(
          docAddedRemoteEvent(doc('foo/bar', 1, { sum: 0 }), [2])
        )
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(doc('foo/bar', 1, { sum: 0 }))
        .toContain(doc('foo/bar', 1, { sum: 0 }))
        .after(transformMutation('foo/bar', { sum: FieldValue.increment(1) }))
        .toReturnChanged(
          doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
        // The value in this remote event gets ignored since we still have a
        // pending transform mutation.
        .afterRemoteEvent(
          docUpdateRemoteEvent(doc('foo/bar', 2, { sum: 1337 }), [2])
        )
        .toReturnChanged(
          doc('foo/bar', 2, { sum: 1 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 2, { sum: 1 }, { hasLocalMutations: true }))
        // Add another increment. Note that we still compute the increment based
        // on the local value.
        .after(transformMutation('foo/bar', { sum: FieldValue.increment(2) }))
        .toReturnChanged(
          doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true }))
        .afterAcknowledgingMutation({
          documentVersion: 3,
          transformResult: { integerValue: 1 }
        })
        .toReturnChanged(
          doc('foo/bar', 3, { sum: 3 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 3, { sum: 3 }, { hasLocalMutations: true }))
        .afterAcknowledgingMutation({
          documentVersion: 4,
          transformResult: { integerValue: 1339 }
        })
        .toReturnChanged(
          doc('foo/bar', 4, { sum: 1339 }, { hasCommittedMutations: true })
        )
        .toContain(
          doc('foo/bar', 4, { sum: 1339 }, { hasCommittedMutations: true })
        )
        .finish()
    );
  });

  it('holds back only non-idempotent transforms', () => {
    const query1 = query('foo');
    return (
      expectLocalStore()
        .afterAllocatingQuery(query1)
        .toReturnTargetId(2)
        .after(setMutation('foo/bar', { sum: 0, arrayUnion: [] }))
        .toReturnChanged(
          doc(
            'foo/bar',
            0,
            { sum: 0, arrayUnion: [] },
            { hasLocalMutations: true }
          )
        )
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(
          doc(
            'foo/bar',
            1,
            { sum: 0, arrayUnion: [] },
            { hasCommittedMutations: true }
          )
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
        .afterMutations([
          transformMutation('foo/bar', { sum: FieldValue.increment(1) }),
          transformMutation('foo/bar', {
            arrayUnion: FieldValue.arrayUnion('foo')
          })
        ])
        .toReturnChanged(
          doc(
            'foo/bar',
            1,
            { sum: 1, arrayUnion: ['foo'] },
            { hasLocalMutations: true }
          )
        )
        // The sum transform is not idempotent and the backend's updated value
        // is ignored. The ArrayUnion transform is recomputed and includes the
        // backend value.
        .afterRemoteEvent(
          docUpdateRemoteEvent(
            doc('foo/bar', 2, { sum: 1337, arrayUnion: ['bar'] }),
            [2]
          )
        )
        .toReturnChanged(
          doc(
            'foo/bar',
            2,
            { sum: 1, arrayUnion: ['bar', 'foo'] },
            { hasLocalMutations: true }
          )
        )
        .finish()
    );
  });

  it('handles MergeMutation with Transform -> RemoteEvent', () => {
    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .afterMutations([
        patchMutation('foo/bar', {}, Precondition.none()),
        transformMutation('foo/bar', { sum: FieldValue.increment(1) })
      ])
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true }))
      .afterRemoteEvent(
        docAddedRemoteEvent(doc('foo/bar', 1, { sum: 1337 }), [2])
      )
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
      .finish();
  });

  it('handles PatchMutation with Transform -> RemoteEvent', () => {
    // Note: This test reflects the current behavior, but it may be preferable
    // to replay the mutation once we receive the first value from the backend.

    const query1 = query('foo');
    return expectLocalStore()
      .afterAllocatingQuery(query1)
      .toReturnTargetId(2)
      .afterMutations([
        patchMutation('foo/bar', {}),
        transformMutation('foo/bar', { sum: FieldValue.increment(1) })
      ])
      .toReturnChanged(deletedDoc('foo/bar', 0))
      .toNotContain('foo/bar')
      .afterRemoteEvent(
        docAddedRemoteEvent(doc('foo/bar', 1, { sum: 1337 }), [2])
      )
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
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
      .afterMutations([
        patchMutation('foo/bar', {}, Precondition.none()),
        transformMutation('foo/bar', { sum: FieldValue.increment(1) })
      ])
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true }))
      .after(bundledDocuments([doc('foo/bar', 1, { sum: 1337 })]))
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
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
      .afterMutations([
        patchMutation('foo/bar', {}),
        transformMutation('foo/bar', { sum: FieldValue.increment(1) })
      ])
      .toReturnChanged(deletedDoc('foo/bar', 0))
      .toNotContain('foo/bar')
      .after(bundledDocuments([doc('foo/bar', 1, { sum: 1337 })]))
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
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

  it('uses target mapping to execute queries', () => {
    if (gcIsEager) {
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
        // Execute the query, but note that we read all existing documents
        // from the RemoteDocumentCache since we do not yet have target
        // mapping.
        .toHaveRead({ documentsByQuery: 2 })
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
        .toHaveRead({ documentsByKey: 2, documentsByQuery: 0 })
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

    const targetData = await allocateTarget(localStore, target);

    // Advance the query snapshot
    await applyRemoteEventToLocalCache(
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
      txn => getLocalTargetData(localStore, txn, target)
    );
    expect(
      cachedTargetData!.lastLimboFreeSnapshotVersion.isEqual(
        SnapshotVersion.min()
      )
    ).to.be.true;

    // Mark the view synced, which updates the last limbo free snapshot version.
    await notifyLocalViewChanges(localStore, [
      localViewChanges(2, /* fromCache= */ false, {})
    ]);
    cachedTargetData = await persistence.runTransaction(
      'getTargetData',
      'readonly',
      txn => getLocalTargetData(localStore, txn, target)
    );
    expect(cachedTargetData!.lastLimboFreeSnapshotVersion.isEqual(version(10)))
      .to.be.true;

    // The last limbo free snapshot version is persisted even if we release the
    // query.
    await releaseTarget(
      localStore,
      targetData.targetId,
      /* keepPersistedTargetData= */ false
    );

    if (!gcIsEager) {
      cachedTargetData = await persistence.runTransaction(
        'getTargetData',
        'readonly',
        txn => getLocalTargetData(localStore, txn, target)
      );
      expect(
        cachedTargetData!.lastLimboFreeSnapshotVersion.isEqual(version(10))
      ).to.be.true;
    }
  });

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it.skip : it)(
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
            doc('foo/b', 0, { matches: true }, { hasLocalMutations: true })
          )
          .afterAcknowledgingMutation({ documentVersion: 11 })
          // Execute the query and make sure that the acknowledged mutation is
          // included in the result.
          .afterExecutingQuery(query1)
          .toReturnChanged(
            doc('foo/a', 10, { matches: true }),
            doc('foo/b', 11, { matches: true }, { hasCommittedMutations: true })
          )
          .finish()
      );
    }
  );

  // eslint-disable-next-line no-restricted-properties
  (gcIsEager ? it.skip : it)(
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
  (gcIsEager ? it.skip : it)(
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
