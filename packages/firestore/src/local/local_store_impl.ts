/**
 * @license
 * Copyright 2020 Google LLC
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

import { User } from '../auth/user';
import { BundleConverter, BundledDocuments, NamedQuery } from '../core/bundle';
import {
  newQueryForPath,
  Query,
  queryCollectionGroup,
  queryToTarget
} from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { canonifyTarget, Target, targetEquals } from '../core/target';
import { BatchId, TargetId } from '../core/types';
import { Timestamp } from '../lite-api/timestamp';
import {
  convertOverlayedDocumentMapToDocumentMap,
  documentKeySet,
  DocumentKeySet,
  DocumentMap,
  mutableDocumentMap,
  MutableDocumentMap,
  OverlayedDocumentMap
} from '../model/collections';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  FieldIndex,
  fieldIndexSemanticComparator,
  INITIAL_LARGEST_BATCH_ID,
  newIndexOffsetSuccessorFromReadTime
} from '../model/field_index';
import {
  mutationExtractBaseValue,
  Mutation,
  PatchMutation,
  Precondition
} from '../model/mutation';
import { MutationBatch, MutationBatchResult } from '../model/mutation_batch';
import { extractFieldMask } from '../model/object_value';
import { ResourcePath } from '../model/path';
import {
  BundleMetadata,
  NamedQuery as ProtoNamedQuery
} from '../protos/firestore_bundle_proto';
import { RemoteEvent, TargetChange } from '../remote/remote_event';
import { fromVersion, JsonProtoSerializer } from '../remote/serializer';
import { diffArrays } from '../util/array';
import { debugAssert, debugCast, hardAssert } from '../util/assert';
import { ByteString } from '../util/byte_string';
import { logDebug } from '../util/log';
import { primitiveComparator } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { SortedMap } from '../util/sorted_map';
import { BATCHID_UNKNOWN } from '../util/types';

import { BundleCache } from './bundle_cache';
import { DocumentOverlayCache } from './document_overlay_cache';
import { IndexManager } from './index_manager';
import { IndexedDbMutationQueue } from './indexeddb_mutation_queue';
import { IndexedDbPersistence } from './indexeddb_persistence';
import { IndexedDbTargetCache } from './indexeddb_target_cache';
import { LocalDocumentsView } from './local_documents_view';
import { fromBundledQuery } from './local_serializer';
import { LocalStore } from './local_store';
import { LocalViewChanges } from './local_view_changes';
import { LruGarbageCollector, LruResults } from './lru_garbage_collector';
import { MutationQueue } from './mutation_queue';
import { Persistence } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { QueryEngine } from './query_engine';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';
import { ClientId } from './shared_client_state';
import { isIndexedDbTransactionError } from './simple_db';
import { TargetCache } from './target_cache';
import { TargetData, TargetPurpose } from './target_data';

export const LOG_TAG = 'LocalStore';

/**
 * The maximum time to leave a resume token buffered without writing it out.
 * This value is arbitrary: it's long enough to avoid several writes
 * (possibly indefinitely if updates come more frequently than this) but
 * short enough that restarting after crashing will still have a pretty
 * recent resume token.
 */
const RESUME_TOKEN_MAX_AGE_MICROS = 5 * 60 * 1e6;

/** The result of a write to the local store. */
export interface LocalWriteResult {
  batchId: BatchId;
  changes: DocumentMap;
}

/** The result of a user-change operation in the local store. */
export interface UserChangeResult {
  readonly affectedDocuments: DocumentMap;
  readonly removedBatchIds: BatchId[];
  readonly addedBatchIds: BatchId[];
}

/** The result of executing a query against the local store. */
export interface QueryResult {
  readonly documents: DocumentMap;
  readonly remoteKeys: DocumentKeySet;
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
   * The set of all mutations that have been sent but not yet been applied to
   * the backend.
   */
  mutationQueue!: MutationQueue;

  /**
   * The overlays that can be used to short circuit applying all mutations from
   * mutation queue.
   */
  documentOverlayCache!: DocumentOverlayCache;

  /** The set of all cached remote documents. */
  remoteDocuments: RemoteDocumentCache;

  /**
   * The "local" view of all documents (layering mutationQueue on top of
   * remoteDocumentCache).
   */
  localDocuments!: LocalDocumentsView;

  /** Manages the list of active field and collection indices. */
  indexManager!: IndexManager;

  /** The set of all cached bundle metadata and named queries. */
  bundleCache: BundleCache;

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
  targetIdByTarget = new ObjectMap<Target, TargetId>(
    t => canonifyTarget(t),
    targetEquals
  );

  /**
   * A per collection group index of the last read time processed by
   * `getNewDocumentChanges()`.
   *
   * PORTING NOTE: This is only used for multi-tab synchronization.
   */
  collectionGroupReadTime = new Map<string, SnapshotVersion>();

  constructor(
    /** Manages our in-memory or durable persistence. */
    readonly persistence: Persistence,
    readonly queryEngine: QueryEngine,
    initialUser: User,
    readonly serializer: JsonProtoSerializer
  ) {
    debugAssert(
      persistence.started,
      'LocalStore was passed an unstarted persistence implementation'
    );
    this.remoteDocuments = persistence.getRemoteDocumentCache();
    this.targetCache = persistence.getTargetCache();
    this.bundleCache = persistence.getBundleCache();

    this.initializeUserComponents(initialUser);
  }

