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

import * as api from '../protos/firestore_proto_api';
import { CredentialsProvider, Token } from '../api/credentials';
import { SnapshotVersion } from '../core/snapshot_version';
import { ProtoByteString, TargetId } from '../core/types';
import { QueryData } from '../local/query_data';
import { Mutation, MutationResult } from '../model/mutation';
import { assert } from '../util/assert';
import { AsyncQueue, TimerId } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import * as log from '../util/log';

import { ExponentialBackoff } from './backoff';
import { Connection, Stream } from './connection';
import { JsonProtoSerializer } from './serializer';
import { WatchChange } from './watch_change';
import { isNullOrUndefined } from '../util/types';
import { CancelablePromise } from '../util/promise';

const LOG_TAG = 'PersistentStream';

// The generated proto interfaces for these class are missing the database
// field. So we add it here.
// TODO(b/36015800): Remove this once the api generator is fixed.
interface ListenRequest extends api.ListenRequest {
  database?: string;
}
export interface WriteRequest extends api.WriteRequest {
  database?: string;
}

enum PersistentStreamState {
  /**
   * The streaming RPC is not running and there's no error condition.
   * Calling `start` will start the stream immediately without backoff.
   * While in this state isStarted will return false.
   */
  Initial,

  /**
   * The stream is starting, and is waiting for an auth token to attach to
   * the initial request. While in this state, isStarted will return
   * true but isOpen will return false.
   */
  Auth,

  /**
   * The streaming RPC is up and running. Requests and responses can flow
   * freely. Both isStarted and isOpen will return true.
   */
  Open,

  /**
   * The stream encountered an error. The next start attempt will back off.
   * While in this state isStarted() will return false.
   *
   */
  Error,

  /**
   * An in-between state after an error where the stream is waiting before
   * re-starting. After
   * waiting is complete, the stream will try to open. While in this
   * state isStarted() will return YES but isOpen will return false.
   */
  Backoff,

  /**
   * The stream has been explicitly stopped; no further events will be emitted.
   */
  Stopped
}

/**
 * Provides a common interface that is shared by the listeners for stream
 * events by the concrete implementation classes.
 */
export interface PersistentStreamListener {
  /**
   * Called after the stream was established and can accept outgoing
   * messages
   */
  onOpen: () => Promise<void>;
  /**
   * Called after the stream has closed. If there was an error, the
   * FirestoreError will be set.
   */
  onClose: (err?: FirestoreError) => Promise<void>;
}

/**
 * Initial backoff time in milliseconds after an error.
 * Set to 1s according to https://cloud.google.com/apis/design/errors.
 */
const BACKOFF_INITIAL_DELAY_MS = 1000;

/** Maximum backoff time in milliseconds */
const BACKOFF_MAX_DELAY_MS = 60 * 1000;

const BACKOFF_FACTOR = 1.5;

/** The time a stream stays open after it is marked idle. */
const IDLE_TIMEOUT_MS = 60 * 1000;

/**
 * A PersistentStream is an abstract base class that represents a streaming RPC
 * to the Firestore backend. It's built on top of the connections own support
 * for streaming RPCs, and adds several critical features for our clients:
 *
 *   - Exponential backoff on failure
 *   - Authentication via CredentialsProvider
 *   - Dispatching all callbacks into the shared worker queue
 *
 * Subclasses of PersistentStream implement serialization of models to and
 * from the JSON representation of the protocol buffers for a specific
 * streaming RPC.
 *
 * ## Starting and Stopping
 *
 * Streaming RPCs are stateful and need to be `start`ed before messages can
 * be sent and received. The PersistentStream will call the onOpen function
 * of the listener once the stream is ready to accept requests.
 *
 * Should a `start` fail, PersistentStream will call the registered
 * onClose with a FirestoreError indicating what went wrong.
 *
 * A PersistentStream can be started and stopped repeatedly.
 *
 * Generic types:
 *  SendType: The type of the outgoing message of the underlying
 *    connection stream
 *  ReceiveType: The type of the incoming message of the underlying
 *    connection stream
 *  ListenerType: The type of the listener that will be used for callbacks
 */
export abstract class PersistentStream<
  SendType,
  ReceiveType,
  ListenerType extends PersistentStreamListener
