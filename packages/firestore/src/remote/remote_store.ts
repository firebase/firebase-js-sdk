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
import { SnapshotVersion } from '../core/snapshot_version';
import { Transaction } from '../core/transaction';
import { BatchId, OnlineState, TargetId } from '../core/types';
import { LocalStore } from '../local/local_store';
import { QueryData, QueryPurpose } from '../local/query_data';
import { MutationResult } from '../model/mutation';
import {
  BATCHID_UNKNOWN,
  MutationBatch,
  MutationBatchResult
} from '../model/mutation_batch';
import { emptyByteString } from '../platform/platform';
import { assert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import * as log from '../util/log';
import * as objUtils from '../util/obj';

import { Datastore } from './datastore';
import {
  PersistentListenStream,
  PersistentWriteStream
} from './persistent_stream';
import { RemoteSyncer } from './remote_syncer';
import { isPermanentError } from './rpc_error';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchChangeAggregator,
  TargetMetadataProvider,
  WatchTargetChange,
  WatchTargetChangeState
} from './watch_change';
import { OnlineStateTracker } from './online_state_tracker';
import { AsyncQueue } from '../util/async_queue';
import { DocumentKeySet } from '../model/collections';

const LOG_TAG = 'RemoteStore';

// TODO(b/35853402): Negotiate this with the stream.
const MAX_PENDING_WRITES = 10;

/**
 * RemoteStore - An interface to remotely stored data, basically providing a
 * wrapper around the Datastore that is more reliable for the rest of the
 * system.
 *
 * RemoteStore is responsible for maintaining the connection to the server.
 * - maintaining a list of active listens.
 * - reconnecting when the connection is dropped.
 * - resuming all the active listens on reconnect.
 *
 * RemoteStore handles all incoming events from the Datastore.
 * - listening to the watch stream and repackaging the events as RemoteEvents
 * - notifying SyncEngine of any changes to the active listens.
 *
 * RemoteStore takes writes from other components and handles them reliably.
 * - pulling pending mutations from LocalStore and sending them to Datastore.
 * - retrying mutations that failed because of network problems.
 * - acking mutations to the SyncEngine once they are accepted or rejected.
 *
 * RemoteStore always starts out offline. A call to `enableNetwork()`
 * initializes the network connection.
 */
export class RemoteStore implements TargetMetadataProvider {
  private pendingWrites: MutationBatch[] = [];
  private lastBatchSeen: BatchId = BATCHID_UNKNOWN;

  /**
   * A mapping of watched targets that the client cares about tracking and the
   * user has explicitly called a 'listen' for this target.
   *
   * These targets may or may not have been sent to or acknowledged by the
   * server. On re-establishing the listen stream, these targets should be sent
   * to the server. The targets removed with unlistens are removed eagerly
   * without waiting for confirmation from the listen stream.
   */
  private listenTargets: { [targetId: number]: QueryData } = {};

  private watchStream: PersistentListenStream = null;
  private writeStream: PersistentWriteStream = null;
  private watchChangeAggregator: WatchChangeAggregator = null;

  private onlineStateTracker: OnlineStateTracker;

  constructor(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    private localStore: LocalStore,
    /** The client-side proxy for interacting with the backend. */
    private datastore: Datastore,
    asyncQueue: AsyncQueue,
    onlineStateHandler: (onlineState: OnlineState) => void
  ) {
    this.onlineStateTracker = new OnlineStateTracker(
      asyncQueue,
      onlineStateHandler
    );
  }

  /** SyncEngine to notify of watch and write events. */
  syncEngine: RemoteSyncer;

  /**
   * Starts up the remote store, creating streams, restoring state from
   * LocalStore, etc.
   */
  start(): Promise<void> {
    // Start is a no-op for RemoteStore.
    return Promise.resolve();
  }

  private isNetworkEnabled(): boolean {
    assert(
      (this.watchStream == null) === (this.writeStream == null),
      'WatchStream and WriteStream should both be null or non-null'
    );
    return this.watchStream != null;
  }

  /** Re-enables the network. Idempotent. */
  enableNetwork(): Promise<void> {
    if (this.isNetworkEnabled()) {
      return Promise.resolve();
    }

    // Create new streams (but note they're not started yet).
    this.watchStream = this.datastore.newPersistentWatchStream();
    this.writeStream = this.datastore.newPersistentWriteStream();

    // Load any saved stream token from persistent storage
    return this.localStore.getLastStreamToken().then(token => {
      this.writeStream.lastStreamToken = token;

      if (this.shouldStartWatchStream()) {
        this.startWatchStream();
      } else {
        this.onlineStateTracker.set(OnlineState.Unknown);
      }

      return this.fillWritePipeline(); // This may start the writeStream.
    });
  }