  initializeUserComponents(user: User): void {
    // TODO(indexing): Add spec tests that test these components change after a
    // user change
    this.documentOverlayCache = this.persistence.getDocumentOverlayCache(user);
    this.indexManager = this.persistence.getIndexManager(user);
    this.mutationQueue = this.persistence.getMutationQueue(
      user,
      this.indexManager
    );
    this.localDocuments = new LocalDocumentsView(
      this.remoteDocuments,
      this.mutationQueue,
      this.documentOverlayCache,
      this.indexManager
    );
    this.remoteDocuments.setIndexManager(this.indexManager);
    this.queryEngine.initialize(this.localDocuments, this.indexManager);
  }

  collectGarbage(garbageCollector: LruGarbageCollector): Promise<LruResults> {
    return this.persistence.runTransaction(
      'Collect garbage',
      'readwrite-primary',
      txn => garbageCollector.collect(txn, this.targetDataByTarget)
    );
  }
}

interface DocumentChangeResult {
  changedDocuments: MutableDocumentMap;
  existenceChangedKeys: DocumentKeySet;
}

export function newLocalStore(
  /** Manages our in-memory or durable persistence. */
  persistence: Persistence,
  queryEngine: QueryEngine,
  initialUser: User,
  serializer: JsonProtoSerializer
): LocalStore {
  return new LocalStoreImpl(persistence, queryEngine, initialUser, serializer);
}

/**
 * Tells the LocalStore that the currently authenticated user has changed.
 *
 * In response the local store switches the mutation queue to the new user and
 * returns any resulting document changes.
 */
// PORTING NOTE: Android and iOS only return the documents affected by the
// change.
export async function localStoreHandleUserChange(
  localStore: LocalStore,
  user: User
): Promise<UserChangeResult> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);

  const result = await localStoreImpl.persistence.runTransaction(
    'Handle user change',
    'readonly',
    txn => {
      // Swap out the mutation queue, grabbing the pending mutation batches
      // before and after.
      let oldBatches: MutationBatch[];
      return localStoreImpl.mutationQueue
        .getAllMutationBatches(txn)
        .next(promisedOldBatches => {
          oldBatches = promisedOldBatches;
          localStoreImpl.initializeUserComponents(user);
          return localStoreImpl.mutationQueue.getAllMutationBatches(txn);
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
          return localStoreImpl.localDocuments
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

  return result;
}

/* Accepts locally generated Mutations and commit them to storage. */
export function localStoreWriteLocally(
  localStore: LocalStore,
  mutations: Mutation[]
): Promise<LocalWriteResult> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const localWriteTime = Timestamp.now();
  const keys = mutations.reduce((keys, m) => keys.add(m.key), documentKeySet());

  let overlayedDocuments: OverlayedDocumentMap;
  let mutationBatch: MutationBatch;

  return localStoreImpl.persistence
    .runTransaction('Locally write mutations', 'readwrite', txn => {
      // Figure out which keys do not have a remote version in the cache, this
      // is needed to create the right overlay mutation: if no remote version
      // presents, we do not need to create overlays as patch mutations.
      // TODO(Overlay): Is there a better way to determine this? Using the
      //  document version does not work because local mutations set them back
      //  to 0.
      let remoteDocs = mutableDocumentMap();
      let docsWithoutRemoteVersion = documentKeySet();
      return localStoreImpl.remoteDocuments
        .getEntries(txn, keys)
        .next(docs => {
          remoteDocs = docs;
          remoteDocs.forEach((key, doc) => {
            if (!doc.isValidDocument()) {
              docsWithoutRemoteVersion = docsWithoutRemoteVersion.add(key);
            }
          });
        })
        .next(() => {
          // Load and apply all existing mutations. This lets us compute the
          // current base state for all non-idempotent transforms before applying
          // any additional user-provided writes.
          return localStoreImpl.localDocuments.getOverlayedDocuments(
            txn,
            remoteDocs
          );
        })
        .next((docs: OverlayedDocumentMap) => {
          overlayedDocuments = docs;

          // For non-idempotent mutations (such as `FieldValue.increment()`),
          // we record the base state in a separate patch mutation. This is
          // later used to guarantee consistent values and prevents flicker
          // even if the backend sends us an update that already includes our
          // transform.
          const baseMutations: Mutation[] = [];

          for (const mutation of mutations) {
            const baseValue = mutationExtractBaseValue(
              mutation,
              overlayedDocuments.get(mutation.key)!.overlayedDocument
            );
            if (baseValue != null) {
              // NOTE: The base state should only be applied if there's some
              // existing document to override, so use a Precondition of
              // exists=true
              baseMutations.push(
                new PatchMutation(
                  mutation.key,
                  baseValue,
                  extractFieldMask(baseValue.value.mapValue),
                  Precondition.exists(true)
                )
              );
            }
          }

          return localStoreImpl.mutationQueue.addMutationBatch(
            txn,
            localWriteTime,
            baseMutations,
            mutations
          );
        })
        .next(batch => {
          mutationBatch = batch;
          const overlays = batch.applyToLocalDocumentSet(
            overlayedDocuments,
            docsWithoutRemoteVersion
          );
          return localStoreImpl.documentOverlayCache.saveOverlays(
            txn,
            batch.batchId,
            overlays
          );
        });
    })
    .then(() => ({
      batchId: mutationBatch.batchId,
      changes: convertOverlayedDocumentMapToDocumentMap(overlayedDocuments)
    }));
}

/**
 * Acknowledges the given batch.
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
export function localStoreAcknowledgeBatch(
  localStore: LocalStore,
  batchResult: MutationBatchResult
): Promise<DocumentMap> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Acknowledge batch',
    'readwrite-primary',
    txn => {
      const affected = batchResult.batch.keys();
      const documentBuffer = localStoreImpl.remoteDocuments.newChangeBuffer({
        trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
      });
      return applyWriteToRemoteDocuments(
        localStoreImpl,
        txn,
        batchResult,
        documentBuffer
      )
        .next(() => documentBuffer.apply(txn))
        .next(() => localStoreImpl.mutationQueue.performConsistencyCheck(txn))
        .next(() =>
          localStoreImpl.documentOverlayCache.removeOverlaysForBatchId(
            txn,
            affected,
            batchResult.batch.batchId
          )
        )
        .next(() =>
          localStoreImpl.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(
            txn,
            getKeysWithTransformResults(batchResult)
          )
        )
        .next(() => localStoreImpl.localDocuments.getDocuments(txn, affected));
    }
  );
}

function getKeysWithTransformResults(
  batchResult: MutationBatchResult
): DocumentKeySet {
  let result = documentKeySet();

  for (let i = 0; i < batchResult.mutationResults.length; ++i) {
    const mutationResult = batchResult.mutationResults[i];
    if (mutationResult.transformResults.length > 0) {
      result = result.add(batchResult.batch.mutations[i].key);
    }
  }
  return result;
}

/**
 * Removes mutations from the MutationQueue for the specified batch;
 * LocalDocuments will be recalculated.
 *
 * @returns The resulting modified documents.
 */
export function localStoreRejectBatch(
  localStore: LocalStore,
  batchId: BatchId
): Promise<DocumentMap> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Reject batch',
    'readwrite-primary',
    txn => {
      let affectedKeys: DocumentKeySet;
      return localStoreImpl.mutationQueue
        .lookupMutationBatch(txn, batchId)
        .next((batch: MutationBatch | null) => {
          hardAssert(batch !== null, 'Attempt to reject nonexistent batch!');
          affectedKeys = batch.keys();
          return localStoreImpl.mutationQueue.removeMutationBatch(txn, batch);
        })
        .next(() => localStoreImpl.mutationQueue.performConsistencyCheck(txn))
        .next(() =>
          localStoreImpl.documentOverlayCache.removeOverlaysForBatchId(
            txn,
            affectedKeys,
            batchId
          )
        )
        .next(() =>
          localStoreImpl.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(
            txn,
            affectedKeys
          )
        )
        .next(() =>
          localStoreImpl.localDocuments.getDocuments(txn, affectedKeys)
        );
    }
  );
}

