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

import { BloomFilter } from '../../src/remote/bloom_filter';
import {DocumentReference} from '../../src/api/reference';
import {Firestore} from '../../src/api/database';
import {AleaRandom} from "./random";

const DOCUMENT_DATA_KEY = "BloomFilterWatchTest_GroupId";

class InvalidRunTestOptionsError extends Error {
  readonly name = "InvalidRunTestOptionsError";
}

export async function runTest(db: Firestore, projectId: string, host: string, ssl: boolean, iterationCount_: number | Array<string> | null, documentCreateCount_: number | null, documentDeleteCount_: number | null, collectionId_: string | null, randomSeed_: string | null, log: (...args: Array<any>) => any): Promise<void> {
  log("Bloom Filter Watch Test Started");

  const randomSeed = randomSeed_ ?? new AleaRandom(Math.random()).randomId();
  log(`Random seed: ${randomSeed}`);
  const rng = new AleaRandom(randomSeed);

  const collectionId = collectionId_ ?? `bloom_filter_watch_test_${rng.randomId()}`;
  const documentCreateCount = documentCreateCount_ ?? 10;
  const documentDeleteCount = documentDeleteCount_ ?? Math.ceil(documentCreateCount / 2);

  const iterationCount =
    (typeof iterationCount_ === 'number')
    ? iterationCount_
    : Array.isArray(iterationCount_)
    ? iterationCount_.length
    : 1;
  const iterationRandomSeeds = Array.isArray(iterationCount_) ? iterationCount_ : null;

  if (documentDeleteCount > documentCreateCount) {
    throw new InvalidRunTestOptionsError(
      `documentDeleteCount (${documentDeleteCount}) must be ` +
      `less than or equal to documentCreateCount (${documentCreateCount})`);
  }
  if (iterationCount < 0) {
    throw new InvalidRunTestOptionsError(`invalid iteration count: ${iterationCount}`);
  }

  const testPromises: Array<Promise<void>> = [];
  const testResults = new Map<RunTestIterationResult, number>();

  log(`Creating WatchStream with projectId=${projectId} and host=${host}`);
  const watchStream = createWatchStream(projectId, host, ssl);
  await watchStream.open();
  try {
    for (let i=1; i<=iterationCount; i++) {
      const iterationRandomSeed = iterationRandomSeeds?.[i-1] ?? rng.randomId();
      const iterationRng = new AleaRandom(iterationRandomSeed);
      const iterationLog = (...args: Array<any>) => log(`iteration ${i}: ${args[0]}`);
      iterationLog(`random seed: ${iterationRandomSeed}`);
      const testRunner = new BloomFilterWatchTest(db, watchStream, projectId, host, ssl, documentCreateCount, documentDeleteCount, collectionId, iterationRng, iterationLog);
      const runTestPromise = runTestIteration(i, testRunner).then(result => {
        const currentCount = testResults.get(result) ?? 0;
        testResults.set(result, currentCount + 1);
      });
      testPromises.push(runTestPromise);
    }

    await Promise.all(testPromises);
  } finally {
    log("Closing watch stream");
    await watchStream.close();
  }

  log('--------------------------------------------------------------');
  log(`All test iterations completed (iterations: ${iterationCount})`);
  log(`FULL_REQUERY_REQUIRED: ${testResults.get("FULL_REQUERY_REQUIRED") ?? 0}`);
  log(`FULL_REQUERY_AVOIDED: ${testResults.get("FULL_REQUERY_AVOIDED") ?? 0}`);
  log(`MISSING_BLOOM_FILTER: ${testResults.get("MISSING_BLOOM_FILTER") ?? 0}`);

  log("Bloom Filter Watch Test Completed Successfully");
}

type RunTestIterationResult =
  | "MISSING_BLOOM_FILTER"
  | "FULL_REQUERY_REQUIRED"
  | "FULL_REQUERY_AVOIDED";