  /**
   * Temporarily disables the network. The network can be re-enabled using
   * enableNetwork().
   */
  async disableNetwork(): Promise<void> {
    this.disableNetworkInternal();
    // Set the OnlineState to Offline so get()s return from cache, etc.
    this.onlineStateTracker.set(OnlineState.Offline);
  }

  /**
   * Disables the network, if it is currently enabled.
   */
  private disableNetworkInternal(): void {
    if (this.isNetworkEnabled()) {
      // NOTE: We're guaranteed not to get any further events from these streams (not even a close
      // event).
      this.watchStream.stop();
      this.writeStream.stop();

      this.cleanUpWatchStreamState();
      this.cleanUpWriteStreamState();

      this.writeStream = null;
      this.watchStream = null;
    }
  }

  shutdown(): Promise<void> {
    log.debug(LOG_TAG, 'RemoteStore shutting down.');
    this.disableNetworkInternal();
    // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
    // triggering spurious listener events with cached data, etc.
    this.onlineStateTracker.set(OnlineState.Unknown);
    return Promise.resolve();
  }

  /** Starts new listen for the given query. Uses resume token if provided */
  listen(queryData: QueryData): void {
    assert(
      !objUtils.contains(this.listenTargets, queryData.targetId),
      'listen called with duplicate targetId!'
    );
    // Mark this as something the client is currently listening for.
    this.listenTargets[queryData.targetId] = queryData;

    if (this.shouldStartWatchStream()) {
      // The listen will be sent in onWatchStreamOpen
      this.startWatchStream();
    } else if (this.isNetworkEnabled() && this.watchStream.isOpen()) {
      this.sendWatchRequest(queryData);
    }
  }

  /** Removes the listen from server */
  unlisten(targetId: TargetId): void {
    assert(
      objUtils.contains(this.listenTargets, targetId),
      'unlisten called without assigned target ID!'
    );
    delete this.listenTargets[targetId];
    if (this.isNetworkEnabled() && this.watchStream.isOpen()) {
      this.sendUnwatchRequest(targetId);
      if (objUtils.isEmpty(this.listenTargets)) {
        this.watchStream.markIdle();
      }
    }
  }

  /** {@link TargetMetadataProvider.getQueryDataForTarget} */
  getQueryDataForTarget(targetId: TargetId): QueryData | null {
    return this.listenTargets[targetId] || null;
  }

  /** {@link TargetMetadataProvider.getRemoteKeysForTarget} */
  getRemoteKeysForTarget(targetId: TargetId): DocumentKeySet {
    return this.syncEngine.getRemoteKeysForTarget(targetId);
  }

  /**
   * We need to increment the the expected number of pending responses we're due
   * from watch so we wait for the ack to process any messages from this target.
   */
  private sendWatchRequest(queryData: QueryData): void {
    this.watchChangeAggregator.recordPendingTargetRequest(queryData.targetId);
    this.watchStream.watch(queryData);
  }

  /**
   * We need to increment the expected number of pending responses we're due
   * from watch so we wait for the removal on the server before we process any
   * messages from this target.
   */
  private sendUnwatchRequest(targetId: TargetId): void {
    this.watchChangeAggregator.recordPendingTargetRequest(targetId);
    this.watchStream.unwatch(targetId);
  }

  private startWatchStream(): void {
    assert(
      this.shouldStartWatchStream(),
      'startWriteStream() called when shouldStartWatchStream() is false.'
    );
    this.watchStream.start({
      onOpen: this.onWatchStreamOpen.bind(this),
      onClose: this.onWatchStreamClose.bind(this),
      onWatchChange: this.onWatchStreamChange.bind(this)
    });

    this.watchChangeAggregator = new WatchChangeAggregator(this);
    this.onlineStateTracker.handleWatchStreamStart();
  }

  /**
   * Returns whether the watch stream should be started because it's necessary
   * and has not yet been started.
   */
  private shouldStartWatchStream(): boolean {
    return (
      this.isNetworkEnabled() &&
      !this.watchStream.isStarted() &&
      !objUtils.isEmpty(this.listenTargets)
    );
  }