/**
 * Returns the largest (latest) batch id in mutation queue that is pending
 * server response.
 *
 * Returns `BATCHID_UNKNOWN` if the queue is empty.
 */
export function localStoreGetHighestUnacknowledgedBatchId(
  localStore: LocalStore
): Promise<BatchId> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Get highest unacknowledged batch id',
    'readonly',
    txn => localStoreImpl.mutationQueue.getHighestUnacknowledgedBatchId(txn)
  );
}

/**
 * Returns the last consistent snapshot processed (used by the RemoteStore to
 * determine whether to buffer incoming snapshots from the backend).
 */
export function localStoreGetLastRemoteSnapshotVersion(
  localStore: LocalStore
): Promise<SnapshotVersion> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Get last remote snapshot version',
    'readonly',
    txn => localStoreImpl.targetCache.getLastRemoteSnapshotVersion(txn)
  );
}

/**
 * Updates the "ground-state" (remote) documents. We assume that the remote
 * event reflects any write batches that have been acknowledged or rejected
 * (i.e. we do not re-apply local mutations to updates from this event).
 *
 * LocalDocuments are re-calculated if there are remaining mutations in the
 * queue.
 */
export function localStoreApplyRemoteEventToLocalCache(
  localStore: LocalStore,
  remoteEvent: RemoteEvent
): Promise<DocumentMap> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const remoteVersion = remoteEvent.snapshotVersion;
  let newTargetDataByTargetMap = localStoreImpl.targetDataByTarget;

  return localStoreImpl.persistence
    .runTransaction('Apply remote event', 'readwrite-primary', txn => {
      const documentBuffer = localStoreImpl.remoteDocuments.newChangeBuffer({
        trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
      });

      // Reset newTargetDataByTargetMap in case this transaction gets re-run.
      newTargetDataByTargetMap = localStoreImpl.targetDataByTarget;

      const promises = [] as Array<PersistencePromise<void>>;
      remoteEvent.targetChanges.forEach((change, targetId) => {
        const oldTargetData = newTargetDataByTargetMap.get(targetId);
        if (!oldTargetData) {
          return;
        }

        // Only update the remote keys if the target is still active. This
        // ensures that we can persist the updated target data along with
        // the updated assignment.
        promises.push(
          localStoreImpl.targetCache
            .removeMatchingKeys(txn, change.removedDocuments, targetId)
            .next(() => {
              return localStoreImpl.targetCache.addMatchingKeys(
                txn,
                change.addedDocuments,
                targetId
              );
            })
        );

        let newTargetData = oldTargetData.withSequenceNumber(
          txn.currentSequenceNumber
        );
        if (remoteEvent.targetMismatches.get(targetId) !== null) {
          newTargetData = newTargetData
            .withResumeToken(
              ByteString.EMPTY_BYTE_STRING,
              SnapshotVersion.min()
            )
            .withLastLimboFreeSnapshotVersion(SnapshotVersion.min());
        } else if (change.resumeToken.approximateByteSize() > 0) {
          newTargetData = newTargetData.withResumeToken(
            change.resumeToken,
            remoteVersion
          );
        }

        newTargetDataByTargetMap = newTargetDataByTargetMap.insert(
          targetId,
          newTargetData
        );

        // Update the target data if there are target changes (or if
        // sufficient time has passed since the last update).
        if (shouldPersistTargetData(oldTargetData, newTargetData, change)) {
          promises.push(
            localStoreImpl.targetCache.updateTargetData(txn, newTargetData)
          );
        }
      });

      let changedDocs = mutableDocumentMap();
      let existenceChangedKeys = documentKeySet();
      remoteEvent.documentUpdates.forEach(key => {
        if (remoteEvent.resolvedLimboDocuments.has(key)) {
          promises.push(
            localStoreImpl.persistence.referenceDelegate.updateLimboDocument(
              txn,
              key
            )
          );
        }
      });

      // Each loop iteration only affects its "own" doc, so it's safe to get all
      // the remote documents in advance in a single call.
      promises.push(
        populateDocumentChangeBuffer(
          txn,
          documentBuffer,
          remoteEvent.documentUpdates
        ).next(result => {
          changedDocs = result.changedDocuments;
          existenceChangedKeys = result.existenceChangedKeys;
        })
      );

      // HACK: The only reason we allow a null snapshot version is so that we
      // can synthesize remote events when we get permission denied errors while
      // trying to resolve the state of a locally cached document that is in
      // limbo.
      if (!remoteVersion.isEqual(SnapshotVersion.min())) {
        const updateRemoteVersion = localStoreImpl.targetCache
          .getLastRemoteSnapshotVersion(txn)
          .next(lastRemoteSnapshotVersion => {
            debugAssert(
              remoteVersion.compareTo(lastRemoteSnapshotVersion) >= 0,
              'Watch stream reverted to previous snapshot?? ' +
                remoteVersion +
                ' < ' +
                lastRemoteSnapshotVersion
            );
            return localStoreImpl.targetCache.setTargetsMetadata(
              txn,
              txn.currentSequenceNumber,
              remoteVersion
            );
          });
        promises.push(updateRemoteVersion);
      }

      return PersistencePromise.waitFor(promises)
        .next(() => documentBuffer.apply(txn))
        .next(() =>
          localStoreImpl.localDocuments.getLocalViewOfDocuments(
            txn,
            changedDocs,
            existenceChangedKeys
          )
        )
        .next(() => changedDocs);
    })
    .then(changedDocs => {
      localStoreImpl.targetDataByTarget = newTargetDataByTargetMap;
      return changedDocs;
    });
}

