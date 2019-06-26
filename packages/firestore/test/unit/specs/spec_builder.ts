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

import { FieldFilter, Filter, Query } from '../../../src/core/query';
import { TargetIdGenerator } from '../../../src/core/target_id_generator';
import { TargetId } from '../../../src/core/types';
import {
  Document,
  MaybeDocument,
  NoDocument
} from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { JsonObject } from '../../../src/model/field_value';
import {
  isPermanentWriteError,
  mapCodeFromRpcCode,
  mapRpcCodeFromCode
} from '../../../src/remote/rpc_error';
import { assert, fail } from '../../../src/util/assert';

import { Code } from '../../../src/util/error';
import * as objUtils from '../../../src/util/obj';
import { isNullOrUndefined } from '../../../src/util/types';
import { TestSnapshotVersion } from '../../util/helpers';

import { TimerId } from '../../../src/util/async_queue';
import { RpcError } from './spec_rpc_error';
import {
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

// These types are used in a protected API by SpecBuilder and need to be
// exported.
export interface QueryMap {
  [query: string]: TargetId;
}
export interface LimboMap {
  [key: string]: TargetId;
}

export interface ActiveTargetMap {
  [targetId: string]: { query: SpecQuery; resumeToken: string };
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
  activeTargets: ActiveTargetMap;
  queryMapping: QueryMap;
  limboMapping: LimboMap;

  limboIdGenerator: TargetIdGenerator;

  constructor() {
    this.reset();
  }

  /** Reset all internal memory state (as done during a client restart). */
  reset(): void {
    this.queryMapping = {};
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
  private queryMapping: QueryMap = {};
  private targetIdGenerator = TargetIdGenerator.forQueryCache();

  /**
   * Returns a cached target ID for the provided query, or a new ID if no
   * target ID has ever been assigned.
   */
  next(query: Query): TargetId {
    if (objUtils.contains(this.queryMapping, query.canonicalId())) {
      return this.queryMapping[query.canonicalId()];
    }
    const targetId = this.targetIdGenerator.next();
    this.queryMapping[query.canonicalId()] = targetId;
    return targetId;
  }

  /** Returns the target ID for a query that is known to exist. */
  cachedId(query: Query): TargetId {
    if (!objUtils.contains(this.queryMapping, query.canonicalId())) {
      throw new Error("Target ID doesn't exists for query: " + query);
    }

    return this.queryMapping[query.canonicalId()];
  }

  /** Remove the cached target ID for the provided query. */
  purge(query: Query): void {
    if (!objUtils.contains(this.queryMapping, query.canonicalId())) {
      throw new Error("Target ID doesn't exists for query: " + query);
    }

    delete this.queryMapping[query.canonicalId()];
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

  private get queryMapping(): QueryMap {
    return this.clientState.queryMapping;
  }

  private get limboMapping(): LimboMap {
    return this.clientState.limboMapping;
  }

  private get activeTargets(): ActiveTargetMap {
    return this.clientState.activeTargets;
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
  runAsTest(name: string, usePersistence: boolean): Promise<void> {
    this.nextStep();
    return runSpec(name, usePersistence, this.config, this.steps);
  }

  // Configures Garbage Collection behavior (on or off). Default is on.
  withGCEnabled(gcEnabled: boolean): this {
    assert(
      !this.currentStep,
      'withGCEnabled() must be called before all spec steps.'
    );
    this.config.useGarbageCollection = gcEnabled;
    return this;
  }

  userListens(query: Query, resumeToken?: string): this {
    this.nextStep();

    let targetId: TargetId = 0;
    if (objUtils.contains(this.queryMapping, query.canonicalId())) {
      if (this.config.useGarbageCollection) {
        throw new Error('Listening to same query twice: ' + query);
      } else {
        targetId = this.queryMapping[query.canonicalId()];
      }
    } else {
      targetId = this.queryIdGenerator.next(query);
    }

    this.queryMapping[query.canonicalId()] = targetId;
    this.activeTargets[targetId] = {
      query: SpecBuilder.queryToSpec(query),
      resumeToken: resumeToken || ''
    };
    this.currentStep = {
      userListen: [targetId, SpecBuilder.queryToSpec(query)],
      stateExpect: { activeTargets: objUtils.shallowCopy(this.activeTargets) }
    };
    return this;
  }

  /**
   * Registers a previously active target with the test expectations after a
   * stream disconnect.
   */
  restoreListen(query: Query, resumeToken: string): this {
    const targetId = this.queryMapping[query.canonicalId()];

    if (isNullOrUndefined(targetId)) {
      throw new Error("Can't restore an unknown query: " + query);
    }

    this.activeTargets[targetId] = {
      query: SpecBuilder.queryToSpec(query),
      resumeToken
    };

    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.activeTargets = objUtils.shallowCopy(
      this.activeTargets
    );
    return this;
  }

  userUnlistens(query: Query): this {
    this.nextStep();
    if (!objUtils.contains(this.queryMapping, query.canonicalId())) {
      throw new Error('Unlistening to query not listened to: ' + query);
    }
    const targetId = this.queryMapping[query.canonicalId()];
    if (this.config.useGarbageCollection) {
      delete this.queryMapping[query.canonicalId()];
      this.queryIdGenerator.purge(query);
    }
    delete this.activeTargets[targetId];
    this.currentStep = {
      userUnlisten: [targetId, SpecBuilder.queryToSpec(query)],
      stateExpect: { activeTargets: objUtils.shallowCopy(this.activeTargets) }
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
      stateExpect: {
        activeTargets: {},
        limboDocs: []
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
      stateExpect: {
        activeTargets: {},
        limboDocs: []
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
      stateExpect: {
        activeTargets: {},
        limboDocs: []
      }
    };
    // Reset our mappings / target ids since all existing listens will be
    // forgotten.
    this.clientState.reset();
    return this;
  }

  expectIsShutdown(): this {
    this.nextStep();
    this.currentStep = {
      expectIsShutdown: true
    };
    return this;
  }

  /** Overrides the currently expected set of active targets. */
  expectActiveTargets(
    ...targets: Array<{ query: Query; resumeToken: string }>
  ): this {
    this.assertStep('Active target expectation requires previous step');
    const currentStep = this.currentStep!;
    this.clientState.activeTargets = {};
    targets.forEach(({ query, resumeToken }) => {
      this.activeTargets[this.getTargetId(query)] = {
        query: SpecBuilder.queryToSpec(query),
        resumeToken
      };
    });
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.activeTargets = objUtils.shallowCopy(
      this.activeTargets
    );
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
    objUtils.forEach(this.limboMapping, (key, targetId) => {
      delete this.activeTargets[targetId];
    });

    keys.forEach(key => {
      const path = key.path.canonicalString();
      // Create limbo target ID mapping if it was not in limbo yet
      if (!objUtils.contains(this.limboMapping, path)) {
        this.limboMapping[path] = this.limboIdGenerator.next();
      }
      this.activeTargets[this.limboMapping[path]] = {
        query: SpecBuilder.queryToSpec(Query.atPath(key.path)),
        // Limbo doc queries are currently always without resume token
        resumeToken: ''
      };
    });

    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.limboDocs = keys.map(k => SpecBuilder.keyToSpec(k));
    currentStep.stateExpect.activeTargets = objUtils.shallowCopy(
      this.activeTargets
    );
    return this;
  }

  /**
   * Special helper for limbo documents that acks with either a document or
   * with no document for NoDocument. This is translated into normal watch
   * messages.
   */
  ackLimbo(version: TestSnapshotVersion, doc: Document | NoDocument): this {
    const query = Query.atPath(doc.key.path);
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
    const query = Query.atPath(doc.key.path);
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
      this.currentStep.stateExpect = {
        activeTargets: objUtils.shallowCopy(this.activeTargets)
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
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.userCallbacks = currentStep.stateExpect
      .userCallbacks || { acknowledgedDocs: [], rejectedDocs: [] };

    if (docs.acknowledged) {
      currentStep.stateExpect.userCallbacks.acknowledgedDocs.push(
        ...docs.acknowledged
      );
    }

    if (docs.rejected) {
      currentStep.stateExpect.userCallbacks.rejectedDocs.push(...docs.rejected);
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
    if (!currentStep.expect) {
      currentStep.expect = [];
    }
    assert(
      !events.errorCode ||
        !(events.added || events.modified || events.removed || events.metadata),
      "Can't provide both error and events"
    );
    currentStep.expect.push({
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
  expectListen(query: Query, resumeToken?: string): this {
    this.assertStep('Expectations require previous step');

    const targetId = this.queryIdGenerator.cachedId(query);
    this.queryMapping[query.canonicalId()] = targetId;

    this.activeTargets[targetId] = {
      query: SpecBuilder.queryToSpec(query),
      resumeToken: resumeToken || ''
    };

    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.activeTargets = objUtils.shallowCopy(
      this.activeTargets
    );
    return this;
  }

  /** Removes a query that is no longer active in any tab. */
  expectUnlisten(query: Query): this {
    this.assertStep('Expectations require previous step');

    const targetId = this.queryMapping[query.canonicalId()];

    if (this.config.useGarbageCollection) {
      delete this.queryMapping[query.canonicalId()];
      this.queryIdGenerator.purge(query);
    }

    delete this.activeTargets[targetId];

    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.activeTargets = objUtils.shallowCopy(
      this.activeTargets
    );
    return this;
  }

  /**
   * Verifies the total number of requests sent to the write backend since test
   * initialization.
   */
  expectWriteStreamRequestCount(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.writeStreamRequestCount = num;
    return this;
  }

  /**
   * Verifies the total number of requests sent to the watch backend since test
   * initialization.
   */
  expectWatchStreamRequestCount(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.watchStreamRequestCount = num;
    return this;
  }

  expectNumOutstandingWrites(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.numOutstandingWrites = num;
    return this;
  }

  expectNumActiveClients(num: number): this {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.numActiveClients = num;
    return this;
  }

  expectPrimaryState(isPrimary: boolean): this {
    this.assertStep('Expectations requires previous step');
    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.isPrimary = isPrimary;
    return this;
  }

  private static queryToSpec(query: Query): SpecQuery {
    // TODO(dimond): full query support
    const spec: SpecQuery = { path: query.path.canonicalString() };
    if (query.collectionGroup !== null) {
      spec.collectionGroup = query.collectionGroup;
    }
    if (query.hasLimit()) {
      spec.limit = query.limit!;
    }
    if (query.filters) {
      spec.filters = query.filters.map((filter: Filter) => {
        if (filter instanceof FieldFilter) {
          // TODO(dimond): Support non-JSON primitive values?
          return [
            filter.field.canonicalString(),
            filter.op.name,
            filter.value.value()
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
          orderBy.dir.name
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
        value: doc.data.value(),
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

  private assertStep(msg: string): void {
    if (this.currentStep === null) {
      throw new Error('Expected a previous step: ' + msg);
    }
  }

  private getTargetId(query: Query): TargetId {
    const queryTargetId = this.queryMapping[query.canonicalId()];
    const limboTargetId = this.limboMapping[query.path.canonicalString()];
    if (queryTargetId && limboTargetId) {
      // TODO(dimond): add support for query for doc and limbo doc at the same
      // time?
      fail('Found both query and limbo doc with target ID, not supported yet');
    }
    const targetId = queryTargetId || limboTargetId;
    assert(
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
      stateExpect: {
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
