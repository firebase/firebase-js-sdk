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
import { SnapshotVersion } from '../core/snapshot_version';
import { Query } from '../core/query';
import { DocumentKeySet, DocumentMap } from '../model/collections';
import { LocalDocumentsView } from './local_documents_view';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
/**
 * Represents a query engine capable of performing queries over the local
 * document cache. You must call `setLocalDocumentsView()` before using.
 */
export interface QueryEngine {
    /** Sets the document view to query against. */
    setLocalDocumentsView(localDocuments: LocalDocumentsView): void;
    /** Returns all local documents matching the specified query. */
    getDocumentsMatchingQuery(transaction: PersistenceTransaction, query: Query, lastLimboFreeSnapshotVersion: SnapshotVersion, remoteKeys: DocumentKeySet): PersistencePromise<DocumentMap>;
}