async function runTestIteration(i: number, testRunner: BloomFilterWatchTest): Promise<RunTestIterationResult> {
  const bloomFilterCounts = await testRunner.run();

  if (bloomFilterCounts === null) {
    testRunner.log("MISSING_BLOOM_FILTER: no bloom filter was provided in the existence filter");
    return "MISSING_BLOOM_FILTER";
  }

  if (bloomFilterCounts.deletedDocsContained > 0) {
    testRunner.log(`FULL_REQUERY_REQUIRED: ${bloomFilterCounts.deletedDocsContained} false positives`);
    return "FULL_REQUERY_REQUIRED";
  }

  testRunner.log(`FULL_REQUERY_AVOIDED: a full requery avoided`);
  return "FULL_REQUERY_AVOIDED";
}

interface BloomFilterCounts {
  existingDocsContained: number;
  existingDocsNotContained: number;
  deletedDocsContained: number;
  deletedDocsNotContained: number;
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
    readonly rng: AleaRandom,
    readonly log: (...args: Array<any>) => any) {
      this.documentUtil = new DocumentUtil(db, collectionId, rng);
      this.uniqueId = rng.randomId();
  }

  async run(): Promise<BloomFilterCounts | null> {
    const createdDocumentRefs = await this.createDocuments();

    const snapshot = await this.startTarget();
    assertDocumentsInSnapshot(snapshot, createdDocumentRefs);

    const documentRefsToDelete = createdDocumentRefs.slice(createdDocumentRefs.length - this.documentDeleteCount);
    await this.deleteDocuments(documentRefsToDelete);

    await this.pause(10);

    const bloomFilter = await this.resumeWatchStream(snapshot);
    if (bloomFilter === null) {
      return null;
    }

    return this.calculateBloomFilterCounts(bloomFilter, createdDocumentRefs, documentRefsToDelete);
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

    this.log("Removing target from watch stream");
    await this.watchStream.removeTarget(target);

    return bloomFilter;
  }

  private calculateBloomFilterCounts(bloomFilter: BloomFilter, createdDocumentRefs: Iterable<DocumentReference>, deletedDocumentRefs: Iterable<DocumentReference>): BloomFilterCounts {
    const toDocumentPath = (documentRef: DocumentReference) => documentPathFromDocumentRef(documentRef, this.projectId);
    const createdDocumentPaths = Array.from(createdDocumentRefs).map(toDocumentPath);
    const deletedDocumentPaths = Array.from(deletedDocumentRefs).map(toDocumentPath);

    let existingDocumentPathsContainedCount = 0;
    let existingDocumentPathsNotContainedCount = 0;
    for (const createdDocumentPath of createdDocumentPaths) {
      if (deletedDocumentPaths.indexOf(createdDocumentPath) >= 0) {
        continue;
      }
      if (bloomFilter.mightContain(createdDocumentPath)) {
        existingDocumentPathsContainedCount++;
      } else {
        existingDocumentPathsNotContainedCount++;
      }
    }

    let deletedDocumentPathsContainedCount = 0;
    let deletedDocumentPathsNotContainedCount = 0;
    for (const deletedDocumentPath of deletedDocumentPaths) {
      if (bloomFilter.mightContain(deletedDocumentPath)) {
        deletedDocumentPathsContainedCount++;
      } else {
        deletedDocumentPathsNotContainedCount++;
      }
    }

    return {
      existingDocsContained: existingDocumentPathsContainedCount,
      existingDocsNotContained: existingDocumentPathsNotContainedCount,
      deletedDocsContained: deletedDocumentPathsContainedCount,
      deletedDocsNotContained: deletedDocumentPathsNotContainedCount,
    };
  }
}

function assertDocumentsInSnapshot(snapshot: TargetSnapshot, expectedDocuments: Array<DocumentReference>): void {
  const actualDocumentPathsSorted = Array.from(snapshot.documentPaths.values()).map(documentIdFromDocumentPath).sort();
  const expectedDocumentPathsSorted = expectedDocuments.map(documentRef => documentRef.id).sort();
  assertDeepEqual(actualDocumentPathsSorted, expectedDocumentPathsSorted);
}


