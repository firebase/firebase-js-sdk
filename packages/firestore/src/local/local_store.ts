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

import { Timestamp } from '../api/timestamp';
import { User } from '../auth/user';
import { Query, queryToTarget } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { canonifyTarget, Target, targetEquals } from '../core/target';
import { BatchId, TargetId } from '../core/types';
import {
  DocumentKeySet,
  documentKeySet,
  DocumentMap,
  maybeDocumentMap,
  MaybeDocumentMap
} from '../model/collections';
import { MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  Mutation,
  PatchMutation,
  Precondition,
  extractMutationBaseValue
} from '../model/mutation';
import {
  BATCHID_UNKNOWN,
  MutationBatch,
  MutationBatchResult
} from '../model/mutation_batch';
import { RemoteEvent, TargetChange } from '../remote/remote_event';
import { debugAssert, debugCast, hardAssert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { logDebug } from '../util/log';
import { primitiveComparator } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { SortedMap } from '../util/sorted_map';

import { LocalDocumentsView } from './local_documents_view';
import { LocalViewChanges } from './local_view_changes';
import { LruGarbageCollector, LruResults } from './lru_garbage_collector';
import { MutationQueue } from './mutation_queue';
import {
  Persistence,
  PersistenceTransaction,
  PRIMARY_LEASE_LOST_ERROR_MSG
} from './persistence';
import { PersistencePromise } from './persistence_promise';
import { TargetCache } from './target_cache';
import { QueryEngine } from './query_engine';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';
import { ClientId } from './shared_client_state';
import { TargetData, TargetPurpose } from './target_data';
import { IndexedDbPersistence } from './indexeddb_persistence';
import { IndexedDbMutationQueue } from './indexeddb_mutation_queue';
import { IndexedDbRemoteDocumentCache } from './indexeddb_remote_document_cache';
import { IndexedDbTargetCache } from './indexeddb_target_cache';
import { extractFieldMask } from '../model/object_value';
import { isIndexedDbTransactionError } from './simple_db';

const LOG_TAG = 'LocalStore';

/** The result of a write to the local store. */
export interface LocalWriteResult {
  batchId: BatchId;
  changes: MaybeDocumentMap;
}

/** The result of a user-change operation in the local store. */
export interface UserChangeResult {
  readonly affectedDocuments: MaybeDocumentMap;
  readonly removedBatchIds: BatchId[];
  readonly addedBatchIds: BatchId[];
}

/** The result of executing a query against the local store. */
export interface QueryResult {
  readonly documents: DocumentMap;
  readonly remoteKeys: DocumentKeySet;
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
export interface LocalStore {
  /**
   * Tells the LocalStore that the currently authenticated user has changed.
   *
   * In response the local store switches the mutation queue to the new user and
   * returns any resulting document changes.
   */
  // PORTING NOTE: Android and iOS only return the documents affected by the
  // change.
  handleUserChange(user: User): Promise<UserChangeResult>;

  /* Accept locally generated Mutations and commit them to storage. */
  localWrite(mutations: Mutation[]): Promise<LocalWriteResult>;

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
  acknowledgeBatch(batchResult: MutationBatchResult): Promise<MaybeDocumentMap>;

  /**
   * Remove mutations from the MutationQueue for the specified batch;
   * LocalDocuments will be recalculated.
   *
   * @returns The resulting modified documents.
   */
  rejectBatch(batchId: BatchId): Promise<MaybeDocumentMap>;

  /**
   * Returns the largest (latest) batch id in mutation queue that is pending
   * server response.
   *
   * Returns `BATCHID_UNKNOWN` if the queue is empty.
   */
  getHighestUnacknowledgedBatchId(): Promise<BatchId>;

  /**
   * Returns the last consistent snapshot processed (used by the RemoteStore to
   * determine whether to buffer incoming snapshots from the backend).
   */
  getLastRemoteSnapshotVersion(): Promise<SnapshotVersion>;

  /**
   * Update the "ground-state" (remote) documents. We assume that the remote
   * event reflects any write batches that have been acknowledged or rejected
   * (i.e. we do not re-apply local mutations to updates from this event).
   *
   * LocalDocuments are re-calculated if there are remaining mutations in the
   * queue.
   */
  applyRemoteEvent(remoteEvent: RemoteEvent): Promise<MaybeDocumentMap>;

  /**
   * Notify local store of the changed views to locally pin documents.
   */
  notifyLocalViewChanges(viewChanges: LocalViewChanges[]): Promise<void>;

  /**
   * Gets the mutation batch after the passed in batchId in the mutation queue
   * or null if empty.
   * @param afterBatchId If provided, the batch to search after.
   * @returns The next mutation or null if there wasn't one.
   */
  nextMutationBatch(afterBatchId?: BatchId): Promise<MutationBatch | null>;

  /**
   * Read the current value of a Document with a given key or null if not
   * found - used for testing.
   */
  readDocument(key: DocumentKey): Promise<MaybeDocument | null>;

  /**
   * Assigns the given target an internal ID so that its results can be pinned so
   * they don't get GC'd. A target must be allocated in the local store before
   * the store can be used to manage its view.
   *
   * Allocating an already allocated `Target` will return the existing `TargetData`
   * for that `Target`.
   */
  allocateTarget(target: Target): Promise<TargetData>;

  /**
   * Returns the TargetData as seen by the LocalStore, including updates that may
   * have not yet been persisted to the TargetCache.
   */
  // Visible for testing.
  getTargetData(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<TargetData | null>;

  /**
   * Unpin all the documents associated with the given target. If
   * `keepPersistedTargetData` is set to false and Eager GC enabled, the method
   * directly removes the associated target data from the target cache.
   *
   * Releasing a non-existing `Target` is a no-op.
   */
  // PORTING NOTE: `keepPersistedTargetData` is multi-tab only.
  releaseTarget(
    targetId: number,
    keepPersistedTargetData: boolean
  ): Promise<void>;

  /**
   * Runs the specified query against the local store and returns the results,
   * potentially taking advantage of query data from previous executions (such
   * as the set of remote keys).
   *
   * @param usePreviousResults Whether results from previous executions can
   * be used to optimize this query execution.
   */
  executeQuery(query: Query, usePreviousResults: boolean): Promise<QueryResult>;

  collectGarbage(garbageCollector: LruGarbageCollector): Promise<LruResults>;
}

/**
 * Implements `LocalStore` interface.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */
class LocalStoreImpl implements LocalStore {
  /**
   * The maximum time to leave a resume token buffered without writing it out.
   * This value is arbitrary: it's long enough to avoid several writes
   * (possibly indefinitely if updates come more frequently than this) but
   * short enough that restarting after crashing will still have a pretty
   * recent resume token.
   */
  private static readonly RESUME_TOKEN_MAX_AGE_MICROS = 5 * 60 * 1e6;

  /**
   * The set of all mutations that have been sent but not yet been applied to
   * the backend.
   */
  mutationQueue: MutationQueue;

  /** The set of all cached remote documents. */
  remoteDocuments: RemoteDocumentCache;

  /**
   * The "local" view of all documents (layering mutationQueue on top of
   * remoteDocumentCache).
   */
  localDocuments!: LocalDocumentsView;

  /** Maps a target to its `TargetData`. */
  targetCache: TargetCache;

  /**
   * Maps a targetID to data about its target.
   *
   * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
   * of `applyRemoteEvent()` idempotent.
   */
  targetDataByTarget = new SortedMap<TargetId, TargetData>(primitiveComparator);

  /** Maps a target to its targetID. */
  // TODO(wuandy): Evaluate if TargetId can be part of Target.
  private targetIdByTarget = new ObjectMap<Target, TargetId>(
    q => "",() => true
  );

  /**
   * The read time of the last entry processed by `getNewDocumentChanges()`.
   *
   * PORTING NOTE: This is only used for multi-tab synchronization.
   */
  lastDocumentChangeReadTime = SnapshotVersion.min();

  constructor(
    /** Manages our in-memory or durable persistence. */
    readonly persistence: Persistence,
    private queryEngine: QueryEngine,
    initialUser: User
  ) {
    debugAssert(
      persistence.started,
      'LocalStore was passed an unstarted persistence implementation'
    );
    this.mutationQueue = persistence.getMutationQueue(initialUser);
    this.remoteDocuments = persistence.getRemoteDocumentCache();
    this.targetCache = persistence.getTargetCache();
    // this.localDocuments = new LocalDocumentsView(
    //   this.remoteDocuments,
    //   this.mutationQueue,
    //   this.persistence.getIndexManager()
    // );
    // this.queryEngine.setLocalDocumentsView(this.localDocuments);
  }

  async handleUserChange(user: User): Promise<UserChangeResult> {
    let newMutationQueue = this.mutationQueue;
    let newLocalDocuments = this.localDocuments;

    const result = await this.persistence.runTransaction(
      'Handle user change',
      'readonly',
      txn => {
        // Swap out the mutation queue, grabbing the pending mutation batches
        // before and after.
        let oldBatches: MutationBatch[];
        return this.mutationQueue
          .getAllMutationBatches(txn)
          .next(promisedOldBatches => {
            oldBatches = promisedOldBatches;

            newMutationQueue = this.persistence.getMutationQueue(user);

            // Recreate our LocalDocumentsView using the new
            // MutationQueue.
            // newLocalDocuments = new LocalDocumentsView(
            //   this.remoteDocuments,
            //   newMutationQueue,
            //   this.persistence.getIndexManager()
            // );
            return newMutationQueue.getAllMutationBatches(txn);
          })
          .next(newBatches => {
            const removedBatchIds: BatchId[] = [];
            const addedBatchIds: BatchId[] = [];

            // Union the old/new changed keys.
            let changedKeys = documentKeySet();

            for (const batch of oldBatches) {
              removedBatchIds.push(batch.batchId);
              for (const mutation of batch.mutations) {
                changedKeys = changedKeys.add(mutation.key);
              }
            }

            for (const batch of newBatches) {
              addedBatchIds.push(batch.batchId);
              for (const mutation of batch.mutations) {
                changedKeys = changedKeys.add(mutation.key);
              }
            }

            // Return the set of all (potentially) changed documents and the list
            // of mutation batch IDs that were affected by change.
            return newLocalDocuments
              .getDocuments(txn, changedKeys)
              .next(affectedDocuments => {
                return {
                  affectedDocuments,
                  removedBatchIds,
                  addedBatchIds
                };
              });
          });
      }
    );

    this.mutationQueue = newMutationQueue;
    this.localDocuments = newLocalDocuments;
    this.queryEngine.setLocalDocumentsView(this.localDocuments);

    return result;
  }

  localWrite(mutations: Mutation[]): Promise<LocalWriteResult> {
    const localWriteTime = Timestamp.now();
    const keys = mutations.reduce(
      (keys, m) => keys.add(m.key),
      documentKeySet()
    );

    let existingDocs: MaybeDocumentMap;

    return this.persistence
      .runTransaction('Locally write mutations', 'readwrite', txn => {
        // Load and apply all existing mutations. This lets us compute the
        // current base state for all non-idempotent transforms before applying
        // any additional user-provided writes.
        return this.localDocuments.getDocuments(txn, keys).next(docs => {
          existingDocs = docs;

          // For non-idempotent mutations (such as `FieldValue.increment()`),
          // we record the base state in a separate patch mutation. This is
          // later used to guarantee consistent values and prevents flicker
          // even if the backend sends us an update that already includes our
          // transform.
          const baseMutations: Mutation[] = [];

          for (const mutation of mutations) {
            const baseValue = extractMutationBaseValue(
              mutation,
              existingDocs.get(mutation.key)
            );
            if (baseValue != null) {
              // NOTE: The base state should only be applied if there's some
              // existing document to override, so use a Precondition of
              // exists=true
              baseMutations.push(
                new PatchMutation(
                  mutation.key,
                  baseValue,
                  extractFieldMask(baseValue.proto.mapValue!),
                  Precondition.exists(true)
                )
              );
            }
          }

          return this.mutationQueue.addMutationBatch(
            txn,
            localWriteTime,
            baseMutations,
            mutations
          );
        });
      })
      .then(batch => {
        const changes = batch.applyToLocalDocumentSet(existingDocs);
        return { batchId: batch.batchId, changes };
      });
  }

  acknowledgeBatch(
    batchResult: MutationBatchResult
  ): Promise<MaybeDocumentMap> {
    return this.persistence.runTransaction(
      'Acknowledge batch',
      'readwrite-primary',
      txn => {
        const affected = batchResult.batch.keys();
        const documentBuffer = this.remoteDocuments.newChangeBuffer({
          trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
        });
        return this.applyWriteToRemoteDocuments(
          txn,
          batchResult,
          documentBuffer
        )
          .next(() => documentBuffer.apply(txn))
          .next(() => this.mutationQueue.performConsistencyCheck(txn))
          .next(() => this.localDocuments.getDocuments(txn, affected));
      }
    );
  }

  rejectBatch(batchId: BatchId): Promise<MaybeDocumentMap> {
    return this.persistence.runTransaction(
      'Reject batch',
      'readwrite-primary',
      txn => {
        let affectedKeys: DocumentKeySet;
        return this.mutationQueue
          .lookupMutationBatch(txn, batchId)
          .next((batch: MutationBatch | null) => {
            hardAssert(batch !== null, 'Attempt to reject nonexistent batch!');
            affectedKeys = batch.keys();
            return this.mutationQueue.removeMutationBatch(txn, batch);
          })
          .next(() => {
            return this.mutationQueue.performConsistencyCheck(txn);
          })
          .next(() => {
            return this.localDocuments.getDocuments(txn, affectedKeys);
          });
      }
    );
  }

  getHighestUnacknowledgedBatchId(): Promise<BatchId> {
    return this.persistence.runTransaction(
      'Get highest unacknowledged batch id',
      'readonly',
      txn => {
        return this.mutationQueue.getHighestUnacknowledgedBatchId(txn);
      }
    );
  }

  getLastRemoteSnapshotVersion(): Promise<SnapshotVersion> {
    return this.persistence.runTransaction(
      'Get last remote snapshot version',
      'readonly',
      txn => this.targetCache.getLastRemoteSnapshotVersion(txn)
    );
  }

  applyRemoteEvent(remoteEvent: RemoteEvent): Promise<MaybeDocumentMap> {
    return null as any;
    // const remoteVersion = remoteEvent.snapshotVersion;
    // let newTargetDataByTargetMap = this.targetDataByTarget;
    //
    // return this.persistence
    //   .runTransaction('Apply remote event', 'readwrite-primary', txn => {
    //     const documentBuffer = this.remoteDocuments.newChangeBuffer({
    //       trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
    //     });
    //
    //     // Reset newTargetDataByTargetMap in case this transaction gets re-run.
    //     newTargetDataByTargetMap = this.targetDataByTarget;
    //
    //     const promises = [] as Array<PersistencePromise<void>>;
    //     remoteEvent.targetChanges.forEach((change, targetId) => {
    //       const oldTargetData = newTargetDataByTargetMap.get(targetId);
    //       if (!oldTargetData) {
    //         return;
    //       }
    //
    //       // Only update the remote keys if the target is still active. This
    //       // ensures that we can persist the updated target data along with
    //       // the updated assignment.
    //       promises.push(
    //         this.targetCache
    //           .removeMatchingKeys(txn, change.removedDocuments, targetId)
    //           .next(() => {
    //             return this.targetCache.addMatchingKeys(
    //               txn,
    //               change.addedDocuments,
    //               targetId
    //             );
    //           })
    //       );
    //
    //       const resumeToken = change.resumeToken;
    //       // Update the resume token if the change includes one.
    //       if (resumeToken.approximateByteSize() > 0) {
    //         const newTargetData = oldTargetData
    //           .withResumeToken(resumeToken, remoteVersion)
    //           .withSequenceNumber(txn.currentSequenceNumber);
    //         newTargetDataByTargetMap = newTargetDataByTargetMap.insert(
    //           targetId,
    //           newTargetData
    //         );
    //
    //         // Update the target data if there are target changes (or if
    //         // sufficient time has passed since the last update).
    //         if (
    //           LocalStoreImpl.shouldPersistTargetData(
    //             oldTargetData,
    //             newTargetData,
    //             change
    //           )
    //         ) {
    //           promises.push(
    //             this.targetCache.updateTargetData(txn, newTargetData)
    //           );
    //         }
    //       }
    //     });
    //
    //     let changedDocs = maybeDocumentMap();
    //     let updatedKeys = documentKeySet();
    //     remoteEvent.documentUpdates.forEach((key, doc) => {
    //       updatedKeys = updatedKeys.add(key);
    //     });
    //
    //     // Each loop iteration only affects its "own" doc, so it's safe to get all the remote
    //     // documents in advance in a single call.
    //     promises.push(
    //       documentBuffer.getEntries(txn, updatedKeys).next(existingDocs => {
    //         remoteEvent.documentUpdates.forEach((key, doc) => {
    //           const existingDoc = existingDocs.get(key);
    //
    //           // Note: The order of the steps below is important, since we want
    //           // to ensure that rejected limbo resolutions (which fabricate
    //           // NoDocuments with SnapshotVersion.min()) never add documents to
    //           // cache.
    //           if (
    //             doc instanceof NoDocument &&
    //             doc.version.isEqual(SnapshotVersion.min())
    //           ) {
    //             // NoDocuments with SnapshotVersion.min() are used in manufactured
    //             // events. We remove these documents from cache since we lost
    //             // access.
    //             documentBuffer.removeEntry(key, remoteVersion);
    //             changedDocs = changedDocs.insert(key, doc);
    //           } else if (
    //             existingDoc == null ||
    //             doc.version.compareTo(existingDoc.version) > 0 ||
    //             (doc.version.compareTo(existingDoc.version) === 0 &&
    //               existingDoc.hasPendingWrites)
    //           ) {
    //             debugAssert(
    //               !SnapshotVersion.min().isEqual(remoteVersion),
    //               'Cannot add a document when the remote version is zero'
    //             );
    //             documentBuffer.addEntry(doc, remoteVersion);
    //             changedDocs = changedDocs.insert(key, doc);
    //           } else {
    //             logDebug(
    //               LOG_TAG,
    //               'Ignoring outdated watch update for ',
    //               key,
    //               '. Current version:',
    //               existingDoc.version,
    //               ' Watch version:',
    //               doc.version
    //             );
    //           }
    //
    //           if (remoteEvent.resolvedLimboDocuments.has(key)) {
    //             promises.push(
    //               this.persistence.referenceDelegate.updateLimboDocument(
    //                 txn,
    //                 key
    //               )
    //             );
    //           }
    //         });
    //       })
    //     );
    //
    //     // HACK: The only reason we allow a null snapshot version is so that we
    //     // can synthesize remote events when we get permission denied errors while
    //     // trying to resolve the state of a locally cached document that is in
    //     // limbo.
    //     if (!remoteVersion.isEqual(SnapshotVersion.min())) {
    //       const updateRemoteVersion = this.targetCache
    //         .getLastRemoteSnapshotVersion(txn)
    //         .next(lastRemoteSnapshotVersion => {
    //           debugAssert(
    //             remoteVersion.compareTo(lastRemoteSnapshotVersion) >= 0,
    //             'Watch stream reverted to previous snapshot?? ' +
    //               remoteVersion +
    //               ' < ' +
    //               lastRemoteSnapshotVersion
    //           );
    //           return this.targetCache.setTargetsMetadata(
    //             txn,
    //             txn.currentSequenceNumber,
    //             remoteVersion
    //           );
    //         });
    //       promises.push(updateRemoteVersion);
    //     }
    //
    //     return PersistencePromise.waitFor(promises)
    //       .next(() => documentBuffer.apply(txn))
    //       .next(() => {
    //         return this.localDocuments.getLocalViewOfDocuments(
    //           txn,
    //           changedDocs
    //         );
    //       });
    //   })
    //   .then(changedDocs => {
    //     this.targetDataByTarget = newTargetDataByTargetMap;
    //     return changedDocs;
    //   });
  }

  /**
   * Returns true if the newTargetData should be persisted during an update of
   * an active target. TargetData should always be persisted when a target is
   * being released and should not call this function.
   *
   * While the target is active, TargetData updates can be omitted when nothing
   * about the target has changed except metadata like the resume token or
   * snapshot version. Occasionally it's worth the extra write to prevent these
   * values from getting too stale after a crash, but this doesn't have to be
   * too frequent.
   */
  private static shouldPersistTargetData(
    oldTargetData: TargetData,
    newTargetData: TargetData,
    change: TargetChange
  ): boolean {
    hardAssert(
      newTargetData.resumeToken.approximateByteSize() > 0,
      'Attempted to persist target data with no resume token'
    );

    // Always persist target data if we don't already have a resume token.
    if (oldTargetData.resumeToken.approximateByteSize() === 0) {
      return true;
    }

    // Don't allow resume token changes to be buffered indefinitely. This
    // allows us to be reasonably up-to-date after a crash and avoids needing
    // to loop over all active queries on shutdown. Especially in the browser
    // we may not get time to do anything interesting while the current tab is
    // closing.
    const timeDelta =
      newTargetData.snapshotVersion.toMicroseconds() -
      oldTargetData.snapshotVersion.toMicroseconds();
    if (timeDelta >= this.RESUME_TOKEN_MAX_AGE_MICROS) {
      return true;
    }

    // Otherwise if the only thing that has changed about a target is its resume
    // token it's not worth persisting. Note that the RemoteStore keeps an
    // in-memory view of the currently active targets which includes the current
    // resume token, so stream failure or user changes will still use an
    // up-to-date resume token regardless of what we do here.
    const changes =
      change.addedDocuments.size +
      change.modifiedDocuments.size +
      change.removedDocuments.size;
    return changes > 0;
  }

  async notifyLocalViewChanges(viewChanges: LocalViewChanges[]): Promise<void> {
    try {
      await this.persistence.runTransaction(
        'notifyLocalViewChanges',
        'readwrite',
        txn => {
          return PersistencePromise.forEach(
            viewChanges,
            (viewChange: LocalViewChanges) => {
              return PersistencePromise.forEach(
                viewChange.addedKeys,
                (key: DocumentKey) =>
                  this.persistence.referenceDelegate.addReference(
                    txn,
                    viewChange.targetId,
                    key
                  )
              ).next(() =>
                PersistencePromise.forEach(
                  viewChange.removedKeys,
                  (key: DocumentKey) =>
                    this.persistence.referenceDelegate.removeReference(
                      txn,
                      viewChange.targetId,
                      key
                    )
                )
              );
            }
          );
        }
      );
    } catch (e) {
      if (isIndexedDbTransactionError(e)) {
        // If `notifyLocalViewChanges` fails, we did not advance the sequence
        // number for the documents that were included in this transaction.
        // This might trigger them to be deleted earlier than they otherwise
        // would have, but it should not invalidate the integrity of the data.
        logDebug(LOG_TAG, 'Failed to update sequence numbers: ' + e);
      } else {
        throw e;
      }
    }

    for (const viewChange of viewChanges) {
      const targetId = viewChange.targetId;

      if (!viewChange.fromCache) {
        const targetData = this.targetDataByTarget.get(targetId);
        debugAssert(
          targetData !== null,
          `Can't set limbo-free snapshot version for unknown target: ${targetId}`
        );

        // Advance the last limbo free snapshot version
        const lastLimboFreeSnapshotVersion = targetData.snapshotVersion;
        const updatedTargetData = targetData.withLastLimboFreeSnapshotVersion(
          lastLimboFreeSnapshotVersion
        );
        this.targetDataByTarget = this.targetDataByTarget.insert(
          targetId,
          updatedTargetData
        );
      }
    }
  }

  nextMutationBatch(afterBatchId?: BatchId): Promise<MutationBatch | null> {
    return this.persistence.runTransaction(
      'Get next mutation batch',
      'readonly',
      txn => {
        if (afterBatchId === undefined) {
          afterBatchId = BATCHID_UNKNOWN;
        }
        return this.mutationQueue.getNextMutationBatchAfterBatchId(
          txn,
          afterBatchId
        );
      }
    );
  }

  readDocument(key: DocumentKey): Promise<MaybeDocument | null> {
    return this.persistence.runTransaction('read document', 'readonly', txn => {
      return this.localDocuments.getDocument(txn, key);
    });
  }

  allocateTarget(target: Target): Promise<TargetData> {
    return this.persistence
      .runTransaction('Allocate target', 'readwrite', txn => {
        let targetData: TargetData;
        return this.targetCache
          .getTargetData(txn, target)
          .next((cached: TargetData | null) => {
            if (cached) {
              // This target has been listened to previously, so reuse the
              // previous targetID.
              // TODO(mcg): freshen last accessed date?
              targetData = cached;
              return PersistencePromise.resolve(targetData);
            } else {
              return this.targetCache.allocateTargetId(txn).next(targetId => {
                targetData = new TargetData(
                  target,
                  targetId,
                  TargetPurpose.Listen,
                  txn.currentSequenceNumber
                );
                return this.targetCache
                  .addTargetData(txn, targetData)
                  .next(() => targetData);
              });
            }
          });
      })
      .then(targetData => {
        // If Multi-Tab is enabled, the existing target data may be newer than
        // the in-memory data
        const cachedTargetData = this.targetDataByTarget.get(
          targetData.targetId
        );
        if (
          cachedTargetData === null ||
          targetData.snapshotVersion.compareTo(
            cachedTargetData.snapshotVersion
          ) > 0
        ) {
          this.targetDataByTarget = this.targetDataByTarget.insert(
            targetData.targetId,
            targetData
          );
          this.targetIdByTarget.set(target, targetData.targetId);
        }
        return targetData;
      });
  }

  getTargetData(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<TargetData | null> {
    const targetId = this.targetIdByTarget.get(target);
    if (targetId !== undefined) {
      return PersistencePromise.resolve<TargetData | null>(
        this.targetDataByTarget.get(targetId)
      );
    } else {
      return this.targetCache.getTargetData(transaction, target);
    }
  }

  async releaseTarget(
    targetId: number,
    keepPersistedTargetData: boolean
  ): Promise<void> {
    const targetData = this.targetDataByTarget.get(targetId);
    debugAssert(
      targetData !== null,
      `Tried to release nonexistent target: ${targetId}`
    );

    const mode = keepPersistedTargetData ? 'readwrite' : 'readwrite-primary';

    try {
      if (!keepPersistedTargetData) {
        await this.persistence.runTransaction('Release target', mode, txn => {
          return this.persistence.referenceDelegate.removeTarget(
            txn,
            targetData!
          );
        });
      }
    } catch (e) {
      if (isIndexedDbTransactionError(e)) {
        // All `releaseTarget` does is record the final metadata state for the
        // target, but we've been recording this periodically during target
        // activity. If we lose this write this could cause a very slight
        // difference in the order of target deletion during GC, but we
        // don't define exact LRU semantics so this is acceptable.
        logDebug(
          LOG_TAG,
          `Failed to update sequence numbers for target ${targetId}: ${e}`
        );
      } else {
        throw e;
      }
    }

    this.targetDataByTarget = this.targetDataByTarget.remove(targetId);
    this.targetIdByTarget.delete(targetData!.target);
  }

  executeQuery(
    query: Query,
    usePreviousResults: boolean
  ): Promise<QueryResult> {
    // let lastLimboFreeSnapshotVersion = SnapshotVersion.min();
    // let remoteKeys = documentKeySet();
    //
    // return this.persistence.runTransaction('Execute query', 'readonly', txn => {
    //   return this.getTargetData(txn, queryToTarget(query))
    //     .next(targetData => {
    //       if (targetData) {
    //         lastLimboFreeSnapshotVersion =
    //           targetData.lastLimboFreeSnapshotVersion;
    //         return this.targetCache
    //           .getMatchingKeysForTargetId(txn, targetData.targetId)
    //           .next(result => {
    //             remoteKeys = result;
    //           });
    //       }
    //     })
    //     .next(() =>
    //       this.queryEngine.getDocumentsMatchingQuery(
    //         txn,
    //         query,
    //         usePreviousResults
    //           ? lastLimboFreeSnapshotVersion
    //           : SnapshotVersion.min(),
    //         usePreviousResults ? remoteKeys : documentKeySet()
    //       )
    //     )
    //     .next(documents => {
    //       return { documents, remoteKeys };
    //     });
    // });
    return null as any;
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
          hardAssert(
            ackVersion !== null,
            'ackVersions should contain every doc in the write.'
          );
          if (!doc || doc.version.compareTo(ackVersion!) < 0) {
            doc = batch.applyToRemoteDocument(docKey, doc, batchResult);
            if (!doc) {
              debugAssert(
                !remoteDoc,
                'Mutation batch ' +
                  batch +
                  ' applied to document ' +
                  remoteDoc +
                  ' resulted in null'
              );
            } else {
              // We use the commitVersion as the readTime rather than the
              // document's updateTime since the updateTime is not advanced
              // for updates that do not modify the underlying document.
              documentBuffer.addEntry(doc, batchResult.commitVersion);
            }
          }
        });
    });
    return promiseChain.next(() =>
      this.mutationQueue.removeMutationBatch(txn, batch)
    );
  }

  collectGarbage(garbageCollector: LruGarbageCollector): Promise<LruResults> {
    return this.persistence.runTransaction(
      'Collect garbage',
      'readwrite-primary',
      txn => garbageCollector.collect(txn, this.targetDataByTarget)
    );
  }
}

