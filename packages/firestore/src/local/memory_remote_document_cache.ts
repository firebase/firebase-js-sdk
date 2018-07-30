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

import { Query } from '../core/query';
import {
  DocumentMap,
  documentMap,
  maybeDocumentMap
} from '../model/collections';
import { Document, MaybeDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { RemoteDocumentCache } from './remote_document_cache';

export class MemoryRemoteDocumentCache implements RemoteDocumentCache {
  private docs = maybeDocumentMap();

  addEntry(
    transaction: PersistenceTransaction,
    maybeDocument: MaybeDocument
  ): PersistencePromise<void> {
    this.docs = this.docs.insert(maybeDocument.key, maybeDocument);
    return PersistencePromise.resolve();
  }

  removeEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<void> {
    this.docs = this.docs.remove(documentKey);
    return PersistencePromise.resolve();
  }

  getEntry(
    transaction: PersistenceTransaction,
    documentKey: DocumentKey
  ): PersistencePromise<MaybeDocument | null> {
    return PersistencePromise.resolve(this.docs.get(documentKey));
  }

  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query
  ): PersistencePromise<DocumentMap> {
    let results = documentMap();

    // Documents are ordered by key, so we can use a prefix scan to narrow down
    // the documents we need to match the query against.
    const prefix = new DocumentKey(query.path.child(''));
    const iterator = this.docs.getIteratorFrom(prefix);
    while (iterator.hasNext()) {
      const { key, value: maybeDoc } = iterator.getNext();
      if (!query.path.isPrefixOf(key.path)) {
        break;
      }
      if (maybeDoc instanceof Document && query.matches(maybeDoc)) {
        results = results.insert(maybeDoc.key, maybeDoc);
      }
    }
    return PersistencePromise.resolve(results);
  }
}
