/**
 * @license
 * Copyright 2018 Google Inc.
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
import { Timestamp } from '../../../src/api/timestamp';
import { User } from '../../../src/auth/user';
import { ListenSequence } from '../../../src/core/listen_sequence';
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { ListenSequenceNumber, TargetId } from '../../../src/core/types';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  ActiveTargets,
  LruDelegate,
  LruGarbageCollector,
  LruParams
} from '../../../src/local/lru_garbage_collector';
import { MutationQueue } from '../../../src/local/mutation_queue';
import {
  Persistence,
  PersistenceTransaction
} from '../../../src/local/persistence';

import { PersistencePromise } from '../../../src/local/persistence_promise';
import { QueryCache } from '../../../src/local/query_cache';
import { QueryData, QueryPurpose } from '../../../src/local/query_data';
import { ReferenceSet } from '../../../src/local/reference_set';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { documentKeySet } from '../../../src/model/collections';
import { Document, MaybeDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import {
  Mutation,
  Precondition,
  SetMutation
} from '../../../src/model/mutation';
import { AsyncQueue } from '../../../src/util/async_queue';
import { path, wrapObject } from '../../util/helpers';
import * as PersistenceTestHelpers from './persistence_test_helpers';

describe('IndexedDbLruDelegate', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbLruReferenceDelegate tests.');
    return;
  }

  genericLruGarbageCollectorTests((params, queue) =>
    PersistenceTestHelpers.testIndexedDbPersistence({ queue }, params)
  );
});

describe('MemoryLruDelegate', () => {
  genericLruGarbageCollectorTests(params =>
    PersistenceTestHelpers.testMemoryLruPersistence(params)
  );
});

function genericLruGarbageCollectorTests(
  newPersistence: (params: LruParams, queue: AsyncQueue) => Promise<Persistence>
): void {
  const queue = new AsyncQueue();

  // We need to initialize a few counters so that we can use them when we
  // auto-generate things like targets and documents. Pick arbitrary values
  // such that sequences are unlikely to overlap as we increment them.
  let previousTargetId: TargetId;
  let previousDocNum: number;

  beforeEach(async () => {
    previousTargetId = 500;
    previousDocNum = 10;
    await initializeTestResources(LruParams.DEFAULT);
  });

  afterEach(async () => {
    await queue.enqueue(async () => {
      await persistence.shutdown();
      await PersistenceTestHelpers.clearTestPersistence();
    });
  });

  let persistence: Persistence;
  let queryCache: QueryCache;
  let garbageCollector: LruGarbageCollector;
  let initialSequenceNumber: ListenSequenceNumber;
  let mutationQueue: MutationQueue;
  let documentCache: RemoteDocumentCache;
  let lruParams: LruParams;

  async function initializeTestResources(
    params: LruParams = LruParams.DEFAULT
  ): Promise<void> {
    if (persistence && persistence.started) {
      await queue.enqueue(async () => {
        await persistence.shutdown();
        await PersistenceTestHelpers.clearTestPersistence();
      });
    }
    lruParams = params;
    persistence = await newPersistence(params, queue);
    queryCache = persistence.getQueryCache();
    mutationQueue = persistence.getMutationQueue(new User('user'));
    documentCache = persistence.getRemoteDocumentCache();
    initialSequenceNumber = await persistence.runTransaction(
      'highest sequence number',
      'readwrite',
      txn => PersistencePromise.resolve(txn.currentSequenceNumber)
    );
    const referenceDelegate = persistence.referenceDelegate;
    referenceDelegate.setInMemoryPins(new ReferenceSet());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    garbageCollector = ((referenceDelegate as any) as LruDelegate)
      .garbageCollector;
  }

  function nextQueryData(sequenceNumber: ListenSequenceNumber): QueryData {
    const targetId = ++previousTargetId;
    return new QueryData(
      Query.atPath(path('path' + targetId)),
      targetId,
      QueryPurpose.Listen,
      sequenceNumber
    );
  }

  function nextTestDocumentKey(): DocumentKey {
    return DocumentKey.fromPathString('docs/doc_' + ++previousDocNum);
  }

  function addNextTargetInTransaction(
    txn: PersistenceTransaction
  ): PersistencePromise<QueryData> {
    const queryData = nextQueryData(txn.currentSequenceNumber);
    return queryCache.addQueryData(txn, queryData).next(() => queryData);
  }

  function addNextTarget(): Promise<QueryData> {
    return persistence.runTransaction('add query', 'readwrite', txn => {
      return addNextTargetInTransaction(txn);
    });
  }

  function updateTargetInTransaction(
    txn: PersistenceTransaction,
    queryData: QueryData
  ): PersistencePromise<void> {
    const updated = queryData.copy({
      sequenceNumber: txn.currentSequenceNumber
    });
    return queryCache
      .updateQueryData(txn, updated)
      .next(() =>
        queryCache.setTargetsMetadata(txn, txn.currentSequenceNumber)
      );
  }

  function markDocumentEligibleForGCInTransaction(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    return persistence.referenceDelegate.removeMutationReference(txn, key);
  }

  function markDocumentEligibleForGC(key: DocumentKey): Promise<void> {
    return persistence.runTransaction(
      'mark document eligible for GC',
      'readwrite',
      txn => {
        return markDocumentEligibleForGCInTransaction(txn, key);
      }
    );
  }

  function markADocumentEligibleForGCInTransaction(
    txn: PersistenceTransaction
  ): PersistencePromise<void> {
    const key = nextTestDocumentKey();
    return markDocumentEligibleForGCInTransaction(txn, key);
  }

  function markADocumentEligibleForGC(): Promise<void> {
    const key = nextTestDocumentKey();
    return markDocumentEligibleForGC(key);
  }

  function calculateTargetCount(percentile: number): Promise<number> {
    return persistence.runTransaction(
      'calculate target count',
      'readwrite',
      txn => {
        return garbageCollector.calculateTargetCount(txn, percentile);
      }
    );
  }

  function nthSequenceNumber(n: number): Promise<ListenSequenceNumber> {
    return persistence.runTransaction(
      'nth sequence number',
      'readwrite',
      txn => {
        return garbageCollector.nthSequenceNumber(txn, n);
      }
    );
  }

  function removeTargets(
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): Promise<number> {
    return persistence.runTransaction('remove targets', 'readwrite', txn => {
      return garbageCollector.removeTargets(txn, upperBound, activeTargetIds);
    });
  }

  function removeOrphanedDocuments(
    upperBound: ListenSequenceNumber
  ): Promise<number> {
    return persistence.runTransaction(
      'remove orphaned documents',
      'readwrite',
      txn => {
        return garbageCollector.removeOrphanedDocuments(txn, upperBound);
      }
    );
  }

  function nextTestDocument(): Document {
    const key = nextTestDocumentKey();
    return new Document(
      key,
      SnapshotVersion.fromMicroseconds(1000),
      wrapObject({ foo: 3, bar: false }),
      {}
    );
  }

  function saveDocument(
    txn: PersistenceTransaction,
    doc: MaybeDocument
  ): PersistencePromise<void> {
    const changeBuffer = documentCache.newChangeBuffer();
    return changeBuffer.getEntry(txn, doc.key).next(() => {
      changeBuffer.addEntry(doc);
      return changeBuffer.apply(txn);
    });
  }

  function cacheADocumentInTransaction(
    txn: PersistenceTransaction
  ): PersistencePromise<DocumentKey> {
    const doc = nextTestDocument();
    return saveDocument(txn, doc).next(() => doc.key);
  }

  function mutation(key: DocumentKey): Mutation {
    return new SetMutation(
      key,
      wrapObject({ baz: 'hello', world: 2 }),
      Precondition.NONE
    );
  }

  it('picks sequence number percentile', async () => {
    const testCases: Array<{ targets: number; expected: number }> = [
      //{ targets: 0, expected: 0 },
      { targets: 10, expected: 1 },
      { targets: 9, expected: 0 },
      { targets: 50, expected: 5 },
      { targets: 49, expected: 4 }
    ];

    for (const { targets, expected } of testCases) {
      await initializeTestResources();
      for (let i = 0; i < targets; i++) {
        await addNextTarget();
      }
      const tenth = await calculateTargetCount(10);
      expect(tenth).to.equal(
        expected,
        'Expected 10% of ' + targets + ' to be ' + expected
      );
    }
  });

  describe('nthSequenceNumber()', () => {
    it('sequence number for no targets', async () => {
      expect(await nthSequenceNumber(0)).to.equal(ListenSequence.INVALID);
    });

    it('with 50 targets', async () => {
      // Add 50 queries sequentially, aim to collect 10 of them.
      // The sequence number to collect should be 10 past the initial sequence number.
      for (let i = 0; i < 50; i++) {
        await addNextTarget();
      }
      const expected = initialSequenceNumber + 10;
      expect(await nthSequenceNumber(10)).to.equal(expected);
    });

    it('with multiple targets in a transaction', async () => {
      // 50 queries, 9 with one transaction, incrementing from there. Should get second sequence
      // number.
      await persistence.runTransaction(
        '9 targets in a batch',
        'readwrite',
        txn => {
          let p = PersistencePromise.resolve();
          for (let i = 0; i < 9; i++) {
            p = p.next(() => addNextTargetInTransaction(txn)).next();
          }
          return p;
        }
      );
      for (let i = 9; i < 50; i++) {
        await addNextTarget();
      }
      const expected = initialSequenceNumber + 2;
      expect(await nthSequenceNumber(10)).to.equal(expected);
    });

    it('with all collected targets in a single transaction', async () => {
      await persistence.runTransaction(
        '11 targets in a batch',
        'readwrite',
        txn => {
          let p = PersistencePromise.resolve();
          for (let i = 0; i < 11; i++) {
            p = p.next(() => addNextTargetInTransaction(txn)).next();
          }
          return p;
        }
      );
      for (let i = 11; i < 50; i++) {
        await addNextTarget();
      }
      const expected = initialSequenceNumber + 1;
      expect(await nthSequenceNumber(10)).to.equal(expected);
    });

    it('with mutation and sequential targets', async () => {
      // Remove a mutated doc reference, marking it as eligible for GC.
      // Then add 50 queries. Should get 10 past initial (9 queries).
      await markADocumentEligibleForGC();
      for (let i = 0; i < 50; i++) {
        await addNextTarget();
      }

      const expected = initialSequenceNumber + 10;
      expect(await nthSequenceNumber(10)).to.equal(expected);
    });

    it('with mutations in targets', async () => {
      // Add mutated docs, then add one of them to a query target so it doesn't get GC'd.
      // Expect 3 past the initial value: the mutations not part of a query, and two queries
      const docInTarget = nextTestDocumentKey();
      await persistence.runTransaction('mark mutations', 'readwrite', txn => {
        // Adding 9 doc keys in a transaction. If we remove one of them, we'll have room for two
        // actual targets.
        let p = markDocumentEligibleForGCInTransaction(txn, docInTarget);
        for (let i = 0; i < 8; i++) {
          p = p.next(() => markADocumentEligibleForGCInTransaction(txn));
        }
        return p;
      });

      for (let i = 0; i < 49; i++) {
        await addNextTarget();
      }
      await persistence.runTransaction(
        'target with a mutation',
        'readwrite',
        txn => {
          return addNextTargetInTransaction(txn).next(queryData => {
            const keySet = documentKeySet().add(docInTarget);
            return queryCache.addMatchingKeys(txn, keySet, queryData.targetId);
          });
        }
      );
      const expected = initialSequenceNumber + 3;
      expect(await nthSequenceNumber(10)).to.equal(expected);
    });
  });

  it('removes targets up through sequence number', async () => {
    const activeTargetIds: ActiveTargets = {};
    for (let i = 0; i < 100; i++) {
      const queryData = await addNextTarget();
      // Mark odd queries as live so we can test filtering out live queries.
      const targetId = queryData.targetId;
      if (targetId % 2 === 1) {
        activeTargetIds[targetId] = queryData;
      }
    }

    // GC up through 20th query, which is 20%.
    // Expect to have GC'd 10 targets, since every other target is live
    const upperBound = 20 + initialSequenceNumber;
    const removed = await removeTargets(upperBound, activeTargetIds);
    expect(removed).to.equal(10);
    // Make sure we removed the even targets with targetID <= 20.
    await persistence.runTransaction(
      'verify remaining targets > 20 or odd',
      'readwrite',
      txn => {
        return queryCache.forEachTarget(txn, queryData => {
          const targetId = queryData.targetId;
          expect(targetId > 20 || targetId % 2 === 1).to.be.true;
        });
      }
    );
  });

  it('removes orphaned documents', async () => {
    // Track documents we expect to be retained so we can verify post-GC.
    // This will contain documents associated with targets that survive GC, as well
    // as any documents with pending mutations.
    const expectedRetained = new Set<DocumentKey>();
    // we add two mutations later, for now track them in an array.
    const mutations: Mutation[] = [];

    // Add two documents to first target, queue a mutation on the second document
    await persistence.runTransaction(
      'add a target and add two documents to it',
      'readwrite',
      txn => {
        return addNextTargetInTransaction(txn).next(queryData => {
          let keySet = documentKeySet();
          return cacheADocumentInTransaction(txn)
            .next(docKey1 => {
              expectedRetained.add(docKey1);
              keySet = keySet.add(docKey1);
            })
            .next(() => cacheADocumentInTransaction(txn))
            .next(docKey2 => {
              expectedRetained.add(docKey2);
              keySet = keySet.add(docKey2);
              mutations.push(mutation(docKey2));
            })
            .next(() =>
              queryCache.addMatchingKeys(txn, keySet, queryData.targetId)
            );
        });
      }
    );

    // Add a second query and register a third document on it
    await persistence.runTransaction('second target', 'readwrite', txn => {
      return addNextTargetInTransaction(txn).next(queryData => {
        return cacheADocumentInTransaction(txn).next(docKey3 => {
          expectedRetained.add(docKey3);
          const keySet = documentKeySet().add(docKey3);
          return queryCache.addMatchingKeys(txn, keySet, queryData.targetId);
        });
      });
    });

    // cache another document and prepare a mutation on it.
    await persistence.runTransaction('queue a mutation', 'readwrite', txn => {
      return cacheADocumentInTransaction(txn).next(docKey4 => {
        mutations.push(mutation(docKey4));
        expectedRetained.add(docKey4);
      });
    });

    // Insert the mutations. These operations don't have a sequence number, they just
    // serve to keep the mutated documents from being GC'd while the mutations are outstanding.
    await persistence.runTransaction(
      'actually register the mutations',
      'readwrite',
      txn => {
        return mutationQueue.addMutationBatch(
          txn,
          Timestamp.fromMillis(2000),
          /* baseMutations= */ [],
          mutations
        );
      }
    );

    // Mark 5 documents eligible for GC. This simulates documents that were mutated then ack'd.
    // Since they were ack'd, they are no longer in a mutation queue, and there is nothing keeping
    // them alive.
    const toBeRemoved = new Set<DocumentKey>();
    await persistence.runTransaction(
      "add orphaned docs (previously mutated, then ack'd",
      'readwrite',
      txn => {
        let p = PersistencePromise.resolve();
        for (let i = 0; i < 5; i++) {
          p = p.next(() => {
            return cacheADocumentInTransaction(txn).next(docKey => {
              toBeRemoved.add(docKey);
              return markDocumentEligibleForGCInTransaction(txn, docKey);
            });
          });
        }
        return p;
      }
    );

    // We expect only the orphaned documents, those not in a mutation or a target, to be removed.
    // use a large sequence number to remove as much as possible
    const removed = await removeOrphanedDocuments(1000);
    expect(removed).to.equal(toBeRemoved.size);
    await persistence.runTransaction('verify', 'readwrite', txn => {
      let p = PersistencePromise.resolve();
      toBeRemoved.forEach(docKey => {
        p = p.next(() => {
          return documentCache.getEntry(txn, docKey).next(maybeDoc => {
            expect(maybeDoc).to.be.null;
          });
        });
      });
      expectedRetained.forEach(docKey => {
        p = p.next(() => {
          return documentCache.getEntry(txn, docKey).next(maybeDoc => {
            expect(maybeDoc).to.not.be.null;
          });
        });
      });
      return p;
    });
  });

  it('removes targets then GCs', async () => {
    // Create 3 targets, add docs to all of them
    // Leave oldest target alone, it is still live
    // Remove newest target
    // Blind write 2 documents
    // Add one of the blind write docs to oldest target (preserves it)
    // Remove some documents from middle target (bumps sequence number)
    // Add some documents from newest target to oldest target (preserves them)
    // Update a doc from middle target
    // Remove middle target
    // Do a blind write
    // GC up to but not including the removal of the middle target
    //
    // Expect:
    // All docs in oldest target are still around
    // One blind write is gone, the first one not added to oldest target
    // Documents removed from middle target are gone, except ones added to the
    //    oldest target
    // Documents from newest target are gone, except those added to the oldest
    //    target

    // Through the various steps, track which documents we expect to be removed
    // vs documents we expect to be retained.
    const expectedRetained = new Set<DocumentKey>();
    const expectedRemoved = new Set<DocumentKey>();

    // Verify that the size of the remote document cache behaves rationally. We don't
    // verify exact numbers since the sizing algorithm is subject to change. But, we
    // can verify that it starts at 0, goes up to some number, and then goes down when
    // we remove documents.
    const initialSize = await persistence.runTransaction(
      'get size',
      'readonly',
      txn => persistence.getRemoteDocumentCache().getSize(txn)
    );
    expect(initialSize).to.equal(0);

    // Add oldest target, 5 documents, and add those documents to the target.
    // This target will not be removed, so all documents that are part of it
    // will be retained.
    const oldestTarget = await persistence.runTransaction(
      'Add oldest target and docs',
      'readwrite',
      txn => {
        return addNextTargetInTransaction(txn).next(queryData => {
          let p = PersistencePromise.resolve();
          let keySet = documentKeySet();
          for (let i = 0; i < 5; i++) {
            p = p.next(() => {
              return cacheADocumentInTransaction(txn).next(docKey => {
                expectedRetained.add(docKey);
                keySet = keySet.add(docKey);
              });
            });
          }
          return p
            .next(() =>
              queryCache.addMatchingKeys(txn, keySet, queryData.targetId)
            )
            .next(() => queryData);
        });
      }
    );

    // Add middle target and docs. Some docs will be removed from this target
    // later, which we track here.
    let middleDocsToRemove = documentKeySet();
    let middleDocToUpdate: DocumentKey;
    // This will be the document in this target that gets an update later.
    const middleTarget = await persistence.runTransaction(
      'Add middle target and docs',
      'readwrite',
      txn => {
        return addNextTargetInTransaction(txn).next(queryData => {
          let p = PersistencePromise.resolve();
          let keySet = documentKeySet();

          // these docs will be removed from this target later, triggering a bump
          // to their sequence numbers. Since they will not be a part of the target, we
          // expect them to be removed.
          for (let i = 0; i < 2; i++) {
            p = p.next(() => {
              return cacheADocumentInTransaction(txn).next(docKey => {
                expectedRemoved.add(docKey);
                keySet = keySet.add(docKey);
                middleDocsToRemove = middleDocsToRemove.add(docKey);
              });
            });
          }

          // these docs stay in this target and only this target. There presence in this
          // target prevents them from being GC'd, so they are also expected to be retained.
          for (let i = 2; i < 4; i++) {
            p = p.next(() => {
              return cacheADocumentInTransaction(txn).next(docKey => {
                expectedRetained.add(docKey);
                keySet = keySet.add(docKey);
              });
            });
          }

          // This doc stays in this target, but gets updated.
          {
            p = p.next(() => {
              return cacheADocumentInTransaction(txn).next(docKey => {
                expectedRetained.add(docKey);
                keySet = keySet.add(docKey);
                middleDocToUpdate = docKey;
              });
            });
          }

          return p
            .next(() =>
              queryCache.addMatchingKeys(txn, keySet, queryData.targetId)
            )
            .next(() => queryData);
        });
      }
    );

    // Add the newest target and add 5 documents to it. Some of those documents will
    // additionally be added to the oldest target, which will cause those documents to
    // be retained. The remaining documents are expected to be removed, since this target
    // will be removed.
    let newestDocsToAddToOldest = documentKeySet();
    await persistence.runTransaction(
      'Add newest target and docs',
      'readwrite',
      txn => {
        return addNextTargetInTransaction(txn).next(queryData => {
          let p = PersistencePromise.resolve();
          let keySet = documentKeySet();
          // These documents are only in this target. They are expected to be removed
          // because this target will also be removed.
          for (let i = 0; i < 3; i++) {
            p = p.next(() => {
              return cacheADocumentInTransaction(txn).next(docKey => {
                expectedRemoved.add(docKey);
                keySet = keySet.add(docKey);
              });
            });
          }

          // docs to add to the oldest target in addition to this target. They will be retained
          for (let i = 3; i < 5; i++) {
            p = p.next(() => {
              return cacheADocumentInTransaction(txn).next(docKey => {
                expectedRetained.add(docKey);
                keySet = keySet.add(docKey);
                newestDocsToAddToOldest = newestDocsToAddToOldest.add(docKey);
              });
            });
          }

          return p
            .next(() =>
              queryCache.addMatchingKeys(txn, keySet, queryData.targetId)
            )
            .next(() => queryData);
        });
      }
    );

    // 2 doc writes, add one of them to the oldest target.
    await persistence.runTransaction(
      '2 doc writes, add one of them to the oldest target',
      'readwrite',
      txn => {
        let keySet = documentKeySet();
        return cacheADocumentInTransaction(txn)
          .next(docKey1 => {
            keySet = keySet.add(docKey1);
            expectedRetained.add(docKey1);
            return markDocumentEligibleForGCInTransaction(txn, docKey1);
          })
          .next(() => {
            return queryCache.addMatchingKeys(
              txn,
              keySet,
              oldestTarget.targetId
            );
          })
          .next(() => {
            return updateTargetInTransaction(txn, oldestTarget);
          })
          .next(() => {
            return cacheADocumentInTransaction(txn);
          })
          .next(docKey2 => {
            expectedRemoved.add(docKey2);
            return markDocumentEligibleForGCInTransaction(txn, docKey2);
          });
      }
    );

    // Remove some documents from the middle target.
    await persistence.runTransaction(
      'Remove some documents from the middle target',
      'readwrite',
      txn => {
        return updateTargetInTransaction(txn, middleTarget).next(() =>
          queryCache.removeMatchingKeys(
            txn,
            middleDocsToRemove,
            middleTarget.targetId
          )
        );
      }
    );

    // Add a couple docs from the newest target to the oldest (preserves them past the point where
    // newest was removed)
    // upperBound is the sequence number right before middleTarget is updated, then removed.
    const upperBound = await persistence.runTransaction(
      'Add a couple docs from the newest target to the oldest',
      'readwrite',
      txn => {
        return updateTargetInTransaction(txn, oldestTarget)
          .next(() => {
            return queryCache.addMatchingKeys(
              txn,
              newestDocsToAddToOldest,
              oldestTarget.targetId
            );
          })
          .next(() => txn.currentSequenceNumber);
      }
    );

    // Update a doc in the middle target
    await persistence.runTransaction(
      'Update a doc in the middle target',
      'readwrite',
      txn => {
        const doc = new Document(
          middleDocToUpdate,
          SnapshotVersion.fromMicroseconds(2000),
          wrapObject({ foo: 4, bar: true }),
          {}
        );
        return saveDocument(txn, doc).next(() => {
          return updateTargetInTransaction(txn, middleTarget);
        });
      }
    );

    // Remove the middle target
    await persistence.runTransaction(
      'remove middle target',
      'readwrite',
      txn => {
        return persistence.referenceDelegate.removeTarget(txn, middleTarget);
      }
    );

    // Write a doc and get an ack, not part of a target
    await persistence.runTransaction(
      'Write a doc and get an ack, not part of a target',
      'readwrite',
      txn => {
        return cacheADocumentInTransaction(txn).next(docKey => {
          // This should be retained, it's too new to get removed.
          expectedRetained.add(docKey);
          // Mark it as eligible for GC, but this is after our upper bound for what we will collect.
          return markDocumentEligibleForGCInTransaction(txn, docKey);
        });
      }
    );

    // Finally, do the garbage collection, up to but not including the removal of middleTarget
    const activeTargetIds: ActiveTargets = {};
    activeTargetIds[oldestTarget.targetId] = {};

    const preCollectSize = await persistence.runTransaction(
      'get size',
      'readonly',
      txn => persistence.getRemoteDocumentCache().getSize(txn)
    );
    expect(preCollectSize).to.be.greaterThan(initialSize);

    // Expect to remove newest target
    const removed = await removeTargets(upperBound, activeTargetIds);
    expect(removed).to.equal(1);
    const docsRemoved = await removeOrphanedDocuments(upperBound);
    expect(docsRemoved).to.equal(expectedRemoved.size);
    await persistence.runTransaction('verify results', 'readwrite', txn => {
      let p = PersistencePromise.resolve();
      expectedRemoved.forEach(key => {
        p = p
          .next(() => documentCache.getEntry(txn, key))
          .next(maybeDoc => {
            expect(maybeDoc).to.be.null;
          });
      });
      expectedRetained.forEach(key => {
        p = p
          .next(() => documentCache.getEntry(txn, key))
          .next(maybeDoc => {
            expect(maybeDoc).to.not.be.null;
          });
      });
      return p;
    });

    const postCollectSize = await persistence.runTransaction(
      'get size',
      'readonly',
      txn => persistence.getRemoteDocumentCache().getSize(txn)
    );
    expect(postCollectSize).to.be.lessThan(preCollectSize);
  });

  it('gets cache size', async () => {
    const initialSize = await persistence.runTransaction(
      'getCacheSize',
      'readonly',
      txn => garbageCollector.getCacheSize(txn)
    );

    await persistence.runTransaction('fill cache', 'readwrite-primary', txn => {
      // Simulate a bunch of ack'd mutations
      const promises: Array<PersistencePromise<void>> = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          cacheADocumentInTransaction(txn).next(docKey =>
            markDocumentEligibleForGCInTransaction(txn, docKey)
          )
        );
      }
      return PersistencePromise.waitFor(promises);
    });

    const finalSize = await persistence.runTransaction(
      'getCacheSize',
      'readonly',
      txn => garbageCollector.getCacheSize(txn)
    );
    // Document sizes are approximate, so we don't test an exact value here. Instead, just confirm
    // that the size is larger than the initial size.
    expect(finalSize).to.be.greaterThan(initialSize);
  });

  it('can be disabled', async () => {
    // Switch out the test resources for ones with a disabled GC.
    await persistence.shutdown();
    await initializeTestResources(LruParams.DISABLED);

    await persistence.runTransaction('fill cache', 'readwrite-primary', txn => {
      // Simulate a bunch of ack'd mutations
      const promises: Array<PersistencePromise<void>> = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          cacheADocumentInTransaction(txn).next(docKey =>
            markDocumentEligibleForGCInTransaction(txn, docKey)
          )
        );
      }
      return PersistencePromise.waitFor(promises);
    });

    const results = await persistence.runTransaction(
      'collect garbage',
      'readwrite-primary',
      txn => garbageCollector.collect(txn, {})
    );
    expect(results.didRun).to.be.false;
  });

  it('skips a cache that is too small', async () => {
    // Default LRU params are ok for this test.

    await persistence.runTransaction('fill cache', 'readwrite-primary', txn => {
      // Simulate a bunch of ack'd mutations
      const promises: Array<PersistencePromise<void>> = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          cacheADocumentInTransaction(txn).next(docKey =>
            markDocumentEligibleForGCInTransaction(txn, docKey)
          )
        );
      }
      return PersistencePromise.waitFor(promises);
    });

    // Make sure we're under the target size.
    const cacheSize = await persistence.runTransaction(
      'getCacheSize',
      'readonly',
      txn => garbageCollector.getCacheSize(txn)
    );
    expect(cacheSize).to.be.lessThan(lruParams.cacheSizeCollectionThreshold);

    const results = await persistence.runTransaction(
      'collect garbage',
      'readwrite-primary',
      txn => garbageCollector.collect(txn, {})
    );
    expect(results.didRun).to.be.false;
  });

  it('runs when the cache is large enough', async () => {
    // Set a low byte threshold so we can guarantee that GC will run
    await initializeTestResources(LruParams.withCacheSize(100));
    expect(persistence.started).to.be.true;

    // Add 50 targets and 10 documents to each.
    for (let i = 0; i < 50; i++) {
      // Use separate transactions so that each target and associated documents get their own
      // sequence number.
      await persistence.runTransaction(
        'Add a target and some documents',
        'readwrite-primary',
        txn => {
          return addNextTargetInTransaction(txn).next(queryData => {
            const targetId = queryData.targetId;
            const promises: Array<PersistencePromise<void>> = [];
            for (let j = 0; j < 10; j++) {
              promises.push(
                cacheADocumentInTransaction(txn).next(docKey =>
                  queryCache.addMatchingKeys(
                    txn,
                    documentKeySet(docKey),
                    targetId
                  )
                )
              );
            }
            return PersistencePromise.waitFor(promises).next(() =>
              updateTargetInTransaction(txn, queryData)
            );
          });
        }
      );
    }

    // Make sure we're over the target size.
    const cacheSize = await persistence.runTransaction(
      'getCacheSize',
      'readonly',
      txn => garbageCollector.getCacheSize(txn)
    );
    expect(cacheSize).to.be.greaterThan(lruParams.cacheSizeCollectionThreshold);

    const results = await persistence.runTransaction(
      'collect garbage',
      'readwrite-primary',
      txn => garbageCollector.collect(txn, {})
    );
    expect(results.didRun).to.be.true;
    expect(results.targetsRemoved).to.equal(5);
    expect(results.documentsRemoved).to.equal(50);

    // Verify that we updated the cache size by checking that it's smaller now.
    const finalCacheSize = await persistence.runTransaction(
      'getCacheSize',
      'readonly',
      txn => garbageCollector.getCacheSize(txn)
    );
    expect(finalCacheSize).to.be.lessThan(cacheSize);
  });

  it('caps sequence numbers to collect', async () => {
    // Set a low byte threshold and plan to GC all of it. Should be capped by low max number of
    // sequence numbers.
    const params = new LruParams(100, 100, 5);
    await initializeTestResources(params);

    // Add 50 targets and 10 documents to each.
    for (let i = 0; i < 50; i++) {
      // Use separate transactions so that each target and associated documents get their own
      // sequence number.
      await persistence.runTransaction(
        'Add a target and some documents',
        'readwrite-primary',
        txn => {
          return addNextTargetInTransaction(txn).next(queryData => {
            const targetId = queryData.targetId;
            const promises: Array<PersistencePromise<void>> = [];
            for (let j = 0; j < 10; j++) {
              promises.push(
                cacheADocumentInTransaction(txn).next(docKey =>
                  queryCache.addMatchingKeys(
                    txn,
                    documentKeySet(docKey),
                    targetId
                  )
                )
              );
            }
            return PersistencePromise.waitFor(promises).next(() =>
              updateTargetInTransaction(txn, queryData)
            );
          });
        }
      );
    }

    // Nothing is marked live, so everything should be eligible for collection.
    const results = await persistence.runTransaction(
      'collect garbage',
      'readwrite-primary',
      txn => garbageCollector.collect(txn, {})
    );
    expect(results.sequenceNumbersCollected).to.equal(5);
  });
}
