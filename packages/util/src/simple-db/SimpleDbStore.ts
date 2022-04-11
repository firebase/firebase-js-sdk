/**
 * @license
 * Copyright 2022 Google LLC
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

import { assert } from '../assert';
import { PersistencePromise } from '../persistence_promise';
import { LOG_TAG, wrapRequest, checkForAndReportiOSError } from './util';
import { IterateOptions } from './types';
import { IterateCallback, IterationController } from './IterationController';

/**
 * A wrapper around an IDBObjectStore providing an API that:
 *
 * 1) Has generic KeyType / ValueType parameters to provide strongly-typed
 * methods for acting against the object store.
 * 2) Deals with IndexedDB's onsuccess / onerror event callbacks, making every
 * method return a PersistencePromise instead.
 * 3) Provides a higher-level API to avoid needing to do excessive wrapping of
 * intermediate IndexedDB types (IDBCursorWithValue, etc.)
 * @internal
 */

export class SimpleDbStore<
  KeyType extends IDBValidKey,
  ValueType extends unknown
> {
  constructor(
    private store: IDBObjectStore,
    private logDebug: (...args: string[]) => void
  ) {}

  /**
   * Writes a value into the Object Store.
   *
   * @param key - Optional explicit key to use when writing the object, else the
   * key will be auto-assigned (e.g. via the defined keyPath for the store).
   * @param value - The object to write.
   */
  put(value: ValueType): PersistencePromise<void>;
  put(key: KeyType, value: ValueType): PersistencePromise<void>;
  put(
    keyOrValue: KeyType | ValueType,
    value?: ValueType
  ): PersistencePromise<void> {
    let request;
    if (value !== undefined) {
      this.logDebug(
        LOG_TAG,
        'PUT',
        this.store.name,
        String(keyOrValue),
        String(value)
      );
      request = this.store.put(value, keyOrValue as KeyType);
    } else {
      this.logDebug(
        LOG_TAG,
        'PUT',
        this.store.name,
        '<auto-key>',
        String(keyOrValue)
      );
      request = this.store.put(keyOrValue as ValueType);
    }
    return wrapRequest<void>(request);
  }

  /**
   * Adds a new value into an Object Store and returns the new key. Similar to
   * IndexedDb's `add()`, this method will fail on primary key collisions.
   *
   * @param value - The object to write.
   * @returns The key of the value to add.
   */
  add(value: ValueType): PersistencePromise<KeyType> {
    this.logDebug(
      LOG_TAG,
      'ADD',
      this.store.name,
      String(value),
      String(value)
    );
    const request = this.store.add(value as ValueType);
    return wrapRequest<KeyType>(request);
  }

  /**
   * Gets the object with the specified key from the specified store, or null
   * if no object exists with the specified key.
   *
   * @key The key of the object to get.
   * @returns The object with the specified key or null if no object exists.
   */
  get(key: KeyType): PersistencePromise<ValueType | null> {
    const request = this.store.get(key);
    // We're doing an unsafe cast to ValueType.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return wrapRequest<any>(request).next(result => {
      // Normalize nonexistence to null.
      if (result === undefined) {
        result = null;
      }
      this.logDebug(LOG_TAG, 'GET', this.store.name, String(key), result);
      return result;
    });
  }

  delete(key: KeyType | IDBKeyRange): PersistencePromise<void> {
    this.logDebug(LOG_TAG, 'DELETE', this.store.name, String(key));
    const request = this.store.delete(key);
    return wrapRequest<void>(request);
  }

  /**
   * If we ever need more of the count variants, we can add overloads. For now,
   * all we need is to count everything in a store.
   *
   * Returns the number of rows in the store.
   */
  count(): PersistencePromise<number> {
    this.logDebug(LOG_TAG, 'COUNT', this.store.name);
    const request = this.store.count();
    return wrapRequest<number>(request);
  }

  /** Loads all elements from the object store. */
  loadAll(): PersistencePromise<ValueType[]>;
  /** Loads all elements for the index range from the object store. */
  loadAll(range: IDBKeyRange): PersistencePromise<ValueType[]>;
  /**
   * Loads all elements from the object store that fall into the provided in the
   * index range for the given index.
   */
  loadAll(index: string, range: IDBKeyRange): PersistencePromise<ValueType[]>;
  loadAll(
    indexOrRange?: string | IDBKeyRange,
    range?: IDBKeyRange
  ): PersistencePromise<ValueType[]> {
    const iterateOptions = this.options(indexOrRange, range);
    // Use `getAll()` if the browser supports IndexedDB v3, as it is roughly
    // 20% faster. Unfortunately, getAll() does not support custom indices.
    if (!iterateOptions.index && typeof this.store.getAll === 'function') {
      const request = this.store.getAll(iterateOptions.range);
      return new PersistencePromise((resolve, reject) => {
        request.onerror = (event: Event) => {
          reject((event.target as IDBRequest).error!);
        };
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
      });
    } else {
      const cursor = this.cursor(iterateOptions);
      const results: ValueType[] = [];
      return this.iterateCursor(cursor, (key, value) => {
        results.push(value);
      }).next(() => {
        return results;
      });
    }
  }

  /**
   * Loads the first `count` elements from the provided index range. Loads all
   * elements if no limit is provided.
   */
  loadFirst(
    range: IDBKeyRange,
    count: number | null
  ): PersistencePromise<ValueType[]> {
    const request = this.store.getAll(
      range,
      count === null ? undefined : count
    );
    return new PersistencePromise((resolve, reject) => {
      request.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error!);
      };
      request.onsuccess = (event: Event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  deleteAll(): PersistencePromise<void>;
  deleteAll(range: IDBKeyRange): PersistencePromise<void>;
  deleteAll(index: string, range: IDBKeyRange): PersistencePromise<void>;
  deleteAll(
    indexOrRange?: string | IDBKeyRange,
    range?: IDBKeyRange
  ): PersistencePromise<void> {
    this.logDebug(LOG_TAG, 'DELETE ALL', this.store.name);
    const options = this.options(indexOrRange, range);
    options.keysOnly = false;
    const cursor = this.cursor(options);
    return this.iterateCursor(cursor, (key, value, control) => {
      // NOTE: Calling delete() on a cursor is documented as more efficient than
      // calling delete() on an object store with a single key
      // (https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/delete),
      // however, this requires us *not* to use a keysOnly cursor
      // (https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor/delete). We
      // may want to compare the performance of each method.
      return control.delete();
    });
  }

  /**
   * Iterates over keys and values in an object store.
   *
   * @param options - Options specifying how to iterate the objects in the
   * store.
   * @param callback - will be called for each iterated object. Iteration can be
   * canceled at any point by calling the doneFn passed to the callback.
   * The callback can return a PersistencePromise if it performs async
   * operations but note that iteration will continue without waiting for them
   * to complete.
   * @returns A PersistencePromise that resolves once all PersistencePromises
   * returned by callbacks resolve.
   */
  iterate(
    callback: IterateCallback<KeyType, ValueType>
  ): PersistencePromise<void>;
  iterate(
    options: IterateOptions,
    callback: IterateCallback<KeyType, ValueType>
  ): PersistencePromise<void>;
  iterate(
    optionsOrCallback: IterateOptions | IterateCallback<KeyType, ValueType>,
    callback?: IterateCallback<KeyType, ValueType>
  ): PersistencePromise<void> {
    let options;
    if (!callback) {
      options = {};
      callback = optionsOrCallback as IterateCallback<KeyType, ValueType>;
    } else {
      options = optionsOrCallback as IterateOptions;
    }
    const cursor = this.cursor(options);
    return this.iterateCursor(cursor, callback);
  }

  /**
   * Iterates over a store, but waits for the given callback to complete for
   * each entry before iterating the next entry. This allows the callback to do
   * asynchronous work to determine if this iteration should continue.
   *
   * The provided callback should return `true` to continue iteration, and
   * `false` otherwise.
   */
  iterateSerial(
    callback: (k: KeyType, v: ValueType) => PersistencePromise<boolean>
  ): PersistencePromise<void> {
    const cursorRequest = this.cursor({});
    return new PersistencePromise((resolve, reject) => {
      cursorRequest.onerror = (event: Event) => {
        const error = checkForAndReportiOSError(
          (event.target as IDBRequest).error!
        );
        reject(error);
      };
      cursorRequest.onsuccess = (event: Event) => {
        const cursor: IDBCursorWithValue = (event.target as IDBRequest).result;
        if (!cursor) {
          resolve();
          return;
        }

        callback(cursor.primaryKey as KeyType, cursor.value).next(
          shouldContinue => {
            if (shouldContinue) {
              cursor.continue();
            } else {
              resolve();
            }
          }
        );
      };
    });
  }

  private iterateCursor(
    cursorRequest: IDBRequest,
    fn: IterateCallback<KeyType, ValueType>
  ): PersistencePromise<void> {
    const results: Array<PersistencePromise<void>> = [];
    return new PersistencePromise((resolve, reject) => {
      cursorRequest.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error!);
      };
      cursorRequest.onsuccess = (event: Event) => {
        const cursor: IDBCursorWithValue = (event.target as IDBRequest).result;
        if (!cursor) {
          resolve();
          return;
        }
        const controller = new IterationController(cursor);
        const userResult = fn(
          cursor.primaryKey as KeyType,
          cursor.value,
          controller
        );
        if (userResult instanceof PersistencePromise) {
          const userPromise: PersistencePromise<void> = userResult.catch(
            err => {
              controller.done();
              return PersistencePromise.reject(err);
            }
          );
          results.push(userPromise);
        }
        if (controller.isDone) {
          resolve();
        } else if (controller.skipToKey === null) {
          cursor.continue();
        } else {
          cursor.continue(controller.skipToKey);
        }
      };
    }).next(() => {
      return PersistencePromise.waitFor(results);
    });
  }

  private options(
    indexOrRange?: string | IDBKeyRange,
    range?: IDBKeyRange
  ): IterateOptions {
    let indexName: string | undefined = undefined;
    if (indexOrRange !== undefined) {
      if (typeof indexOrRange === 'string') {
        indexName = indexOrRange;
      } else {
        assert(
          range === undefined,
          '3rd argument must not be defined if 2nd is a range.'
        );
        range = indexOrRange;
      }
    }
    return { index: indexName, range };
  }

  private cursor(options: IterateOptions): IDBRequest {
    let direction: IDBCursorDirection = 'next';
    if (options.reverse) {
      direction = 'prev';
    }
    if (options.index) {
      const index = this.store.index(options.index);
      if (options.keysOnly) {
        return index.openKeyCursor(options.range, direction);
      } else {
        return index.openCursor(options.range, direction);
      }
    } else {
      return this.store.openCursor(options.range, direction);
    }
  }
}
