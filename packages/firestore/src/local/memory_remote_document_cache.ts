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

import { isCollectionGroupQuery, Query, queryMatches } from '../core/query';
import {
  DocumentKeySet,
  DocumentMap,
  documentMap,
  DocumentSizeEntry,
  NullableMaybeDocumentMap,
  nullableMaybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';

import { SnapshotVersion } from '../core/snapshot_version';
import { debugAssert } from '../util/assert';
import { SortedMap } from '../util/sorted_map';
import { IndexManager } from './index_manager';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';

export type DocumentSizer = (doc: MaybeDocument) => number;

/** Miscellaneous collection types / constants. */
interface MemoryRemoteDocumentCacheEntry extends DocumentSizeEntry {
  readTime: SnapshotVersion;
}

type DocumentEntryMap = SortedMap<DocumentKey, MemoryRemoteDocumentCacheEntry>;
function documentEntryMap(): DocumentEntryMap {
  return new SortedMap<DocumentKey, MemoryRemoteDocumentCacheEntry>(
    DocumentKey.comparator
  );
}

export interface MemoryRemoteDocumentCache extends RemoteDocumentCache {
  forEachDocumentKey(
    transaction: PersistenceTransaction,
    f: (key: DocumentKey) => PersistencePromise<void>
  ): PersistencePromise<void>;
}

/**
 * The memory-only RemoteDocumentCache for IndexedDb. To construct, invoke
 * `newMemoryRemoteDocumentCache()`.
 */
class MemoryRemoteDocumentCacheImpl implements MemoryRemoteDocumentCache {
  /** Underlying cache of documents and their read times. */
  private docs = documentEntryMap();

  /** Size of all cached documents. */
  private size = 0;

  /**
   * @param sizer - Used to assess the size of a document. For eager GC, this is expected to just
   * return 0 to avoid unnecessarily doing the work of calculating the size.
   */
  constructor(
    private readonly indexManager: IndexManager,
    private readonly sizer: DocumentSizer
  ) {}

  /**
   * Adds the supplied entry to the cache and updates the cache size as appropriate.
   *
   * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()`.
   */
  addEntry(
    transaction: PersistenceTransaction,
    doc: MaybeDocument,
    readTime: SnapshotVersion
  ): PersistencePromise<void> {
    debugAssert(
      !readTime.isEqual(SnapshotVersion.min()),
      'Cannot add a document with a read time of zero'
    );

    const key = doc.key;
    const entry = this.docs.get(key);
    const previousSize = entry ? entry.size : 0;
    const currentSize = this.sizer(doc);

    this.docs = this.docs.insert(key, {
      maybeDocument: doc,
      size: currentSize,
      readTime
    });

    this.size += currentSize - previousSize;

    return this.indexManager.addToCollectionParentIndex(
      transaction,
      key.path.popLast()
    );
  }

  /**
   * Removes the specified entry from the cache and updates the cache size as appropriate.
   *
   * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()`.
   */
  removeEntry(documentKey: DocumentKey): void {
    const entry = this.docs.get(documentKey);
    if (entry) {
      this.docs = this.docs.remove(documentKey);
      this.size -= entry.size;
    }
  }

  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    const entry = this.docs.get(documentKey);
    return PersistencePromise.resolve(entry ? entry.maybeDocument : null);
  }

  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap> {
    let results = nullableMaybeDocumentMap();
    documentKeys.forEach(documentKey => {
      const entry = this.docs.get(documentKey);
      results = results.insert(documentKey, entry ? entry.maybeDocument : null);
    });
    return PersistencePromise.resolve(results);
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    sinceReadTime: SnapshotVersion
  ): PersistencePromise<DocumentMap> {
    debugAssert(
      !isCollectionGroupQuery(query),
      'CollectionGroup queries should be handled in LocalDocumentsView'
    );
    let results = documentMap();

    // Documents are ordered by key, so we can use a prefix scan to narrow down
    // the documents we need to match the query against.
    const prefix = new DocumentKey(query.path.child(''));
    const iterator = this.docs.getIteratorFrom(prefix);
    while (iterator.hasNext()) {
      const {
        key,
        value: { maybeDocument, readTime }
      } = iterator.getNext();
      if (!query.path.isPrefixOf(key.path)) {
        break;
      }
      if (readTime.compareTo(sinceReadTime) <= 0) {
        continue;
      }
      if (
        maybeDocument instanceof Document &&
        queryMatches(query, maybeDocument)
      ) {
        results = results.insert(maybeDocument.key, maybeDocument);
      }
    }
    return PersistencePromise.resolve(results);
  }

  forEachDocumentKey(
    transaction: PersistenceTransaction,
    f: (key: DocumentKey) => PersistencePromise<void>
  ): PersistencePromise<void> {
    return PersistencePromise.forEach(this.docs, (key: DocumentKey) => f(key));
  }

  newChangeBuffer(options?: {
    trackRemovals: boolean;
  }): RemoteDocumentChangeBuffer {
    // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
    // a separate changelog and does not need special handling for removals.
    return new MemoryRemoteDocumentChangeBuffer(this);
  }

  getSize(txn: PersistenceTransaction): PersistencePromise<number> {
    return PersistencePromise.resolve(this.size);
  }
}

/**
 * Creates a new memory-only RemoteDocumentCache.
 *
 * @param indexManager - A class that manages collection group indices.
 * @param sizer - Used to assess the size of a document. For eager GC, this is expected to just
 * return 0 to avoid unnecessarily doing the work of calculating the size.
 */
export function newMemoryRemoteDocumentCache(
  indexManager: IndexManager,
  sizer: DocumentSizer
): MemoryRemoteDocumentCache {
  return new MemoryRemoteDocumentCacheImpl(indexManager, sizer);
}

/**
 * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
 */
class MemoryRemoteDocumentChangeBuffer extends RemoteDocumentChangeBuffer {
  constructor(private readonly documentCache: MemoryRemoteDocumentCacheImpl) {
    super();
  }

  protected applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void> {
    const promises: Array<PersistencePromise<void>> = [];
    this.changes.forEach((key, doc) => {
      if (doc && doc.maybeDocument) {
        promises.push(
          this.documentCache.addEntry(
            transaction,
            doc.maybeDocument!,
            this.getReadTime(key)
          )
        );
      } else {
        this.documentCache.removeEntry(key);
      }
    });
    return PersistencePromise.waitFor(promises);
  }

  protected getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    return this.documentCache.getEntry(transaction, documentKey);
  }

  protected getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<NullableMaybeDocumentMap> {
    return this.documentCache.getEntries(transaction, documentKeys);
  }
}
