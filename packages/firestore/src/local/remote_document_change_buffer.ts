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

import { DocumentKeySet, NullableMaybeDocumentMap } from '../model/collections';
import { MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { debugAssert } from '../util/assert';
import { ObjectMap } from '../util/obj_map';

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { SnapshotVersion } from '../core/snapshot_version';

/**
 * Represents a document change to be applied to remote document cache.
 */
interface RemoteDocumentChange {
  // The document in this change, null if it is a removal from the cache.
  readonly maybeDocument: MaybeDocument | null;
  // The timestamp when this change is read.
  readonly readTime: SnapshotVersion | null;
}

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
  // A mapping of document key to the new cache entry that should be written (or null if any
  // existing cache entry should be removed).
  protected changes: ObjectMap<
    DocumentKey,
    RemoteDocumentChange
  > = new ObjectMap(
    key => key.toString(),
    (l, r) => l.isEqual(r)
  );

  private changesApplied = false;

  protected abstract getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null>;

  protected abstract getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap>;

  protected abstract applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;

  protected getReadTime(key: DocumentKey): SnapshotVersion {
    const change = this.changes.get(key);
    if (change) {
      debugAssert(
        !!change.readTime,
        `Read time is not set for ${key}. All removeEntry() calls must include a readTime if 'trackRemovals' is used.`
      );
      return change.readTime;
    }
    return SnapshotVersion.min();
  }

  /**
   * Buffers a `RemoteDocumentCache.addEntry()` call.
   *
   * You can only modify documents that have already been retrieved via
   * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
   */
  addEntry(maybeDocument: MaybeDocument, readTime: SnapshotVersion): void {
    this.assertNotApplied();
    this.changes.set(maybeDocument.key, { maybeDocument, readTime });
  }

  /**
   * Buffers a `RemoteDocumentCache.removeEntry()` call.
   *
   * You can only remove documents that have already been retrieved via
   * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
   */
  removeEntry(key: DocumentKey, readTime: SnapshotVersion | null = null): void {
    this.assertNotApplied();
    this.changes.set(key, { maybeDocument: null, readTime });
  }

  /**
   * Looks up an entry in the cache. The buffered changes will first be checked,
   * and if no buffered change applies, this will forward to
   * `RemoteDocumentCache.getEntry()`.
   *
   * @param transaction The transaction in which to perform any persistence
   *     operations.
   * @param documentKey The key of the entry to look up.
   * @returns The cached Document or NoDocument entry, or null if we have nothing
   * cached.
   */
  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    this.assertNotApplied();
    const bufferedEntry = this.changes.get(documentKey);
    if (bufferedEntry !== undefined) {
      return PersistencePromise.resolve<MaybeDocument | null>(
        bufferedEntry.maybeDocument
      );
    } else {
      return this.getFromCache(transaction, documentKey);
    }
  }

  /**
   * Looks up several entries in the cache, forwarding to
   * `RemoteDocumentCache.getEntry()`.
   *
   * @param transaction The transaction in which to perform any persistence
   *     operations.
   * @param documentKeys The keys of the entries to look up.
   * @returns A map of cached `Document`s or `NoDocument`s, indexed by key. If an
   *     entry cannot be found, the corresponding key will be mapped to a null
   *     value.
   */
  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap> {
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
