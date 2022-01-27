/**
 * @license
 * Copyright 2022 Google LLC
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

import { DocumentOverlayCache } from './document_overlay_cache';
import { DocumentKey } from '../model/document_key';
import { Overlay } from '../model/overlay';
import { ResourcePath } from '../model/path';
import { Mutation } from '../model/mutation';
import {
  fromDbDocumentOverlay,
  LocalSerializer,
  toDbDocumentOverlay
} from './local_serializer';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';
import { DbDocumentOverlay, DbDocumentOverlayKey } from './indexeddb_schema';
import { getStore } from './indexeddb_transaction';
import { encodeResourcePath } from './encoded_resource_path';
import { PersistencePromise } from './persistence_promise';

/**
 * An in-memory implementation of DocumentOverlayCache.
 */
export class IndexedDbDocumentOverlayCache implements DocumentOverlayCache {
  /**
   * @param serializer - The document serializer.
   * @param userId - The userId for which we are accessing overlays.
   */
  constructor(readonly serializer: LocalSerializer, readonly userId: string) {}

  getOverlay(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<Overlay | null> {
    return documentOverlayStore(transaction)
      .get(dbKey(this.userId, key))
      .next(dbOverlay => {
        if (dbOverlay) {
          return fromDbDocumentOverlay(this.serializer, dbOverlay);
        }
        return null;
      });
  }

  private saveOverlay(
    transaction: PersistenceTransaction,
    largestBatchId: number,
    docKey: DocumentKey,
    mutation: Mutation
  ): void {
    const [uid, collectionPath, docId] = dbKey(this.userId, docKey);
    documentOverlayStore(transaction).put(
      [uid, collectionPath, docId],
      toDbDocumentOverlay(
        this.serializer,
        uid,
        collectionPath,
        docId,
        docKey.getCollectionGroup(),
        largestBatchId,
        mutation
      )
    );
  }

  saveOverlays(
    transaction: PersistenceTransaction,
    largestBatchId: number,
    overlays: Map<DocumentKey, Mutation>
  ): PersistencePromise<void> {
    for (const [docKey, mutation] of Array.from(overlays.entries())) {
      this.saveOverlay(transaction, largestBatchId, docKey, mutation);
    }
    return PersistencePromise.resolve();
  }

  removeOverlaysForBatchId(
    transaction: PersistenceTransaction,
    batchId: number
  ): PersistencePromise<void> {
    const range = IDBKeyRange.bound(
      [this.userId, batchId],
      [this.userId, batchId + 1],
      /*lowerOpen=*/ false,
      /*upperOpen=*/ true
    );
    return documentOverlayStore(transaction).deleteAll(
      DbDocumentOverlay.batchIdOverlayIndex,
      range
    );
  }

  getOverlaysForCollection(
    transaction: PersistenceTransaction,
    collection: ResourcePath,
    sinceBatchId: number
  ): PersistencePromise<Map<DocumentKey, Overlay>> {
    let result: Map<DocumentKey, Overlay> = new Map<DocumentKey, Overlay>();
    const collectionPath: string = encodeResourcePath(collection);
    const range = IDBKeyRange.bound(
      [this.userId, collectionPath, sinceBatchId],
      [this.userId, collectionPath, Number.POSITIVE_INFINITY]
    );
    return documentOverlayStore(transaction)
      .loadAll(DbDocumentOverlay.collectionPathOverlayIndex, range)
      .next(dbOverlays => {
        for (const dbOverlay of dbOverlays) {
          const overlay = fromDbDocumentOverlay(this.serializer, dbOverlay);
          result.set(overlay.getKey(), overlay);
        }
        return result;
      });
  }

  getOverlaysForCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    sinceBatchId: number,
    count: number
  ): PersistencePromise<Map<DocumentKey, Overlay>> {
    // TODO: Figure out what the sqlite query is doing.
    let result: Map<DocumentKey, Overlay> = new Map<DocumentKey, Overlay>();
    const range = IDBKeyRange.bound(
      [this.userId, collectionGroup, sinceBatchId],
      [this.userId, collectionGroup, Number.POSITIVE_INFINITY]
    );
    return documentOverlayStore(transaction)
      .loadAll(DbDocumentOverlay.collectionGroupOverlayIndex, range)
      .next(dbOverlays => {
        for (const dbOverlay of dbOverlays) {
          const overlay = fromDbDocumentOverlay(this.serializer, dbOverlay);
          result.set(overlay.getKey(), overlay);
        }
        return result;
      });
  }
}

/**
 * Helper to get a typed SimpleDbStore for the document overlay object store.
 */
function documentOverlayStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbDocumentOverlayKey, DbDocumentOverlay> {
  return getStore<DbDocumentOverlayKey, DbDocumentOverlay>(
    txn,
    DbDocumentOverlay.store
  );
}

function dbKey(userId: string, docKey: DocumentKey): DbDocumentOverlayKey {
  const docId: string = docKey.path.lastSegment();
  const collectionPath: string = encodeResourcePath(docKey.path.popLast());
  return [userId, collectionPath, docId];
}
