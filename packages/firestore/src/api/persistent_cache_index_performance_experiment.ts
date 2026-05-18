/**
 * @license
 * Copyright 2023 Google LLC
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
import { DatabaseId } from '../core/database_info';
import { FieldFilter, Operator } from '../core/filter';
import { QueryImpl, queryToTarget } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { parseUpdateData, UserDataReader } from '../lite-api/user_data_reader';
import { DocumentOverlayCache } from '../local/document_overlay_cache';
import { IndexManager } from '../local/index_manager';
import { IndexedDbIndexManager } from '../local/indexeddb_index_manager';
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import { LocalDocumentsView } from '../local/local_documents_view';
import { LruParams } from '../local/lru_garbage_collector';
import { MutationQueue } from '../local/mutation_queue';
import { Persistence } from '../local/persistence';
import { QueryEngine } from '../local/query_engine';
import { RemoteDocumentCache } from '../local/remote_document_cache';
import { documentMap, newMutationMap } from '../model/collections';
import { MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { IndexOffset, INITIAL_LARGEST_BATCH_ID } from '../model/field_index';
import { FieldMask } from '../model/field_mask';
import {
  FieldTransform,
  Mutation,
  PatchMutation,
  Precondition
} from '../model/mutation';
import { JsonObject, ObjectValue } from '../model/object_value';
import { FieldPath, ResourcePath } from '../model/path';
import { getDocument, getWindow } from '../platform/dom';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { JsonProtoSerializer } from '../remote/serializer';
import { AsyncQueueImpl } from '../util/async_queue_impl';
import { AutoId } from '../util/misc';
import { SortedSet } from '../util/sorted_set';

import { Timestamp } from './timestamp';
import { QueryContext } from '../local/query_context';

export async function runPersistentCacheIndexPerformanceExperiment(
  log: (...args: unknown[]) => unknown,
  logLevel: 'info' | 'debug'
): Promise<number> {
  const testObjects = await createTestObjects();
  const experiment = new AutoIndexingExperiment(log, logLevel, testObjects);
  const heuristic = await experiment.run();
  await testObjects.persistence.shutdown();
  return heuristic;
}

interface TestObjects {
  persistence: Persistence;
  indexManager: IndexManager;
  remoteDocumentCache: RemoteDocumentCache;
  queryEngine: QueryEngine;
  serializer: JsonProtoSerializer;
  mutationQueue: MutationQueue;
  documentOverlayCache: DocumentOverlayCache;
}

class AutoIndexingExperiment {
  private readonly persistence: Persistence;
  private readonly indexManager: IndexManager;
  private readonly remoteDocumentCache: RemoteDocumentCache;
  private readonly queryEngine: QueryEngine;
  private readonly serializer: JsonProtoSerializer;
  private readonly mutationQueue: MutationQueue;
  private readonly documentOverlayCache: DocumentOverlayCache;

  constructor(
    private readonly logFunc: (...args: unknown[]) => unknown,
    private readonly logLevel: 'info' | 'debug',
    testObjects: TestObjects
  ) {
    this.logFunc = logFunc;
    this.persistence = testObjects.persistence;
    this.indexManager = testObjects.indexManager;
    this.remoteDocumentCache = testObjects.remoteDocumentCache;
    this.queryEngine = testObjects.queryEngine;
    this.serializer = testObjects.serializer;
    this.mutationQueue = testObjects.mutationQueue;
    this.documentOverlayCache = testObjects.documentOverlayCache;
  }

  async run(): Promise<number> {
    // Every set contains 10 documents
    const numOfSet = 100;
    // could overflow. Currently it is safe when numOfSet set to 1000 and running on macbook M1
    let totalBeforeIndex = 0;
    let totalAfterIndex = 0;
    let totalDocumentCount = 0;
    let totalResultCount = 0;

    // Temperate heuristic, gets when setting numOfSet to 1000.
    const withoutIndex = 1;
    const withIndex = 3;

    for (
      let totalSetCount = 10;
      totalSetCount <= numOfSet;
      totalSetCount *= 10
    ) {
      // portion stands for the percentage of documents matching query
      for (let portion = 0; portion <= 10; portion++) {
        for (let numOfFields = 1; numOfFields <= 31; numOfFields += 10) {
          const basePath =
            `${AutoId.newId()}_totalSetCount${totalSetCount}_` +
            `portion${portion}_numOfFields${numOfFields}`;
          const query = createQuery(basePath, 'match', Operator.EQUAL, true);

          // Creates a full matched index for given query.
          await this.persistence.runTransaction(
            'createTargetIndexes',
            'readwrite',
            txn =>
              this.indexManager.createTargetIndexes(txn, queryToTarget(query))
          );

          await this.createTestingCollection(
            basePath,
            totalSetCount,
            portion,
            numOfFields
          );
          await this.createMutationForCollection(basePath, totalSetCount);

          // runs query using full collection scan.
          let millisecondsBeforeAuto: number;
          let contextWithoutIndexDocumentReadCount: number;
          {
            const contextWithoutIndex = new QueryContext();
            const beforeAutoStart = performance.now();
            const beforeAutoResults = await this.persistence.runTransaction(
              'executeFullCollectionScan',
              'readwrite',
              txn =>
                this.queryEngine.executeFullCollectionScan(
                  txn,
                  query,
                  contextWithoutIndex
                )
            );
            const beforeAutoEnd = performance.now();
            millisecondsBeforeAuto = beforeAutoEnd - beforeAutoStart;
            totalBeforeIndex += millisecondsBeforeAuto;
            totalDocumentCount += contextWithoutIndex.documentReadCount;
            contextWithoutIndexDocumentReadCount =
              contextWithoutIndex.documentReadCount;
            if (portion * totalSetCount != beforeAutoResults.size) {
              throw new Error(
                `${
                  portion * totalSetCount
                }!={beforeAutoResults.size} (portion * totalSetCount != beforeAutoResults.size)`
              );
            }
            this.logDebug(
              `Running query without using the index took ${millisecondsBeforeAuto}ms`
            );
          }

          // runs query using index look up.
          let millisecondsAfterAuto: number;
          let autoResultsSize: number;
          {
            const autoStart = performance.now();
            const autoResults = await this.persistence.runTransaction(
              'performQueryUsingIndex',
              'readwrite',
              txn => this.queryEngine.performQueryUsingIndex(txn, query)
            );
            if (autoResults === null) {
              throw new Error('performQueryUsingIndex() returned null');
            }
            const autoEnd = performance.now();
            millisecondsAfterAuto = autoEnd - autoStart;
            totalAfterIndex += millisecondsAfterAuto;
            if (portion * totalSetCount != autoResults.size) {
              throw new Error(
                `${
                  portion * totalSetCount
                }!={beforeAutoResults.size} (portion * totalSetCount != beforeAutoResults.size)`
              );
            }
            this.logDebug(
              `Running query using the index took ${millisecondsAfterAuto}ms`
            );
            totalResultCount += autoResults.size;
            autoResultsSize = autoResults.size;
          }

          if (millisecondsBeforeAuto > millisecondsAfterAuto) {
            this.log(
              `Auto Indexing saves time when total of documents inside ` +
                `collection is ${totalSetCount * 10}. ` +
                `The matching percentage is ${portion}0%. ` +
                `And each document contains ${numOfFields} fields. ` +
                `Weight result for without auto indexing is ` +
                `${withoutIndex * contextWithoutIndexDocumentReadCount}. ` +
                `And weight result for auto indexing is ` +
                `${withIndex * autoResultsSize}`
            );
          }
        }
      }
    }

    this.log(
      `The time heuristic is ` +
        `${totalBeforeIndex / totalDocumentCount} before auto indexing`
    );
    this.log(
      `The time heuristic is ` +
        `${totalAfterIndex / totalResultCount} after auto indexing`
    );

    return (
      totalAfterIndex /
      totalResultCount /
      (totalBeforeIndex / totalDocumentCount)
    );
  }

  async createTestingCollection(
    basePath: string,
    totalSetCount: number,
    portion: number /*0 - 10*/,
    numOfFields: number /* 1 - 30*/
  ): Promise<void> {
    this.logDebug(
      `Creating test collection: "${basePath}" ` +
        `totalSetCount=${totalSetCount} ` +
        `portion=${portion} ` +
        `numOfFields=${numOfFields}`
    );
    let documentCounter = 0;

    // A set contains 10 documents.
    for (let i = 1; i <= totalSetCount; i++) {
      // Generate a random order list of 0 ... 9, to make sure the matching
      // documents stay in random positions.
      const indexes: number[] = [];
      for (let index = 0; index < 10; index++) {
        indexes.push(index);
      }
      shuffle(indexes);

      // portion% of the set match
      for (let match = 0; match < portion; match++) {
        const currentID = documentCounter + indexes[match];
        await this.createTestingDocument(
          basePath,
          currentID,
          true,
          numOfFields
        );
      }
      for (let unmatch = portion; unmatch < 10; unmatch++) {
        const currentID = documentCounter + indexes[unmatch];
        await this.createTestingDocument(
          basePath,
          currentID,
          false,
          numOfFields
        );
      }
      documentCounter += 10;
    }
  }

  async createMutationForCollection(
    basePath: string,
    totalSetCount: number
  ): Promise<void> {
    const indexes: number[] = [];
    // Randomly selects 10% of documents.
    for (let index = 0; index < totalSetCount * 10; index++) {
      indexes.push(index);
    }
    shuffle(indexes);

    for (let i = 0; i < totalSetCount; i++) {
      await this.addMutation(
        createPatchMutation(
          `${basePath}/${indexes[i]}`,
          { a: 5 },
          /*precondition=*/ null,
          this.serializer
        )
      );
    }
  }

  /** Creates one test document based on requirements. */
  async createTestingDocument(
    basePath: string,
    documentID: number,
    isMatched: boolean,
    numOfFields: number
  ): Promise<void> {
    const fields = new Map<string, unknown>();
    fields.set('match', isMatched);

    // Randomly generate the rest of fields.
    for (let i = 2; i <= numOfFields; i++) {
      // Randomly select a field in values table.
      const valueIndex = Math.floor(Math.random() * values.length);
      fields.set('field' + i, values[valueIndex]);
    }

    const doc = createMutableDocument(basePath + '/' + documentID, 1, fields);
    await this.addDocument(doc);

    await this.persistence.runTransaction(
      'updateIndexEntries',
      'readwrite',
      txn => this.indexManager.updateIndexEntries(txn, documentMap(doc))
    );
    await this.persistence.runTransaction(
      'updateCollectionGroup',
      'readwrite',
      txn =>
        this.indexManager.updateCollectionGroup(
          txn,
          basePath,
          new IndexOffset(doc.readTime, doc.key, INITIAL_LARGEST_BATCH_ID)
        )
    );
  }

  /** Adds the provided documents to the remote document cache.  */
  addDocument(doc: MutableDocument): Promise<void> {
    return this.persistence.runTransaction('addDocument', 'readwrite', txn => {
      const changeBuffer = this.remoteDocumentCache.newChangeBuffer();
      return changeBuffer
        .getEntry(txn, doc.key)
        .next(() => changeBuffer.addEntry(doc))
        .next(() => changeBuffer.apply(txn));
    });
  }

  addMutation(mutation: Mutation): Promise<void> {
    return this.persistence.runTransaction('addMutation', 'readwrite', txn =>
      this.mutationQueue
        .addMutationBatch(
          txn,
          /*localWriteTime=*/ Timestamp.now(),
          /*baseMutations=*/ [],
          /*mutations=*/ [mutation]
        )
        .next(batch => {
          const overlayMap = newMutationMap();
          overlayMap.set(mutation.key, mutation);
          return this.documentOverlayCache.saveOverlays(
            txn,
            batch.batchId,
            overlayMap
          );
        })
    );
  }

  logDebug(...args: unknown[]): void {
    if (this.logLevel === 'debug') {
      this.logFunc(...args);
    }
  }

  log(...args: unknown[]): void {
    this.logFunc(...args);
  }
}