export function newLocalStore(
  /** Manages our in-memory or durable persistence. */
  persistence: Persistence,
  queryEngine: QueryEngine,
  initialUser: User
): LocalStore {
  return new LocalStoreImpl(persistence, queryEngine, initialUser);
}

/** Returns the local view of the documents affected by a mutation batch. */
// PORTING NOTE: Multi-Tab only.
export function lookupMutationDocuments(
  localStore: LocalStore,
  batchId: BatchId
): Promise<MaybeDocumentMap | null> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const mutationQueueImpl = debugCast(
    localStoreImpl.mutationQueue,
    IndexedDbMutationQueue // We only support IndexedDb in multi-tab mode.
  );
  return localStoreImpl.persistence.runTransaction(
    'Lookup mutation documents',
    'readonly',
    txn => {
      return mutationQueueImpl.lookupMutationKeys(txn, batchId).next(keys => {
        if (keys) {
          return localStoreImpl.localDocuments.getDocuments(
            txn,
            keys
          ) as PersistencePromise<MaybeDocumentMap | null>;
        } else {
          return PersistencePromise.resolve<MaybeDocumentMap | null>(null);
        }
      });
    }
  );
}

// PORTING NOTE: Multi-Tab only.
export function removeCachedMutationBatchMetadata(
  localStore: LocalStore,
  batchId: BatchId
): void {
  const mutationQueueImpl = debugCast(
    debugCast(localStore, LocalStoreImpl).mutationQueue,
    IndexedDbMutationQueue // We only support IndexedDb in multi-tab mode.
  );
  mutationQueueImpl.removeCachedMutationKeys(batchId);
}

