/**
 * Copyright 2017 Google Inc.
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

import { Timestamp } from '../api/timestamp';
import { User } from '../auth/user';
import { Query } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { TargetIdGenerator } from '../core/target_id_generator';
import { BatchId, ProtoByteString, TargetId } from '../core/types';
import {
  DocumentKeySet,
  documentKeySet,
  DocumentMap,
  MaybeDocumentMap
} from '../model/collections';
import { MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import {
  BATCHID_UNKNOWN,
  MutationBatch,
  MutationBatchResult
} from '../model/mutation_batch';
import {
  RemoteEvent,
  ResetMapping,
  TargetChange,
  UpdateMapping
} from '../remote/remote_event';
import { assert, fail } from '../util/assert';
import * as log from '../util/log';
import * as objUtils from '../util/obj';

import { GarbageCollector } from './garbage_collector';
import { LocalDocumentsView } from './local_documents_view';
import { LocalViewChanges } from './local_view_changes';
import { MutationQueue } from './mutation_queue';
import { Persistence, PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { QueryCache } from './query_cache';
import { QueryData, QueryPurpose } from './query_data';
import { ReferenceSet } from './reference_set';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';

const LOG_TAG = 'LocalStore';

/** The result of a write to the local store. */
export interface LocalWriteResult {
  batchId: BatchId;
  changes: MaybeDocumentMap;
}

/**
 * Local storage in the Firestore client. Coordinates persistence components
 * like the mutation queue and remote document cache to present a
 * latency-compensated view of stored data.
 *
 * The LocalStore is responsible for accepting mutations from the Sync Engine.
 * Writes from the client are put into a queue as provisional Mutations until
 * they are processed by the RemoteStore and confirmed as having been written
 * to the server.
 *
 * The local store provides the local version of documents that have been
 * modified locally. It maintains the constraint:
 *
 *   LocalDocument = RemoteDocument + Active(LocalMutations)
 *
 * (Active mutations are those that are enqueued and have not been previously
 * acknowledged or rejected).
 *
 * The RemoteDocument ("ground truth") state is provided via the
 * applyChangeBatch method. It will be some version of a server-provided
 * document OR will be a server-provided document PLUS acknowledged mutations:
 *
 *   RemoteDocument' = RemoteDocument + Acknowledged(LocalMutations)
 *
 * Note that this "dirty" version of a RemoteDocument will not be identical to a
 * server base version, since it has LocalMutations added to it pending getting
 * an authoritative copy from the server.
 *
 * Since LocalMutations can be rejected by the server, we have to be able to
 * revert a LocalMutation that has already been applied to the LocalDocument
 * (typically done by replaying all remaining LocalMutations to the
 * RemoteDocument to re-apply).
 *
 * The LocalStore is responsible for the garbage collection of the documents it
 * contains. For now, it every doc referenced by a view, the mutation queue, or
 * the RemoteStore.
 *
 * It also maintains the persistence of mapping queries to resume tokens and
 * target ids. It needs to know this data about queries to properly know what
 * docs it would be allowed to garbage collect.
 *
 * The LocalStore must be able to efficiently execute queries against its local
 * cache of the documents, to provide the initial set of results before any
 * remote changes have been received.
 *
 * Note: In TypeScript, most methods return Promises since the implementation
 * may rely on fetching data from IndexedDB which is async.
 * These Promises will only be rejected on an I/O error or other internal
 * (unexpected) failure (e.g. failed assert) and always represent an
 * unrecoverable error (should be caught / reported by the async_queue).
 */
export class LocalStore {
  /**
   * The set of all mutations that have been sent but not yet been applied to
   * the backend.
   */
  private mutationQueue: MutationQueue;

  /** The set of all cached remote documents. */
  private remoteDocuments: RemoteDocumentCache;

  /**
   * The "local" view of all documents (layering mutationQueue on top of
   * remoteDocumentCache).
   */
  private localDocuments: LocalDocumentsView;

