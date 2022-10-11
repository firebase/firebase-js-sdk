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

import { DocumentOverlayCache } from '../../../src/local/document_overlay_cache';
import { Persistence } from '../../../src/local/persistence';
import {
  DocumentKeySet,
  MutationMap,
  OverlayMap
} from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import { Mutation } from '../../../src/model/mutation';
import { Overlay } from '../../../src/model/overlay';
import { ResourcePath } from '../../../src/model/path';
import { key } from '../../util/helpers';

/**
 * A wrapper around a DocumentOverlayCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestDocumentOverlayCache {
  constructor(
    private persistence: Persistence,
    private cache: DocumentOverlayCache
  ) {}

  saveOverlays(largestBatch: number, data: MutationMap): Promise<void> {
    return this.persistence.runTransaction('saveOverlays', 'readwrite', txn => {
      return this.cache.saveOverlays(txn, largestBatch, data);
    });
  }

  getOverlay(key: DocumentKey): Promise<Overlay | null> {
    return this.persistence.runTransaction('getOverlay', 'readonly', txn => {
      return this.cache.getOverlay(txn, key);
    });
  }

  getOverlays(keys: DocumentKey[]): Promise<OverlayMap> {
    return this.persistence.runTransaction('getOverlays', 'readonly', txn => {
      return this.cache.getOverlays(txn, keys);
    });
  }

  getOverlayMutation(docKey: string): Promise<Mutation | null> {
    return this.getOverlay(key(docKey)).then(value => {
      if (!value) {
        return null;
      }
      return value.mutation;
    });
  }

  getOverlaysForCollection(
    path: ResourcePath,
    sinceBatchId: number
  ): Promise<OverlayMap> {
    return this.persistence.runTransaction(
      'getOverlaysForCollection',
      'readonly',
      txn => {
        return this.cache.getOverlaysForCollection(txn, path, sinceBatchId);
      }
    );
  }

  getOverlaysForCollectionGroup(
    collectionGroup: string,
    sinceBatchId: number,
    count: number
  ): Promise<OverlayMap> {
    return this.persistence.runTransaction(
      'getOverlaysForCollectionGroup',
      'readonly',
      txn => {
        return this.cache.getOverlaysForCollectionGroup(
          txn,
          collectionGroup,
          sinceBatchId,
          count
        );
      }
    );
  }

  removeOverlaysForBatchId(
    documentKeys: DocumentKeySet,
    batchId: number
  ): Promise<void> {
    return this.persistence.runTransaction(
      'removeOverlaysForBatchId',
      'readwrite-primary',
      txn => {
        return this.cache.removeOverlaysForBatchId(txn, documentKeys, batchId);
      }
    );
  }
}
