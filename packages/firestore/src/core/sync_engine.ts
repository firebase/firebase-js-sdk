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

import { User } from '../auth/user';
import {
  getNewDocumentChanges,
  getCachedTarget,
  ignoreIfPrimaryLeaseLoss,
  LocalStore,
  getActiveClientsFromPersistence,
  lookupMutationDocuments,
  removeCachedMutationBatchMetadata
} from '../local/local_store';
import { LocalViewChanges } from '../local/local_view_changes';
import { ReferenceSet } from '../local/reference_set';
import { TargetData, TargetPurpose } from '../local/target_data';
import {
  documentKeySet,
  DocumentKeySet,
  MaybeDocumentMap
} from '../model/collections';
import { MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { BATCHID_UNKNOWN, MutationBatchResult } from '../model/mutation_batch';
import { RemoteEvent, TargetChange } from '../remote/remote_event';
import { RemoteStore } from '../remote/remote_store';
import { debugAssert, debugCast, fail, hardAssert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { logDebug } from '../util/log';
import { primitiveComparator } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { Deferred } from '../util/promise';
import { SortedMap } from '../util/sorted_map';

import { ClientId, SharedClientState } from '../local/shared_client_state';
import { QueryTargetState } from '../local/shared_client_state_syncer';
import { SortedSet } from '../util/sorted_set';
import { ListenSequence } from './listen_sequence';
import {
  canonifyQuery,
  LimitType,
  newQuery,
  newQueryForPath,
  Query,
  queryEquals,
  queryToTarget,
  stringifyQuery
} from './query';
import { SnapshotVersion } from './snapshot_version';
import { Target } from './target';
import { TargetIdGenerator } from './target_id_generator';
import {
  BatchId,
  MutationBatchState,
  OnlineState,
  OnlineStateSource,
  TargetId
} from './types';
import {
  AddedLimboDocument,
  LimboDocumentChange,
  RemovedLimboDocument,
  View,
  ViewChange
} from './view';
import { ViewSnapshot } from './view_snapshot';
import { wrapInUserErrorIfRecoverable } from '../util/async_queue';

const LOG_TAG = 'SyncEngine';

/**
 * QueryView contains all of the data that SyncEngine needs to keep track of for
 * a particular query.
 */
class QueryView {
  constructor(
    /**
     * The query itself.
     */
    public query: Query,
    /**
     * The target number created by the client that is used in the watch
     * stream to identify this query.
     */
    public targetId: TargetId,
    /**
     * The view is responsible for computing the final merged truth of what
     * docs are in the query. It gets notified of local and remote changes,
     * and applies the query filters and limits to determine the most correct
     * possible results.
     */
    public view: View
  ) {}
}

/** Tracks a limbo resolution. */
class LimboResolution {
  constructor(public key: DocumentKey) {}

  /**
   * Set to true once we've received a document. This is used in
   * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
   * decide whether it needs to manufacture a delete event for the target once
   * the target is CURRENT.
   */
  receivedDocument: boolean = false;
}

/**
 * A function that updates a QueryView with a set of document changes (and a
 * remote event if applicable).
 */
type ApplyDocChangesHandler = (
  queryView: QueryView,
  changes: MaybeDocumentMap,
  remoteEvent?: RemoteEvent
) => Promise<ViewSnapshot | undefined>;

/**
 * Interface implemented by EventManager to handle notifications from
 * SyncEngine.
 */
export interface SyncEngineListener {
  /** Handles new view snapshots. */
  onWatchChange(snapshots: ViewSnapshot[]): void;

  /** Handles the failure of a query. */
  onWatchError(query: Query, error: Error): void;

  /** Handles a change in online state. */
  onOnlineStateChange(onlineState: OnlineState): void;
}

/**
 * SyncEngine is the central controller in the client SDK architecture. It is
 * the glue code between the EventManager, LocalStore, and RemoteStore. Some of
 * SyncEngine's responsibilities include:
 * 1. Coordinating client requests and remote events between the EventManager
 *    and the local and remote data stores.
 * 2. Managing a View object for each query, providing the unified view between
 *    the local and remote data stores.
 * 3. Notifying the RemoteStore when the LocalStore has new mutations in its
 *    queue that need sending to the backend.
 *
 * The SyncEngine’s methods should only ever be called by methods running in the
 * global async queue.
 */
export interface SyncEngine {
  isPrimaryClient: boolean;

  /** Subscribes to SyncEngine notifications. Has to be called exactly once. */
  subscribe(syncEngineListener: SyncEngineListener): void;
}

/**
 * An implementation of `SyncEngine` coordinating with other parts of SDK.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */
class SyncEngineImpl implements SyncEngine {
  syncEngineListener: SyncEngineListener | null = null;

  /**
   * A callback that updates the QueryView based on the provided change.
   *
   * PORTING NOTE: On other platforms, this logic lives in
   * `emitNewSnapshotsAndNotifyLocalStore()`, but on Web it is extracted to
   *  ensure that all view logic only exists in bundles that include views.
   */
  applyDocChanges?: ApplyDocChangesHandler;

  queryViewsByQuery = new ObjectMap<Query, QueryView>(
    q => canonifyQuery(q),
    queryEquals
  );
  queriesByTarget = new Map<TargetId, Query[]>();
  /**
   * The keys of documents that are in limbo for which we haven't yet started a
   * limbo resolution query.
   */
  enqueuedLimboResolutions: DocumentKey[] = [];
  /**
   * Keeps track of the target ID for each document that is in limbo with an
   * active target.
   */
  activeLimboTargetsByKey = new SortedMap<DocumentKey, TargetId>(
    DocumentKey.comparator
  );
  /**
   * Keeps track of the information about an active limbo resolution for each
   * active target ID that was started for the purpose of limbo resolution.
   */
  activeLimboResolutionsByTarget = new Map<TargetId, LimboResolution>();
  limboDocumentRefs = new ReferenceSet();
  /** Stores user completion handlers, indexed by User and BatchId. */
  mutationUserCallbacks = {} as {
    [uidKey: string]: SortedMap<BatchId, Deferred<void>>;
  };
  /** Stores user callbacks waiting for all pending writes to be acknowledged. */
  pendingWritesCallbacks = new Map<BatchId, Array<Deferred<void>>>();
  limboTargetIdGenerator = TargetIdGenerator.forSyncEngine();

  onlineState = OnlineState.Unknown;

  // The primary state is set to `true` or `false` immediately after Firestore
  // startup. In the interim, a client should only be considered primary if
  // `isPrimary` is true.
  _isPrimaryClient: undefined | boolean = undefined;

  constructor(
    public localStore: LocalStore,
    public remoteStore: RemoteStore,
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    public sharedClientState: SharedClientState,
    public currentUser: User,
    public maxConcurrentLimboResolutions: number
  ) {}

  get isPrimaryClient(): boolean {
    return this._isPrimaryClient === true;
  }

  subscribe(syncEngineListener: SyncEngineListener): void {
    debugAssert(
      syncEngineListener !== null,
      'SyncEngine listener cannot be null'
    );
    debugAssert(
      this.syncEngineListener === null,
      'SyncEngine already has a subscriber.'
    );

    this.syncEngineListener = syncEngineListener;
  }

  assertSubscribed(fnName: string): void {
    debugAssert(
      this.syncEngineListener !== null,
      'Trying to call ' + fnName + ' before calling subscribe().'
    );
  }
}

export function newSyncEngine(
  localStore: LocalStore,
  remoteStore: RemoteStore,
  // PORTING NOTE: Manages state synchronization in multi-tab environments.
  sharedClientState: SharedClientState,
  currentUser: User,
  maxConcurrentLimboResolutions: number,
  isPrimary: boolean
): SyncEngine {
  const syncEngine = new SyncEngineImpl(
    localStore,
    remoteStore,
    sharedClientState,
    currentUser,
    maxConcurrentLimboResolutions
  );
  if (isPrimary) {
    syncEngine._isPrimaryClient = true;
  }
  return syncEngine;
}

/**
 * Initiates the new listen, resolves promise when listen enqueued to the
 * server. All the subsequent view snapshots or errors are sent to the
 * subscribed handlers. Returns the initial snapshot.
 */
export async function syncEngineListen(
  syncEngine: SyncEngine,
  query: Query
): Promise<ViewSnapshot> {
  const syncEngineImpl = ensureWatchCallbacks(syncEngine);
  syncEngineImpl.assertSubscribed('listen()');

  let targetId;
  let viewSnapshot;

  const queryView = syncEngineImpl.queryViewsByQuery.get(query);
  if (queryView) {
    // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
    // already exists when EventManager calls us for the first time. This
    // happens when the primary tab is already listening to this query on
    // behalf of another tab and the user of the primary also starts listening
    // to the query. EventManager will not have an assigned target ID in this
    // case and calls `listen` to obtain this ID.
    targetId = queryView.targetId;
    syncEngineImpl.sharedClientState.addLocalQueryTarget(targetId);
    viewSnapshot = queryView.view.computeInitialSnapshot();
  } else {
    const targetData = await syncEngineImpl.localStore.allocateTarget(
      queryToTarget(query)
    );

    const status = syncEngineImpl.sharedClientState.addLocalQueryTarget(
      targetData.targetId
    );
    targetId = targetData.targetId;
    viewSnapshot = await initializeViewAndComputeSnapshot(
      syncEngineImpl,
      query,
      targetId,
      status === 'current'
    );
    if (syncEngineImpl.isPrimaryClient) {
      syncEngineImpl.remoteStore.listen(targetData);
    }
  }

  return viewSnapshot;
}

/**
 * Registers a view for a previously unknown query and computes its initial
 * snapshot.
 */
async function initializeViewAndComputeSnapshot(
  syncEngineImpl: SyncEngineImpl,
  query: Query,
  targetId: TargetId,
  current: boolean
): Promise<ViewSnapshot> {
  // PORTING NOTE: On Web only, we inject the code that registers new Limbo
  // targets based on view changes. This allows us to only depend on Limbo
  // changes when user code includes queries.
  syncEngineImpl.applyDocChanges = (queryView, changes, remoteEvent) =>
    applyDocChanges(syncEngineImpl, queryView, changes, remoteEvent);

  const queryResult = await syncEngineImpl.localStore.executeQuery(
    query,
    /* usePreviousResults= */ true
  );
  const view = new View(query, queryResult.remoteKeys);
  const viewDocChanges = view.computeDocChanges(queryResult.documents);
  const synthesizedTargetChange = TargetChange.createSynthesizedTargetChangeForCurrentChange(
    targetId,
    current && syncEngineImpl.onlineState !== OnlineState.Offline
  );
  const viewChange = view.applyChanges(
    viewDocChanges,
    /* updateLimboDocuments= */ syncEngineImpl.isPrimaryClient,
    synthesizedTargetChange
  );
  updateTrackedLimbos(syncEngineImpl, targetId, viewChange.limboChanges);

  debugAssert(
    !!viewChange.snapshot,
    'applyChanges for new view should always return a snapshot'
  );

  const data = new QueryView(query, targetId, view);

  syncEngineImpl.queryViewsByQuery.set(query, data);
  if (syncEngineImpl.queriesByTarget.has(targetId)) {
    syncEngineImpl.queriesByTarget.get(targetId)!.push(query);
  } else {
    syncEngineImpl.queriesByTarget.set(targetId, [query]);
  }

  return viewChange.snapshot;
}

/** Stops listening to the query. */
export async function syncEngineUnlisten(
  syncEngine: SyncEngine,
  query: Query
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.assertSubscribed('unlisten()');

  const queryView = syncEngineImpl.queryViewsByQuery.get(query)!;
  debugAssert(
    !!queryView,
    'Trying to unlisten on query not found:' + stringifyQuery(query)
  );

  // Only clean up the query view and target if this is the only query mapped
  // to the target.
  const queries = syncEngineImpl.queriesByTarget.get(queryView.targetId)!;
  if (queries.length > 1) {
    syncEngineImpl.queriesByTarget.set(
      queryView.targetId,
      queries.filter(q => !queryEquals(q, query))
    );
    syncEngineImpl.queryViewsByQuery.delete(query);
    return;
  }

  // No other queries are mapped to the target, clean up the query and the target.
  if (syncEngineImpl.isPrimaryClient) {
    // We need to remove the local query target first to allow us to verify
    // whether any other client is still interested in this target.
    syncEngineImpl.sharedClientState.removeLocalQueryTarget(queryView.targetId);
    const targetRemainsActive = syncEngineImpl.sharedClientState.isActiveQueryTarget(
      queryView.targetId
    );

    if (!targetRemainsActive) {
      await syncEngineImpl.localStore
        .releaseTarget(queryView.targetId, /*keepPersistedTargetData=*/ false)
        .then(() => {
          syncEngineImpl.sharedClientState.clearQueryState(queryView.targetId);
          syncEngineImpl.remoteStore.unlisten(queryView.targetId);
          removeAndCleanupTarget(syncEngineImpl, queryView.targetId);
        })
        .catch(ignoreIfPrimaryLeaseLoss);
    }
  } else {
    removeAndCleanupTarget(syncEngineImpl, queryView.targetId);
    await syncEngineImpl.localStore.releaseTarget(
      queryView.targetId,
      /*keepPersistedTargetData=*/ true
    );
  }
}

/**
 * Initiates the write of local mutation batch which involves adding the
 * writes to the mutation queue, notifying the remote store about new
 * mutations and raising events for any changes this write caused.
 *
 * The promise returned by this call is resolved when the above steps
 * have completed, *not* when the write was acked by the backend. The
 * userCallback is resolved once the write was acked/rejected by the
 * backend (or failed locally for any other reason).
 */
export async function syncEngineWrite(
  syncEngine: SyncEngine,
  batch: Mutation[],
  userCallback: Deferred<void>
): Promise<void> {
  const syncEngineImpl = ensureWriteCallbacks(syncEngine);
  syncEngineImpl.assertSubscribed('write()');

  try {
    const result = await syncEngineImpl.localStore.localWrite(batch);
    syncEngineImpl.sharedClientState.addPendingMutation(result.batchId);
    addMutationCallback(syncEngineImpl, result.batchId, userCallback);
    await emitNewSnapsAndNotifyLocalStore(syncEngineImpl, result.changes);
    await syncEngineImpl.remoteStore.fillWritePipeline();
  } catch (e) {
    // If we can't persist the mutation, we reject the user callback and
    // don't send the mutation. The user can then retry the write.
    const error = wrapInUserErrorIfRecoverable(e, `Failed to persist write`);
    userCallback.reject(error);
  }
}

/**
 * Applies one remote event to the sync engine, notifying any views of the
 * changes, and releasing any pending mutation batches that would become
 * visible because of the snapshot version the remote event contains.
 */
export async function applyRemoteEvent(
  syncEngine: SyncEngine,
  remoteEvent: RemoteEvent
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.assertSubscribed('applyRemoteEvent()');
  try {
    const changes = await syncEngineImpl.localStore.applyRemoteEvent(
      remoteEvent
    );
    // Update `receivedDocument` as appropriate for any limbo targets.
    remoteEvent.targetChanges.forEach((targetChange, targetId) => {
      const limboResolution = syncEngineImpl.activeLimboResolutionsByTarget.get(
        targetId
      );
      if (limboResolution) {
        // Since this is a limbo resolution lookup, it's for a single document
        // and it could be added, modified, or removed, but not a combination.
        hardAssert(
          targetChange.addedDocuments.size +
            targetChange.modifiedDocuments.size +
            targetChange.removedDocuments.size <=
            1,
          'Limbo resolution for single document contains multiple changes.'
        );
        if (targetChange.addedDocuments.size > 0) {
          limboResolution.receivedDocument = true;
        } else if (targetChange.modifiedDocuments.size > 0) {
          hardAssert(
            limboResolution.receivedDocument,
            'Received change for limbo target document without add.'
          );
        } else if (targetChange.removedDocuments.size > 0) {
          hardAssert(
            limboResolution.receivedDocument,
            'Received remove for limbo target document without add.'
          );
          limboResolution.receivedDocument = false;
        } else {
          // This was probably just a CURRENT targetChange or similar.
        }
      }
    });
    await emitNewSnapsAndNotifyLocalStore(syncEngineImpl, changes, remoteEvent);
  } catch (error) {
    await ignoreIfPrimaryLeaseLoss(error);
  }
}

/**
 * Applies an OnlineState change to the sync engine and notifies any views of
 * the change.
 */
export function applyOnlineStateChange(
  syncEngine: SyncEngine,
  onlineState: OnlineState,
  source: OnlineStateSource
): void {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  // If we are the secondary client, we explicitly ignore the remote store's
  // online state (the local client may go offline, even though the primary
  // tab remains online) and only apply the primary tab's online state from
  // SharedClientState.
  if (
    (syncEngineImpl.isPrimaryClient &&
      source === OnlineStateSource.RemoteStore) ||
    (!syncEngineImpl.isPrimaryClient &&
      source === OnlineStateSource.SharedClientState)
  ) {
    syncEngineImpl.assertSubscribed('applyOnlineStateChange()');
    const newViewSnapshots = [] as ViewSnapshot[];
    syncEngineImpl.queryViewsByQuery.forEach((query, queryView) => {
      const viewChange = queryView.view.applyOnlineStateChange(onlineState);
      debugAssert(
        viewChange.limboChanges.length === 0,
        'OnlineState should not affect limbo documents.'
      );
      if (viewChange.snapshot) {
        newViewSnapshots.push(viewChange.snapshot);
      }
    });
    syncEngineImpl.syncEngineListener!.onOnlineStateChange(onlineState);
    syncEngineImpl.syncEngineListener!.onWatchChange(newViewSnapshots);
    syncEngineImpl.onlineState = onlineState;
    if (syncEngineImpl.isPrimaryClient) {
      syncEngineImpl.sharedClientState.setOnlineState(onlineState);
    }
  }
}

/**
 * Rejects the listen for the given targetID. This can be triggered by the
 * backend for any active target.
 *
 * @param syncEngine The sync engine implementation.
 * @param targetId The targetID corresponds to one previously initiated by the
 * user as part of TargetData passed to listen() on RemoteStore.
 * @param err A description of the condition that has forced the rejection.
 * Nearly always this will be an indication that the user is no longer
 * authorized to see the data matching the target.
 */
export async function rejectListen(
  syncEngine: SyncEngine,
  targetId: TargetId,
  err: FirestoreError
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.assertSubscribed('rejectListens()');

  // PORTING NOTE: Multi-tab only.
  syncEngineImpl.sharedClientState.updateQueryState(targetId, 'rejected', err);

  const limboResolution = syncEngineImpl.activeLimboResolutionsByTarget.get(
    targetId
  );
  const limboKey = limboResolution && limboResolution.key;
  if (limboKey) {
    // TODO(klimt): We really only should do the following on permission
    // denied errors, but we don't have the cause code here.

    // It's a limbo doc. Create a synthetic event saying it was deleted.
    // This is kind of a hack. Ideally, we would have a method in the local
    // store to purge a document. However, it would be tricky to keep all of
    // the local store's invariants with another method.
    let documentUpdates = new SortedMap<DocumentKey, MaybeDocument>(
      DocumentKey.comparator
    );
    documentUpdates = documentUpdates.insert(
      limboKey,
      new NoDocument(limboKey, SnapshotVersion.min())
    );
    const resolvedLimboDocuments = documentKeySet().add(limboKey);
    const event = new RemoteEvent(
      SnapshotVersion.min(),
      /* targetChanges= */ new Map<TargetId, TargetChange>(),
      /* targetMismatches= */ new SortedSet<TargetId>(primitiveComparator),
      documentUpdates,
      resolvedLimboDocuments
    );

    await applyRemoteEvent(syncEngineImpl, event);

    // Since this query failed, we won't want to manually unlisten to it.
    // We only remove it from bookkeeping after we successfully applied the
    // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
    // this query when the RemoteStore restarts the Watch stream, which should
    // re-trigger the target failure.
    syncEngineImpl.activeLimboTargetsByKey = syncEngineImpl.activeLimboTargetsByKey.remove(
      limboKey
    );
    syncEngineImpl.activeLimboResolutionsByTarget.delete(targetId);
    pumpEnqueuedLimboResolutions(syncEngineImpl);
  } else {
    await syncEngineImpl.localStore
      .releaseTarget(targetId, /* keepPersistedTargetData */ false)
      .then(() => removeAndCleanupTarget(syncEngineImpl, targetId, err))
      .catch(ignoreIfPrimaryLeaseLoss);
  }
}

export async function applySuccessfulWrite(
  syncEngine: SyncEngine,
  mutationBatchResult: MutationBatchResult
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.assertSubscribed('applySuccessfulWrite()');

  const batchId = mutationBatchResult.batch.batchId;

  try {
    const changes = await syncEngineImpl.localStore.acknowledgeBatch(
      mutationBatchResult
    );

    // The local store may or may not be able to apply the write result and
    // raise events immediately (depending on whether the watcher is caught
    // up), so we raise user callbacks first so that they consistently happen
    // before listen events.
    processUserCallback(syncEngineImpl, batchId, /*error=*/ null);
    triggerPendingWritesCallbacks(syncEngineImpl, batchId);

    syncEngineImpl.sharedClientState.updateMutationState(
      batchId,
      'acknowledged'
    );
    await emitNewSnapsAndNotifyLocalStore(syncEngineImpl, changes);
  } catch (error) {
    await ignoreIfPrimaryLeaseLoss(error);
  }
}

export async function rejectFailedWrite(
  syncEngine: SyncEngine,
  batchId: BatchId,
  error: FirestoreError
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.assertSubscribed('rejectFailedWrite()');

  try {
    const changes = await syncEngineImpl.localStore.rejectBatch(batchId);

    // The local store may or may not be able to apply the write result and
    // raise events immediately (depending on whether the watcher is caught up),
    // so we raise user callbacks first so that they consistently happen before
    // listen events.
    processUserCallback(syncEngineImpl, batchId, error);
    triggerPendingWritesCallbacks(syncEngineImpl, batchId);

    syncEngineImpl.sharedClientState.updateMutationState(
      batchId,
      'rejected',
      error
    );
    await emitNewSnapsAndNotifyLocalStore(syncEngineImpl, changes);
  } catch (error) {
    await ignoreIfPrimaryLeaseLoss(error);
  }
}

/**
 * Registers a user callback that resolves when all pending mutations at the moment of calling
 * are acknowledged .
 */
export async function registerPendingWritesCallback(
  syncEngine: SyncEngine,
  callback: Deferred<void>
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  if (!syncEngineImpl.remoteStore.canUseNetwork()) {
    logDebug(
      LOG_TAG,
      'The network is disabled. The task returned by ' +
        "'awaitPendingWrites()' will not complete until the network is enabled."
    );
  }

  try {
    const highestBatchId = await syncEngineImpl.localStore.getHighestUnacknowledgedBatchId();
    if (highestBatchId === BATCHID_UNKNOWN) {
      // Trigger the callback right away if there is no pending writes at the moment.
      callback.resolve();
      return;
    }

    const callbacks =
      syncEngineImpl.pendingWritesCallbacks.get(highestBatchId) || [];
    callbacks.push(callback);
    syncEngineImpl.pendingWritesCallbacks.set(highestBatchId, callbacks);
  } catch (e) {
    const firestoreError = wrapInUserErrorIfRecoverable(
      e,
      'Initialization of waitForPendingWrites() operation failed'
    );
    callback.reject(firestoreError);
  }
}

/**
 * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
 * if there are any.
 */
function triggerPendingWritesCallbacks(
  syncEngineImpl: SyncEngineImpl,
  batchId: BatchId
): void {
  (syncEngineImpl.pendingWritesCallbacks.get(batchId) || []).forEach(
    callback => {
      callback.resolve();
    }
  );

  syncEngineImpl.pendingWritesCallbacks.delete(batchId);
}

/** Reject all outstanding callbacks waiting for pending writes to complete. */
function rejectOutstandingPendingWritesCallbacks(
  syncEngineImpl: SyncEngineImpl,
  errorMessage: string
): void {
  syncEngineImpl.pendingWritesCallbacks.forEach(callbacks => {
    callbacks.forEach(callback => {
      callback.reject(new FirestoreError(Code.CANCELLED, errorMessage));
    });
  });

  syncEngineImpl.pendingWritesCallbacks.clear();
}

function addMutationCallback(
  syncEngineImpl: SyncEngineImpl,
  batchId: BatchId,
  callback: Deferred<void>
): void {
  let newCallbacks =
    syncEngineImpl.mutationUserCallbacks[syncEngineImpl.currentUser.toKey()];
  if (!newCallbacks) {
    newCallbacks = new SortedMap<BatchId, Deferred<void>>(primitiveComparator);
  }
  newCallbacks = newCallbacks.insert(batchId, callback);
  syncEngineImpl.mutationUserCallbacks[
    syncEngineImpl.currentUser.toKey()
  ] = newCallbacks;
}

/**
 * Resolves or rejects the user callback for the given batch and then discards
 * it.
 */
export function processUserCallback(
  syncEngine: SyncEngine,
  batchId: BatchId,
  error: Error | null
): void {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  let newCallbacks =
    syncEngineImpl.mutationUserCallbacks[syncEngineImpl.currentUser.toKey()];

  // NOTE: Mutations restored from persistence won't have callbacks, so it's
  // okay for there to be no callback for this ID.
  if (newCallbacks) {
    const callback = newCallbacks.get(batchId);
    if (callback) {
      debugAssert(
        batchId === newCallbacks.minKey(),
        'Mutation callbacks processed out-of-order?'
      );
      if (error) {
        callback.reject(error);
      } else {
        callback.resolve();
      }
      newCallbacks = newCallbacks.remove(batchId);
    }
    syncEngineImpl.mutationUserCallbacks[
      syncEngineImpl.currentUser.toKey()
    ] = newCallbacks;
  }
}

function removeAndCleanupTarget(
  syncEngineImpl: SyncEngineImpl,
  targetId: number,
  error: Error | null = null
): void {
  syncEngineImpl.sharedClientState.removeLocalQueryTarget(targetId);

  debugAssert(
    syncEngineImpl.queriesByTarget.has(targetId) &&
      syncEngineImpl.queriesByTarget.get(targetId)!.length !== 0,
    `There are no queries mapped to target id ${targetId}`
  );

  for (const query of syncEngineImpl.queriesByTarget.get(targetId)!) {
    syncEngineImpl.queryViewsByQuery.delete(query);
    if (error) {
      syncEngineImpl.syncEngineListener!.onWatchError(query, error);
    }
  }

  syncEngineImpl.queriesByTarget.delete(targetId);

  if (syncEngineImpl.isPrimaryClient) {
    const limboKeys = syncEngineImpl.limboDocumentRefs.removeReferencesForId(
      targetId
    );
    limboKeys.forEach(limboKey => {
      const isReferenced = syncEngineImpl.limboDocumentRefs.containsKey(
        limboKey
      );
      if (!isReferenced) {
        // We removed the last reference for this key
        removeLimboTarget(syncEngineImpl, limboKey);
      }
    });
  }
}

function removeLimboTarget(
  syncEngineImpl: SyncEngineImpl,
  key: DocumentKey
): void {
  // It's possible that the target already got removed because the query failed. In that case,
  // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
  const limboTargetId = syncEngineImpl.activeLimboTargetsByKey.get(key);
  if (limboTargetId === null) {
    // This target already got removed, because the query failed.
    return;
  }

  syncEngineImpl.remoteStore.unlisten(limboTargetId);
  syncEngineImpl.activeLimboTargetsByKey = syncEngineImpl.activeLimboTargetsByKey.remove(
    key
  );
  syncEngineImpl.activeLimboResolutionsByTarget.delete(limboTargetId);
  pumpEnqueuedLimboResolutions(syncEngineImpl);
}

function updateTrackedLimbos(
  syncEngineImpl: SyncEngineImpl,
  targetId: TargetId,
  limboChanges: LimboDocumentChange[]
): void {
  for (const limboChange of limboChanges) {
    if (limboChange instanceof AddedLimboDocument) {
      syncEngineImpl.limboDocumentRefs.addReference(limboChange.key, targetId);
      trackLimboChange(syncEngineImpl, limboChange);
    } else if (limboChange instanceof RemovedLimboDocument) {
      logDebug(LOG_TAG, 'Document no longer in limbo: ' + limboChange.key);
      syncEngineImpl.limboDocumentRefs.removeReference(
        limboChange.key,
        targetId
      );
      const isReferenced = syncEngineImpl.limboDocumentRefs.containsKey(
        limboChange.key
      );
      if (!isReferenced) {
        // We removed the last reference for this key
        removeLimboTarget(syncEngineImpl, limboChange.key);
      }
    } else {
      fail('Unknown limbo change: ' + JSON.stringify(limboChange));
    }
  }
}

function trackLimboChange(
  syncEngineImpl: SyncEngineImpl,
  limboChange: AddedLimboDocument
): void {
  const key = limboChange.key;
  if (!syncEngineImpl.activeLimboTargetsByKey.get(key)) {
    logDebug(LOG_TAG, 'New document in limbo: ' + key);
    syncEngineImpl.enqueuedLimboResolutions.push(key);
    pumpEnqueuedLimboResolutions(syncEngineImpl);
  }
}

/**
 * Starts listens for documents in limbo that are enqueued for resolution,
 * subject to a maximum number of concurrent resolutions.
 *
 * Without bounding the number of concurrent resolutions, the server can fail
 * with "resource exhausted" errors which can lead to pathological client
 * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
 */
function pumpEnqueuedLimboResolutions(syncEngineImpl: SyncEngineImpl): void {
  while (
    syncEngineImpl.enqueuedLimboResolutions.length > 0 &&
    syncEngineImpl.activeLimboTargetsByKey.size <
      syncEngineImpl.maxConcurrentLimboResolutions
  ) {
    const key = syncEngineImpl.enqueuedLimboResolutions.shift()!;
    const limboTargetId = syncEngineImpl.limboTargetIdGenerator.next();
    syncEngineImpl.activeLimboResolutionsByTarget.set(
      limboTargetId,
      new LimboResolution(key)
    );
    syncEngineImpl.activeLimboTargetsByKey = syncEngineImpl.activeLimboTargetsByKey.insert(
      key,
      limboTargetId
    );
    syncEngineImpl.remoteStore.listen(
      new TargetData(
        queryToTarget(newQueryForPath(key.path)),
        limboTargetId,
        TargetPurpose.LimboResolution,
        ListenSequence.INVALID
      )
    );
  }
}

// Visible for testing
export function activeLimboDocumentResolutions(
  syncEngine: SyncEngine
): SortedMap<DocumentKey, TargetId> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  return syncEngineImpl.activeLimboTargetsByKey;
}

// Visible for testing
export function enqueuedLimboDocumentResolutions(
  syncEngine: SyncEngine
): DocumentKey[] {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  return syncEngineImpl.enqueuedLimboResolutions;
}

export async function emitNewSnapsAndNotifyLocalStore(
  syncEngine: SyncEngine,
  changes: MaybeDocumentMap,
  remoteEvent?: RemoteEvent
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  const newSnaps: ViewSnapshot[] = [];
  const docChangesInAllViews: LocalViewChanges[] = [];
  const queriesProcessed: Array<Promise<void>> = [];

  syncEngineImpl.queryViewsByQuery.forEach((_, queryView) => {
    debugAssert(
      !!syncEngineImpl.applyDocChanges,
      'ApplyDocChangesHandler not set'
    );
    queriesProcessed.push(
      syncEngineImpl
        .applyDocChanges(queryView, changes, remoteEvent)
        .then(viewSnapshot => {
          if (viewSnapshot) {
            if (syncEngineImpl.isPrimaryClient) {
              syncEngineImpl.sharedClientState.updateQueryState(
                queryView.targetId,
                viewSnapshot.fromCache ? 'not-current' : 'current'
              );
            }
            newSnaps.push(viewSnapshot);
            const docChanges = LocalViewChanges.fromSnapshot(
              queryView.targetId,
              viewSnapshot
            );
            docChangesInAllViews.push(docChanges);
          }
        })
    );
  });

  await Promise.all(queriesProcessed);
  syncEngineImpl.syncEngineListener!.onWatchChange(newSnaps);
  await syncEngineImpl.localStore.notifyLocalViewChanges(docChangesInAllViews);
}

async function applyDocChanges(
  syncEngineImpl: SyncEngineImpl,
  queryView: QueryView,
  changes: MaybeDocumentMap,
  remoteEvent?: RemoteEvent
): Promise<ViewSnapshot | undefined> {
  let viewDocChanges = queryView.view.computeDocChanges(changes);
  if (viewDocChanges.needsRefill) {
    // The query has a limit and some docs were removed, so we need
    // to re-run the query against the local store to make sure we
    // didn't lose any good docs that had been past the limit.
    viewDocChanges = await syncEngineImpl.localStore
      .executeQuery(queryView.query, /* usePreviousResults= */ false)
      .then(({ documents }) => {
        return queryView.view.computeDocChanges(documents, viewDocChanges);
      });
  }

  const targetChange =
    remoteEvent && remoteEvent.targetChanges.get(queryView.targetId);
  const viewChange = queryView.view.applyChanges(
    viewDocChanges,
    /* updateLimboDocuments= */ syncEngineImpl.isPrimaryClient,
    targetChange
  );
  updateTrackedLimbos(
    syncEngineImpl,
    queryView.targetId,
    viewChange.limboChanges
  );
  return viewChange.snapshot;
}

export async function handleCredentialChange(
  syncEngine: SyncEngine,
  user: User
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  const userChanged = !syncEngineImpl.currentUser.isEqual(user);

  if (userChanged) {
    logDebug(LOG_TAG, 'User change. New user:', user.toKey());

    const result = await syncEngineImpl.localStore.handleUserChange(user);
    syncEngineImpl.currentUser = user;

    // Fails tasks waiting for pending writes requested by previous user.
    rejectOutstandingPendingWritesCallbacks(
      syncEngineImpl,
      "'waitForPendingWrites' promise is rejected due to a user change."
    );
    // TODO(b/114226417): Consider calling this only in the primary tab.
    syncEngineImpl.sharedClientState.handleUserChange(
      user,
      result.removedBatchIds,
      result.addedBatchIds
    );
    await emitNewSnapsAndNotifyLocalStore(
      syncEngineImpl,
      result.affectedDocuments
    );
  }
}

export function getRemoteKeysForTarget(
  syncEngine: SyncEngine,
  targetId: TargetId
): DocumentKeySet {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  const limboResolution = syncEngineImpl.activeLimboResolutionsByTarget.get(
    targetId
  );
  if (limboResolution && limboResolution.receivedDocument) {
    return documentKeySet().add(limboResolution.key);
  } else {
    let keySet = documentKeySet();
    const queries = syncEngineImpl.queriesByTarget.get(targetId);
    if (!queries) {
      return keySet;
    }
    for (const query of queries) {
      const queryView = syncEngineImpl.queryViewsByQuery.get(query);
      debugAssert(
        !!queryView,
        `No query view found for ${stringifyQuery(query)}`
      );
      keySet = keySet.unionWith(queryView.view.syncedDocuments);
    }
    return keySet;
  }
}

/**
 * Reconcile the list of synced documents in an existing view with those
 * from persistence.
 */
async function synchronizeViewAndComputeSnapshot(
  syncEngine: SyncEngine,
  queryView: QueryView
): Promise<ViewChange> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  const queryResult = await syncEngineImpl.localStore.executeQuery(
    queryView.query,
    /* usePreviousResults= */ true
  );
  const viewSnapshot = queryView.view.synchronizeWithPersistedState(
    queryResult
  );
  if (syncEngineImpl.isPrimaryClient) {
    updateTrackedLimbos(
      syncEngineImpl,
      queryView.targetId,
      viewSnapshot.limboChanges
    );
  }
  return viewSnapshot;
}

