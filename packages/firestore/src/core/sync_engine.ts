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

import { User } from '../auth/user';
import { EagerGarbageCollector } from '../local/eager_garbage_collector';
import { LocalStore } from '../local/local_store';
import { LocalViewChanges } from '../local/local_view_changes';
import { QueryData, QueryPurpose } from '../local/query_data';
import { ReferenceSet } from '../local/reference_set';
import {
  MaybeDocumentMap,
  documentKeySet,
  DocumentKeySet
} from '../model/collections';
import { MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { MutationBatchResult } from '../model/mutation_batch';
import { RemoteEvent } from '../remote/remote_event';
import { RemoteStore } from '../remote/remote_store';
import { RemoteSyncer } from '../remote/remote_syncer';
import { assert, fail } from '../util/assert';
import { FirestoreError } from '../util/error';
import * as log from '../util/log';
import { AnyJs, primitiveComparator } from '../util/misc';
import { ObjectMap } from '../util/obj_map';
import { Deferred } from '../util/promise';
import { SortedMap } from '../util/sorted_map';
import { isNullOrUndefined } from '../util/types';

import { Query } from './query';
import { SnapshotVersion } from './snapshot_version';
import { TargetIdGenerator } from './target_id_generator';
import { Transaction } from './transaction';
import {
  BatchId,
  MutationBatchState,
  OnlineState,
  ProtoByteString,
  TargetId
} from './types';
import {
  AddedLimboDocument,
  LimboDocumentChange,
  RemovedLimboDocument,
  View,
  ViewDocumentChanges
} from './view';
import { ViewSnapshot } from './view_snapshot';
import {
  SharedClientStateSyncer,
  QueryTargetState
} from '../local/shared_client_state_syncer';
import { ClientId, SharedClientState } from '../local/shared_client_state';
import { SortedSet } from '../util/sorted_set';

const LOG_TAG = 'SyncEngine';

export type ViewHandler = (viewSnaps: ViewSnapshot[]) => void;
export type ErrorHandler = (query: Query, error: Error) => void;

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
     * An identifier from the datastore backend that indicates the last state
     * of the results that was received. This can be used to indicate where
     * to continue receiving new doc changes for the query.
     */
    public resumeToken: ProtoByteString,
    /**
     * The view is responsible for computing the final merged truth of what
     * docs are in the query. It gets notified of local and remote changes,
     * and applies the query filters and limits to determine the most correct
     * possible results.
     */
    public view: View
  ) {}
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
  private networkAllowed = false;

  private viewHandler: ViewHandler | null = null;
  private errorHandler: ErrorHandler | null = null;

  private queryViewsByQuery = new ObjectMap<Query, QueryView>(q =>
    q.canonicalId()
  );
  private queryViewsByTarget: { [targetId: number]: QueryView } = {};
  private limboTargetsByKey = new SortedMap<DocumentKey, TargetId>(
    DocumentKey.comparator
  );
  private limboKeysByTarget: { [targetId: number]: DocumentKey } = {};
  private limboDocumentRefs = new ReferenceSet();
  private limboCollector = new EagerGarbageCollector();
  /** Stores user completion handlers, indexed by User and BatchId. */
  private mutationUserCallbacks = {} as {
    [uidKey: string]: SortedMap<BatchId, Deferred<void>>;
  };
  private targetIdGenerator = TargetIdGenerator.forSyncEngine();
  private isPrimary = false;

  constructor(
    private localStore: LocalStore,
    private remoteStore: RemoteStore,
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    private sharedClientState: SharedClientState,
    private currentUser: User
  ) {}

  // Only used for testing.
  get isPrimaryClient(): boolean {
    return this.isPrimary;
  }

  /** Subscribes view and error handler. Can be called only once. */
  subscribe(viewHandler: ViewHandler, errorHandler: ErrorHandler): void {
    assert(
      viewHandler !== null && errorHandler !== null,
      'View and error handlers cannot be null'
    );
    assert(
      this.viewHandler === null && this.errorHandler === null,
      'SyncEngine already has a subscriber.'
    );
    this.viewHandler = viewHandler;
    this.errorHandler = errorHandler;
    this.limboCollector.addGarbageSource(this.limboDocumentRefs);
  }

  /**
   * Initiates the new listen, resolves promise when listen enqueued to the
   * server. All the subsequent view snapshots or errors are sent to the
   * subscribed handlers. Returns the targetId of the query.
   */
  listen(query: Query): Promise<TargetId> {
    this.assertSubscribed('listen()');
    assert(
      !this.queryViewsByQuery.has(query),
      'We already listen to the query: ' + query
    );

    return this.localStore.allocateQuery(query).then(queryData => {
      return this.localStore
        .executeQuery(query)
        .then(docs => {
          return this.localStore
            .remoteDocumentKeys(queryData.targetId)
            .then(remoteKeys => {
              const view = new View(query, remoteKeys);
              const viewDocChanges = view.computeDocChanges(docs);
              const viewChange = view.applyChanges(viewDocChanges);
              assert(
                viewChange.limboChanges.length === 0,
                'View returned limbo docs before target ack from the server.'
              );
              assert(
                !!viewChange.snapshot,
                'applyChanges for new view should always return a snapshot'
              );

              const data = new QueryView(
                query,
                queryData.targetId,
                queryData.resumeToken,
                view
              );
              this.queryViewsByQuery.set(query, data);
              this.queryViewsByTarget[queryData.targetId] = data;
              this.viewHandler!([viewChange.snapshot!]);
              this.remoteStore.listen(queryData);
            });
        })
        .then(() => {
          return queryData.targetId;
        });
    });
  }

  /** Stops listening to the query. */
  unlisten(query: Query): Promise<void> {
    this.assertSubscribed('unlisten()');

    const queryView = this.queryViewsByQuery.get(query)!;
    assert(!!queryView, 'Trying to unlisten on query not found:' + query);

    return this.localStore.releaseQuery(query).then(() => {
      this.remoteStore.unlisten(queryView.targetId);
      return this.removeAndCleanupQuery(queryView).then(() => {
        return this.localStore.collectGarbage();
      });
    });
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
  write(batch: Mutation[], userCallback: Deferred<void>): Promise<void> {
    this.assertSubscribed('write()');
    return this.localStore
      .localWrite(batch)
      .then(result => {
        this.sharedClientState.addLocalPendingMutation(result.batchId);
        this.addMutationCallback(result.batchId, userCallback);
        return this.emitNewSnapsAndNotifyLocalStore(result.changes);
      })
      .then(() => {
        return this.remoteStore.fillWritePipeline();
      });
  }

  // TODO(klimt): Wrap the given error in a standard Firestore error object.
  private wrapUpdateFunctionError(error: AnyJs): AnyJs {
    return error;
  }

  /**
   * Takes an updateFunction in which a set of reads and writes can be performed
   * atomically. In the updateFunction, the client can read and write values
   * using the supplied transaction object. After the updateFunction, all
   * changes will be committed. If some other client has changed any of the data
   * referenced, then the updateFunction will be called again. If the
   * updateFunction still fails after the given number of retries, then the
   * transaction will be rejection.
   *
   * The transaction object passed to the updateFunction contains methods for
   * accessing documents and collections. Unlike other datastore access, data
   * accessed with the transaction will not reflect local changes that have not
   * been committed. For this reason, it is required that all reads are
   * performed before any writes. Transactions must be performed while online.
   *
   * The promise returned is resolved when the transaction is fully committed.
   */
  runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>,
    retries = 5
  ): Promise<T> {
    assert(retries >= 0, 'Got negative number of retries for transaction.');
    const transaction = this.remoteStore.createTransaction();
    const wrappedUpdateFunction = () => {
      try {
        const userPromise = updateFunction(transaction);
        if (
          isNullOrUndefined(userPromise) ||
          !userPromise.catch ||
          !userPromise.then
        ) {
          return Promise.reject<T>(
            Error('Transaction callback must return a Promise')
          );
        }
        return userPromise.catch(e => {
          return Promise.reject<T>(this.wrapUpdateFunctionError(e));
        });
      } catch (e) {
        return Promise.reject<T>(this.wrapUpdateFunctionError(e));
      }
    };
    return wrappedUpdateFunction().then(result => {
      return transaction
        .commit()
        .then(() => {
          return result;
        })
        .catch(error => {
          if (retries === 0) {
            return Promise.reject<T>(error);
          }
          // TODO(klimt): Put in a retry delay?
          return this.runTransaction(updateFunction, retries - 1);
        });
    });
  }

  applyRemoteEvent(remoteEvent: RemoteEvent): Promise<void> {
    this.assertSubscribed('applyRemoteEvent()');

    return this.localStore.applyRemoteEvent(remoteEvent).then(changes => {
      return this.emitNewSnapsAndNotifyLocalStore(changes, remoteEvent);
    });
  }

  /**
   * Applies an OnlineState change to the sync engine and notifies any views of
   * the change.
   */
  applyOnlineStateChange(onlineState: OnlineState): void {
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
    this.viewHandler(newViewSnapshots);
  }

  rejectListen(targetId: TargetId, err: FirestoreError): Promise<void> {
    this.assertSubscribed('rejectListens()');
    const limboKey = this.limboKeysByTarget[targetId];
    if (limboKey) {
      // Since this query failed, we won't want to manually unlisten to it.
      // So go ahead and remove it from bookkeeping.
      this.limboTargetsByKey = this.limboTargetsByKey.remove(limboKey);
      delete this.limboKeysByTarget[targetId];

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
      const queryView = this.queryViewsByTarget[targetId];
      assert(!!queryView, 'Unknown targetId: ' + targetId);
      return this.localStore.releaseQuery(queryView.query).then(() => {
        return this.removeAndCleanupQuery(queryView).then(() => {
          this.errorHandler!(queryView.query, err);
        });
      });
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
      this.sharedClientState.removeLocalPendingMutation(batchId);
      this.processUserCallback(batchId, error ? error : null);

      this.localStore.removeCachedMutationBatchMetadata(batchId);
    } else {
      fail(`Unknown batchState: ${batchState}`);
    }

    await this.emitNewSnapsAndNotifyLocalStore(documents);
  }

  applySuccessfulWrite(
    mutationBatchResult: MutationBatchResult
  ): Promise<void> {
    this.assertSubscribed('applySuccessfulWrite()');

    const batchId = mutationBatchResult.batch.batchId;

    // The local store may or may not be able to apply the write result and
    // raise events immediately (depending on whether the watcher is caught
    // up), so we raise user callbacks first so that they consistently happen
    // before listen events.
    this.processUserCallback(batchId, /*error=*/ null);

    return this.localStore
      .acknowledgeBatch(mutationBatchResult)
      .then(changes => {
        this.sharedClientState.trackMutationResult(batchId, 'acknowledged');
        this.sharedClientState.removeLocalPendingMutation(batchId);
        return this.emitNewSnapsAndNotifyLocalStore(changes);
      });
  }

  rejectFailedWrite(batchId: BatchId, error: FirestoreError): Promise<void> {
    this.assertSubscribed('rejectFailedWrite()');

    // The local store may or may not be able to apply the write result and
    // raise events immediately (depending on whether the watcher is caught up),
    // so we raise user callbacks first so that they consistently happen before
    // listen events.
    this.processUserCallback(batchId, error);

    return this.localStore.rejectBatch(batchId).then(changes => {
      this.sharedClientState.trackMutationResult(batchId, 'rejected', error);
      this.sharedClientState.removeLocalPendingMutation(batchId);
      return this.emitNewSnapsAndNotifyLocalStore(changes);
    });
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

  private removeAndCleanupQuery(queryView: QueryView): Promise<void> {
    this.queryViewsByQuery.delete(queryView.query);
    delete this.queryViewsByTarget[queryView.targetId];

    this.limboDocumentRefs.removeReferencesForId(queryView.targetId);
    return this.gcLimboDocuments();
  }

  private updateTrackedLimbos(
    targetId: TargetId,
    limboChanges: LimboDocumentChange[]
  ): Promise<void> {
    for (const limboChange of limboChanges) {
      if (limboChange instanceof AddedLimboDocument) {
        this.limboDocumentRefs.addReference(limboChange.key, targetId);
        this.trackLimboChange(limboChange);
      } else if (limboChange instanceof RemovedLimboDocument) {
        log.debug(LOG_TAG, 'Document no longer in limbo: ' + limboChange.key);
        this.limboDocumentRefs.removeReference(limboChange.key, targetId);
      } else {
        fail('Unknown limbo change: ' + JSON.stringify(limboChange));
      }
    }
    return this.gcLimboDocuments();
  }

  private trackLimboChange(limboChange: AddedLimboDocument): void {
    const key = limboChange.key;
    if (!this.limboTargetsByKey.get(key)) {
      log.debug(LOG_TAG, 'New document in limbo: ' + key);
      const limboTargetId = this.targetIdGenerator.next();
      const query = Query.atPath(key.path);
      this.limboKeysByTarget[limboTargetId] = key;
      this.remoteStore.listen(
        new QueryData(query, limboTargetId, QueryPurpose.LimboResolution)
      );
      this.limboTargetsByKey = this.limboTargetsByKey.insert(
        key,
        limboTargetId
      );
    }
  }

  private gcLimboDocuments(): Promise<void> {
    // HACK: We can use a null transaction here, because we know that the
    // reference set is entirely within memory and doesn't need a store engine.
    return this.limboCollector
      .collectGarbage(null)
      .next(keys => {
        keys.forEach(key => {
          const limboTargetId = this.limboTargetsByKey.get(key);
          if (limboTargetId === null) {
            // This target already got removed, because the query failed.
            return;
          }
          this.remoteStore.unlisten(limboTargetId);
          this.limboTargetsByKey = this.limboTargetsByKey.remove(key);
          delete this.limboKeysByTarget[limboTargetId];
        });
      })
      .toPromise();
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
            return this.localStore.executeQuery(queryView.query).then(docs => {
              return queryView.view.computeDocChanges(docs, viewDocChanges);
            });
          })
          .then((viewDocChanges: ViewDocumentChanges) => {
            const targetChange =
              remoteEvent && remoteEvent.targetChanges[queryView.targetId];
            const viewChange = queryView.view.applyChanges(
              viewDocChanges,
              targetChange
            );
            return this.updateTrackedLimbos(
              queryView.targetId,
              viewChange.limboChanges
            ).then(() => {
              if (viewChange.snapshot) {
                newSnaps.push(viewChange.snapshot);
                const docChanges = LocalViewChanges.fromSnapshot(
                  viewChange.snapshot
                );
                docChangesInAllViews.push(docChanges);
              }
            });
          })
      );
    });

    await Promise.all(queriesProcessed);
    this.viewHandler!(newSnaps);
    await this.localStore.notifyLocalViewChanges(docChangesInAllViews);
    // TODO(multitab): Multitab garbage collection
    if (this.isPrimary) {
      await this.localStore.collectGarbage();
    }
  }

  private assertSubscribed(fnName: string): void {
    assert(
      this.viewHandler !== null && this.errorHandler !== null,
      'Trying to call ' + fnName + ' before calling subscribe().'
    );
  }

  handleUserChange(user: User): Promise<void> {
    this.currentUser = user;
    return this.localStore
      .handleUserChange(user)
      .then(result => {
        this.sharedClientState.handleUserChange(
          user,
          result.removedBatchIds,
          result.addedBatchIds
        );
        return this.emitNewSnapsAndNotifyLocalStore(result.affectedDocuments);
      })
      .then(() => {
        return this.remoteStore.handleUserChange(user);
      });
  }

  // PORTING NOTE: Multi-tab only
  applyPrimaryState(isPrimary: boolean): Promise<void> {
    this.isPrimary = isPrimary;
    if (this.isPrimary && this.networkAllowed) {
      return this.remoteStore.enableNetwork();
    } else {
      return this.remoteStore.disableNetwork();
    }
  }

  // PORTING NOTE: Multi-tab only
  getActiveClients(): Promise<ClientId[]> {
    return this.localStore.getActiveClients();
  }

  // PORTING NOTE: Multi-tab only
  applyTargetState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): Promise<void> {
    // TODO(multitab): Implement this
    return Promise.resolve();
  }

  // PORTING NOTE: Multi-tab only
  applyActiveTargetsChange(
    added: TargetId[],
    removed: TargetId[]
  ): Promise<void> {
    // TODO(multitab): Implement this
    return Promise.resolve();
  }

  async enableNetwork(): Promise<void> {
    this.networkAllowed = true;
    if (this.isPrimary) {
      return this.remoteStore.enableNetwork();
    }
  }

  async disableNetwork(): Promise<void> {
    // TODO(multitab): Release primary lease
    this.networkAllowed = false;
    return this.remoteStore.disableNetwork();
  }

  start(): Promise<void> {
    // TODO(multitab): Read list of active targets and forward to RemoteStore
    return this.enableNetwork();
  }

  shutdown(): Promise<void> {
    return this.disableNetwork();
  }

  getRemoteKeysForTarget(targetId: TargetId): DocumentKeySet {
    return this.queryViewsByTarget[targetId]
      ? this.queryViewsByTarget[targetId].view.syncedDocuments
      : documentKeySet();
  }
}
