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

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import * as bundleProto from '../protos/firestore_bundle_proto';
import { BundleCache } from './bundle_cache';
import {
  DbBundle,
  DbBundlesKey,
  DbNamedQuery,
  DbNamedQueriesKey
} from './indexeddb_schema';
import { SimpleDbStore } from './simple_db';
import { IndexedDbPersistence } from './indexeddb_persistence';
import { LocalSerializer } from './local_serializer';
import { Bundle, NamedQuery } from '../core/bundle';

export class IndexedDbBundleCache implements BundleCache {
  constructor(private serializer: LocalSerializer) {}

  getBundle(
    transaction: PersistenceTransaction,
    bundleId: string
  ): PersistencePromise<Bundle | undefined> {
    return bundlesStore(transaction)
      .get(bundleId)
      .next(bundle => {
        if (bundle) {
          return this.serializer.fromDbBundle(bundle!);
        }
        return undefined;
      });
  }

  saveBundleMetadata(
    transaction: PersistenceTransaction,
    bundleMetadata: bundleProto.BundleMetadata
  ): PersistencePromise<void> {
    return bundlesStore(transaction).put(
      this.serializer.toDbBundle(bundleMetadata)
    );
  }

  getNamedQuery(
    transaction: PersistenceTransaction,
    queryName: string
  ): PersistencePromise<NamedQuery | undefined> {
    return namedQueriesStore(transaction)
      .get(queryName)
      .next(query => {
        if (query) {
          return this.serializer.fromDbNamedQuery(query!);
        }
        return undefined;
      });
  }

  saveNamedQuery(
    transaction: PersistenceTransaction,
    query: bundleProto.NamedQuery
  ): PersistencePromise<void> {
    return namedQueriesStore(transaction).put(
      this.serializer.toDbNamedQuery(query)
    );
  }
}

/**
 * Helper to get a typed SimpleDbStore for the bundles object store.
 */
function bundlesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbBundlesKey, DbBundle> {
  return IndexedDbPersistence.getStore<DbBundlesKey, DbBundle>(
    txn,
    DbBundle.store
  );
}

/**
 * Helper to get a typed SimpleDbStore for the namedQueries object store.
 */
function namedQueriesStore(
  txn: PersistenceTransaction
): SimpleDbStore<DbNamedQueriesKey, DbNamedQuery> {
  return IndexedDbPersistence.getStore<DbNamedQueriesKey, DbNamedQuery>(
    txn,
    DbNamedQuery.store
  );
}