> {
  private state: PersistentStreamState;
  private inactivityTimerPromise: CancelablePromise<void> | null = null;
  private stream: Stream<SendType, ReceiveType> | null = null;

  protected backoff: ExponentialBackoff;

  protected listener: ListenerType | null = null;

  constructor(
    private queue: AsyncQueue,
    connectionTimerId: TimerId,
    private idleTimerId: TimerId,
    protected connection: Connection,
    private credentialsProvider: CredentialsProvider
  ) {
    this.backoff = new ExponentialBackoff(
      queue,
      connectionTimerId,
      BACKOFF_INITIAL_DELAY_MS,
      BACKOFF_FACTOR,
      BACKOFF_MAX_DELAY_MS
    );
    this.state = PersistentStreamState.Initial;
  }

  /**
   * Returns true if `start` has been called and no error has occurred. True
   * indicates the stream is open or in the process of opening (which
   * encompasses respecting backoff, getting auth tokens, and starting the
   * actual RPC). Use `isOpen` to determine if the stream is open and ready for
   * outbound requests.
   */
  isStarted(): boolean {
    return (
      this.state === PersistentStreamState.Backoff ||
      this.state === PersistentStreamState.Auth ||
      this.state === PersistentStreamState.Open
    );
  }

  /**
   * Returns true if the underlying RPC is open (the openHandler has been
   * called) and the stream is ready for outbound requests.
   */
  isOpen(): boolean {
    return this.state === PersistentStreamState.Open;
  }

  /**
   * Starts the RPC. Only allowed if isStarted returns false. The stream is
   * not immediately ready for use: onOpen will be invoked when the RPC is ready
   * for outbound requests, at which point isOpen will return true.
   *
   *  When start returns, isStarted will return true.
   */
  start(listener: ListenerType): void {
    if (this.state === PersistentStreamState.Error) {
      this.performBackoff(listener);
      return;
    }

    assert(this.state === PersistentStreamState.Initial, 'Already started');
    this.listener = listener;
    this.auth();
  }

  /**
   * Stops the RPC. This call is idempotent and allowed regardless of the
   * current isStarted state.
   *
   * When stop returns, isStarted and isOpen will both return false.
   */
  stop(): void {
    if (this.isStarted()) {
      this.close(PersistentStreamState.Stopped);
    }
  }

  /**
   * After an error the stream will usually back off on the next attempt to
   * start it. If the error warrants an immediate restart of the stream, the
   * sender can use this to indicate that the receiver should not back off.
   *
   * Each error will call the onClose function. That function can decide to
   * inhibit backoff if required.
   */
  inhibitBackoff(): void {
    assert(!this.isStarted(), 'Can only inhibit backoff in a stopped state');

    this.state = PersistentStreamState.Initial;
    this.backoff.reset();
  }

  /**
   * Marks this stream as idle. If no further actions are performed on the
   * stream for one minute, the stream will automatically close itself and
   * notify the stream's onClose() handler with Status.OK. The stream will then
   * be in a !isStarted() state, requiring the caller to start the stream again
   * before further use.
   *
   * Only streams that are in state 'Open' can be marked idle, as all other
   * states imply pending network operations.
   */
  markIdle(): void {
    // Starts the idle time if we are in state 'Open' and are not yet already
    // running a timer (in which case the previous idle timeout still applies).
    if (this.isOpen() && this.inactivityTimerPromise === null) {
      this.inactivityTimerPromise = this.queue.enqueueAfterDelay(
        this.idleTimerId,
        IDLE_TIMEOUT_MS,
        () => this.handleIdleCloseTimer()
      );
    }
  }

  /** Sends a message to the underlying stream. */
  protected sendRequest(msg: SendType): void {
    this.cancelIdleCheck();
    this.stream!.send(msg);
  }

  /** Called by the idle timer when the stream should close due to inactivity. */
  private async handleIdleCloseTimer(): Promise<void> {
    if (this.isOpen()) {
      // When timing out an idle stream there's no reason to force the stream into backoff when
      // it restarts so set the stream state to Initial instead of Error.
      return this.close(PersistentStreamState.Initial);
    }
  }

  /** Marks the stream as active again. */
  private cancelIdleCheck(): void {
    if (this.inactivityTimerPromise) {
      this.inactivityTimerPromise.cancel();
      this.inactivityTimerPromise = null;
    }
  }

  /**
   * Closes the stream and cleans up as necessary:
   *
   * * closes the underlying GRPC stream;
   * * calls the onClose handler with the given 'error';
   * * sets internal stream state to 'finalState';
   * * adjusts the backoff timer based on the error
   *
   * A new stream can be opened by calling `start` unless `finalState` is set to
   * `PersistentStreamState.Stopped`.
   *
   * @param finalState the intended state of the stream after closing.
   * @param error the error the connection was closed with.
   */
  private async close(
    finalState: PersistentStreamState,
    error?: FirestoreError
  ): Promise<void> {
    assert(
      finalState === PersistentStreamState.Error || isNullOrUndefined(error),
      "Can't provide an error when not in an error state."
    );

    // The stream will be closed so we don't need our idle close timer anymore.
    this.cancelIdleCheck();

    // Ensure we don't leave a pending backoff operation queued (in case close()
    // was called while we were waiting to reconnect).
    this.backoff.cancel();

    if (finalState !== PersistentStreamState.Error) {
      // If this is an intentional close ensure we don't delay our next connection attempt.
      this.backoff.reset();
    } else if (error && error.code === Code.RESOURCE_EXHAUSTED) {
      // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
      log.error(error.toString());
      log.error(
        'Using maximum backoff delay to prevent overloading the backend.'
      );
      this.backoff.resetToMax();
    }

    // Clean up the underlying stream because we are no longer interested in events.
    if (this.stream !== null) {
      this.tearDown();
      this.stream.close();
      this.stream = null;
    }

    // This state must be assigned before calling onClose() to allow the callback to
    // inhibit backoff or otherwise manipulate the state in its non-started state.
    this.state = finalState;
    const listener = this.listener!;

    // Clear the listener to avoid bleeding of events from the underlying streams.
    this.listener = null;

    // If the caller explicitly requested a stream stop, don't notify them of a closing stream (it
    // could trigger undesirable recovery logic, etc.).
    if (finalState !== PersistentStreamState.Stopped) {
      return listener.onClose(error);
    }
  }

  /**
   * Can be overridden to perform additional cleanup before the stream is closed.
   * Calling super.tearDown() is not required.
   */
  protected tearDown(): void {}

  /**
   * Used by subclasses to start the concrete RPC and return the underlying
   * connection stream.
   */
  protected abstract startRpc(
    token: Token | null
  ): Stream<SendType, ReceiveType>;

  /**
   * Called after the stream has received a message. The function will be
   * called on the right queue and must return a Promise.
   * @param message The message received from the stream.
   */
  protected abstract onMessage(message: ReceiveType): Promise<void>;

  private auth(): void {
    assert(
      this.state === PersistentStreamState.Initial,
      'Must be in initial state to auth'
    );

    this.state = PersistentStreamState.Auth;

    this.credentialsProvider.getToken(/*forceRefresh=*/ false).then(
      token => {
        // Normally we'd have to schedule the callback on the AsyncQueue.
        // However, the following calls are safe to be called outside the
        // AsyncQueue since they don't chain asynchronous calls
        this.startStream(token);
      },
      (error: Error) => {
        this.queue.enqueue(async () => {
          if (this.state !== PersistentStreamState.Stopped) {
            // Stream can be stopped while waiting for authorization.
            const rpcError = new FirestoreError(
              Code.UNKNOWN,
              'Fetching auth token failed: ' + error.message
            );
            return this.handleStreamClose(rpcError);
          }
        });
      }
    );
  }

  private startStream(token: Token | null): void {
    if (this.state === PersistentStreamState.Stopped) {
      // Stream can be stopped while waiting for authorization.
      return;
    }

    assert(
      this.state === PersistentStreamState.Auth,
      'Trying to start stream in a non-auth state'
    );
    // Helper function to dispatch to AsyncQueue and make sure that any
    // close will seem instantaneous and events are prevented from being
    // raised after the close call
    const dispatchIfStillActive = (
      stream: Stream<SendType, ReceiveType>,
      fn: () => Promise<void>
    ) => {
      this.queue.enqueue(async () => {
        // Only raise events if the stream instance has not changed
        if (this.stream === stream) {
          return fn();
        }
      });
    };

    // Only start stream if listener has not changed
    if (this.listener !== null) {
      const currentStream = this.startRpc(token);
      this.stream = currentStream;
      this.stream.onOpen(() => {
        dispatchIfStillActive(currentStream, () => {
          assert(
            this.state === PersistentStreamState.Auth,
            'Expected stream to be in state auth, but was ' + this.state
          );
          this.state = PersistentStreamState.Open;
          return this.listener!.onOpen();
        });
      });
      this.stream.onClose((error: FirestoreError) => {
        dispatchIfStillActive(currentStream, () => {
          return this.handleStreamClose(error);
        });
      });
      this.stream.onMessage((msg: ReceiveType) => {
        dispatchIfStillActive(currentStream, () => {
          return this.onMessage(msg);
        });
      });
    }
  }

  private performBackoff(listener: ListenerType): void {
    assert(
      this.state === PersistentStreamState.Error,
      'Should only perform backoff in an error case'
    );
    this.state = PersistentStreamState.Backoff;

    this.backoff.backoffAndRun(async () => {
      if (this.state === PersistentStreamState.Stopped) {
        // We should have canceled the backoff timer when the stream was
        // closed, but just in case we make this a no-op.
        return;
      }

      this.state = PersistentStreamState.Initial;
      this.start(listener);
      assert(this.isStarted(), 'PersistentStream should have started');
    });
  }

  private handleStreamClose(error?: FirestoreError): Promise<void> {
    assert(this.isStarted(), "Can't handle server close on non-started stream");
    log.debug(LOG_TAG, `close with error: ${error}`);

    this.stream = null;

    // In theory the stream could close cleanly, however, in our current model
    // we never expect this to happen because if we stop a stream ourselves,
    // this callback will never be called. To prevent cases where we retry
    // without a backoff accidentally, we set the stream to error in all cases.
    return this.close(PersistentStreamState.Error, error);
  }
}

