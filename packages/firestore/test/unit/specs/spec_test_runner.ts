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

import { expect } from 'chai';
import { EmptyCredentialsProvider, Token } from '../../../src/api/credentials';
import { User } from '../../../src/auth/user';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import {
  EventManager,
  Observer,
  QueryListener
} from '../../../src/core/event_manager';
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { SyncEngine } from '../../../src/core/sync_engine';
import {
  OnlineState,
  OnlineStateSource,
  ProtoByteString,
  TargetId
} from '../../../src/core/types';
import {
  ChangeType,
  DocumentViewChange,
  ViewSnapshot
} from '../../../src/core/view_snapshot';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  DbPrimaryClient,
  DbPrimaryClientKey,
  SCHEMA_VERSION,
  SchemaConverter
} from '../../../src/local/indexeddb_schema';
import { LocalStore } from '../../../src/local/local_store';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { MemoryPersistence } from '../../../src/local/memory_persistence';
import { Persistence } from '../../../src/local/persistence';
import { QueryData, QueryPurpose } from '../../../src/local/query_data';
import {
  ClientId,
  MemorySharedClientState,
  SharedClientState,
  WebStorageSharedClientState
} from '../../../src/local/shared_client_state';
import { SimpleDb } from '../../../src/local/simple_db';
import { DocumentOptions } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { JsonObject } from '../../../src/model/field_value';
import { Mutation } from '../../../src/model/mutation';
import {
  emptyByteString,
  PlatformSupport
} from '../../../src/platform/platform';
import * as api from '../../../src/protos/firestore_proto_api';
import { Connection, Stream } from '../../../src/remote/connection';
import { Datastore } from '../../../src/remote/datastore';
import { ExistenceFilter } from '../../../src/remote/existence_filter';
import { WriteRequest } from '../../../src/remote/persistent_stream';
import { RemoteStore } from '../../../src/remote/remote_store';
import { mapCodeFromRpcCode } from '../../../src/remote/rpc_error';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { StreamBridge } from '../../../src/remote/stream_bridge';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import { assert, fail } from '../../../src/util/assert';
import { AsyncQueue, TimerId } from '../../../src/util/async_queue';
import { FirestoreError } from '../../../src/util/error';
import { primitiveComparator } from '../../../src/util/misc';
import * as obj from '../../../src/util/obj';
import { ObjectMap } from '../../../src/util/obj_map';
import { Deferred, sequence } from '../../../src/util/promise';
import {
  deletedDoc,
  deleteMutation,
  doc,
  expectFirestoreError,
  filter,
  key,
  orderBy,
  patchMutation,
  path,
  setMutation,
  TestSnapshotVersion,
  version
} from '../../util/helpers';
import { SharedFakeWebStorage, TestPlatform } from '../../util/test_platform';
import {
  clearTestPersistence,
  INDEXEDDB_TEST_DATABASE_NAME,
  TEST_PERSISTENCE_PREFIX,
  TEST_SERIALIZER
} from '../local/persistence_test_helpers';

const ARBITRARY_SEQUENCE_NUMBER = 2;

class MockConnection implements Connection {
  watchStream: StreamBridge<
    api.ListenRequest,
    api.ListenResponse
  > | null = null;
  writeStream: StreamBridge<api.WriteRequest, api.WriteResponse> | null = null;
  /**
   * Used to make sure a write was actually sent out on the network before the
   * test runner continues.
   */
  writeSendBarriers: Array<Deferred<api.WriteRequest>> = [];

  /**
   * The set of mutations sent out before there was a corresponding
   * writeSendBarrier.
   */
  earlyWrites: api.WriteRequest[] = [];

  /** The total number of requests sent to the watch stream. */
  watchStreamRequestCount = 0;

  /** The total number of requests sent to the write stream. */
  writeStreamRequestCount = 0;

  nextWriteStreamToken = 0;

  constructor(private queue: AsyncQueue) {}

  /**
   * Tracks the currently active watch targets as detected by the mock watch
   * stream, as a mapping from target ID to query Target.
   */
  activeTargets: { [targetId: number]: api.Target } = {};

  /** A Deferred that is resolved once watch opens. */
  watchOpen = new Deferred<void>();

  invokeRPC<Req>(rpcName: string, request: Req): never {
    throw new Error('Not implemented!');
  }

  invokeStreamingRPC<Req>(rpcName: string, request: Req): never {
    throw new Error('Not implemented!');
  }

  waitForWriteRequest(): Promise<api.WriteRequest> {
    const earlyWrite = this.earlyWrites.shift();
    if (earlyWrite) {
      return Promise.resolve(earlyWrite);
    }
    const barrier = new Deferred<WriteRequest>();
    this.writeSendBarriers.push(barrier);
    return barrier.promise;
  }

  waitForWatchOpen(): Promise<void> {
    return this.watchOpen.promise;
  }

  ackWrite(commitTime?: string, mutationResults?: api.WriteResult[]): void {
    this.writeStream!.callOnMessage({
      streamToken: 'write-stream-token-' + this.nextWriteStreamToken,
      commitTime,
      writeResults: mutationResults
    });
    this.nextWriteStreamToken++;
  }

  failWrite(err: FirestoreError): void {
    this.resetAndCloseWriteStream(err);
  }

  private resetAndCloseWriteStream(err?: FirestoreError): void {
    this.writeSendBarriers = [];
    this.earlyWrites = [];
    this.writeStream!.callOnClose(err);
    this.writeStream = null;
  }

  failWatchStream(err?: FirestoreError): void {
    this.resetAndCloseWatchStream(err);
  }

  private resetAndCloseWatchStream(err?: FirestoreError): void {
    this.activeTargets = {};
    this.watchOpen = new Deferred<void>();
    this.watchStream!.callOnClose(err);
    this.watchStream = null;
  }

