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

import { isIndexedDBAvailable } from '@firebase/util';
import { expect } from 'chai';

import { RealtimePipelineSnapshot } from '../../../src/api/snapshot';
import { PipelineResult } from '../../../src/lite-api/pipeline-result'; // Added import
import { Deferred } from '../../util/promise'; // Added import
import {
  _AutoId,
  clearIndexedDbPersistence,
  collection,
  CollectionReference,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  getDocs as getDocsProd,
  getDocsFromCache,
  getDocsFromServer,
  memoryEagerGarbageCollector,
  MemoryLocalCache,
  memoryLocalCache,
  memoryLruGarbageCollector,
  newTestApp,
  newTestFirestore,
  onSnapshot as onSnapshotProd,
  PersistentLocalCache,
  persistentLocalCache,
  PrivateSettings,
  Query,
  QuerySnapshot,
  setDoc,
  SnapshotListenOptions,
  terminate,
  Unsubscribe,
  WriteBatch,
  writeBatch
} from './firebase_export';
import {
  ALT_PROJECT_ID,
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS,
  TARGET_DB_ID,
  USE_EMULATOR
} from './settings';
import { RealtimePipeline } from '../../../src/api/realtime_pipeline';
import { onPipelineSnapshot } from '../../../src/api/reference_impl';

/* eslint-disable no-restricted-globals */

export interface PersistenceMode {
  readonly name: string;
  readonly storage: 'memory' | 'indexeddb';
  readonly gc: 'eager' | 'lru';

  /**
   * Creates and returns a new `PersistenceMode` object that is the nearest
   * equivalent to this persistence mode but uses eager garbage collection.
   */
  toEagerGc(): PersistenceMode;

  /**
   * Creates and returns a new `PersistenceMode` object that is the nearest
   * equivalent to this persistence mode but uses LRU garbage collection.
   */
  toLruGc(): PersistenceMode;

  /**
   * Creates and returns a new "local cache" object corresponding to this
   * persistence type.
   */
  asLocalCacheFirestoreSettings(): MemoryLocalCache | PersistentLocalCache;
}

export class MemoryEagerPersistenceMode implements PersistenceMode {
  readonly name = 'memory';
  readonly storage = 'memory';
  readonly gc = 'eager';

  toEagerGc(): MemoryEagerPersistenceMode {
    return new MemoryEagerPersistenceMode();
  }

  toLruGc(): MemoryLruPersistenceMode {
    return new MemoryLruPersistenceMode();
  }

  asLocalCacheFirestoreSettings(): MemoryLocalCache {
    return memoryLocalCache({
      garbageCollector: memoryEagerGarbageCollector()
    });
  }
}

export class MemoryLruPersistenceMode implements PersistenceMode {
  readonly name = 'memory_lru_gc';
  readonly storage = 'memory';
  readonly gc = 'lru';

  toEagerGc(): MemoryEagerPersistenceMode {
    return new MemoryEagerPersistenceMode();
  }

  toLruGc(): MemoryLruPersistenceMode {
    return new MemoryLruPersistenceMode();
  }

  asLocalCacheFirestoreSettings(): MemoryLocalCache {
    return memoryLocalCache({ garbageCollector: memoryLruGarbageCollector() });
  }
}

export class IndexedDbPersistenceMode implements PersistenceMode {
  readonly name = 'indexeddb';
  readonly storage = 'indexeddb';
  readonly gc = 'lru';

  toEagerGc(): MemoryEagerPersistenceMode {
    return new MemoryEagerPersistenceMode();
  }

  toLruGc(): IndexedDbPersistenceMode {
    return new IndexedDbPersistenceMode();
  }

  asLocalCacheFirestoreSettings(): PersistentLocalCache {
    if (this.gc !== 'lru') {
      throw new Error(
        `PersistentLocalCache does not support the given ` +
          `garbage collector: ${this.gc}`
      );
    }
    return persistentLocalCache();
  }
}

// An alternative to a `PersistenceMode` object that indicates that no
// persistence mode should be specified, and instead the implicit default
// should be used.
export const PERSISTENCE_MODE_UNSPECIFIED = Symbol(
  'PERSISTENCE_MODE_UNSPECIFIED'
);

function isIeOrEdge(): boolean {
  if (!window.navigator) {
    return false;
  }

  const ua = window.navigator.userAgent;
  return (
    ua.indexOf('MSIE ') > 0 ||
    ua.indexOf('Trident/') > 0 ||
    ua.indexOf('Edge/') > 0
  );
}

export function isPersistenceAvailable(): boolean {
  return (
    typeof window === 'object' &&
    isIndexedDBAvailable() &&
    !isIeOrEdge() &&
    (typeof process === 'undefined' ||
      process.env?.INCLUDE_FIRESTORE_PERSISTENCE !== 'false')
  );
}

