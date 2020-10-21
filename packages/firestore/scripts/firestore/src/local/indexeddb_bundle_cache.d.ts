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
import { LocalSerializer } from './local_serializer';
import { Bundle, NamedQuery } from '../core/bundle';
export declare class IndexedDbBundleCache implements BundleCache {
    private serializer;
    constructor(serializer: LocalSerializer);
    getBundleMetadata(transaction: PersistenceTransaction, bundleId: string): PersistencePromise<Bundle | undefined>;
    saveBundleMetadata(transaction: PersistenceTransaction, bundleMetadata: bundleProto.BundleMetadata): PersistencePromise<void>;
    getNamedQuery(transaction: PersistenceTransaction, queryName: string): PersistencePromise<NamedQuery | undefined>;
    saveNamedQuery(transaction: PersistenceTransaction, query: bundleProto.NamedQuery): PersistencePromise<void>;
}