  openStream<Req, Resp>(
    rpcName: string,
    token: Token | null
  ): Stream<Req, Resp> {
    if (rpcName === 'Write') {
      if (this.writeStream !== null) {
        throw new Error('write stream opened twice');
      }
      let firstCall = true;
      const writeStream = new StreamBridge<WriteRequest, api.WriteResponse>({
        sendFn: (request: WriteRequest) => {
          ++this.writeStreamRequestCount;
          if (firstCall) {
            assert(
              !!request.database,
              'projectId must be set in the first message'
            );
            assert(
              !request.writes,
              'mutations must not be set in first request'
            );
            this.ackWrite(); // just send the token
            firstCall = false;
            return;
          }

          assert(
            !!request.streamToken,
            'streamToken must be set on all writes'
          );
          assert(!!request.writes, 'writes must be set on all writes');

          const barrier = this.writeSendBarriers.shift();
          if (!barrier) {
            // The test runner hasn't set up the barrier yet, so we queue
            // up this mutation to provide to the barrier promise when it
            // arrives.
            this.earlyWrites.push(request);
          } else {
            // The test runner is waiting on a write invocation, now that we
            // have it we can resolve the write send barrier. If we add
            // (automatic) batching support we need to make sure the number of
            // batches matches the number of calls to waitForWriteRequest.
            barrier.resolve(request);
          }
        },
        closeFn: () => {
          this.resetAndCloseWriteStream();
        }
      });
      this.queue.enqueueAndForget(async () => {
        if (this.writeStream === writeStream) {
          writeStream.callOnOpen();
        }
      });
      this.writeStream = writeStream;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, Replace 'any' with conditional types.
      return writeStream as any;
    } else {
      assert(rpcName === 'Listen', 'Unexpected rpc name: ' + rpcName);
      if (this.watchStream !== null) {
        throw new Error('Stream opened twice!');
      }
      const watchStream = new StreamBridge<
        api.ListenRequest,
        api.ListenResponse
      >({
        sendFn: (request: api.ListenRequest) => {
          ++this.watchStreamRequestCount;
          if (request.addTarget) {
            const targetId = request.addTarget.targetId!;
            this.activeTargets[targetId] = request.addTarget;
          } else if (request.removeTarget) {
            delete this.activeTargets[request.removeTarget];
          } else {
            fail('Invalid listen request');
          }
        },
        closeFn: () => {
          this.resetAndCloseWatchStream();
        }
      });
      // Call on open immediately after returning
      this.queue.enqueueAndForget(async () => {
        if (this.watchStream === watchStream) {
          watchStream.callOnOpen();
          this.watchOpen.resolve();
        }
      });
      this.watchStream = watchStream;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, Replace 'any' with conditional types.
      return this.watchStream as any;
    }
  }
}

/**
 * Interface used for object that contain exactly one of either a view snapshot
 * or an error for the given query.
 */
interface QueryEvent {
  query: Query;
  view?: ViewSnapshot;
  error?: FirestoreError;
}

/**
 * An Observer<ViewSnapshot> that forwards events to the provided callback.
 */
class EventAggregator implements Observer<ViewSnapshot> {
  constructor(
    private query: Query,
    private pushEvent: (e: QueryEvent) => void
  ) {}

  next(view: ViewSnapshot): void {
    this.pushEvent({
      query: view.query,
      view
    });
  }

  error(error: Error): void {
    expectFirestoreError(error);
    this.pushEvent({ query: this.query, error: error as FirestoreError });
  }
}

/**
 * FIFO queue that tracks all outstanding mutations for a single test run.
 * As these mutations are shared among the set of active clients, any client can
 * add or retrieve mutations.
 */
// PORTING NOTE: Multi-tab only.
class SharedWriteTracker {
  private writes: Mutation[][] = [];

  push(write: Mutation[]): void {
    this.writes.push(write);
  }

  peek(): Mutation[] {
    assert(this.writes.length > 0, 'No pending mutations');
    return this.writes[0];
  }

  shift(): Mutation[] {
    assert(this.writes.length > 0, 'No pending mutations');
    return this.writes.shift()!;
  }
}

abstract class TestRunner {
  protected queue: AsyncQueue;

  private connection: MockConnection;
  private eventManager: EventManager;
  private syncEngine: SyncEngine;

  private eventList: QueryEvent[] = [];
  private acknowledgedDocs: string[];
  private rejectedDocs: string[];

  private queryListeners = new ObjectMap<Query, QueryListener>(q =>
    q.canonicalId()
  );

  private expectedLimboDocs: DocumentKey[];
  private expectedActiveTargets: {
    [targetId: number]: { query: SpecQuery; resumeToken: string };
  };

  private networkEnabled = true;

  private datastore: Datastore;
  private localStore: LocalStore;
  private remoteStore: RemoteStore;
  private persistence: Persistence;
  protected sharedClientState: SharedClientState;
  private useGarbageCollection: boolean;
  private numClients: number;
  private databaseInfo: DatabaseInfo;

  protected user = User.UNAUTHENTICATED;
  protected clientId: ClientId;

  private started = false;
  private serializer: JsonProtoSerializer;

  constructor(
    protected readonly platform: TestPlatform,
    private sharedWrites: SharedWriteTracker,
    clientIndex: number,
    config: SpecConfig
  ) {
    this.clientId = `client${clientIndex}`;
    this.databaseInfo = new DatabaseInfo(
      new DatabaseId('project'),
      'persistenceKey',
      'host',
      /*ssl=*/ false,
      /*forceLongPolling=*/ false
    );

    // TODO(mrschmidt): During client startup in `firestore_client`, we block
    // the AsyncQueue from executing any operation. We should mimic this in the
    // setup of the spec tests.
    this.queue = new AsyncQueue();
    this.serializer = new JsonProtoSerializer(this.databaseInfo.databaseId, {
      useProto3Json: true
    });

    this.useGarbageCollection = config.useGarbageCollection;
    this.numClients = config.numClients;

    this.expectedLimboDocs = [];
    this.expectedActiveTargets = {};
    this.acknowledgedDocs = [];
    this.rejectedDocs = [];
  }

