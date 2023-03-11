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
import { SnapshotVersion } from '../core/snapshot_version';
import { OnlineState, TargetId } from '../core/types';
import { LocalStore } from '../local/local_store';
import {
  localStoreGetLastRemoteSnapshotVersion,
  localStoreGetNextMutationBatch
} from '../local/local_store_impl';
import { isIndexedDbTransactionError } from '../local/simple_db';
import { TargetData } from '../local/target_data';
import { MutationResult } from '../model/mutation';
import { MutationBatch, MutationBatchResult } from '../model/mutation_batch';
import { debugAssert, debugCast } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { ByteString } from '../util/byte_string';
import { FirestoreError } from '../util/error';
import { logDebug } from '../util/log';
import { BATCHID_UNKNOWN } from '../util/types';

import { ConnectivityMonitor, NetworkStatus } from './connectivity_monitor';
import {
  Datastore,
  newPersistentWatchStream,
  newPersistentWriteStream
} from './datastore';
import { OnlineStateTracker } from './online_state_tracker';
import {
  PersistentListenStream,
  PersistentWriteStream
} from './persistent_stream';
import { RemoteSyncer } from './remote_syncer';
import { isPermanentWriteError } from './rpc_error';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from './watch_change';

const LOG_TAG = 'RemoteStore';

// TODO(b/35853402): Negotiate this with the stream.
const MAX_PENDING_WRITES = 10;

/** Reasons for why the RemoteStore may be offline. */
const enum OfflineCause {
  /** The user has explicitly disabled the network (via `disableNetwork()`). */
  UserDisabled,
  /** An IndexedDb failure occurred while persisting a stream update. */
  IndexedDbFailed,
  /** The tab is not the primary tab (only relevant with multi-tab). */
  IsSecondary,
  /** We are restarting the streams due to an Auth credential change. */
  CredentialChange,
  /** The connectivity state of the environment has changed. */
  ConnectivityChange,
  /** The RemoteStore has been shut down. */
  Shutdown
}

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
export interface RemoteStore {
  /**
   * SyncEngine to notify of watch and write events. This must be set
   * immediately after construction.
   */
  remoteSyncer: RemoteSyncer;
}

class RemoteStoreImpl implements RemoteStore {
  remoteSyncer: RemoteSyncer = {};

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
  writePipeline: MutationBatch[] = [];

  /**
   * A mapping of watched targets that the client cares about tracking and the
   * user has explicitly called a 'listen' for this target.
   *
   * These targets may or may not have been sent to or acknowledged by the
   * server. On re-establishing the listen stream, these targets should be sent
   * to the server. The targets removed with unlistens are removed eagerly
   * without waiting for confirmation from the listen stream.
   */
  listenTargets = new Map<TargetId, TargetData>();

  connectivityMonitor: ConnectivityMonitor;
  watchStream?: PersistentListenStream;
  writeStream?: PersistentWriteStream;
  watchChangeAggregator?: WatchChangeAggregator;

  /**
   * A set of reasons for why the RemoteStore may be offline. If empty, the
   * RemoteStore may start its network connections.
   */
  offlineCauses = new Set<OfflineCause>();

  /**
   * Event handlers that get called when the network is disabled or enabled.
   *
   * PORTING NOTE: These functions are used on the Web client to create the
   * underlying streams (to support tree-shakeable streams). On Android and iOS,
   * the streams are created during construction of RemoteStore.
   */
  onNetworkStatusChange: Array<(enabled: boolean) => Promise<void>> = [];

  onlineStateTracker: OnlineStateTracker;

  constructor(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    readonly localStore: LocalStore,
    /** The client-side proxy for interacting with the backend. */
    readonly datastore: Datastore,
    readonly asyncQueue: AsyncQueue,
    onlineStateHandler: (onlineState: OnlineState) => void,
    connectivityMonitor: ConnectivityMonitor
  ) {
    this.connectivityMonitor = connectivityMonitor;
    this.connectivityMonitor.addCallback((_: NetworkStatus) => {
      asyncQueue.enqueueAndForget(async () => {
        // Porting Note: Unlike iOS, `restartNetwork()` is called even when the
        // network becomes unreachable as we don't have any other way to tear
        // down our streams.
        if (canUseNetwork(this)) {
          logDebug(
            LOG_TAG,
            'Restarting streams for network reachability change.'
          );
          await restartNetwork(this);
        }
      });
    });

    this.onlineStateTracker = new OnlineStateTracker(
      asyncQueue,
      onlineStateHandler
    );
  }
}

