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
  LruGcMemoryOfflineComponentProvider,
  MemoryOfflineComponentProvider,
  MultiTabOfflineComponentProvider,
  OfflineComponentProvider,
  OnlineComponentProvider
} from '../core/component_provider';

/* eslint @typescript-eslint/consistent-type-definitions: ["error", "type"] */
/**
 * Provides an in-memory cache to the SDK. This is the default cache unless explicitly
 * configured otherwise.
 *
 * To use, create an instance using the factory function {@link memoryLocalCache()}, then
 * set the instance to `FirestoreSettings.cache` and call `initializeFirestore` using
 * the settings object.
 */
export type MemoryLocalCache = {
  kind: 'memory';
  /**
   * @internal
   */
  _onlineComponentProvider: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider: MemoryOfflineComponentProvider;
};

class MemoryLocalCacheImpl implements MemoryLocalCache {
  kind: 'memory' = 'memory';
  /**
   * @internal
   */
  _onlineComponentProvider: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider: MemoryOfflineComponentProvider;

  constructor(settings?: MemoryCacheSettings) {
    this._onlineComponentProvider = new OnlineComponentProvider();
    if (settings?.garbageCollector) {
      this._offlineComponentProvider =
        settings.garbageCollector._offlineComponentProvider;
    } else {
      this._offlineComponentProvider = new MemoryOfflineComponentProvider();
    }
  }

  toJSON(): {} {
    return { kind: this.kind };
  }
}

/**
 * Provides a cache backed by IndexedDb to the SDK.
 *
 * To use, create an instance using the factory function {@link indexedDbLocalCache()}, then
 * set the instance to `FirestoreSettings.cache` and call `initializeFirestore` using
 * the settings object.
 */
export type IndexedDbLocalCache = {
  kind: 'indexeddb';
  /**
   * @internal
   */
  _onlineComponentProvider: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider: OfflineComponentProvider;
};

class IndexedDbLocalCacheImpl implements IndexedDbLocalCache {
  kind: 'indexeddb' = 'indexeddb';
  /**
   * @internal
   */
  _onlineComponentProvider: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider: OfflineComponentProvider;

  constructor(settings: IndexedDbCacheSettings | undefined) {
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

  toJSON(): {} {
    return { kind: this.kind };
  }
}

/**
 * Union type from all supported SDK cache layer.
 */
export type FirestoreLocalCache = MemoryLocalCache | IndexedDbLocalCache;

/**
 * Union type from all support gabage collectors for memory local cache.
 */
export type MemoryGarbageCollector =
  | MemoryEagerGarbageCollector
  | MemoryLruGarbageCollector;

/**
 * A garbage collector deletes documents whenever they are not part of any
 * active queries, and have no local mutations attached to them.
 *
 * This collector tries to ensure lowest memory footprints from the SDK,
 * at the risk of querying backend repeated for a document it could have
 * cached locally.
 *
 * Use factory function {@link memoryEagerGarbageCollector()} to create a
 * instance of this collector.
 */
export type MemoryEagerGarbageCollector = {
  kind: 'memoryEager';
  /**
   * @internal
   */
  _offlineComponentProvider: MemoryOfflineComponentProvider;
};

/**
 * A garbage collector deletes Least-Recently-Used documents in multiple
 * batches.
 *
 * This collector is configured with a target size, and will only perform
 * collection when the cached documents exceed the target size. It avoids
 * querying backend repeated for the same query or document, at the risk
 * of having a larger memory footprint.
 *
 * Use factory function {@link memoryLruGarbageCollector()} to create a
 * instance of this collector.
 */
export type MemoryLruGarbageCollector = {
  kind: 'memoryLru';
  /**
   * @internal
   */
  _offlineComponentProvider: MemoryOfflineComponentProvider;
};

class MemoryEagerGabageCollectorImpl implements MemoryEagerGarbageCollector {
  kind: 'memoryEager' = 'memoryEager';
  /**
   * @internal
   */
  _offlineComponentProvider: MemoryOfflineComponentProvider;

  constructor() {
    this._offlineComponentProvider = new MemoryOfflineComponentProvider();
  }

  toJSON(): {} {
    return { kind: this.kind };
  }
}

class MemoryLruGabageCollectorImpl implements MemoryLruGarbageCollector {
  kind: 'memoryLru' = 'memoryLru';
  /**
   * @internal
   */
  _offlineComponentProvider: MemoryOfflineComponentProvider;

  constructor(cacheSize?: number) {
    this._offlineComponentProvider = new LruGcMemoryOfflineComponentProvider(
      cacheSize
    );
  }