/** Listener for the PersistentWatchStream */
export interface WatchStreamListener extends PersistentStreamListener {
  /**
   * Called on a watchChange. The snapshot parameter will be MIN if the watch
   * change did not have a snapshot associated with it.
   */
  onWatchChange: (
    watchChange: WatchChange,
    snapshot: SnapshotVersion
  ) => Promise<void>;
}

/**
 * A PersistentStream that implements the Listen RPC.
 *
 * Once the Listen stream has called the openHandler, any number of listen and
 * unlisten calls calls can be sent to control what changes will be sent from
 * the server for ListenResponses.
 */
export class PersistentListenStream extends PersistentStream<
  api.ListenRequest,
  api.ListenResponse,
  WatchStreamListener
> {
  constructor(
    queue: AsyncQueue,
    connection: Connection,
    credentials: CredentialsProvider,
    private serializer: JsonProtoSerializer
  ) {
    super(
      queue,
      TimerId.ListenStreamConnectionBackoff,
      TimerId.ListenStreamIdle,
      connection,
      credentials
    );
  }

  protected startRpc(
    token: Token | null
  ): Stream<api.ListenRequest, api.ListenResponse> {
    return this.connection.openStream<api.ListenRequest, api.ListenResponse>(
      'Listen',
      token
    );
  }

  protected onMessage(watchChangeProto: api.ListenResponse): Promise<void> {
    // A successful response means the stream is healthy
    this.backoff.reset();

    const watchChange = this.serializer.fromWatchChange(watchChangeProto);
    const snapshot = this.serializer.versionFromListenResponse(
      watchChangeProto
    );
    return this.listener!.onWatchChange(watchChange, snapshot);
  }

  /**
   * Registers interest in the results of the given query. If the query
   * includes a resumeToken it will be included in the request. Results that
   * affect the query will be streamed back as WatchChange messages that
   * reference the targetId.
   */
  watch(queryData: QueryData): void {
    const request: ListenRequest = {};
    request.database = this.serializer.encodedDatabaseId;
    request.addTarget = this.serializer.toTarget(queryData);

    const labels = this.serializer.toListenRequestLabels(queryData);
    if (labels) {
      request.labels = labels;
    }

    this.sendRequest(request);
  }

  /**
   * Unregisters interest in the results of the query associated with the
   * given targetId.
   */
  unwatch(targetId: TargetId): void {
    const request: ListenRequest = {};
    request.database = this.serializer.encodedDatabaseId;
    request.removeTarget = targetId;
    this.sendRequest(request);
  }
}