export function newRemoteStore(
  localStore: LocalStore,
  datastore: Datastore,
  asyncQueue: AsyncQueue,
  onlineStateHandler: (onlineState: OnlineState) => void,
  connectivityMonitor: ConnectivityMonitor
): RemoteStore {
  return new RemoteStoreImpl(
    localStore,
    datastore,
    asyncQueue,
    onlineStateHandler,
    connectivityMonitor
  );
}

/** Re-enables the network. Idempotent. */
export function remoteStoreEnableNetwork(
  remoteStore: RemoteStore
): Promise<void> {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  remoteStoreImpl.offlineCauses.delete(OfflineCause.UserDisabled);
  return enableNetworkInternal(remoteStoreImpl);
}

async function enableNetworkInternal(
  remoteStoreImpl: RemoteStoreImpl
): Promise<void> {
  if (canUseNetwork(remoteStoreImpl)) {
    for (const networkStatusHandler of remoteStoreImpl.onNetworkStatusChange) {
      await networkStatusHandler(/* enabled= */ true);
    }
  }
}

/**
 * Temporarily disables the network. The network can be re-enabled using
 * enableNetwork().
 */
export async function remoteStoreDisableNetwork(
  remoteStore: RemoteStore
): Promise<void> {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  remoteStoreImpl.offlineCauses.add(OfflineCause.UserDisabled);
  await disableNetworkInternal(remoteStoreImpl);

  // Set the OnlineState to Offline so get()s return from cache, etc.
  remoteStoreImpl.onlineStateTracker.set(OnlineState.Offline);
}

async function disableNetworkInternal(
  remoteStoreImpl: RemoteStoreImpl
): Promise<void> {
  for (const networkStatusHandler of remoteStoreImpl.onNetworkStatusChange) {
    await networkStatusHandler(/* enabled= */ false);
  }
}

export async function remoteStoreShutdown(
  remoteStore: RemoteStore
): Promise<void> {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  logDebug(LOG_TAG, 'RemoteStore shutting down.');
  remoteStoreImpl.offlineCauses.add(OfflineCause.Shutdown);
  await disableNetworkInternal(remoteStoreImpl);
  remoteStoreImpl.connectivityMonitor.shutdown();

  // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
  // triggering spurious listener events with cached data, etc.
  remoteStoreImpl.onlineStateTracker.set(OnlineState.Unknown);
}

/**
 * Starts new listen for the given target. Uses resume token if provided. It
 * is a no-op if the target of given `TargetData` is already being listened to.
 */
export function remoteStoreListen(
  remoteStore: RemoteStore,
  targetData: TargetData
): void {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);

  if (remoteStoreImpl.listenTargets.has(targetData.targetId)) {
    return;
  }

  // Mark this as something the client is currently listening for.
  remoteStoreImpl.listenTargets.set(targetData.targetId, targetData);

  if (shouldStartWatchStream(remoteStoreImpl)) {
    // The listen will be sent in onWatchStreamOpen
    startWatchStream(remoteStoreImpl);
  } else if (ensureWatchStream(remoteStoreImpl).isOpen()) {
    sendWatchRequest(remoteStoreImpl, targetData);
  }
}

/**
 * Removes the listen from server. It is a no-op if the given target id is
 * not being listened to.
 */
export function remoteStoreUnlisten(
  remoteStore: RemoteStore,
  targetId: TargetId
): void {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  const watchStream = ensureWatchStream(remoteStoreImpl);

  debugAssert(
    remoteStoreImpl.listenTargets.has(targetId),
    `unlisten called on target no currently watched: ${targetId}`
  );

  remoteStoreImpl.listenTargets.delete(targetId);
  if (watchStream.isOpen()) {
    sendUnwatchRequest(remoteStoreImpl, targetId);
  }

  if (remoteStoreImpl.listenTargets.size === 0) {
    if (watchStream.isOpen()) {
      watchStream.markIdle();
    } else if (canUseNetwork(remoteStoreImpl)) {
      // Revert to OnlineState.Unknown if the watch stream is not open and we
      // have no listeners, since without any listens to send we cannot
      // confirm if the stream is healthy and upgrade to OnlineState.Online.
      remoteStoreImpl.onlineStateTracker.set(OnlineState.Unknown);
    }
  }
}

