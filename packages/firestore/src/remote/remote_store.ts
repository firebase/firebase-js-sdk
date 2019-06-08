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

import { SnapshotVersion } from '../core/snapshot_version';
import { Transaction } from '../core/transaction';
import { OnlineState, TargetId } from '../core/types';
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
import { FirestoreError } from '../util/error';
import * as log from '../util/log';
import * as objUtils from '../util/obj';

import { ignoreIfPrimaryLeaseLoss } from '../local/indexeddb_persistence';
import { DocumentKeySet } from '../model/collections';
import { AsyncQueue } from '../util/async_queue';
import { ConnectivityMonitor, NetworkStatus } from './connectivity_monitor';
import { Datastore } from './datastore';
import { OnlineStateTracker } from './online_state_tracker';
import {
  PersistentListenStream,
  PersistentWriteStream
} from './persistent_stream';
import { RemoteSyncer } from './remote_syncer';
import { isPermanentError, isPermanentWriteError } from './rpc_error';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  TargetMetadataProvider,
  WatchChange,
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from './watch_change';

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
 */
export class RemoteStore implements TargetMetadataProvider {
  /**
   * A list of up to MAX_PENDING_WRITES writes that we have fetched from the
   * LocalStore via fillWritePipeline() and have or will send to the write
   * stream.
   *
   * Whenever writePipeline.length > 0 the RemoteStore will attempt to start or
   * restart the write stream. When the stream is established the writes in the
   * pipeline will be sent in order.
   *
   * Writes remain in writePipeline until they are acknowledged by the backend
   * and thus will automatically be re-sent if the stream is interrupted /
   * restarted before they're acknowledged.
   *
   * Write responses from the backend are linked to their originating request
   * purely based on order, and so we can just shift() writes from the front of
   * the writePipeline as we receive responses.
   */
  private writePipeline: MutationBatch[] = [];

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

  private connectivityMonitor: ConnectivityMonitor;
  private watchStream: PersistentListenStream;
  private writeStream: PersistentWriteStream;
  private watchChangeAggregator: WatchChangeAggregator | null = null;

  /**
   * Set to true by enableNetwork() and false by disableNetwork() and indicates
   * the user-preferred network state.
   */
  private networkEnabled = false;

  private isPrimary = false;

  private onlineStateTracker: OnlineStateTracker;

  constructor(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    private localStore: LocalStore,
    /** The client-side proxy for interacting with the backend. */
    private datastore: Datastore,
    asyncQueue: AsyncQueue,
    onlineStateHandler: (onlineState: OnlineState) => void,
    connectivityMonitor: ConnectivityMonitor
  ) {
    this.connectivityMonitor = connectivityMonitor;
    this.connectivityMonitor.addCallback((_status: NetworkStatus) => {
      asyncQueue.enqueueAndForget(async () => {
        if (this.canUseNetwork()) {
          log.debug(
            LOG_TAG,
            'Restarting streams for network reachability change.'
          );
          await this.restartNetwork();
        }
      });
    });

    this.onlineStateTracker = new OnlineStateTracker(
      asyncQueue,
      onlineStateHandler
    );

    // Create streams (but note they're not started yet).
    this.watchStream = this.datastore.newPersistentWatchStream({
      onOpen: this.onWatchStreamOpen.bind(this),
      onClose: this.onWatchStreamClose.bind(this),
      onWatchChange: this.onWatchStreamChange.bind(this)
    });

    this.writeStream = this.datastore.newPersistentWriteStream({
      onOpen: this.onWriteStreamOpen.bind(this),
      onClose: this.onWriteStreamClose.bind(this),
      onHandshakeComplete: this.onWriteHandshakeComplete.bind(this),
      onMutationResult: this.onMutationResult.bind(this)
    });
  }

  /** SyncEngine to notify of watch and write events. */
  syncEngine: RemoteSyncer;

  /**
   * Starts up the remote store, creating streams, restoring state from
   * LocalStore, etc.
   */
  start(): Promise<void> {
    return this.enableNetwork();
  }

  /** Re-enables the network. Idempotent. */
  async enableNetwork(): Promise<void> {
    this.networkEnabled = true;

    if (this.canUseNetwork()) {
      this.writeStream.lastStreamToken = await this.localStore.getLastStreamToken();

      if (this.shouldStartWatchStream()) {
        this.startWatchStream();
      } else {
        this.onlineStateTracker.set(OnlineState.Unknown);
      }

      // This will start the write stream if necessary.
      await this.fillWritePipeline();
    }
  }

  /**
   * Temporarily disables the network. The network can be re-enabled using
   * enableNetwork().
   */
  async disableNetwork(): Promise<void> {
    this.networkEnabled = false;
    await this.disableNetworkInternal();

    // Set the OnlineState to Offline so get()s return from cache, etc.
    this.onlineStateTracker.set(OnlineState.Offline);
  }