// PORTING NOTE: Multi-Tab only.
export function getActiveClientsFromPersistence(
  localStore: LocalStore
): Promise<ClientId[]> {
  const persistenceImpl = debugCast(
    debugCast(localStore, LocalStoreImpl).persistence,
    IndexedDbPersistence // We only support IndexedDb in multi-tab mode.
  );
  return persistenceImpl.getActiveClients();
}

// PORTING NOTE: Multi-Tab only.
export function getCachedTarget(
  localStore: LocalStore,
  targetId: TargetId
): Promise<Target | null> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const targetCacheImpl = debugCast(
    localStoreImpl.targetCache,
    IndexedDbTargetCache // We only support IndexedDb in multi-tab mode.
  );
  const cachedTargetData = localStoreImpl.targetDataByTarget.get(targetId);
  if (cachedTargetData) {
    return Promise.resolve(cachedTargetData.target);
  } else {
    return localStoreImpl.persistence.runTransaction(
      'Get target data',
      'readonly',
      txn => {
        return targetCacheImpl
          .getTargetDataForTarget(txn, targetId)
          .next(targetData => (targetData ? targetData.target : null));
      }
    );
  }
}

/**
 * Returns the set of documents that have been updated since the last call.
 * If this is the first call, returns the set of changes since client
 * initialization. Further invocations will return document that have changed
 * since the prior call.
 */