/** Applies a mutation state to an existing batch.  */
// PORTING NOTE: Multi-Tab only.
export async function applyBatchState(
  syncEngine: SyncEngine,
  batchId: BatchId,
  batchState: MutationBatchState,
  error?: FirestoreError
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.assertSubscribed('applyBatchState()');
  const documents = await lookupMutationDocuments(
    syncEngineImpl.localStore,
    batchId
  );

  if (documents === null) {
    // A throttled tab may not have seen the mutation before it was completed
    // and removed from the mutation queue, in which case we won't have cached
    // the affected documents. In this case we can safely ignore the update
    // since that means we didn't apply the mutation locally at all (if we
    // had, we would have cached the affected documents), and so we will just
    // see any resulting document changes via normal remote document updates
    // as applicable.
    logDebug(LOG_TAG, 'Cannot apply mutation batch with id: ' + batchId);
    return;
  }

  if (batchState === 'pending') {
    // If we are the primary client, we need to send this write to the
    // backend. Secondary clients will ignore these writes since their remote
    // connection is disabled.
    await syncEngineImpl.remoteStore.fillWritePipeline();
  } else if (batchState === 'acknowledged' || batchState === 'rejected') {
    // NOTE: Both these methods are no-ops for batches that originated from
    // other clients.
    processUserCallback(syncEngineImpl, batchId, error ? error : null);
    removeCachedMutationBatchMetadata(syncEngineImpl.localStore, batchId);
  } else {
    fail(`Unknown batchState: ${batchState}`);
  }

  await emitNewSnapsAndNotifyLocalStore(syncEngineImpl, documents);
}

