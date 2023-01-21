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

import {createWatchStream} from './watch_stream';
import {
  doc,
  DocumentReference,
  Firestore,
  collection,
  writeBatch,
  WriteBatch,
  DocumentData
} from '../../src';
import { AutoId } from '../../src/util/misc';

const DOCUMENT_DATA_KEY = "BloomFilterWatchTest_GroupId";

export type LogFunction = (...args: Array<any>) => any;

export interface RunTestOptions {
  db: Firestore,
  projectId: string,
  host: {
    hostName: string,
    ssl: boolean
  },
  documentCreateCount: number | null,
  documentDeleteCount: number | null,
  collectionId: string | null,
  log: LogFunction;
}

class InvalidRunTestOptionsError extends Error {
  readonly name = "InvalidRunTestOptionsError";
}

export async function runTest(options: RunTestOptions): Promise<void> {
  const db = options.db;
  const projectId = options.projectId;
  const host = options.host.hostName;
  const ssl = options.host.ssl;
  const log = options.log;
  const uniqueId = AutoId.newId();
  const collectionId = options.collectionId ?? `bloom_filter_watch_test_${uniqueId}`;
  const documentCreateCount = options.documentCreateCount ?? 10;
  const documentDeleteCount = options.documentDeleteCount ?? 5;

  if (documentDeleteCount > documentCreateCount) {
    throw new InvalidRunTestOptionsError(
      `documentDeleteCount (${documentDeleteCount}) must be ` +
      `less than or equal to documentCreateCount (${documentCreateCount})`);
  }

  log("host:", host);
  log("projectId:", projectId);

  const createdDocumentRefs = await createDocuments(db, documentCreateCount, collectionId, uniqueId, log);
  const createdDocumentIds = createdDocumentRefs.map(documentRef => documentRef.id).sort();
  const documentRefsToDelete = createdDocumentRefs.slice(createdDocumentRefs.length - documentDeleteCount);
  const documentIdsToDelete = documentRefsToDelete.map(documentRef => documentRef.id);

  const watchStream = createWatchStream(projectId, host, ssl);
  await watchStream.open();
  try {
    log("Adding target to watch stream");
    await watchStream.addTarget({
      targetId: 1,
      projectId: projectId,
      collectionId,
      keyFilter: DOCUMENT_DATA_KEY,
      valueFilter: uniqueId
    });
    log("Added target to watch stream");

    log("Waiting for a snapshot from watch");
    const snapshot1 = await watchStream.getInitialSnapshot(1);
    const documentNames1 = Array.from(snapshot1.documentPaths).sort();
    const documentIds1 = documentNames1.map(documentIdFromDocumentPath);
    log(`Got ${documentIds1.length} documents: ${descriptionFromSortedStrings(documentIds1)}`);
    assertDeepEqual(documentIds1, createdDocumentIds);

    log("Removing target from watch stream");
    await watchStream.removeTarget(1);
    log("Removed target from watch stream");

    log(`Deleting ${documentDeleteCount} documents: ${descriptionFromSortedStrings(documentIdsToDelete)}`);
    await deleteDocuments(db, documentRefsToDelete);
    log(`Deleted ${documentDeleteCount} documents`);

    const resumeDeferSeconds = 10;
    log(`Waiting for ${resumeDeferSeconds} seconds so we get an existence filter upon resuming the query.`);
    await new Promise(resolve => setTimeout(resolve, resumeDeferSeconds * 1000));

    log("Resuming target in watch stream");
    await watchStream.addTarget({
      targetId: 2,
      projectId: projectId,
      collectionId,
      keyFilter: DOCUMENT_DATA_KEY,
      valueFilter: uniqueId,
      resumeFrom: snapshot1
    });
    log("Resumed target in watch stream");

    log("Waiting for a snapshot from watch stream");
    const snapshot2 = await watchStream.getInitialSnapshot(2);
    const documentNames2 = Array.from(snapshot2.documentPaths).sort();
    const documentIds2 = documentNames2.map(documentIdFromDocumentPath);
    log(`Got ${documentIds2.length} documents: ${descriptionFromSortedStrings(documentIds2)}`);
  } finally {
    log("Closing watch stream");
    await watchStream.close();
    log("Watch stream closed");
  }
}

