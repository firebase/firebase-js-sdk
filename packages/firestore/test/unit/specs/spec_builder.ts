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

import {
  FieldFilter,
  Query,
  queryEquals,
  Filter,
  newQueryForPath,
  queryToTarget
} from '../../../src/core/query';
import { canonifyTarget, Target, targetEquals } from '../../../src/core/target';
import { TargetIdGenerator } from '../../../src/core/target_id_generator';
import { TargetId } from '../../../src/core/types';
import {
  Document,
  MaybeDocument,
  NoDocument
} from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { JsonObject } from '../../../src/model/object_value';
import {
  isPermanentWriteError,
  mapCodeFromRpcCode,
  mapRpcCodeFromCode
} from '../../../src/remote/rpc_error';
import { debugAssert, fail } from '../../../src/util/assert';

import { Code } from '../../../src/util/error';
import { forEach } from '../../../src/util/obj';
import { isNullOrUndefined } from '../../../src/util/types';
import { TestSnapshotVersion, testUserDataWriter } from '../../util/helpers';

import { TimerId } from '../../../src/util/async_queue';
import { RpcError } from './spec_rpc_error';
import { ObjectMap } from '../../../src/util/obj_map';
import {
  parseQuery,
  PersistenceAction,
  runSpec,
  SpecConfig,
  SpecDocument,
  SpecQuery,
  SpecQueryFilter,
  SpecQueryOrderBy,
  SpecStep,
  SpecWatchFilter,
  SpecWriteAck,
  SpecWriteFailure
} from './spec_test_runner';
import { ResourcePath } from '../../../src/model/path';

const userDataWriter = testUserDataWriter();

// These types are used in a protected API by SpecBuilder and need to be
// exported.
export interface LimboMap {
  [key: string]: TargetId;
}

export interface ActiveTargetSpec {
  queries: SpecQuery[];
  resumeToken?: string;
  readTime?: TestSnapshotVersion;
}

export interface ActiveTargetMap {
  [targetId: string]: ActiveTargetSpec;
}

/**
 * Tracks the expected memory state of a client (e.g. the expected active watch
 * targets based on userListens(), userUnlistens(), and watchRemoves()
 * as well as the expectActiveTargets() and expectLimboDocs() expectations).
 *
 * Automatically keeping track of the active targets makes writing tests
 * much simpler and the tests much easier to follow.
 *
 * Whenever the map changes, the expected state is automatically encoded in
 * the tests.
 */
export class ClientMemoryState {
  activeTargets: ActiveTargetMap = {};
  queryMapping = new ObjectMap<Target, TargetId>(
    t => canonifyTarget(t),
    targetEquals
  );
  limboMapping: LimboMap = {};

  limboIdGenerator: TargetIdGenerator = TargetIdGenerator.forSyncEngine();
  injectFailures = false;

  constructor() {
    this.reset();
  }

  /** Reset all internal memory state (as done during a client restart). */
  reset(): void {
    this.queryMapping = new ObjectMap<Target, TargetId>(
      t => canonifyTarget(t),
      targetEquals
    );
    this.limboMapping = {};
    this.activeTargets = {};
    this.limboIdGenerator = TargetIdGenerator.forSyncEngine();
  }

  /**
   * Reset the internal limbo mapping (as done during a primary lease failover).
   */
  resetLimboMapping(): void {
    this.limboMapping = {};
  }
}

/**
 * Generates and provides consistent cross-tab target IDs for queries that are
 * active in multiple tabs.
 */
class CachedTargetIdGenerator {
  // TODO(wuandy): rename this to targetMapping.
  private queryMapping = new ObjectMap<Target, TargetId>(
    t => canonifyTarget(t),
    targetEquals
  );
  private targetIdGenerator = TargetIdGenerator.forTargetCache();

  /**
   * Returns a cached target ID for the provided Target, or a new ID if no
   * target ID has ever been assigned.
   */
  next(target: Target): TargetId {
    if (this.queryMapping.has(target)) {
      return this.queryMapping.get(target)!;
    }
    const targetId = this.targetIdGenerator.next();
    this.queryMapping.set(target, targetId);
    return targetId;
  }

