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
import { SimpleDbStore } from './simple_db';
import {
  DbPipelineResultsKey,
  DbPipelineResultsStore,
  DbTargetKey
} from './indexeddb_sentinels';
import { DbPipelineResult } from './indexeddb_schema';
import { getStore } from './indexeddb_transaction';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  fromDbPipelineResult,
  fromDbRemoteDocument,
  fromDbTimestamp,
  LocalSerializer,
  toDbPipelineResult,
  toDbPipelineResultKey,
  toDbRemoteDocument,
  toDbTimestamp
} from './local_serializer';
import { DocumentKey } from '../model/document_key';
import { mutableDocumentMap } from '../model/collections';
import { Serializer } from '../remote/number_serializer';
import { encodeResourcePath } from './encoded_resource_path';
import { debugAssert } from '../util/assert';

function newDbPipelineResult(
  serializer: LocalSerializer,
  targetId: TargetId,
  executionTime: SnapshotVersion
): DbPipelineResult {
  const documentId = '';
  const collectionPath = '';
  return {
    targetId,
    collectionPath,
    documentId,
    result: null,
    executionTime: toDbTimestamp(executionTime)
  };
}

export class IndexedDbPipelineResultsCache implements PipelineResultsCache {
  constructor(private readonly serializer: LocalSerializer) {}
  getResults(
    transaction: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<PipelineCachedResults | undefined> {
    const store = pipelineResultsStore(transaction);
    const range = IDBKeyRange.bound([targetId], [targetId + 1], false, true);

    return store.loadAll(range).next(dbResults => {
      if (dbResults.length === 0) {
        return undefined;
      }

      let executionTime: SnapshotVersion | undefined;
      let results = mutableDocumentMap();

      if (dbResults.length === 1 && dbResults[0].result === null) {
        return {
          executionTime: fromDbTimestamp(dbResults[0].executionTime),
          results
        };
      }

      for (const dbResult of dbResults) {
        debugAssert(
          dbResult.result !== null,
          'Unexpected null doc: already handled null above'
        );
        const doc = fromDbPipelineResult(this.serializer, dbResult);

        const cachedExecutionTime = fromDbTimestamp(dbResult.executionTime);
        if (!executionTime) {
          executionTime = cachedExecutionTime;
        } else {
          executionTime =
            executionTime.compareTo(cachedExecutionTime) < 0
              ? cachedExecutionTime
              : executionTime;
        }

        results = results.insert(doc.key, doc);
      }

      if (!executionTime) {
        return undefined;
      }

      return { executionTime, results };
    });
  }

  setResults(
    transaction: PersistenceTransaction,
    targetId: TargetId,
    executionTime: SnapshotVersion,
    results: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): PersistencePromise<void> {
    const store = pipelineResultsStore(transaction);
    const range = IDBKeyRange.bound([targetId], [targetId + 1], false, true);
    return store
      .delete(range)
      .next(() =>
        this.updateResults(
          transaction,
          targetId,
          executionTime,
          results,
          deletes
        )
      );
  }

  updateResults(
    transaction: PersistenceTransaction,
    targetId: TargetId,
    executionTime: SnapshotVersion,
    upserts: Array<MutableDocument>,
    deletes: Array<DocumentKey>
  ): PersistencePromise<void> {
    const store = pipelineResultsStore(transaction);
    const range = IDBKeyRange.bound([targetId], [targetId + 1], false, true);
    const promises: Array<PersistencePromise<void>> = [];

    // Save upserts
    for (const doc of upserts) {
      promises.push(
        store.put(
          toDbPipelineResult(this.serializer, targetId, executionTime, doc)
        )
      );
    }

    // Delete removed documents
    for (const key of deletes) {
      promises.push(store.delete(toDbPipelineResultKey(targetId, key)));
    }

    store.loadFirst(range, 2).next(results => {
      if (results.length === 0) {
        promises.push(
          store.put(
            newDbPipelineResult(this.serializer, targetId, executionTime)
          )
        );
      } else {
        const firstDoc = results[0];
        if (firstDoc.result === null && results.length > 1) {
          promises.push(
            store.delete([
              targetId,
              firstDoc.collectionPath,
              firstDoc.documentId
            ])
          );
        }
      }
    });

    return PersistencePromise.waitFor(promises);
  }
}

function pipelineResultsStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbPipelineResultsKey, DbPipelineResult> {
  return getStore<DbPipelineResultsKey, DbPipelineResult>(
    txn,
    DbPipelineResultsStore
  );
}
