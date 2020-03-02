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

import { Target } from '../core/target';

import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { SnapshotVersion } from '../core/snapshot_version';
import {BundleMetadata, NamedBundleQuery} from "../util/bundle";

/**
 * Represents named queries loaded via bundles.
 */
export interface NamedQueryCache {
  /**
   * Looks up an entry in the cache.
   */
  getBundleCreateTime(
    transaction: PersistenceTransaction,
    bundleId: string
  ): PersistencePromise<SnapshotVersion| null>;

  clear(
    transaction: PersistenceTransaction,
    bundleId: string,
  ):PersistencePromise<void>;

  getNamedQuery(
    transaction: PersistenceTransaction,
    bundleId: string,
    queryName: string
    // TODO(149936981): This should really return a `Query` not a `Target`.
  ): PersistencePromise<NamedBundleQuery | null>;

  setNamedQuery(
    transaction: PersistenceTransaction,
    bundleMetadata: BundleMetadata,
    queryName: string,
    // TODO(149936981): This should really be a `DbQuery`.
    query: NamedBundleQuery
  ):PersistencePromise<void>;
}
