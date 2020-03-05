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
import { NamedQueryCache } from './named_query_cache';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { SnapshotVersion } from '../core/snapshot_version';
import { Target } from '../core/target';
import { BundleMetadata, NamedBundleQuery } from '../util/bundle';

export class MemoryNamedQueryCache implements NamedQueryCache {
  clear(
    transaction: PersistenceTransaction,
    bundleId: string
  ): PersistencePromise<void> {
    return PersistencePromise.reject(new Error('Not implemented'));
  }

  getBundleCreateTime(
    transaction: PersistenceTransaction,
    bundleId: string
  ): PersistencePromise<SnapshotVersion | null> {
    return PersistencePromise.reject(new Error('Not implemented'));
  }

  getNamedQuery(
    transaction: PersistenceTransaction,
    bundleId: string,
    queryName: string
  ): PersistencePromise<NamedBundleQuery | null> {
    return PersistencePromise.reject(new Error('Not implemented'));
  }

  setNamedQuery(
    transaction: PersistenceTransaction,
    bundleMetadata: BundleMetadata,
    queryName: string,
    query: NamedBundleQuery
  ): PersistencePromise<void> {
    return PersistencePromise.reject(new Error('Not implemented'));
  }
}