/**
 * Populates document change buffer with documents from backend or a bundle.
 * Returns the document changes resulting from applying those documents, and
 * also a set of documents whose existence state are changed as a result.
 *
 * @param txn - Transaction to use to read existing documents from storage.
 * @param documentBuffer - Document buffer to collect the resulted changes to be
 *        applied to storage.
 * @param documents - Documents to be applied.
 */
function populateDocumentChangeBuffer(
  txn: PersistenceTransaction,
  documentBuffer: RemoteDocumentChangeBuffer,
  documents: MutableDocumentMap
): PersistencePromise<DocumentChangeResult> {
  let updatedKeys = documentKeySet();
  let existenceChangedKeys = documentKeySet();
  documents.forEach(k => (updatedKeys = updatedKeys.add(k)));
  return documentBuffer.getEntries(txn, updatedKeys).next(existingDocs => {
    let changedDocuments = mutableDocumentMap();
    documents.forEach((key, doc) => {
      const existingDoc = existingDocs.get(key)!;

      // Check if see if there is a existence state change for this document.
      if (doc.isFoundDocument() !== existingDoc.isFoundDocument()) {
        existenceChangedKeys = existenceChangedKeys.add(key);
      }

      // Note: The order of the steps below is important, since we want
      // to ensure that rejected limbo resolutions (which fabricate
      // NoDocuments with SnapshotVersion.min()) never add documents to
      // cache.
      if (doc.isNoDocument() && doc.version.isEqual(SnapshotVersion.min())) {
        // NoDocuments with SnapshotVersion.min() are used in manufactured
        // events. We remove these documents from cache since we lost
        // access.
        documentBuffer.removeEntry(key, doc.readTime);
        changedDocuments = changedDocuments.insert(key, doc);
      } else if (
        !existingDoc.isValidDocument() ||
        doc.version.compareTo(existingDoc.version) > 0 ||
        (doc.version.compareTo(existingDoc.version) === 0 &&
          existingDoc.hasPendingWrites)
      ) {
        debugAssert(
          !SnapshotVersion.min().isEqual(doc.readTime),
          'Cannot add a document when the remote version is zero'
        );
        documentBuffer.addEntry(doc);
        changedDocuments = changedDocuments.insert(key, doc);
      } else {
        logDebug(
          LOG_TAG,
          'Ignoring outdated watch update for ',
          key,
          '. Current version:',
          existingDoc.version,
          ' Watch version:',
          doc.version
        );
      }
    });
    return { changedDocuments, existenceChangedKeys };
  });
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
function shouldPersistTargetData(
  oldTargetData: TargetData,
  newTargetData: TargetData,
  change: TargetChange
): boolean {
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
  if (timeDelta >= RESUME_TOKEN_MAX_AGE_MICROS) {
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

/**
 * Notifies local store of the changed views to locally pin documents.
 */
export async function localStoreNotifyLocalViewChanges(
  localStore: LocalStore,
  viewChanges: LocalViewChanges[]
): Promise<void> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  try {
    await localStoreImpl.persistence.runTransaction(
      'notifyLocalViewChanges',
      'readwrite',
      txn => {
        return PersistencePromise.forEach(
          viewChanges,
          (viewChange: LocalViewChanges) => {
            return PersistencePromise.forEach(
              viewChange.addedKeys,
              (key: DocumentKey) =>
                localStoreImpl.persistence.referenceDelegate.addReference(
                  txn,
                  viewChange.targetId,
                  key
                )
            ).next(() =>
              PersistencePromise.forEach(
                viewChange.removedKeys,
                (key: DocumentKey) =>
                  localStoreImpl.persistence.referenceDelegate.removeReference(
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
    if (isIndexedDbTransactionError(e as Error)) {
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
      const targetData = localStoreImpl.targetDataByTarget.get(targetId);
      debugAssert(
        targetData !== null,
        `Can't set limbo-free snapshot version for unknown target: ${targetId}`
      );

      // Advance the last limbo free snapshot version
      const lastLimboFreeSnapshotVersion = targetData.snapshotVersion;
      const updatedTargetData = targetData.withLastLimboFreeSnapshotVersion(
        lastLimboFreeSnapshotVersion
      );
      localStoreImpl.targetDataByTarget =
        localStoreImpl.targetDataByTarget.insert(targetId, updatedTargetData);

      // TODO(b/272564316): Apply the optimization done on other platforms.
      // This is a problem for web because saving the updated targetData from
      // non-primary client conflicts with what primary client saved.
    }
  }
}

/**
 * Gets the mutation batch after the passed in batchId in the mutation queue
 * or null if empty.
 * @param afterBatchId - If provided, the batch to search after.
 * @returns The next mutation or null if there wasn't one.
 */
export function localStoreGetNextMutationBatch(
  localStore: LocalStore,
  afterBatchId?: BatchId
): Promise<MutationBatch | null> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Get next mutation batch',
    'readonly',
    txn => {
      if (afterBatchId === undefined) {
        afterBatchId = BATCHID_UNKNOWN;
      }
      return localStoreImpl.mutationQueue.getNextMutationBatchAfterBatchId(
        txn,
        afterBatchId
      );
    }
  );
}

/**
 * Reads the current value of a Document with a given key or null if not
 * found - used for testing.
 */
export function localStoreReadDocument(
  localStore: LocalStore,
  key: DocumentKey
): Promise<Document> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'read document',
    'readonly',
    txn => localStoreImpl.localDocuments.getDocument(txn, key)
  );
}

/**
 * Assigns the given target an internal ID so that its results can be pinned so
 * they don't get GC'd. A target must be allocated in the local store before
 * the store can be used to manage its view.
 *
 * Allocating an already allocated `Target` will return the existing `TargetData`
 * for that `Target`.
 */
export function localStoreAllocateTarget(
  localStore: LocalStore,
  target: Target
): Promise<TargetData> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence
    .runTransaction('Allocate target', 'readwrite', txn => {
      let targetData: TargetData;
      return localStoreImpl.targetCache
        .getTargetData(txn, target)
        .next((cached: TargetData | null) => {
          if (cached) {
            // This target has been listened to previously, so reuse the
            // previous targetID.
            // TODO(mcg): freshen last accessed date?
            targetData = cached;
            return PersistencePromise.resolve(targetData);
          } else {
            return localStoreImpl.targetCache
              .allocateTargetId(txn)
              .next(targetId => {
                targetData = new TargetData(
                  target,
                  targetId,
                  TargetPurpose.Listen,
                  txn.currentSequenceNumber
                );
                return localStoreImpl.targetCache
                  .addTargetData(txn, targetData)
                  .next(() => targetData);
              });
          }
        });
    })
    .then(targetData => {
      // If Multi-Tab is enabled, the existing target data may be newer than
      // the in-memory data
      const cachedTargetData = localStoreImpl.targetDataByTarget.get(
        targetData.targetId
      );
      if (
        cachedTargetData === null ||
        targetData.snapshotVersion.compareTo(cachedTargetData.snapshotVersion) >
          0
      ) {
        localStoreImpl.targetDataByTarget =
          localStoreImpl.targetDataByTarget.insert(
            targetData.targetId,
            targetData
          );
        localStoreImpl.targetIdByTarget.set(target, targetData.targetId);
      }
      return targetData;
    });
}

/**
 * Returns the TargetData as seen by the LocalStore, including updates that may
 * have not yet been persisted to the TargetCache.
 */
// Visible for testing.
export function localStoreGetTargetData(
  localStore: LocalStore,
  transaction: PersistenceTransaction,
  target: Target
): PersistencePromise<TargetData | null> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const targetId = localStoreImpl.targetIdByTarget.get(target);
  if (targetId !== undefined) {
    return PersistencePromise.resolve<TargetData | null>(
      localStoreImpl.targetDataByTarget.get(targetId)
    );
  } else {
    return localStoreImpl.targetCache.getTargetData(transaction, target);
  }
}

/**
 * Unpins all the documents associated with the given target. If
 * `keepPersistedTargetData` is set to false and Eager GC enabled, the method
 * directly removes the associated target data from the target cache.
 *
 * Releasing a non-existing `Target` is a no-op.
 */
// PORTING NOTE: `keepPersistedTargetData` is multi-tab only.
export async function localStoreReleaseTarget(
  localStore: LocalStore,
  targetId: number,
  keepPersistedTargetData: boolean
): Promise<void> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const targetData = localStoreImpl.targetDataByTarget.get(targetId);
  debugAssert(
    targetData !== null,
    `Tried to release nonexistent target: ${targetId}`
  );

  const mode = keepPersistedTargetData ? 'readwrite' : 'readwrite-primary';

  try {
    if (!keepPersistedTargetData) {
      await localStoreImpl.persistence.runTransaction(
        'Release target',
        mode,
        txn => {
          return localStoreImpl.persistence.referenceDelegate.removeTarget(
            txn,
            targetData!
          );
        }
      );
    }
  } catch (e) {
    if (isIndexedDbTransactionError(e as Error)) {
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

  localStoreImpl.targetDataByTarget =
    localStoreImpl.targetDataByTarget.remove(targetId);
  localStoreImpl.targetIdByTarget.delete(targetData!.target);
}

/**
 * Runs the specified query against the local store and returns the results,
 * potentially taking advantage of query data from previous executions (such
 * as the set of remote keys).
 *
 * @param usePreviousResults - Whether results from previous executions can
 * be used to optimize this query execution.
 */
export function localStoreExecuteQuery(
  localStore: LocalStore,
  query: Query,
  usePreviousResults: boolean
): Promise<QueryResult> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  let lastLimboFreeSnapshotVersion = SnapshotVersion.min();
  let remoteKeys = documentKeySet();

  return localStoreImpl.persistence.runTransaction(
    'Execute query',
    'readwrite', // Use readwrite instead of readonly so indexes can be created
    txn => {
      return localStoreGetTargetData(localStoreImpl, txn, queryToTarget(query))
        .next(targetData => {
          if (targetData) {
            lastLimboFreeSnapshotVersion =
              targetData.lastLimboFreeSnapshotVersion;
            return localStoreImpl.targetCache
              .getMatchingKeysForTargetId(txn, targetData.targetId)
              .next(result => {
                remoteKeys = result;
              });
          }
        })
        .next(() =>
          localStoreImpl.queryEngine.getDocumentsMatchingQuery(
            txn,
            query,
            usePreviousResults
              ? lastLimboFreeSnapshotVersion
              : SnapshotVersion.min(),
            usePreviousResults ? remoteKeys : documentKeySet()
          )
        )
        .next(documents => {
          setMaxReadTime(
            localStoreImpl,
            queryCollectionGroup(query),
            documents
          );
          return { documents, remoteKeys };
        });
    }
  );
}

function applyWriteToRemoteDocuments(
  localStoreImpl: LocalStoreImpl,
  txn: PersistenceTransaction,
  batchResult: MutationBatchResult,
  documentBuffer: RemoteDocumentChangeBuffer
): PersistencePromise<void> {
  const batch = batchResult.batch;
  const docKeys = batch.keys();
  let promiseChain = PersistencePromise.resolve();
  docKeys.forEach(docKey => {
    promiseChain = promiseChain
      .next(() => documentBuffer.getEntry(txn, docKey))
      .next(doc => {
        const ackVersion = batchResult.docVersions.get(docKey);
        hardAssert(
          ackVersion !== null,
          'ackVersions should contain every doc in the write.'
        );
        if (doc.version.compareTo(ackVersion!) < 0) {
          batch.applyToRemoteDocument(doc, batchResult);
          if (doc.isValidDocument()) {
            // We use the commitVersion as the readTime rather than the
            // document's updateTime since the updateTime is not advanced
            // for updates that do not modify the underlying document.
            doc.setReadTime(batchResult.commitVersion);
            documentBuffer.addEntry(doc);
          }
        }
      });
  });
  return promiseChain.next(() =>
    localStoreImpl.mutationQueue.removeMutationBatch(txn, batch)
  );
}

/** Returns the local view of the documents affected by a mutation batch. */
// PORTING NOTE: Multi-Tab only.
export function localStoreLookupMutationDocuments(
  localStore: LocalStore,
  batchId: BatchId
): Promise<DocumentMap | null> {
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
          ) as PersistencePromise<DocumentMap | null>;
        } else {
          return PersistencePromise.resolve<DocumentMap | null>(null);
        }
      });
    }
  );
}