/** Applies a query target change from a different tab. */
// PORTING NOTE: Multi-Tab only.
export async function applyPrimaryState(
  syncEngine: SyncEngine,
  isPrimary: boolean
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  ensureWatchCallbacks(syncEngineImpl);
  ensureWriteCallbacks(syncEngineImpl);
  if (isPrimary === true && syncEngineImpl._isPrimaryClient !== true) {
    // Secondary tabs only maintain Views for their local listeners and the
    // Views internal state may not be 100% populated (in particular
    // secondary tabs don't track syncedDocuments, the set of documents the
    // server considers to be in the target). So when a secondary becomes
    // primary, we need to need to make sure that all views for all targets
    // match the state on disk.
    const activeTargets = syncEngineImpl.sharedClientState.getAllActiveQueryTargets();
    const activeQueries = await synchronizeQueryViewsAndRaiseSnapshots(
      syncEngineImpl,
      activeTargets.toArray(),
      /*transitionToPrimary=*/ true
    );
    syncEngineImpl._isPrimaryClient = true;
    await syncEngineImpl.remoteStore.applyPrimaryState(true);
    for (const targetData of activeQueries) {
      syncEngineImpl.remoteStore.listen(targetData);
    }
  } else if (isPrimary === false && syncEngineImpl._isPrimaryClient !== false) {
    const activeTargets: TargetId[] = [];

    let p = Promise.resolve();
    syncEngineImpl.queriesByTarget.forEach((_, targetId) => {
      if (syncEngineImpl.sharedClientState.isLocalQueryTarget(targetId)) {
        activeTargets.push(targetId);
      } else {
        p = p.then(() => {
          removeAndCleanupTarget(syncEngineImpl, targetId);
          return syncEngineImpl.localStore.releaseTarget(
            targetId,
            /*keepPersistedTargetData=*/ true
          );
        });
      }
      syncEngineImpl.remoteStore.unlisten(targetId);
    });
    await p;

    await synchronizeQueryViewsAndRaiseSnapshots(
      syncEngineImpl,
      activeTargets,
      /*transitionToPrimary=*/ false
    );
    resetLimboDocuments(syncEngineImpl);
    syncEngineImpl._isPrimaryClient = false;
    await syncEngineImpl.remoteStore.applyPrimaryState(false);
  }
}

