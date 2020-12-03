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

import { Persistence } from '../../../src/local/persistence';
import { BundleCache } from '../../../src/local/bundle_cache';
import {
  NamedQuery as ProtoNamedQuery,
  BundleMetadata as ProtoBundleMetadata
} from '../../../src/protos/firestore_bundle_proto';
import { Bundle, NamedQuery } from '../../../src/core/bundle_types';

/**
 * A wrapper around a BundleCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestBundleCache {
  private readonly cache: BundleCache;

  constructor(private readonly persistence: Persistence) {
    this.cache = persistence.getBundleCache();
  }

  getBundle(bundleId: string): Promise<Bundle | undefined> {
    return this.persistence.runTransaction(
      'getBundle',
      'readonly',
      transaction => {
        return this.cache.getBundleMetadata(transaction, bundleId);
      }
    );
  }

  saveBundleMetadata(metadata: ProtoBundleMetadata): Promise<void> {
    return this.persistence.runTransaction(
      'saveBundleMetadata',
      'readwrite',
      transaction => {
        return this.cache.saveBundleMetadata(transaction, metadata);
      }
    );
  }

  getNamedQuery(name: string): Promise<NamedQuery | undefined> {
    return this.persistence.runTransaction(
      'getNamedQuery',
      'readonly',
      transaction => {
        return this.cache.getNamedQuery(transaction, name);
      }
    );
  }

  setNamedQuery(query: ProtoNamedQuery): Promise<void> {
    return this.persistence.runTransaction(
      'setNamedQuery',
      'readwrite',
      transaction => {
        return this.cache.saveNamedQuery(transaction, query);
      }
    );
  }
}