// PORTING NOTE: Multi-Tab only.
export function localStoreRemoveCachedMutationBatchMetadata(
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
export function localStoreGetActiveClients(
  localStore: LocalStore
): Promise<ClientId[]> {
  const persistenceImpl = debugCast(
    debugCast(localStore, LocalStoreImpl).persistence,
    IndexedDbPersistence // We only support IndexedDb in multi-tab mode.
  );
  return persistenceImpl.getActiveClients();
}

// PORTING NOTE: Multi-Tab only.
export function localStoreGetCachedTarget(
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
export function localStoreGetNewDocumentChanges(
  localStore: LocalStore,
  collectionGroup: string
): Promise<DocumentMap> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);

  // Get the current maximum read time for the collection. This should always
  // exist, but to reduce the chance for regressions we default to
  // SnapshotVersion.Min()
  // TODO(indexing): Consider removing the default value.
  const readTime =
    localStoreImpl.collectionGroupReadTime.get(collectionGroup) ||
    SnapshotVersion.min();

  return localStoreImpl.persistence
    .runTransaction('Get new document changes', 'readonly', txn =>
      localStoreImpl.remoteDocuments.getAllFromCollectionGroup(
        txn,
        collectionGroup,
        newIndexOffsetSuccessorFromReadTime(readTime, INITIAL_LARGEST_BATCH_ID),
        /* limit= */ Number.MAX_SAFE_INTEGER
      )
    )
    .then(changedDocs => {
      setMaxReadTime(localStoreImpl, collectionGroup, changedDocs);
      return changedDocs;
    });
}

