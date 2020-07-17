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

import { expect } from 'chai';
import { EmptyCredentialsProvider } from '../../../src/api/credentials';
import { User } from '../../../src/auth/user';
import { ComponentConfiguration } from '../../../src/core/component_provider';
import { DatabaseInfo } from '../../../src/core/database_info';
import {
  EventManager,
  Observer,
  QueryListener
} from '../../../src/core/event_manager';
import { canonifyQuery, Query, queryEquals } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { SyncEngine } from '../../../src/core/sync_engine';
import { TargetId } from '../../../src/core/types';
import {
  ChangeType,
  DocumentViewChange
} from '../../../src/core/view_snapshot';
import {
  DbPrimaryClient,
  DbPrimaryClientKey,
  SCHEMA_VERSION,
  SchemaConverter
} from '../../../src/local/indexeddb_schema';
import { LocalStore } from '../../../src/local/local_store';
import {
  ClientId,
  SharedClientState
} from '../../../src/local/shared_client_state';
import { SimpleDb } from '../../../src/local/simple_db';
import { TargetData, TargetPurpose } from '../../../src/local/target_data';
import { DocumentOptions } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { JsonObject } from '../../../src/model/object_value';
import { Mutation } from '../../../src/model/mutation';
import * as api from '../../../src/protos/firestore_proto_api';
import { ExistenceFilter } from '../../../src/remote/existence_filter';
import { RemoteStore } from '../../../src/remote/remote_store';
import { mapCodeFromRpcCode } from '../../../src/remote/rpc_error';
import {
  JsonProtoSerializer,
  toMutation,
  toTarget,
  toVersion
} from '../../../src/remote/serializer';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import { debugAssert, fail } from '../../../src/util/assert';
import { AsyncQueue, TimerId } from '../../../src/util/async_queue';
import { FirestoreError } from '../../../src/util/error';
import { primitiveComparator } from '../../../src/util/misc';
import { forEach, objectSize } from '../../../src/util/obj';
import { ObjectMap } from '../../../src/util/obj_map';
import { Deferred, sequence } from '../../../src/util/promise';
import {
  byteStringFromString,
  deletedDoc,
  deleteMutation,
  doc,
  filter,
  key,
  orderBy,
  patchMutation,
  path,
  query,
  setMutation,
  stringFromBase64String,
  TestSnapshotVersion,
  validateFirestoreError,
  version
} from '../../util/helpers';
import { encodeWatchChange } from '../../util/spec_test_helpers';
import {
  clearTestPersistence,
  INDEXEDDB_TEST_DATABASE_NAME,
  TEST_DATABASE_ID,
  TEST_PERSISTENCE_KEY,
  TEST_SERIALIZER
} from '../local/persistence_test_helpers';
import { MULTI_CLIENT_TAG } from './describe_spec';
import { ByteString } from '../../../src/util/byte_string';
import { SortedSet } from '../../../src/util/sorted_set';
import { ActiveTargetMap, ActiveTargetSpec } from './spec_builder';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { PersistenceSettings } from '../../../src/core/firestore_client';
import {
  EventAggregator,
  MockConnection,
  MockIndexedDbComponentProvider,
  MockIndexedDbPersistence,
  MockMemoryComponentProvider,
  MockMemoryPersistence,
  QueryEvent,
  SharedWriteTracker
} from './spec_test_components';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { encodeBase64 } from '../../../src/platform/base64';
import {
  FakeDocument,
  SharedFakeWebStorage,
  testWindow
} from '../../util/test_platform';

const ARBITRARY_SEQUENCE_NUMBER = 2;

