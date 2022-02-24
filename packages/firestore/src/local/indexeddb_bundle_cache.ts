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

import { BundleMetadata, NamedQuery } from '../core/bundle';
import {
  BundleMetadata as ProtoBundleMetadata,
  NamedQuery as ProtoNamedQuery
} from '../protos/firestore_bundle_proto';

import { BundleCache } from './bundle_cache';
import { DbBundle, DbNamedQuery } from './indexeddb_schema';
import {
  DbBundlesKey,
  DbBundleStore,
  DbNamedQueriesKey,
  DbNamedQueryStore
} from './indexeddb_sentinels';
import { getStore } from './indexeddb_transaction';
import {
  fromDbBundle,
  fromDbNamedQuery,
  toDbBundle,
  toDbNamedQuery
} from './local_serializer';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';

export class IndexedDbBundleCache implements BundleCache {
  getBundleMetadata(
    transaction: PersistenceTransaction,
    bundleId: string
  ): PersistencePromise<BundleMetadata | undefined> {
    return bundlesStore(transaction)
      .get(bundleId)
      .next(bundle => {
        if (bundle) {
          return fromDbBundle(bundle);
        }
        return undefined;
      });
  }

  saveBundleMetadata(
    transaction: PersistenceTransaction,
    bundleMetadata: ProtoBundleMetadata
  ): PersistencePromise<void> {
    return bundlesStore(transaction).put(toDbBundle(bundleMetadata));
  }

  getNamedQuery(
    transaction: PersistenceTransaction,
    queryName: string
  ): PersistencePromise<NamedQuery | undefined> {
    return namedQueriesStore(transaction)
      .get(queryName)
      .next(query => {
        if (query) {
          return fromDbNamedQuery(query);
        }
        return undefined;
      });
  }

  saveNamedQuery(
    transaction: PersistenceTransaction,
    query: ProtoNamedQuery
  ): PersistencePromise<void> {
    return namedQueriesStore(transaction).put(toDbNamedQuery(query));
  }
}

/**
 * Helper to get a typed SimpleDbStore for the bundles object store.
 */
function bundlesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbBundlesKey, DbBundle> {
  return getStore<DbBundlesKey, DbBundle>(txn, DbBundleStore);
}

/**
 * Helper to get a typed SimpleDbStore for the namedQueries object store.
 */
function namedQueriesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbNamedQueriesKey, DbNamedQuery> {
  return getStore<DbNamedQueriesKey, DbNamedQuery>(txn, DbNamedQueryStore);
}