export type PipelineMode = 'no-pipeline-conversion' | 'query-to-pipeline';

/**
 * A wrapper around Mocha's describe method that allows for it to be run with
 * persistence both disabled and enabled (if the browser is supported).
 */
function apiDescribeInternal(
  describeFn: Mocha.PendingSuiteFunction,
  message: string,
  testSuite: (persistence: PersistenceMode) => void
): void {
  const persistenceModes: PersistenceMode[] = [new MemoryLruPersistenceMode()];
  if (isPersistenceAvailable()) {
    persistenceModes.push(new IndexedDbPersistenceMode());
  }

  for (const persistenceMode of persistenceModes) {
    describeFn(`(Persistence=${persistenceMode.name}) ${message}`, () =>
      // Freeze the properties of the `PersistenceMode` object specified to the
      // test suite so that it cannot (accidentally or intentionally) change
      // its properties, and affect all subsequent test suites.
      testSuite(Object.freeze(persistenceMode))
    );
  }
}

function apiPipelineDescribeInternal(
  describeFn: Mocha.PendingSuiteFunction,
  message: string,
  testSuite: (persistence: PersistenceMode, pipelineMode: PipelineMode) => void
): void {
  const persistenceModes: PersistenceMode[] = [new MemoryLruPersistenceMode()];
  if (isPersistenceAvailable()) {
    persistenceModes.push(new IndexedDbPersistenceMode());
  }

  const pipelineModes: PipelineMode[] = ['query-to-pipeline'];

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

type ApiSuiteFunction = (
  message: string,
  testSuite: (persistence: PersistenceMode) => void
) => void;
interface ApiDescribe {
  (message: string, testSuite: (persistence: PersistenceMode) => void): void;
  skip: ApiSuiteFunction;
  only: ApiSuiteFunction;
}

export const apiDescribe = apiDescribeInternal.bind(
  null,
  describe
) as ApiDescribe;
// eslint-disable-next-line no-restricted-properties
apiDescribe.skip = apiDescribeInternal.bind(null, describe.skip);
// eslint-disable-next-line no-restricted-properties
apiDescribe.only = apiDescribeInternal.bind(null, describe.only);

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
// eslint-disable-next-line no-restricted-properties
apiPipelineDescribe.skip = apiPipelineDescribeInternal.bind(
  null,
  describe.skip
);
// eslint-disable-next-line no-restricted-properties
apiPipelineDescribe.only = apiPipelineDescribeInternal.bind(
  null,
  describe.only
);

/** Converts the documents in a QuerySnapshot to an array with the data of each document. */
export function toDataArray(
  docSet: QuerySnapshot | RealtimePipelineSnapshot
): DocumentData[] {
  if (docSet instanceof QuerySnapshot) {
    return docSet.docs.map(d => d.data());
  } else {
    return docSet.results.map(d => d.data()!);
  }
}

/** Converts the changes in a QuerySnapshot to an array with the data of each document. */
export function toChangesArray(
  docSet: QuerySnapshot | RealtimePipelineSnapshot,
  options?: SnapshotListenOptions
): DocumentData[] {
  if (docSet instanceof QuerySnapshot) {
    return docSet.docChanges(options).map(d => d.doc.data());
  }
  return docSet.resultChanges(options).map(d => d.result.data()!);
}

export function toDataMap(docSet: QuerySnapshot): {
  [field: string]: DocumentData;
} {
  const docsData: { [field: string]: DocumentData } = {};
  docSet.forEach(doc => {
    docsData[doc.id] = doc.data();
  });
  return docsData;
}

/** Converts a DocumentSet to an array with the id of each document */
export function toIds(docSet: QuerySnapshot): string[] {
  return docSet.docs.map(d => d.id);
}

export function withTestDb(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDbs(persistence, 1, ([db]) => {
    return fn(db);
  });
}

/** Runs provided fn with a db for an alternate project id. */
export function withAlternateTestDb(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    ALT_PROJECT_ID,
    DEFAULT_SETTINGS,
    1,
    ([db]) => {
      return fn(db);
    }
  );
}

