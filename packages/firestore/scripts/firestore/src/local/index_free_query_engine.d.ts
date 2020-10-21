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
import { Query } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { DocumentKeySet, DocumentMap } from '../model/collections';
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
export declare class IndexFreeQueryEngine implements QueryEngine {
    private localDocumentsView;
    setLocalDocumentsView(localDocuments: LocalDocumentsView): void;
    getDocumentsMatchingQuery(transaction: PersistenceTransaction, query: Query, lastLimboFreeSnapshotVersion: SnapshotVersion, remoteKeys: DocumentKeySet): PersistencePromise<DocumentMap>;
    /** Applies the query filter and sorting to the provided documents.  */
    private applyQuery;
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
    private needsRefill;
    private executeFullCollectionScan;
}
