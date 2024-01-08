/**
 * @license
 * Copyright 2019 Google LLC
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

import { getUA, isSafari } from '@firebase/util';

import {
  LimitType,
  newQueryComparator,
  Query,
  queryMatches,
  queryMatchesAllDocuments,
  queryToTarget,
  queryWithLimit,
  stringifyQuery
} from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  documentKeySet,
  DocumentKeySet,
  DocumentMap
} from '../model/collections';
import { Document } from '../model/document';
import {
  IndexOffset,
  INITIAL_LARGEST_BATCH_ID,
  newIndexOffsetSuccessorFromReadTime
} from '../model/field_index';
import { debugAssert } from '../util/assert';
import { getLogLevel, logDebug, LogLevel } from '../util/log';
import { Iterable } from '../util/misc';
import { SortedSet } from '../util/sorted_set';

import { IndexManager, IndexType } from './index_manager';
import { LocalDocumentsView } from './local_documents_view';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { QueryContext } from './query_context';
import { SimpleDb } from './simple_db';

const DEFAULT_INDEX_AUTO_CREATION_MIN_COLLECTION_SIZE = 100;

/**
 * This cost represents the evaluation result of
 * (([index, docKey] + [docKey, docContent]) per document in the result set)
 * / ([docKey, docContent] per documents in full collection scan) coming from
 * experiment [enter PR experiment URL here].
 */
function getDefaultRelativeIndexReadCostPerDocument(): number {
  // These values were derived from an experiment where several members of the
  // Firestore SDK team ran a performance test in various environments.
  // Googlers can see b/299284287 for details.
  if (isSafari()) {
    return 8;
  } else if (SimpleDb.getAndroidVersion(getUA()) > 0) {
    return 6;
  } else {
    return 4;
  }
}

/**
 * The Firestore query engine.
 *
 * Firestore queries can be executed in three modes. The Query Engine determines
 * what mode to use based on what data is persisted. The mode only determines
 * the runtime complexity of the query - the result set is equivalent across all
 * implementations.
 *
 * The Query engine will use indexed-based execution if a user has configured
 * any index that can be used to execute query (via `setIndexConfiguration()`).
 * Otherwise, the engine will try to optimize the query by re-using a previously
 * persisted query result. If that is not possible, the query will be executed
 * via a full collection scan.
 *
 * Index-based execution is the default when available. The query engine
 * supports partial indexed execution and merges the result from the index
 * lookup with documents that have not yet been indexed. The index evaluation
 * matches the backend's format and as such, the SDK can use indexing for all
 * queries that the backend supports.
 *
 * If no index exists, the query engine tries to take advantage of the target
 * document mapping in the TargetCache. These mappings exists for all queries
 * that have been synced with the backend at least once and allow the query
 * engine to only read documents that previously matched a query plus any
 * documents that were edited after the query was last listened to.
 *
 * There are some cases when this optimization is not guaranteed to produce
 * the same results as full collection scans. In these cases, query
 * processing falls back to full scans. These cases are:
 *
 * - Limit queries where a document that matched the query previously no longer
 *   matches the query.
 *
 * - Limit queries where a document edit may cause the document to sort below
 *   another document that is in the local cache.
 *
 * - Queries that have never been CURRENT or free of limbo documents.
 */
export class QueryEngine {
  private localDocumentsView!: LocalDocumentsView;
  private indexManager!: IndexManager;
  private initialized = false;

  indexAutoCreationEnabled = false;

  /**
   * SDK only decides whether it should create index when collection size is
   * larger than this.
   */
  indexAutoCreationMinCollectionSize =
    DEFAULT_INDEX_AUTO_CREATION_MIN_COLLECTION_SIZE;

  relativeIndexReadCostPerDocument =
    getDefaultRelativeIndexReadCostPerDocument();

  /** Sets the document view to query against. */
  initialize(
    localDocuments: LocalDocumentsView,
    indexManager: IndexManager
  ): void {
    this.localDocumentsView = localDocuments;
    this.indexManager = indexManager;
    this.initialized = true;
  }