  async start(): Promise<void> {
    this.sharedClientState = this.getSharedClientState();
    this.persistence = await this.initPersistence(
      this.serializer,
      this.useGarbageCollection
    );

    this.localStore = new LocalStore(this.persistence, this.user);

    this.connection = new MockConnection(this.queue);
    this.datastore = new Datastore(
      this.queue,
      this.connection,
      new EmptyCredentialsProvider(),
      this.serializer
    );
    const remoteStoreOnlineStateChangedHandler = (
      onlineState: OnlineState
    ): void => {
      this.syncEngine.applyOnlineStateChange(
        onlineState,
        OnlineStateSource.RemoteStore
      );
    };
    const sharedClientStateOnlineStateChangedHandler = (
      onlineState: OnlineState
    ): void => {
      this.syncEngine.applyOnlineStateChange(
        onlineState,
        OnlineStateSource.SharedClientState
      );
    };
    const connectivityMonitor = this.platform.newConnectivityMonitor();
    this.remoteStore = new RemoteStore(
      this.localStore,
      this.datastore,
      this.queue,
      remoteStoreOnlineStateChangedHandler,
      connectivityMonitor
    );
    this.syncEngine = new SyncEngine(
      this.localStore,
      this.remoteStore,
      this.sharedClientState,
      this.user
    );

    // Set up wiring between sync engine and other components
    this.remoteStore.syncEngine = this.syncEngine;
    this.sharedClientState.syncEngine = this.syncEngine;
    this.sharedClientState.onlineStateHandler = sharedClientStateOnlineStateChangedHandler;
    this.eventManager = new EventManager(this.syncEngine);

    await this.sharedClientState.start();
    await this.remoteStore.start();

    await this.persistence.setPrimaryStateListener(isPrimary =>
      this.syncEngine.applyPrimaryState(isPrimary)
    );

    await this.persistence.setDatabaseDeletedListener(async () => {
      await this.shutdown();
    });

    this.started = true;
  }

  protected abstract initPersistence(
    serializer: JsonProtoSerializer,
    gcEnabled: boolean
  ): Promise<Persistence>;

  protected abstract getSharedClientState(): SharedClientState;

  get isPrimaryClient(): boolean {
    return this.syncEngine.isPrimaryClient;
  }

  async shutdown(): Promise<void> {
    await this.queue.enqueue(async () => {
      if (this.started) {
        await this.doShutdown();
      }
    });
  }

  /** Runs a single SpecStep on this runner. */
  async run(step: SpecStep): Promise<void> {
    await this.doStep(step);
    await this.queue.drain();
    this.validateStepExpectations(step.expect!);
    await this.validateStateExpectations(step.stateExpect!);
    this.eventList = [];
    this.rejectedDocs = [];
    this.acknowledgedDocs = [];
  }

  private doStep(step: SpecStep): Promise<void> {
    if ('userListen' in step) {
      return this.doListen(step.userListen!);
    } else if ('userUnlisten' in step) {
      return this.doUnlisten(step.userUnlisten!);
    } else if ('userSet' in step) {
      return this.doSet(step.userSet!);
    } else if ('userPatch' in step) {
      return this.doPatch(step.userPatch!);
    } else if ('userDelete' in step) {
      return this.doDelete(step.userDelete!);
    } else if ('watchAck' in step) {
      return this.doWatchAck(step.watchAck!);
    } else if ('watchCurrent' in step) {
      return this.doWatchCurrent(step.watchCurrent!);
    } else if ('watchRemove' in step) {
      return this.doWatchRemove(step.watchRemove!);
    } else if ('watchEntity' in step) {
      return this.doWatchEntity(step.watchEntity!);
    } else if ('watchFilter' in step) {
      return this.doWatchFilter(step.watchFilter!);
    } else if ('watchSnapshot' in step) {
      return this.doWatchSnapshot(step.watchSnapshot!);
    } else if ('watchReset' in step) {
      return this.doWatchReset(step.watchReset!);
    } else if ('watchStreamClose' in step) {
      return this.doWatchStreamClose(step.watchStreamClose!);
    } else if ('writeAck' in step) {
      return this.doWriteAck(step.writeAck!);
    } else if ('failWrite' in step) {
      return this.doFailWrite(step.failWrite!);
    } else if ('runTimer' in step) {
      return this.doRunTimer(step.runTimer!);
    } else if ('drainQueue' in step) {
      return this.doDrainQueue();
    } else if ('enableNetwork' in step) {
      return step.enableNetwork!
        ? this.doEnableNetwork()
        : this.doDisableNetwork();
    } else if ('clearPersistence' in step) {
      return this.doClearPersistence();
    } else if ('restart' in step) {
      return this.doRestart();
    } else if ('shutdown' in step) {
      return this.doShutdown();
    } else if ('expectIsShutdown' in step) {
      return this.doExpectIsShutdown();
    } else if ('applyClientState' in step) {
      // PORTING NOTE: Only used by web multi-tab tests.
      return this.doApplyClientState(step.applyClientState!);
    } else if ('changeUser' in step) {
      return this.doChangeUser(step.changeUser!);
    } else {
      return fail('Unknown step: ' + JSON.stringify(step));
    }
  }

  private async doListen(listenSpec: SpecUserListen): Promise<void> {
    const expectedTargetId = listenSpec[0];
    const querySpec = listenSpec[1];
    const query = this.parseQuery(querySpec);
    const aggregator = new EventAggregator(query, this.pushEvent.bind(this));
    // TODO(dimond): Allow customizing listen options in spec tests
    const options = {
      includeMetadataChanges: true,
      waitForSyncWhenOnline: false
    };
    const queryListener = new QueryListener(query, aggregator, options);
    this.queryListeners.set(query, queryListener);

    await this.queue.enqueue(async () => {
      const targetId = await this.eventManager.listen(queryListener);
      expect(targetId).to.equal(
        expectedTargetId,
        'targetId assigned to listen'
      );
    });

    // Skip the backoff that may have been triggered by a previous call to
    // `watchStreamCloses()`.
    if (
      this.queue.containsDelayedOperation(TimerId.ListenStreamConnectionBackoff)
    ) {
      await this.queue.runDelayedOperationsEarly(
        TimerId.ListenStreamConnectionBackoff
      );
    }

    if (this.isPrimaryClient && this.networkEnabled) {
      // Open should always have happened after a listen
      await this.connection.waitForWatchOpen();
    }
  }