/**
 * We need to increment the the expected number of pending responses we're due
 * from watch so we wait for the ack to process any messages from this target.
 */
function sendWatchRequest(
  remoteStoreImpl: RemoteStoreImpl,
  targetData: TargetData
): void {
  remoteStoreImpl.watchChangeAggregator!.recordPendingTargetRequest(
    targetData.targetId
  );

  if (
    targetData.resumeToken.approximateByteSize() > 0 ||
    targetData.snapshotVersion.compareTo(SnapshotVersion.min()) > 0
  ) {
    const expectedCount = remoteStoreImpl.remoteSyncer.getRemoteKeysForTarget!(
      targetData.targetId
    ).size;
    targetData = targetData.withExpectedCount(expectedCount);
  }

  ensureWatchStream(remoteStoreImpl).watch(targetData);
}

/**
 * We need to increment the expected number of pending responses we're due
 * from watch so we wait for the removal on the server before we process any
 * messages from this target.
 */
function sendUnwatchRequest(
  remoteStoreImpl: RemoteStoreImpl,
  targetId: TargetId
): void {
  remoteStoreImpl.watchChangeAggregator!.recordPendingTargetRequest(targetId);
  ensureWatchStream(remoteStoreImpl).unwatch(targetId);
}

function startWatchStream(remoteStoreImpl: RemoteStoreImpl): void {
  debugAssert(
    shouldStartWatchStream(remoteStoreImpl),
    'startWatchStream() called when shouldStartWatchStream() is false.'
  );
  debugAssert(
    !!remoteStoreImpl.remoteSyncer.getRemoteKeysForTarget,
    'getRemoteKeysForTarget() not set'
  );

  remoteStoreImpl.watchChangeAggregator = new WatchChangeAggregator({
    getRemoteKeysForTarget: targetId =>
      remoteStoreImpl.remoteSyncer.getRemoteKeysForTarget!(targetId),
    getTargetDataForTarget: targetId =>
      remoteStoreImpl.listenTargets.get(targetId) || null,
    getDatabaseId: () => remoteStoreImpl.datastore.serializer.databaseId
  });
  ensureWatchStream(remoteStoreImpl).start();
  remoteStoreImpl.onlineStateTracker.handleWatchStreamStart();
}

/**
 * Returns whether the watch stream should be started because it's necessary
 * and has not yet been started.
 */
function shouldStartWatchStream(remoteStoreImpl: RemoteStoreImpl): boolean {
  return (
    canUseNetwork(remoteStoreImpl) &&
    !ensureWatchStream(remoteStoreImpl).isStarted() &&
    remoteStoreImpl.listenTargets.size > 0
  );
}

export function canUseNetwork(remoteStore: RemoteStore): boolean {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  return remoteStoreImpl.offlineCauses.size === 0;
}

function cleanUpWatchStreamState(remoteStoreImpl: RemoteStoreImpl): void {
  remoteStoreImpl.watchChangeAggregator = undefined;
}

async function onWatchStreamOpen(
  remoteStoreImpl: RemoteStoreImpl
): Promise<void> {
  remoteStoreImpl.listenTargets.forEach((targetData, targetId) => {
    sendWatchRequest(remoteStoreImpl, targetData);
  });
}

async function onWatchStreamClose(
  remoteStoreImpl: RemoteStoreImpl,
  error?: FirestoreError
): Promise<void> {
  if (error === undefined) {
    // Graceful stop (due to stop() or idle timeout). Make sure that's
    // desirable.
    debugAssert(
      !shouldStartWatchStream(remoteStoreImpl),
      'Watch stream was stopped gracefully while still needed.'
    );
  }

  cleanUpWatchStreamState(remoteStoreImpl);

  // If we still need the watch stream, retry the connection.
  if (shouldStartWatchStream(remoteStoreImpl)) {
    remoteStoreImpl.onlineStateTracker.handleWatchStreamFailure(error!);

    startWatchStream(remoteStoreImpl);
  } else {
    // No need to restart watch stream because there are no active targets.
    // The online state is set to unknown because there is no active attempt
    // at establishing a connection
    remoteStoreImpl.onlineStateTracker.set(OnlineState.Unknown);
  }
}