async function createTestObjects(): Promise<TestObjects> {
  const databaseId = new DatabaseId(/*projectId=*/ AutoId.newId());
  const user = new User(/*uid=*/ null);
  const serializer = new JsonProtoSerializer(
    databaseId,
    /*useProto3Json=*/ true
  );
  const persistence = new IndexedDbPersistence(
    /*allowTabSynchronization=*/ false,
    /*persistenceKey=*/ AutoId.newId(),
    /*clientId=*/ AutoId.newId(),
    /*lruParams=*/ LruParams.DISABLED,
    /*queue=*/ new AsyncQueueImpl(),
    /*window=*/ getWindow(),
    /*document=*/ getDocument(),
    /*serializer=*/ serializer,
    /*sequenceNumberSyncer=*/ {
      writeSequenceNumber(_: unknown): void {},
      sequenceNumberHandler: null
    },
    /*forceOwningTab=*/ false
  );

  await persistence.start();

  const indexManager = new IndexedDbIndexManager(user, databaseId);
  const remoteDocumentCache = persistence.getRemoteDocumentCache();
  remoteDocumentCache.setIndexManager(indexManager);
  const mutationQueue = persistence.getMutationQueue(user, indexManager);
  const documentOverlayCache = persistence.getDocumentOverlayCache(user);
  const localDocumentView = new LocalDocumentsView(
    remoteDocumentCache,
    mutationQueue,
    documentOverlayCache,
    indexManager
  );
  const queryEngine = new QueryEngine();
  queryEngine.initialize(localDocumentView, indexManager);

  return {
    persistence,
    indexManager,
    remoteDocumentCache,
    queryEngine,
    serializer,
    mutationQueue,
    documentOverlayCache
  };
}