  private async doUnlisten(listenSpec: SpecUserUnlisten): Promise<void> {
    // TODO(dimond): make sure correct target IDs are assigned
    // let targetId = listenSpec[0];
    const querySpec = listenSpec[1];
    const query = this.parseQuery(querySpec);
    const eventEmitter = this.queryListeners.get(query);
    assert(!!eventEmitter, 'There must be a query to unlisten too!');
    this.queryListeners.delete(query);
    await this.queue.enqueue(() => this.eventManager.unlisten(eventEmitter!));
  }

  private doSet(setSpec: SpecUserSet): Promise<void> {
    return this.doMutations([setMutation(setSpec[0], setSpec[1])]);
  }

  private doPatch(patchSpec: SpecUserPatch): Promise<void> {
    return this.doMutations([patchMutation(patchSpec[0], patchSpec[1])]);
  }

  private doDelete(deleteSpec: SpecUserDelete): Promise<void> {
    const key: string = deleteSpec;
    return this.doMutations([deleteMutation(key)]);
  }

  private doMutations(mutations: Mutation[]): Promise<void> {
    const documentKeys = mutations.map(val => val.key.path.toString());
    const syncEngineCallback = new Deferred<void>();
    syncEngineCallback.promise.then(
      () => this.acknowledgedDocs.push(...documentKeys),
      () => this.rejectedDocs.push(...documentKeys)
    );

    this.sharedWrites.push(mutations);

    return this.queue.enqueue(() => {
      return this.syncEngine.write(mutations, syncEngineCallback);
    });
  }

  private doWatchAck(ackedTargets: SpecWatchAck): Promise<void> {
    const change = new WatchTargetChange(
      WatchTargetChangeState.Added,
      ackedTargets
    );
    return this.doWatchEvent(change);
  }

  private doWatchCurrent(currentTargets: SpecWatchCurrent): Promise<void> {
    const targets = currentTargets[0];
    const resumeToken = currentTargets[1] as ProtoByteString;
    const change = new WatchTargetChange(
      WatchTargetChangeState.Current,
      targets,
      resumeToken
    );
    return this.doWatchEvent(change);
  }

  private doWatchReset(targetIds: SpecWatchReset): Promise<void> {
    const change = new WatchTargetChange(
      WatchTargetChangeState.Reset,
      targetIds
    );
    return this.doWatchEvent(change);
  }

  private doWatchRemove(removed: SpecWatchRemove): Promise<void> {
    const cause =
      removed.cause &&
      new FirestoreError(
        mapCodeFromRpcCode(removed.cause.code),
        removed.cause.message
      );
    const change = new WatchTargetChange(
      WatchTargetChangeState.Removed,
      removed.targetIds,
      emptyByteString(),
      cause || null
    );
    if (cause) {
      // Make sure that the target is active and can be removed.
      // Technically removing an unknown target is valid (e.g. it could race
      // with a server-side removal), but we want to pay extra careful
      // attention in tests that we only remove targets we listened too.
      removed.targetIds.forEach(targetId => {
        expect(
          this.connection.activeTargets[targetId],
          'Removing a non-active target'
        ).to.exist;
        delete this.connection.activeTargets[targetId];
      });
    }
    return this.doWatchEvent(change);
  }

  private doWatchEntity(watchEntity: SpecWatchEntity): Promise<void> {
    if (watchEntity.docs) {
      assert(
        !watchEntity.doc,
        'Exactly one of `doc` or `docs` needs to be set'
      );
      return sequence(watchEntity.docs, (specDocument: SpecDocument) => {
        return this.doWatchEntity({
          doc: specDocument,
          targets: watchEntity.targets,
          removedTargets: watchEntity.removedTargets
        });
      });
    } else if (watchEntity.doc) {
      const document = watchEntity.doc.value
        ? doc(
            watchEntity.doc.key,
            watchEntity.doc.version,
            watchEntity.doc.value,
            watchEntity.doc.options
          )
        : deletedDoc(watchEntity.doc.key, watchEntity.doc.version);
      const change = new DocumentWatchChange(
        watchEntity.targets || [],
        watchEntity.removedTargets || [],
        document.key,
        document
      );
      return this.doWatchEvent(change);
    } else if (watchEntity.key) {
      const documentKey = key(watchEntity.key);
      const change = new DocumentWatchChange(
        watchEntity.targets || [],
        watchEntity.removedTargets || [],
        documentKey,
        null
      );
      return this.doWatchEvent(change);
    } else {
      return fail('Either doc or docs must be set');
    }
  }

  private doWatchFilter(watchFilter: SpecWatchFilter): Promise<void> {
    const targetIds: TargetId[] = watchFilter[0];
    assert(
      targetIds.length === 1,
      'ExistenceFilters currently support exactly one target only.'
    );
    const keys = watchFilter.slice(1);
    const filter = new ExistenceFilter(keys.length);
    const change = new ExistenceFilterChange(targetIds[0], filter);
    return this.doWatchEvent(change);
  }

  private doWatchSnapshot(watchSnapshot: SpecWatchSnapshot): Promise<void> {
    // The client will only respond to watchSnapshots if they are on a target
    // change with an empty set of target IDs. So we should be sure to send a
    // separate event.
    const protoJSON: api.ListenResponse = {
      targetChange: {
        readTime: this.serializer.toVersion(version(watchSnapshot.version)),
        resumeToken: watchSnapshot.resumeToken,
        targetIds: watchSnapshot.targetIds
      }
    };
    this.connection.watchStream!.callOnMessage(protoJSON);

    // Put a no-op in the queue so that we know when any outstanding RemoteStore
    // writes on the network are complete.
    return this.queue.enqueue(async () => {});
  }

  private async doWatchEvent(watchChange: WatchChange): Promise<void> {
    const protoJSON = this.serializer.toTestWatchChange(watchChange);
    this.connection.watchStream!.callOnMessage(protoJSON);

    // Put a no-op in the queue so that we know when any outstanding RemoteStore
    // writes on the network are complete.
    return this.queue.enqueue(async () => {});
  }

