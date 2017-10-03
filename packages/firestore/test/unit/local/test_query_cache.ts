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

import { Query } from '../../../../src/firestore/core/query';
import { SnapshotVersion } from '../../../../src/firestore/core/snapshot_version';
import { TargetId } from '../../../../src/firestore/core/types';
import { Persistence } from '../../../../src/firestore/local/persistence';
import { QueryCache } from '../../../../src/firestore/local/query_cache';
import { QueryData } from '../../../../src/firestore/local/query_data';
import { documentKeySet } from '../../../../src/firestore/model/collections';
import { DocumentKey } from '../../../../src/firestore/model/document_key';

/**
 * A wrapper around a QueryCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestQueryCache {
  constructor(public persistence: Persistence, public cache: QueryCache) {}

  start(): Promise<void> {
    return this.persistence.runTransaction('start', txn =>
      this.cache.start(txn)
    );
  }

  addQueryData(queryData: QueryData): Promise<void> {
    return this.persistence.runTransaction('addQueryData', txn => {
      return this.cache.addQueryData(txn, queryData);
    });
  }

  removeQueryData(queryData: QueryData): Promise<void> {
    return this.persistence.runTransaction('addQueryData', txn => {
      return this.cache.removeQueryData(txn, queryData);
    });
  }

  getQueryData(query: Query): Promise<QueryData | null> {
    return this.persistence.runTransaction('getQueryData', txn => {
      return this.cache.getQueryData(txn, query);
    });
  }

  getLastRemoteSnapshotVersion(): SnapshotVersion {
    return this.cache.getLastRemoteSnapshotVersion();
  }

  getHighestTargetId(): TargetId {
    return this.cache.getHighestTargetId();
  }

  addMatchingKeys(keys: DocumentKey[], targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction('addMatchingKeys', txn => {
      let set = documentKeySet();
      for (const key of keys) {
        set = set.add(key);
      }
      return this.cache.addMatchingKeys(txn, set, targetId);
    });
  }

  removeMatchingKeys(keys: DocumentKey[], targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction('removeMatchingKeys', txn => {
      let set = documentKeySet();
      for (const key of keys) {
        set = set.add(key);
      }
      return this.cache.removeMatchingKeys(txn, set, targetId);
    });
  }

  getMatchingKeysForTargetId(targetId: TargetId): Promise<DocumentKey[]> {
    return this.persistence
      .runTransaction('getMatchingKeysForTargetId', txn => {
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
      txn => {
        return this.cache.removeMatchingKeysForTargetId(txn, targetId);
      }
    );
  }

  containsKey(key: DocumentKey): Promise<boolean> {
    return this.persistence.runTransaction('containsKey', txn => {
      return this.cache.containsKey(txn, key);
    });
  }

  setLastRemoteSnapshotVersion(version: SnapshotVersion) {
    return this.persistence.runTransaction(
      'setLastRemoteSnapshotVersion',
      txn => this.cache.setLastRemoteSnapshotVersion(txn, version)
    );
  }
}