// PORTING NOTE: Multi-Tab only.
function resetLimboDocuments(syncEngine: SyncEngine): void {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.activeLimboResolutionsByTarget.forEach((_, targetId) => {
    syncEngineImpl.remoteStore.unlisten(targetId);
  });
  syncEngineImpl.limboDocumentRefs.removeAllReferences();
  syncEngineImpl.activeLimboResolutionsByTarget = new Map<
    TargetId,
    LimboResolution
  >();
  syncEngineImpl.activeLimboTargetsByKey = new SortedMap<DocumentKey, TargetId>(
    DocumentKey.comparator
  );
}

/**
 * Reconcile the query views of the provided query targets with the state from
 * persistence. Raises snapshots for any changes that affect the local
 * client and returns the updated state of all target's query data.
 *
 * @param syncEngine the SyncEngine to operate on
 * @param targets the list of targets with views that need to be recomputed
 * @param transitionToPrimary `true` iff the tab transitions from a secondary
 * tab to a primary tab
 */
// PORTING NOTE: Multi-Tab only.
async function synchronizeQueryViewsAndRaiseSnapshots(
  syncEngine: SyncEngine,
  targets: TargetId[],
  transitionToPrimary: boolean
): Promise<TargetData[]> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  const activeQueries: TargetData[] = [];
  const newViewSnapshots: ViewSnapshot[] = [];
  for (const targetId of targets) {
    let targetData: TargetData;
    const queries = syncEngineImpl.queriesByTarget.get(targetId);

    if (queries && queries.length !== 0) {
      // For queries that have a local View, we fetch their current state
      // from LocalStore (as the resume token and the snapshot version
      // might have changed) and reconcile their views with the persisted
      // state (the list of syncedDocuments may have gotten out of sync).
      targetData = await syncEngineImpl.localStore.allocateTarget(
        queryToTarget(queries[0])
      );

      for (const query of queries) {
        const queryView = syncEngineImpl.queryViewsByQuery.get(query);
        debugAssert(
          !!queryView,
          `No query view found for ${stringifyQuery(query)}`
        );

        const viewChange = await synchronizeViewAndComputeSnapshot(
          syncEngineImpl,
          queryView
        );
        if (viewChange.snapshot) {
          newViewSnapshots.push(viewChange.snapshot);
        }
      }
    } else {
      debugAssert(
        transitionToPrimary,
        'A secondary tab should never have an active view without an active target.'
      );
      // For queries that never executed on this client, we need to
      // allocate the target in LocalStore and initialize a new View.
      const target = await getCachedTarget(syncEngineImpl.localStore, targetId);
      debugAssert(!!target, `Target for id ${targetId} not found`);
      targetData = await syncEngineImpl.localStore.allocateTarget(target);
      await initializeViewAndComputeSnapshot(
        syncEngineImpl,
        synthesizeTargetToQuery(target!),
        targetId,
        /*current=*/ false
      );
    }

    activeQueries.push(targetData!);
  }

  syncEngineImpl.syncEngineListener!.onWatchChange(newViewSnapshots);
  return activeQueries;
}