  /** Returns the target ID for a target that is known to exist. */
  cachedId(target: Target): TargetId {
    if (!this.queryMapping.has(target)) {
      throw new Error("Target ID doesn't exists for target: " + target);
    }

    return this.queryMapping.get(target)!;
  }

  /** Remove the cached target ID for the provided target. */
  purge(target: Target): void {
    if (!this.queryMapping.has(target)) {
      throw new Error("Target ID doesn't exists for target: " + target);
    }

    this.queryMapping.delete(target);
  }
}
/**
 * Provides a high-level language to construct spec tests that can be exported
 * to the spec JSON format or be run as a spec test directly.
 *
 * Exported JSON tests can be used in other clients without the need to
 * duplicate tests in every client.
 */
export class SpecBuilder {
  protected config: SpecConfig = { useGarbageCollection: true, numClients: 1 };
  // currentStep is built up (in particular, expectations can be added to it)
  // until nextStep() is called to append it to steps.
  protected currentStep: SpecStep | null = null;

  private steps: SpecStep[] = [];

  private queryIdGenerator = new CachedTargetIdGenerator();

  private readonly currentClientState: ClientMemoryState = new ClientMemoryState();

  // Accessor function that can be overridden to return a different
  // `ClientMemoryState`.
  protected get clientState(): ClientMemoryState {
    return this.currentClientState;
  }

  private get limboIdGenerator(): TargetIdGenerator {
    return this.clientState.limboIdGenerator;
  }

  private get queryMapping(): ObjectMap<Target, TargetId> {
    return this.clientState.queryMapping;
  }

  private get limboMapping(): LimboMap {
    return this.clientState.limboMapping;
  }

  private get activeTargets(): ActiveTargetMap {
    return this.clientState.activeTargets;
  }

  private get injectFailures(): boolean {
    return this.clientState.injectFailures;
  }

  private set injectFailures(injectFailures: boolean) {
    this.clientState.injectFailures = injectFailures;
  }

  /**
   * Exports the spec steps as a JSON object that be used in the spec runner.
   */
  toJSON(): { config: SpecConfig; steps: SpecStep[] } {
    this.nextStep();
    return { config: this.config, steps: this.steps };
  }

  /**
   * Run the spec as a test. If persistence is available it will run it with and
   * without persistence enabled.
   */
  runAsTest(
    name: string,
    tags: string[],
    usePersistence: boolean
  ): Promise<void> {
    this.nextStep();
    return runSpec(name, tags, usePersistence, this.config, this.steps);
  }

  // Configures Garbage Collection behavior (on or off). Default is on.
  withGCEnabled(gcEnabled: boolean): this {
    debugAssert(
      !this.currentStep,
      'withGCEnabled() must be called before all spec steps.'
    );
    this.config.useGarbageCollection = gcEnabled;
    return this;
  }

  withMaxConcurrentLimboResolutions(value?: number): this {
    this.config.maxConcurrentLimboResolutions = value;
    return this;
  }

  userListens(
    query: Query,
    resume?: { resumeToken?: string; readTime?: TestSnapshotVersion }
  ): this {
    this.nextStep();

    const target = queryToTarget(query);
    let targetId: TargetId = 0;

    if (this.injectFailures) {
      // Return a `userListens()` step but don't advance the target IDs.
      this.currentStep = {
        userListen: { targetId, query: SpecBuilder.queryToSpec(query) }
      };
    } else {
      if (this.queryMapping.has(target)) {
        targetId = this.queryMapping.get(target)!;
      } else {
        targetId = this.queryIdGenerator.next(target);
      }

      this.queryMapping.set(target, targetId);
      this.addQueryToActiveTargets(
        targetId,
        query,
        resume?.resumeToken,
        resume?.readTime
      );
      this.currentStep = {
        userListen: { targetId, query: SpecBuilder.queryToSpec(query) },
        expectedState: { activeTargets: { ...this.activeTargets } }
      };
    }
    return this;
  }