  private cleanUpWatchStreamState(): void {
    this.watchChangeAggregator = null;
  }

  private async onWatchStreamOpen(): Promise<void> {
    // TODO(b/35852690): close the stream again (with some timeout?) if no watch
    // targets are active
    objUtils.forEachNumber(this.listenTargets, (targetId, queryData) => {
      this.sendWatchRequest(queryData);
    });
  }

  private async onWatchStreamClose(error?: FirestoreError): Promise<void> {
    assert(
      this.isNetworkEnabled(),
      'onWatchStreamClose() should only be called when the network is enabled'
    );

    this.cleanUpWatchStreamState();

    // If we still need the watch stream, retry the connection.
    if (this.shouldStartWatchStream()) {
      // There should generally be an error if the watch stream was closed when
      // it's still needed, but it's not quite worth asserting.
      if (error) {
        this.onlineStateTracker.handleWatchStreamFailure(error);
      }

      this.startWatchStream();
    } else {
      // No need to restart watch stream because there are no active targets.
      // The online state is set to unknown because there is no active attempt
      // at establishing a connection
      this.onlineStateTracker.set(OnlineState.Unknown);
    }
  }

  private async onWatchStreamChange(
    watchChange: WatchChange,
    snapshotVersion: SnapshotVersion
  ): Promise<void> {
    // Mark the client as online since we got a message from the server
    this.onlineStateTracker.set(OnlineState.Online);

    if (
      watchChange instanceof WatchTargetChange &&
      watchChange.state === WatchTargetChangeState.Removed &&
      watchChange.cause
    ) {
      // There was an error on a target, don't wait for a consistent snapshot
      // to raise events
      return this.handleTargetError(watchChange);
    }

    if (watchChange instanceof DocumentWatchChange) {
      this.watchChangeAggregator.handleDocumentChange(watchChange);
    } else if (watchChange instanceof ExistenceFilterChange) {
      this.watchChangeAggregator.handleExistenceFilter(watchChange);
    } else {
      assert(
        watchChange instanceof WatchTargetChange,
        'Expected watchChange to be an instance of WatchTargetChange'
      );
      this.watchChangeAggregator.handleTargetChange(watchChange);
    }

    if (!snapshotVersion.isEqual(SnapshotVersion.MIN)) {
      const lastRemoteSnapshotVersion = await this.localStore.getLastRemoteSnapshotVersion();
      if (snapshotVersion.compareTo(lastRemoteSnapshotVersion) >= 0) {
        // We have received a target change with a global snapshot if the snapshot
        // version is not equal to SnapshotVersion.MIN.
        await this.raiseWatchSnapshot(snapshotVersion);
      }
    }
  }

  /**
   * Takes a batch of changes from the Datastore, repackages them as a
   * RemoteEvent, and passes that on to the listener, which is typically the
   * SyncEngine.
   */
  private raiseWatchSnapshot(snapshotVersion: SnapshotVersion): Promise<void> {
    assert(
      !snapshotVersion.isEqual(SnapshotVersion.MIN),
      "Can't raise event for unknown SnapshotVersion"
    );
    const remoteEvent = this.watchChangeAggregator.createRemoteEvent(
      snapshotVersion
    );

    // Update in-memory resume tokens. LocalStore will update the
    // persistent view of these when applying the completed RemoteEvent.
    objUtils.forEachNumber(remoteEvent.targetChanges, (targetId, change) => {
      if (change.resumeToken.length > 0) {
        const queryData = this.listenTargets[targetId];
        // A watched target might have been removed already.
        if (queryData) {
          this.listenTargets[targetId] = queryData.update({
            resumeToken: change.resumeToken,
            snapshotVersion
          });
        }
      }
    });

    // Re-establish listens for the targets that have been invalidated by
    // existence filter mismatches.
    remoteEvent.targetMismatches.forEach(targetId => {
      const queryData = this.listenTargets[targetId];
      if (!queryData) {
        // A watched target might have been removed already.
        return;
      }

      // Clear the resume token for the query, since we're in a known mismatch
      // state.
      queryData.resumeToken = emptyByteString();

      // Cause a hard reset by unwatching and rewatching immediately, but
      // deliberately don't send a resume token so that we get a full update.
      this.sendUnwatchRequest(targetId);

      // Mark the query we send as being on behalf of an existence filter
      // mismatch, but don't actually retain that in listenTargets. This ensures
      // that we flag the first re-listen this way without impacting future
      // listens of this target (that might happen e.g. on reconnect).
      const requestQueryData = new QueryData(
        queryData.query,
        targetId,
        QueryPurpose.ExistenceFilterMismatch
      );
      this.sendWatchRequest(requestQueryData);
    });

    // Finally raise remote event
    return this.syncEngine.applyRemoteEvent(remoteEvent);
  }