/** Listener for the PersistentWriteStream */
export interface WriteStreamListener extends PersistentStreamListener {
  /**
   * Called by the PersistentWriteStream upon a successful handshake response
   * from the server, which is the receiver's cue to send any pending writes.
   */
  onHandshakeComplete: () => Promise<void>;

  /**
   * Called by the PersistentWriteStream upon receiving a StreamingWriteResponse
   * from the server that contains a mutation result.
   */
  onMutationResult: (
    commitVersion: SnapshotVersion,
    results: MutationResult[]
  ) => Promise<void>;
}

/**
 * A Stream that implements the Write RPC.
 *
 * The Write RPC requires the caller to maintain special streamToken
 * state in between calls, to help the server understand which responses the
 * client has processed by the time the next request is made. Every response
 * will contain a streamToken; this value must be passed to the next
 * request.
 *
 * After calling start() on this stream, the next request must be a handshake,
 * containing whatever streamToken is on hand. Once a response to this
 * request is received, all pending mutations may be submitted. When
 * submitting multiple batches of mutations at the same time, it's
 * okay to use the same streamToken for the calls to writeMutations.
 *
 * TODO(b/33271235): Use proto types
 */
export class PersistentWriteStream extends PersistentStream<
  api.WriteRequest,
  api.WriteResponse,
  WriteStreamListener