  /**
   * Registers a previously active target with the test expectations after a
   * stream disconnect.
   */
  restoreListen(query: Query, resumeToken: string): this {
    const targetId = this.queryMapping.get(queryToTarget(query));

    if (isNullOrUndefined(targetId)) {
      throw new Error("Can't restore an unknown query: " + query);
    }

    this.addQueryToActiveTargets(targetId!, query, resumeToken);

    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.activeTargets = { ...this.activeTargets };
    return this;
  }

  userUnlistens(query: Query): this {
    this.nextStep();
    const target = queryToTarget(query);
    if (!this.queryMapping.has(target)) {
      throw new Error('Unlistening to query not listened to: ' + query);
    }
    const targetId = this.queryMapping.get(target)!;
    this.removeQueryFromActiveTargets(query, targetId);

    if (this.config.useGarbageCollection && !this.activeTargets[targetId]) {
      this.queryMapping.delete(target);
      this.queryIdGenerator.purge(target);
    }

    this.currentStep = {
      userUnlisten: [targetId, SpecBuilder.queryToSpec(query)],
      expectedState: { activeTargets: { ...this.activeTargets } }
    };
    return this;
  }

  userSets(key: string, value: JsonObject<unknown>): this {
    this.nextStep();
    this.currentStep = {
      userSet: [key, value]
    };
    return this;
  }

  userPatches(key: string, value: JsonObject<unknown>): this {
    this.nextStep();
    this.currentStep = {
      userPatch: [key, value]
    };
    return this;
  }

  userDeletes(key: string): this {
    this.nextStep();
    this.currentStep = {
      userDelete: key
    };
    return this;
  }

  userAddsSnapshotsInSyncListener(): this {
    this.nextStep();
    this.currentStep = {
      addSnapshotsInSyncListener: true
    };
    return this;
  }

  userRemovesSnapshotsInSyncListener(): this {
    this.nextStep();
    this.currentStep = {
      removeSnapshotsInSyncListener: true
    };
    return this;
  }

  loadBundle(bundleContent: string): this {
    this.nextStep();
    this.currentStep = {
      loadBundle: bundleContent
    };
    // Loading a bundle implicitly creates a new target. We advance the `queryIdGenerator` to match.
    this.queryIdGenerator.next(
      queryToTarget(newQueryForPath(ResourcePath.emptyPath()))
    );
    return this;
  }

  // PORTING NOTE: Only used by web multi-tab tests.
  becomeHidden(): this {
    this.nextStep();
    this.currentStep = {
      applyClientState: { visibility: 'hidden' }
    };
    return this;
  }

  // PORTING NOTE: Only used by web multi-tab tests.
  becomeVisible(): this {
    this.nextStep();
    this.currentStep = {
      applyClientState: { visibility: 'visible' }
    };
    return this;
  }

  runTimer(timerId: TimerId): this {
    this.nextStep();
    this.currentStep = { runTimer: timerId };
    return this;
  }

  changeUser(uid: string | null): this {
    this.nextStep();
    this.currentStep = { changeUser: uid };
    return this;
  }

  disableNetwork(): this {
    this.nextStep();
    this.currentStep = {
      enableNetwork: false,
      expectedState: {
        activeTargets: {},
        activeLimboDocs: [],
        enqueuedLimboDocs: []
      }
    };
    return this;
  }

  enableNetwork(): this {
    this.nextStep();
    this.currentStep = {
      enableNetwork: true
    };
    return this;
  }

  clearPersistence(): this {
    this.nextStep();
    this.currentStep = {
      clearPersistence: true
    };
    return this;
  }

  restart(): this {
    this.nextStep();
    this.currentStep = {
      restart: true,
      expectedState: {
        activeTargets: {},
        activeLimboDocs: [],
        enqueuedLimboDocs: []
      }
    };
    // Reset our mappings / target ids since all existing listens will be
    // forgotten.
    this.clientState.reset();
    return this;
  }