function createQuery(
  path: string,
  field: string,
  op: Operator,
  value: boolean
): QueryImpl {
  const fieldPath = FieldPath.fromServerFormat(field);
  const filter = FieldFilter.create(fieldPath, op, { booleanValue: value });
  return new QueryImpl(
    /*path=*/ ResourcePath.fromString(path),
    /*collectionGroup=*/ null,
    /*explicitOrderBy=*/ [],
    /*filters=*/ [filter]
  );
}

function createMutableDocument(
  key: string,
  version: number,
  data: Map<string, unknown>
): MutableDocument {
  const documentKey = DocumentKey.fromPath(key);
  const snapshotVersion = SnapshotVersion.fromTimestamp(
    Timestamp.fromMillis(version)
  );
  const documentData = wrapObject(data);
  return MutableDocument.newFoundDocument(
    documentKey,
    snapshotVersion,
    snapshotVersion,
    documentData
  ).setReadTime(snapshotVersion);
}

function wrapObject(value: Map<string, unknown>): ObjectValue {
  const result = ObjectValue.empty();
  value.forEach((fieldValue, fieldName) => {
    const fieldPath = FieldPath.fromServerFormat(fieldName);
    const fieldProtoValue = createProtoValue(fieldValue);
    result.set(fieldPath, fieldProtoValue);
  });
  return result;
}