export function withTestDbs(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  numDbs: number,
  fn: (db: Firestore[]) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    DEFAULT_SETTINGS,
    numDbs,
    fn
  );
}
export async function withTestDbsSettings<T>(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  projectId: string,
  settings: PrivateSettings,
  numDbs: number,
  fn: (db: Firestore[]) => Promise<T>
): Promise<T> {
  if (numDbs === 0) {
    throw new Error("Can't test with no databases");
  }

  const dbs: Firestore[] = [];

  for (let i = 0; i < numDbs; i++) {
    const newSettings = { ...settings };
    if (persistence !== PERSISTENCE_MODE_UNSPECIFIED) {
      newSettings.localCache = persistence.asLocalCacheFirestoreSettings();
    }
    const db = newTestFirestore(
      newTestApp(projectId),
      newSettings,
      TARGET_DB_ID
    );
    dbs.push(db);
  }

  try {
    return await fn(dbs);
  } finally {
    for (const db of dbs) {
      await terminate(db);
      if (
        persistence !== PERSISTENCE_MODE_UNSPECIFIED &&
        persistence.storage === 'indexeddb'
      ) {
        await clearIndexedDbPersistence(db);
      }
    }
  }
}

export async function withNamedTestDbsOrSkipUnlessUsingEmulator(
  persistence: PersistenceMode,
  dbNames: string[],
  fn: (db: Firestore[]) => Promise<void>
): Promise<void> {
  // Tests with named DBs can only run on emulator for now. This is because the
  // emulator does not require DB to be created before use.
  // TODO: Design ability to run named DB tests on backend. Maybe create DBs
  // TODO: beforehand, or create DBs as part of test setup.
  if (!USE_EMULATOR) {
    return Promise.resolve();
  }
  const app = newTestApp(DEFAULT_PROJECT_ID);
  const dbs: Firestore[] = [];
  for (const dbName of dbNames) {
    const newSettings = {
      ...DEFAULT_SETTINGS,
      localCache: persistence.asLocalCacheFirestoreSettings()
    };
    const db = newTestFirestore(app, newSettings, dbName);
    dbs.push(db);
  }

  try {
    await fn(dbs);
  } finally {
    for (const db of dbs) {
      await terminate(db);
      if (persistence.storage === 'indexeddb') {
        await clearIndexedDbPersistence(db);
      }
    }
  }
}

export function withTestDoc(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  fn: (doc: DocumentReference, db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDb(persistence, db => {
    return fn(doc(collection(db, 'test-collection')), db);
  });
}

export function withTestDocAndSettings(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  settings: PrivateSettings,
  fn: (doc: DocumentReference) => Promise<void>
): Promise<void> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    settings,
    1,
    ([db]) => {
      return fn(doc(collection(db, 'test-collection')));
    }
  );
}

// TODO(rsgowman): Modify withTestDoc to take in (an optional) initialData and
// fix existing usages of it. Then delete this function. This makes withTestDoc
// more analogous to withTestCollection and eliminates the pattern of
// `withTestDoc(..., docRef => { setDoc(docRef, initialData) ...});` that
// otherwise is quite common.
export function withTestDocAndInitialData(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  initialData: DocumentData | null,
  fn: (doc: DocumentReference, db: Firestore) => Promise<void>
): Promise<void> {
  return withTestDb(persistence, db => {
    const docRef: DocumentReference = doc(collection(db, 'test-collection'));
    if (initialData) {
      return setDoc(docRef, initialData).then(() => fn(docRef, db));
    } else {
      return fn(docRef, db);
    }
  });
}

export class RetryError extends Error {
  readonly name = 'FirestoreIntegrationTestRetryError';
}

export async function withRetry<T>(
  fn: (attemptNumber: number) => Promise<T>
): Promise<T> {
  let attemptNumber = 0;
  while (true) {
    attemptNumber++;
    try {
      return await fn(attemptNumber);
    } catch (error) {
      if (!(error instanceof RetryError)) {
        throw error;
      }
    }
  }
}

export function withTestCollection<T>(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  docs: { [key: string]: DocumentData },
  fn: (collection: CollectionReference, db: Firestore) => Promise<T>
): Promise<T> {
  return withTestCollectionSettings(persistence, DEFAULT_SETTINGS, docs, fn);
}

export function withEmptyTestCollection(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  fn: (collection: CollectionReference, db: Firestore) => Promise<void>
): Promise<void> {
  return withTestCollection(persistence, {}, fn);
}

// TODO(mikelehen): Once we wipe the database between tests, we can probably
// return the same collection every time.
export function withTestCollectionSettings<T>(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  settings: PrivateSettings,
  docs: { [key: string]: DocumentData },
  fn: (collection: CollectionReference, db: Firestore) => Promise<T>
): Promise<T> {
  const collectionId = _AutoId.newId();
  return batchCommitDocsToCollection(
    persistence,
    settings,
    docs,
    collectionId,
    fn
  );
}

