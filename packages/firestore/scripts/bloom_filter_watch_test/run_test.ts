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

import {createWatchStream, TargetSnapshot, WatchStream} from './watch_stream';
import {DocumentUtil} from './document_util';
import {
  assertDeepEqual,
  descriptionFromSortedStrings,
  documentIdFromDocumentPath,
  documentPathFromDocumentRef
} from './util';

import { AutoId } from '../../src/util/misc';
import { BloomFilter } from '../../src/remote/bloom_filter';
import {DocumentReference} from '../../src/api/reference';
import {Firestore} from '../../src/api/database';

const DOCUMENT_DATA_KEY = "BloomFilterWatchTest_GroupId";

class InvalidRunTestOptionsError extends Error {
  readonly name = "InvalidRunTestOptionsError";
}

export async function runTest(db: Firestore, projectId: string, host: string, ssl: boolean, iterationCount_: number, documentCreateCount_: number | null, documentDeleteCount_: number | null, collectionId_: string | null, log: (...args: Array<any>) => any): Promise<void> {
  log("Bloom Filter Watch Test Started");

  const collectionId = collectionId_ ?? `bloom_filter_watch_test_${AutoId.newId()}`;
  const documentCreateCount = documentCreateCount_ ?? 10;
  const documentDeleteCount = documentDeleteCount_ ?? Math.ceil(documentCreateCount / 2);
  const iterationCount = iterationCount_ ?? 1;

  if (documentDeleteCount > documentCreateCount) {
    throw new InvalidRunTestOptionsError(
      `documentDeleteCount (${documentDeleteCount}) must be ` +
      `less than or equal to documentCreateCount (${documentCreateCount})`);
  }
  if (iterationCount < 0) {
    throw new InvalidRunTestOptionsError(`invalid iteration count: ${iterationCount}`);
  }

  log(`Creating WatchStream with projectId=${projectId} and host=${host}`);
  const watchStream = createWatchStream(projectId, host, ssl);
  await watchStream.open();
  try {
    const testRunner = new BloomFilterWatchTest(db, watchStream, projectId, host, ssl, documentCreateCount, documentDeleteCount, collectionId, log);
    await testRunner.run();
  } finally {
    log("Closing watch stream");
    await watchStream.close();
  }

  log("Bloom Filter Watch Test Completed Successfully");
}

class BloomFilterWatchTest {

  private readonly documentUtil: DocumentUtil;
  private readonly uniqueId: string;

  constructor(
    readonly db: Firestore,
    readonly watchStream: WatchStream,
    readonly projectId: string,
    readonly host: string,
    readonly ssl: boolean,
    readonly documentCreateCount: number,
    readonly documentDeleteCount: number,
    readonly collectionId: string,
    readonly log: (...args: Array<any>) => any) {
      this.documentUtil = new DocumentUtil(db, collectionId);
      this.uniqueId = AutoId.newId();
  }

  async run(): Promise<void> {
    const createdDocumentRefs = await this.createDocuments();

    const snapshot = await this.startTarget();
    assertDocumentsInSnapshot(snapshot, createdDocumentRefs);

    const documentRefsToDelete = createdDocumentRefs.slice(createdDocumentRefs.length - this.documentDeleteCount);
    await this.deleteDocuments(documentRefsToDelete);

    await this.pause(10);

    const bloomFilter = await this.resumeWatchStream(snapshot);

    if (bloomFilter !== null) {
      this.getBloomFilterCounts(bloomFilter, createdDocumentRefs, documentRefsToDelete);
    }
  }

  private getBloomFilterCounts(bloomFilter: BloomFilter, createdDocumentRefs: Iterable<DocumentReference>, deletedDocumentRefs: Iterable<DocumentReference>): void {
    const toDocumentPath = (documentRef: DocumentReference) => documentPathFromDocumentRef(documentRef, this.projectId);
    const createdDocumentPaths = new Set(Array.from(createdDocumentRefs).map(toDocumentPath));
    const deletedDocumentPaths = new Set(Array.from(deletedDocumentRefs).map(toDocumentPath));

    const existingDocumentPaths = new Set(createdDocumentPaths);
    for (const deletedDocumentPath of deletedDocumentPaths.values()) {
      existingDocumentPaths.delete(deletedDocumentPath);
    }

    let existingDocumentPathsContainedCount = 0;
    let existingDocumentPathsNotContainedCount = 0;
    for (const existingDocumentPath of existingDocumentPaths.values()) {
      if (bloomFilter.mightContain(existingDocumentPath)) {
        existingDocumentPathsContainedCount++;
      } else {
        existingDocumentPathsNotContainedCount++;
      }
    }

    let deletedDocumentPathsContainedCount = 0;
    let deletedDocumentPathsNotContainedCount = 0;
    for (const deletedDocumentPath of deletedDocumentPaths.values()) {
      if (bloomFilter.mightContain(deletedDocumentPath)) {
        deletedDocumentPathsContainedCount++;
      } else {
        deletedDocumentPathsNotContainedCount++;
      }
    }

    this.log(`existingDocumentPathsContainedCount: ${existingDocumentPathsContainedCount}`);
    this.log(`existingDocumentPathsNotContainedCount: ${existingDocumentPathsNotContainedCount}`);
    this.log(`deletedDocumentPathsContainedCount: ${deletedDocumentPathsContainedCount}`);
    this.log(`deletedDocumentPathsNotContainedCount: ${deletedDocumentPathsNotContainedCount}`);
  }