  shutdown(): this {
    this.nextStep();
    this.currentStep = {
      shutdown: true,
      expectedState: {
        activeTargets: {},
        activeLimboDocs: [],
        enqueuedLimboDocs: []
      }
    };
    // Reset our mappings / target ids since all existing listens will be
    // forgotten.
    this.clientState.reset();
    return this;
  }

  /**
   * Fails the specified database transaction until `recoverDatabase()` is
   * called.
   */
  failDatabaseTransactions(...actions: PersistenceAction[]): this {
    this.nextStep();
    this.injectFailures = true;
    this.currentStep = {
      failDatabase: actions
    };
    return this;
  }

  /** Stops failing database operations. */
  recoverDatabase(): this {
    this.nextStep();
    this.injectFailures = false;
    this.currentStep = {
      failDatabase: false
    };
    return this;
  }

  expectIsShutdown(): this {
    this.assertStep('Active target expectation requires previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.isShutdown = true;
    return this;
  }

  /** Overrides the currently expected set of active targets. */
  expectActiveTargets(
    ...targets: Array<{
      query: Query;
      resumeToken?: string;
      readTime?: TestSnapshotVersion;
    }>
  ): this {
    this.assertStep('Active target expectation requires previous step');
    const currentStep = this.currentStep!;
    this.clientState.activeTargets = {};
    targets.forEach(({ query, resumeToken, readTime }) => {
      this.addQueryToActiveTargets(
        this.getTargetId(query),
        query,
        resumeToken,
        readTime
      );
    });
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.activeTargets = { ...this.activeTargets };
    return this;
  }

  /**
   * Expects a document to be in limbo. A targetId is assigned if it's not in
   * limbo yet.
   */
  expectLimboDocs(...keys: DocumentKey[]): this {
    this.assertStep('Limbo expectation requires previous step');
    const currentStep = this.currentStep!;

    // Clear any preexisting limbo watch targets, which we'll re-create as
    // necessary from the provided keys below.
    forEach(this.limboMapping, (key, targetId) => {
      delete this.activeTargets[targetId];
    });

    keys.forEach(key => {
      const path = key.path.canonicalString();
      // Create limbo target ID mapping if it was not in limbo yet
      if (!this.limboMapping[path]) {
        this.limboMapping[path] = this.limboIdGenerator.next();
      }
      // Limbo doc queries are always without resume token
      this.addQueryToActiveTargets(
        this.limboMapping[path],
        newQueryForPath(key.path),
        ''
      );
    });

    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.activeLimboDocs = keys.map(k =>
      SpecBuilder.keyToSpec(k)
    );
    currentStep.expectedState.activeTargets = { ...this.activeTargets };
    return this;
  }

  /**
   * Expects a document to be in limbo, enqueued for limbo resolution, and
   * therefore *without* an active targetId.
   */
  expectEnqueuedLimboDocs(...keys: DocumentKey[]): this {
    this.assertStep('Limbo expectation requires previous step');
    const currentStep = this.currentStep!;

    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.enqueuedLimboDocs = keys.map(k =>
      SpecBuilder.keyToSpec(k)
    );

    return this;
  }

  /**
   * Special helper for limbo documents that acks with either a document or
   * with no document for NoDocument. This is translated into normal watch
   * messages.
   */
  ackLimbo(version: TestSnapshotVersion, doc: Document | NoDocument): this {
    const query = newQueryForPath(doc.key.path);
    this.watchAcks(query);
    if (doc instanceof Document) {
      this.watchSends({ affects: [query] }, doc);
    } else if (doc instanceof NoDocument) {
      // Don't send any updates
    } else {
      fail('Unknown parameter: ' + doc);
    }
    this.watchCurrents(query, 'resume-token-' + version);
    this.watchSnapshots(version);
    return this;
  }

  /**
   * Special helper for limbo documents that acks an unlisten for a limbo doc
   * with either a document or with no document for NoDocument. This is
   * translated into normal watch messages.
   */
  watchRemovesLimboTarget(doc: Document | NoDocument): this {
    const query = newQueryForPath(doc.key.path);
    this.watchRemoves(query);
    return this;
  }

  /**
   * Acks a write with a version and optional additional options.
   *
   * expectUserCallback defaults to true if omitted.
   */
  writeAcks(
    doc: string,
    version: TestSnapshotVersion,
    options?: { expectUserCallback?: boolean; keepInQueue?: boolean }
  ): this {
    this.nextStep();
    options = options || {};

    const writeAck: SpecWriteAck = { version };
    if (options.keepInQueue) {
      writeAck.keepInQueue = true;
    }
    this.currentStep = { writeAck };

    if (options.expectUserCallback !== false) {
      return this.expectUserCallbacks({ acknowledged: [doc] });
    } else {
      return this;
    }
  }

  /**
   * Fails a write with an error and optional additional options.
   *
   * expectUserCallback defaults to true if omitted.
   */
  failWrite(
    doc: string,
    error: RpcError,
    options?: { expectUserCallback?: boolean; keepInQueue?: boolean }
  ): this {
    this.nextStep();
    options = options || {};

    // If this is a permanent error, the write is not expected to be sent
    // again.
    const code = mapCodeFromRpcCode(error.code);
    const isPermanentFailure = isPermanentWriteError(code);
    const keepInQueue =
      options.keepInQueue !== undefined
        ? options.keepInQueue
        : !isPermanentFailure;

    const failWrite: SpecWriteFailure = { error };
    if (keepInQueue) {
      failWrite.keepInQueue = true;
    }
    this.currentStep = { failWrite };

    if (options.expectUserCallback !== false) {
      return this.expectUserCallbacks({ rejected: [doc] });
    } else {
      return this;
    }
  }

  // TODO(wuandy): watch* methods should really be dealing with Target, not
  // Query, make this happen.
  watchAcks(query: Query): this {
    this.nextStep();
    this.currentStep = {
      watchAck: [this.getTargetId(query)]
    };
    return this;
  }

  // Technically any target change can contain a resume token, but a CURRENT
  // target change is where it makes the most sense in our tests currently.
  // Eventually we want to make the model more generic so we can add resume
  // tokens in other places.
  // TODO(b/37254270): Handle global resume tokens
  watchCurrents(query: Query, resumeToken: string): this {
    this.nextStep();
    this.currentStep = {
      watchCurrent: [[this.getTargetId(query)], resumeToken]
    };
    return this;
  }

  watchRemoves(query: Query, cause?: RpcError): this {
    this.nextStep();
    this.currentStep = {
      watchRemove: { targetIds: [this.getTargetId(query)], cause }
    };
    if (cause) {
      delete this.activeTargets[this.getTargetId(query)];
      this.currentStep.expectedState = {
        activeTargets: { ...this.activeTargets }
      };
    }
    return this;
  }

  watchSends(
    targets: { affects?: Query[]; removed?: Query[] },
    ...docs: MaybeDocument[]
  ): this {
    this.nextStep();
    const affects =
      targets.affects &&
      targets.affects.map(query => {
        return this.getTargetId(query);
      });
    const removed =
      targets.removed &&
      targets.removed.map(query => {
        return this.getTargetId(query);
      });
    const specDocs: SpecDocument[] = [];
    for (const doc of docs) {
      specDocs.push(SpecBuilder.docToSpec(doc));
    }
    this.currentStep = {
      watchEntity: {
        docs: specDocs,
        targets: affects,
        removedTargets: removed
      }
    };
    return this;
  }

  watchRemovesDoc(key: DocumentKey, ...targets: Query[]): this {
    this.nextStep();
    this.currentStep = {
      watchEntity: {
        key: SpecBuilder.keyToSpec(key),
        removedTargets: targets.map(query => this.getTargetId(query))
      }
    };
    return this;
  }

  watchFilters(queries: Query[], ...docs: DocumentKey[]): this {
    this.nextStep();
    const targetIds = queries.map(query => {
      return this.getTargetId(query);
    });
    const keys = docs.map(key => {
      return key.path.canonicalString();
    });
    const filter: SpecWatchFilter = [targetIds] as SpecWatchFilter;
    for (const key of keys) {
      filter.push(key);
    }
    this.currentStep = {
      watchFilter: filter
    };
    return this;
  }

  watchResets(...queries: Query[]): this {
    this.nextStep();
    const targetIds = queries.map(query => this.getTargetId(query));
    this.currentStep = {
      watchReset: targetIds
    };
    return this;
  }

  watchSnapshots(
    version: TestSnapshotVersion,
    targets?: Query[],
    resumeToken?: string
  ): this {
    this.nextStep();
    const targetIds = targets
      ? targets.map(query => this.getTargetId(query))
      : [];
    this.currentStep = {
      watchSnapshot: { version, targetIds, resumeToken }
    };
    return this;
  }

  watchAcksFull(
    query: Query,
    version: TestSnapshotVersion,
    ...docs: Document[]
  ): this {
    this.watchAcks(query);
    this.watchSends({ affects: [query] }, ...docs);
    this.watchCurrents(query, 'resume-token-' + version);
    this.watchSnapshots(version);
    return this;
  }

  watchStreamCloses(error: Code, opts?: { runBackoffTimer: boolean }): this {
    if (!opts) {
      opts = { runBackoffTimer: true };
    }

    this.nextStep();
    this.currentStep = {
      watchStreamClose: {
        error: {
          code: mapRpcCodeFromCode(error),
          message: 'Simulated Backend Error'
        },
        runBackoffTimer: opts.runBackoffTimer
      }
    };
    return this;
  }

  expectUserCallbacks(docs: {
    acknowledged?: string[];
    rejected?: string[];
  }): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.userCallbacks = currentStep.expectedState
      .userCallbacks || { acknowledgedDocs: [], rejectedDocs: [] };

    if (docs.acknowledged) {
      currentStep.expectedState.userCallbacks.acknowledgedDocs.push(
        ...docs.acknowledged
      );
    }

    if (docs.rejected) {
      currentStep.expectedState.userCallbacks.rejectedDocs.push(
        ...docs.rejected
      );
    }

    return this;
  }

