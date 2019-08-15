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
   * Adds the supplied entry to the cache and updates the cache size as appropriate.
   *
   * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
   * returned by `newChangeBuffer()`.
   */
  private addEntry(
    transaction: PersistenceTransaction,
    doc: MaybeDocument
  ): PersistencePromise<void> {
    const key = doc.key;
    const entry = this.docs.get(key);
    const previousSize = entry ? entry.size : 0;
    const currentSize = this.sizer(doc);

    this.docs = this.docs.insert(key, {
      maybeDocument: doc,
      size: currentSize
    });

    this.newDocumentChanges = this.newDocumentChanges.add(key);
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
  private removeEntry(documentKey: DocumentKey): void {
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
    return PersistencePromise.forEach(this.docs, (key: DocumentKey) => f(key));
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
    return new MemoryRemoteDocumentCache.RemoteDocumentChangeBuffer(this);
  }

  getSize(txn: PersistenceTransaction): PersistencePromise<number> {
    return PersistencePromise.resolve(this.size);
  }

  /**
   * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
   */
  private static RemoteDocumentChangeBuffer = class extends RemoteDocumentChangeBuffer {
    constructor(private readonly documentCache: MemoryRemoteDocumentCache) {
      super();
    }

    protected applyChanges(
      transaction: PersistenceTransaction
    ): PersistencePromise<void> {
      const promises: Array<PersistencePromise<void>> = [];
      this.changes.forEach((key, doc) => {
        if (doc) {
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
    ): PersistencePromise<MaybeDocument | null> {
      return this.documentCache.getEntry(transaction, documentKey);
    }

    protected getAllFromCache(
      transaction: PersistenceTransaction,
      documentKeys: DocumentKeySet
    ): PersistencePromise<NullableMaybeDocumentMap> {
      return this.documentCache.getEntries(transaction, documentKeys);
    }
  };
}