export function batchCommitDocsToCollection<T>(
  persistence: PersistenceMode | typeof PERSISTENCE_MODE_UNSPECIFIED,
  settings: PrivateSettings,
  docs: { [key: string]: DocumentData },
  collectionId: string,
  fn: (collection: CollectionReference, db: Firestore) => Promise<T>
): Promise<T> {
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    settings,
    2,
    ([testDb, setupDb]) => {
      const testCollection = collection(testDb, collectionId);
      const setupCollection = collection(setupDb, collectionId);

      const writeBatchCommits: Array<Promise<void>> = [];
      let writeBatch_: WriteBatch | null = null;
      let writeBatchSize = 0;

      for (const key of Object.keys(docs)) {
        if (writeBatch_ === null) {
          writeBatch_ = writeBatch(setupDb);
        }

        writeBatch_.set(doc(setupCollection, key), docs[key]);
        writeBatchSize++;

        // Write batches are capped at 500 writes. Use 400 just to be safe.
        if (writeBatchSize === 400) {
          writeBatchCommits.push(writeBatch_.commit());
          writeBatch_ = null;
          writeBatchSize = 0;
        }
      }

      if (writeBatch_ !== null) {
        writeBatchCommits.push(writeBatch_.commit());
      }

      return Promise.all(writeBatchCommits).then(() =>
        fn(testCollection, testDb)
      );
    }
  );
}

/**
 * Creates a `docs` argument suitable for specifying to `withTestCollection()`
 * that defines subsets of documents with different document data.
 *
 * This can be useful for pre-populating a collection with some documents that
 * match a query and others that do _not_ match that query.
 *
 * Each key of the given `partitions` object will be considered a partition
 * "name". The returned object will specify `documentCount` documents with the
 * `documentData` whose document IDs are prefixed with the partition "name".
 */
export function partitionedTestDocs(partitions: {
  [partitionName: string]: {
    documentData: DocumentData;
    documentCount: number;
  };
}): { [key: string]: DocumentData } {
  const testDocs: { [key: string]: DocumentData } = {};

  for (const partitionName in partitions) {
    // Make lint happy (see https://eslint.org/docs/latest/rules/guard-for-in).
    if (!Object.prototype.hasOwnProperty.call(partitions, partitionName)) {
      continue;
    }
    const partition = partitions[partitionName];
    for (let i = 0; i < partition.documentCount; i++) {
      const documentId = `${partitionName}_${`${i}`.padStart(4, '0')}`;
      testDocs[documentId] = partition.documentData;
    }
  }

  return testDocs;
}

/**
 * Checks that running the query while online (against the backend/emulator) results in the same
 * documents as running the query while offline. If `expectedDocs` is provided, it also checks
 * that both online and offline query result is equal to the expected documents.
 *
 * @param query The query to check
 * @param expectedDocs Ordered list of document keys that are expected to match the query
 */
export async function checkOnlineAndOfflineResultsMatch(
  query: Query,
  ...expectedDocs: string[]
): Promise<void> {
  // NOTE: We need to first do docsFromServer before we do docsFromCache. This is because
  // the test doc setup is done in a different test app, with different persistence key,
  // the current app instance cannot see the local test data. docsFromServer will first
  // populate the local cache. Same goes for checkOnlineAndOfflineResultsMatchWithPipelineMode.
  const docsFromServer = await getDocsFromServer(query);

  if (expectedDocs.length !== 0) {
    expect(expectedDocs).to.deep.equal(toIds(docsFromServer));
  }

  const docsFromCache = await getDocsFromCache(query);
  expect(toIds(docsFromServer)).to.deep.equal(toIds(docsFromCache));
}

export async function checkOnlineAndOfflineResultsMatchWithPipelineMode(
  pipelineMode: PipelineMode,
  query: Query,
  ...expectedDocs: string[]
): Promise<void> {
  if (pipelineMode === 'no-pipeline-conversion') {
    await checkOnlineAndOfflineResultsMatch(query, ...expectedDocs);
  } else {
    // pipelineMode === 'query-to-pipeline'
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

export function itIf(
  condition: boolean | 'only'
): Mocha.TestFunction | Mocha.PendingTestFunction {
  // eslint-disable-next-line no-restricted-properties
  return condition === 'only' ? it.only : condition ? it : it.skip;
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
) {
  if (pipelineMode === 'query-to-pipeline') {
    if (queryOrPipeline instanceof Query) {
      const ppl = queryOrPipeline.firestore
        .pipeline()
        .createFrom(queryOrPipeline);
      return getDocsFromPipeline(
        new RealtimePipeline(
          ppl._db,
          ppl.userDataReader,
          ppl._userDataWriter,
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
          ppl._db,
          ppl.userDataReader,
          ppl._userDataWriter,
          ppl.stages
        ),
        options as any,
        obs as any
      );
    } else {
      return onPipelineSnapshot(queryOrPipeline, options as any, obs as any);
    }
  }

  return onSnapshotProd(queryOrPipeline as Query, options as any, obs as any);
}
