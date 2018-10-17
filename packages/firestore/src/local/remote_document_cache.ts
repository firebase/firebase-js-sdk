/**
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
import { DocumentMap, MaybeDocumentMap } from '../model/collections';
import { MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';

/**
 * Represents cached documents received from the remote backend.
 *
 * The cache is keyed by DocumentKey and entries in the cache are MaybeDocument
 * instances, meaning we can cache both Document instances (an actual document
 * with data) as well as NoDocument instances (indicating that the document is
 * known to not exist).
 */
export interface RemoteDocumentCache {
  /**
   * Looks up an entry in the cache.
   *
   * @param documentKey The key of the entry to look up.
   * @return The cached Document or NoDocument entry, or null if we have nothing
   * cached.
   */
  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null>;

  /**
   * Executes a query against the cached Document entries.
   *
   * Implementations may return extra documents if convenient. The results
   * should be re-filtered by the consumer before presenting them to the user.
   *
   * Cached NoDocument entries have no bearing on query results.
   *
   * @param query The query to match documents against.
   * @return The set of matching documents.
   */
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
  getNewDocumentChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<MaybeDocumentMap>;

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