  /**
   * The set of document references maintained by any local views.
   */
  private localViewReferences = new ReferenceSet();

  /** Maps a query to the data about that query. */
  private queryCache: QueryCache;

  /** Maps a targetID to data about its query. */
  private targetIds = {} as { [targetId: number]: QueryData };

  /** Used to generate targetIDs for queries tracked locally. */
  private targetIdGenerator = TargetIdGenerator.forLocalStore();

  /**
   * A heldBatchResult is a mutation batch result (from a write acknowledgement)
   * that arrived before the watch stream got notified of a snapshot that
   * includes the write. So we "hold" it until the watch stream catches up. It
   * ensures that the local write remains visible (latency compensation) and
   * doesn't temporarily appear reverted because the watch stream is slower than
   * the write stream and so wasn't reflecting it.
   *
   * NOTE: Eventually we want to move this functionality into the remote store.
   */
  private heldBatchResults: MutationBatchResult[] = [];

  constructor(
    /** Manages our in-memory or durable persistence. */
    private persistence: Persistence,
    initialUser: User,
    /**
     * The garbage collector collects documents that should no longer be
     * cached (e.g. if they are no longer retained by the above reference sets
     * and the garbage collector is performing eager collection).
     */
    private garbageCollector: GarbageCollector
  ) {
    this.mutationQueue = persistence.getMutationQueue(initialUser);
    this.remoteDocuments = persistence.getRemoteDocumentCache();
    this.queryCache = persistence.getQueryCache();
    this.localDocuments = new LocalDocumentsView(
      this.remoteDocuments,
      this.mutationQueue
    );
    this.garbageCollector.addGarbageSource(this.localViewReferences);
    this.garbageCollector.addGarbageSource(this.queryCache);
    this.garbageCollector.addGarbageSource(this.mutationQueue);
  }

  /** Performs any initial startup actions required by the local store. */
  start(): Promise<void> {
    return this.persistence.runTransaction('Start LocalStore', txn => {
      return this.startMutationQueue(txn).next(() => this.startQueryCache(txn));
    });
  }

  /**
   * Tells the LocalStore that the currently authenticated user has changed.
   *
   * In response the local store switches the mutation queue to the new user and
   * returns any resulting document changes.
   */
  handleUserChange(user: User): Promise<MaybeDocumentMap> {
    return this.persistence.runTransaction('Handle user change', txn => {
      // Swap out the mutation queue, grabbing the pending mutation batches
      // before and after.
      let oldBatches: MutationBatch[];
      return this.mutationQueue
        .getAllMutationBatches(txn)
        .next(promisedOldBatches => {
          oldBatches = promisedOldBatches;

          this.garbageCollector.removeGarbageSource(this.mutationQueue);
          this.mutationQueue = this.persistence.getMutationQueue(user);
          this.garbageCollector.addGarbageSource(this.mutationQueue);
          return this.startMutationQueue(txn);
        })
        .next(() => {
          // Recreate our LocalDocumentsView using the new
          // MutationQueue.
          this.localDocuments = new LocalDocumentsView(
            this.remoteDocuments,
            this.mutationQueue
          );
          return this.mutationQueue.getAllMutationBatches(txn);
        })
        .next(newBatches => {
          // Union the old/new changed keys.
          let changedKeys = documentKeySet();
          for (const batches of [oldBatches, newBatches]) {
            for (const batch of batches) {
              for (const mutation of batch.mutations) {
                changedKeys = changedKeys.add(mutation.key);
              }
            }
          }

          // Return the set of all (potentially) changed documents as the
          // result of the user change.
          return this.localDocuments.getDocuments(txn, changedKeys);
        });
    });
  }

  private startQueryCache(
    txn: PersistenceTransaction
  ): PersistencePromise<void> {
    return this.queryCache.start(txn).next(() => {
      const targetId = this.queryCache.getHighestTargetId();
      this.targetIdGenerator = TargetIdGenerator.forLocalStore(targetId);
    });
  }

