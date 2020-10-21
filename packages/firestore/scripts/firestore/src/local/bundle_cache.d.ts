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
import { Bundle, NamedQuery } from '../core/bundle';
/**
 * Provides interfaces to save and read Firestore bundles.
 */
export interface BundleCache {
    /**
     * Gets a saved `Bundle` for a given `bundleId`, returns undefined if
     * no bundles are found under the given id.
     */
    getBundleMetadata(transaction: PersistenceTransaction, bundleId: string): PersistencePromise<Bundle | undefined>;
    /**
     * Saves a `BundleMetadata` from a bundle into local storage, using its id as
     * the persistent key.
     */
    saveBundleMetadata(transaction: PersistenceTransaction, metadata: bundleProto.BundleMetadata): PersistencePromise<void>;
    /**
     * Gets a saved `NamedQuery` for the given query name. Returns undefined if
     * no queries are found under the given name.
     */
    getNamedQuery(transaction: PersistenceTransaction, queryName: string): PersistencePromise<NamedQuery | undefined>;
    /**
     * Saves a `NamedQuery` from a bundle, using its name as the persistent key.
     */
    saveNamedQuery(transaction: PersistenceTransaction, query: bundleProto.NamedQuery): PersistencePromise<void>;
}
