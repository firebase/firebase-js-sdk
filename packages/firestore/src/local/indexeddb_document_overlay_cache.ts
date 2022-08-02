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
import {
  DocumentKeySet,
  MutationMap,
  OverlayMap,
  newOverlayMap
} from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { Overlay } from '../model/overlay';
import { ResourcePath } from '../model/path';

import { DocumentOverlayCache } from './document_overlay_cache';
import { encodeResourcePath } from './encoded_resource_path';
import { DbDocumentOverlay } from './indexeddb_schema';
import {
  DbDocumentOverlayCollectionGroupOverlayIndex,
  DbDocumentOverlayCollectionPathOverlayIndex,
  DbDocumentOverlayKey,
  DbDocumentOverlayStore
} from './indexeddb_sentinels';
import { getStore } from './indexeddb_transaction';
import {
  fromDbDocumentOverlay,
  LocalSerializer,
  toDbDocumentOverlay,
  toDbDocumentOverlayKey
} from './local_serializer';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';

/**
 * Implementation of DocumentOverlayCache using IndexedDb.
 */
export class IndexedDbDocumentOverlayCache implements DocumentOverlayCache {
  /**
   * @param serializer - The document serializer.
   * @param userId - The userId for which we are accessing overlays.
   */
  constructor(
    private readonly serializer: LocalSerializer,
    private readonly userId: string
  ) {}

  static forUser(
    serializer: LocalSerializer,
    user: User
  ): IndexedDbDocumentOverlayCache {
    const userId = user.uid || '';
    return new IndexedDbDocumentOverlayCache(serializer, userId);
  }

  getOverlay(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<Overlay | null> {
    return documentOverlayStore(transaction)
      .get(toDbDocumentOverlayKey(this.userId, key))
      .next(dbOverlay => {
        if (dbOverlay) {
          return fromDbDocumentOverlay(this.serializer, dbOverlay);
        }
        return null;
      });
  }

  getOverlays(
    transaction: PersistenceTransaction,
    keys: DocumentKey[]
  ): PersistencePromise<OverlayMap> {
    const result = newOverlayMap();
    return PersistencePromise.forEach(keys, (key: DocumentKey) => {
      return this.getOverlay(transaction, key).next(overlay => {
        if (overlay !== null) {
          result.set(key, overlay);
        }
      });
    }).next(() => result);
  }

  saveOverlays(
    transaction: PersistenceTransaction,
    largestBatchId: number,
    overlays: MutationMap
  ): PersistencePromise<void> {
    const promises: Array<PersistencePromise<void>> = [];
    overlays.forEach((_, mutation) => {
      const overlay = new Overlay(largestBatchId, mutation);
      promises.push(this.saveOverlay(transaction, overlay));
    });
    return PersistencePromise.waitFor(promises);
  }

  removeOverlaysForBatchId(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet,
    batchId: number
  ): PersistencePromise<void> {
    const collectionPaths = new Set<string>();

    // Get the set of unique collection paths.
    documentKeys.forEach(key =>
      collectionPaths.add(encodeResourcePath(key.getCollectionPath()))
    );

    const promises: Array<PersistencePromise<void>> = [];
    collectionPaths.forEach(collectionPath => {
      const range = IDBKeyRange.bound(
        [this.userId, collectionPath, batchId],
        [this.userId, collectionPath, batchId + 1],
        /*lowerOpen=*/ false,
        /*upperOpen=*/ true
      );
      promises.push(
        documentOverlayStore(transaction).deleteAll(
          DbDocumentOverlayCollectionPathOverlayIndex,
          range
        )
      );
    });
    return PersistencePromise.waitFor(promises);
  }

  getOverlaysForCollection(
    transaction: PersistenceTransaction,
    collection: ResourcePath,
    sinceBatchId: number
  ): PersistencePromise<OverlayMap> {
    const result = newOverlayMap();
    const collectionPath = encodeResourcePath(collection);
    // We want batch IDs larger than `sinceBatchId`, and so the lower bound
    // is not inclusive.
    const range = IDBKeyRange.bound(
      [this.userId, collectionPath, sinceBatchId],
      [this.userId, collectionPath, Number.POSITIVE_INFINITY],
      /*lowerOpen=*/ true
    );
    return documentOverlayStore(transaction)
      .loadAll(DbDocumentOverlayCollectionPathOverlayIndex, range)
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
  ): PersistencePromise<OverlayMap> {
    const result = newOverlayMap();
    let currentBatchId: number | undefined = undefined;
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
          index: DbDocumentOverlayCollectionGroupOverlayIndex,
          range
        },
        (_, dbOverlay, control) => {
          // We do not want to return partial batch overlays, even if the size
          // of the result set exceeds the given `count` argument. Therefore, we
          // continue to aggregate results even after the result size exceeds
          // `count` if there are more overlays from the `currentBatchId`.
          const overlay = fromDbDocumentOverlay(this.serializer, dbOverlay);
          if (
            result.size() < count ||
            overlay.largestBatchId === currentBatchId
          ) {
            result.set(overlay.getKey(), overlay);
            currentBatchId = overlay.largestBatchId;
          } else {
            control.done();
          }
        }
      )
      .next(() => result);
  }

  private saveOverlay(
    transaction: PersistenceTransaction,
    overlay: Overlay
  ): PersistencePromise<void> {
    return documentOverlayStore(transaction).put(
      toDbDocumentOverlay(this.serializer, this.userId, overlay)
    );
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
    DbDocumentOverlayStore
  );
}