  private startMutationQueue(
    txn: PersistenceTransaction
  ): PersistencePromise<void> {
    return this.mutationQueue
      .start(txn)
      .next(() => {
        // If we have any leftover mutation batch results from a prior run,
        // just drop them.
        // TODO(http://b/33446471): We probably need to repopulate
        // heldBatchResults or similar instead, but that is not
        // straightforward since we're not persisting the write ack versions.
        this.heldBatchResults = [];
        return this.mutationQueue.getHighestAcknowledgedBatchId(txn);
      })
      .next(highestAck => {
        // TODO(mikelehen): This is the only usage of
        // getAllMutationBatchesThroughBatchId(). Consider removing it in
        // favor of a getAcknowledgedBatches() method.
        if (highestAck !== BATCHID_UNKNOWN) {
          return this.mutationQueue.getAllMutationBatchesThroughBatchId(
            txn,
            highestAck
          );
        } else {
          return PersistencePromise.resolve([]);
        }
      })
      .next(ackedBatches => {
        if (ackedBatches.length > 0) {
          return this.mutationQueue.removeMutationBatches(txn, ackedBatches);
        } else {
          return PersistencePromise.resolve();
        }
      });
  }

  /* Accept locally generated Mutations and commit them to storage. */
  localWrite(mutations: Mutation[]): Promise<LocalWriteResult> {
    return this.persistence.runTransaction('Locally write mutations', txn => {
      let batch: MutationBatch;
      const localWriteTime = Timestamp.now();
      return this.mutationQueue
        .addMutationBatch(txn, localWriteTime, mutations)
        .next(promisedBatch => {
          batch = promisedBatch;
          // TODO(koss): This is doing an N^2 update by replaying ALL the
          // mutations on each document (instead of just the ones added) in
          // this batch.
          const keys = batch.keys();
          return this.localDocuments.getDocuments(txn, keys);
        })
        .next((changedDocuments: MaybeDocumentMap) => {
          return { batchId: batch.batchId, changes: changedDocuments };
        });
    });
  }

  /**
   * Acknowledge the given batch.
   *
   * On the happy path when a batch is acknowledged, the local store will
   *
   *  + remove the batch from the mutation queue;
   *  + apply the changes to the remote document cache;
   *  + recalculate the latency compensated view implied by those changes (there
   *    may be mutations in the queue that affect the documents but haven't been
   *    acknowledged yet); and
   *  + give the changed documents back the sync engine
   *
   * @returns The resulting (modified) documents.
   */
  acknowledgeBatch(
    batchResult: MutationBatchResult
  ): Promise<MaybeDocumentMap> {
    return this.persistence.runTransaction('Acknowledge batch', txn => {
      let affected: DocumentKeySet;
      return this.mutationQueue
        .acknowledgeBatch(txn, batchResult.batch, batchResult.streamToken)
        .next(() => {
          if (this.shouldHoldBatchResult(batchResult.commitVersion)) {
            this.heldBatchResults.push(batchResult);
            affected = documentKeySet();
            return PersistencePromise.resolve();
          } else {
            const documentBuffer = new RemoteDocumentChangeBuffer(
              this.remoteDocuments
            );
            return this.releaseBatchResults(
              txn,
              [batchResult],
              documentBuffer
            ).next(promisedAffectedKeys => {
              affected = promisedAffectedKeys;
              return documentBuffer.apply(txn);
            });
          }
        })
        .next(() => {
          return this.mutationQueue.performConsistencyCheck(txn);
        })
        .next(() => {
          return this.localDocuments.getDocuments(txn, affected);
        });
    });
  }

