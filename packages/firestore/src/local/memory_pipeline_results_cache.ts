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
import {
  PipelineCachedResults,
  PipelineResultsCache
} from './pipeline_results_cache';
import { PersistenceTransaction } from './persistence_transaction';
import { TargetId } from '../core/types';
import { PersistencePromise } from './persistence_promise';
import { MutableDocument } from '../model/document';
import { SnapshotVersion } from '../core/snapshot_version';
import { mutableDocumentMap, MutableDocumentMap } from '../model/collections';
import { DocumentKey } from '../model/document_key';

export class MemoryPipelineResultsCache implements PipelineResultsCache {
  private results = new Map<TargetId, PipelineCachedResults>();

  getResults(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<PipelineCachedResults | undefined> {
    return PersistencePromise.resolve(this.results.get(targetId));
  }

  setResults(
    transaction: PersistenceTransaction,
    targetId: TargetId,
    executionTime: SnapshotVersion,
    results: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): PersistencePromise<void> {
    this.results.delete(targetId);
    return this.updateResults(
      transaction,
      targetId,
      executionTime,
      results,
      deletes
    );
  }

  updateResults(
    transaction: PersistenceTransaction,
    targetId: TargetId,
    executionTime: SnapshotVersion,
    upserts: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): PersistencePromise<void> {
    let targetResults = this.results.get(targetId) || {
      executionTime,
      results: mutableDocumentMap()
    };
    targetResults.executionTime = executionTime;

    for (const doc of upserts) {
      doc.setReadTime(executionTime);
      targetResults.results = targetResults.results.insert(doc.key, doc);
    }

    // Handle deletes
    for (const key of deletes) {
      targetResults.results = targetResults.results.remove(key);
    }
    this.results.set(targetId, targetResults);

    return PersistencePromise.resolve();
  }
}