async function onWatchStreamChange(
  remoteStoreImpl: RemoteStoreImpl,
  watchChange: WatchChange,
  snapshotVersion: SnapshotVersion
): Promise<void> {
  // Mark the client as online since we got a message from the server
  remoteStoreImpl.onlineStateTracker.set(OnlineState.Online);

  if (
    watchChange instanceof WatchTargetChange &&
    watchChange.state === WatchTargetChangeState.Removed &&
    watchChange.cause
  ) {
    // There was an error on a target, don't wait for a consistent snapshot
    // to raise events
    try {
      await handleTargetError(remoteStoreImpl, watchChange);
    } catch (e) {
      logDebug(
        LOG_TAG,
        'Failed to remove targets %s: %s ',
        watchChange.targetIds.join(','),
        e
      );
      await disableNetworkUntilRecovery(remoteStoreImpl, e as FirestoreError);
    }
    return;
  }

  if (watchChange instanceof DocumentWatchChange) {
    remoteStoreImpl.watchChangeAggregator!.handleDocumentChange(watchChange);
  } else if (watchChange instanceof ExistenceFilterChange) {
    remoteStoreImpl.watchChangeAggregator!.handleExistenceFilter(watchChange);
  } else {
    debugAssert(
      watchChange instanceof WatchTargetChange,
      'Expected watchChange to be an instance of WatchTargetChange'
    );
    remoteStoreImpl.watchChangeAggregator!.handleTargetChange(watchChange);
  }

  if (!snapshotVersion.isEqual(SnapshotVersion.min())) {
    try {
      const lastRemoteSnapshotVersion =
        await localStoreGetLastRemoteSnapshotVersion(
          remoteStoreImpl.localStore
        );
      if (snapshotVersion.compareTo(lastRemoteSnapshotVersion) >= 0) {
        // We have received a target change with a global snapshot if the snapshot
        // version is not equal to SnapshotVersion.min().
        await raiseWatchSnapshot(remoteStoreImpl, snapshotVersion);
      }
    } catch (e) {
      logDebug(LOG_TAG, 'Failed to raise snapshot:', e);
      await disableNetworkUntilRecovery(remoteStoreImpl, e as FirestoreError);
    }
  }
}

/**
 * Recovery logic for IndexedDB errors that takes the network offline until
 * `op` succeeds. Retries are scheduled with backoff using
 * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
 * validated via a generic operation.
 *
 * The returned Promise is resolved once the network is disabled and before
 * any retry attempt.
 */
async function disableNetworkUntilRecovery(
  remoteStoreImpl: RemoteStoreImpl,
  e: FirestoreError,
  op?: () => Promise<unknown>
): Promise<void> {
  if (isIndexedDbTransactionError(e)) {
    debugAssert(
      !remoteStoreImpl.offlineCauses.has(OfflineCause.IndexedDbFailed),
      'Unexpected network event when IndexedDB was marked failed.'
    );
    remoteStoreImpl.offlineCauses.add(OfflineCause.IndexedDbFailed);

    // Disable network and raise offline snapshots
    await disableNetworkInternal(remoteStoreImpl);
    remoteStoreImpl.onlineStateTracker.set(OnlineState.Offline);

    if (!op) {
      // Use a simple read operation to determine if IndexedDB recovered.
      // Ideally, we would expose a health check directly on SimpleDb, but
      // RemoteStore only has access to persistence through LocalStore.
      op = () =>
        localStoreGetLastRemoteSnapshotVersion(remoteStoreImpl.localStore);
    }

    // Probe IndexedDB periodically and re-enable network
    remoteStoreImpl.asyncQueue.enqueueRetryable(async () => {
      logDebug(LOG_TAG, 'Retrying IndexedDB access');
      await op!();
      remoteStoreImpl.offlineCauses.delete(OfflineCause.IndexedDbFailed);
      await enableNetworkInternal(remoteStoreImpl);
    });
  } else {
    throw e;
  }
}