/**
 * Creates a `Query` object from the specified `Target`. There is no way to
 * obtain the original `Query`, so we synthesize a `Query` from the `Target`
 * object.
 *
 * The synthesized result might be different from the original `Query`, but
 * since the synthesized `Query` should return the same results as the
 * original one (only the presentation of results might differ), the potential
 * difference will not cause issues.
 */
// PORTING NOTE: Multi-Tab only.
function synthesizeTargetToQuery(target: Target): Query {
  return newQuery(
    target.path,
    target.collectionGroup,
    target.orderBy,
    target.filters,
    target.limit,
    LimitType.First,
    target.startAt,
    target.endAt
  );
}

/** Returns the IDs of the clients that are currently active. */
// PORTING NOTE: Multi-Tab only.
export function getActiveClients(syncEngine: SyncEngine): Promise<ClientId[]> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  return getActiveClientsFromPersistence(syncEngineImpl.localStore);
}

/** Applies a query target change from a different tab. */
// PORTING NOTE: Multi-Tab only.
export async function applyTargetState(
  syncEngine: SyncEngine,
  targetId: TargetId,
  state: QueryTargetState,
  error?: FirestoreError
): Promise<void> {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  if (syncEngineImpl._isPrimaryClient) {
    // If we receive a target state notification via WebStorage, we are
    // either already secondary or another tab has taken the primary lease.
    logDebug(LOG_TAG, 'Ignoring unexpected query state notification.');
    return;
  }

  if (syncEngineImpl.queriesByTarget.has(targetId)) {
    switch (state) {
      case 'current':
      case 'not-current': {
        const changes = await getNewDocumentChanges(syncEngineImpl.localStore);
        const synthesizedRemoteEvent = RemoteEvent.createSynthesizedRemoteEventForCurrentChange(
          targetId,
          state === 'current'
        );
        await emitNewSnapsAndNotifyLocalStore(
          syncEngineImpl,
          changes,
          synthesizedRemoteEvent
        );
        break;
      }
      case 'rejected': {
        await syncEngineImpl.localStore.releaseTarget(
          targetId,
          /* keepPersistedTargetData */ true
        );
        removeAndCleanupTarget(syncEngineImpl, targetId, error);
        break;
      }
      default:
        fail('Unexpected target state: ' + state);
    }
  }
}

