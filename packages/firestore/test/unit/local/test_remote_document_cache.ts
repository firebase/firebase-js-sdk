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

import { Query } from '../../../src/core/query';
import { Persistence } from '../../../src/local/persistence';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { DocumentMap } from '../../../src/model/collections';
import { MaybeDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';

/**
 * A wrapper around a RemoteDocumentCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestRemoteDocumentCache {
  constructor(
    public persistence: Persistence,
    public cache: RemoteDocumentCache
  ) {}

  start(): Promise<void> {
    return this.persistence.runTransaction('start', true, txn => {
      return this.cache.start(txn);
    });
  }

  addEntries(maybeDocuments: MaybeDocument[]): Promise<void> {
    return this.persistence.runTransaction('addEntry', true, txn => {
      return this.cache.addEntries(txn, maybeDocuments);
    });
  }

  removeEntry(documentKey: DocumentKey): Promise<void> {
    return this.persistence.runTransaction('removeEntry', true, txn => {
      return this.cache.removeEntry(txn, documentKey);
    });
  }

  getEntry(documentKey: DocumentKey): Promise<MaybeDocument | null> {
    return this.persistence.runTransaction('getEntry', true, txn => {
      return this.cache.getEntry(txn, documentKey);
    });
  }

  getDocumentsMatchingQuery(query: Query): Promise<DocumentMap> {
    return this.persistence.runTransaction(
      'getDocumentsMatchingQuery',
      true,
      txn => {
        return this.cache.getDocumentsMatchingQuery(txn, query);
      }
    );
  }

  getNextDocumentChanges(): Promise<MaybeDocument[]> {
    return this.persistence.runTransaction(
      'getNextDocumentChanges',
      true,
      txn => {
        return this.cache.getNewDocumentChanges(txn);
      }
    );
  }
}