function* generateIds(count: number): IterableIterator<string> {
  for (let i=1; i<=count; i++) {
    yield AutoId.newId();
  }
}

async function createDocuments(db: Firestore, documentCreateCount:number, collectionId: string, uniqueValue: string, log: LogFunction): Promise<Array<DocumentReference>> {
  const collectionRef = collection(db, collectionId);
  const documentRefs = Array.from(generateIds(documentCreateCount)).map(documentId => doc(collectionRef, documentId));
  const descriptionRefsDescription = descriptionFromSortedStrings(documentRefs.map(documentRef => documentRef.id).sort());

  log(`Creating ${documentRefs.length} documents in collection ${collectionRef.id}: ${descriptionRefsDescription}`);
  const writeBatches = createWriteBatchesForCreate(db, documentRefs, { [DOCUMENT_DATA_KEY]: uniqueValue });
  await Promise.all(writeBatches.map(batch => batch.commit()));
  log(`${documentRefs.length} documents created successfully.`);

  return documentRefs;
}

async function deleteDocuments(db: Firestore, documentRefs: Array<DocumentReference>): Promise<void> {
  const writeBatches = createWriteBatchesForDelete(db, documentRefs);
  await Promise.all(writeBatches.map(batch => batch.commit()));
}

function createWriteBatchesForCreate(db: Firestore, documentRefs: Array<DocumentReference>, documentData: DocumentData): Array<WriteBatch> {
  const writeBatches: Array<WriteBatch> = [];
  let writeBatch_ = writeBatch(db);
  let currentWriteBatchDocumentCount = 0;

  for (const documentRef of documentRefs) {
    if (currentWriteBatchDocumentCount === 500) {
      writeBatches.push(writeBatch_);
      writeBatch_ = writeBatch(db);
      currentWriteBatchDocumentCount = 0;
    }
    writeBatch_.set(documentRef, documentData);
    currentWriteBatchDocumentCount++;
  }

  if (currentWriteBatchDocumentCount > 0) {
    writeBatches.push(writeBatch_);
  }

  return writeBatches;
}

function createWriteBatchesForDelete(db: Firestore, documentRefs: Array<DocumentReference>): Array<WriteBatch> {
  const writeBatches: Array<WriteBatch> = [];
  let writeBatch_ = writeBatch(db);
  let currentWriteBatchDocumentCount = 0;

  for (const documentRef of documentRefs) {
    if (currentWriteBatchDocumentCount === 500) {
      writeBatches.push(writeBatch_);
      writeBatch_ = writeBatch(db);
      currentWriteBatchDocumentCount = 0;
    }
    writeBatch_.delete(documentRef);
    currentWriteBatchDocumentCount++;
  }

  if (currentWriteBatchDocumentCount > 0) {
    writeBatches.push(writeBatch_);
  }

  return writeBatches;
}

function documentIdFromDocumentPath(documentPath: string): string {
  const lastSlashIndex = documentPath.lastIndexOf('/');
  return (lastSlashIndex < 0) ? documentPath : documentPath.slice(lastSlashIndex+1);
}

function descriptionFromSortedStrings(sortedStrings: Array<string>): string {
  if (sortedStrings.length === 0) {
    return "";
  }
  if (sortedStrings.length === 1) {
    return sortedStrings[0];
  }
  if (sortedStrings.length === 2) {
    return `${sortedStrings[0]} and ${sortedStrings[1]}`;
  }
  return `${sortedStrings[0]} ... ${sortedStrings[sortedStrings.length-1]}`;
}

class AssertDeepEqualError extends Error {
  name = "AssertDeepEqualError";
}

function assertDeepEqual<T>(actual: Array<T>, expected: Array<T>): void {
  if (actual.length !== expected.length) {
    throw new AssertDeepEqualError(`expected length ${expected.length}, but got ${actual.length}`);
  }
  for (let i=0; i<actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new AssertDeepEqualError(`incorrect element at index ${i}: ${actual[i]} (expected ${expected[i]}`);
    }
  }
}