/** Sets the collection group's maximum read time from the given documents. */
// PORTING NOTE: Multi-Tab only.
function setMaxReadTime(
  localStoreImpl: LocalStoreImpl,
  collectionGroup: string,
  changedDocs: SortedMap<DocumentKey, Document>
): void {
  let readTime =
    localStoreImpl.collectionGroupReadTime.get(collectionGroup) ||
    SnapshotVersion.min();
  changedDocs.forEach((_, doc) => {
    if (doc.readTime.compareTo(readTime) > 0) {
      readTime = doc.readTime;
    }
  });
  localStoreImpl.collectionGroupReadTime.set(collectionGroup, readTime);
}

/**
 * Creates a new target using the given bundle name, which will be used to
 * hold the keys of all documents from the bundle in query-document mappings.
 * This ensures that the loaded documents do not get garbage collected
 * right away.
 */
function umbrellaTarget(bundleName: string): Target {
  // It is OK that the path used for the query is not valid, because this will
  // not be read and queried.
  return queryToTarget(
    newQueryForPath(ResourcePath.fromString(`__bundle__/docs/${bundleName}`))
  );
}

/**
 * Applies the documents from a bundle to the "ground-state" (remote)
 * documents.
 *
 * LocalDocuments are re-calculated if there are remaining mutations in the
 * queue.
 */