> {
  private handshakeComplete_ = false;

  constructor(
    queue: AsyncQueue,
    connection: Connection,
    credentials: CredentialsProvider,
    private serializer: JsonProtoSerializer
  ) {
    super(
      queue,
      TimerId.WriteStreamConnectionBackoff,
      TimerId.WriteStreamIdle,
      connection,
      credentials
    );
  }

  /**
   * The last received stream token from the server, used to acknowledge which
   * responses the client has processed. Stream tokens are opaque checkpoint
   * markers whose only real value is their inclusion in the next request.
   *
   * PersistentWriteStream manages propagating this value from responses to the
   * next request.
   */
  lastStreamToken: ProtoByteString;

  /**
   * Tracks whether or not a handshake has been successfully exchanged and
   * the stream is ready to accept mutations.
   */
  get handshakeComplete(): boolean {
    return this.handshakeComplete_;
  }

  // Override of PersistentStream.start
  start(listener: WriteStreamListener): void {
    this.handshakeComplete_ = false;
    super.start(listener);
  }

  protected tearDown(): void {
    if (this.handshakeComplete_) {
      this.writeMutations([]);
    }
  }

  protected startRpc(
    token: Token | null
  ): Stream<api.WriteRequest, api.WriteResponse> {
    return this.connection.openStream<api.WriteRequest, api.WriteResponse>(
      'Write',
      token
    );
  }

  protected onMessage(responseProto: api.WriteResponse): Promise<void> {
    // Always capture the last stream token.
    assert(
      !!responseProto.streamToken,
      'Got a write response without a stream token'
    );
    this.lastStreamToken = responseProto.streamToken!;

    if (!this.handshakeComplete_) {
      // The first response is always the handshake response
      assert(
        !responseProto.writeResults || responseProto.writeResults.length === 0,
        'Got mutation results for handshake'
      );
      this.handshakeComplete_ = true;
      return this.listener!.onHandshakeComplete();
    } else {
      // A successful first write response means the stream is healthy,
      // Note, that we could consider a successful handshake healthy, however,
      // the write itself might be causing an error we want to back off from.
      this.backoff.reset();

      const results = this.serializer.fromWriteResults(
        responseProto.writeResults
      );
      const commitVersion = this.serializer.fromVersion(
        responseProto.commitTime!
      );
      return this.listener!.onMutationResult(commitVersion, results);
    }
  }

  /**
   * Sends an initial streamToken to the server, performing the handshake
   * required to make the StreamingWrite RPC work. Subsequent
   * calls should wait until onHandshakeComplete was called.
   */
  writeHandshake(): void {
    assert(this.isOpen(), 'Writing handshake requires an opened stream');
    assert(!this.handshakeComplete_, 'Handshake already completed');
    // TODO(dimond): Support stream resumption. We intentionally do not set the
    // stream token on the handshake, ignoring any stream token we might have.
    const request: WriteRequest = {};
    request.database = this.serializer.encodedDatabaseId;
    this.sendRequest(request);
  }

  /** Sends a group of mutations to the Firestore backend to apply. */
  writeMutations(mutations: Mutation[]): void {
    assert(this.isOpen(), 'Writing mutations requires an opened stream');
    assert(
      this.handshakeComplete_,
      'Handshake must be complete before writing mutations'
    );
    assert(
      this.lastStreamToken.length > 0,
      'Trying to write mutation without a token'
    );

    const request: WriteRequest = {
      // Protos are typed with string, but we support UInt8Array on Node
      // tslint:disable-next-line:no-any
      streamToken: this.lastStreamToken as any,
      writes: mutations.map(mutation => this.serializer.toMutation(mutation))
    };

    this.sendRequest(request);
  }
}