/**
 * Executes `op`. If `op` fails, takes the network offline until `op`
 * succeeds. Returns after the first attempt.
 */
function executeWithRecovery(
  remoteStoreImpl: RemoteStoreImpl,
  op: () => Promise<void>
): Promise<void> {
  return op().catch(e => disableNetworkUntilRecovery(remoteStoreImpl, e, op));
}

/**
 * Takes a batch of changes from the Datastore, repackages them as a
 * RemoteEvent, and passes that on to the listener, which is typically the
 * SyncEngine.
 */
function raiseWatchSnapshot(
  remoteStoreImpl: RemoteStoreImpl,
  snapshotVersion: SnapshotVersion
): Promise<void> {
  debugAssert(
    !snapshotVersion.isEqual(SnapshotVersion.min()),
    "Can't raise event for unknown SnapshotVersion"
  );
  const remoteEvent =
    remoteStoreImpl.watchChangeAggregator!.createRemoteEvent(snapshotVersion);

  // Update in-memory resume tokens. LocalStore will update the
  // persistent view of these when applying the completed RemoteEvent.
  remoteEvent.targetChanges.forEach((change, targetId) => {
    if (change.resumeToken.approximateByteSize() > 0) {
      const targetData = remoteStoreImpl.listenTargets.get(targetId);
      // A watched target might have been removed already.
      if (targetData) {
        remoteStoreImpl.listenTargets.set(
          targetId,
          targetData.withResumeToken(change.resumeToken, snapshotVersion)
        );
      }
    }
  });

  // Re-establish listens for the targets that have been invalidated by
  // existence filter mismatches.
  remoteEvent.targetMismatches.forEach((targetId, targetPurpose) => {
    const targetData = remoteStoreImpl.listenTargets.get(targetId);
    if (!targetData) {
      // A watched target might have been removed already.
      return;
    }

    // Clear the resume token for the target, since we're in a known mismatch
    // state.
    remoteStoreImpl.listenTargets.set(
      targetId,
      targetData.withResumeToken(
        ByteString.EMPTY_BYTE_STRING,
        targetData.snapshotVersion
      )
    );

    // Cause a hard reset by unwatching and rewatching immediately, but
    // deliberately don't send a resume token so that we get a full update.
    sendUnwatchRequest(remoteStoreImpl, targetId);

    // Mark the target we send as being on behalf of an existence filter
    // mismatch, but don't actually retain that in listenTargets. This ensures
    // that we flag the first re-listen this way without impacting future
    // listens of this target (that might happen e.g. on reconnect).
    const requestTargetData = new TargetData(
      targetData.target,
      targetId,
      targetPurpose,
      targetData.sequenceNumber
    );
    sendWatchRequest(remoteStoreImpl, requestTargetData);
  });

  // Finally raise remote event
  debugAssert(
    !!remoteStoreImpl.remoteSyncer.applyRemoteEvent,
    'applyRemoteEvent() not set'
  );
  return remoteStoreImpl.remoteSyncer.applyRemoteEvent(remoteEvent);
}

/** Handles an error on a target */
async function handleTargetError(
  remoteStoreImpl: RemoteStoreImpl,
  watchChange: WatchTargetChange
): Promise<void> {
  debugAssert(
    !!remoteStoreImpl.remoteSyncer.rejectListen,
    'rejectListen() not set'
  );
  debugAssert(!!watchChange.cause, 'Handling target error without a cause');
  const error = watchChange.cause!;
  for (const targetId of watchChange.targetIds) {
    // A watched target might have been removed already.
    if (remoteStoreImpl.listenTargets.has(targetId)) {
      await remoteStoreImpl.remoteSyncer.rejectListen(targetId, error);
      remoteStoreImpl.listenTargets.delete(targetId);
      remoteStoreImpl.watchChangeAggregator!.removeTarget(targetId);
    }
  }
}

