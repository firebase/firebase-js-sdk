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

import {
  documentKeySet,
  DocumentKeySet,
  MutationMap,
  OverlayMap,
  newOverlayMap
} from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { Mutation } from '../model/mutation';
import { Overlay } from '../model/overlay';
import { ResourcePath } from '../model/path';
import { SortedMap } from '../util/sorted_map';

import { DocumentOverlayCache } from './document_overlay_cache';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';

/**
 * An in-memory implementation of DocumentOverlayCache.
 */
export class MemoryDocumentOverlayCache implements DocumentOverlayCache {
  // A map sorted by DocumentKey, whose value is a pair of the largest batch id
  // for the overlay and the overlay itself.
  private overlays = new SortedMap<DocumentKey, Overlay>(
    DocumentKey.comparator
  );
  private overlayByBatchId = new Map<number, DocumentKeySet>();

  getOverlay(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<Overlay | null> {
    return PersistencePromise.resolve(this.overlays.get(key));
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
    overlays.forEach((_, mutation) => {
      this.saveOverlay(transaction, largestBatchId, mutation);
    });
    return PersistencePromise.resolve();
  }

  removeOverlaysForBatchId(
    transaction: PersistenceTransaction,
    documentKeys: DocumentKeySet,
    batchId: number
  ): PersistencePromise<void> {
    const keys = this.overlayByBatchId.get(batchId);
    if (keys !== undefined) {
      keys.forEach(key => (this.overlays = this.overlays.remove(key)));
      this.overlayByBatchId.delete(batchId);
    }
    return PersistencePromise.resolve();
  }

  getOverlaysForCollection(
    transaction: PersistenceTransaction,
    collection: ResourcePath,
    sinceBatchId: number
  ): PersistencePromise<OverlayMap> {
    const result = newOverlayMap();

    const immediateChildrenPathLength = collection.length + 1;
    const prefix = new DocumentKey(collection.child(''));
    const iter = this.overlays.getIteratorFrom(prefix);
    while (iter.hasNext()) {
      const entry = iter.getNext();
      const overlay = entry.value;
      const key = overlay.getKey();
      if (!collection.isPrefixOf(key.path)) {
        break;
      }
      // Documents from sub-collections
      if (key.path.length !== immediateChildrenPathLength) {
        continue;
      }
      if (overlay.largestBatchId > sinceBatchId) {
        result.set(overlay.getKey(), overlay);
      }
    }

    return PersistencePromise.resolve(result);
  }

  getOverlaysForCollectionGroup(
    transaction: PersistenceTransaction,
    collectionGroup: string,
    sinceBatchId: number,
    count: number
  ): PersistencePromise<OverlayMap> {
    let batchIdToOverlays = new SortedMap<number, OverlayMap>(
      (key1: number, key2: number) => key1 - key2
    );

    const iter = this.overlays.getIterator();
    while (iter.hasNext()) {
      const entry = iter.getNext();
      const overlay = entry.value;
      const key = overlay.getKey();
      if (key.getCollectionGroup() !== collectionGroup) {
        continue;
      }
      if (overlay.largestBatchId > sinceBatchId) {
        let overlaysForBatchId = batchIdToOverlays.get(overlay.largestBatchId);
        if (overlaysForBatchId === null) {
          overlaysForBatchId = newOverlayMap();
          batchIdToOverlays = batchIdToOverlays.insert(
            overlay.largestBatchId,
            overlaysForBatchId
          );
        }
        overlaysForBatchId.set(overlay.getKey(), overlay);
      }
    }

    const result = newOverlayMap();
    const batchIter = batchIdToOverlays.getIterator();
    while (batchIter.hasNext()) {
      const entry = batchIter.getNext();
      const overlays = entry.value;
      overlays.forEach((key, overlay) => result.set(key, overlay));
      if (result.size() >= count) {
        break;
      }
    }
    return PersistencePromise.resolve(result);
  }

  private saveOverlay(
    transaction: PersistenceTransaction,
    largestBatchId: number,
    mutation: Mutation
  ): void {
    // Remove the association of the overlay to its batch id.
    const existing = this.overlays.get(mutation.key);
    if (existing !== null) {
      const newSet = this.overlayByBatchId
        .get(existing.largestBatchId)!
        .delete(mutation.key);
      this.overlayByBatchId.set(existing.largestBatchId, newSet);
    }

    this.overlays = this.overlays.insert(
      mutation.key,
      new Overlay(largestBatchId, mutation)
    );

    // Create the association of this overlay to the given largestBatchId.
    let batch = this.overlayByBatchId.get(largestBatchId);
    if (batch === undefined) {
      batch = documentKeySet();
      this.overlayByBatchId.set(largestBatchId, batch);
    }
    this.overlayByBatchId.set(largestBatchId, batch.add(mutation.key));
  }
}
