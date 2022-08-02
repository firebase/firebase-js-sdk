/**
 * @license
 * Copyright 2017 Google LLC
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
import { DocumentKeySet, MutableDocumentMap } from '../model/collections';
import { MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { debugAssert } from '../util/assert';
import { ObjectMap } from '../util/obj_map';

import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';

/**
 * An in-memory buffer of entries to be written to a RemoteDocumentCache.
 * It can be used to batch up a set of changes to be written to the cache, but
 * additionally supports reading entries back with the `getEntry()` method,
 * falling back to the underlying RemoteDocumentCache if no entry is
 * buffered.
 *
 * Entries added to the cache *must* be read first. This is to facilitate
 * calculating the size delta of the pending changes.
 *
 * PORTING NOTE: This class was implemented then removed from other platforms.
 * If byte-counting ends up being needed on the other platforms, consider
 * porting this class as part of that implementation work.
 */
export abstract class RemoteDocumentChangeBuffer {
  // A mapping of document key to the new cache entry that should be written.
  protected changes: ObjectMap<DocumentKey, MutableDocument> = new ObjectMap(
    key => key.toString(),
    (l, r) => l.isEqual(r)
  );

  private changesApplied = false;

  protected abstract getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutableDocument>;

  protected abstract getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<MutableDocumentMap>;

  protected abstract applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;

  /**
   * Buffers a `RemoteDocumentCache.addEntry()` call.
   *
   * You can only modify documents that have already been retrieved via
   * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
   */
  addEntry(document: MutableDocument): void {
    this.assertNotApplied();
    this.changes.set(document.key, document);
  }

  /**
   * Buffers a `RemoteDocumentCache.removeEntry()` call.
   *
   * You can only remove documents that have already been retrieved via
   * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
   */
  removeEntry(key: DocumentKey, readTime: SnapshotVersion): void {
    this.assertNotApplied();
    this.changes.set(
      key,
      MutableDocument.newInvalidDocument(key).setReadTime(readTime)
    );
  }

  /**
   * Looks up an entry in the cache. The buffered changes will first be checked,
   * and if no buffered change applies, this will forward to
   * `RemoteDocumentCache.getEntry()`.
   *
   * @param transaction - The transaction in which to perform any persistence
   *     operations.
   * @param documentKey - The key of the entry to look up.
   * @returns The cached document or an invalid document if we have nothing
   * cached.
   */
  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutableDocument> {
    this.assertNotApplied();
    const bufferedEntry = this.changes.get(documentKey);
    if (bufferedEntry !== undefined) {
      return PersistencePromise.resolve(bufferedEntry);
    } else {
      return this.getFromCache(transaction, documentKey);
    }
  }

  /**
   * Looks up several entries in the cache, forwarding to
   * `RemoteDocumentCache.getEntry()`.
   *
   * @param transaction - The transaction in which to perform any persistence
   *     operations.
   * @param documentKeys - The keys of the entries to look up.
   * @returns A map of cached documents, indexed by key. If an entry cannot be
   *     found, the corresponding key will be mapped to an invalid document.
   */
  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<MutableDocumentMap> {
    return this.getAllFromCache(transaction, documentKeys);
  }

  /**
   * Applies buffered changes to the underlying RemoteDocumentCache, using
   * the provided transaction.
   */
  apply(transaction: PersistenceTransaction): PersistencePromise<void> {
    this.assertNotApplied();
    this.changesApplied = true;
    return this.applyChanges(transaction);
  }

  /** Helper to assert this.changes is not null  */
  protected assertNotApplied(): void {
    debugAssert(!this.changesApplied, 'Changes have already been applied.');
  }
}