// PORTING NOTE: Multi-Tab only.
export function getNewDocumentChanges(
  localStore: LocalStore
): Promise<MaybeDocumentMap> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const remoteDocumentCacheImpl = debugCast(
    localStoreImpl.remoteDocuments,
    IndexedDbRemoteDocumentCache // We only support IndexedDb in multi-tab mode.
  );
  return localStoreImpl.persistence
    .runTransaction('Get new document changes', 'readonly', txn =>
      remoteDocumentCacheImpl.getNewDocumentChanges(
        txn,
        localStoreImpl.lastDocumentChangeReadTime
      )
    )
    .then(({ changedDocs, readTime }) => {
      localStoreImpl.lastDocumentChangeReadTime = readTime;
      return changedDocs;
    });
}

/**
 * Reads the newest document change from persistence and moves the internal
 * synchronization marker forward so that calls to `getNewDocumentChanges()`
 * only return changes that happened after client initialization.
 */
// PORTING NOTE: Multi-Tab only.
export async function synchronizeLastDocumentChangeReadTime(
  localStore: LocalStore
): Promise<void> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const remoteDocumentCacheImpl = debugCast(
    localStoreImpl.remoteDocuments,
    IndexedDbRemoteDocumentCache // We only support IndexedDb in multi-tab mode.
  );
  return localStoreImpl.persistence
    .runTransaction(
      'Synchronize last document change read time',
      'readonly',
      txn => remoteDocumentCacheImpl.getLastReadTime(txn)
    )
    .then(readTime => {
      localStoreImpl.lastDocumentChangeReadTime = readTime;
    });
}

/**
 * Verifies the error thrown by a LocalStore operation. If a LocalStore
 * operation fails because the primary lease has been taken by another client,
 * we ignore the error (the persistence layer will immediately call
 * `applyPrimaryLease` to propagate the primary state change). All other errors
 * are re-thrown.
 *
 * @param err An error returned by a LocalStore operation.
 * @return A Promise that resolves after we recovered, or the original error.
 */
export async function ignoreIfPrimaryLeaseLoss(
  err: FirestoreError
): Promise<void> {
  if (
    err.code === Code.FAILED_PRECONDITION &&
    err.message === PRIMARY_LEASE_LOST_ERROR_MSG
  ) {
    logDebug(LOG_TAG, 'Unexpectedly lost primary lease');
  } else {
    throw err;
  }
}
