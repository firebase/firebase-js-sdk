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

  constructor() {
    this._onlineComponentProvider = new OnlineComponentProvider();
    this._offlineComponentProvider = new MemoryOfflineComponentProvider();
  }

  toJSON(): {} {
    return { kind: this.kind };
  }
}

/**
 * Provides a persistent cache backed by IndexedDb to the SDK.
 *
 * To use, create an instance using the factory function {@link persistentLocalCache()}, then
 * set the instance to `FirestoreSettings.cache` and call `initializeFirestore` using
 * the settings object.
 */
export type PersistentLocalCache = {
  kind: 'persistent';
  /**
   * @internal
   */
  _onlineComponentProvider: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider: OfflineComponentProvider;
};

class PersistentLocalCacheImpl implements PersistentLocalCache {
  kind: 'persistent' = 'persistent';
  /**
   * @internal
   */
  _onlineComponentProvider: OnlineComponentProvider;
  /**
   * @internal
   */
  _offlineComponentProvider: OfflineComponentProvider;

  constructor(settings: PersistentCacheSettings | undefined) {
    let tabManager: PersistentTabManager;
    if (settings?.tabManager) {
      settings.tabManager._initialize(settings);
      tabManager = settings.tabManager;
    } else {
      tabManager = persistentSingleTabManager(undefined);
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
export type FirestoreLocalCache = MemoryLocalCache | PersistentLocalCache;

/**
 * Creates an instance of `MemoryLocalCache`. The instance can be set to
 * `FirestoreSettings.cache` to tell the SDK which cache layer to use.
 */
export function memoryLocalCache(): MemoryLocalCache {
  return new MemoryLocalCacheImpl();
}

/**
 * An settings object to configure an `PersistentLocalCache` instance.
 */
export type PersistentCacheSettings = {
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
  tabManager?: PersistentTabManager;
};

/**
 * Creates an instance of `PersistentLocalCache`. The instance can be set to
 * `FirestoreSettings.cache` to tell the SDK which cache layer to use.
 */
export function persistentLocalCache(
  settings?: PersistentCacheSettings
): PersistentLocalCache {
  return new PersistentLocalCacheImpl(settings);
}

/**
 * A tab manager supportting only one tab, no synchronization will be
 * performed across tabs.
 */
export type PersistentSingleTabManager = {
  kind: 'persistentSingleTab';
  /**
   * @internal
   */
  _initialize: (
    settings: Omit<PersistentCacheSettings, 'tabManager'> | undefined
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

class SingleTabManagerImpl implements PersistentSingleTabManager {
  kind: 'persistentSingleTab' = 'persistentSingleTab';

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
    settings: Omit<PersistentCacheSettings, 'tabManager'> | undefined
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
 * A tab manager supporting multiple tabs. SDK will synchronize queries and
 * mutations done across all tabs using the SDK.
 */
export type PersistentMultipleTabManager = {
  kind: 'PersistentMultipleTab';
  /**
   * @internal
   */
  _initialize: (settings: Omit<PersistentCacheSettings, 'tabManager'>) => void;
  /**
   * @internal
   */
  _onlineComponentProvider?: OnlineComponentProvider;
  /**
   * @internal
   */

  _offlineComponentProvider?: OfflineComponentProvider;
};

class MultiTabManagerImpl implements PersistentMultipleTabManager {
  kind: 'PersistentMultipleTab' = 'PersistentMultipleTab';

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
    settings: Omit<PersistentCacheSettings, 'tabManager'> | undefined
  ): void {
    this._onlineComponentProvider = new OnlineComponentProvider();
    this._offlineComponentProvider = new MultiTabOfflineComponentProvider(
      this._onlineComponentProvider,
      settings?.cacheSizeBytes
    );
  }
}

/**
 * A union of all available tab managers.
 */
export type PersistentTabManager =
  | PersistentSingleTabManager
  | PersistentMultipleTabManager;

/**
 * Type to configure an `PersistentSingleTabManager` instance.
 */
export type PersistentSingleTabManagerSettings = {
  /**
   * Whether to force-enable persistent (IndexedDB) cache for the client. This
   * cannot be used with multi-tab synchronization and is primarily intended for
   * use with Web Workers. Setting this to `true` will enable IndexedDB, but cause
   * other tabs using IndexedDB cache to fail.
   */
  forceOwnership?: boolean;
};
/**
 * Creates an instance of `PersistentSingleTabManager`.
 *
 * @param settings Configures the created tab manager.
 */
export function persistentSingleTabManager(
  settings: PersistentSingleTabManagerSettings | undefined
): PersistentSingleTabManager {
  return new SingleTabManagerImpl(settings?.forceOwnership);
}

/**
 * Creates an instance of `PersistentMultipleTabManager`.
 */
export function persistentMultipleTabManager(): PersistentMultipleTabManager {
  return new MultiTabManagerImpl();
}
