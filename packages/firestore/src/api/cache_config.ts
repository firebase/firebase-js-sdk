/**
 * @license
 * Copyright 2023 Google LLC
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

import {
  IndexedDbOfflineComponentProvider,
  MemoryOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from '../core/component_provider';

export interface MemoryLocalCache {
  kind: 'memory';
  _onlineComponentProvider: OnlineComponentProvider;
  _offlineComponentProvider: MemoryOfflineComponentProvider;
}

class MemoryLocalCacheImpl implements MemoryLocalCache {
  kind: 'memory' = 'memory';
  _onlineComponentProvider: OnlineComponentProvider;
  _offlineComponentProvider: MemoryOfflineComponentProvider;

  constructor() {
    this._onlineComponentProvider = new OnlineComponentProvider();
    this._offlineComponentProvider = new MemoryOfflineComponentProvider();
  }

  toJSON() {
    return { kind: this.kind };
  }
}

export interface IndexedDbLocalCache {
  kind: 'indexeddb';
  _onlineComponentProvider: OnlineComponentProvider;
  _offlineComponentProvider: OfflineComponentProvider;
}

class IndexedDbLocalCacheImpl implements IndexedDbLocalCache {
  kind: 'indexeddb' = 'indexeddb';
  _onlineComponentProvider: OnlineComponentProvider;
  _offlineComponentProvider: OfflineComponentProvider;

  constructor(settings: IndexedDbSettings | undefined) {
    let tabManager: IndexedDbTabManager;
    if (settings?.tabManager) {
      settings.tabManager._initialize(settings);
      tabManager = settings.tabManager;
    } else {
      tabManager = indexedDbSingleTabManager(undefined);
      tabManager._initialize(settings);
    }
    this._onlineComponentProvider = tabManager._onlineComponentProvider!;
    this._offlineComponentProvider = tabManager._offlineComponentProvider!;
  }

  toJSON() {
    return { kind: this.kind };
  }
}

export type FirestoreLocalCache = MemoryLocalCache | IndexedDbLocalCache;

// Factory function
export function memoryLocalCache(): MemoryLocalCache {
  return new MemoryLocalCacheImpl();
}

export interface IndexedDbSettings {
  cacheSizeBytes?: number;
  // default to singleTabManager({forceOwnership: false})
  tabManager?: IndexedDbTabManager;
}

// Factory function
export function indexedDbLocalCache(
  settings?: IndexedDbSettings
): IndexedDbLocalCache {
  return new IndexedDbLocalCacheImpl(settings);
}

export interface IndexedDbSingleTabManager {
  kind: 'indexedDbSingleTab';
  _initialize: (
    settings: Omit<IndexedDbSettings, 'tabManager'> | undefined
  ) => void;
  _onlineComponentProvider?: OnlineComponentProvider;
  _offlineComponentProvider?: OfflineComponentProvider;
}

class SingleTabManagerImpl implements IndexedDbSingleTabManager {
  kind: 'indexedDbSingleTab' = 'indexedDbSingleTab';

  _onlineComponentProvider?: OnlineComponentProvider;
  _offlineComponentProvider?: OfflineComponentProvider;

  constructor(private forceOwnership?: boolean) {}

  toJSON() {
    return { kind: this.kind };
  }

  _initialize(
    settings: Omit<IndexedDbSettings, 'tabManager'> | undefined
  ): void {
    this._onlineComponentProvider = new OnlineComponentProvider();
    this._offlineComponentProvider = new IndexedDbOfflineComponentProvider(
      this._onlineComponentProvider,
      settings?.cacheSizeBytes,
      this.forceOwnership
    );
  }
}

export interface IndexedDbMultipleTabManager {
  kind: 'IndexedDbMultipleTab';
  _initialize: (settings: Omit<IndexedDbSettings, 'tabManager'>) => void;
  _onlineComponentProvider?: OnlineComponentProvider;
  _offlineComponentProvider?: OfflineComponentProvider;
}

class MultiTabManagerImpl implements IndexedDbMultipleTabManager {
  kind: 'IndexedDbMultipleTab' = 'IndexedDbMultipleTab';

  _onlineComponentProvider?: OnlineComponentProvider;
  _offlineComponentProvider?: OfflineComponentProvider;

  toJSON() {
    return { kind: this.kind };
  }

  _initialize(
    settings: Omit<IndexedDbSettings, 'tabManager'> | undefined
  ): void {
    this._onlineComponentProvider = new OnlineComponentProvider();
    this._offlineComponentProvider = new MultiTabOfflineComponentProvider(
      this._onlineComponentProvider,
      settings?.cacheSizeBytes
    );
  }
}

export type IndexedDbTabManager =
  | IndexedDbSingleTabManager
  | IndexedDbMultipleTabManager;

export function indexedDbSingleTabManager(
  settings: { forceOwnership?: boolean } | undefined
): IndexedDbSingleTabManager {
  return new SingleTabManagerImpl(settings?.forceOwnership);
}
export function indexedDbMultipleTabManager(): IndexedDbMultipleTabManager {
  return new MultiTabManagerImpl();
}