/**
 * Attempts to fill our write pipeline with writes from the LocalStore.
 *
 * Called internally to bootstrap or refill the write pipeline and by
 * SyncEngine whenever there are new mutations to process.
 *
 * Starts the write stream if necessary.
 */
export async function fillWritePipeline(
  remoteStore: RemoteStore
): Promise<void> {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  const writeStream = ensureWriteStream(remoteStoreImpl);

  let lastBatchIdRetrieved =
    remoteStoreImpl.writePipeline.length > 0
      ? remoteStoreImpl.writePipeline[remoteStoreImpl.writePipeline.length - 1]
          .batchId
      : BATCHID_UNKNOWN;

  while (canAddToWritePipeline(remoteStoreImpl)) {
    try {
      const batch = await localStoreGetNextMutationBatch(
        remoteStoreImpl.localStore,
        lastBatchIdRetrieved
      );

      if (batch === null) {
        if (remoteStoreImpl.writePipeline.length === 0) {
          writeStream.markIdle();
        }
        break;
      } else {
        lastBatchIdRetrieved = batch.batchId;
        addToWritePipeline(remoteStoreImpl, batch);
      }
    } catch (e) {
      await disableNetworkUntilRecovery(remoteStoreImpl, e as FirestoreError);
    }
  }

  if (shouldStartWriteStream(remoteStoreImpl)) {
    startWriteStream(remoteStoreImpl);
  }
}

/**
 * Returns true if we can add to the write pipeline (i.e. the network is
 * enabled and the write pipeline is not full).
 */
function canAddToWritePipeline(remoteStoreImpl: RemoteStoreImpl): boolean {
  return (
    canUseNetwork(remoteStoreImpl) &&
    remoteStoreImpl.writePipeline.length < MAX_PENDING_WRITES
  );
}

// For testing
export function outstandingWrites(remoteStore: RemoteStore): number {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  return remoteStoreImpl.writePipeline.length;
}

/**
 * Queues additional writes to be sent to the write stream, sending them
 * immediately if the write stream is established.
 */
function addToWritePipeline(
  remoteStoreImpl: RemoteStoreImpl,
  batch: MutationBatch
): void {
  debugAssert(
    canAddToWritePipeline(remoteStoreImpl),
    'addToWritePipeline called when pipeline is full'
  );
  remoteStoreImpl.writePipeline.push(batch);

  const writeStream = ensureWriteStream(remoteStoreImpl);
  if (writeStream.isOpen() && writeStream.handshakeComplete) {
    writeStream.writeMutations(batch.mutations);
  }
}

function shouldStartWriteStream(remoteStoreImpl: RemoteStoreImpl): boolean {
  return (
    canUseNetwork(remoteStoreImpl) &&
    !ensureWriteStream(remoteStoreImpl).isStarted() &&
    remoteStoreImpl.writePipeline.length > 0
  );
}

function startWriteStream(remoteStoreImpl: RemoteStoreImpl): void {
  debugAssert(
    shouldStartWriteStream(remoteStoreImpl),
    'startWriteStream() called when shouldStartWriteStream() is false.'
  );
  ensureWriteStream(remoteStoreImpl).start();
}

async function onWriteStreamOpen(
  remoteStoreImpl: RemoteStoreImpl
): Promise<void> {
  ensureWriteStream(remoteStoreImpl).writeHandshake();
}

async function onWriteHandshakeComplete(
  remoteStoreImpl: RemoteStoreImpl
): Promise<void> {
  const writeStream = ensureWriteStream(remoteStoreImpl);
  // Send the write pipeline now that the stream is established.
  for (const batch of remoteStoreImpl.writePipeline) {
    writeStream.writeMutations(batch.mutations);
  }
}

async function onMutationResult(
  remoteStoreImpl: RemoteStoreImpl,
  commitVersion: SnapshotVersion,
  results: MutationResult[]
): Promise<void> {
  // This is a response to a write containing mutations and should be
  // correlated to the first write in our write pipeline.
  debugAssert(
    remoteStoreImpl.writePipeline.length > 0,
    'Got result for empty write pipeline'
  );
  const batch = remoteStoreImpl.writePipeline.shift()!;
  const success = MutationBatchResult.from(batch, commitVersion, results);

  debugAssert(
    !!remoteStoreImpl.remoteSyncer.applySuccessfulWrite,
    'applySuccessfulWrite() not set'
  );
  await executeWithRecovery(remoteStoreImpl, () =>
    remoteStoreImpl.remoteSyncer.applySuccessfulWrite!(success)
  );

  // It's possible that with the completion of this mutation another
  // slot has freed up.
  await fillWritePipeline(remoteStoreImpl);
}

