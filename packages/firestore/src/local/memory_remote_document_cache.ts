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
  documentKeySet,
  DocumentMap,
  documentMap,
  DocumentSizeEntries,
  DocumentSizeEntry,
  MaybeDocumentMap,
  maybeDocumentMap,
  NullableMaybeDocumentMap,
  nullableMaybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';

import { SnapshotVersion } from '../core/snapshot_version';
import { assert } from '../util/assert';
import { SortedMap } from '../util/sorted_map';
import { IndexManager } from './index_manager';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';
import { RemoteDocumentChangeBuffer } from './remote_document_change_buffer';

export type DocumentSizer = (doc: MaybeDocument) => number;

type DocumentSizeMap = SortedMap<DocumentKey, DocumentSizeEntry>;
function documentSizeMap(): DocumentSizeMap {
  return new SortedMap<DocumentKey, DocumentSizeEntry>(DocumentKey.comparator);
}

export class MemoryRemoteDocumentCache implements RemoteDocumentCache {
  private docs = documentSizeMap();
  private newDocumentChanges = documentKeySet();
  private size = 0;

  /**
   * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
   * return 0 to avoid unnecessarily doing the work of calculating the size.
   */
  constructor(
    private readonly indexManager: IndexManager,
    private readonly sizer: DocumentSizer
  ) {}

  /**
   * Adds the supplied entries to the cache. Adds the given size delta to the cached size.
   */
  addEntries(
    transaction: PersistenceTransaction,
    entries: DocumentSizeEntry[],
    sizeDelta: number
  ): PersistencePromise<void> {
    const promises = [] as Array<PersistencePromise<void>>;
    for (const entry of entries) {
      const key = entry.maybeDocument.key;
      this.docs = this.docs.insert(key, entry);
      this.newDocumentChanges = this.newDocumentChanges.add(key);

      promises.push(
        this.indexManager.addToCollectionParentIndex(
          transaction,
          key.path.popLast()
        )
      );
    }
    this.size += sizeDelta;
    return PersistencePromise.waitFor(promises);
  }

  /**
   * Removes the specified entry from the cache and updates the size as appropriate.
   */
  removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<number> {
    const entry = this.docs.get(documentKey);
    if (entry) {
      this.docs = this.docs.remove(documentKey);
      this.size -= entry.size;
      return PersistencePromise.resolve(entry.size);
    } else {
      return PersistencePromise.resolve(0);
    }
  }

  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    const entry = this.docs.get(documentKey);
    return PersistencePromise.resolve(entry ? entry.maybeDocument : null);
  }

  /**
   * Looks up an entry in the cache.
   *
   * @param documentKey The key of the entry to look up.
   * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
   */
  getSizedEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<DocumentSizeEntry | null> {
    return PersistencePromise.resolve(this.docs.get(documentKey));
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

  /**
   * Looks up several entries in the cache.
   *
   * @param documentKeys The set of keys entries to look up.
   * @return A map of MaybeDocuments indexed by key (if a document cannot be
   *     found, the key will be mapped to null) and a map of sizes indexed by
   *     key (zero if the key cannot be found).
   */
  getSizedEntries(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentSizeEntries> {
    let results = nullableMaybeDocumentMap();
    let sizeMap = new SortedMap<DocumentKey, number>(DocumentKey.comparator);
    documentKeys.forEach(documentKey => {
      const entry = this.docs.get(documentKey);
      results = results.insert(documentKey, entry ? entry.maybeDocument : null);
      sizeMap = sizeMap.insert(documentKey, entry ? entry.size : 0);
    });
    return PersistencePromise.resolve({ maybeDocuments: results, sizeMap });
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap> {
    assert(
      !query.isCollectionGroupQuery(),
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
        value: { maybeDocument }
      } = iterator.getNext();
      if (!query.path.isPrefixOf(key.path)) {
        break;
      }
      if (maybeDocument instanceof Document && query.matches(maybeDocument)) {
        results = results.insert(maybeDocument.key, maybeDocument);
      }
    }
    return PersistencePromise.resolve(results);
  }

  forEachDocumentKey(
    transaction: PersistenceTransaction,
    f: (key: DocumentKey) => PersistencePromise<void>
  ): PersistencePromise<void> {
    return PersistencePromise.forEach(this.docs, key => f(key));
  }

  getNewDocumentChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<MaybeDocumentMap> {
    let changedDocs = maybeDocumentMap();

    this.newDocumentChanges.forEach(key => {
      const entry = this.docs.get(key);
      const changedDoc = entry
        ? entry.maybeDocument
        : new NoDocument(key, SnapshotVersion.forDeletedDoc());
      changedDocs = changedDocs.insert(key, changedDoc);
    });

    this.newDocumentChanges = documentKeySet();

    return PersistencePromise.resolve(changedDocs);
  }

  newChangeBuffer(): RemoteDocumentChangeBuffer {
    return new MemoryRemoteDocumentChangeBuffer(this.sizer, this);
  }

  getSize(txn: PersistenceTransaction): PersistencePromise<number> {
    return PersistencePromise.resolve(this.size);
  }
}

/**
 * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
 */
export class MemoryRemoteDocumentChangeBuffer extends RemoteDocumentChangeBuffer {
  constructor(
    private readonly sizer: DocumentSizer,
    private readonly documentCache: MemoryRemoteDocumentCache
  ) {
    super();
  }

  protected applyChanges(
    transaction: PersistenceTransaction
  ): PersistencePromise<void> {
    const changes = this.assertChanges();
    let delta = 0;
    const docs: DocumentSizeEntry[] = [];
    changes.forEach((key, maybeDocument) => {
      const previousSize = this.documentSizes.get(key);
      assert(
        previousSize !== undefined,
        `Attempting to change document ${key.toString()} without having read it first`
      );
      const size = this.sizer(maybeDocument);
      delta += size - previousSize!;
      docs.push({ maybeDocument, size });
    });

    return this.documentCache.addEntries(transaction, docs, delta);
  }

  protected getFromCache(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<DocumentSizeEntry | null> {
    return this.documentCache.getSizedEntry(transaction, documentKey);
  }

  protected getAllFromCache(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet
  ): PersistencePromise<DocumentSizeEntries> {
    return this.documentCache.getSizedEntries(transaction, documentKeys);
  }
}
