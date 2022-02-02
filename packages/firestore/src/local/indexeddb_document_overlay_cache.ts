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

import { User } from '../auth/user';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { Overlay } from '../model/overlay';
import { ResourcePath } from '../model/path';

import { DocumentOverlayCache } from './document_overlay_cache';
import { encodeResourcePath } from './encoded_resource_path';
import { DbDocumentOverlay, DbDocumentOverlayKey } from './indexeddb_schema';
import { getStore } from './indexeddb_transaction';
import {
  fromDbDocumentOverlay,
  LocalSerializer,
  toDbDocumentOverlay
} from './local_serializer';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';

/**
 * An in-memory implementation of DocumentOverlayCache.
 */
export class IndexedDbDocumentOverlayCache implements DocumentOverlayCache {
  /**
   * @param serializer - The document serializer.
   * @param userId - The userId for which we are accessing overlays.
   */
  constructor(readonly serializer: LocalSerializer, readonly userId: string) {}

  static forUser(
    serializer: LocalSerializer,
    user: User
  ): IndexedDbDocumentOverlayCache {
    const userId = user.isAuthenticated() ? user.uid! : '';
    return new IndexedDbDocumentOverlayCache(serializer, userId);
  }

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
  ): PersistencePromise<void> {
    const [uid, collectionPath, docId] = dbKey(this.userId, docKey);
    return documentOverlayStore(transaction).put(
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
    const promises: Array<PersistencePromise<void>> = [];
    for (const [docKey, mutation] of Array.from(overlays.entries())) {
      promises.push(
        this.saveOverlay(transaction, largestBatchId, docKey, mutation)
      );
    }
    return PersistencePromise.waitFor(promises);
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
    const result: Map<DocumentKey, Overlay> = new Map<DocumentKey, Overlay>();
    const collectionPath: string = encodeResourcePath(collection);
    // We want batch IDs larger than `sinceBatchId`, and so the lower bound
    // is not inclusive.
    const range = IDBKeyRange.bound(
      [this.userId, collectionPath, sinceBatchId],
      [this.userId, collectionPath, Number.POSITIVE_INFINITY],
      /*lowerOpen=*/ true
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
    const result: Map<DocumentKey, Overlay> = new Map<DocumentKey, Overlay>();
    let currentBatchId: number | undefined = undefined;
    let currentCount: number = 0;
    // We want batch IDs larger than `sinceBatchId`, and so the lower bound
    // is not inclusive.
    const range = IDBKeyRange.bound(
      [this.userId, collectionGroup, sinceBatchId],
      [this.userId, collectionGroup, Number.POSITIVE_INFINITY],
      /*lowerOpen=*/ true
    );
    return documentOverlayStore(transaction)
      .iterate(
        {
          index: DbDocumentOverlay.collectionGroupOverlayIndex,
          range
        },
        (_, dbOverlay, control) => {
          const overlay = fromDbDocumentOverlay(this.serializer, dbOverlay);
          if (
            currentCount < count ||
            overlay.largestBatchId === currentBatchId
          ) {
            result.set(overlay.getKey(), overlay);
            currentBatchId = overlay.largestBatchId;
            ++currentCount;
          } else {
            control.done();
          }
        }
      )
      .next(() => result);
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