  toJSON(): {} {
    return { kind: this.kind };
  }
}

/**
 * Creates an instance of `MemoryEagerGarbageCollector`. This is also the
 * default garbage collector unless it is explicitly specified otherwise.
 */
export function memoryEagerGarbageCollector(): MemoryEagerGarbageCollector {
  return new MemoryEagerGabageCollectorImpl();
}

/**
 * Creates an instance of `MemoryLruGarbageCollector`.
 *
 * A target size can be specified as part of the setting parameter. The
 * collector will start deleting documents once the cache size exceeds
 * the given size. The default cache size is 40MB (40 * 1024 * 1024 bytes).
 */
export function memoryLruGarbageCollector(settings?: {
  cacheSizeBytes?: number;
}): MemoryLruGarbageCollector {
  return new MemoryLruGabageCollectorImpl(settings?.cacheSizeBytes);
}

/**
 * An settings object to configure an `MemoryLocalCache` instance.
 */
export type MemoryCacheSettings = {
  /**
   * The garbage collector to use, for the memory cache layer.
   * A `MemoryEagerGarbageCollector` is used when this is undefined.
   */
  garbageCollector?: MemoryGarbageCollector;
};

/**
 * Creates an instance of `MemoryLocalCache`. The instance can be set to
 * `FirestoreSettings.cache` to tell the SDK which cache layer to use.
 */
export function memoryLocalCache(
  settings?: MemoryCacheSettings
): MemoryLocalCache {
  return new MemoryLocalCacheImpl(settings);
}

/**
 * An settings object to configure an `IndexedDbLocalCache` instance.
 */
export type IndexedDbCacheSettings = {
  /**
   * An approximate cache size threshold for the on-disk data. If the cache
   * grows beyond this size, Firestore will start removing data that hasn't been
   * recently used. The SDK does not guarantee that the cache will stay below
   * that size, only that if the cache exceeds the given size, cleanup will be
   * attempted.
   *
   * The default value is 40 MB. The threshold must be set to at least 1 MB, and
   * can be set to `CACHE_SIZE_UNLIMITED` to disable garbage collection.
   */
  cacheSizeBytes?: number;

  /**
   * Specifies how multiple tabs/windows will be managed by the SDK.
   */
  tabManager?: IndexedDbTabManager;
};

/**
 * Creates an instance of `IndexedDbLocalCache`. The instance can be set to
 * `FirestoreSettings.cache` to tell the SDK which cache layer to use.
 */
export function indexedDbLocalCache(
  settings?: IndexedDbCacheSettings
): IndexedDbLocalCache {
  return new IndexedDbLocalCacheImpl(settings);
}

/**
 * A tab manager supportting only one tab, no synchronization will be
 * performed across tabs.
 */
export type IndexedDbSingleTabManager = {
  kind: 'indexedDbSingleTab';
  /**
   * @internal
   */
  _initialize: (
    settings: Omit<IndexedDbCacheSettings, 'tabManager'> | undefined
  ) => void;
  /**
   * @internal
   */
  _onlineComponentProvider?: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider?: OfflineComponentProvider;
};

class SingleTabManagerImpl implements IndexedDbSingleTabManager {
  kind: 'indexedDbSingleTab' = 'indexedDbSingleTab';

  /**
   * @internal
   */
  _onlineComponentProvider?: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider?: OfflineComponentProvider;

  constructor(private forceOwnership?: boolean) {}

  toJSON(): {} {
    return { kind: this.kind };
  }

  /**
   * @internal
   */
  _initialize(
    settings: Omit<IndexedDbCacheSettings, 'tabManager'> | undefined
  ): void {
    this._onlineComponentProvider = new OnlineComponentProvider();
    this._offlineComponentProvider = new IndexedDbOfflineComponentProvider(
      this._onlineComponentProvider,
      settings?.cacheSizeBytes,
      this.forceOwnership
    );
  }
}

/**
 * A tab manager supportting multiple tabs. SDK will synchronize queries and
 * mutations done across all tabs using the SDK.
 */
export type IndexedDbMultipleTabManager = {
  kind: 'IndexedDbMultipleTab';
  /**
   * @internal
   */
  _initialize: (settings: Omit<IndexedDbCacheSettings, 'tabManager'>) => void;
  /**
   * @internal
   */
  _onlineComponentProvider?: OnlineComponentProvider;
  /**
   * @internal
   */

  _offlineComponentProvider?: OfflineComponentProvider;
};

class MultiTabManagerImpl implements IndexedDbMultipleTabManager {
  kind: 'IndexedDbMultipleTab' = 'IndexedDbMultipleTab';

  /**
   * @internal
   */
  _onlineComponentProvider?: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider?: OfflineComponentProvider;

  toJSON(): {} {
    return { kind: this.kind };
  }

  /**
   * @internal
   */
  _initialize(
    settings: Omit<IndexedDbCacheSettings, 'tabManager'> | undefined
  ): void {
    this._onlineComponentProvider = new OnlineComponentProvider();
    this._offlineComponentProvider = new MultiTabOfflineComponentProvider(
      this._onlineComponentProvider,
      settings?.cacheSizeBytes
    );
  }
}

/**
 * A union of all avaialbe tab managers.
 */
export type IndexedDbTabManager =
  | IndexedDbSingleTabManager
  | IndexedDbMultipleTabManager;

/**
 * Type to configure an `IndexedDbSingleTabManager` instace.
 */
export type IndexedDbSingleTabManagerSettings = {
  /**
   * Whether to force-enable IndexedDB cache for the client. This cannot be used
   * with multi-tab synchronization and is primarily intended for use with Web
   * Workers. Setting this to `true` will enable IndexedDB, but cause other
   * tabs using IndexedDB cache to fail.
   */
  forceOwnership?: boolean;
};
/**
 * Creates an instance of `IndexedDbSingleTabManager`.
 *
 * @param settings Configures the created tab manager.
 */
export function indexedDbSingleTabManager(
  settings: IndexedDbSingleTabManagerSettings | undefined
): IndexedDbSingleTabManager {
  return new SingleTabManagerImpl(settings?.forceOwnership);
}

/**
 * Creates an instance of `IndexedDbMultipleTabManager`.
 */
export function indexedDbMultipleTabManager(): IndexedDbMultipleTabManager {
  return new MultiTabManagerImpl();
}
