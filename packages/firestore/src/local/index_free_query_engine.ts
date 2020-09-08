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

import { QueryEngine } from './query_engine';
import { LocalDocumentsView } from './local_documents_view';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import {
  hasLimitToFirst,
  hasLimitToLast,
  LimitType,
  matchesAllDocuments,
  newQueryComparator,
  Query,
  queryMatches,
  stringifyQuery
} from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  DocumentKeySet,
  DocumentMap,
  MaybeDocumentMap
} from '../model/collections';
import { Document } from '../model/document';
import { debugAssert } from '../util/assert';
import { getLogLevel, LogLevel, logDebug } from '../util/log';
import { SortedSet } from '../util/sorted_set';

// TOOD(b/140938512): Drop SimpleQueryEngine and rename IndexFreeQueryEngine.

/**
 * A query engine that takes advantage of the target document mapping in the
 * QueryCache. The IndexFreeQueryEngine optimizes query execution by only
 * reading the documents that previously matched a query plus any documents that were
 * edited after the query was last listened to.
 *
 * There are some cases where Index-Free queries are not guaranteed to produce
 * the same results as full collection scans. In these cases, the
 * IndexFreeQueryEngine falls back to full query processing. These cases are:
 *
 * - Limit queries where a document that matched the query previously no longer
 *   matches the query.
 *
 * - Limit queries where a document edit may cause the document to sort below
 *   another document that is in the local cache.
 *
 * - Queries that have never been CURRENT or free of Limbo documents.
 */
export class IndexFreeQueryEngine implements QueryEngine {
  private localDocumentsView: LocalDocumentsView | undefined;

  setLocalDocumentsView(localDocuments: LocalDocumentsView): void {
    this.localDocumentsView = localDocuments;
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    lastLimboFreeSnapshotVersion: SnapshotVersion,
    remoteKeys: DocumentKeySet
  ): PersistencePromise<DocumentMap> {
    debugAssert(
      this.localDocumentsView !== undefined,
      'setLocalDocumentsView() not called'
    );

    // Queries that match all documents don't benefit from using
    // IndexFreeQueries. It is more efficient to scan all documents in a
    // collection, rather than to perform individual lookups.
    if (matchesAllDocuments(query)) {
      return this.executeFullCollectionScan(transaction, query);
    }

    // Queries that have never seen a snapshot without limbo free documents
    // should also be run as a full collection scan.
    if (lastLimboFreeSnapshotVersion.isEqual(SnapshotVersion.min())) {
      return this.executeFullCollectionScan(transaction, query);
    }

    return this.localDocumentsView!.getDocuments(transaction, remoteKeys).next(
      documents => {
        const previousResults = this.applyQuery(query, documents);

        if (
          (hasLimitToFirst(query) || hasLimitToLast(query)) &&
          this.needsRefill(
            query.limitType,
            previousResults,
            remoteKeys,
            lastLimboFreeSnapshotVersion
          )
        ) {
          return this.executeFullCollectionScan(transaction, query);
        }

        if (getLogLevel() <= LogLevel.DEBUG) {
          logDebug(
            'IndexFreeQueryEngine',
            'Re-using previous result from %s to execute query: %s',
            lastLimboFreeSnapshotVersion.toString(),
            stringifyQuery(query)
          );
        }

        // Retrieve all results for documents that were updated since the last
        // limbo-document free remote snapshot.
        return this.localDocumentsView!.getDocumentsMatchingQuery(
          transaction,
          query,
          lastLimboFreeSnapshotVersion
        ).next(updatedResults => {
          // We merge `previousResults` into `updateResults`, since
          // `updateResults` is already a DocumentMap. If a document is
          // contained in both lists, then its contents are the same.
          previousResults.forEach(doc => {
            updatedResults = updatedResults.insert(doc.key, doc);
          });
          return updatedResults;
        });
      }
    );
  }

  /** Applies the query filter and sorting to the provided documents.  */
  private applyQuery(
    query: Query,
    documents: MaybeDocumentMap
  ): SortedSet<Document> {
    // Sort the documents and re-apply the query filter since previously
    // matching documents do not necessarily still match the query.
    let queryResults = new SortedSet<Document>(newQueryComparator(query));
    documents.forEach((_, maybeDoc) => {
      if (maybeDoc instanceof Document && queryMatches(query, maybeDoc)) {
        queryResults = queryResults.add(maybeDoc);
      }
    });
    return queryResults;
  }

  /**
   * Determines if a limit query needs to be refilled from cache, making it
   * ineligible for index-free execution.
   *
   * @param sortedPreviousResults The documents that matched the query when it
   * was last synchronized, sorted by the query's comparator.
   * @param remoteKeys The document keys that matched the query at the last
   * snapshot.
   * @param limboFreeSnapshotVersion The version of the snapshot when the query
   * was last synchronized.
   */
  private needsRefill(
    limitType: LimitType,
    sortedPreviousResults: SortedSet<Document>,
    remoteKeys: DocumentKeySet,
    limboFreeSnapshotVersion: SnapshotVersion
  ): boolean {
    // The query needs to be refilled if a previously matching document no
    // longer matches.
    if (remoteKeys.size !== sortedPreviousResults.size) {
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
      limitType === LimitType.First
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
    query: Query
  ): PersistencePromise<DocumentMap> {
    if (getLogLevel() <= LogLevel.DEBUG) {
      logDebug(
        'IndexFreeQueryEngine',
        'Using full collection scan to execute query:',
        stringifyQuery(query)
      );
    }

    return this.localDocumentsView!.getDocumentsMatchingQuery(
      transaction,
      query,
      SnapshotVersion.min()
    );
  }
}