export async function localStoreApplyBundledDocuments(
  localStore: LocalStore,
  bundleConverter: BundleConverter,
  documents: BundledDocuments,
  bundleName: string
): Promise<DocumentMap> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  let documentKeys = documentKeySet();
  let documentMap = mutableDocumentMap();
  for (const bundleDoc of documents) {
    const documentKey = bundleConverter.toDocumentKey(bundleDoc.metadata.name!);
    if (bundleDoc.document) {
      documentKeys = documentKeys.add(documentKey);
    }
    const doc = bundleConverter.toMutableDocument(bundleDoc);
    doc.setReadTime(
      bundleConverter.toSnapshotVersion(bundleDoc.metadata.readTime!)
    );
    documentMap = documentMap.insert(documentKey, doc);
  }

  const documentBuffer = localStoreImpl.remoteDocuments.newChangeBuffer({
    trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
  });

  // Allocates a target to hold all document keys from the bundle, such that
  // they will not get garbage collected right away.
  const umbrellaTargetData = await localStoreAllocateTarget(
    localStoreImpl,
    umbrellaTarget(bundleName)
  );
  return localStoreImpl.persistence.runTransaction(
    'Apply bundle documents',
    'readwrite',
    txn => {
      return populateDocumentChangeBuffer(txn, documentBuffer, documentMap)
        .next(documentChangeResult => {
          documentBuffer.apply(txn);
          return documentChangeResult;
        })
        .next(documentChangeResult => {
          return localStoreImpl.targetCache
            .removeMatchingKeysForTargetId(txn, umbrellaTargetData.targetId)
            .next(() =>
              localStoreImpl.targetCache.addMatchingKeys(
                txn,
                documentKeys,
                umbrellaTargetData.targetId
              )
            )
            .next(() =>
              localStoreImpl.localDocuments.getLocalViewOfDocuments(
                txn,
                documentChangeResult.changedDocuments,
                documentChangeResult.existenceChangedKeys
              )
            )
            .next(() => documentChangeResult.changedDocuments);
        });
    }
  );
}

/**
 * Returns a promise of a boolean to indicate if the given bundle has already
 * been loaded and the create time is newer than the current loading bundle.
 */
