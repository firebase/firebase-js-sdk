/**
 * @license
 * Copyright 2017 Google LLC
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

import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { Target } from '../../../src/core/target';
import { ListenSequenceNumber, TargetId } from '../../../src/core/types';
import { Persistence } from '../../../src/local/persistence';
import { TargetCache } from '../../../src/local/target_cache';
import { TargetData } from '../../../src/local/target_data';
import { documentKeySet } from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';

/**
 * A wrapper around a TargetCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestTargetCache {
  constructor(public persistence: Persistence, public cache: TargetCache) {}

  addTargetData(targetData: TargetData): Promise<void> {
    return this.persistence.runTransaction(
      'addTargetData',
      'readwrite',
      txn => {
        return this.cache.addTargetData(txn, targetData);
      }
    );
  }

  updateTargetData(targetData: TargetData): Promise<void> {
    return this.persistence.runTransaction(
      'updateTargetData',
      'readwrite-primary',
      txn => {
        return this.cache.updateTargetData(txn, targetData);
      }
    );
  }

  getTargetCount(): Promise<number> {
    return this.persistence.runTransaction(
      'getTargetCount',
      'readonly',
      txn => {
        return this.cache.getTargetCount(txn);
      }
    );
  }

  removeTargetData(targetData: TargetData): Promise<void> {
    return this.persistence.runTransaction(
      'addTargetData',
      'readwrite-primary',
      txn => {
        return this.cache.removeTargetData(txn, targetData);
      }
    );
  }

  getTargetData(target: Target): Promise<TargetData | null> {
    return this.persistence.runTransaction('getTargetData', 'readonly', txn => {
      return this.cache.getTargetData(txn, target);
    });
  }

  getLastRemoteSnapshotVersion(): Promise<SnapshotVersion> {
    return this.persistence.runTransaction(
      'getLastRemoteSnapshotVersion',
      'readonly',
      txn => {
        return this.cache.getLastRemoteSnapshotVersion(txn);
      }
    );
  }

  getHighestSequenceNumber(): Promise<ListenSequenceNumber> {
    return this.persistence.runTransaction(
      'getHighestSequenceNumber',
      'readonly',
      txn => {
        return this.cache.getHighestSequenceNumber(txn);
      }
    );
  }

  allocateTargetId(): Promise<TargetId> {
    return this.persistence.runTransaction(
      'allocateTargetId',
      'readwrite',
      txn => {
        return this.cache.allocateTargetId(txn);
      }
    );
  }

  addMatchingKeys(keys: DocumentKey[], targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction(
      'addMatchingKeys',
      'readwrite-primary',
      txn => {
        let set = documentKeySet();
        for (const key of keys) {
          set = set.add(key);
        }
        return this.cache.addMatchingKeys(txn, set, targetId);
      }
    );
  }

  removeMatchingKeys(keys: DocumentKey[], targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction(
      'removeMatchingKeys',
      'readwrite-primary',
      txn => {
        let set = documentKeySet();
        for (const key of keys) {
          set = set.add(key);
        }
        return this.cache.removeMatchingKeys(txn, set, targetId);
      }
    );
  }

  getMatchingKeysForTargetId(targetId: TargetId): Promise<DocumentKey[]> {
    return this.persistence
      .runTransaction('getMatchingKeysForTargetId', 'readonly', txn => {
        return this.cache.getMatchingKeysForTargetId(txn, targetId);
      })
      .then(keySet => {
        const result: DocumentKey[] = [];
        keySet.forEach(key => result.push(key));
        return result;
      });
  }

  removeMatchingKeysForTargetId(targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction(
      'removeMatchingKeysForTargetId',
      'readwrite-primary',
      txn => {
        return this.cache.removeMatchingKeysForTargetId(txn, targetId);
      }
    );
  }

  containsKey(key: DocumentKey): Promise<boolean> {
    return this.persistence.runTransaction('containsKey', 'readonly', txn => {
      return this.cache.containsKey(txn, key);
    });
  }

  setTargetsMetadata(
    highestListenSequenceNumber: ListenSequenceNumber,
    lastRemoteSnapshotVersion?: SnapshotVersion
  ): Promise<void> {
    return this.persistence.runTransaction(
      'setTargetsMetadata',
      'readwrite-primary',
      txn =>
        this.cache.setTargetsMetadata(
          txn,
          highestListenSequenceNumber,
          lastRemoteSnapshotVersion
        )
    );
  }
}
