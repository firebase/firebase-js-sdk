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
  setTestingHooksSpi,
  ExistenceFilterMismatchInfo,
  TestingHooksSpi
} from './testing_hooks_spi';

export class TestingHooks {
  private constructor() {
    throw new Error('instances of this class should not be created');
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
  static onExistenceFilterMismatch(
    callback: ExistenceFilterMismatchCallback
  ): Unregister {
    return TestingHooksSpiImpl.instance.onExistenceFilterMismatch(callback);
  }
}

/**
 * The signature of callbacks registered with
 * `TestingUtils.onExistenceFilterMismatch()`.
 */
export type ExistenceFilterMismatchCallback = (
  info: ExistenceFilterMismatchInfo
) => void;

/**
 * A function that, when invoked, unregisters something that was registered.
 *
 * Only the *first* invocation of this function has any effect; subsequent
 * invocations do nothing.
 */
export type Unregister = () => void;

/**
 * The implementation of `TestingHooksSpi`.
 */
class TestingHooksSpiImpl implements TestingHooksSpi {
  private readonly existenceFilterMismatchCallbacksById = new Map<
    Symbol,
    ExistenceFilterMismatchCallback
  >();

  private constructor() {}

  static get instance(): TestingHooksSpiImpl {
    if (!testingHooksSpiImplInstance) {
      testingHooksSpiImplInstance = new TestingHooksSpiImpl();
      setTestingHooksSpi(testingHooksSpiImplInstance);
    }
    return testingHooksSpiImplInstance;
  }

  notifyOnExistenceFilterMismatch(info: ExistenceFilterMismatchInfo): void {
    this.existenceFilterMismatchCallbacksById.forEach(callback =>
      callback(info)
    );
  }

  onExistenceFilterMismatch(
    callback: ExistenceFilterMismatchCallback
  ): Unregister {
    const id = Symbol();
    const callbacks = this.existenceFilterMismatchCallbacksById;
    callbacks.set(id, callback);
    return () => callbacks.delete(id);
  }
}

let testingHooksSpiImplInstance: TestingHooksSpiImpl | null = null;
