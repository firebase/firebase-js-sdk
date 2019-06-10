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

import { Query } from '../../../src/core/query';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { IndexedDbRemoteDocumentCache } from '../../../src/local/indexeddb_remote_document_cache';
import { MemoryPersistence } from '../../../src/local/memory_persistence';
import { MemoryRemoteDocumentCache } from '../../../src/local/memory_remote_document_cache';
import {
  Persistence,
  PersistenceTransaction
} from '../../../src/local/persistence';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { RemoteDocumentChangeBuffer } from '../../../src/local/remote_document_change_buffer';
import {
  DocumentKeySet,
  DocumentMap,
  MaybeDocumentMap,
  NullableMaybeDocumentMap
} from '../../../src/model/collections';
import { MaybeDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';

/**
 * A wrapper around a RemoteDocumentCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export abstract class TestRemoteDocumentCache {
  protected constructor(
    private readonly persistence: Persistence,
    protected cache: RemoteDocumentCache
  ) {}

  /**
   * Reads all of the documents first so we can safely add them and keep the size calculation in
   * sync.
   */
  addEntries(maybeDocuments: MaybeDocument[]): Promise<void> {
    return this.persistence.runTransaction(
      'addEntry',
      'readwrite-primary',
      txn => {
        const changeBuffer = this.cache.newChangeBuffer();
        return PersistencePromise.forEach(
          maybeDocuments,
          (maybeDocument: MaybeDocument) =>
            changeBuffer.getEntry(txn, maybeDocument.key).next(() => {})
        ).next(() => {
          for (const maybeDocument of maybeDocuments) {
            changeBuffer.addEntry(maybeDocument);
          }
          return changeBuffer.apply(txn);
        });
      }
    );
  }

  removeEntry(documentKey: DocumentKey): Promise<number> {
    return this.persistence.runTransaction(
      'removeEntry',
      'readwrite-primary',
      txn => {
        return this.removeInternal(txn, documentKey);
      }
    );
  }

  protected abstract removeInternal(
    txn: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<number>;

  getEntry(documentKey: DocumentKey): Promise<MaybeDocument | null> {
    return this.persistence.runTransaction('getEntry', 'readonly', txn => {
      return this.cache.getEntry(txn, documentKey);
    });
  }

  getEntries(documentKeys: DocumentKeySet): Promise<NullableMaybeDocumentMap> {
    return this.persistence.runTransaction('getEntries', 'readonly', txn => {
      return this.cache.getEntries(txn, documentKeys);
    });
  }

  getDocumentsMatchingQuery(query: Query): Promise<DocumentMap> {
    return this.persistence.runTransaction(
      'getDocumentsMatchingQuery',
      'readonly',
      txn => {
        return this.cache.getDocumentsMatchingQuery(txn, query);
      }
    );
  }

  getNewDocumentChanges(): Promise<MaybeDocumentMap> {
    return this.persistence.runTransaction(
      'getNewDocumentChanges',
      'readonly',
      txn => {
        return this.cache.getNewDocumentChanges(txn);
      }
    );
  }

  removeDocumentChangesThroughChangeId(changeId: number): Promise<void> {
    return this.persistence.runTransaction(
      'removeDocumentChangesThroughChangeId',
      'readwrite-primary',
      txn => {
        if (!(this.cache instanceof IndexedDbRemoteDocumentCache)) {
          throw new Error(
            'Can only removeDocumentChangesThroughChangeId() in IndexedDb'
          );
        }
        return this.cache.removeDocumentChangesThroughChangeId(txn, changeId);
      }
    );
  }

  getSize(): Promise<number> {
    return this.persistence.runTransaction('get size', 'readonly', txn =>
      this.cache.getSize(txn)
    );
  }

  newChangeBuffer(): RemoteDocumentChangeBuffer {
    return this.cache.newChangeBuffer();
  }
}

export class TestMemoryRemoteDocumentCache extends TestRemoteDocumentCache {
  // Keep a strongly typed reference
  private memoryCache: MemoryRemoteDocumentCache;

  constructor(persistence: MemoryPersistence) {
    const memoryCache = persistence.getRemoteDocumentCache();
    super(persistence, memoryCache);
    this.memoryCache = memoryCache;
  }

  protected removeInternal(
    txn: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<number> {
    return this.memoryCache.removeEntry(txn, documentKey);
  }
}

export class TestIndexedDbRemoteDocumentCache extends TestRemoteDocumentCache {
  // Keep a strongly typed reference
  private indexedDbCache: IndexedDbRemoteDocumentCache;

  constructor(persistence: IndexedDbPersistence) {
    const indexedDbCache = persistence.getRemoteDocumentCache();
    super(persistence, indexedDbCache);
    this.indexedDbCache = indexedDbCache;
  }

  /**
   * In contrast with the memory implementation, the IndexedDb implementation expects the remove
   * caller to call update size after removing a series of documents. Mimic that for the tests.
   */
  protected removeInternal(
    txn: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<number> {
    return this.indexedDbCache
      .removeEntry(txn, documentKey)
      .next(bytesRemoved => {
        return this.indexedDbCache
          .updateSize(txn, -bytesRemoved)
          .next(() => bytesRemoved);
      });
  }
}
