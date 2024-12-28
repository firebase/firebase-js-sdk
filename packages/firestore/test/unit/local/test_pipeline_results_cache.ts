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

import { Persistence } from '../../../src/local/persistence';
import {
  PipelineCachedResults,
  PipelineResultsCache
} from '../../../src/local/pipeline_results_cache';
import { TargetId } from '../../../src/core/types';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { MutableDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';

/**
 */
export class TestPipelineResultsCache {
  private readonly cache: PipelineResultsCache;

  constructor(private readonly persistence: Persistence) {
    this.cache = persistence.getPipelineResultsCache();
  }

  getResults(targetId: TargetId): Promise<PipelineCachedResults | undefined> {
    return this.persistence.runTransaction('getResults', 'readonly', t =>
      this.cache.getResults(t, targetId)
    );
  }

  setResults(
    targetId: TargetId,
    executionTime: SnapshotVersion,
    results: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): Promise<void> {
    return this.persistence.runTransaction('setResults', 'readwrite', t =>
      this.cache.setResults(t, targetId, executionTime, results, deletes)
    );
  }

  updateResults(
    targetId: TargetId,
    executionTime: SnapshotVersion,
    results: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): Promise<void> {
    return this.persistence.runTransaction('updateResults', 'readwrite', t =>
      this.cache.updateResults(t, targetId, executionTime, results, deletes)
    );
  }
}
