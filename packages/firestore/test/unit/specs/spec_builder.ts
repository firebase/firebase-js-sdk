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

import { expect } from 'chai';
import { Filter, Query, RelationFilter } from '../../../src/core/query';
import { TargetIdGenerator } from '../../../src/core/target_id_generator';
import { TargetId } from '../../../src/core/types';
import { Document, NoDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { JsonObject } from '../../../src/model/field_value';
import { mapRpcCodeFromCode } from '../../../src/remote/rpc_error';
import { assert } from '../../../src/util/assert';
import { fail } from '../../../src/util/assert';
import { Code } from '../../../src/util/error';
import { AnyJs } from '../../../src/util/misc';
import * as objUtils from '../../../src/util/obj';
import { isNullOrUndefined } from '../../../src/util/types';
import { TestSnapshotVersion } from '../../util/helpers';

import { RpcError } from './spec_rpc_error';
import {
  runSpec,
  SpecConfig,
  SpecDocument,
  SpecQuery,
  SpecQueryFilter,
  SpecQueryOrderBy,
  SpecStep,
  SpecWatchFilter
} from './spec_test_runner';
import { TimerId } from '../../../src/util/async_queue';

/**
 * Provides a high-level language to construct spec tests that can be exported
 * to the spec JSON format or be run as a spec test directly.
 *
 * Exported JSON tests can be used in other clients without the need to
 * duplicate tests in every client.
 */
export class SpecBuilder {
  private config: SpecConfig = { useGarbageCollection: true };
  private steps: SpecStep[] = [];
  // currentStep is built up (in particular, expectations can be added to it)
  // until nextStep() is called to append it to steps.
  private currentStep: SpecStep | null = null;
  private queryMapping: { [query: string]: TargetId } = {};
  private limboMapping: { [key: string]: TargetId } = {};

  /**
   * Tracks all expected active watch targets based on userListens(),
   * userUnlistens(), and  watchRemoves() steps and the expectActiveTargets()
   * and expectLimboDocs() expectations.
   *
   * Automatically keeping track of the active targets makes writing tests
   * much simpler and the tests much easier to follow.
   *
   * Whenever the map changes, the expected state is automatically encoded in
   * the tests.
   */
  private activeTargets: {
    [targetId: number]: { query: SpecQuery; resumeToken: string };
  } = {};

  private queryIdGenerator: TargetIdGenerator = TargetIdGenerator.forLocalStore();
  private limboIdGenerator: TargetIdGenerator = TargetIdGenerator.forSyncEngine();

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
  withGCEnabled(gcEnabled: boolean): SpecBuilder {
    assert(
      !this.currentStep,
      'withGCEnabled() must be called before all spec steps.'
    );
    this.config.useGarbageCollection = gcEnabled;
    return this;
  }

  userListens(query: Query, resumeToken?: string): SpecBuilder {
    this.nextStep();

    let targetId: TargetId = 0;
    if (objUtils.contains(this.queryMapping, query.canonicalId())) {
      if (this.config.useGarbageCollection) {
        throw new Error('Listening to same query twice: ' + query);
      } else {
        targetId = this.queryMapping[query.canonicalId()];
      }
    } else {
      targetId = this.queryIdGenerator.next();
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
  restoreListen(query: Query, resumeToken: string): SpecBuilder {
    let targetId = this.queryMapping[query.canonicalId()];

    if (isNullOrUndefined(targetId)) {
      throw new Error("Can't restore an unknown query: " + query);
    }

    this.activeTargets[targetId] = {
      query: SpecBuilder.queryToSpec(query),
      resumeToken: resumeToken
    };

    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.activeTargets = objUtils.shallowCopy(
      this.activeTargets
    );
    return this;
  }

  userUnlistens(query: Query): SpecBuilder {
    this.nextStep();
    if (!objUtils.contains(this.queryMapping, query.canonicalId())) {
      throw new Error('Unlistening to query not listened to: ' + query);
    }
    const targetId = this.queryMapping[query.canonicalId()];
    if (this.config.useGarbageCollection) {
      delete this.queryMapping[query.canonicalId()];
    }
    delete this.activeTargets[targetId];
    this.currentStep = {
      userUnlisten: [targetId, SpecBuilder.queryToSpec(query)],
      stateExpect: { activeTargets: objUtils.shallowCopy(this.activeTargets) }
    };
    return this;
  }

  userSets(key: string, value: JsonObject<AnyJs>): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      userSet: [key, value]
    };
    return this;
  }

  userPatches(key: string, value: JsonObject<AnyJs>): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      userPatch: [key, value]
    };
    return this;
  }

  userDeletes(key: string): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      userDelete: key
    };
    return this;
  }

  runTimer(timerId: TimerId) {
    this.nextStep();
    this.currentStep = { runTimer: timerId };
    return this;
  }

  changeUser(uid: string | null): SpecBuilder {
    this.nextStep();
    this.currentStep = { changeUser: uid };
    return this;
  }

  disableNetwork(): SpecBuilder {
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

  enableNetwork(): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      enableNetwork: true
    };
    return this;
  }

  restart(): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      restart: true,
      stateExpect: {
        activeTargets: {},
        limboDocs: []
      }
    };

    // Reset our mappings / target ids since all existing listens will be
    // forgotten
    this.queryMapping = {};
    this.limboMapping = {};
    this.activeTargets = {};
    this.queryIdGenerator = TargetIdGenerator.forLocalStore();
    this.limboIdGenerator = TargetIdGenerator.forSyncEngine();
    return this;
  }

  /** Overrides the currently expected set of active targets. */
  expectActiveTargets(
    ...targets: Array<{ query: Query; resumeToken: string }>
  ): SpecBuilder {
    this.assertStep('Active target expectation requires previous step');
    const currentStep = this.currentStep!;
    this.activeTargets = {};
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
  expectLimboDocs(...keys: DocumentKey[]): SpecBuilder {
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
  ackLimbo(
    version: TestSnapshotVersion,
    doc: Document | NoDocument
  ): SpecBuilder {
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
  watchRemovesLimboTarget(doc: Document | NoDocument): SpecBuilder {
    const query = Query.atPath(doc.key.path);
    this.watchRemoves(query);
    return this;
  }

  /**
   * Acks a write with a version and optional additional options.
   *
   * expectUserCallback defaults to true if options are omitted.
   */
  writeAcks(
    version: TestSnapshotVersion,
    options?: {
      expectUserCallback: boolean;
    }
  ): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      writeAck: {
        version,
        expectUserCallback: options ? options.expectUserCallback : true
      }
    };
    return this;
  }

  /**
   * Fails a write with an error and optional additional options.
   *
   * expectUserCallback defaults to true if options are omitted.
   */
  failWrite(
    err: RpcError,
    options?: { expectUserCallback: boolean }
  ): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      failWrite: {
        error: err,
        expectUserCallback: options ? options.expectUserCallback : true
      }
    };
    return this;
  }

  watchAcks(query: Query): SpecBuilder {
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
  watchCurrents(query: Query, resumeToken: string): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      watchCurrent: [[this.getTargetId(query)], resumeToken]
    };
    return this;
  }

  watchRemoves(query: Query, cause?: RpcError): SpecBuilder {
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
    ...docs: Document[]
  ): SpecBuilder {
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

  watchRemovesDoc(key: DocumentKey, ...targets: Query[]): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      watchEntity: {
        key: SpecBuilder.keyToSpec(key),
        removedTargets: targets.map(query => this.getTargetId(query))
      }
    };
    return this;
  }

  watchFilters(queries: Query[], ...docs: DocumentKey[]): SpecBuilder {
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

  watchResets(...queries: Query[]): SpecBuilder {
    this.nextStep();
    const targetIds = queries.map(query => this.getTargetId(query));
    this.currentStep = {
      watchReset: targetIds
    };
    return this;
  }

  watchSnapshots(version: TestSnapshotVersion): SpecBuilder {
    this.assertStep('Watch snapshot requires previous watch step');
    this.currentStep!.watchSnapshot = version;
    return this;
  }

  watchAcksFull(
    query: Query,
    version: TestSnapshotVersion,
    ...docs: Document[]
  ): SpecBuilder {
    this.watchAcks(query);
    this.watchSends({ affects: [query] }, ...docs);
    this.watchCurrents(query, 'resume-token-' + version);
    this.watchSnapshots(version);
    return this;
  }

  watchStreamCloses(error: Code): SpecBuilder {
    this.nextStep();
    this.currentStep = {
      watchStreamClose: {
        error: {
          code: mapRpcCodeFromCode(error),
          message: 'Simulated Backend Error'
        }
      }
    };
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
  ): SpecBuilder {
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

  /**
   * Verifies the total number of requests sent to the write backend since test
   * initialization.
   */
  expectWriteStreamRequestCount(num: number): SpecBuilder {
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
  expectWatchStreamRequestCount(num: number): SpecBuilder {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.watchStreamRequestCount = num;
    return this;
  }

  expectNumOutstandingWrites(num: number): SpecBuilder {
    this.assertStep('Expectations require previous step');
    const currentStep = this.currentStep!;
    currentStep.stateExpect = currentStep.stateExpect || {};
    currentStep.stateExpect.numOutstandingWrites = num;
    return this;
  }

  private static queryToSpec(query: Query): SpecQuery {
    // TODO(dimond): full query support
    const spec: SpecQuery = { path: query.path.canonicalString() };
    if (query.hasLimit()) {
      spec.limit = query.limit!;
    }
    if (query.filters) {
      spec.filters = query.filters.map((filter: Filter) => {
        if (filter instanceof RelationFilter) {
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

  private static docToSpec(doc: Document): SpecDocument {
    const spec: SpecDocument = [
      SpecBuilder.keyToSpec(doc.key),
      doc.version.toMicroseconds(),
      doc.data.value()
    ];
    if (doc.hasLocalMutations) {
      spec.push('local');
    }
    return spec;
  }

  private static keyToSpec(key: DocumentKey): string {
    return key.path.canonicalString();
  }

  private nextStep(): void {
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

export function spec() {
  return new SpecBuilder();
}