  expectEvents(
    query: Query,
    events: {
      fromCache?: boolean;
      hasPendingWrites?: boolean;
      added?: Document[];
      modified?: Document[];
      removed?: Document[];
      metadata?: Document[];
      errorCode?: Code;
    }
  ): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    if (!currentStep.expectedSnapshotEvents) {
      currentStep.expectedSnapshotEvents = [];
    }
    debugAssert(
      !events.errorCode ||
        !(events.added || events.modified || events.removed || events.metadata),
      "Can't provide both error and events"
    );
    currentStep.expectedSnapshotEvents.push({
      query: SpecBuilder.queryToSpec(query),
      added: events.added && events.added.map(SpecBuilder.docToSpec),
      modified: events.modified && events.modified.map(SpecBuilder.docToSpec),
      removed: events.removed && events.removed.map(SpecBuilder.docToSpec),
      metadata: events.metadata && events.metadata.map(SpecBuilder.docToSpec),
      errorCode: mapRpcCodeFromCode(events.errorCode),
      fromCache: events.fromCache || false,
      hasPendingWrites: events.hasPendingWrites || false
    });
    return this;
  }

  /** Registers a query that is active in another tab. */
  expectListen(
    query: Query,
    resume?: { resumeToken?: string; readTime?: TestSnapshotVersion }
  ): this {
    this.assertStep('Expectations require previous step');

    const target = queryToTarget(query);
    const targetId = this.queryIdGenerator.cachedId(target);
    this.queryMapping.set(target, targetId);

    this.addQueryToActiveTargets(
      targetId,
      query,
      resume?.resumeToken,
      resume?.readTime
    );

    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.activeTargets = { ...this.activeTargets };
    return this;
  }

  /** Removes a query that is no longer active in any tab. */
  expectUnlisten(query: Query): this {
    this.assertStep('Expectations require previous step');

    const target = queryToTarget(query);
    const targetId = this.queryMapping.get(target)!;

    this.removeQueryFromActiveTargets(query, targetId);

    if (this.config.useGarbageCollection && !this.activeTargets[targetId]) {
      this.queryMapping.delete(target);
      this.queryIdGenerator.purge(target);
    }

    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.activeTargets = { ...this.activeTargets };
    return this;
  }

  /**
   * Verifies the total number of requests sent to the write backend since test
   * initialization.
   */
  expectWriteStreamRequestCount(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.writeStreamRequestCount = num;
    return this;
  }

  /**
   * Verifies the total number of requests sent to the watch backend since test
   * initialization.
   */
  expectWatchStreamRequestCount(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.watchStreamRequestCount = num;
    return this;
  }

  expectNumOutstandingWrites(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.numOutstandingWrites = num;
    return this;
  }

  expectNumActiveClients(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.numActiveClients = num;
    return this;
  }

  expectPrimaryState(isPrimary: boolean): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedState = currentStep.expectedState || {};
    currentStep.expectedState.isPrimary = isPrimary;
    return this;
  }

  expectSnapshotsInSyncEvent(count = 1): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.expectedSnapshotsInSyncEvents = count;
    return this;
  }

  private static queryToSpec(query: Query): SpecQuery {
    // TODO(dimond): full query support
    const spec: SpecQuery = { path: query.path.canonicalString() };
    if (query.collectionGroup !== null) {
      spec.collectionGroup = query.collectionGroup;
    }
    if (query.hasLimitToFirst()) {
      spec.limit = query.limit!;
      spec.limitType = 'LimitToFirst';
    }
    if (query.hasLimitToLast()) {
      spec.limit = query.limit!;
      spec.limitType = 'LimitToLast';
    }
    if (query.filters) {
      spec.filters = query.filters.map((filter: Filter) => {
        if (filter instanceof FieldFilter) {
          // TODO(dimond): Support non-JSON primitive values?
          return [
            filter.field.canonicalString(),
            filter.op,
            userDataWriter.convertValue(filter.value)
          ] as SpecQueryFilter;
        } else {
          return fail('Unknown filter: ' + filter);
        }
      });
    }
    if (query.explicitOrderBy) {
      spec.orderBys = query.explicitOrderBy.map(orderBy => {
        return [
          orderBy.field.canonicalString(),
          orderBy.dir
        ] as SpecQueryOrderBy;
      });
    }
    return spec;
  }

  private static docToSpec(doc: MaybeDocument): SpecDocument {
    if (doc instanceof Document) {
      return {
        key: SpecBuilder.keyToSpec(doc.key),
        version: doc.version.toMicroseconds(),
        value: userDataWriter.convertValue(doc.toProto()) as JsonObject<
          unknown
        >,
        options: {
          hasLocalMutations: doc.hasLocalMutations,
          hasCommittedMutations: doc.hasCommittedMutations
        }
      };
    } else {
      return {
        key: SpecBuilder.keyToSpec(doc.key),
        version: doc.version.toMicroseconds(),
        value: null
      };
    }
  }

  private static keyToSpec(key: DocumentKey): string {
    return key.path.canonicalString();
  }

  protected nextStep(): void {
    if (this.currentStep !== null) {
      this.steps.push(this.currentStep);
      this.currentStep = null;
    }
  }

  /**
   * Add the specified `Query` under give active targe id. If it is already
   * added, this is a no-op.
   */
  private addQueryToActiveTargets(
    targetId: number,
    query: Query,
    resumeToken?: string,
    readTime?: TestSnapshotVersion
  ): void {
    if (this.activeTargets[targetId]) {
      const activeQueries = this.activeTargets[targetId].queries;
      if (
        !activeQueries.some(specQuery =>
          queryEquals(parseQuery(specQuery), query)
        )
      ) {
        // `query` is not added yet.
        this.activeTargets[targetId] = {
          queries: [SpecBuilder.queryToSpec(query), ...activeQueries],
          resumeToken: resumeToken || '',
          readTime
        };
      } else {
        this.activeTargets[targetId] = {
          queries: activeQueries,
          resumeToken: resumeToken || '',
          readTime
        };
      }
    } else {
      this.activeTargets[targetId] = {
        queries: [SpecBuilder.queryToSpec(query)],
        resumeToken: resumeToken || '',
        readTime
      };
    }
  }

  private removeQueryFromActiveTargets(query: Query, targetId: number): void {
    const queriesAfterRemoval = this.activeTargets[targetId].queries.filter(
      specQuery => !queryEquals(parseQuery(specQuery), query)
    );
    if (queriesAfterRemoval.length > 0) {
      this.activeTargets[targetId] = {
        queries: queriesAfterRemoval,
        resumeToken: this.activeTargets[targetId].resumeToken
      };
    } else {
      delete this.activeTargets[targetId];
    }
  }

  private assertStep(msg: string): void {
    if (this.currentStep === null) {
      throw new Error('Expected a previous step: ' + msg);
    }
  }

  private getTargetId(query: Query): TargetId {
    const queryTargetId = this.queryMapping.get(queryToTarget(query));
    const limboTargetId = this.limboMapping[query.path.canonicalString()];
    if (queryTargetId && limboTargetId) {
      // TODO(dimond): add support for query for doc and limbo doc at the same
      // time?
      fail('Found both query and limbo doc with target ID, not supported yet');
    }
    const targetId = queryTargetId || limboTargetId;
    debugAssert(
      !isNullOrUndefined(targetId),
      'No target ID found for query/limbo doc in spec'
    );
    return targetId;
  }
}

