/**
 * @license
 * Copyright 2017 Google Inc.
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

import { Query } from '../core/query';
import {
  DocumentKeySet,
  DocumentMap,
  DocumentMap,
  DocumentMap
} from '../model/collections';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';

/**
 * Represents cached documents received from the remote backend.
 *
 * The cache is keyed by DocumentKey and entries are Documents that may be
 * existing or missing.
 */
export interface RemoteDocumentCache {
  /**
   * Looks up an entry in the cache.
   *
   * @param documentKey The key of the entry to look up.
   * @return The cached Document (existing or missing), or unknown if we have
   *     nothing cached.
   */
  // DC: Simpler type!
  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<Document>;

  /**
   * Looks up a set of entries in the cache.
   *
   * @param documentKeys The keys of the entries to look up.
   * @return The cached Document entries indexed by key. If an entry is not
   *     cached, the corresponding key will be mapped to an unknown document.
   */
  // DC: Simpler type!
  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentMap>;

  /**
   * Executes a query against the cached Document entries.
   *
   * Implementations may return extra documents if convenient. The results
   * should be re-filtered by the consumer before presenting them to the user.
   *
   * Cached missing Document entries have no bearing on query results.
   *
   * @param query The query to match documents against.
   * @return The set of matching documents.
   */
  // DC: Type too broad. This could now return MISSING and UNKNOWN documents
  // which doesn't make sense and could be harmful (calling code has to filter
  // them out).
  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap>;

  /**
   * Returns the set of documents that have been updated since the last call.
   * If this is the first call, returns the set of changes since client
   * initialization.
   *
   * If the changelog was garbage collected and can no longer be replayed,
   * `getNewDocumentChanges` will reject the returned Promise. Further
   * invocations will return document changes since the point of rejection.
   */
  // PORTING NOTE: This is only used for multi-tab synchronization.
  // DC: Type may be too broad. Can now return UNKNOWN documents where it didn't
  // before. Not sure if it's harmful.
  getNewDocumentChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<DocumentMap>;

  /**
   * Provides access to add or update the contents of the cache. The buffer
   * handles proper size accounting for the change.
   *
   * Multi-Tab Note: This should only be called by the primary client.
   */
  newChangeBuffer(): RemoteDocumentChangeBuffer;

  /**
   * Get an estimate of the size of the document cache. Note that for eager
   * garbage collection, we don't track sizes so this will return 0.
   */
  getSize(transaction: PersistenceTransaction): PersistencePromise<number>;
}