/** Adds or removes Watch targets for queries from different tabs. */
export async function applyActiveTargetsChange(
  syncEngine: SyncEngine,
  added: TargetId[],
  removed: TargetId[]
): Promise<void> {
  const syncEngineImpl = ensureWatchCallbacks(syncEngine);
  if (!syncEngineImpl._isPrimaryClient) {
    return;
  }

  for (const targetId of added) {
    if (syncEngineImpl.queriesByTarget.has(targetId)) {
      // A target might have been added in a previous attempt
      logDebug(LOG_TAG, 'Adding an already active target ' + targetId);
      continue;
    }

    const target = await getCachedTarget(syncEngineImpl.localStore, targetId);
    debugAssert(!!target, `Query data for active target ${targetId} not found`);
    const targetData = await syncEngineImpl.localStore.allocateTarget(target);
    await initializeViewAndComputeSnapshot(
      syncEngineImpl,
      synthesizeTargetToQuery(target),
      targetData.targetId,
      /*current=*/ false
    );
    syncEngineImpl.remoteStore.listen(targetData);
  }

  for (const targetId of removed) {
    // Check that the target is still active since the target might have been
    // removed if it has been rejected by the backend.
    if (!syncEngineImpl.queriesByTarget.has(targetId)) {
      continue;
    }

    // Release queries that are still active.
    await syncEngineImpl.localStore
      .releaseTarget(targetId, /* keepPersistedTargetData */ false)
      .then(() => {
        syncEngineImpl.remoteStore.unlisten(targetId);
        removeAndCleanupTarget(syncEngineImpl, targetId);
      })
      .catch(ignoreIfPrimaryLeaseLoss);
  }
}

function ensureWatchCallbacks(syncEngine: SyncEngine): SyncEngineImpl {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.remoteStore.remoteSyncer.applyRemoteEvent = applyRemoteEvent.bind(
    null,
    syncEngineImpl
  );
  syncEngineImpl.remoteStore.remoteSyncer.getRemoteKeysForTarget = getRemoteKeysForTarget.bind(
    null,
    syncEngineImpl
  );
  syncEngineImpl.remoteStore.remoteSyncer.rejectListen = rejectListen.bind(
    null,
    syncEngineImpl
  );
  return syncEngineImpl;
}

function ensureWriteCallbacks(syncEngine: SyncEngine): SyncEngineImpl {
  const syncEngineImpl = debugCast(syncEngine, SyncEngineImpl);
  syncEngineImpl.remoteStore.remoteSyncer.applySuccessfulWrite = applySuccessfulWrite.bind(
    null,
    syncEngineImpl
  );
  syncEngineImpl.remoteStore.remoteSyncer.rejectFailedWrite = rejectFailedWrite.bind(
    null,
    syncEngineImpl
  );
  return syncEngineImpl;
}