  /** Returns all local documents matching the specified query. */
  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    lastLimboFreeSnapshotVersion: SnapshotVersion,
    remoteKeys: DocumentKeySet
  ): PersistencePromise<DocumentMap> {
    debugAssert(this.initialized, 'initialize() not called');

    // Stores the result from executing the query; using this object is more
    // convenient than passing the result between steps of the persistence
    // transaction and improves readability comparatively.
    const queryResult: { result: DocumentMap | null } = { result: null };

    return this.performQueryUsingIndex(transaction, query)
      .next(result => {
        queryResult.result = result;
      })
      .next(() => {
        if (queryResult.result) {
          return;
        }
        return this.performQueryUsingRemoteKeys(
          transaction,
          query,
          remoteKeys,
          lastLimboFreeSnapshotVersion
        ).next(result => {
          queryResult.result = result;
        });
      })
      .next(() => {
        if (queryResult.result) {
          return;
        }
        const context = new QueryContext();
        return this.executeFullCollectionScan(transaction, query, context).next(
          result => {
            queryResult.result = result;
            if (this.indexAutoCreationEnabled) {
              return this.createCacheIndexes(
                transaction,
                query,
                context,
                result.size
              );
            }
          }
        );
      })
      .next(() => queryResult.result!);
  }

  createCacheIndexes(
    transaction: PersistenceTransaction,
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
      return this.indexManager.createTargetIndexes(
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
  private performQueryUsingIndex(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap | null> {
    if (queryMatchesAllDocuments(query)) {
      // Queries that match all documents don't benefit from using
      // key-based lookups. It is more efficient to scan all documents in a
      // collection, rather than to perform individual lookups.
      return PersistencePromise.resolve<DocumentMap | null>(null);
    }

    let target = queryToTarget(query);
    return this.indexManager
      .getIndexType(transaction, target)
      .next(indexType => {
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

        return this.indexManager
          .getDocumentsMatchingTarget(transaction, target)
          .next(keys => {
            debugAssert(
              !!keys,
              'Index manager must return results for partial and full indexes.'
            );
            const sortedKeys = documentKeySet(...keys);
            return this.localDocumentsView
              .getDocuments(transaction, sortedKeys)
              .next(indexedDocuments => {
                return this.indexManager
                  .getMinOffset(transaction, target)
                  .next(offset => {
                    const previousResults = this.applyQuery(
                      query,
                      indexedDocuments
                    );

                    if (
                      this.needsRefill(
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
                        queryWithLimit(query, null, LimitType.First)
                      );
                    }

                    return this.appendRemainingResults(
                      transaction,
                      previousResults,
                      query,
                      offset
                    ) as PersistencePromise<DocumentMap | null>;
                  });
              });
          });
      });
  }

  /**
   * Performs a query based on the target's persisted query mapping. Returns
   * `null` if the mapping is not available or cannot be used.
   */
  private performQueryUsingRemoteKeys(
    transaction: PersistenceTransaction,
    query: Query,
    remoteKeys: DocumentKeySet,
    lastLimboFreeSnapshotVersion: SnapshotVersion
  ): PersistencePromise<DocumentMap | null> {
    if (queryMatchesAllDocuments(query)) {
      // Queries that match all documents don't benefit from using
      // key-based lookups. It is more efficient to scan all documents in a
      // collection, rather than to perform individual lookups.
      return PersistencePromise.resolve<DocumentMap | null>(null);
    }

    // Queries that have never seen a snapshot without limbo free documents
    // should also be run as a full collection scan.
    if (lastLimboFreeSnapshotVersion.isEqual(SnapshotVersion.min())) {
      return PersistencePromise.resolve<DocumentMap | null>(null);
    }

    return this.localDocumentsView!.getDocuments(transaction, remoteKeys).next(
      documents => {
        const previousResults = this.applyQuery(query, documents);

        if (
          this.needsRefill(
            query,
            previousResults,
            remoteKeys,
            lastLimboFreeSnapshotVersion
          )
        ) {
          return PersistencePromise.resolve<DocumentMap | null>(null);
        }

        if (getLogLevel() <= LogLevel.DEBUG) {
          logDebug(
            'QueryEngine',
            'Re-using previous result from %s to execute query: %s',
            lastLimboFreeSnapshotVersion.toString(),
            stringifyQuery(query)
          );
        }

        // Retrieve all results for documents that were updated since the last
        // limbo-document free remote snapshot.
        return this.appendRemainingResults(
          transaction,
          previousResults,
          query,
          newIndexOffsetSuccessorFromReadTime(
            lastLimboFreeSnapshotVersion,
            INITIAL_LARGEST_BATCH_ID
          )
        ).next<DocumentMap | null>(results => results);
      }
    );
  }

  /** Applies the query filter and sorting to the provided documents.  */
  private applyQuery(
    query: Query,
    documents: DocumentMap
  ): SortedSet<Document> {
    // Sort the documents and re-apply the query filter since previously
    // matching documents do not necessarily still match the query.
    let queryResults = new SortedSet<Document>(newQueryComparator(query));
    documents.forEach((_, maybeDoc) => {
      if (queryMatches(query, maybeDoc)) {
        queryResults = queryResults.add(maybeDoc);
      }
    });
    return queryResults;
  }

  /**
   * Determines if a limit query needs to be refilled from cache, making it
   * ineligible for index-free execution.
   *
   * @param query - The query.
   * @param sortedPreviousResults - The documents that matched the query when it
   * was last synchronized, sorted by the query's comparator.
   * @param remoteKeys - The document keys that matched the query at the last
   * snapshot.
   * @param limboFreeSnapshotVersion - The version of the snapshot when the
   * query was last synchronized.
   */
  private needsRefill(
    query: Query,
    sortedPreviousResults: SortedSet<Document>,
    remoteKeys: DocumentKeySet,
    limboFreeSnapshotVersion: SnapshotVersion
  ): boolean {
    if (query.limit === null) {
      // Queries without limits do not need to be refilled.
      return false;
    }

    if (remoteKeys.size !== sortedPreviousResults.size) {
      // The query needs to be refilled if a previously matching document no
      // longer matches.
      return true;
    }

    // Limit queries are not eligible for index-free query execution if there is
    // a potential that an older document from cache now sorts before a document
    // that was previously part of the limit. This, however, can only happen if
    // the document at the edge of the limit goes out of limit.
    // If a document that is not the limit boundary sorts differently,
    // the boundary of the limit itself did not change and documents from cache
    // will continue to be "rejected" by this boundary. Therefore, we can ignore
    // any modifications that don't affect the last document.
    const docAtLimitEdge =
      query.limitType === LimitType.First
        ? sortedPreviousResults.last()
        : sortedPreviousResults.first();
    if (!docAtLimitEdge) {
      // We don't need to refill the query if there were already no documents.
      return false;
    }
    return (
      docAtLimitEdge.hasPendingWrites ||
      docAtLimitEdge.version.compareTo(limboFreeSnapshotVersion) > 0
    );
  }

  private executeFullCollectionScan(
    transaction: PersistenceTransaction,
    query: Query,
    context: QueryContext
  ): PersistencePromise<DocumentMap> {
    if (getLogLevel() <= LogLevel.DEBUG) {
      logDebug(
        'QueryEngine',
        'Using full collection scan to execute query:',
        stringifyQuery(query)
      );
    }

    return this.localDocumentsView!.getDocumentsMatchingQuery(
      transaction,
      query,
      IndexOffset.min(),
      context
    );
  }

  /**
   * Combines the results from an indexed execution with the remaining documents
   * that have not yet been indexed.
   */
  private appendRemainingResults(
    transaction: PersistenceTransaction,
    indexedResults: Iterable<Document>,
    query: Query,
    offset: IndexOffset
  ): PersistencePromise<DocumentMap> {
    // Retrieve all results for documents that were updated since the offset.
    return this.localDocumentsView
      .getDocumentsMatchingQuery(transaction, query, offset)
      .next(remainingResults => {
        // Merge with existing results
        indexedResults.forEach(d => {
          remainingResults = remainingResults.insert(d.key, d);
        });
        return remainingResults;
      });
  }
}