  /**
   * Remove mutations from the MutationQueue for the specified batch;
   * LocalDocuments will be recalculated.
   *
   * @returns The resulting modified documents.
   */
  rejectBatch(batchId: BatchId): Promise<MaybeDocumentMap> {
    return this.persistence.runTransaction('Reject batch', txn => {
      let toReject: MutationBatch;
      let affectedKeys: DocumentKeySet;
      return this.mutationQueue
        .lookupMutationBatch(txn, batchId)
        .next((promisedToReject: MutationBatch | null) => {
          assert(
            promisedToReject != null,
            'Attempt to reject nonexistent batch!'
          );
          toReject = promisedToReject!;

          return this.mutationQueue
            .getHighestAcknowledgedBatchId(txn)
            .next(lastAcked => {
              assert(
                batchId > lastAcked,
                "Acknowledged batches can't be rejected."
              );
              return toReject;
            });
        })
        .next(() => {
          return this.removeMutationBatch(txn, toReject);
        })
        .next(promisedAffectedKeys => {
          affectedKeys = promisedAffectedKeys;
          return this.mutationQueue.performConsistencyCheck(txn);
        })
        .next(() => {
          return this.localDocuments.getDocuments(txn, affectedKeys);
        });
    });
  }

  /** Returns the last recorded stream token for the current user. */
  getLastStreamToken(): Promise<ProtoByteString> {
    return this.persistence.runTransaction('Get last stream token', txn => {
      return this.mutationQueue.getLastStreamToken(txn);
    });
  }

  /**
   * Sets the stream token for the current user without acknowledging any
   * mutation batch. This is usually only useful after a stream handshake or in
   * response to an error that requires clearing the stream token.
   */
  setLastStreamToken(streamToken: ProtoByteString): Promise<void> {
    return this.persistence.runTransaction('Set last stream token', txn => {
      return this.mutationQueue.setLastStreamToken(txn, streamToken);
    });
  }

  /**
   * Returns the last consistent snapshot processed (used by the RemoteStore to
   * determine whether to buffer incoming snapshots from the backend).
   */
  getLastRemoteSnapshotVersion(): SnapshotVersion {
    return this.queryCache.getLastRemoteSnapshotVersion();
  }

