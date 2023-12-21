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
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FieldIndexManagementApi } from './field_index_management_api';
import { PersistenceTransaction } from '../local/persistence_transaction';
import {
  LimitType,
  Query,
  queryMatchesAllDocuments,
  queryToTarget,
  queryWithLimit,
  stringifyQuery
} from '../core/query';
import { QueryContext } from '../local/query_context';
import { PersistencePromise } from '../local/persistence_promise';
import { getLogLevel, logDebug, LogLevel } from '../util/log';
import { documentKeySet, DocumentMap } from '../model/collections';
import { IndexManager, IndexType } from '../local/index_manager';
import { debugAssert } from '../util/assert';
import { LocalDocumentsView } from '../local/local_documents_view';
import {
  appendRemainingResults,
  applyQuery,
  needsRefill
} from '../local/query_engine';

export class FieldIndexManagementApiImpl implements FieldIndexManagementApi {
  indexAutoCreationEnabled = false;

  /**
   * SDK only decides whether it should create index when collection size is
   * larger than this.
   */
  indexAutoCreationMinCollectionSize =
    DEFAULT_INDEX_AUTO_CREATION_MIN_COLLECTION_SIZE;

  relativeIndexReadCostPerDocument =
    DEFAULT_RELATIVE_INDEX_READ_COST_PER_DOCUMENT;

  createCacheIndexes(
    transaction: PersistenceTransaction,
    indexManager: IndexManager,
    query: Query,
    context: QueryContext,
    resultSize: number
  ): PersistencePromise<void> {
    if (context.documentReadCount < this.indexAutoCreationMinCollectionSize) {
      if (getLogLevel() <= LogLevel.DEBUG) {
        logDebug(
          'QueryEngine',
          'SDK will not create cache indexes for query:',
          stringifyQuery(query),
          'since it only creates cache indexes for collection contains',
          'more than or equal to',
          this.indexAutoCreationMinCollectionSize,
          'documents'
        );
      }
      return PersistencePromise.resolve();
    }

    if (getLogLevel() <= LogLevel.DEBUG) {
      logDebug(
        'QueryEngine',
        'Query:',
        stringifyQuery(query),
        'scans',
        context.documentReadCount,
        'local documents and returns',
        resultSize,
        'documents as results.'
      );
    }

    if (
      context.documentReadCount >
      this.relativeIndexReadCostPerDocument * resultSize
    ) {
      if (getLogLevel() <= LogLevel.DEBUG) {
        logDebug(
          'QueryEngine',
          'The SDK decides to create cache indexes for query:',
          stringifyQuery(query),
          'as using cache indexes may help improve performance.'
        );
      }
      return indexManager.createTargetIndexes(
        transaction,
        queryToTarget(query)
      );
    }

    return PersistencePromise.resolve();
  }

  /**
   * Performs an indexed query that evaluates the query based on a collection's
   * persisted index values. Returns `null` if an index is not available.
   */
  performQueryUsingIndex(
    transaction: PersistenceTransaction,
    indexManager: IndexManager,
    localDocumentsView: LocalDocumentsView,
    query: Query
  ): PersistencePromise<DocumentMap | null> {
    if (queryMatchesAllDocuments(query)) {
      // Queries that match all documents don't benefit from using
      // key-based lookups. It is more efficient to scan all documents in a
      // collection, rather than to perform individual lookups.
      return PersistencePromise.resolve<DocumentMap | null>(null);
    }

    let target = queryToTarget(query);
    return indexManager.getIndexType(transaction, target).next(indexType => {
      if (indexType === IndexType.NONE) {
        // The target cannot be served from any index.
        return null;
      }

      if (query.limit !== null && indexType === IndexType.PARTIAL) {
        // We cannot apply a limit for targets that are served using a partial
        // index. If a partial index will be used to serve the target, the
        // query may return a superset of documents that match the target
        // (e.g. if the index doesn't include all the target's filters), or
        // may return the correct set of documents in the wrong order (e.g. if
        // the index doesn't include a segment for one of the orderBys).
        // Therefore, a limit should not be applied in such cases.
        query = queryWithLimit(query, null, LimitType.First);
        target = queryToTarget(query);
      }

      return indexManager
        .getDocumentsMatchingTarget(transaction, target)
        .next(keys => {
          debugAssert(
            !!keys,
            'Index manager must return results for partial and full indexes.'
          );
          const sortedKeys = documentKeySet(...keys);
          return localDocumentsView
            .getDocuments(transaction, sortedKeys)
            .next(indexedDocuments => {
              return indexManager
                .getMinOffset(transaction, target)
                .next(offset => {
                  const previousResults = applyQuery(query, indexedDocuments);

                  if (
                    needsRefill(
                      query,
                      previousResults,
                      sortedKeys,
                      offset.readTime
                    )
                  ) {
                    // A limit query whose boundaries change due to local
                    // edits can be re-run against the cache by excluding the
                    // limit. This ensures that all documents that match the
                    // query's filters are included in the result set. The SDK
                    // can then apply the limit once all local edits are
                    // incorporated.
                    return this.performQueryUsingIndex(
                      transaction,
                      indexManager,
                      localDocumentsView,
                      queryWithLimit(query, null, LimitType.First)
                    );
                  }

                  return appendRemainingResults(
                    transaction,
                    localDocumentsView,
                    previousResults,
                    query,
                    offset
                  ) as PersistencePromise<DocumentMap | null>;
                });
            });
        });
    });
  }
}

const DEFAULT_INDEX_AUTO_CREATION_MIN_COLLECTION_SIZE = 100;

/**
 * This cost represents the evaluation result of
 * (([index, docKey] + [docKey, docContent]) per document in the result set)
 * / ([docKey, docContent] per documents in full collection scan) coming from
 * experiment [enter PR experiment URL here].
 * TODO(b/299284287) Choose a value appropriate for the browser/OS combination,
 *  as determined by more data points from running the experiment.
 */
const DEFAULT_RELATIVE_INDEX_READ_COST_PER_DOCUMENT = 8;