export function parseQuery(querySpec: string | SpecQuery): Query {
  if (typeof querySpec === 'string') {
    return query(querySpec);
  } else {
    let query = new Query(path(querySpec.path), querySpec.collectionGroup);
    if (querySpec.limit) {
      query =
        querySpec.limitType === 'LimitToFirst'
          ? query.withLimitToFirst(querySpec.limit)
          : query.withLimitToLast(querySpec.limit);
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

abstract class TestRunner {
  protected queue: AsyncQueue;

  // Initialized asynchronously via start().
  private connection!: MockConnection;
  private eventManager!: EventManager;
  private syncEngine!: SyncEngine;

  private eventList: QueryEvent[] = [];
  private acknowledgedDocs: string[];
  private rejectedDocs: string[];
  private snapshotsInSyncListeners: Array<Observer<void>>;
  private snapshotsInSyncEvents = 0;

  protected document = new FakeDocument();
  private queryListeners = new ObjectMap<Query, QueryListener>(
    q => canonifyQuery(q),
    queryEquals
  );

  private expectedActiveLimboDocs: DocumentKey[];
  private expectedEnqueuedLimboDocs: DocumentKey[];
  private expectedActiveTargets: Map<TargetId, ActiveTargetSpec>;

  private networkEnabled = true;

  // Initialized asynchronously via start().
  private localStore!: LocalStore;
  private remoteStore!: RemoteStore;
  private persistence!: MockMemoryPersistence | MockIndexedDbPersistence;
  protected sharedClientState!: SharedClientState;

  private useGarbageCollection: boolean;
  private numClients: number;
  private maxConcurrentLimboResolutions?: number;
  private databaseInfo: DatabaseInfo;

  protected user = User.UNAUTHENTICATED;
  protected clientId: ClientId;

  private started = false;
  private serializer: JsonProtoSerializer;

  constructor(
    private sharedWrites: SharedWriteTracker,
    private persistenceSettings: PersistenceSettings,
    clientIndex: number,
    config: SpecConfig
  ) {
    this.clientId = `client${clientIndex}`;
    this.databaseInfo = new DatabaseInfo(
      TEST_DATABASE_ID,
      TEST_PERSISTENCE_KEY,
      'host',
      /*ssl=*/ false,
      /*forceLongPolling=*/ false
    );

    // TODO(mrschmidt): During client startup in `firestore_client`, we block
    // the AsyncQueue from executing any operation. We should mimic this in the
    // setup of the spec tests.
    this.queue = new AsyncQueue();
    this.queue.skipDelaysForTimerId(TimerId.ListenStreamConnectionBackoff);

    this.serializer = new JsonProtoSerializer(
      this.databaseInfo.databaseId,
      /* useProto3Json= */ true
    );

    this.useGarbageCollection = config.useGarbageCollection;
    this.numClients = config.numClients;
    this.maxConcurrentLimboResolutions = config.maxConcurrentLimboResolutions;
    this.expectedActiveLimboDocs = [];
    this.expectedEnqueuedLimboDocs = [];
    this.expectedActiveTargets = new Map<TargetId, ActiveTargetSpec>();
    this.acknowledgedDocs = [];
    this.rejectedDocs = [];
    this.snapshotsInSyncListeners = [];
  }

  async start(): Promise<void> {
    const componentProvider = await this.initializeComponentProvider(
      {
        asyncQueue: this.queue,
        databaseInfo: this.databaseInfo,
        credentials: new EmptyCredentialsProvider(),
        clientId: this.clientId,
        initialUser: this.user,
        maxConcurrentLimboResolutions:
          this.maxConcurrentLimboResolutions ?? Number.MAX_SAFE_INTEGER,
        persistenceSettings: this.persistenceSettings
      },
      this.useGarbageCollection
    );

    this.sharedClientState = componentProvider.sharedClientState;
    this.persistence = componentProvider.persistence;
    this.localStore = componentProvider.localStore;
    this.connection = componentProvider.connection;
    this.remoteStore = componentProvider.remoteStore;
    this.syncEngine = componentProvider.syncEngine;
    this.eventManager = componentProvider.eventManager;

    await this.persistence.setDatabaseDeletedListener(async () => {
      await this.shutdown();
    });

    this.started = true;
  }

  protected abstract initializeComponentProvider(
    configuration: ComponentConfiguration,
    gcEnabled: boolean
  ): Promise<MockIndexedDbComponentProvider | MockMemoryComponentProvider>;

  get isPrimaryClient(): boolean {
    return this.syncEngine.isPrimaryClient;
  }

  async shutdown(): Promise<void> {
    await this.queue.enqueueAndInitiateShutdown(async () => {
      if (this.started) {
        await this.doShutdown();
      }
    });
  }

  /** Runs a single SpecStep on this runner. */
  async run(step: SpecStep): Promise<void> {
    await this.doStep(step);
    await this.queue.drain();
    this.validateExpectedSnapshotEvents(step.expectedSnapshotEvents!);
    await this.validateExpectedState(step.expectedState!);
    this.validateSnapshotsInSyncEvents(step.expectedSnapshotsInSyncEvents);
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
    } else if ('addSnapshotsInSyncListener' in step) {
      return this.doAddSnapshotsInSyncListener();
    } else if ('removeSnapshotsInSyncListener' in step) {
      return this.doRemoveSnapshotsInSyncListener();
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
    } else if ('applyClientState' in step) {
      // PORTING NOTE: Only used by web multi-tab tests.
      return this.doApplyClientState(step.applyClientState!);
    } else if ('changeUser' in step) {
      return this.doChangeUser(step.changeUser!);
    } else if ('failDatabase' in step) {
      return step.failDatabase
        ? this.doFailDatabase(step.failDatabase!)
        : this.doRecoverDatabase();
    } else {
      return fail('Unknown step: ' + JSON.stringify(step));
    }
  }

  private async doListen(listenSpec: SpecUserListen): Promise<void> {
    let targetFailed = false;

    const querySpec = listenSpec[1];
    const query = parseQuery(querySpec);
    const aggregator = new EventAggregator(query, e => {
      if (e.error) {
        targetFailed = true;
      }
      this.pushEvent(e);
    });
    // TODO(dimond): Allow customizing listen options in spec tests
    const options = {
      includeMetadataChanges: true,
      waitForSyncWhenOnline: false
    };
    const queryListener = new QueryListener(query, aggregator, options);
    this.queryListeners.set(query, queryListener);

    await this.queue.enqueue(() => this.eventManager.listen(queryListener));

    if (targetFailed) {
      expect(this.persistence.injectFailures).contains('Allocate target');
    } else {
      // Skip the backoff that may have been triggered by a previous call to
      // `watchStreamCloses()`.
      if (
        this.queue.containsDelayedOperation(
          TimerId.ListenStreamConnectionBackoff
        )
      ) {
        await this.queue.runAllDelayedOperationsUntil(
          TimerId.ListenStreamConnectionBackoff
        );
      }

      if (this.isPrimaryClient && this.networkEnabled) {
        // Open should always have happened after a listen
        await this.connection.waitForWatchOpen();
      }
    }
  }

  private async doUnlisten(listenSpec: SpecUserUnlisten): Promise<void> {
    // TODO(dimond): make sure correct target IDs are assigned
    // let targetId = listenSpec[0];
    const querySpec = listenSpec[1];
    const query = parseQuery(querySpec);
    const eventEmitter = this.queryListeners.get(query);
    debugAssert(!!eventEmitter, 'There must be a query to unlisten too!');
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

  private doAddSnapshotsInSyncListener(): Promise<void> {
    const observer = {
      next: () => {
        this.snapshotsInSyncEvents += 1;
      },
      error: () => {}
    };
    this.snapshotsInSyncListeners.push(observer);
    this.eventManager.addSnapshotsInSyncListener(observer);
    return Promise.resolve();
  }

  private doRemoveSnapshotsInSyncListener(): Promise<void> {
    const removeObs = this.snapshotsInSyncListeners.pop();
    if (removeObs) {
      this.eventManager.removeSnapshotsInSyncListener(removeObs);
    } else {
      throw new Error('There must be a listener to unlisten to');
    }
    return Promise.resolve();
  }

  private doMutations(mutations: Mutation[]): Promise<void> {
    const documentKeys = mutations.map(val => val.key.path.toString());
    const syncEngineCallback = new Deferred<void>();
    syncEngineCallback.promise.then(
      () => this.acknowledgedDocs.push(...documentKeys),
      () => this.rejectedDocs.push(...documentKeys)
    );

    if (
      this.persistence.injectFailures.indexOf('Locally write mutations') === -1
    ) {
      this.sharedWrites.push(mutations);
    }

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
    const resumeToken = byteStringFromString(currentTargets[1]);
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
      ByteString.EMPTY_BYTE_STRING,
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
      debugAssert(
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
    debugAssert(
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
        readTime: toVersion(this.serializer, version(watchSnapshot.version)),
        // Convert to base64 string so it can later be parsed into ByteString.
        resumeToken: encodeBase64(watchSnapshot.resumeToken || ''),
        targetIds: watchSnapshot.targetIds
      }
    };
    this.connection.watchStream!.callOnMessage(protoJSON);

    // Put a no-op in the queue so that we know when any outstanding RemoteStore
    // writes on the network are complete.
    return this.queue.enqueue(async () => {});
  }

  private async doWatchEvent(watchChange: WatchChange): Promise<void> {
    const protoJSON = encodeWatchChange(watchChange);
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
      await this.queue.runAllDelayedOperationsUntil(
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
          toMutation(this.serializer, mutations[i])
        );
      }
    });
  }

  private doWriteAck(writeAck: SpecWriteAck): Promise<void> {
    const updateTime = toVersion(this.serializer, version(writeAck.version));
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
    await this.queue.runAllDelayedOperationsUntil(timerId);
  }

  private async doDisableNetwork(): Promise<void> {
    this.networkEnabled = false;
    // Make sure to execute all writes that are currently queued. This allows us
    // to assert on the total number of requests sent before shutdown.
    await this.remoteStore.fillWritePipeline();
    this.persistence.setNetworkEnabled(false);
    await this.remoteStore.disableNetwork();
  }

  private async doDrainQueue(): Promise<void> {
    await this.queue.drain();
  }

  private async doEnableNetwork(): Promise<void> {
    this.networkEnabled = true;
    this.persistence.setNetworkEnabled(true);
    await this.remoteStore.enableNetwork();
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

  private async doClearPersistence(): Promise<void> {
    await clearTestPersistence();
  }

  private async doRestart(): Promise<void> {
    // Reinitialize everything.
    await this.doShutdown();

    // We have to schedule the starts, otherwise we could end up with
    // interleaved events.
    await this.queue.enqueue(() => this.start());
  }

  private async doApplyClientState(state: SpecClientState): Promise<void> {
    if (state.visibility) {
      this.document.raiseVisibilityEvent(state.visibility!);
    }

    if (state.primary) {
      await clearCurrentPrimaryLease();
      await this.queue.runAllDelayedOperationsUntil(
        TimerId.ClientMetadataRefresh
      );
    }

    return Promise.resolve();
  }

  private async doChangeUser(user: string | null): Promise<void> {
    this.user = new User(user);
    // We don't block on `handleCredentialChange` as it may not get executed
    // during an IndexedDb failure. Non-recovery tests will pick up the user
    // change when the AsyncQueue is drained.
    this.queue.enqueueRetryable(() =>
      this.remoteStore.handleCredentialChange(new User(user))
    );
  }

  private async doFailDatabase(
    failActions: PersistenceAction[]
  ): Promise<void> {
    this.persistence.injectFailures = failActions;
  }

  private async doRecoverDatabase(): Promise<void> {
    this.persistence.injectFailures = [];
  }

  private validateExpectedSnapshotEvents(
    expectedEvents: SnapshotEvent[]
  ): void {
    if (expectedEvents) {
      expect(this.eventList.length).to.equal(
        expectedEvents.length,
        'Number of expected and actual events mismatch'
      );
      const actualEventsSorted = this.eventList.sort((a, b) =>
        primitiveComparator(canonifyQuery(a.query), canonifyQuery(b.query))
      );
      const expectedEventsSorted = expectedEvents.sort((a, b) =>
        primitiveComparator(
          canonifyQuery(parseQuery(a.query)),
          canonifyQuery(parseQuery(b.query))
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

  private async validateExpectedState(
    expectedState: StateExpectation
  ): Promise<void> {
    if (expectedState) {
      if ('numOutstandingWrites' in expectedState) {
        expect(this.remoteStore.outstandingWrites()).to.equal(
          expectedState.numOutstandingWrites
        );
      }
      if ('numActiveClients' in expectedState) {
        debugAssert(
          this.persistence instanceof IndexedDbPersistence,
          'numActiveClients() requires IndexedDbPersistence'
        );
        const activeClients = await this.persistence.getActiveClients();
        expect(activeClients.length).to.equal(expectedState.numActiveClients);
      }
      if ('writeStreamRequestCount' in expectedState) {
        expect(this.connection.writeStreamRequestCount).to.equal(
          expectedState.writeStreamRequestCount
        );
      }
      if ('watchStreamRequestCount' in expectedState) {
        expect(this.connection.watchStreamRequestCount).to.equal(
          expectedState.watchStreamRequestCount
        );
      }
      if ('activeLimboDocs' in expectedState) {
        this.expectedActiveLimboDocs = expectedState.activeLimboDocs!.map(key);
      }
      if ('enqueuedLimboDocs' in expectedState) {
        this.expectedEnqueuedLimboDocs = expectedState.enqueuedLimboDocs!.map(
          key
        );
      }
      if ('activeTargets' in expectedState) {
        this.expectedActiveTargets.clear();
        forEach(expectedState.activeTargets!, (key, value) => {
          this.expectedActiveTargets.set(Number(key), value);
        });
      }
      if ('isPrimary' in expectedState) {
        expect(this.isPrimaryClient).to.eq(
          expectedState.isPrimary!,
          'isPrimary'
        );
      }
      if ('isShutdown' in expectedState) {
        expect(this.started).to.equal(!expectedState.isShutdown);
      }
    }

    if (expectedState && expectedState.userCallbacks) {
      expect(this.acknowledgedDocs).to.have.members(
        expectedState.userCallbacks.acknowledgedDocs
      );
      expect(this.rejectedDocs).to.have.members(
        expectedState.userCallbacks.rejectedDocs
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
      this.validateActiveLimboDocs();
      this.validateEnqueuedLimboDocs();
      // Always validate that the expected active targets match the actual
      // active targets
      await this.validateActiveTargets();
    }
  }

  private validateSnapshotsInSyncEvents(
    expectedCount: number | undefined
  ): void {
    expect(this.snapshotsInSyncEvents).to.eq(expectedCount || 0);
    this.snapshotsInSyncEvents = 0;
  }

  private validateActiveLimboDocs(): void {
    let actualLimboDocs = this.syncEngine.activeLimboDocumentResolutions();

    if (this.connection.isWatchOpen) {
      // Validate that each active limbo doc has an expected active target
      actualLimboDocs.forEach((key, targetId) => {
        const targetIds = new Array(this.expectedActiveTargets.keys()).map(
          n => '' + n
        );
        expect(this.expectedActiveTargets.has(targetId)).to.equal(
          true,
          `Found limbo doc ${key.toString()}, but its target ID ${targetId} ` +
            `was not in the set of expected active target IDs ` +
            `(${targetIds.join(', ')})`
        );
      });
    }

    for (const expectedLimboDoc of this.expectedActiveLimboDocs) {
      expect(actualLimboDocs.get(expectedLimboDoc)).to.not.equal(
        null,
        'Expected doc to be in limbo, but was not: ' +
          expectedLimboDoc.toString()
      );
      actualLimboDocs = actualLimboDocs.remove(expectedLimboDoc);
    }
    expect(actualLimboDocs.size).to.equal(
      0,
      'Unexpected active docs in limbo: ' + actualLimboDocs.toString()
    );
  }

  private validateEnqueuedLimboDocs(): void {
    let actualLimboDocs = new SortedSet<DocumentKey>(DocumentKey.comparator);
    this.syncEngine.enqueuedLimboDocumentResolutions().forEach(key => {
      actualLimboDocs = actualLimboDocs.add(key);
    });
    let expectedLimboDocs = new SortedSet<DocumentKey>(DocumentKey.comparator);
    this.expectedEnqueuedLimboDocs.forEach(key => {
      expectedLimboDocs = expectedLimboDocs.add(key);
    });
    actualLimboDocs.forEach(key => {
      expect(expectedLimboDocs.has(key)).to.equal(
        true,
        `Found enqueued limbo doc ${key.toString()}, but it was not in ` +
          `the set of expected enqueued limbo documents ` +
          `(${expectedLimboDocs.toString()})`
      );
    });
    expectedLimboDocs.forEach(key => {
      expect(actualLimboDocs.has(key)).to.equal(
        true,
        `Expected doc ${key.toString()} to be enqueued for limbo resolution, ` +
          `but it was not in the queue (${actualLimboDocs.toString()})`
      );
    });
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
    if (this.expectedActiveTargets.size > 0) {
      await this.connection.waitForWatchOpen();
      await this.queue.drain();
    }

    const actualTargets = { ...this.connection.activeTargets };
    this.expectedActiveTargets.forEach((expected, targetId) => {
      expect(actualTargets[targetId]).to.not.equal(
        undefined,
        'Expected active target not found: ' + JSON.stringify(expected)
      );
      const actualTarget = actualTargets[targetId];

      // TODO(mcg): populate the purpose of the target once it's possible to
      // encode that in the spec tests. For now, hard-code that it's a listen
      // despite the fact that it's not always the right value.
      const expectedTarget = toTarget(
        this.serializer,
        new TargetData(
          parseQuery(expected.queries[0]).toTarget(),
          targetId,
          TargetPurpose.Listen,
          ARBITRARY_SEQUENCE_NUMBER,
          SnapshotVersion.min(),
          SnapshotVersion.min(),
          byteStringFromString(expected.resumeToken)
        )
      );
      expect(actualTarget.query).to.deep.equal(expectedTarget.query);
      expect(actualTarget.targetId).to.equal(expectedTarget.targetId);
      expect(actualTarget.readTime).to.equal(expectedTarget.readTime);
      expect(actualTarget.resumeToken).to.equal(
        expectedTarget.resumeToken,
        `ResumeToken does not match - expected:
         ${stringFromBase64String(
           expectedTarget.resumeToken
         )}, actual: ${stringFromBase64String(actualTarget.resumeToken)}`
      );
      delete actualTargets[targetId];
    });
    expect(objectSize(actualTargets)).to.equal(
      0,
      'Unexpected active targets: ' + JSON.stringify(actualTargets)
    );
  }

  private validateWatchExpectation(
    expected: SnapshotEvent,
    actual: QueryEvent
  ): void {
    const expectedQuery = parseQuery(expected.query);
    expect(actual.query).to.deep.equal(expectedQuery);
    if (expected.errorCode) {
      validateFirestoreError(
        mapCodeFromRpcCode(expected.errorCode),
        actual.error!
      );
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
  constructor(
    sharedWrites: SharedWriteTracker,
    clientIndex: number,
    config: SpecConfig
  ) {
    super(
      sharedWrites,
      {
        durable: false
      },
      clientIndex,
      config
    );
  }

  protected async initializeComponentProvider(
    configuration: ComponentConfiguration,
    gcEnabled: boolean
  ): Promise<MockMemoryComponentProvider> {
    const componentProvider = new MockMemoryComponentProvider(gcEnabled);
    await componentProvider.initialize(configuration);
    return componentProvider;
  }
}

/**
 * Runs the specs using IndexedDbPersistence, the creator must ensure that it is
 * enabled for the platform.
 */
class IndexedDbTestRunner extends TestRunner {
  constructor(
    sharedWrites: SharedWriteTracker,
    private sharedFakeWebStorage: SharedFakeWebStorage,
    clientIndex: number,
    config: SpecConfig
  ) {
    super(
      sharedWrites,
      {
        durable: true,
        cacheSizeBytes: LruParams.DEFAULT_CACHE_SIZE_BYTES,
        synchronizeTabs: true,
        forceOwningTab: false
      },
      clientIndex,
      config
    );
  }

  protected async initializeComponentProvider(
    configuration: ComponentConfiguration,
    gcEnabled: boolean
  ): Promise<MockIndexedDbComponentProvider> {
    const componentProvider = new MockIndexedDbComponentProvider(
      testWindow(this.sharedFakeWebStorage),
      this.document
    );
    await componentProvider.initialize(configuration);
    return componentProvider;
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
  tags: string[],
  usePersistence: boolean,
  config: SpecConfig,
  steps: SpecStep[]
): Promise<void> {
  const sharedMockStorage = new SharedFakeWebStorage();

  // PORTING NOTE: Non multi-client SDKs only support a single test runner.
  const runners: TestRunner[] = [];
  const outstandingMutations = new SharedWriteTracker();

  const ensureRunner = async (clientIndex: number): Promise<TestRunner> => {
    if (!runners[clientIndex]) {
      if (usePersistence) {
        runners[clientIndex] = new IndexedDbTestRunner(
          outstandingMutations,
          sharedMockStorage,
          clientIndex,
          config
        );
      } else {
        runners[clientIndex] = new MemoryTestRunner(
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
      debugAssert(
        step.clientIndex === undefined || tags.indexOf(MULTI_CLIENT_TAG) !== -1,
        "Cannot use 'client()' to initialize a test that is not tagged with " +
          "'multi-client'. Did you mean to use 'spec()'?"
      );

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

  /**
   * The maximum number of concurrently-active listens for limbo resolutions.
   * This value must be strictly greater than zero, or undefined to use the
   * default value.
   */
  maxConcurrentLimboResolutions?: number;
}

/**
 * The cumulative list of actions run against Persistence. This is used by the
 * Spec tests to fail specific types of actions.
 */
export type PersistenceAction =
  | 'Get next mutation batch'
  | 'read document'
  | 'Allocate target'
  | 'Release target'
  | 'Execute query'
  | 'Handle user change'
  | 'Locally write mutations'
  | 'Acknowledge batch'
  | 'Reject batch'
  | 'Get highest unacknowledged batch id'
  | 'Get last stream token'
  | 'Set last stream token'
  | 'Get last remote snapshot version'
  | 'Set last remote snapshot version'
  | 'Apply remote event'
  | 'notifyLocalViewChanges'
  | 'Remote document keys'
  | 'Collect garbage'
  | 'maybeGarbageCollectMultiClientState'
  | 'Lookup mutation documents'
  | 'Get target data'
  | 'Get new document changes'
  | 'Synchronize last document change read time'
  | 'updateClientMetadataAndTryBecomePrimary'
  | 'getHighestListenSequenceNumber';

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
  /** Listens to a SnapshotsInSync event. */
  addSnapshotsInSyncListener?: true;
  /** Unlistens from a SnapshotsInSync event. */
  removeSnapshotsInSyncListener?: true;

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

  /** Fails the listed database actions. */
  failDatabase?: false | PersistenceAction[];

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

  /**
   * Optional list of expected events.
   * If not provided, the test will fail if the step causes events to be raised.
   */
  expectedSnapshotEvents?: SnapshotEvent[];

  /**
   * Optional dictionary of expected states.
   */
  expectedState?: StateExpectation;

  /**
   * Optional expected number of onSnapshotsInSync callbacks to be called.
   * If not provided, the test will fail if the step causes events to be raised.
   */
  expectedSnapshotsInSyncEvents?: number;
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

export type SpecLimitType = 'LimitToFirst' | 'LimitToLast';

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
  limitType?: SpecLimitType;
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

export interface SnapshotEvent {
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
  /**
   * Current documents in limbo that have an active target.
   * Verified in each step until overwritten.
   */
  activeLimboDocs?: string[];
  /**
   * Current documents in limbo that are enqueued and therefore do not have an
   * active target.
   * Verified in each step until overwritten.
   */
  enqueuedLimboDocs?: string[];
  /**
   * Whether the instance holds the primary lease. Used in multi-client tests.
   */
  isPrimary?: boolean;
  /** Whether the client is shutdown. */
  isShutdown?: boolean;
  /**
   * Current expected active targets. Verified in each step until overwritten.
   */
  activeTargets?: ActiveTargetMap;
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