  /**
   * Update the "ground-state" (remote) documents. We assume that the remote
   * event reflects any write batches that have been acknowledged or rejected
   * (i.e. we do not re-apply local mutations to updates from this event).
   *
   * LocalDocuments are re-calculated if there are remaining mutations in the
   * queue.
   */
  applyRemoteEvent(remoteEvent: RemoteEvent): Promise<MaybeDocumentMap> {
    const documentBuffer = new RemoteDocumentChangeBuffer(this.remoteDocuments);
    return this.persistence.runTransaction('Apply remote event', txn => {
      const promises = [] as Array<PersistencePromise<void>>;
      objUtils.forEachNumber(
        remoteEvent.targetChanges,
        (targetId: TargetId, change: TargetChange) => {
          // Do not ref/unref unassigned targetIds - it may lead to leaks.
          let queryData = this.targetIds[targetId];
          if (!queryData) return;

          const mapping: UpdateMapping | ResetMapping = change.mapping;
          if (mapping) {
            // First make sure that all references are deleted
            if (mapping instanceof ResetMapping) {
              promises.push(
                this.queryCache
                  .removeMatchingKeysForTargetId(txn, targetId)
                  .next(() => {
                    return this.queryCache.addMatchingKeys(
                      txn,
                      mapping.documents,
                      targetId
                    );
                  })
              );
            } else if (mapping instanceof UpdateMapping) {
              promises.push(
                this.queryCache
                  .removeMatchingKeys(txn, mapping.removedDocuments, targetId)
                  .next(() => {
                    return this.queryCache.addMatchingKeys(
                      txn,
                      mapping.addedDocuments,
                      targetId
                    );
                  })
              );
            } else {
              return fail('Unknown mapping type: ' + JSON.stringify(mapping));
            }
          }

          // Update the resume token if the change includes one. Don't clear
          // any preexisting value.
          const resumeToken = change.resumeToken;
          if (resumeToken.length > 0) {
            queryData = queryData.update({
              resumeToken,
              snapshotVersion: change.snapshotVersion
            });
            this.targetIds[targetId] = queryData;
            promises.push(this.queryCache.updateQueryData(txn, queryData));
          }
        }
      );

      let changedDocKeys = documentKeySet();
      remoteEvent.documentUpdates.forEach((key, doc) => {
        changedDocKeys = changedDocKeys.add(key);
        promises.push(
          documentBuffer.getEntry(txn, key).next(existingDoc => {
            // Make sure we don't apply an old document version to the remote
            // cache, though we make an exception for SnapshotVersion.MIN which
            // can happen for manufactured events (e.g. in the case of a limbo
            // document resolution failing).
            if (
              existingDoc == null ||
              doc.version.isEqual(SnapshotVersion.MIN) ||
              doc.version.compareTo(existingDoc.version) >= 0
            ) {
              documentBuffer.addEntry(doc);
            } else {
              log.debug(
                LOG_TAG,
                'Ignoring outdated watch update for ',
                key,
                '. Current version:',
                existingDoc.version,
                ' Watch version:',
                doc.version
              );
            }

            // The document might be garbage because it was unreferenced by
            // everything. Make sure to mark it as garbage if it is...
            this.garbageCollector.addPotentialGarbageKey(key);
          })
        );
      });

      // HACK: The only reason we allow a null snapshot version is so that we
      // can synthesize remote events when we get permission denied errors while
      // trying to resolve the state of a locally cached document that is in
      // limbo.
      const lastRemoteVersion = this.queryCache.getLastRemoteSnapshotVersion();
      const remoteVersion = remoteEvent.snapshotVersion;
      if (!remoteVersion.isEqual(SnapshotVersion.MIN)) {
        assert(
          remoteVersion.compareTo(lastRemoteVersion) >= 0,
          'Watch stream reverted to previous snapshot?? ' +
            remoteVersion +
            ' < ' +
            lastRemoteVersion
        );
        promises.push(
          this.queryCache.setLastRemoteSnapshotVersion(txn, remoteVersion)
        );
      }

      let releasedWriteKeys: DocumentKeySet;
      return PersistencePromise.waitFor(promises)
        .next(() => this.releaseHeldBatchResults(txn, documentBuffer))
        .next(promisedReleasedWriteKeys => {
          releasedWriteKeys = promisedReleasedWriteKeys;
          return documentBuffer.apply(txn);
        })
        .next(() => {
          return this.localDocuments.getDocuments(
            txn,
            changedDocKeys.unionWith(releasedWriteKeys)
          );
        });
    });
  }

  /**
   * Notify local store of the changed views to locally pin documents.
   */
  notifyLocalViewChanges(viewChanges: LocalViewChanges[]): Promise<void> {
    return this.persistence.runTransaction('Notify local view changes', txn => {
      const promises = [] as Array<PersistencePromise<void>>;
      for (const view of viewChanges) {
        promises.push(
          this.queryCache
            .getQueryData(txn, view.query)
            .next((queryData: QueryData | null) => {
              assert(
                queryData !== null,
                'Local view changes contain unallocated query.'
              );
              const targetId = queryData!.targetId;
              this.localViewReferences.addReferences(view.addedKeys, targetId);
              this.localViewReferences.removeReferences(
                view.removedKeys,
                targetId
              );
            })
        );
      }
      return PersistencePromise.waitFor(promises);
    });
  }

  /**
   * Gets the mutation batch after the passed in batchId in the mutation queue
   * or null if empty.
   * @param afterBatchId If provided, the batch to search after.
   * @returns The next mutation or null if there wasn't one.
   */
  nextMutationBatch(afterBatchId?: BatchId): Promise<MutationBatch | null> {
    return this.persistence.runTransaction('Get next mutation batch', txn => {
      if (afterBatchId === undefined) {
        afterBatchId = BATCHID_UNKNOWN;
      }
      return this.mutationQueue.getNextMutationBatchAfterBatchId(
        txn,
        afterBatchId
      );
    });
  }

