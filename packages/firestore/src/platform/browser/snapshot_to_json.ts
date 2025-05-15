/**
 * @license
 * Copyright 2025 Google LLC
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

/** Return the Platform-specific build JSON bundle implementations. */
import { Firestore } from '../../api/database';
import { Query } from '../../core/query';
import { DocumentData } from '../../lite-api/reference';
import { Document } from '../../model/document';

export function buildDocumentSnapshotJsonBundle(
  db: Firestore,
  document: Document,
  docData: DocumentData,
  path: string
): string {
  return 'NOT SUPPORTED';
}

export function buildQuerySnapshotJsonBundle(
  db: Firestore,
  query: Query,
  bundleName: string,
  parent: string,
  paths: string[],
  docs: Document[],
  documentData: DocumentData[]
): string {
  return 'NOT SUPPORTED';
}
