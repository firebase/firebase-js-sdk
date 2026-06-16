/**
 * @license
 * Copyright 2026 Google LLC
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

import { describe } from '../../util/mocha_extensions';
import { onPipelineSnapshot } from '../../util/pipelines';
import { Deferred } from '../../util/promise';

import {
  Query,
  Firestore,
  QuerySnapshot,
  DocumentData,
  CollectionReference,
  getDocs as getDocsProd,
  onSnapshot as onSnapshotProd,
  Unsubscribe,
  SnapshotListenOptions
} from './firebase_export';
import {
  isPersistenceAvailable,
  MemoryLruPersistenceMode,
  IndexedDbPersistenceMode,
  checkOnlineAndOfflineResultsMatch,
  PersistenceMode
} from './helpers';
import {
  _enableRealtimePipeline,
  RealtimePipeline,
  RealtimePipelineSnapshot,
  PipelineResult
} from './pipeline_export';
import { getRunEnterpriseTests } from './settings';

export type PipelineMode = 'no-pipeline-conversion' | 'query-to-pipeline';

function apiPipelineDescribeInternal(
  describeFn:
    | Mocha.PendingSuiteFunction
    | Mocha.SuiteFunction
    | Mocha.ExclusiveSuiteFunction,
  message: string,
  testSuite: (persistence: PersistenceMode, pipelineMode: PipelineMode) => void
): void {
  const persistenceModes: PersistenceMode[] = [new MemoryLruPersistenceMode()];
  if (isPersistenceAvailable()) {
    persistenceModes.push(new IndexedDbPersistenceMode());
  }

  const pipelineModes: PipelineMode[] = [];
  if (getRunEnterpriseTests()) {
    pipelineModes.push('query-to-pipeline');
  }

  for (const persistenceMode of persistenceModes) {
    for (const pipelineMode of pipelineModes) {
      describeFn(
        `(Persistence=${persistenceMode.name} Pipeline=${pipelineMode}) ${message}`,
        () =>
          // Freeze the properties of the `PersistenceMode` object specified to the
          // test suite so that it cannot (accidentally or intentionally) change
          // its properties, and affect all subsequent test suites.
          testSuite(Object.freeze(persistenceMode), pipelineMode)
      );
    }
  }
}

type ApiPipelineSuiteFunction = (
  message: string,
  testSuite: (persistence: PersistenceMode, pipelineMode: PipelineMode) => void
) => void;
interface ApiPipelineDescribe {
  (
    message: string,
    testSuite: (
      persistence: PersistenceMode,
      pipelineMode: PipelineMode
    ) => void
  ): void;
  skip: ApiPipelineSuiteFunction;
  only: ApiPipelineSuiteFunction;
}

export const apiPipelineDescribe = apiPipelineDescribeInternal.bind(
  null,
  describe
) as ApiPipelineDescribe;
apiPipelineDescribe.skip = apiPipelineDescribeInternal.bind(
  null,
  // eslint-disable-next-line no-restricted-properties
  describe.skip
);
apiPipelineDescribe.only = apiPipelineDescribeInternal.bind(
  null,
  // eslint-disable-next-line no-restricted-properties
  describe.only
);

export async function checkOnlineAndOfflineResultsMatchWithPipelineMode(
  pipelineMode: PipelineMode,
  coll: CollectionReference,
  query: Query,
  ...expectedDocs: string[]
): Promise<void> {
  if (pipelineMode === 'no-pipeline-conversion') {
    await checkOnlineAndOfflineResultsMatch(coll, query, ...expectedDocs);
  } else {
    // pipelineMode === 'query-to-pipeline'
    _enableRealtimePipeline(query.firestore as Firestore);
    const pipeline = (query.firestore as Firestore)
      .realtimePipeline()
      .createFrom(query);
    const deferred = new Deferred<RealtimePipelineSnapshot>();
    const unsub = onPipelineSnapshot(
      pipeline,
      { includeMetadataChanges: true },
      snapshot => {
        if (snapshot.metadata.fromCache === false) {
          deferred.resolve(snapshot);
          unsub();
        }
      }
    );

    const snapshot = await deferred.promise;
    const idsFromServer = snapshot.results.map((r: PipelineResult) => r.id);

    if (expectedDocs.length !== 0) {
      expect(expectedDocs).to.deep.equal(idsFromServer);
    }

    const cacheDeferred = new Deferred<RealtimePipelineSnapshot>();
    const cacheUnsub = onPipelineSnapshot(
      pipeline,
      { includeMetadataChanges: true, source: 'cache' },
      snapshot => {
        cacheDeferred.resolve(snapshot);
        cacheUnsub();
      }
    );
    const cacheSnapshot = await cacheDeferred.promise;
    const idsFromCache = cacheSnapshot.results.map((r: PipelineResult) => r.id);
    expect(idsFromServer).to.deep.equal(idsFromCache);
  }
}

function getDocsFromPipeline(
  pipeline: RealtimePipeline
): Promise<RealtimePipelineSnapshot> {
  const deferred = new Deferred<RealtimePipelineSnapshot>();
  const unsub = onSnapshot(
    'query-to-pipeline',
    pipeline,
    (snapshot: RealtimePipelineSnapshot) => {
      deferred.resolve(snapshot);
      unsub();
    }
  );

  return deferred.promise;
}

export function getDocs(
  pipelineMode: PipelineMode,
  queryOrPipeline: Query | RealtimePipeline
):
  | Promise<QuerySnapshot<DocumentData, DocumentData>>
  | Promise<RealtimePipelineSnapshot> {
  if (pipelineMode === 'query-to-pipeline') {
    if (queryOrPipeline instanceof Query) {
      const ppl = queryOrPipeline.firestore
        .pipeline()
        .createFrom(queryOrPipeline);
      return getDocsFromPipeline(
        new RealtimePipeline(
          ppl._db!,
          ppl.userDataReader!,
          ppl._userDataWriter!,
          ppl.stages
        )
      );
    } else {
      return getDocsFromPipeline(queryOrPipeline);
    }
  }

  return getDocsProd(queryOrPipeline as Query);
}

export function onSnapshot(
  pipelineMode: PipelineMode,
  queryOrPipeline: Query | RealtimePipeline,
  observer: unknown
): Unsubscribe;
export function onSnapshot(
  pipelineMode: PipelineMode,
  queryOrPipeline: Query | RealtimePipeline,
  options: unknown,
  observer: unknown
): Unsubscribe;
export function onSnapshot(
  pipelineMode: PipelineMode,
  queryOrPipeline: Query | RealtimePipeline,
  optionsOrObserver: unknown,
  observer?: unknown
): Unsubscribe {
  const obs = observer || optionsOrObserver;
  const options = observer
    ? optionsOrObserver
    : {
        includeMetadataChanges: false,
        source: 'default'
      };
  if (pipelineMode === 'query-to-pipeline') {
    if (queryOrPipeline instanceof Query) {
      const ppl = queryOrPipeline.firestore
        .pipeline()
        .createFrom(queryOrPipeline);
      return onPipelineSnapshot(
        new RealtimePipeline(
          ppl._db!,
          ppl.userDataReader!,
          ppl._userDataWriter!,
          ppl.stages
        ),
        options as SnapshotListenOptions,
        obs as {}
      );
    } else {
      return onPipelineSnapshot(
        queryOrPipeline,
        options as SnapshotListenOptions,
        obs as {}
      );
    }
  }

  return onSnapshotProd(
    queryOrPipeline as Query,
    options as SnapshotListenOptions,
    obs as {}
  );
}

export function toDataArray(
  docSet: QuerySnapshot | RealtimePipelineSnapshot
): DocumentData[] {
  if (docSet instanceof QuerySnapshot) {
    return docSet.docs.map(d => d.data());
  } else {
    return docSet.results.map(d => d.data()!);
  }
}

export function toChangesArray(
  docSet: QuerySnapshot | RealtimePipelineSnapshot,
  options?: SnapshotListenOptions
): DocumentData[] {
  if (docSet instanceof QuerySnapshot) {
    return docSet.docChanges(options).map(d => d.doc.data());
  }
  return docSet.resultChanges(options).map(d => d.result.data()!);
}

export class PipelineEventsAccumulator<T = RealtimePipelineSnapshot> {
  private events: T[] = [];
  private waitingFor: number = 0;
  private deferred: Deferred<T[]> | null = null;
  private rejectAdditionalEvents = false;

  storeEvent: (evt: T) => void = (evt: T) => {
    if (this.rejectAdditionalEvents) {
      throw new Error(
        'Additional event detected after assertNoAdditionalEvents called' +
          JSON.stringify(evt)
      );
    }
    this.events.push(evt);
    this.checkFulfilled();
  };

  awaitEvents(length: number): Promise<T[]> {
    expect(this.deferred).to.equal(null, 'Already waiting for events.');
    this.waitingFor = length;
    this.deferred = new Deferred<T[]>();
    const promise = this.deferred.promise;
    this.checkFulfilled();
    return promise;
  }

  awaitEvent(): Promise<T> {
    return this.awaitEvents(1).then(events => events[0]);
  }

  /** Waits for a latency compensated local snapshot. */
  async awaitLocalEvent(): Promise<T> {
    const snapshot = await this.awaitEvent();
    if (
      (snapshot as { metadata?: { hasPendingWrites?: boolean } }).metadata
        ?.hasPendingWrites
    ) {
      return snapshot;
    } else {
      return this.awaitLocalEvent();
    }
  }

  /** Waits for multiple latency compensated local snapshot. */
  async awaitLocalEvents(count: number): Promise<T[]> {
    const results = [] as T[];
    for (let i = 0; i < count; i++) {
      results.push(await this.awaitLocalEvent());
    }
    return results;
  }

  /** Waits for a snapshot that has no pending writes */
  async awaitRemoteEvent(): Promise<T> {
    const snapshot = await this.awaitEvent();
    if (
      !(snapshot as { metadata?: { hasPendingWrites?: boolean } }).metadata
        ?.hasPendingWrites
    ) {
      return snapshot;
    } else {
      return this.awaitRemoteEvent();
    }
  }

  assertNoAdditionalEvents(): Promise<void> {
    this.rejectAdditionalEvents = true;
    return new Promise((resolve: (val: void) => void, reject) => {
      setTimeout(() => {
        if (this.events.length > 0) {
          reject(
            'Received ' +
              this.events.length +
              ' events: ' +
              JSON.stringify(this.events)
          );
        } else {
          resolve(undefined);
        }
      }, 0);
    });
  }

  allowAdditionalEvents(): void {
    this.rejectAdditionalEvents = false;
  }

  private checkFulfilled(): void {
    if (this.deferred !== null && this.events.length >= this.waitingFor) {
      const events = this.events.splice(0, this.waitingFor);
      this.deferred.resolve(events);
      this.deferred = null;
    }
  }
}