  /**
   * Read the current value of a Document with a given key or null if not
   * found - used for testing.
   */
  readDocument(key: DocumentKey): Promise<MaybeDocument | null> {
    return this.persistence.runTransaction('read document', txn => {
      return this.localDocuments.getDocument(txn, key);
    });
  }

  /**
   * Assigns the given query an internal ID so that its results can be pinned so
   * they don't get GC'd. A query must be allocated in the local store before
   * the store can be used to manage its view.
   */
  allocateQuery(query: Query): Promise<QueryData> {
    return this.persistence.runTransaction('Allocate query', txn => {
      let queryData: QueryData;
      return this.queryCache
        .getQueryData(txn, query)
        .next((cached: QueryData | null) => {
          if (cached) {
            // This query has been listened to previously, so reuse the
            // previous targetID.
            // TODO(mcg): freshen last accessed date?
            queryData = cached;
            return PersistencePromise.resolve();
          } else {
            const targetId = this.targetIdGenerator.next();
            queryData = new QueryData(query, targetId, QueryPurpose.Listen);
            return this.queryCache.addQueryData(txn, queryData);
          }
        })
        .next(() => {
          assert(
            !this.targetIds[queryData.targetId],
            'Tried to allocate an already allocated query: ' + query
          );
          this.targetIds[queryData.targetId] = queryData;
          return queryData;
        });
    });
  }

  /** Unpin all the documents associated with the given query. */
  releaseQuery(query: Query): Promise<void> {
    return this.persistence.runTransaction('Release query', txn => {
      return this.queryCache
        .getQueryData(txn, query)
        .next((queryData: QueryData | null) => {
          assert(
            queryData != null,
            'Tried to release nonexistent query: ' + query
          );
          this.localViewReferences.removeReferencesForId(queryData!.targetId);
          delete this.targetIds[queryData!.targetId];
          if (this.garbageCollector.isEager) {
            return this.queryCache.removeQueryData(txn, queryData!);
          } else {
            return PersistencePromise.resolve();
          }
        })
        .next(() => {
          // If this was the last watch target, then we won't get any more
          // watch snapshots, so we should release any held batch results.
          if (objUtils.isEmpty(this.targetIds)) {
            const documentBuffer = new RemoteDocumentChangeBuffer(
              this.remoteDocuments
            );
            return this.releaseHeldBatchResults(txn, documentBuffer).next(
              () => {
                documentBuffer.apply(txn);
              }
            );
          } else {
            return PersistencePromise.resolve();
          }
        });
    });
  }

  /**
   * Runs the specified query against all the documents in the local store and
   * returns the results.
   */
  executeQuery(query: Query): Promise<DocumentMap> {
    return this.persistence.runTransaction('Execute query', txn => {
      return this.localDocuments.getDocumentsMatchingQuery(txn, query);
    });
  }

  /**
   * Returns the keys of the documents that are associated with the given
   * target id in the remote table.
   */
  remoteDocumentKeys(targetId: TargetId): Promise<DocumentKeySet> {
    return this.persistence.runTransaction('Remote document keys', txn => {
      return this.queryCache.getMatchingKeysForTargetId(txn, targetId);
    });
  }

  /**
   * Collect garbage if necessary.
   * Should be called periodically by Sync Engine to recover resources. The
   * implementation must guarantee that GC won't happen in other places than
   * this method call.
   */
  collectGarbage(): Promise<void> {
    // Call collectGarbage regardless of whether isGCEnabled so the referenceSet
    // doesn't continue to accumulate the garbage keys.
    return this.persistence.runTransaction('Garbage collection', txn => {
      return this.garbageCollector.collectGarbage(txn).next(garbage => {
        const promises = [] as Array<PersistencePromise<void>>;
        garbage.forEach(key => {
          promises.push(this.remoteDocuments.removeEntry(txn, key));
        });
        return PersistencePromise.waitFor(promises);
      });
    });
  }