  private async doWatchStreamClose(spec: SpecWatchStreamClose): Promise<void> {
    this.connection.failWatchStream(
      new FirestoreError(
        mapCodeFromRpcCode(spec.error.code),
        spec.error.message
      )
    );
    // The watch stream should re-open if we have active listeners.
    if (spec.runBackoffTimer && !this.queryListeners.isEmpty()) {
      await this.queue.runDelayedOperationsEarly(
        TimerId.ListenStreamConnectionBackoff
      );
      await this.connection.waitForWatchOpen();
    }
  }

  /** Validates that a write was sent and matches the expected write. */
  private validateNextWriteRequest(mutations: Mutation[]): Promise<void> {
    // Make sure this write was sent on the wire and it matches the expected
    // write.
    return this.connection.waitForWriteRequest().then(request => {
      const writes = request.writes!;
      expect(writes.length).to.equal(mutations.length);
      for (let i = 0; i < writes.length; ++i) {
        expect(writes[i]).to.deep.equal(
          this.serializer.toMutation(mutations[i])
        );
      }
    });
  }

  private doWriteAck(writeAck: SpecWriteAck): Promise<void> {
    const updateTime = this.serializer.toVersion(version(writeAck.version));
    const nextMutation = writeAck.keepInQueue
      ? this.sharedWrites.peek()
      : this.sharedWrites.shift();
    return this.validateNextWriteRequest(nextMutation).then(() => {
      this.connection.ackWrite(updateTime, [{ updateTime }]);
    });
  }

  private async doFailWrite(writeFailure: SpecWriteFailure): Promise<void> {
    const specError: SpecError = writeFailure.error;
    const error = new FirestoreError(
      mapCodeFromRpcCode(specError.code),
      specError.message
    );
    const nextMutation = writeFailure.keepInQueue
      ? this.sharedWrites.peek()
      : this.sharedWrites.shift();
    return this.validateNextWriteRequest(nextMutation).then(() => {
      this.connection.failWrite(error);
    });
  }

  private async doRunTimer(timer: string): Promise<void> {
    // We assume the timer string is a valid TimerID enum value, but if it's
    // not, then there won't be a matching item on the queue and
    // runDelayedOperationsEarly() will throw.
    const timerId = timer as TimerId;
    await this.queue.runDelayedOperationsEarly(timerId);
  }

  private async doDisableNetwork(): Promise<void> {
    this.networkEnabled = false;
    // Make sure to execute all writes that are currently queued. This allows us
    // to assert on the total number of requests sent before shutdown.
    await this.remoteStore.fillWritePipeline();
    await this.syncEngine.disableNetwork();
  }

  private async doDrainQueue(): Promise<void> {
    await this.queue.drain();
  }

  private async doEnableNetwork(): Promise<void> {
    this.networkEnabled = true;
    await this.syncEngine.enableNetwork();
  }

  private async doShutdown(): Promise<void> {
    await this.remoteStore.shutdown();
    await this.sharedClientState.shutdown();
    // We don't delete the persisted data here since multi-clients may still
    // be accessing it. Instead, we manually remove it at the end of the
    // test run.
    await this.persistence.shutdown();
    this.started = false;
  }

  /** Asserts that the client is shutdown by  */
  private async doExpectIsShutdown(): Promise<void> {
    expect(this.started).to.equal(false);
  }

  private async doClearPersistence(): Promise<void> {
    await clearTestPersistence();
  }

  private async doRestart(): Promise<void> {
    // Reinitialize everything.
    // No local store to shutdown.
    await this.remoteStore.shutdown();
    await this.persistence.shutdown();

    // We have to schedule the starts, otherwise we could end up with
    // interleaved events.
    await this.queue.enqueue(() => this.start());
  }

  private async doApplyClientState(state: SpecClientState): Promise<void> {
    if (state.visibility) {
      this.platform.raiseVisibilityEvent(state.visibility!);
    }

    if (state.primary) {
      await clearCurrentPrimaryLease();
      await this.queue.runDelayedOperationsEarly(TimerId.ClientMetadataRefresh);
    }

    return Promise.resolve();
  }

  private doChangeUser(user: string | null): Promise<void> {
    this.user = new User(user);
    return this.queue.enqueue(() =>
      this.syncEngine.handleCredentialChange(this.user)
    );
  }

  private validateStepExpectations(stepExpectations: SpecExpectation[]): void {
    if (stepExpectations) {
      expect(this.eventList.length).to.equal(
        stepExpectations.length,
        'Number of expected and actual events mismatch'
      );
      const actualEventsSorted = this.eventList.sort((a, b) =>
        primitiveComparator(a.query.canonicalId(), b.query.canonicalId())
      );
      const expectedEventsSorted = stepExpectations.sort((a, b) =>
        primitiveComparator(
          this.parseQuery(a.query).canonicalId(),
          this.parseQuery(b.query).canonicalId()
        )
      );
      for (let i = 0; i < expectedEventsSorted.length; i++) {
        const actual = actualEventsSorted[i];
        const expected = expectedEventsSorted[i];
        this.validateWatchExpectation(expected, actual);
      }
    } else {
      expect(this.eventList.length).to.equal(
        0,
        'Unexpected events: ' + JSON.stringify(this.eventList)
      );
    }
  }

