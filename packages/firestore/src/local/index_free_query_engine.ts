/**
 * @license
 * Copyright 2019 Google Inc.
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
import { QueryData } from './query_data';
import { Query } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { DocumentKeySet, DocumentMap } from '../model/collections';
import { Document } from '../model/document';
import { assert } from '../util/assert';
import { debug, getLogLevel, LogLevel } from '../util/log';
import { SortedSet } from '../util/sorted_set';

/**
 * A query engine that takes advantage of the target document mapping in the
 * QueryCache. The IndexFreeQueryEngine optimizes query execution by only
 * reading the documents previously matched a query plus any documents that were
 * edited after the query was last listened to.
 *
 * There are some cases where Index-Free queries are not guaranteed to produce
 * to the same results as full collection scans. In these case, the
 * IndexFreeQueryEngine falls back to a full query processing. These cases are:
 *
 * - Limit queries where a document that matched the query previously no longer
 * matches the query. In this case, we have to scan all local documents since a
 * document that was sent to us as part of a different query result may now fall
 * into the limit.
 *
 * - Limit queries that include edits that occurred after the last remote
 * snapshot (both latency-compensated or committed). Even if an edited document
 * continues to match the query, an edit may cause a document to sort below
 * another document that is in the local cache.
 *
 * - Queries where the last snapshot contained Limbo documents. Even though a
 * Limbo document is not part of the backend result set, we need to include
 * Limbo documents in local views to ensure consistency between different Query
 * views. If there exists a previous query snapshot that contained no limbo
 * documents, we can instead use the older snapshot version for Index-Free
 * processing.
 */
export class IndexFreeQueryEngine implements QueryEngine {
  private localDocumentsView: LocalDocumentsView | undefined;

  setLocalDocumentsView(localDocuments: LocalDocumentsView): void {
    this.localDocumentsView = localDocuments;
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    queryData: QueryData | null,
    remoteKeys: DocumentKeySet
  ): PersistencePromise<DocumentMap> {
    assert(
      this.localDocumentsView !== undefined,
      'setLocalDocumentsView() not called'
    );

    // Queries that match all document don't benefit from using
    // IndexFreeQueries. It is more efficient to scan all documents in a
    // collection, rather than to perform individual lookups.
    if (query.matchesAllDocuments()) {
      return this.executeFullCollectionScan(transaction, query);
    }

    // Queries that have never seen a snapshot without limbo free documents
    // should also be run as a full collection scan.
    if (
      queryData === null ||
      queryData.lastLimboFreeSnapshotVersion.isEqual(SnapshotVersion.MIN)
    ) {
      return this.executeFullCollectionScan(transaction, query);
    }

    return this.getSortedPreviousResults(transaction, query, remoteKeys).next(
      previousResults => {
        if (
          query.hasLimit() &&
          this.needsRefill(
            previousResults,
            remoteKeys,
            queryData.lastLimboFreeSnapshotVersion
          )
        ) {
          return this.executeFullCollectionScan(transaction, query);
        }

        if (getLogLevel() <= LogLevel.DEBUG) {
          debug(
            'IndexFreeQueryEngine',
            'Re-using previous result from %s to execute query: %s',
            queryData.lastLimboFreeSnapshotVersion.toString(),
            query.toString()
          );
        }

        // Retrieve all results for documents that were updated since the last
        // limbo-document free remote snapshot.
        return this.localDocumentsView!.getDocumentsMatchingQuery(
          transaction,
          query,
          queryData.lastLimboFreeSnapshotVersion
        ).next(updatedResults => {
          previousResults.forEach(doc => {
            updatedResults = updatedResults.insert(doc.key, doc);
          });
          return updatedResults;
        });
      }
    );
  }

  /**
   * Returns the documents for the specified remote keys if they still match the
   * query, sorted by the query's comparator.
   */
  getSortedPreviousResults(
    transaction: PersistenceTransaction,
    query: Query,
    remoteKeys: DocumentKeySet
  ): PersistencePromise<SortedSet<Document>> {
    // Fetch the documents that matched the query at the last snapshot.
    return this.localDocumentsView!.getDocuments(transaction, remoteKeys).next(
      previousResults => {
        // Sort the documents and re-apply the query filter since previously
        // matching documents do not necessarily still match the query.
        let results = new SortedSet<Document>((d1, d2) =>
          query.docComparator(d1, d2)
        );
        previousResults.forEach((_, maybeDoc) => {
          if (maybeDoc instanceof Document && query.matches(maybeDoc)) {
            results = results.add(maybeDoc);
          }
        });

        return results;
      }
    );
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
  needsRefill(
    sortedPreviousResults: SortedSet<Document>,
    remoteKeys: DocumentKeySet,
    limboFreeSnapshotVersion: SnapshotVersion
  ): boolean {
    // The query needs to be refilled if a previously matching document no
    // longer matches.
    if (remoteKeys.size !== sortedPreviousResults.size) {
      return true;
    }

    // We don't need to find a better match from cache if no documents matched
    // the query.
    if (sortedPreviousResults.isEmpty()) {
      return false;
    }

    // Limit queries are not eligible for index-free query execution if there is
    // a potential that an older document from cache now sorts before a document
    // that was previously part of the limit. This, however, can only happen if
    // the last document of the limit sorts lower than it did when the query was
    // last synchronized. If a document that is not the limit boundary sorts
    // differently, the boundary of the limit itself did not change and
    // documents from cache will continue to be "rejected" by this boundary.
    // Therefore, we can ignore any modifications that don't affect the last
    // document.
    const lastDocumentInLimit = sortedPreviousResults.last()!;
    return (
      lastDocumentInLimit.hasPendingWrites ||
      lastDocumentInLimit.version.compareTo(limboFreeSnapshotVersion) > 0
    );
  }

  executeFullCollectionScan(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap> {
    if (getLogLevel() <= LogLevel.DEBUG) {
      debug(
        'IndexFreeQueryEngine',
        'Using full collection scan to execute query: %s',
        query.toString()
      );
    }

    return this.localDocumentsView!.getDocumentsMatchingQuery(
      transaction,
      query,
      SnapshotVersion.MIN
    );
  }
}
