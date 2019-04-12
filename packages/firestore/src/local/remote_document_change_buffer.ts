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

import {
  DocumentKeySet,
  DocumentSizeEntries,
  DocumentSizeEntry,
  maybeDocumentMap,
  MaybeDocumentMap,
  NullableMaybeDocumentMap
} from '../model/collections';
import { MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { assert } from '../util/assert';
import { ObjectMap } from '../util/obj_map';

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

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
  private changes: MaybeDocumentMap | null = maybeDocumentMap();
  protected documentSizes: ObjectMap<DocumentKey, number> = new ObjectMap(key =>
    key.toString()
  );

  protected abstract getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<DocumentSizeEntry | null>;

  protected abstract getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentSizeEntries>;

  protected abstract applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void>;

  /** Buffers a `RemoteDocumentCache.addEntry()` call. */
  addEntry(maybeDocument: MaybeDocument): void {
    const changes = this.assertChanges();
    this.changes = changes.insert(maybeDocument.key, maybeDocument);
  }

  // NOTE: removeEntry() is intentionally omitted. If it needs to be added in
  // the future it must take byte counting into account.

  /**
   * Looks up an entry in the cache. The buffered changes will first be checked,
   * and if no buffered change applies, this will forward to
   * `RemoteDocumentCache.getEntry()`.
   *
   * @param transaction The transaction in which to perform any persistence
   *     operations.
   * @param documentKey The key of the entry to look up.
   * @return The cached Document or NoDocument entry, or null if we have nothing
   * cached.
   */
  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    const changes = this.assertChanges();

    const bufferedEntry = changes.get(documentKey);
    if (bufferedEntry) {
      return PersistencePromise.resolve<MaybeDocument | null>(bufferedEntry);
    } else {
      // Record the size of everything we load from the cache so we can compute a delta later.
      return this.getFromCache(transaction, documentKey).next(getResult => {
        if (getResult === null) {
          this.documentSizes.set(documentKey, 0);
          return null;
        } else {
          this.documentSizes.set(documentKey, getResult.size);
          return getResult.maybeDocument;
        }
      });
    }
  }

  /**
   * Looks up several entries in the cache, forwarding to
   * `RemoteDocumentCache.getEntry()`.
   *
   * @param transaction The transaction in which to perform any persistence
   *     operations.
   * @param documentKeys The keys of the entries to look up.
   * @return A map of cached `Document`s or `NoDocument`s, indexed by key. If an
   *     entry cannot be found, the corresponding key will be mapped to a null
   *     value.
   */
  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap> {
    // Record the size of everything we load from the cache so we can compute
    // a delta later.
    return this.getAllFromCache(transaction, documentKeys).next(
      ({ maybeDocuments, sizeMap }) => {
        // Note: `getAllFromCache` returns two maps instead of a single map from
        // keys to `DocumentSizeEntry`s. This is to allow returning the
        // `NullableMaybeDocumentMap` directly, without a conversion.
        sizeMap.forEach((documentKey, size) => {
          this.documentSizes.set(documentKey, size);
        });
        return maybeDocuments;
      }
    );
  }

  /**
   * Applies buffered changes to the underlying RemoteDocumentCache, using
   * the provided transaction.
   */
  apply(transaction: PersistenceTransaction): PersistencePromise<void> {
    const result = this.applyChanges(transaction);
    // We should not buffer any more changes.
    this.changes = null;
    return result;
  }

  /** Helper to assert this.changes is not null and return it. */
  protected assertChanges(): MaybeDocumentMap {
    assert(this.changes !== null, 'Changes have already been applied.');
    return this.changes!;
  }
}