async function onWriteStreamClose(
  remoteStoreImpl: RemoteStoreImpl,
  error?: FirestoreError
): Promise<void> {
  if (error === undefined) {
    // Graceful stop (due to stop() or idle timeout). Make sure that's
    // desirable.
    debugAssert(
      !shouldStartWriteStream(remoteStoreImpl),
      'Write stream was stopped gracefully while still needed.'
    );
  }

  // If the write stream closed after the write handshake completes, a write
  // operation failed and we fail the pending operation.
  if (error && ensureWriteStream(remoteStoreImpl).handshakeComplete) {
    // This error affects the actual write.
    await handleWriteError(remoteStoreImpl, error!);
  }

  // The write stream might have been started by refilling the write
  // pipeline for failed writes
  if (shouldStartWriteStream(remoteStoreImpl)) {
    startWriteStream(remoteStoreImpl);
  }
}

async function handleWriteError(
  remoteStoreImpl: RemoteStoreImpl,
  error: FirestoreError
): Promise<void> {
  // Only handle permanent errors here. If it's transient, just let the retry
  // logic kick in.
  if (isPermanentWriteError(error.code)) {
    // This was a permanent error, the request itself was the problem
    // so it's not going to succeed if we resend it.
    const batch = remoteStoreImpl.writePipeline.shift()!;

    // In this case it's also unlikely that the server itself is melting
    // down -- this was just a bad request so inhibit backoff on the next
    // restart.
    ensureWriteStream(remoteStoreImpl).inhibitBackoff();

    debugAssert(
      !!remoteStoreImpl.remoteSyncer.rejectFailedWrite,
      'rejectFailedWrite() not set'
    );
    await executeWithRecovery(remoteStoreImpl, () =>
      remoteStoreImpl.remoteSyncer.rejectFailedWrite!(batch.batchId, error)
    );

    // It's possible that with the completion of this mutation
    // another slot has freed up.
    await fillWritePipeline(remoteStoreImpl);
  } else {
    // Transient error, just let the retry logic kick in.
  }
}

async function restartNetwork(remoteStore: RemoteStore): Promise<void> {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  remoteStoreImpl.offlineCauses.add(OfflineCause.ConnectivityChange);
  await disableNetworkInternal(remoteStoreImpl);
  remoteStoreImpl.onlineStateTracker.set(OnlineState.Unknown);
  remoteStoreImpl.offlineCauses.delete(OfflineCause.ConnectivityChange);
  await enableNetworkInternal(remoteStoreImpl);
}

export async function remoteStoreHandleCredentialChange(
  remoteStore: RemoteStore,
  user: User
): Promise<void> {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  remoteStoreImpl.asyncQueue.verifyOperationInProgress();
  debugAssert(
    !!remoteStoreImpl.remoteSyncer.handleCredentialChange,
    'handleCredentialChange() not set'
  );

  logDebug(LOG_TAG, 'RemoteStore received new credentials');
  const usesNetwork = canUseNetwork(remoteStoreImpl);

  // Tear down and re-create our network streams. This will ensure we get a
  // fresh auth token for the new user and re-fill the write pipeline with
  // new mutations from the LocalStore (since mutations are per-user).
  remoteStoreImpl.offlineCauses.add(OfflineCause.CredentialChange);
  await disableNetworkInternal(remoteStoreImpl);
  if (usesNetwork) {
    // Don't set the network status to Unknown if we are offline.
    remoteStoreImpl.onlineStateTracker.set(OnlineState.Unknown);
  }
  await remoteStoreImpl.remoteSyncer.handleCredentialChange(user);
  remoteStoreImpl.offlineCauses.delete(OfflineCause.CredentialChange);
  await enableNetworkInternal(remoteStoreImpl);
}

