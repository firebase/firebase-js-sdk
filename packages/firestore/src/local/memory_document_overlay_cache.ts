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
import { SortedMap } from '../util/sorted_map';
import { PersistenceTransaction } from './persistence_transaction';
import { PersistencePromise } from './persistence_promise';

/**
 * An in-memory implementation of DocumentOverlayCache.
 */
export class MemoryDocumentOverlayCache implements DocumentOverlayCache {
  // A map sorted by DocumentKey, whose value is a pair of the largest batch id
  // for the overlay and the overlay itself.

  private overlays: SortedMap<DocumentKey, Overlay> = new SortedMap<
    DocumentKey,
    Overlay
  >(DocumentKey.comparator);
  private overlayByBatchId: Map<number, Set<DocumentKey>> = new Map<
    number,
    Set<DocumentKey>
  >();

  getOverlay(
    transaction: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<Overlay | null> {
    return PersistencePromise.resolve(this.overlays.get(key));
  }

  private saveOverlay(
    transaction: PersistenceTransaction,
    largestBatchId: number,
    mutation: Mutation | null
  ): void {
    if (mutation === null) {
      return;
    }

    // Remove the association of the overlay to its batch id.
    const existing = this.overlays.get(mutation.key);
    if (existing !== null) {
      // @ts-ignore: we know the result of `get` is not undefined.
      this.overlayByBatchId.get(existing.largestBatchId).delete(mutation.key);
    }

    this.overlays.insert(mutation.key, new Overlay(largestBatchId, mutation));

    // Create the association of this overlay to the given largestBatchId.
    if (this.overlayByBatchId.get(largestBatchId) === null) {
      this.overlayByBatchId.set(largestBatchId, new Set<DocumentKey>());
    }
    // @ts-ignore: we know the result of `get` is not undefined.
    this.overlayByBatchId.get(largestBatchId).add(mutation.getKey());
  }

  saveOverlays(
    transaction: PersistenceTransaction,
    largestBatchId: number,
    overlays: Map<DocumentKey, Mutation>
  ): PersistencePromise<void> {
    overlays.forEach((mutation, key) => {
      this.saveOverlay(transaction, largestBatchId, mutation);
    });
    return PersistencePromise.resolve();
  }

  removeOverlaysForBatchId(
    transaction: PersistenceTransaction,
    batchId: number
  ): PersistencePromise<void> {
    if (this.overlayByBatchId.has(batchId)) {
      const keys = this.overlayByBatchId.get(batchId);
      this.overlayByBatchId.delete(batchId);
      // @ts-ignore: we know keys is not undefined
      for (const key of keys) {
        this.overlays.remove(key);
      }
    }
    return PersistencePromise.resolve();
  }

  getOverlaysForCollection(
    transaction: PersistenceTransaction,
    collection: ResourcePath,
    sinceBatchId: number
  ): PersistencePromise<Map<DocumentKey, Overlay>> {
    let result: Map<DocumentKey, Overlay> = new Map<DocumentKey, Overlay>();

    const immediateChildrenPathLength = collection.length + 1;
    const prefix = new DocumentKey(collection.child(''));
    let iter = this.overlays.getIteratorFrom(prefix);
    while (iter.hasNext()) {
      const entry = iter.getNext();
      const overlay = entry.value;
      const key = overlay.getKey();
      if (!collection.isPrefixOf(key.path)) {
        break;
      }
      // Documents from sub-collections
      if (key.path.length != immediateChildrenPathLength) {
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
  ): PersistencePromise<Map<DocumentKey, Overlay>> {
    let batchIdToOverlays: SortedMap<
      number,
      Map<DocumentKey, Overlay>
    > = new SortedMap<number, Map<DocumentKey, Overlay>>(
      (key1: number, key2: number) => key1 - key2
    );

    let iter = this.overlays.getIterator();
    while (iter.hasNext()) {
      const entry = iter.getNext();
      const overlay = entry.value;
      const key = overlay.getKey();
      if (key.getCollectionGroup() !== collectionGroup) {
        continue;
      }
      if (overlay.largestBatchId > sinceBatchId) {
        let overlays = batchIdToOverlays.get(overlay.largestBatchId);
        if (overlays === null) {
          overlays = new Map<DocumentKey, Overlay>();
          batchIdToOverlays.insert(overlay.largestBatchId, overlays);
        }
        overlays.set(overlay.getKey(), overlay);
      }
    }

    let result: Map<DocumentKey, Overlay> = new Map<DocumentKey, Overlay>();
    let batchIter = batchIdToOverlays.getIterator();
    while (batchIter.hasNext()) {
      const entry = batchIter.getNext();
      const overlays = entry.value;
      for (const [key, overlay] of Array.from(overlays.entries())) {
        result.set(key, overlay);
      }
      if (result.size >= count) {
        break;
      }
    }
    return PersistencePromise.resolve(result);
  }
}