  private async disableNetworkInternal(): Promise<void> {
    await this.writeStream.stop();
    await this.watchStream.stop();

    if (this.writePipeline.length > 0) {
      log.debug(
        LOG_TAG,
        `Stopping write stream with ${this.writePipeline.length} pending writes`
      );
      this.writePipeline = [];
    }

    this.cleanUpWatchStreamState();
  }

  async shutdown(): Promise<void> {
    log.debug(LOG_TAG, 'RemoteStore shutting down.');
    this.networkEnabled = false;
    await this.disableNetworkInternal();
    this.connectivityMonitor.shutdown();

    // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
    // triggering spurious listener events with cached data, etc.
    this.onlineStateTracker.set(OnlineState.Unknown);
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
    } else if (this.watchStream.isOpen()) {
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
    if (this.watchStream.isOpen()) {
      this.sendUnwatchRequest(targetId);
    }

    if (objUtils.isEmpty(this.listenTargets)) {
      if (this.watchStream.isOpen()) {
        this.watchStream.markIdle();
      } else if (this.canUseNetwork()) {
        // Revert to OnlineState.Unknown if the watch stream is not open and we
        // have no listeners, since without any listens to send we cannot
        // confirm if the stream is healthy and upgrade to OnlineState.Online.
        this.onlineStateTracker.set(OnlineState.Unknown);
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
    this.watchChangeAggregator!.recordPendingTargetRequest(queryData.targetId);
    this.watchStream.watch(queryData);
  }

  /**
   * We need to increment the expected number of pending responses we're due
   * from watch so we wait for the removal on the server before we process any
   * messages from this target.
   */
  private sendUnwatchRequest(targetId: TargetId): void {
    this.watchChangeAggregator!.recordPendingTargetRequest(targetId);
    this.watchStream.unwatch(targetId);
  }

  private startWatchStream(): void {
    assert(
      this.shouldStartWatchStream(),
      'startWatchStream() called when shouldStartWatchStream() is false.'
    );

    this.watchChangeAggregator = new WatchChangeAggregator(this);
    this.watchStream.start();
    this.onlineStateTracker.handleWatchStreamStart();
  }

  /**
   * Returns whether the watch stream should be started because it's necessary
   * and has not yet been started.
   */
  private shouldStartWatchStream(): boolean {
    return (
      this.canUseNetwork() &&
      !this.watchStream.isStarted() &&
      !objUtils.isEmpty(this.listenTargets)
    );
  }

  private canUseNetwork(): boolean {
    return this.isPrimary && this.networkEnabled;
  }

  private cleanUpWatchStreamState(): void {
    this.watchChangeAggregator = null;
  }

  private async onWatchStreamOpen(): Promise<void> {
    objUtils.forEachNumber(this.listenTargets, (targetId, queryData) => {
      this.sendWatchRequest(queryData);
    });
  }

  private async onWatchStreamClose(error?: FirestoreError): Promise<void> {
    if (error === undefined) {
      // Graceful stop (due to stop() or idle timeout). Make sure that's
      // desirable.
      assert(
        !this.shouldStartWatchStream(),
        'Watch stream was stopped gracefully while still needed.'
      );
    }

    this.cleanUpWatchStreamState();

    // If we still need the watch stream, retry the connection.
    if (this.shouldStartWatchStream()) {
      this.onlineStateTracker.handleWatchStreamFailure(error!);

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
      this.watchChangeAggregator!.handleDocumentChange(watchChange);
    } else if (watchChange instanceof ExistenceFilterChange) {
      this.watchChangeAggregator!.handleExistenceFilter(watchChange);
    } else {
      assert(
        watchChange instanceof WatchTargetChange,
        'Expected watchChange to be an instance of WatchTargetChange'
      );
      this.watchChangeAggregator!.handleTargetChange(watchChange);
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
    const remoteEvent = this.watchChangeAggregator!.createRemoteEvent(
      snapshotVersion
    );

    // Update in-memory resume tokens. LocalStore will update the
    // persistent view of these when applying the completed RemoteEvent.
    objUtils.forEachNumber(remoteEvent.targetChanges, (targetId, change) => {
      if (change.resumeToken.length > 0) {
        const queryData = this.listenTargets[targetId];
        // A watched target might have been removed already.
        if (queryData) {
          this.listenTargets[targetId] = queryData.copy({
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
      this.listenTargets[targetId] = queryData.copy({
        resumeToken: emptyByteString()
      });

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
        QueryPurpose.ExistenceFilterMismatch,
        queryData.sequenceNumber
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
          this.watchChangeAggregator!.removeTarget(targetId);
          return this.syncEngine.rejectListen(targetId, error);
        }
      });
    });
    return promiseChain;
  }

  /**
   * Attempts to fill our write pipeline with writes from the LocalStore.
   *
   * Called internally to bootstrap or refill the write pipeline and by
   * SyncEngine whenever there are new mutations to process.
   *
   * Starts the write stream if necessary.
   */
  async fillWritePipeline(): Promise<void> {
    if (this.canAddToWritePipeline()) {
      const lastBatchIdRetrieved =
        this.writePipeline.length > 0
          ? this.writePipeline[this.writePipeline.length - 1].batchId
          : BATCHID_UNKNOWN;
      const batch = await this.localStore.nextMutationBatch(
        lastBatchIdRetrieved
      );

      if (batch === null) {
        if (this.writePipeline.length === 0) {
          this.writeStream.markIdle();
        }
      } else {
        this.addToWritePipeline(batch);
        await this.fillWritePipeline();
      }
    }

    if (this.shouldStartWriteStream()) {
      this.startWriteStream();
    }
  }

  /**
   * Returns true if we can add to the write pipeline (i.e. the network is
   * enabled and the write pipeline is not full).
   */
  private canAddToWritePipeline(): boolean {
    return (
      this.canUseNetwork() && this.writePipeline.length < MAX_PENDING_WRITES
    );
  }

  // For testing
  outstandingWrites(): number {
    return this.writePipeline.length;
  }

  /**
   * Queues additional writes to be sent to the write stream, sending them
   * immediately if the write stream is established.
   */
  private addToWritePipeline(batch: MutationBatch): void {
    assert(
      this.canAddToWritePipeline(),
      'addToWritePipeline called when pipeline is full'
    );
    this.writePipeline.push(batch);

    if (this.writeStream.isOpen() && this.writeStream.handshakeComplete) {
      this.writeStream.writeMutations(batch.mutations);
    }
  }

  private shouldStartWriteStream(): boolean {
    return (
      this.canUseNetwork() &&
      !this.writeStream.isStarted() &&
      this.writePipeline.length > 0
    );
  }

  private startWriteStream(): void {
    assert(
      this.shouldStartWriteStream(),
      'startWriteStream() called when shouldStartWriteStream() is false.'
    );
    this.writeStream.start();
  }

  private async onWriteStreamOpen(): Promise<void> {
    this.writeStream.writeHandshake();
  }

  private onWriteHandshakeComplete(): Promise<void> {
    // Record the stream token.
    return this.localStore
      .setLastStreamToken(this.writeStream.lastStreamToken)
      .then(() => {
        // Send the write pipeline now that the stream is established.
        for (const batch of this.writePipeline) {
          this.writeStream.writeMutations(batch.mutations);
        }
      })
      .catch(ignoreIfPrimaryLeaseLoss);
  }

  private onMutationResult(
    commitVersion: SnapshotVersion,
    results: MutationResult[]
  ): Promise<void> {
    // This is a response to a write containing mutations and should be
    // correlated to the first write in our write pipeline.
    assert(
      this.writePipeline.length > 0,
      'Got result for empty write pipeline'
    );
    const batch = this.writePipeline.shift()!;
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
    if (error === undefined) {
      // Graceful stop (due to stop() or idle timeout). Make sure that's
      // desirable.
      assert(
        !this.shouldStartWriteStream(),
        'Write stream was stopped gracefully while still needed.'
      );
    }

    // If the write stream closed due to an error, invoke the error callbacks if
    // there are pending writes.
    if (error && this.writePipeline.length > 0) {
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
    // Reset the token if it's a permanent error, signaling the write stream is
    // no longer valid. Note that the handshake does not count as a write: see
    // comments on isPermanentWriteError for details.
    if (isPermanentError(error.code)) {
      log.debug(
        LOG_TAG,
        'RemoteStore error before completed handshake; resetting stream token: ',
        this.writeStream.lastStreamToken
      );
      this.writeStream.lastStreamToken = emptyByteString();

      return this.localStore
        .setLastStreamToken(emptyByteString())
        .catch(ignoreIfPrimaryLeaseLoss);
    } else {
      // Some other error, don't reset stream token. Our stream logic will
      // just retry with exponential backoff.
    }
  }

  private async handleWriteError(error: FirestoreError): Promise<void> {
    // Only handle permanent errors here. If it's transient, just let the retry
    // logic kick in.
    if (isPermanentWriteError(error.code)) {
      // This was a permanent error, the request itself was the problem
      // so it's not going to succeed if we resend it.
      const batch = this.writePipeline.shift()!;

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

  private async restartNetwork(): Promise<void> {
    this.networkEnabled = false;
    await this.disableNetworkInternal();
    this.onlineStateTracker.set(OnlineState.Unknown);
    await this.enableNetwork();
  }

  async handleCredentialChange(): Promise<void> {
    if (this.canUseNetwork()) {
      // Tear down and re-create our network streams. This will ensure we get a fresh auth token
      // for the new user and re-fill the write pipeline with new mutations from the LocalStore
      // (since mutations are per-user).
      log.debug(LOG_TAG, 'RemoteStore restarting streams for new credential');
      await this.restartNetwork();
    }
  }

  /**
   * Toggles the network state when the client gains or loses its primary lease.
   */
  async applyPrimaryState(isPrimary: boolean): Promise<void> {
    this.isPrimary = isPrimary;

    if (isPrimary && this.networkEnabled) {
      await this.enableNetwork();
    } else if (!isPrimary) {
      await this.disableNetworkInternal();
      this.onlineStateTracker.set(OnlineState.Unknown);
    }
  }
}
