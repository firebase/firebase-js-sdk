/**
 * @license
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

import { User } from '../auth/user';
import { LocalStore } from '../local/local_store';
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
import { MutationBatchResult, BATCHID_UNKNOWN } from '../model/mutation_batch';
import { RemoteEvent, TargetChange } from '../remote/remote_event';
import { RemoteStore } from '../remote/remote_store';
import { RemoteSyncer } from '../remote/remote_syncer';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import * as log from '../util/log';
import { primitiveComparator } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { Deferred } from '../util/promise';
import { SortedMap } from '../util/sorted_map';

import { ignoreIfPrimaryLeaseLoss } from '../local/indexeddb_persistence';
import { ClientId, SharedClientState } from '../local/shared_client_state';
import {
  QueryTargetState,
  SharedClientStateSyncer
} from '../local/shared_client_state_syncer';
import * as objUtils from '../util/obj';
import { SortedSet } from '../util/sorted_set';
import { ListenSequence } from './listen_sequence';
import { Query, LimitType } from './query';
import { SnapshotVersion } from './snapshot_version';
import { Target } from './target';
import { TargetIdGenerator } from './target_id_generator';
import { Transaction } from './transaction';
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
  ViewChange,
  ViewDocumentChanges
} from './view';
import { ViewSnapshot } from './view_snapshot';
import { AsyncQueue } from '../util/async_queue';
import { TransactionRunner } from './transaction_runner';

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
export class SyncEngine implements RemoteSyncer, SharedClientStateSyncer {
  private syncEngineListener: SyncEngineListener | null = null;

  private queryViewsByQuery = new ObjectMap<Query, QueryView>(q =>
    q.canonicalId()
  );
  private queriesByTarget: { [targetId: number]: Query[] } = {};
  private limboTargetsByKey = new SortedMap<DocumentKey, TargetId>(
    DocumentKey.comparator
  );
  private limboResolutionsByTarget: {
    [targetId: number]: LimboResolution;
  } = {};
  private limboDocumentRefs = new ReferenceSet();
  /** Stores user completion handlers, indexed by User and BatchId. */
  private mutationUserCallbacks = {} as {
    [uidKey: string]: SortedMap<BatchId, Deferred<void>>;
  };
  /** Stores user callbacks waiting for all pending writes to be acknowledged. */
  private pendingWritesCallbacks = new Map<BatchId, Array<Deferred<void>>>();
  private limboTargetIdGenerator = TargetIdGenerator.forSyncEngine();

  // The primary state is set to `true` or `false` immediately after Firestore
  // startup. In the interim, a client should only be considered primary if
  // `isPrimary` is true.
  private isPrimary: undefined | boolean = undefined;
  private onlineState: OnlineState = OnlineState.Unknown;

  constructor(
    private localStore: LocalStore,
    private remoteStore: RemoteStore,
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    private sharedClientState: SharedClientState,
    private currentUser: User
  ) {}

  // Only used for testing.
  get isPrimaryClient(): boolean {
    return this.isPrimary === true;
  }

  /** Subscribes to SyncEngine notifications. Has to be called exactly once. */
  subscribe(syncEngineListener: SyncEngineListener): void {
    assert(syncEngineListener !== null, 'SyncEngine listener cannot be null');
    assert(
      this.syncEngineListener === null,
      'SyncEngine already has a subscriber.'
    );

    this.syncEngineListener = syncEngineListener;
  }

  /**
   * Initiates the new listen, resolves promise when listen enqueued to the
   * server. All the subsequent view snapshots or errors are sent to the
   * subscribed handlers. Returns the targetId of the query.
   */
  async listen(query: Query): Promise<TargetId> {
    this.assertSubscribed('listen()');

    let targetId;
    let viewSnapshot;

    const queryView = this.queryViewsByQuery.get(query);
    if (queryView) {
      // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
      // already exists when EventManager calls us for the first time. This
      // happens when the primary tab is already listening to this query on
      // behalf of another tab and the user of the primary also starts listening
      // to the query. EventManager will not have an assigned target ID in this
      // case and calls `listen` to obtain this ID.
      targetId = queryView.targetId;
      this.sharedClientState.addLocalQueryTarget(targetId);
      viewSnapshot = queryView.view.computeInitialSnapshot();
    } else {
      const targetData = await this.localStore.allocateTarget(query.toTarget());

      const status = this.sharedClientState.addLocalQueryTarget(
        targetData.targetId
      );
      targetId = targetData.targetId;
      viewSnapshot = await this.initializeViewAndComputeSnapshot(
        query,
        targetId,
        status === 'current'
      );
      if (this.isPrimary) {
        this.remoteStore.listen(targetData);
      }
    }

    this.syncEngineListener!.onWatchChange([viewSnapshot]);
    return targetId;
  }

  /**
   * Registers a view for a previously unknown query and computes its initial
   * snapshot.
   */
  private async initializeViewAndComputeSnapshot(
    query: Query,
    targetId: TargetId,
    current: boolean
  ): Promise<ViewSnapshot> {
    const queryResult = await this.localStore.executeQuery(
      query,
      /* usePreviousResults= */ true
    );
    const view = new View(query, queryResult.remoteKeys);
    const viewDocChanges = view.computeDocChanges(queryResult.documents);
    const synthesizedTargetChange = TargetChange.createSynthesizedTargetChangeForCurrentChange(
      targetId,
      current && this.onlineState !== OnlineState.Offline
    );
    const viewChange = view.applyChanges(
      viewDocChanges,
      /* updateLimboDocuments= */ this.isPrimary === true,
      synthesizedTargetChange
    );
    assert(
      viewChange.limboChanges.length === 0,
      'View returned limbo docs before target ack from the server.'
    );
    assert(
      !!viewChange.snapshot,
      'applyChanges for new view should always return a snapshot'
    );

    const data = new QueryView(query, targetId, view);
    this.queryViewsByQuery.set(query, data);
    if (!this.queriesByTarget[targetId]) {
      this.queriesByTarget[targetId] = [];
    }
    this.queriesByTarget[targetId].push(query);
    return viewChange.snapshot!;
  }

  /**
   * Reconcile the list of synced documents in an existing view with those
   * from persistence.
   */
  // PORTING NOTE: Multi-tab only.
  private async synchronizeViewAndComputeSnapshot(
    queryView: QueryView
  ): Promise<ViewChange> {
    const queryResult = await this.localStore.executeQuery(
      queryView.query,
      /* usePreviousResults= */ true
    );
    const viewSnapshot = queryView.view.synchronizeWithPersistedState(
      queryResult
    );
    if (this.isPrimary) {
      this.updateTrackedLimbos(queryView.targetId, viewSnapshot.limboChanges);
    }
    return viewSnapshot;
  }

  /** Stops listening to the query. */
  async unlisten(query: Query): Promise<void> {
    this.assertSubscribed('unlisten()');

    const queryView = this.queryViewsByQuery.get(query)!;
    assert(!!queryView, 'Trying to unlisten on query not found:' + query);

    // Only clean up the query view and target if this is the only query mapped
    // to the target.
    const queries = this.queriesByTarget[queryView.targetId];
    if (queries.length > 1) {
      this.queriesByTarget[queryView.targetId] = queries.filter(
        q => !q.isEqual(query)
      );
      this.queryViewsByQuery.delete(query);
      return;
    }

    // No other queries are mapped to the target, clean up the query and the target.
    if (this.isPrimary) {
      // We need to remove the local query target first to allow us to verify
      // whether any other client is still interested in this target.
      this.sharedClientState.removeLocalQueryTarget(queryView.targetId);
      const targetRemainsActive = this.sharedClientState.isActiveQueryTarget(
        queryView.targetId
      );

      if (!targetRemainsActive) {
        await this.localStore
          .releaseTarget(queryView.targetId, /*keepPersistedTargetData=*/ false)
          .then(() => {
            this.sharedClientState.clearQueryState(queryView.targetId);
            this.remoteStore.unlisten(queryView.targetId);
            this.removeAndCleanupTarget(queryView.targetId);
          })
          .catch(ignoreIfPrimaryLeaseLoss);
      }
    } else {
      this.removeAndCleanupTarget(queryView.targetId);
      await this.localStore.releaseTarget(
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
  async write(batch: Mutation[], userCallback: Deferred<void>): Promise<void> {
    this.assertSubscribed('write()');
    const result = await this.localStore.localWrite(batch);
    this.sharedClientState.addPendingMutation(result.batchId);
    this.addMutationCallback(result.batchId, userCallback);
    await this.emitNewSnapsAndNotifyLocalStore(result.changes);
    await this.remoteStore.fillWritePipeline();
  }

  /**
   * Takes an updateFunction in which a set of reads and writes can be performed
   * atomically. In the updateFunction, the client can read and write values
   * using the supplied transaction object. After the updateFunction, all
   * changes will be committed. If a retryable error occurs (ex: some other
   * client has changed any of the data referenced), then the updateFunction
   * will be called again after a backoff. If the updateFunction still fails
   * after all retries, then the transaction will be rejected.
   *
   * The transaction object passed to the updateFunction contains methods for
   * accessing documents and collections. Unlike other datastore access, data
   * accessed with the transaction will not reflect local changes that have not
   * been committed. For this reason, it is required that all reads are
   * performed before any writes. Transactions must be performed while online.
   *
   * The Deferred input is resolved when the transaction is fully committed.
   */
  runTransaction<T>(
    asyncQueue: AsyncQueue,
    updateFunction: (transaction: Transaction) => Promise<T>,
    deferred: Deferred<T>
  ): void {
    new TransactionRunner<T>(
      asyncQueue,
      this.remoteStore,
      updateFunction,
      deferred
    ).run();
  }

  async applyRemoteEvent(remoteEvent: RemoteEvent): Promise<void> {
    this.assertSubscribed('applyRemoteEvent()');
    try {
      const changes = await this.localStore.applyRemoteEvent(remoteEvent);
      // Update `receivedDocument` as appropriate for any limbo targets.
      objUtils.forEach(remoteEvent.targetChanges, (targetId, targetChange) => {
        const limboResolution = this.limboResolutionsByTarget[Number(targetId)];
        if (limboResolution) {
          // Since this is a limbo resolution lookup, it's for a single document
          // and it could be added, modified, or removed, but not a combination.
          assert(
            targetChange.addedDocuments.size +
              targetChange.modifiedDocuments.size +
              targetChange.removedDocuments.size <=
              1,
            'Limbo resolution for single document contains multiple changes.'
          );
          if (targetChange.addedDocuments.size > 0) {
            limboResolution.receivedDocument = true;
          } else if (targetChange.modifiedDocuments.size > 0) {
            assert(
              limboResolution.receivedDocument,
              'Received change for limbo target document without add.'
            );
          } else if (targetChange.removedDocuments.size > 0) {
            assert(
              limboResolution.receivedDocument,
              'Received remove for limbo target document without add.'
            );
            limboResolution.receivedDocument = false;
          } else {
            // This was probably just a CURRENT targetChange or similar.
          }
        }
      });
      await this.emitNewSnapsAndNotifyLocalStore(changes, remoteEvent);
    } catch (error) {
      await ignoreIfPrimaryLeaseLoss(error);
    }
  }

  /**
   * Applies an OnlineState change to the sync engine and notifies any views of
   * the change.
   */
  applyOnlineStateChange(
    onlineState: OnlineState,
    source: OnlineStateSource
  ): void {
    // If we are the secondary client, we explicitly ignore the remote store's
    // online state (the local client may go offline, even though the primary
    // tab remains online) and only apply the primary tab's online state from
    // SharedClientState.
    if (
      (this.isPrimary && source === OnlineStateSource.RemoteStore) ||
      (!this.isPrimary && source === OnlineStateSource.SharedClientState)
    ) {
      this.assertSubscribed('applyOnlineStateChange()');
      const newViewSnapshots = [] as ViewSnapshot[];
      this.queryViewsByQuery.forEach((query, queryView) => {
        const viewChange = queryView.view.applyOnlineStateChange(onlineState);
        assert(
          viewChange.limboChanges.length === 0,
          'OnlineState should not affect limbo documents.'
        );
        if (viewChange.snapshot) {
          newViewSnapshots.push(viewChange.snapshot);
        }
      });
      this.syncEngineListener!.onOnlineStateChange(onlineState);
      this.syncEngineListener!.onWatchChange(newViewSnapshots);

      this.onlineState = onlineState;
      if (this.isPrimary) {
        this.sharedClientState.setOnlineState(onlineState);
      }
    }
  }

  async rejectListen(targetId: TargetId, err: FirestoreError): Promise<void> {
    this.assertSubscribed('rejectListens()');

    // PORTING NOTE: Multi-tab only.
    this.sharedClientState.updateQueryState(targetId, 'rejected', err);

    const limboResolution = this.limboResolutionsByTarget[targetId];
    const limboKey = limboResolution && limboResolution.key;
    if (limboKey) {
      // Since this query failed, we won't want to manually unlisten to it.
      // So go ahead and remove it from bookkeeping.
      this.limboTargetsByKey = this.limboTargetsByKey.remove(limboKey);
      delete this.limboResolutionsByTarget[targetId];

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
        new NoDocument(limboKey, SnapshotVersion.forDeletedDoc())
      );
      const resolvedLimboDocuments = documentKeySet().add(limboKey);
      const event = new RemoteEvent(
        SnapshotVersion.MIN,
        /* targetChanges= */ {},
        /* targetMismatches= */ new SortedSet<TargetId>(primitiveComparator),
        documentUpdates,
        resolvedLimboDocuments
      );
      return this.applyRemoteEvent(event);
    } else {
      await this.localStore
        .releaseTarget(targetId, /* keepPersistedTargetData */ false)
        .then(() => this.removeAndCleanupTarget(targetId, err))
        .catch(ignoreIfPrimaryLeaseLoss);
    }
  }

  // PORTING NOTE: Multi-tab only
  async applyBatchState(
    batchId: BatchId,
    batchState: MutationBatchState,
    error?: FirestoreError
  ): Promise<void> {
    this.assertSubscribed('applyBatchState()');
    const documents = await this.localStore.lookupMutationDocuments(batchId);

    if (documents === null) {
      // A throttled tab may not have seen the mutation before it was completed
      // and removed from the mutation queue, in which case we won't have cached
      // the affected documents. In this case we can safely ignore the update
      // since that means we didn't apply the mutation locally at all (if we
      // had, we would have cached the affected documents), and so we will just
      // see any resulting document changes via normal remote document updates
      // as applicable.
      log.debug(LOG_TAG, 'Cannot apply mutation batch with id: ' + batchId);
      return;
    }

    if (batchState === 'pending') {
      // If we are the primary client, we need to send this write to the
      // backend. Secondary clients will ignore these writes since their remote
      // connection is disabled.
      await this.remoteStore.fillWritePipeline();
    } else if (batchState === 'acknowledged' || batchState === 'rejected') {
      // NOTE: Both these methods are no-ops for batches that originated from
      // other clients.
      this.processUserCallback(batchId, error ? error : null);
      this.localStore.removeCachedMutationBatchMetadata(batchId);
    } else {
      fail(`Unknown batchState: ${batchState}`);
    }

    await this.emitNewSnapsAndNotifyLocalStore(documents);
  }

  async applySuccessfulWrite(
    mutationBatchResult: MutationBatchResult
  ): Promise<void> {
    this.assertSubscribed('applySuccessfulWrite()');

    const batchId = mutationBatchResult.batch.batchId;

    // The local store may or may not be able to apply the write result and
    // raise events immediately (depending on whether the watcher is caught
    // up), so we raise user callbacks first so that they consistently happen
    // before listen events.
    this.processUserCallback(batchId, /*error=*/ null);

    this.triggerPendingWritesCallbacks(batchId);

    try {
      const changes = await this.localStore.acknowledgeBatch(
        mutationBatchResult
      );
      this.sharedClientState.updateMutationState(batchId, 'acknowledged');
      await this.emitNewSnapsAndNotifyLocalStore(changes);
    } catch (error) {
      await ignoreIfPrimaryLeaseLoss(error);
    }
  }

  async rejectFailedWrite(
    batchId: BatchId,
    error: FirestoreError
  ): Promise<void> {
    this.assertSubscribed('rejectFailedWrite()');

    // The local store may or may not be able to apply the write result and
    // raise events immediately (depending on whether the watcher is caught up),
    // so we raise user callbacks first so that they consistently happen before
    // listen events.
    this.processUserCallback(batchId, error);

    this.triggerPendingWritesCallbacks(batchId);

    try {
      const changes = await this.localStore.rejectBatch(batchId);
      this.sharedClientState.updateMutationState(batchId, 'rejected', error);
      await this.emitNewSnapsAndNotifyLocalStore(changes);
    } catch (error) {
      await ignoreIfPrimaryLeaseLoss(error);
    }
  }

  /**
   * Registers a user callback that resolves when all pending mutations at the moment of calling
   * are acknowledged .
   */
  async registerPendingWritesCallback(callback: Deferred<void>): Promise<void> {
    if (!this.remoteStore.canUseNetwork()) {
      log.debug(
        LOG_TAG,
        'The network is disabled. The task returned by ' +
          "'awaitPendingWrites()' will not complete until the network is enabled."
      );
    }

    const highestBatchId = await this.localStore.getHighestUnacknowledgedBatchId();
    if (highestBatchId === BATCHID_UNKNOWN) {
      // Trigger the callback right away if there is no pending writes at the moment.
      callback.resolve();
      return;
    }

    const callbacks = this.pendingWritesCallbacks.get(highestBatchId) || [];
    callbacks.push(callback);
    this.pendingWritesCallbacks.set(highestBatchId, callbacks);
  }

  /**
   * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
   * if there are any.
   */
  private triggerPendingWritesCallbacks(batchId: BatchId): void {
    (this.pendingWritesCallbacks.get(batchId) || []).forEach(callback => {
      callback.resolve();
    });

    this.pendingWritesCallbacks.delete(batchId);
  }

  /** Reject all outstanding callbacks waiting for pending writes to complete. */
  private rejectOutstandingPendingWritesCallbacks(errorMessage: string): void {
    this.pendingWritesCallbacks.forEach(callbacks => {
      callbacks.forEach(callback => {
        callback.reject(new FirestoreError(Code.CANCELLED, errorMessage));
      });
    });

    this.pendingWritesCallbacks.clear();
  }

  private addMutationCallback(
    batchId: BatchId,
    callback: Deferred<void>
  ): void {
    let newCallbacks = this.mutationUserCallbacks[this.currentUser.toKey()];
    if (!newCallbacks) {
      newCallbacks = new SortedMap<BatchId, Deferred<void>>(
        primitiveComparator
      );
    }
    newCallbacks = newCallbacks.insert(batchId, callback);
    this.mutationUserCallbacks[this.currentUser.toKey()] = newCallbacks;
  }

  /**
   * Resolves or rejects the user callback for the given batch and then discards
   * it.
   */
  private processUserCallback(batchId: BatchId, error: Error | null): void {
    let newCallbacks = this.mutationUserCallbacks[this.currentUser.toKey()];

    // NOTE: Mutations restored from persistence won't have callbacks, so it's
    // okay for there to be no callback for this ID.
    if (newCallbacks) {
      const callback = newCallbacks.get(batchId);
      if (callback) {
        assert(
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
      this.mutationUserCallbacks[this.currentUser.toKey()] = newCallbacks;
    }
  }

  private removeAndCleanupTarget(
    targetId: number,
    error: Error | null = null
  ): void {
    this.sharedClientState.removeLocalQueryTarget(targetId);

    assert(
      this.queriesByTarget[targetId] &&
        this.queriesByTarget[targetId].length !== 0,
      `There are no queries mapped to target id ${targetId}`
    );

    for (const query of this.queriesByTarget[targetId]) {
      this.queryViewsByQuery.delete(query);
      if (error) {
        this.syncEngineListener!.onWatchError(query, error);
      }
    }

    delete this.queriesByTarget[targetId];

    if (this.isPrimary) {
      const limboKeys = this.limboDocumentRefs.referencesForId(targetId);
      this.limboDocumentRefs.removeReferencesForId(targetId);
      limboKeys.forEach(limboKey => {
        const isReferenced = this.limboDocumentRefs.containsKey(limboKey);
        if (!isReferenced) {
          // We removed the last reference for this key
          this.removeLimboTarget(limboKey);
        }
      });
    }
  }

  private removeLimboTarget(key: DocumentKey): void {
    // It's possible that the target already got removed because the query failed. In that case,
    // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
    const limboTargetId = this.limboTargetsByKey.get(key);
    if (limboTargetId === null) {
      // This target already got removed, because the query failed.
      return;
    }

    this.remoteStore.unlisten(limboTargetId);
    this.limboTargetsByKey = this.limboTargetsByKey.remove(key);
    delete this.limboResolutionsByTarget[limboTargetId];
  }

  private updateTrackedLimbos(
    targetId: TargetId,
    limboChanges: LimboDocumentChange[]
  ): void {
    for (const limboChange of limboChanges) {
      if (limboChange instanceof AddedLimboDocument) {
        this.limboDocumentRefs.addReference(limboChange.key, targetId);
        this.trackLimboChange(limboChange);
      } else if (limboChange instanceof RemovedLimboDocument) {
        log.debug(LOG_TAG, 'Document no longer in limbo: ' + limboChange.key);
        this.limboDocumentRefs.removeReference(limboChange.key, targetId);
        const isReferenced = this.limboDocumentRefs.containsKey(
          limboChange.key
        );
        if (!isReferenced) {
          // We removed the last reference for this key
          this.removeLimboTarget(limboChange.key);
        }
      } else {
        fail('Unknown limbo change: ' + JSON.stringify(limboChange));
      }
    }
  }

  private trackLimboChange(limboChange: AddedLimboDocument): void {
    const key = limboChange.key;
    if (!this.limboTargetsByKey.get(key)) {
      log.debug(LOG_TAG, 'New document in limbo: ' + key);
      const limboTargetId = this.limboTargetIdGenerator.next();
      const query = Query.atPath(key.path);
      this.limboResolutionsByTarget[limboTargetId] = new LimboResolution(key);
      this.remoteStore.listen(
        new TargetData(
          query.toTarget(),
          limboTargetId,
          TargetPurpose.LimboResolution,
          ListenSequence.INVALID
        )
      );
      this.limboTargetsByKey = this.limboTargetsByKey.insert(
        key,
        limboTargetId
      );
    }
  }

  // Visible for testing
  currentLimboDocs(): SortedMap<DocumentKey, TargetId> {
    return this.limboTargetsByKey;
  }

  private async emitNewSnapsAndNotifyLocalStore(
    changes: MaybeDocumentMap,
    remoteEvent?: RemoteEvent
  ): Promise<void> {
    const newSnaps: ViewSnapshot[] = [];
    const docChangesInAllViews: LocalViewChanges[] = [];
    const queriesProcessed: Array<Promise<void>> = [];

    this.queryViewsByQuery.forEach((_, queryView) => {
      queriesProcessed.push(
        Promise.resolve()
          .then(() => {
            const viewDocChanges = queryView.view.computeDocChanges(changes);
            if (!viewDocChanges.needsRefill) {
              return viewDocChanges;
            }
            // The query has a limit and some docs were removed, so we need
            // to re-run the query against the local store to make sure we
            // didn't lose any good docs that had been past the limit.
            return this.localStore
              .executeQuery(queryView.query, /* usePreviousResults= */ false)
              .then(({ documents }) => {
                return queryView.view.computeDocChanges(
                  documents,
                  viewDocChanges
                );
              });
          })
          .then((viewDocChanges: ViewDocumentChanges) => {
            const targetChange =
              remoteEvent && remoteEvent.targetChanges[queryView.targetId];
            const viewChange = queryView.view.applyChanges(
              viewDocChanges,
              /* updateLimboDocuments= */ this.isPrimary === true,
              targetChange
            );
            this.updateTrackedLimbos(
              queryView.targetId,
              viewChange.limboChanges
            );
            if (viewChange.snapshot) {
              if (this.isPrimary) {
                this.sharedClientState.updateQueryState(
                  queryView.targetId,
                  viewChange.snapshot.fromCache ? 'not-current' : 'current'
                );
              }

              newSnaps.push(viewChange.snapshot);
              const docChanges = LocalViewChanges.fromSnapshot(
                queryView.targetId,
                viewChange.snapshot
              );
              docChangesInAllViews.push(docChanges);
            }
          })
      );
    });

    await Promise.all(queriesProcessed);
    this.syncEngineListener!.onWatchChange(newSnaps);
    await this.localStore.notifyLocalViewChanges(docChangesInAllViews);
  }

  private assertSubscribed(fnName: string): void {
    assert(
      this.syncEngineListener !== null,
      'Trying to call ' + fnName + ' before calling subscribe().'
    );
  }

  async handleCredentialChange(user: User): Promise<void> {
    const userChanged = !this.currentUser.isEqual(user);
    this.currentUser = user;

    if (userChanged) {
      // Fails tasks waiting for pending writes requested by previous user.
      this.rejectOutstandingPendingWritesCallbacks(
        "'waitForPendingWrites' promise is rejected due to a user change."
      );

      const result = await this.localStore.handleUserChange(user);
      // TODO(b/114226417): Consider calling this only in the primary tab.
      this.sharedClientState.handleUserChange(
        user,
        result.removedBatchIds,
        result.addedBatchIds
      );
      await this.emitNewSnapsAndNotifyLocalStore(result.affectedDocuments);
    }

    await this.remoteStore.handleCredentialChange();
  }

  // PORTING NOTE: Multi-tab only
  async applyPrimaryState(isPrimary: boolean): Promise<void> {
    if (isPrimary === true && this.isPrimary !== true) {
      this.isPrimary = true;
      await this.remoteStore.applyPrimaryState(true);

      // Secondary tabs only maintain Views for their local listeners and the
      // Views internal state may not be 100% populated (in particular
      // secondary tabs don't track syncedDocuments, the set of documents the
      // server considers to be in the target). So when a secondary becomes
      // primary, we need to need to make sure that all views for all targets
      // match the state on disk.
      const activeTargets = this.sharedClientState.getAllActiveQueryTargets();
      const activeQueries = await this.synchronizeQueryViewsAndRaiseSnapshots(
        activeTargets.toArray()
      );
      for (const targetData of activeQueries) {
        this.remoteStore.listen(targetData);
      }
    } else if (isPrimary === false && this.isPrimary !== false) {
      this.isPrimary = false;

      const activeTargets: TargetId[] = [];

      let p = Promise.resolve();
      objUtils.forEachNumber(this.queriesByTarget, (targetId, _) => {
        if (this.sharedClientState.isLocalQueryTarget(targetId)) {
          activeTargets.push(targetId);
        } else {
          p = p.then(() => {
            this.removeAndCleanupTarget(targetId);
            return this.localStore.releaseTarget(
              targetId,
              /*keepPersistedTargetData=*/ true
            );
          });
        }
        this.remoteStore.unlisten(targetId);
      });
      await p;

      await this.synchronizeQueryViewsAndRaiseSnapshots(activeTargets);
      this.resetLimboDocuments();
      await this.remoteStore.applyPrimaryState(false);
    }
  }

  // PORTING NOTE: Multi-tab only.
  private resetLimboDocuments(): void {
    objUtils.forEachNumber(this.limboResolutionsByTarget, targetId => {
      this.remoteStore.unlisten(targetId);
    });
    this.limboDocumentRefs.removeAllReferences();
    this.limboResolutionsByTarget = [];
    this.limboTargetsByKey = new SortedMap<DocumentKey, TargetId>(
      DocumentKey.comparator
    );
  }

  /**
   * Reconcile the query views of the provided query targets with the state from
   * persistence. Raises snapshots for any changes that affect the local
   * client and returns the updated state of all target's query data.
   */
  // PORTING NOTE: Multi-tab only.
  private async synchronizeQueryViewsAndRaiseSnapshots(
    targets: TargetId[]
  ): Promise<TargetData[]> {
    const activeQueries: TargetData[] = [];
    const newViewSnapshots: ViewSnapshot[] = [];
    for (const targetId of targets) {
      let targetData: TargetData;
      const queries = this.queriesByTarget[targetId];

      if (queries && queries.length !== 0) {
        // For queries that have a local View, we need to update their state
        // in LocalStore (as the resume token and the snapshot version
        // might have changed) and reconcile their views with the persisted
        // state (the list of syncedDocuments may have gotten out of sync).
        await this.localStore.releaseTarget(
          targetId,
          /*keepPersistedTargetData=*/ true
        );
        targetData = await this.localStore.allocateTarget(
          queries[0].toTarget()
        );

        for (const query of queries) {
          const queryView = this.queryViewsByQuery.get(query);
          assert(!!queryView, `No query view found for ${query}`);

          const viewChange = await this.synchronizeViewAndComputeSnapshot(
            queryView
          );
          if (viewChange.snapshot) {
            newViewSnapshots.push(viewChange.snapshot);
          }
        }
      } else {
        assert(
          this.isPrimary === true,
          'A secondary tab should never have an active target without an active query.'
        );
        // For queries that never executed on this client, we need to
        // allocate the target in LocalStore and initialize a new View.
        const target = await this.localStore.getTarget(targetId);
        assert(!!target, `Target for id ${targetId} not found`);
        targetData = await this.localStore.allocateTarget(target);
        await this.initializeViewAndComputeSnapshot(
          this.synthesizeTargetToQuery(target!),
          targetId,
          /*current=*/ false
        );
      }

      activeQueries.push(targetData!);
    }

    this.syncEngineListener!.onWatchChange(newViewSnapshots);
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
  // PORTING NOTE: Multi-tab only
  private synthesizeTargetToQuery(target: Target): Query {
    return new Query(
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

  // PORTING NOTE: Multi-tab only
  getActiveClients(): Promise<ClientId[]> {
    return this.localStore.getActiveClients();
  }

  // PORTING NOTE: Multi-tab only
  async applyTargetState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): Promise<void> {
    if (this.isPrimary) {
      // If we receive a target state notification via WebStorage, we are
      // either already secondary or another tab has taken the primary lease.
      log.debug(LOG_TAG, 'Ignoring unexpected query state notification.');
      return;
    }

    if (this.queriesByTarget[targetId]) {
      switch (state) {
        case 'current':
        case 'not-current': {
          const changes = await this.localStore.getNewDocumentChanges();
          const synthesizedRemoteEvent = RemoteEvent.createSynthesizedRemoteEventForCurrentChange(
            targetId,
            state === 'current'
          );
          await this.emitNewSnapsAndNotifyLocalStore(
            changes,
            synthesizedRemoteEvent
          );
          break;
        }
        case 'rejected': {
          await this.localStore.releaseTarget(
            targetId,
            /* keepPersistedTargetData */ true
          );
          this.removeAndCleanupTarget(targetId, error);
          break;
        }
        default:
          fail('Unexpected target state: ' + state);
      }
    }
  }

  // PORTING NOTE: Multi-tab only
  async applyActiveTargetsChange(
    added: TargetId[],
    removed: TargetId[]
  ): Promise<void> {
    if (!this.isPrimary) {
      return;
    }

    for (const targetId of added) {
      assert(
        !this.queriesByTarget[targetId],
        'Trying to add an already active target'
      );
      const target = await this.localStore.getTarget(targetId);
      assert(!!target, `Query data for active target ${targetId} not found`);
      const targetData = await this.localStore.allocateTarget(target);
      await this.initializeViewAndComputeSnapshot(
        this.synthesizeTargetToQuery(target),
        targetData.targetId,
        /*current=*/ false
      );
      this.remoteStore.listen(targetData);
    }

    for (const targetId of removed) {
      // Check that the target is still active since the target might have been
      // removed if it has been rejected by the backend.
      if (!this.queriesByTarget[targetId]) {
        continue;
      }

      // Release queries that are still active.
      await this.localStore
        .releaseTarget(targetId, /* keepPersistedTargetData */ false)
        .then(() => {
          this.remoteStore.unlisten(targetId);
          this.removeAndCleanupTarget(targetId);
        })
        .catch(ignoreIfPrimaryLeaseLoss);
    }
  }

  // PORTING NOTE: Multi-tab only. In other clients, LocalStore is unaware of
  // the online state.
  enableNetwork(): Promise<void> {
    this.localStore.setNetworkEnabled(true);
    return this.remoteStore.enableNetwork();
  }

  // PORTING NOTE: Multi-tab only. In other clients, LocalStore is unaware of
  // the online state.
  disableNetwork(): Promise<void> {
    this.localStore.setNetworkEnabled(false);
    return this.remoteStore.disableNetwork();
  }

  getRemoteKeysForTarget(targetId: TargetId): DocumentKeySet {
    const limboResolution = this.limboResolutionsByTarget[targetId];
    if (limboResolution && limboResolution.receivedDocument) {
      return documentKeySet().add(limboResolution.key);
    } else {
      let keySet = documentKeySet();
      const queries = this.queriesByTarget[targetId];
      if (!queries) {
        return keySet;
      }
      for (const query of queries) {
        const queryView = this.queryViewsByQuery.get(query);
        assert(!!queryView, `No query view found for ${query}`);
        keySet = keySet.unionWith(queryView.view.syncedDocuments);
      }
      return keySet;
    }
  }
}
