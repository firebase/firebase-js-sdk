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

import {createWatchStream, WatchStream} from './watch_stream';
import {DocumentUtil} from './document_util';
import {
  assertDeepEqual,
  descriptionFromSortedStrings,
  documentIdFromDocumentPath,
  LogFunction,
  pause
} from './util';
import {Firestore,} from '../../src';
import { AutoId } from '../../src/util/misc';

const DOCUMENT_DATA_KEY = "BloomFilterWatchTest_GroupId";

class InvalidRunTestOptionsError extends Error {
  readonly name = "InvalidRunTestOptionsError";
}

export async function runTest(db: Firestore, projectId: string, host: string, ssl: boolean, documentCreateCount_: number | null, documentDeleteCount_: number | null, collectionId_: string | null, log: (...args: Array<any>) => any): Promise<void> {
  log("Bloom Filter Watch Test Started");

  const collectionId = collectionId_ ?? `bloom_filter_watch_test_${AutoId.newId()}`;
  const documentCreateCount = documentCreateCount_ ?? 10;
  const documentDeleteCount = documentDeleteCount_ ?? Math.ceil(documentCreateCount / 2);

  if (documentDeleteCount > documentCreateCount) {
    throw new InvalidRunTestOptionsError(
      `documentDeleteCount (${documentDeleteCount}) must be ` +
      `less than or equal to documentCreateCount (${documentCreateCount})`);
  }

  log(`Creating WatchStream with projectId=${projectId} and host=${host}`);
  const watchStream = createWatchStream(projectId, host, ssl);
  await watchStream.open();
  try {
    await doTestSteps(db, projectId, watchStream, collectionId, documentCreateCount, documentDeleteCount, log);
  } finally {
    log("Closing watch stream");
    await watchStream.close();
  }

  log("Bloom Filter Watch Test Completed Successfully");
}

async function doTestSteps(db: Firestore, projectId: string, watchStream: WatchStream, collectionId: string, documentCreateCount: number, documentDeleteCount: number, log: LogFunction): Promise<void> {
  const uniqueId = AutoId.newId();

  const documentUtil = new DocumentUtil(db, collectionId);
  log(`Creating ${documentCreateCount} documents in collection ${collectionId}`);
  const createdDocumentRefs = await documentUtil.createDocuments(documentCreateCount, { [DOCUMENT_DATA_KEY]: uniqueId});
  const createdDocumentIds = createdDocumentRefs.map(documentRef => documentRef.id);
  log(`Created ${documentCreateCount} documents ` +
    `in collection ${collectionId}: ` +
    descriptionFromSortedStrings(createdDocumentIds));

  log("Adding target to watch stream");
  await watchStream.addTarget({
    targetId: 1,
    projectId: projectId,
    collectionId,
    keyFilter: DOCUMENT_DATA_KEY,
    valueFilter: uniqueId
  });

  log("Waiting for a snapshot from watch");
  const snapshot1 = await watchStream.getInitialSnapshot(1);
  const documentNames1 = Array.from(snapshot1.documentPaths).sort();
  const documentIds1 = documentNames1.map(documentIdFromDocumentPath);

  log(`Got snapshot with ${documentIds1.length} documents: ${descriptionFromSortedStrings(documentIds1)}`);
  assertDeepEqual(documentIds1, createdDocumentIds);

  log("Removing target from watch stream");
  await watchStream.removeTarget(1);

  const documentRefsToDelete = createdDocumentRefs.slice(createdDocumentRefs.length - documentDeleteCount);
  const documentIdsToDelete = documentRefsToDelete.map(documentRef => documentRef.id);
  log(`Deleting ${documentDeleteCount} documents ` +
    `from collection ${collectionId}: ` +
    descriptionFromSortedStrings(documentIdsToDelete));
  await documentUtil.deleteDocuments(documentRefsToDelete);
  log(`Deleted ${documentDeleteCount} documents`);

  const resumeDeferSeconds = 10;
  log(`Waiting for ${resumeDeferSeconds} seconds so we get an existence filter upon resuming the query.`);
  await pause(resumeDeferSeconds);

  log("Resuming target in watch stream");
  await watchStream.addTarget({
    targetId: 2,
    projectId: projectId,
    collectionId,
    keyFilter: DOCUMENT_DATA_KEY,
    valueFilter: uniqueId,
    resumeFrom: snapshot1
  });

  log("Waiting for a snapshot from watch");
  const snapshot2 = await watchStream.getInitialSnapshot(2);
  const documentNames2 = Array.from(snapshot2.documentPaths).sort();
  const documentIds2 = documentNames2.map(documentIdFromDocumentPath);
  log(`Got snapshot with ${documentIds2.length} documents: ${descriptionFromSortedStrings(documentIds2)}`);
}




