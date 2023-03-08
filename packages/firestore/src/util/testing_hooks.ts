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
   * rely on any particular ordering.
   *
   * @param callback the callback to invoke upon existence filter mismatch; see
   * the documentation for `notifyOnExistenceFilterMismatch()` for the meaning
   * of these arguments.
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
   * @param bloomFilterApplied true if a full requery was averted because the
   * limbo documents were successfully deduced using the bloom filter, or false
   * if a full requery had to be performed, such as due to a false positive in
   * the bloom filter.
   * @param actualCount the number of documents that matched the query in the
   * local cache.
   * @param expectedCount the number of documents that matched the query on the
   * server, as specified in the ExistenceFilter message's `count` field.
   * @param bloomFilterSentFromWatch whether the ExistenceFilter message
   * included the `unchangedNames` bloom filter. If false, the remaining
   * arguments are not applicable and may have any values.
   * @param bloomFilterApplied whether a full requery was averted by using the
   * bloom filter; if false, then a false positive occurred, requiring a full
   * requery to deduce which documents should go into limbo.
   * @param bloomFilterHashCount the number of hash functions used in the bloom
   * filter.
   * @param bloomFilterBitmapLength the number of bytes used by the bloom
   * filter.
   * @param bloomFilterPadding the number of bits of padding in the last byte
   * of the bloom filter.
   */
  notifyOnExistenceFilterMismatch(
    actualCount: number,
    expectedCount: number,
    bloomFilterSentFromWatch: boolean,
    bloomFilterApplied: boolean,
    bloomFilterHashCount: number,
    bloomFilterBitmapLength: number,
    bloomFilterPadding: number
  ): void {
    this.onExistenceFilterMismatchCallbacks.forEach(callback => {
      callback(
        actualCount,
        expectedCount,
        bloomFilterSentFromWatch,
        bloomFilterApplied,
        bloomFilterHashCount,
        bloomFilterBitmapLength,
        bloomFilterPadding
      );
    });
  }
}

/**
 * The signature of callbacks registered with
 * `TestingUtils.onExistenceFilterMismatch()`.
 *
 * @internal
 */
export type ExistenceFilterMismatchCallback = (
  actualCount: number,
  expectedCount: number,
  bloomFilterSentFromWatch: boolean,
  bloomFilterApplied: boolean,
  bloomFilterHashCount: number,
  bloomFilterBitmapLength: number,
  bloomFilterPadding: number
) => void;

/** The global singleton instance of `TestingHooks`. */
let gTestingHooksSingletonInstance: TestingHooks | null = null;
