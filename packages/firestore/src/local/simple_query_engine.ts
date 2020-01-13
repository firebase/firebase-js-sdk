/**
 * @license
 * Copyright 2019 Google Inc.
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

import { SnapshotVersion } from '../core/snapshot_version';
import { Query } from '../core/query';
import { DocumentKeySet, DocumentMap } from '../model/collections';
import { assert } from '../util/assert';
import { LocalDocumentsView } from './local_documents_view';
import { QueryEngine } from './query_engine';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

/**
 * A naive implementation of QueryEngine that just loads all the documents in
 * the queried collection and then filters them in memory.
 */
export class SimpleQueryEngine implements QueryEngine {
  private localDocumentsView: LocalDocumentsView | undefined;

  setLocalDocumentsView(localDocuments: LocalDocumentsView): void {
    this.localDocumentsView = localDocuments;
  }

  /** Returns all local documents matching the specified query. */
  getDocumentsMatchingQuery(
    transaction: PersistenceTransaction,
    query: Query,
    lastLimboFreeSnapshotVersion: SnapshotVersion,
    remoteKeys: DocumentKeySet
  ): PersistencePromise<DocumentMap> {
    assert(
      this.localDocumentsView !== undefined,
      'setLocalDocumentsView() not called'
    );

    // TODO: Once LocalDocumentsView provides a getCollectionDocuments()
    // method, we should call that here and then filter the results.
    return this.localDocumentsView.getDocumentsMatchingQuery(
      transaction,
      query,
      SnapshotVersion.MIN
    );
  }
}