  private async validateStateExpectations(
    expectation: StateExpectation
  ): Promise<void> {
    if (expectation) {
      if ('numOutstandingWrites' in expectation) {
        expect(this.remoteStore.outstandingWrites()).to.equal(
          expectation.numOutstandingWrites
        );
      }
      if ('numActiveClients' in expectation) {
        const activeClients = await this.persistence.getActiveClients();
        expect(activeClients.length).to.equal(expectation.numActiveClients);
      }
      if ('writeStreamRequestCount' in expectation) {
        expect(this.connection.writeStreamRequestCount).to.equal(
          expectation.writeStreamRequestCount
        );
      }
      if ('watchStreamRequestCount' in expectation) {
        expect(this.connection.watchStreamRequestCount).to.equal(
          expectation.watchStreamRequestCount
        );
      }
      if ('limboDocs' in expectation) {
        this.expectedLimboDocs = expectation.limboDocs!.map(key);
      }
      if ('activeTargets' in expectation) {
        this.expectedActiveTargets = expectation.activeTargets!;
      }
      if ('isPrimary' in expectation) {
        expect(this.isPrimaryClient).to.eq(expectation.isPrimary!, 'isPrimary');
      }
    }

    if (expectation && expectation.userCallbacks) {
      expect(this.acknowledgedDocs).to.have.members(
        expectation.userCallbacks.acknowledgedDocs
      );
      expect(this.rejectedDocs).to.have.members(
        expectation.userCallbacks.rejectedDocs
      );
    } else {
      expect(this.acknowledgedDocs).to.be.empty;
      expect(this.rejectedDocs).to.be.empty;
    }

    if (this.numClients === 1) {
      expect(this.isPrimaryClient).to.eq(true, 'isPrimary');
    }

    // Clients don't reset their limbo docs on shutdown, so any validation will
    // likely fail.
    if (this.started) {
      // Always validate that the expected limbo docs match the actual limbo
      // docs
      this.validateLimboDocs();
      // Always validate that the expected active targets match the actual
      // active targets
      await this.validateActiveTargets();
    }
  }

  private validateLimboDocs(): void {
    let actualLimboDocs = this.syncEngine.currentLimboDocs();
    // Validate that each limbo doc has an expected active target
    actualLimboDocs.forEach((key, targetId) => {
      expect(obj.contains(this.expectedActiveTargets, targetId)).to.equal(
        true,
        'Found limbo doc without an expected active target'
      );
    });
    for (const expectedLimboDoc of this.expectedLimboDocs) {
      expect(actualLimboDocs.get(expectedLimboDoc)).to.not.equal(
        null,
        'Expected doc to be in limbo, but was not: ' +
          expectedLimboDoc.toString()
      );
      actualLimboDocs = actualLimboDocs.remove(expectedLimboDoc);
    }
    expect(actualLimboDocs.size).to.equal(
      0,
      'Unexpected docs in limbo: ' + actualLimboDocs.toString()
    );
  }

  private async validateActiveTargets(): Promise<void> {
    if (!this.isPrimaryClient || !this.networkEnabled) {
      expect(this.connection.activeTargets).to.be.empty;
      return;
    }

    // In multi-tab mode, we cannot rely on the `waitForWatchOpen` call in
    // `doUserListen` since primary tabs may execute queries from other tabs
    // without any direct user interaction.

    // TODO(mrschmidt): Refactor so this is only executed after primary tab
    // change
    if (!obj.isEmpty(this.expectedActiveTargets)) {
      await this.connection.waitForWatchOpen();
      await this.queue.drain();
    }

    const actualTargets = obj.shallowCopy(this.connection.activeTargets);
    obj.forEachNumber(this.expectedActiveTargets, (targetId, expected) => {
      expect(obj.contains(actualTargets, targetId)).to.equal(
        true,
        'Expected active target not found: ' + JSON.stringify(expected)
      );
      const actualTarget = actualTargets[targetId];

      // TODO(mcg): populate the purpose of the target once it's possible to
      // encode that in the spec tests. For now, hard-code that it's a listen
      // despite the fact that it's not always the right value.
      const expectedTarget = this.serializer.toTarget(
        new QueryData(
          this.parseQuery(expected.query),
          targetId,
          QueryPurpose.Listen,
          ARBITRARY_SEQUENCE_NUMBER,
          SnapshotVersion.MIN,
          expected.resumeToken
        )
      );
      expect(actualTarget.query).to.deep.equal(expectedTarget.query);
      expect(actualTarget.targetId).to.equal(expectedTarget.targetId);
      expect(actualTarget.readTime).to.equal(expectedTarget.readTime);
      expect(actualTarget.resumeToken).to.equal(expectedTarget.resumeToken);
      delete actualTargets[targetId];
    });
    expect(obj.size(actualTargets)).to.equal(
      0,
      'Unexpected active targets: ' + JSON.stringify(actualTargets)
    );
  }

  private validateWatchExpectation(
    expected: SpecExpectation,
    actual: QueryEvent
  ): void {
    const expectedQuery = this.parseQuery(expected.query);
    expect(actual.query).to.deep.equal(expectedQuery);
    if (expected.errorCode) {
      expectFirestoreError(actual.error!);
    } else {
      const expectedChanges: DocumentViewChange[] = [];
      if (expected.removed) {
        expected.removed.forEach(change => {
          expectedChanges.push(this.parseChange(ChangeType.Removed, change));
        });
      }
      if (expected.added) {
        expected.added.forEach(change => {
          expectedChanges.push(this.parseChange(ChangeType.Added, change));
        });
      }
      if (expected.modified) {
        expected.modified.forEach(change => {
          expectedChanges.push(this.parseChange(ChangeType.Modified, change));
        });
      }

      if (expected.metadata) {
        expected.metadata.forEach(change => {
          expectedChanges.push(this.parseChange(ChangeType.Metadata, change));
        });
      }

      expect(actual.view!.docChanges).to.deep.equal(expectedChanges);

      expect(actual.view!.hasPendingWrites).to.equal(
        expected.hasPendingWrites,
        'hasPendingWrites'
      );
      expect(actual.view!.fromCache).to.equal(expected.fromCache, 'fromCache');

      if (actual && !expected) {
        expect(expected, 'Got an actual event without expecting one').to.be.ok;
      }
    }
  }

  private pushEvent(e: QueryEvent): void {
    this.eventList.push(e);
  }

  private parseQuery(querySpec: string | SpecQuery): Query {
    if (typeof querySpec === 'string') {
      return Query.atPath(path(querySpec));
    } else {
      let query = new Query(path(querySpec.path), querySpec.collectionGroup);
      if (querySpec.limit) {
        query = query.withLimit(querySpec.limit);
      }
      if (querySpec.filters) {
        querySpec.filters.forEach(([field, op, value]) => {
          query = query.addFilter(filter(field, op, value));
        });
      }
      if (querySpec.orderBys) {
        querySpec.orderBys.forEach(([filter, direction]) => {
          query = query.addOrderBy(orderBy(filter, direction));
        });
      }
      return query;
    }
  }

