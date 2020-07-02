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

import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { IndexedDbRemoteDocumentCache } from '../../../src/local/indexeddb_remote_document_cache';
import { Persistence } from '../../../src/local/persistence';
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
import { debugAssert } from '../../../src/util/assert';

/**
 * A wrapper around a RemoteDocumentCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestRemoteDocumentCache {
  private readonly cache: RemoteDocumentCache;

  constructor(private readonly persistence: Persistence) {
    this.cache = persistence.getRemoteDocumentCache();
  }

  /**
   * Reads all of the documents first so we can safely add them and keep the size calculation in
   * sync.
   */
  addEntries(
    maybeDocuments: MaybeDocument[],
    readTime: SnapshotVersion
  ): Promise<void> {
    return this.persistence.runTransaction(
      'addEntry',
      'readwrite-primary',
      txn => {
        const changeBuffer = this.newChangeBuffer();
        return PersistencePromise.forEach(
          maybeDocuments,
          (maybeDocument: MaybeDocument) =>
            changeBuffer.getEntry(txn, maybeDocument.key).next(() => {})
        ).next(() => {
          for (const maybeDocument of maybeDocuments) {
            changeBuffer.addEntry(maybeDocument, readTime);
          }
          return changeBuffer.apply(txn);
        });
      }
    );
  }

  /**
   * Adds a single document using the document's version as its read time.
   * Reads the document first to track the document size internally.
   */
  addEntry(maybeDocument: MaybeDocument): Promise<void> {
    return this.addEntries([maybeDocument], maybeDocument.version);
  }

  removeEntry(
    documentKey: DocumentKey,
    version?: SnapshotVersion
  ): Promise<void> {
    return this.persistence.runTransaction(
      'removeEntry',
      'readwrite-primary',
      txn => {
        const changeBuffer = this.newChangeBuffer(
          version ? { trackRemovals: true } : undefined
        );
        return changeBuffer.getEntry(txn, documentKey).next(() => {
          changeBuffer.removeEntry(documentKey, version);
          return changeBuffer.apply(txn);
        });
      }
    );
  }

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

  getDocumentsMatchingQuery(
    query: Query,
    sinceReadTime: SnapshotVersion
  ): Promise<DocumentMap> {
    return this.persistence.runTransaction(
      'getDocumentsMatchingQuery',
      'readonly',
      txn => {
        return this.cache.getDocumentsMatchingQuery(txn, query, sinceReadTime);
      }
    );
  }

  getNewDocumentChanges(
    sinceReadTime: SnapshotVersion
  ): Promise<{
    changedDocs: MaybeDocumentMap;
    readTime: SnapshotVersion;
  }> {
    return this.persistence.runTransaction(
      'getNewDocumentChanges',
      'readonly',
      txn => {
        debugAssert(
          this.cache instanceof IndexedDbRemoteDocumentCache,
          'getNewDocumentChanges() requires IndexedDB'
        );
        return this.cache.getNewDocumentChanges(txn, sinceReadTime);
      }
    );
  }

  getSize(): Promise<number> {
    return this.persistence.runTransaction('get size', 'readonly', txn =>
      this.cache.getSize(txn)
    );
  }

  newChangeBuffer(options?: {
    trackRemovals: boolean;
  }): RemoteDocumentChangeBuffer {
    return this.cache.newChangeBuffer(options);
  }
}
