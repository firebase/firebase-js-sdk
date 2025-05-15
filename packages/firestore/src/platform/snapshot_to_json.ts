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

import { Query } from '../core/query';
import { DocumentData } from '../lite-api/reference';
import { Document } from '../model/document';
import { Firestore } from '../api/database';

// This file is only used under ts-node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const platform = require(`./${process.env.TEST_PLATFORM ?? 'node'}/snapshot_to_json`);

/** 
 * Constructs the bundle data for a DocumentSnapshot used in its toJSON serialization.
 */
export function buildDocumentSnapshotJsonBundle(
  db: Firestore,
  document: Document,
  docData: DocumentData,
  path: string
): string {
  return platform.buildDocumentSnapshotJsonBundle(db, document, docData, path);
}

/** 
 * Constructs the bundle data for a QuerySnapshot used in its toJSON serialization.
 */
export function buildQuerySnapshotJsonBundle(
  db: Firestore, query: Query,
  bundleName: string,
  parent: string,
  paths: string[],
  docs: Document[],
  documentData: DocumentData[]
) : string {
  return platform.buildQuerySnapshotJsonBundle(db, query, bundleName, parent, paths, docs, documentData);
}