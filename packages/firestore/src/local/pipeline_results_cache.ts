/**
 * @license
 * Copyright 2024 Google LLC
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

import { MutableDocument } from '../model/document';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { TargetId } from '../core/types';
import { SnapshotVersion } from '../core/snapshot_version';
import { DocumentKey } from '../model/document_key';
import { MutableDocumentMap } from '../model/collections';

export interface PipelineCachedResults {
  executionTime: SnapshotVersion;
  results: MutableDocumentMap;
}

export interface PipelineResultsCache {
  getResults(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<PipelineCachedResults | undefined>;

  setResults(
    transaction: PersistenceTransaction,
    targetId: TargetId,
    executionTime: SnapshotVersion,
    results: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): PersistencePromise<void>;

  updateResults(
    transaction: PersistenceTransaction,
    targetId: TargetId,
    executionTime: SnapshotVersion,
    results: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): PersistencePromise<void>;
}