  private async createDocuments(): Promise<Array<DocumentReference>> {
    this.log(`Creating ${this.documentCreateCount} documents in collection ${this.collectionId}`);
    const createdDocumentRefs = await this.documentUtil.createDocuments(this.documentCreateCount, {[DOCUMENT_DATA_KEY]: this.uniqueId});
    const createdDocumentIds = createdDocumentRefs.map(documentRef => documentRef.id);
    this.log(`Created ${this.documentCreateCount} documents ` +
      `in collection ${this.collectionId}: ` +
      descriptionFromSortedStrings(createdDocumentIds));
    return createdDocumentRefs;
  }

  private async deleteDocuments(documentRefsToDelete: Array<DocumentReference>): Promise<void> {
    const documentIdsToDelete = documentRefsToDelete.map(documentRef => documentRef.id);
    this.log(`Deleting ${documentRefsToDelete.length} documents: ` +
      descriptionFromSortedStrings(documentIdsToDelete));
    await this.documentUtil.deleteDocuments(documentRefsToDelete);
    this.log(`Deleted ${documentRefsToDelete.length} documents`);
  }

  private pause(numSecondsToPause: number): Promise<void> {
    this.log(`Pausing for ${numSecondsToPause} seconds.`);
    return new Promise(resolve => setTimeout(resolve, numSecondsToPause * 1000));
  }

  private async startTarget(): Promise<TargetSnapshot> {
    this.log("Adding target to watch stream");
    const target = await this.watchStream.addTarget({
      projectId: this.projectId,
      collectionId: this.collectionId,
      keyFilter: DOCUMENT_DATA_KEY,
      valueFilter: this.uniqueId,
    });

    this.log("Waiting for a snapshot from watch");
    const snapshot = await this.watchStream.getInitialSnapshot(target);
    const documentNames = Array.from(snapshot.documentPaths).sort();
    const documentIds = documentNames.map(documentIdFromDocumentPath);
    this.log(`Got snapshot with ${documentIds.length} documents: ${descriptionFromSortedStrings(documentIds)}`);

    this.log("Removing target from watch stream");
    await this.watchStream.removeTarget(target);

    return snapshot;
  }

  private async resumeWatchStream(snapshot: TargetSnapshot, options?: { expectedCount?: number }): Promise<BloomFilter | null> {
    const expectedCount = options?.expectedCount ?? snapshot.documentPaths.size;
    this.log(`Resuming target in watch stream with expectedCount=${expectedCount}`);
    const target = await this.watchStream.addTarget({
      projectId: this.projectId,
      collectionId: this.collectionId,
      keyFilter: DOCUMENT_DATA_KEY,
      valueFilter: this.uniqueId,
      resume: {
        from: snapshot,
        expectedCount
      }
    });

    this.log("Waiting for an existence filter from watch");
    const existenceFilterPromise = this.watchStream.getExistenceFilter(target);
    const snapshotPromise = this.watchStream.getInitialSnapshot(target);
    const result = (await Promise.race([existenceFilterPromise, snapshotPromise])) as unknown;

    let bloomFilter: BloomFilter | null;
    if (result instanceof TargetSnapshot) {
      this.log("WARNING: Didn't get an existence filter");
      bloomFilter = null;
    } else if (result instanceof BloomFilter) {
      bloomFilter = result;
      if (bloomFilter === null) {
        this.log("Got an existence filter without a bloom filter");
      } else {
        this.log(`Got an existence bloom filter with size ` +
          `${bloomFilter.size} bits and ` +
          `${bloomFilter.hashCount} hash functions`);
      }
    } else {
      throw new Error(`internal error: unknown result: ${result}`);
    }

    this.log("Waiting for a snapshot from watch");
    const snapshot2 = await snapshotPromise;
    const documentNames2 = Array.from(snapshot2.documentPaths).sort();
    const documentIds2 = documentNames2.map(documentIdFromDocumentPath);
    this.log(`Got snapshot with ${documentIds2.length} documents: ${descriptionFromSortedStrings(documentIds2)}`);

    this.log("Removing target from watch stream");
    await this.watchStream.removeTarget(target);

    return bloomFilter;
  }
}

function assertDocumentsInSnapshot(snapshot: TargetSnapshot, expectedDocuments: Array<DocumentReference>): void {
  const actualDocumentPathsSorted = Array.from(snapshot.documentPaths.values()).map(documentIdFromDocumentPath).sort();
  const expectedDocumentPathsSorted = expectedDocuments.map(documentRef => documentRef.id).sort();
  assertDeepEqual(actualDocumentPathsSorted, expectedDocumentPathsSorted);
}


