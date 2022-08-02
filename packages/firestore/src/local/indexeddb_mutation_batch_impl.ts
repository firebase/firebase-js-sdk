/**
 * @license
 * Copyright 2020 Google LLC
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

import { DocumentKey } from '../model/document_key';
import { fail, hardAssert } from '../util/assert';

import {
  DbDocumentMutation,
  DbMutationBatch,
  DbRemoteDocument
} from './indexeddb_schema';
import { DbRemoteDocument as DbRemoteDocumentLegacy } from './indexeddb_schema_legacy';
import {
  DbDocumentMutationKey,
  DbDocumentMutationStore,
  DbMutationBatchKey,
  DbMutationBatchStore,
  newDbDocumentMutationKey
} from './indexeddb_sentinels';
import { PersistencePromise } from './persistence_promise';
import { SimpleDbTransaction } from './simple_db';

/**
 * Delete a mutation batch and the associated document mutations.
 * @returns A PersistencePromise of the document mutations that were removed.
 */
export function removeMutationBatch(
  txn: SimpleDbTransaction,
  userId: string,
  batch: { batchId: number; mutations: Array<{ key: DocumentKey }> }
): PersistencePromise<DocumentKey[]> {
  const mutationStore = txn.store<DbMutationBatchKey, DbMutationBatch>(
    DbMutationBatchStore
  );
  const indexTxn = txn.store<DbDocumentMutationKey, DbDocumentMutation>(
    DbDocumentMutationStore
  );
  const promises: Array<PersistencePromise<void>> = [];

  const range = IDBKeyRange.only(batch.batchId);
  let numDeleted = 0;
  const removePromise = mutationStore.iterate(
    { range },
    (key, value, control) => {
      numDeleted++;
      return control.delete();
    }
  );
  promises.push(
    removePromise.next(() => {
      hardAssert(
        numDeleted === 1,
        'Dangling document-mutation reference found: Missing batch ' +
          batch.batchId
      );
    })
  );
  const removedDocuments: DocumentKey[] = [];
  for (const mutation of batch.mutations) {
    const indexKey = newDbDocumentMutationKey(
      userId,
      mutation.key.path,
      batch.batchId
    );
    promises.push(indexTxn.delete(indexKey));
    removedDocuments.push(mutation.key);
  }
  return PersistencePromise.waitFor(promises).next(() => removedDocuments);
}

/**
 * Returns an approximate size for the given document.
 */
export function dbDocumentSize(
  doc: DbRemoteDocument | DbRemoteDocumentLegacy | null
): number {
  if (!doc) {
    return 0;
  }

  let value: unknown;
  if (doc.document) {
    value = doc.document;
  } else if (doc.unknownDocument) {
    value = doc.unknownDocument;
  } else if (doc.noDocument) {
    value = doc.noDocument;
  } else {
    throw fail('Unknown remote document type');
  }
  return JSON.stringify(value).length;
}
