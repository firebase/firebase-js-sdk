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
  private readonly onExistenceFilterMismatchCallbacks: Map<
    Symbol,
    (arg: unknown) => void
  > = [];

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
   * @param callback the callback to invoke upon existence filter mismatch. The
   * type of the argument to this callback is intentionally declared as
   * `unknown`, rather than something more specific, to discourage its use
   * unless you really, really know what you are doing. If you know what you are
   * doing then you know the type and how to interpret it.
   *
   * @return a function that, when called, unregisters the given callback; only
   * the first invocation of the returned function does anything; all subsequent
   * invocations do nothing.
   */
  onExistenceFilterMismatch(callback: (arg: unknown) => void): () => void {
    const key = Symbol();
    this.onExistenceFilterMismatchCallbacks.set(key, callback);
    return () => this.onExistenceFilterMismatchCallbacks.delete(key);
  }

  /**
   * Invokes all currently-registered `onExistenceFilterMismatch` callbacks.
   * @param arg the argument to specify to the callbacks; see the documentation
   * for `onExistenceFilterMismatch()` for details.
   */
  notifyOnExistenceFilterMismatch(arg: unknown): void {
    this.onExistenceFilterMismatchCallbacks.forEach(callback => callback(arg));
  }
}

/** The global singleton instance of `TestingHooks`. */
let gTestingHooksSingletonInstance: TestingHooks | null = null;