/**
 * SpecBuilder that supports serialized interactions between different clients.
 *
 * Use `client(clientIndex)` to switch between clients.
 */
// PORTING NOTE: Only used by web multi-tab tests.
export class MultiClientSpecBuilder extends SpecBuilder {
  private activeClientIndex = -1;
  private clientStates: ClientMemoryState[] = [];

  protected get clientState(): ClientMemoryState {
    if (!this.clientStates[this.activeClientIndex]) {
      this.clientStates[this.activeClientIndex] = new ClientMemoryState();
    }
    return this.clientStates[this.activeClientIndex];
  }

  client(clientIndex: number): MultiClientSpecBuilder {
    // Since `currentStep` is fully self-contained and does not rely on previous
    // state, we don't need to use a different SpecBuilder instance for each
    // client.
    this.nextStep();
    this.currentStep = {
      drainQueue: true
    };

    this.activeClientIndex = clientIndex;
    this.config.numClients = Math.max(
      this.config.numClients,
      this.activeClientIndex + 1
    );

    return this;
  }

  /**
   * Take the primary lease, even if another client has already obtained the
   * lease.
   */
  stealPrimaryLease(): this {
    this.nextStep();
    this.currentStep = {
      applyClientState: {
        primary: true
      },
      expectedState: {
        isPrimary: true
      }
    };

    // HACK: SyncEngine resets its limbo mapping when it gains the primary
    // lease. The SpecTests need to also clear their mapping, but when we parse
    // the spec tests, we don't know when the primary lease transition happens.
    // It is likely going to happen right after `stealPrimaryLease`, so we are
    // clearing the limbo mapping here.
    this.clientState.resetLimboMapping();

    return this;
  }

  protected nextStep(): void {
    if (this.currentStep !== null) {
      this.currentStep.clientIndex = this.activeClientIndex;
    }
    super.nextStep();
  }
}

/** Starts a new single-client SpecTest. */
export function spec(): SpecBuilder {
  return new SpecBuilder();
}

/** Starts a new multi-client SpecTest. */
// PORTING NOTE: Only used by web multi-tab tests.
export function client(
  num: number,
  withGcEnabled?: boolean
): MultiClientSpecBuilder {
  const specBuilder = new MultiClientSpecBuilder();
  specBuilder.withGCEnabled(withGcEnabled === true);
  return specBuilder.client(num);
}