  private parseChange(
    type: ChangeType,
    change: SpecDocument
  ): DocumentViewChange {
    return {
      type,
      doc: doc(
        change.key,
        change.version,
        change.value || {},
        change.options || {}
      )
    };
  }
}

class MemoryTestRunner extends TestRunner {
  protected getSharedClientState(): SharedClientState {
    return new MemorySharedClientState();
  }

  protected initPersistence(
    serializer: JsonProtoSerializer,
    gcEnabled: boolean
  ): Promise<Persistence> {
    return Promise.resolve(
      gcEnabled
        ? MemoryPersistence.createEagerPersistence(this.clientId)
        : MemoryPersistence.createLruPersistence(
            this.clientId,
            serializer,
            LruParams.DEFAULT
          )
    );
  }
}

/**
 * Runs the specs using IndexedDbPersistence, the creator must ensure that it is
 * enabled for the platform.
 */
class IndexedDbTestRunner extends TestRunner {
  protected getSharedClientState(): SharedClientState {
    return new WebStorageSharedClientState(
      this.queue,
      this.platform,
      TEST_PERSISTENCE_PREFIX,
      this.clientId,
      this.user
    );
  }

  protected initPersistence(
    serializer: JsonProtoSerializer,
    gcEnabled: boolean
  ): Promise<Persistence> {
    // TODO(gsoltis): can we or should we disable this test if gc is enabled?
    return IndexedDbPersistence.createMultiClientIndexedDbPersistence(
      TEST_PERSISTENCE_PREFIX,
      this.clientId,
      this.platform,
      this.queue,
      serializer,
      LruParams.DEFAULT,
      { sequenceNumberSyncer: this.sharedClientState }
    );
  }

  static destroyPersistence(): Promise<void> {
    return SimpleDb.delete(INDEXEDDB_TEST_DATABASE_NAME);
  }
}

/**
 * Runs a spec test case.
 *
 * The spec consists of an array of individual steps to run in sequence.
 */
export async function runSpec(
  name: string,
  usePersistence: boolean,
  config: SpecConfig,
  steps: SpecStep[]
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Running spec: ' + name);

  const sharedMockStorage = new SharedFakeWebStorage();

  // PORTING NOTE: Non multi-client SDKs only support a single test runner.
  const runners: TestRunner[] = [];
  const outstandingMutations = new SharedWriteTracker();

  const ensureRunner = async (clientIndex: number): Promise<TestRunner> => {
    if (!runners[clientIndex]) {
      const platform = new TestPlatform(
        PlatformSupport.getPlatform(),
        sharedMockStorage
      );
      if (usePersistence) {
        runners[clientIndex] = new IndexedDbTestRunner(
          platform,
          outstandingMutations,
          clientIndex,
          config
        );
      } else {
        runners[clientIndex] = new MemoryTestRunner(
          platform,
          outstandingMutations,
          clientIndex,
          config
        );
      }
      await runners[clientIndex].start();
    }
    return runners[clientIndex];
  };

  let lastStep: SpecStep | null = null;
  let count = 0;
  try {
    await sequence(steps, async step => {
      ++count;
      lastStep = step;
      return ensureRunner(step.clientIndex || 0).then(runner =>
        runner.run(step)
      );
    });
  } catch (err) {
    console.warn(
      `Spec test failed at step ${count}: ${JSON.stringify(lastStep)}`
    );
    throw err;
  } finally {
    for (const runner of runners) {
      await runner.shutdown();
    }
    if (usePersistence) {
      await IndexedDbTestRunner.destroyPersistence();
    }
  }
}

/** Specifies initial configuration information for the test. */
export interface SpecConfig {
  /** A boolean to enable / disable GC. */
  useGarbageCollection: boolean;

  /** The number of active clients for this test run. */
  numClients: number;
}

/**
 * Union type for each step. The step consists of exactly one `field`
 * set and optionally expected events in the `expect` field.
 */
export interface SpecStep {
  /** The index of the local client for multi-client spec tests. */
  clientIndex?: number; // PORTING NOTE: Only used by web multi-tab tests
  /** Listen to a new query (must be unique) */
  userListen?: SpecUserListen;
  /** Unlisten from a query (must be listened to) */
  userUnlisten?: SpecUserUnlisten;
  /** Perform a user initiated set */
  userSet?: SpecUserSet;
  /** Perform a user initiated patch */
  userPatch?: SpecUserPatch;
  /** Perform a user initiated delete */
  userDelete?: SpecUserDelete;

  /** Ack for a query in the watch stream */
  watchAck?: SpecWatchAck;
  /** Marks the query results as current */
  watchCurrent?: SpecWatchCurrent;
  /** Reset the results of a query */
  watchReset?: SpecWatchReset;
  /** Ack for remove or rejection of a query in the watch stream */
  watchRemove?: SpecWatchRemove;
  /** Document update in the watch stream */
  watchEntity?: SpecWatchEntity;
  /** Existence filter in the watch stream */
  watchFilter?: SpecWatchFilter;
  /** Snapshot ("NO_CHANGE") event in the watch stream. */
  watchSnapshot?: SpecWatchSnapshot;
  /** A step that the watch stream restarts. */
  watchStreamClose?: SpecWatchStreamClose;

  /** Ack the last write */
  writeAck?: SpecWriteAck;
  /** Fail a write */
  failWrite?: SpecWriteFailure;

  /**
   * Run a queued timer task (without waiting for the delay to expire). See
   * TimerId enum definition for possible values).
   */
  runTimer?: string;

  /**
   * Process all events currently enqueued in the AsyncQueue.
   */
  drainQueue?: true;

  /** Enable or disable RemoteStore's network connection. */
  enableNetwork?: boolean;

  /** Clears the persistent storage in IndexedDB. */
  clearPersistence?: true;

  /** Changes the metadata state of a client instance. */
  applyClientState?: SpecClientState; // PORTING NOTE: Only used by web multi-tab tests

  /** Change to a new active user (specified by uid or null for anonymous). */
  changeUser?: string | null;

  /**
   * Restarts the SyncEngine from scratch, except re-uses persistence and auth
   * components. This allows you to queue writes, get documents into cache,
   * etc. and then simulate an app restart.
   */
  restart?: true;