/**
 * Toggles the network state when the client gains or loses its primary lease.
 */
export async function remoteStoreApplyPrimaryState(
  remoteStore: RemoteStore,
  isPrimary: boolean
): Promise<void> {
  const remoteStoreImpl = debugCast(remoteStore, RemoteStoreImpl);
  if (isPrimary) {
    remoteStoreImpl.offlineCauses.delete(OfflineCause.IsSecondary);
    await enableNetworkInternal(remoteStoreImpl);
  } else if (!isPrimary) {
    remoteStoreImpl.offlineCauses.add(OfflineCause.IsSecondary);
    await disableNetworkInternal(remoteStoreImpl);
    remoteStoreImpl.onlineStateTracker.set(OnlineState.Unknown);
  }
}

/**
 * If not yet initialized, registers the WatchStream and its network state
 * callback with `remoteStoreImpl`. Returns the existing stream if one is
 * already available.
 *
 * PORTING NOTE: On iOS and Android, the WatchStream gets registered on startup.
 * This is not done on Web to allow it to be tree-shaken.
 */
function ensureWatchStream(
  remoteStoreImpl: RemoteStoreImpl
): PersistentListenStream {
  if (!remoteStoreImpl.watchStream) {
    // Create stream (but note that it is not started yet).
    remoteStoreImpl.watchStream = newPersistentWatchStream(
      remoteStoreImpl.datastore,
      remoteStoreImpl.asyncQueue,
      {
        onOpen: onWatchStreamOpen.bind(null, remoteStoreImpl),
        onClose: onWatchStreamClose.bind(null, remoteStoreImpl),
        onWatchChange: onWatchStreamChange.bind(null, remoteStoreImpl)
      }
    );

    remoteStoreImpl.onNetworkStatusChange.push(async enabled => {
      if (enabled) {
        remoteStoreImpl.watchStream!.inhibitBackoff();
        if (shouldStartWatchStream(remoteStoreImpl)) {
          startWatchStream(remoteStoreImpl);
        } else {
          remoteStoreImpl.onlineStateTracker.set(OnlineState.Unknown);
        }
      } else {
        await remoteStoreImpl.watchStream!.stop();
        cleanUpWatchStreamState(remoteStoreImpl);
      }
    });
  }

  return remoteStoreImpl.watchStream;
}

/**
 * If not yet initialized, registers the WriteStream and its network state
 * callback with `remoteStoreImpl`. Returns the existing stream if one is
 * already available.
 *
 * PORTING NOTE: On iOS and Android, the WriteStream gets registered on startup.
 * This is not done on Web to allow it to be tree-shaken.
 */
function ensureWriteStream(
  remoteStoreImpl: RemoteStoreImpl
): PersistentWriteStream {
  if (!remoteStoreImpl.writeStream) {
    debugAssert(
      remoteStoreImpl.writePipeline.length === 0,
      'Should not issue writes before WriteStream is enabled'
    );

    // Create stream (but note that it is not started yet).
    remoteStoreImpl.writeStream = newPersistentWriteStream(
      remoteStoreImpl.datastore,
      remoteStoreImpl.asyncQueue,
      {
        onOpen: onWriteStreamOpen.bind(null, remoteStoreImpl),
        onClose: onWriteStreamClose.bind(null, remoteStoreImpl),
        onHandshakeComplete: onWriteHandshakeComplete.bind(
          null,
          remoteStoreImpl
        ),
        onMutationResult: onMutationResult.bind(null, remoteStoreImpl)
      }
    );

    remoteStoreImpl.onNetworkStatusChange.push(async enabled => {
      if (enabled) {
        remoteStoreImpl.writeStream!.inhibitBackoff();

        // This will start the write stream if necessary.
        await fillWritePipeline(remoteStoreImpl);
      } else {
        await remoteStoreImpl.writeStream!.stop();

        if (remoteStoreImpl.writePipeline.length > 0) {
          logDebug(
            LOG_TAG,
            `Stopping write stream with ${remoteStoreImpl.writePipeline.length} pending writes`
          );
          remoteStoreImpl.writePipeline = [];
        }
      }
    });
  }

  return remoteStoreImpl.writeStream;
}