export function localStoreHasNewerBundle(
  localStore: LocalStore,
  bundleMetadata: BundleMetadata
): Promise<boolean> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const currentReadTime = fromVersion(bundleMetadata.createTime!);
  return localStoreImpl.persistence
    .runTransaction('hasNewerBundle', 'readonly', transaction => {
      return localStoreImpl.bundleCache.getBundleMetadata(
        transaction,
        bundleMetadata.id!
      );
    })
    .then(cached => {
      return !!cached && cached.createTime!.compareTo(currentReadTime) >= 0;
    });
}

/**
 * Saves the given `BundleMetadata` to local persistence.
 */
export function localStoreSaveBundle(
  localStore: LocalStore,
  bundleMetadata: BundleMetadata
): Promise<void> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Save bundle',
    'readwrite',
    transaction => {
      return localStoreImpl.bundleCache.saveBundleMetadata(
        transaction,
        bundleMetadata
      );
    }
  );
}

/**
 * Returns a promise of a `NamedQuery` associated with given query name. Promise
 * resolves to undefined if no persisted data can be found.
 */
export function localStoreGetNamedQuery(
  localStore: LocalStore,
  queryName: string
): Promise<NamedQuery | undefined> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Get named query',
    'readonly',
    transaction =>
      localStoreImpl.bundleCache.getNamedQuery(transaction, queryName)
  );
}

/**
 * Saves the given `NamedQuery` to local persistence.
 */
export async function localStoreSaveNamedQuery(
  localStore: LocalStore,
  query: ProtoNamedQuery,
  documents: DocumentKeySet = documentKeySet()
): Promise<void> {
  // Allocate a target for the named query such that it can be resumed
  // from associated read time if users use it to listen.
  // NOTE: this also means if no corresponding target exists, the new target
  // will remain active and will not get collected, unless users happen to
  // unlisten the query somehow.
  const allocated = await localStoreAllocateTarget(
    localStore,
    queryToTarget(fromBundledQuery(query.bundledQuery!))
  );

  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Save named query',
    'readwrite',
    transaction => {
      const readTime = fromVersion(query.readTime!);
      // Simply save the query itself if it is older than what the SDK already
      // has.
      if (allocated.snapshotVersion.compareTo(readTime) >= 0) {
        return localStoreImpl.bundleCache.saveNamedQuery(transaction, query);
      }

      // Update existing target data because the query from the bundle is newer.
      const newTargetData = allocated.withResumeToken(
        ByteString.EMPTY_BYTE_STRING,
        readTime
      );
      localStoreImpl.targetDataByTarget =
        localStoreImpl.targetDataByTarget.insert(
          newTargetData.targetId,
          newTargetData
        );
      return localStoreImpl.targetCache
        .updateTargetData(transaction, newTargetData)
        .next(() =>
          localStoreImpl.targetCache.removeMatchingKeysForTargetId(
            transaction,
            allocated.targetId
          )
        )
        .next(() =>
          localStoreImpl.targetCache.addMatchingKeys(
            transaction,
            documents,
            allocated.targetId
          )
        )
        .next(() =>
          localStoreImpl.bundleCache.saveNamedQuery(transaction, query)
        );
    }
  );
}

export async function localStoreConfigureFieldIndexes(
  localStore: LocalStore,
  newFieldIndexes: FieldIndex[]
): Promise<void> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const indexManager = localStoreImpl.indexManager;
  const promises: Array<PersistencePromise<void>> = [];
  return localStoreImpl.persistence.runTransaction(
    'Configure indexes',
    'readwrite',
    transaction =>
      indexManager
        .getFieldIndexes(transaction)
        .next(oldFieldIndexes =>
          diffArrays(
            oldFieldIndexes,
            newFieldIndexes,
            fieldIndexSemanticComparator,
            fieldIndex => {
              promises.push(
                indexManager.addFieldIndex(transaction, fieldIndex)
              );
            },
            fieldIndex => {
              promises.push(
                indexManager.deleteFieldIndex(transaction, fieldIndex)
              );
            }
          )
        )
        .next(() => PersistencePromise.waitFor(promises))
  );
}

export function localStoreSetIndexAutoCreationEnabled(
  localStore: LocalStore,
  isEnabled: boolean
): void {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  localStoreImpl.queryEngine.indexAutoCreationEnabled = isEnabled;
}

export function localStoreDeleteAllFieldIndexes(
  localStore: LocalStore
): Promise<void> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const indexManager = localStoreImpl.indexManager;
  return localStoreImpl.persistence.runTransaction(
    'Delete All Indexes',
    'readwrite',
    transaction => indexManager.deleteAllFieldIndexes(transaction)
  );
}

/**
 * Test-only hooks into the SDK for use exclusively by tests.
 */
export class TestingHooks {
  private constructor() {
    throw new Error('creating instances is not supported');
  }

  static setIndexAutoCreationSettings(
    localStore: LocalStore,
    settings: {
      indexAutoCreationMinCollectionSize?: number;
      relativeIndexReadCostPerDocument?: number;
    }
  ): void {
    const localStoreImpl = debugCast(localStore, LocalStoreImpl);
    if (settings.indexAutoCreationMinCollectionSize !== undefined) {
      localStoreImpl.queryEngine.indexAutoCreationMinCollectionSize =
        settings.indexAutoCreationMinCollectionSize;
    }
    if (settings.relativeIndexReadCostPerDocument !== undefined) {
      localStoreImpl.queryEngine.relativeIndexReadCostPerDocument =
        settings.relativeIndexReadCostPerDocument;
    }
  }
}