  /** Handles an error on a target */
  private handleTargetError(watchChange: WatchTargetChange): Promise<void> {
    assert(!!watchChange.cause, 'Handling target error without a cause');
    const error = watchChange.cause!;
    let promiseChain = Promise.resolve();
    watchChange.targetIds.forEach(targetId => {
      promiseChain = promiseChain.then(async () => {
        // A watched target might have been removed already.
        if (objUtils.contains(this.listenTargets, targetId)) {
          delete this.listenTargets[targetId];
          this.watchChangeAggregator.removeTarget(targetId);
          return this.syncEngine.rejectListen(targetId, error);
        }
      });
    });
    return promiseChain;
  }

  cleanUpWriteStreamState(): void {
    this.lastBatchSeen = BATCHID_UNKNOWN;
    log.debug(
      LOG_TAG,
      'Stopping write stream with ' +
        this.pendingWrites.length +
        ' pending writes'
    );
    this.pendingWrites = [];
  }

  /**
   * Notifies that there are new mutations to process in the queue. This is
   * typically called by SyncEngine after it has sent mutations to LocalStore.
   */
  async fillWritePipeline(): Promise<void> {
    if (this.canWriteMutations()) {
      return this.localStore
        .nextMutationBatch(this.lastBatchSeen)
        .then(batch => {
          if (batch === null) {
            if (this.pendingWrites.length === 0) {
              this.writeStream.markIdle();
            }
          } else {
            this.commit(batch);
            return this.fillWritePipeline();
          }
        });
    }
  }

  /**
   * Returns true if the backend can accept additional write requests.
   *
   * When sending mutations to the write stream (e.g. in fillWritePipeline),
   * call this method first to check if more mutations can be sent.
   *
   * Currently the only thing that can prevent the backend from accepting
   * write requests is if there are too many requests already outstanding. As
   * writes complete the backend will be able to accept more.
   */
  canWriteMutations(): boolean {
    return (
      this.isNetworkEnabled() && this.pendingWrites.length < MAX_PENDING_WRITES
    );
  }

  // For testing
  outstandingWrites(): number {
    return this.pendingWrites.length;
  }

  /**
   * Given mutations to commit, actually commits them to the Datastore. Note
   * that this does *not* return a Promise specifically because the AsyncQueue
   * should not block operations for this.
   */
  private commit(batch: MutationBatch): void {
    assert(
      this.canWriteMutations(),
      "commit called when batches can't be written"
    );
    this.lastBatchSeen = batch.batchId;

    this.pendingWrites.push(batch);

    if (this.shouldStartWriteStream()) {
      this.startWriteStream();
    } else if (this.isNetworkEnabled() && this.writeStream.handshakeComplete) {
      this.writeStream.writeMutations(batch.mutations);
    }
  }

  private shouldStartWriteStream(): boolean {
    return (
      this.isNetworkEnabled() &&
      !this.writeStream.isStarted() &&
      this.pendingWrites.length > 0
    );
  }

  private startWriteStream(): void {
    assert(
      this.shouldStartWriteStream(),
      'startWriteStream() called when shouldStartWriteStream() is false.'
    );
    this.writeStream.start({
      onOpen: this.onWriteStreamOpen.bind(this),
      onClose: this.onWriteStreamClose.bind(this),
      onHandshakeComplete: this.onWriteHandshakeComplete.bind(this),
      onMutationResult: this.onMutationResult.bind(this)
    });
  }

  private async onWriteStreamOpen(): Promise<void> {
    this.writeStream.writeHandshake();
  }

