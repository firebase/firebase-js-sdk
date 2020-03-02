/**
 * @license
 * Copyright 2020 Google Inc.
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
import {NamedQueryCache} from "./named_query_cache";
import {PersistenceTransaction} from "./persistence";
import {PersistencePromise} from "./persistence_promise";
import {SnapshotVersion} from "../core/snapshot_version";
import {Target} from "../core/target";
import {SimpleDbStore} from "./simple_db";
import {
  DbNamedQuery,
  DbNamedQueryKey,
  DbQuery,
  DbTarget,
  DbTargetKey, DbTimestamp
} from "./indexeddb_schema";
import {IndexedDbPersistence} from "./indexeddb_persistence";
import {Timestamp} from "../api/timestamp";
import {BundleMetadata, NamedBundleQuery} from "../util/bundle";
import {firestoreV1ApiClientInterfaces} from "../protos/firestore_proto_api";
import QueryTarget = firestoreV1ApiClientInterfaces.QueryTarget;
import {immediateSuccessor} from "../util/misc";


export class IndexedDbNamedQueryCache implements NamedQueryCache {
  clear(transaction: PersistenceTransaction, bundleId: string): PersistencePromise<void> {
    const range = IDBKeyRange.bound(
      [bundleId, ""], [immediateSuccessor(bundleId), ""], false, true
    );
    return namedQueryStore(transaction).delete(range);
  }

  getBundleCreateTime(transaction: PersistenceTransaction, bundleId: string): PersistencePromise<SnapshotVersion | null> {
    const range = IDBKeyRange.bound(
      [bundleId, ""], [immediateSuccessor(bundleId), ""], false, true
    );
    let result:SnapshotVersion | null = null;
    return namedQueryStore(transaction).iterate({range},
      (key, value, control) => {
        if(key[0] === bundleId) {
          result = SnapshotVersion.fromTimestamp(
            new Timestamp(
              value.bundleCreateTime.seconds,
              value.bundleCreateTime.nanoseconds
            ));
        }

        control.done();
      }).next(() => result);
  }

  getNamedQuery(transaction: PersistenceTransaction, bundleId: string, queryName: string): PersistencePromise<Target | null> {
    return PersistencePromise.reject(new Error('Not implemented'));
  }

  setNamedQuery(transaction: PersistenceTransaction, bundleMetadata: BundleMetadata, queryName: string, query: NamedBundleQuery): PersistencePromise<void> {
    return namedQueryStore(transaction).add(
      {
        bundleId: bundleMetadata.name as string,
        bundleCreateTime: new DbTimestamp(bundleMetadata.createTime?.seconds!, bundleMetadata.createTime?.nanos!),
        name: queryName,
        query: query.queryTarget as QueryTarget,
        queryReadTime: new DbTimestamp(query.readTime?.seconds!, query.readTime?.nanos!),
      }
    ).next();
  }
}

function namedQueryStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbNamedQueryKey, DbNamedQuery> {
  return IndexedDbPersistence.getStore<DbNamedQueryKey, DbNamedQuery>(
    txn,
    DbNamedQuery.store
  );
}
