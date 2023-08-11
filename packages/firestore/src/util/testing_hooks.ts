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

import { ensureFirestoreConfigured, Firestore } from '../api/database';
import {
  PersistentCacheIndexManager,
  TestingHooks as PersistentCacheIndexManagerTestingHooks
} from '../api/persistent_cache_index_manager';
import { Unsubscribe } from '../api/reference_impl';
import { TestingHooks as FirestoreClientTestingHooks } from '../core/firestore_client';
import { Query } from '../lite-api/reference';
import { IndexType } from '../local/index_manager';

import { cast } from './input_validation';
import {
  setTestingHooksSpi,
  ExistenceFilterMismatchInfo,
  TestingHooksSpi
} from './testing_hooks_spi';

/**
 * Testing hooks for use by Firestore's integration test suite to reach into the
 * SDK internals to validate logic and behavior that is not visible from the
 * public API surface.
 *
 * @internal
 */
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
  ): Unsubscribe {
    return TestingHooksSpiImpl.instance.onExistenceFilterMismatch(callback);
  }

  /**
   * Registers a callback to be notified when
   * `enablePersistentCacheIndexAutoCreation()` or
   * `disablePersistentCacheIndexAutoCreation()` is invoked.
   *
   * The relative order in which callbacks are notified is unspecified; do not
   * rely on any particular ordering. If a given callback is registered multiple
   * times then it will be notified multiple times, once per registration.
   *
   * @param callback the callback to invoke when
   * `enablePersistentCacheIndexAutoCreation()` or
   * `disablePersistentCacheIndexAutoCreation()` is invoked.
   *
   * @return a function that, when called, unregisters the given callback; only
   * the first invocation of the returned function does anything; all subsequent
   * invocations do nothing.
   */
  static onPersistentCacheIndexAutoCreationToggle(
    callback: PersistentCacheIndexAutoCreationToggleCallback
  ): Unsubscribe {
    return TestingHooksSpiImpl.instance.onPersistentCacheIndexAutoCreationToggle(
      callback
    );
  }

  /**
   * Determines the type of client-side index that will be used when executing the
   * given query against the local cache.
   *
   * @param query The query whose client-side index type to get; it is typed as
   * `unknown` so that it is usable in the minified, bundled code, but it should
   * be a `Query` object.
   */
  static async getQueryIndexType(
    query: unknown
  ): Promise<'full' | 'partial' | 'none'> {
    const query_ = cast<Query>(query as Query, Query);
    const firestore = cast(query_.firestore, Firestore);
    const client = ensureFirestoreConfigured(firestore);

    const indexType = await FirestoreClientTestingHooks.getQueryIndexType(
      client,
      query_._query
    );

    switch (indexType) {
      case IndexType.NONE:
        return 'none';
      case IndexType.PARTIAL:
        return 'partial';
      case IndexType.FULL:
        return 'full';
      default:
        throw new Error(`unrecognized IndexType: ${indexType}`);
    }
  }

  /**
   * Sets the persistent cache index auto-creation settings for the given
   * Firestore instance.
   *
   * @return a Promise that is fulfilled when the settings are successfully
   * applied, or rejected if applying the settings fails.
   */
  static setPersistentCacheIndexAutoCreationSettings(
    indexManager: PersistentCacheIndexManager,
    settings: {
      indexAutoCreationMinCollectionSize?: number;
      relativeIndexReadCostPerDocument?: number;
    }
  ): Promise<void> {
    return PersistentCacheIndexManagerTestingHooks.setIndexAutoCreationSettings(
      indexManager,
      settings
    );
  }
}

/**
 * The signature of callbacks registered with
 * `TestingUtils.onExistenceFilterMismatch()`.
 *
 * The return value, if any, is ignored.
 *
 * @internal
 */
export type ExistenceFilterMismatchCallback = (
  info: ExistenceFilterMismatchInfo
) => unknown;

/**
 * The signature of callbacks registered with
 * `TestingHooks.onPersistentCacheIndexAutoCreationToggle()`.
 *
 * The `promise` argument will be fulfilled when the asynchronous work started
 * by the call to `enablePersistentCacheIndexAutoCreation()` or
 * `disablePersistentCacheIndexAutoCreation()` completes successfully, or will
 * be rejected if it fails.
 *
 * The return value, if any, is ignored.
 *
 * @internal
 */
export type PersistentCacheIndexAutoCreationToggleCallback = (
  promise: Promise<void>
) => unknown;

/**
 * The implementation of `TestingHooksSpi`.
 */
class TestingHooksSpiImpl implements TestingHooksSpi {
  private readonly existenceFilterMismatchCallbacksById = new Map<
    Symbol,
    ExistenceFilterMismatchCallback
  >();

  private readonly persistentCacheIndexAutoCreationToggleCallbacksById =
    new Map<Symbol, PersistentCacheIndexAutoCreationToggleCallback>();

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
  ): Unsubscribe {
    return registerCallback(
      callback,
      this.existenceFilterMismatchCallbacksById
    );
  }

  notifyPersistentCacheIndexAutoCreationToggle(promise: Promise<void>): void {
    this.persistentCacheIndexAutoCreationToggleCallbacksById.forEach(callback =>
      callback(promise)
    );
  }

  onPersistentCacheIndexAutoCreationToggle(
    callback: PersistentCacheIndexAutoCreationToggleCallback
  ): Unsubscribe {
    return registerCallback(
      callback,
      this.persistentCacheIndexAutoCreationToggleCallbacksById
    );
  }
}

function registerCallback<T>(
  callback: T,
  callbacks: Map<Symbol, T>
): Unsubscribe {
  const id = Symbol();
  callbacks.set(id, callback);
  return () => callbacks.delete(id);
}

let testingHooksSpiImplInstance: TestingHooksSpiImpl | null = null;