  private onWriteHandshakeComplete(): Promise<void> {
    // Record the stream token.
    return this.localStore
      .setLastStreamToken(this.writeStream.lastStreamToken)
      .then(() => {
        // Drain any pending writes.
        //
        // Note that at this point pendingWrites contains mutations that
        // have already been accepted by fillWritePipeline/commitBatch. If
        // the pipeline is full, canWriteMutations will be false, despite
        // the fact that we actually need to send mutations over.
        //
        // This also means that this method indirectly respects the limits
        // imposed by canWriteMutations since writes can't be added to the
        // pendingWrites array when canWriteMutations is false. If the
        // limits imposed by canWriteMutations actually protect us from
        // DOSing ourselves then those limits won't be exceeded here and
        // we'll continue to make progress.
        for (const batch of this.pendingWrites) {
          this.writeStream.writeMutations(batch.mutations);
        }
      });
  }

  private onMutationResult(
    commitVersion: SnapshotVersion,
    results: MutationResult[]
  ): Promise<void> {
    // This is a response to a write containing mutations and should be
    // correlated to the first pending write.
    assert(
      this.pendingWrites.length > 0,
      'Got result for empty pending writes'
    );
    const batch = this.pendingWrites.shift()!;
    const success = MutationBatchResult.from(
      batch,
      commitVersion,
      results,
      this.writeStream.lastStreamToken
    );
    return this.syncEngine.applySuccessfulWrite(success).then(() => {
      // It's possible that with the completion of this mutation another
      // slot has freed up.
      return this.fillWritePipeline();
    });
  }

  private async onWriteStreamClose(error?: FirestoreError): Promise<void> {
    assert(
      this.isNetworkEnabled(),
      'onWriteStreamClose() should only be called when the network is enabled'
    );

    // If the write stream closed due to an error, invoke the error callbacks if
    // there are pending writes.
    if (error && this.pendingWrites.length > 0) {
      assert(
        !!error,
        'We have pending writes, but the write stream closed without an error'
      );
      // A promise that is resolved after we processed the error
      let errorHandling: Promise<void>;
      if (this.writeStream.handshakeComplete) {
        // This error affects the actual write.
        errorHandling = this.handleWriteError(error!);
      } else {
        // If there was an error before the handshake has finished, it's
        // possible that the server is unable to process the stream token
        // we're sending. (Perhaps it's too old?)
        errorHandling = this.handleHandshakeError(error!);
      }

      return errorHandling.then(() => {
        // The write stream might have been started by refilling the write
        // pipeline for failed writes
        if (this.shouldStartWriteStream()) {
          this.startWriteStream();
        }
      });
    }
    // No pending writes, nothing to do
  }

  private async handleHandshakeError(error: FirestoreError): Promise<void> {
    // Reset the token if it's a permanent error or the error code is
    // ABORTED, signaling the write stream is no longer valid.
    if (isPermanentError(error.code) || error.code === Code.ABORTED) {
      log.debug(
        LOG_TAG,
        'RemoteStore error before completed handshake; resetting stream token: ',
        this.writeStream.lastStreamToken
      );
      this.writeStream.lastStreamToken = emptyByteString();

      return this.localStore.setLastStreamToken(emptyByteString());
    } else {
      // Some other error, don't reset stream token. Our stream logic will
      // just retry with exponential backoff.
    }
  }

  private async handleWriteError(error: FirestoreError): Promise<void> {
    if (isPermanentError(error.code)) {
      // This was a permanent error, the request itself was the problem
      // so it's not going to succeed if we resend it.
      const batch = this.pendingWrites.shift()!;

      // In this case it's also unlikely that the server itself is melting
      // down -- this was just a bad request so inhibit backoff on the next
      // restart.
      this.writeStream.inhibitBackoff();

      return this.syncEngine
        .rejectFailedWrite(batch.batchId, error)
        .then(() => {
          // It's possible that with the completion of this mutation
          // another slot has freed up.
          return this.fillWritePipeline();
        });
    } else {
      // Transient error, just let the retry logic kick in.
    }
  }

  createTransaction(): Transaction {
    return new Transaction(this.datastore);
  }

  handleUserChange(user: User): Promise<void> {
    log.debug(LOG_TAG, 'RemoteStore changing users: uid=', user.uid);

    // If the network has been explicitly disabled, make sure we don't
    // accidentally re-enable it.
    if (this.isNetworkEnabled()) {
      // Tear down and re-create our network streams. This will ensure we get a fresh auth token
      // for the new user and re-fill the write pipeline with new mutations from the LocalStore
      // (since mutations are per-user).
      this.disableNetworkInternal();
      this.onlineStateTracker.set(OnlineState.Unknown);
      return this.enableNetwork();
    }
  }
}