function createProtoValue(value: unknown): ProtoValue {
  if (value === null) {
    return { nullValue: 'NULL_VALUE' };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: value }
      : { doubleValue: value };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value !== 'object') {
    throw new Error(`unsupported object type: ${typeof value}`);
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(createProtoValue) } };
  }

  const fields: Record<string, ProtoValue> = {};
  for (const [fieldName, fieldValue] of Object.entries(value)) {
    fields[fieldName] = createProtoValue(fieldValue);
  }
  return { mapValue: { fields } };
}

function createPatchMutation(
  keyStr: string,
  json: JsonObject<unknown>,
  precondition: Precondition | null,
  serializer: JsonProtoSerializer
): PatchMutation {
  if (precondition === null) {
    precondition = Precondition.exists(true);
  }
  return patchMutationHelper(
    keyStr,
    json,
    precondition,
    /* updateMask */ null,
    serializer
  );
}

function patchMutationHelper(
  keyStr: string,
  json: JsonObject<unknown>,
  precondition: Precondition,
  updateMask: FieldPath[] | null,
  serializer: JsonProtoSerializer
): PatchMutation {
  const patchKey = DocumentKey.fromPath(keyStr);
  const parsed = parseUpdateData(
    new UserDataReader(serializer.databaseId, false, serializer),
    'patchMutation',
    patchKey,
    json
  );

  // `mergeMutation()` provides an update mask for the merged fields, whereas
  // `patchMutation()` requires the update mask to be parsed from the values.
  const mask = updateMask ? updateMask : parsed.fieldMask.fields;

  // We sort the fieldMaskPaths to make the order deterministic in tests.
  // (Otherwise, when we flatten a Set to a proto repeated field, we'll end up
  // comparing in iterator order and possibly consider {foo,bar} != {bar,foo}.)
  let fieldMaskPaths = new SortedSet<FieldPath>(FieldPath.comparator);
  mask.forEach(value => (fieldMaskPaths = fieldMaskPaths.add(value)));

  // The order of the transforms doesn't matter, but we sort them so tests can
  // assume a particular order.
  const fieldTransforms: FieldTransform[] = [];
  fieldTransforms.push(...parsed.fieldTransforms);
  fieldTransforms.sort((lhs, rhs) =>
    FieldPath.comparator(lhs.field, rhs.field)
  );

  return new PatchMutation(
    patchKey,
    parsed.data,
    new FieldMask(fieldMaskPaths.toArray()),
    precondition,
    fieldTransforms
  );
}

function shuffle<T>(array: T[]): void {
  const shuffled = array
    .map(element => {
      return { element, randomValue: Math.random() };
    })
    .sort((e1, e2) => e1.randomValue - e2.randomValue);
  for (let i = 0; i < array.length; i++) {
    array[i] = shuffled[i].element;
  }
}

const values = Object.freeze([
  'Hello world',
  46239847,
  -1984092375,
  Object.freeze([1, 'foo', 3, 5, 8, 10, 11]),
  Object.freeze([1, 'foo', 9, 5, 8]),
  Number.NaN,
  Object.freeze({ 'nested': 'random' })
]);
