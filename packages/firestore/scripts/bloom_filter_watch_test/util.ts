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

export type LogFunction = (...args: Array<any>) => any;

export function generateIds(count: number): Array<string> {
  const ids: Array<string> = [];
  for (let i=1; i<=count; i++) {
    ids.push(AutoId.newId());
  }
  return ids;
}

export function documentIdFromDocumentPath(documentPath: string): string {
  const lastSlashIndex = documentPath.lastIndexOf('/');
  return (lastSlashIndex < 0) ? documentPath : documentPath.slice(lastSlashIndex+1);
}

export function documentPathFromDocumentRef(documentRef: DocumentReference, projectId: string): string {
  return `projects/${projectId}/databases/(default)/documents/${documentRef.path}`;
}

export function descriptionFromSortedStrings(sortedStrings: Array<string>): string {
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

export class AssertDeepEqualError extends Error {
  name = "AssertDeepEqualError";
}

export function assertDeepEqual<T>(actual: Array<T>, expected: Array<T>): void {
  if (actual.length !== expected.length) {
    throw new AssertDeepEqualError(`expected length ${expected.length}, but got ${actual.length}`);
  }
  for (let i=0; i<actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new AssertDeepEqualError(`incorrect element at index ${i}: ${actual[i]} (expected ${expected[i]}`);
    }
  }
}
