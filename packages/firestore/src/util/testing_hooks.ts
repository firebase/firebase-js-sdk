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

/**
 * Manages "testing hooks", hooks into the internals of the SDK to verify
 * internal state and events during integration tests. Do not use this class
 * except for testing purposes.
 *
 * There are two ways to retrieve the global singleton instance of this class:
 * 1. The `instance` property, which returns null if the global singleton
 *      instance has not been created. Use this property if the caller should
 *      "do nothing" if there are no testing hooks registered, such as when
 *      delivering an event to notify registered callbacks.
 * 2. The `getOrCreateInstance()` method, which creates the global singleton
 *      instance if it has not been created. Use this method if the instance is
 *      needed to, for example, register a callback.
 *
 * @internal
 */
export class TestingHooks {
  private readonly onExistenceFilterMismatchCallbacks = new Map<
    Symbol,
    ExistenceFilterMismatchCallback
  >();

  private constructor() {}

  /**
   * Returns the singleton instance of this class, or null if it has not been
   * initialized.
   */
  static get instance(): TestingHooks | null {
    return gTestingHooksSingletonInstance;
  }

  /**
   * Returns the singleton instance of this class, creating it if is has never
   * been created before.
   */
  static getOrCreateInstance(): TestingHooks {
    if (gTestingHooksSingletonInstance === null) {
      gTestingHooksSingletonInstance = new TestingHooks();
    }
    return gTestingHooksSingletonInstance;
  }

  /**
   * Registers a callback to be notified when an existence filter mismatch
   * occurs in the Watch listen stream.
   *
   * The relative order in which callbacks are notified is unspecified; do not
   * rely on any particular ordering. If a given callback is registered multiple
   * times then it will be notified multiple times, once per registration.
   *
   * @param callback the callback to invoke upon existence filter mismatch.
   *
   * @return a function that, when called, unregisters the given callback; only
   * the first invocation of the returned function does anything; all subsequent
   * invocations do nothing.
   */
  onExistenceFilterMismatch(
    callback: ExistenceFilterMismatchCallback
  ): () => void {
    const key = Symbol();
    this.onExistenceFilterMismatchCallbacks.set(key, callback);
    return () => this.onExistenceFilterMismatchCallbacks.delete(key);
  }

  /**
   * Invokes all currently-registered `onExistenceFilterMismatch` callbacks.
   * @param info Information about the existence filter mismatch.
   */
  notifyOnExistenceFilterMismatch(info: ExistenceFilterMismatchInfo): void {
    this.onExistenceFilterMismatchCallbacks.forEach(callback => callback(info));
  }
}

/**
 * Information about an existence filter mismatch, as specified to callbacks
 * registered with `TestingUtils.onExistenceFilterMismatch()`.
 */
export interface ExistenceFilterMismatchInfo {
  /** The number of documents that matched the query in the local cache. */
  localCacheCount: number;

  /**
   * The number of documents that matched the query on the server, as specified
   * in the ExistenceFilter message's `count` field.
   */
  existenceFilterCount: number;

  /**
   * Information about the bloom filter provided by Watch in the ExistenceFilter
   * message's `unchangedNames` field. If this property is omitted or undefined
   * then that means that Watch did _not_ provide a bloom filter.
   */
  bloomFilter?: {
    /**
     * Whether a full requery was averted by using the bloom filter. If false,
     * then something happened, such as a false positive, to prevent using the
     * bloom filter to avoid a full requery.
     */
    applied: boolean;

    /** The number of hash functions used in the bloom filter. */
    hashCount: number;

    /** The number of bytes in the bloom filter's bitmask. */
    bitmapLength: number;

    /** The number of bits of padding in the last byte of the bloom filter. */
    padding: number;

    /**
     * Check if the given document path is contained in the bloom filter.
     *
     * The "path" of a document can be retrieved from the
     * `DocumentReference.path` property.
     *
     * Note that due to the probabilistic nature of a bloom filter, it is
     * possible that false positives may occur; that is, this function may
     * return `true` even though the given string is not in the bloom filter.
     *
     * This property is "optional"; if it is undefined then parsing the bloom
     * filter failed.
     */
    mightContain?(documentPath: string): boolean;
  };
}

/**
 * The signature of callbacks registered with
 * `TestingUtils.onExistenceFilterMismatch()`.
 */
export type ExistenceFilterMismatchCallback = (
  info: ExistenceFilterMismatchInfo
) => void;

/** The global singleton instance of `TestingHooks`. */
let gTestingHooksSingletonInstance: TestingHooks | null = null;
