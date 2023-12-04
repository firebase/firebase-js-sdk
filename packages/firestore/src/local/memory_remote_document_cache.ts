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

import { Query, queryMatches } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import {
  DocumentKeySet,
  MutableDocumentMap,
  mutableDocumentMap,
  OverlayMap
} from '../model/collections';
import { Document, MutableDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  IndexOffset,
  indexOffsetComparator,
  newIndexOffsetFromDocument
} from '../model/field_index';
import { debugAssert, fail } from '../util/assert';
import { SortedMap } from '../util/sorted_map';

import { IndexManager } from './index_manager';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';

export type DocumentSizer = (doc: Document) => number;

/** Miscellaneous collection types / constants. */
interface MemoryRemoteDocumentCacheEntry {
  document: Document;
  size: number;
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
  private indexManager!: IndexManager;

  /** Size of all cached documents. */
  private size = 0;

  /**
   * @param sizer - Used to assess the size of a document. For eager GC, this is
   * expected to just return 0 to avoid unnecessarily doing the work of
   * calculating the size.
   */
  constructor(private readonly sizer: DocumentSizer) {}

  setIndexManager(indexManager: IndexManager): void {
    this.indexManager = indexManager;
  }

  /**
   * Adds the supplied entry to the cache and updates the cache size as appropriate.
   *
   * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()`.
   */
  addEntry(
    transaction: PersistenceTransaction,
    doc: MutableDocument
  ): PersistencePromise<void> {
    debugAssert(
      !doc.readTime.isEqual(SnapshotVersion.min()),
      'Cannot add a document with a read time of zero'
    );

    const key = doc.key;
    const entry = this.docs.get(key);
    const previousSize = entry ? entry.size : 0;
    const currentSize = this.sizer(doc);

    this.docs = this.docs.insert(key, {
      document: doc.mutableCopy(),
      size: currentSize
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
  ): PersistencePromise<MutableDocument> {
    const entry = this.docs.get(documentKey);
    return PersistencePromise.resolve(
      entry
        ? entry.document.mutableCopy()
        : MutableDocument.newInvalidDocument(documentKey)
    );
  }

  getEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<MutableDocumentMap> {
    let results = mutableDocumentMap();
    documentKeys.forEach(documentKey => {
      const entry = this.docs.get(documentKey);
      results = results.insert(
        documentKey,
        entry
          ? entry.document.mutableCopy()
          : MutableDocument.newInvalidDocument(documentKey)
      );
    });
    return PersistencePromise.resolve(results);
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    offset: IndexOffset,
    mutatedDocs: OverlayMap
  ): PersistencePromise<MutableDocumentMap> {
    let results = mutableDocumentMap();

    // Documents are ordered by key, so we can use a prefix scan to narrow down
    // the documents we need to match the query against.
    const collectionPath = query.path;
    const prefix = new DocumentKey(collectionPath.child(''));
    const iterator = this.docs.getIteratorFrom(prefix);
    while (iterator.hasNext()) {
      const {
        key,
        value: { document }
      } = iterator.getNext();
      if (!collectionPath.isPrefixOf(key.path)) {
        break;
      }
      if (key.path.length > collectionPath.length + 1) {
        // Exclude entries from subcollections.
        continue;
      }
      if (
        indexOffsetComparator(newIndexOffsetFromDocument(document), offset) <= 0
      ) {
        // The document sorts before the offset.
        continue;
      }
      if (!mutatedDocs.has(document.key) && !queryMatches(query, document)) {
        // The document cannot possibly match the query.
        continue;
      }

      results = results.insert(document.key, document.mutableCopy());
    }
    return PersistencePromise.resolve(results);
  }

  getAllFromCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    offset: IndexOffset,
    limti: number
  ): PersistencePromise<MutableDocumentMap> {
    // This method should only be called from the IndexBackfiller if persistence
    // is enabled.
    fail('getAllFromCollectionGroup() is not supported.');
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
 * @param sizer - Used to assess the size of a document. For eager GC, this is
 * expected to just return 0 to avoid unnecessarily doing the work of
 * calculating the size.
 */
export function newMemoryRemoteDocumentCache(
  sizer: DocumentSizer
): MemoryRemoteDocumentCache {
  return new MemoryRemoteDocumentCacheImpl(sizer);
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
      if (doc.isValidDocument()) {
        promises.push(this.documentCache.addEntry(transaction, doc));
      } else {
        this.documentCache.removeEntry(key);
      }
    });
    return PersistencePromise.waitFor(promises);
  }

  protected getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MutableDocument> {
    return this.documentCache.getEntry(transaction, documentKey);
  }

  protected getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<MutableDocumentMap> {
    return this.documentCache.getEntries(transaction, documentKeys);
  }
}