  private releaseHeldBatchResults(
    txn: PersistenceTransaction,
    documentBuffer: RemoteDocumentChangeBuffer
  ): PersistencePromise<DocumentKeySet> {
    const toRelease: MutationBatchResult[] = [];
    for (const batchResult of this.heldBatchResults) {
      if (!this.isRemoteUpToVersion(batchResult.commitVersion)) {
        break;
      }
      toRelease.push(batchResult);
    }

    if (toRelease.length === 0) {
      return PersistencePromise.resolve(documentKeySet());
    } else {
      this.heldBatchResults.splice(0, toRelease.length);
      return this.releaseBatchResults(txn, toRelease, documentBuffer);
    }
  }

  private isRemoteUpToVersion(version: SnapshotVersion): boolean {
    // If there are no watch targets, then we won't get remote snapshots, and
    // we are always "up-to-date."
    const lastRemoteVersion = this.queryCache.getLastRemoteSnapshotVersion();
    return (
      version.compareTo(lastRemoteVersion) <= 0 ||
      objUtils.isEmpty(this.targetIds)
    );
  }

  private shouldHoldBatchResult(version: SnapshotVersion): boolean {
    // Check if watcher isn't up to date or prior results are already held.
    return (
      !this.isRemoteUpToVersion(version) || this.heldBatchResults.length > 0
    );
  }

  private releaseBatchResults(
    txn: PersistenceTransaction,
    batchResults: MutationBatchResult[],
    documentBuffer: RemoteDocumentChangeBuffer
  ): PersistencePromise<DocumentKeySet> {
    let promiseChain = PersistencePromise.resolve();
    for (const batchResult of batchResults) {
      promiseChain = promiseChain.next(() =>
        this.applyWriteToRemoteDocuments(txn, batchResult, documentBuffer)
      );
    }
    return promiseChain.next(() => {
      return this.removeMutationBatches(
        txn,
        batchResults.map(result => result.batch)
      );
    });
  }

  private removeMutationBatch(
    txn: PersistenceTransaction,
    batch: MutationBatch
  ): PersistencePromise<DocumentKeySet> {
    return this.removeMutationBatches(txn, [batch]);
  }

  /** Removes all the mutation batches named in the given array. */
  private removeMutationBatches(
    txn: PersistenceTransaction,
    batches: MutationBatch[]
  ): PersistencePromise<DocumentKeySet> {
    let affectedDocs = documentKeySet();
    for (const batch of batches) {
      for (const mutation of batch.mutations) {
        const key = mutation.key;
        affectedDocs = affectedDocs.add(key);
      }
    }

    return this.mutationQueue
      .removeMutationBatches(txn, batches)
      .next(() => affectedDocs);
  }

  private applyWriteToRemoteDocuments(
    txn: PersistenceTransaction,
    batchResult: MutationBatchResult,
    documentBuffer: RemoteDocumentChangeBuffer
  ): PersistencePromise<void> {
    const batch = batchResult.batch;
    const docKeys = batch.keys();
    let promiseChain = PersistencePromise.resolve();
    docKeys.forEach(docKey => {
      promiseChain = promiseChain
        .next(() => {
          return documentBuffer.getEntry(txn, docKey);
        })
        .next((remoteDoc: MaybeDocument | null) => {
          let doc = remoteDoc;
          const ackVersion = batchResult.docVersions.get(docKey);
          assert(
            ackVersion !== null,
            'ackVersions should contain every doc in the write.'
          );
          if (!doc || doc.version.compareTo(ackVersion!) < 0) {
            doc = batch.applyToRemoteDocument(docKey, doc, batchResult);
            if (!doc) {
              assert(
                !remoteDoc,
                'Mutation batch ' +
                  batch +
                  ' applied to document ' +
                  remoteDoc +
                  ' resulted in null'
              );
            } else {
              documentBuffer.addEntry(doc);
            }
          }
        });
    });
    return promiseChain;
  }
}