  /** Shut down the client and close it network connection. */
  shutdown?: true;

  /** Assert that the firestore client is shutdown. */
  expectIsShutdown?: true;

  /**
   * Optional list of expected events.
   * If not provided, the test will fail if the step causes events to be raised.
   */
  expect?: SpecExpectation[];

  /**
   * Optional dictionary of expected states.
   */
  stateExpect?: StateExpectation;
}

/** [<target-id>, <query-path>] */
export type SpecUserListen = [TargetId, string | SpecQuery];

/** [<target-id>, <query-path>] */
export type SpecUserUnlisten = [TargetId, string | SpecQuery];

/** [<key>, <value>] */
export type SpecUserSet = [string, JsonObject<unknown>];

/** [<key>, <patches>] */
export type SpecUserPatch = [string, JsonObject<unknown>];

/** key */
export type SpecUserDelete = string;

/** [<target-id>, ...] */
export type SpecWatchAck = TargetId[];

/** [[<target-id>, ...], <resume-token>] */
export type SpecWatchCurrent = [TargetId[], string];

/** [<target-id>, ...] */
export type SpecWatchReset = TargetId[];

export interface SpecError {
  code: number;
  message: string;
}

export interface SpecWatchRemove {
  targetIds: TargetId[];
  cause?: SpecError;
}

export interface SpecWatchSnapshot {
  version: TestSnapshotVersion;
  targetIds: TargetId[];
  resumeToken?: string;
}

export interface SpecWatchStreamClose {
  error: SpecError;
  runBackoffTimer: boolean;
}

export interface SpecWriteAck {
  /** The version the backend uses to ack the write. */
  version: TestSnapshotVersion;
  /**
   * Whether we should keep the write in our internal queue. This should only
   * be set to 'true' if the client ignores the write (e.g. a secondary client
   * which ignores write acknowledgments).
   *
   * Defaults to false.
   */
  // PORTING NOTE: Multi-Tab only.
  keepInQueue?: boolean;
}

export interface SpecWriteFailure {
  /** The error the backend uses to fail the write. */
  error: SpecError;
  /**
   * Whether we should keep the write in our internal queue. This should be set
   * to 'true' for transient errors or if the client ignores the failure
   * (e.g. a secondary client which ignores write rejections).
   *
   * Defaults to false.
   */
  keepInQueue?: boolean;
}

export interface SpecWatchEntity {
  // exactly one of key, doc or docs is set
  key?: string;
  /** [<key>, <version>, <value>] */
  doc?: SpecDocument;
  /** [<key>, <version>, <value>][] */
  docs?: SpecDocument[];
  /** [<target-id>, ...] */
  targets?: TargetId[];
  /** [<target-id>, ...] */
  removedTargets?: TargetId[];
}

// PORTING NOTE: Only used by web multi-tab tests.
export interface SpecClientState {
  /** The visibility state of the browser tab running the client. */
  visibility?: VisibilityState;
  /** Whether this tab should try to forcefully become primary. */
  primary?: true;
}

/**
 * [[<target-id>, ...], <key>, ...]
 * Note that the last parameter is really of type ...string (spread operator)
 * The filter is based of a list of keys to match in the existence filter
 */
export interface SpecWatchFilter
  extends Array<TargetId[] | string | undefined> {
  '0': TargetId[];
  '1': string | undefined;
}

/**
 * [field, op, value]
 * Op must be the `name` of an `Operator`.
 */
export type SpecQueryFilter = [string, string, unknown];

/**
 * [field, direction]
 * Direction can be 'asc' or 'desc'.
 */
export type SpecQueryOrderBy = [string, string];

/**
 * A representation of a query.
 */
export interface SpecQuery {
  path: string;
  collectionGroup?: string;
  limit?: number;
  filters?: SpecQueryFilter[];
  orderBys?: SpecQueryOrderBy[];
}

/**
 * [<key>, <version>, <value>, <doc-options> (optional), ...]
 * Represents a document. <value> is null for deleted documents.
 * Doc options are:
 *   'local': document has local modifications
 */
export interface SpecDocument {
  key: string;
  version: TestSnapshotVersion;
  value: JsonObject<unknown> | null;
  options?: DocumentOptions;
}

export interface SpecExpectation {
  query: SpecQuery;
  errorCode?: number;
  fromCache?: boolean;
  hasPendingWrites?: boolean;
  added?: SpecDocument[];
  removed?: SpecDocument[];
  modified?: SpecDocument[];
  metadata?: SpecDocument[];
}

export interface StateExpectation {
  /** Number of outstanding writes in the datastore queue. */
  numOutstandingWrites?: number;
  /** Number of clients currently marked active. Used in multi-client tests. */
  numActiveClients?: number;
  /** Number of requests sent to the write stream. */
  writeStreamRequestCount?: number;
  /** Number of requests sent to the watch stream. */
  watchStreamRequestCount?: number;
  /** Current documents in limbo. Verified in each step until overwritten. */
  limboDocs?: string[];
  /**
   * Whether the instance holds the primary lease. Used in multi-client tests.
   */
  isPrimary?: boolean;
  /**
   * Current expected active targets. Verified in each step until overwritten.
   */
  activeTargets?: {
    [targetId: number]: { query: SpecQuery; resumeToken: string };
  };
  /**
   * Expected set of callbacks for previously written docs.
   */
  userCallbacks?: {
    acknowledgedDocs: string[];
    rejectedDocs: string[];
  };
}

async function clearCurrentPrimaryLease(): Promise<void> {
  const db = await SimpleDb.openOrCreate(
    INDEXEDDB_TEST_DATABASE_NAME,
    SCHEMA_VERSION,
    new SchemaConverter(TEST_SERIALIZER)
  );
  await db.runTransaction('readwrite', [DbPrimaryClient.store], txn => {
    const primaryClientStore = txn.store<DbPrimaryClientKey, DbPrimaryClient>(
      DbPrimaryClient.store
    );
    return primaryClientStore.delete(DbPrimaryClient.key);
  });
  db.close();
}
