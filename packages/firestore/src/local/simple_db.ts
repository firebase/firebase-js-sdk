/**
 * @license
 * Copyright 2017 Google Inc.
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

import { getUA } from '@firebase/util';
import { assert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { debug, error } from '../util/log';
import { Deferred } from '../util/promise';
import { SCHEMA_VERSION } from './indexeddb_schema';
import { PersistencePromise } from './persistence_promise';

const LOG_TAG = 'SimpleDb';

export interface SimpleDbSchemaConverter {
  createOrUpgrade(
    db: IDBDatabase,
    txn: SimpleDbTransaction,
    fromVersion: number,
    toVersion: number
  ): PersistencePromise<void>;
}

/**
 * Provides a wrapper around IndexedDb with a simplified interface that uses
 * Promise-like return values to chain operations. Real promises cannot be used
 * since .then() continuations are executed asynchronously (e.g. via
 * .setImmediate), which would cause IndexedDB to end the transaction.
 * See PersistencePromise for more details.
 */
export class SimpleDb {
  /**
   * Opens the specified database, creating or upgrading it if necessary.
   *
   * Note that `version` must not be a downgrade. IndexedDB does not support downgrading the schema
   * version. We currently do not support any way to do versioning outside of IndexedDB's versioning
   * mechanism, as only version-upgrade transactions are allowed to do things like create
   * objectstores.
   */
  static openOrCreate(
    name: string,
    version: number,
    schemaConverter: SimpleDbSchemaConverter
  ): Promise<SimpleDb> {
    assert(
      SimpleDb.isAvailable(),
      'IndexedDB not supported in current environment.'
    );
    debug(LOG_TAG, 'Opening database:', name);
    return new PersistencePromise<SimpleDb>((resolve, reject) => {
      // TODO(mikelehen): Investigate browser compatibility.
      // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
      // suggests IE9 and older WebKit browsers handle upgrade
      // differently. They expect setVersion, as described here:
      // https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeRequest/setVersion
      const request = window.indexedDB.open(name, version);

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(new SimpleDb(db));
      };

      request.onblocked = () => {
        reject(
          new FirestoreError(
            Code.FAILED_PRECONDITION,
            'Cannot upgrade IndexedDB schema while another tab is open. ' +
              'Close all tabs that access Firestore and reload this page to proceed.'
          )
        );
      };

      request.onerror = (event: Event) => {
        const error: DOMException = (event.target as IDBOpenDBRequest).error!;
        if (error.name === 'VersionError') {
          reject(
            new FirestoreError(
              Code.FAILED_PRECONDITION,
              'A newer version of the Firestore SDK was previously used and so the persisted ' +
                'data is not compatible with the version of the SDK you are now using. The SDK ' +
                'will operate with persistence disabled. If you need persistence, please ' +
                're-upgrade to a newer version of the SDK or else clear the persisted IndexedDB ' +
                'data for your app to start fresh.'
            )
          );
        } else {
          reject(error);
        }
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        debug(
          LOG_TAG,
          'Database "' + name + '" requires upgrade from version:',
          event.oldVersion
        );
        const db = (event.target as IDBOpenDBRequest).result;
        // We are provided a version upgrade transaction from the request, so
        // we wrap that in a SimpleDbTransaction to allow use of our friendlier
        // API for schema migration operations.
        const txn = new SimpleDbTransaction(request.transaction!);
        schemaConverter
          .createOrUpgrade(db, txn, event.oldVersion, SCHEMA_VERSION)
          .next(() => {
            debug(
              LOG_TAG,
              'Database upgrade to version ' + SCHEMA_VERSION + ' complete'
            );
          });
      };
    }).toPromise();
  }

  /** Deletes the specified database. */
  static delete(name: string): Promise<void> {
    debug(LOG_TAG, 'Removing database:', name);
    return wrapRequest<void>(window.indexedDB.deleteDatabase(name)).toPromise();
  }

  /** Returns true if IndexedDB is available in the current environment. */
  static isAvailable(): boolean {
    if (typeof window === 'undefined' || window.indexedDB == null) {
      return false;
    }
    // We extensively use indexed array values and compound keys,
    // which IE and Edge do not support. However, they still have indexedDB
    // defined on the window, so we need to check for them here and make sure
    // to return that persistence is not enabled for those browsers.
    // For tracking support of this feature, see here:
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/

    // If we are running in Node using the IndexedDBShim, `window` is defined,
    // but `window.navigator` is not. In this case, we support IndexedDB and
    // return `true`.
    if (window.navigator === undefined) {
      return process.env.USE_MOCK_PERSISTENCE === 'YES';
    }

    // Check the UA string to find out the browser.
    const ua = getUA();

    // IE 10
    // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';

    // IE 11
    // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';

    // Edge
    // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML,
    // like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';

    // iOS Safari: Disable for users running iOS version < 10.
    const iOSVersion = SimpleDb.getIOSVersion(ua);
    const isUnsupportedIOS = 0 < iOSVersion && iOSVersion < 10;

    // Android browser: Disable for userse running version < 4.5.
    const androidVersion = SimpleDb.getAndroidVersion(ua);
    const isUnsupportedAndroid = 0 < androidVersion && androidVersion < 4.5;

    if (
      ua.indexOf('MSIE ') > 0 ||
      ua.indexOf('Trident/') > 0 ||
      ua.indexOf('Edge/') > 0 ||
      isUnsupportedIOS ||
      isUnsupportedAndroid
    ) {
      return false;
    } else {
      return true;
    }
  }

  /** Helper to get a typed SimpleDbStore from a transaction. */
  static getStore<KeyType extends IDBValidKey, ValueType extends unknown>(
    txn: SimpleDbTransaction,
    store: string
  ): SimpleDbStore<KeyType, ValueType> {
    return txn.store<KeyType, ValueType>(store);
  }

  // visible for testing
  /** Parse User Agent to determine iOS version. Returns -1 if not found. */
  static getIOSVersion(ua: string): number {
    const iOSVersionRegex = ua.match(/i(?:phone|pad|pod) os ([\d_]+)/i);
    const version = iOSVersionRegex
      ? iOSVersionRegex[1]
          .split('_')
          .slice(0, 2)
          .join('.')
      : '-1';
    return Number(version);
  }

  // visible for testing
  /** Parse User Agent to determine Android version. Returns -1 if not found. */
  static getAndroidVersion(ua: string): number {
    const androidVersionRegex = ua.match(/Android ([\d.]+)/i);
    const version = androidVersionRegex
      ? androidVersionRegex[1]
          .split('.')
          .slice(0, 2)
          .join('.')
      : '-1';
    return Number(version);
  }

  constructor(private db: IDBDatabase) {
    const iOSVersion = SimpleDb.getIOSVersion(getUA());
    // NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
    // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
    // whatever reason it's much harder to hit after 12.2 so we only proactively
    // log on 12.2.
    if (iOSVersion === 12.2) {
      error(
        'Firestore persistence suffers from a bug in iOS 12.2 ' +
          'Safari that may cause your app to stop working. See ' +
          'https://stackoverflow.com/q/56496296/110915 for details ' +
          'and a potential workaround.'
      );
    }
  }

  setVersionChangeListener(
    versionChangeListener: (event: IDBVersionChangeEvent) => void
  ): void {
    this.db.onversionchange = (event: IDBVersionChangeEvent) => {
      return versionChangeListener(event);
    };
  }

  runTransaction<T>(
    mode: 'readonly' | 'readwrite',
    objectStores: string[],
    transactionFn: (transaction: SimpleDbTransaction) => PersistencePromise<T>
  ): Promise<T> {
    const transaction = SimpleDbTransaction.open(this.db, mode, objectStores);
    const transactionFnResult = transactionFn(transaction)
      .catch(error => {
        // Abort the transaction if there was an error.
        transaction.abort(error);
        // We cannot actually recover, and calling `abort()` will cause the transaction's
        // completion promise to be rejected. This in turn means that we won't use
        // `transactionFnResult` below. We return a rejection here so that we don't add the
        // possibility of returning `void` to the type of `transactionFnResult`.
        return PersistencePromise.reject<T>(error);
      })
      .toPromise();

    // As noted above, errors are propagated by aborting the transaction. So
    // we swallow any error here to avoid the browser logging it as unhandled.
    transactionFnResult.catch(() => {});

    // Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
    // fire), but still return the original transactionFnResult back to the
    // caller.
    return transaction.completionPromise.then(() => transactionFnResult);
  }

  close(): void {
    this.db.close();
  }
}

/**
 * A controller for iterating over a key range or index. It allows an iterate
 * callback to delete the currently-referenced object, or jump to a new key
 * within the key range or index.
 */
export class IterationController {
  private shouldStop = false;
  private nextKey: IDBValidKey | null = null;

  constructor(private dbCursor: IDBCursorWithValue) {}

  get isDone(): boolean {
    return this.shouldStop;
  }

  get skipToKey(): IDBValidKey | null {
    return this.nextKey;
  }

  set cursor(value: IDBCursorWithValue) {
    this.dbCursor = value;
  }

  /**
   * This function can be called to stop iteration at any point.
   */
  done(): void {
    this.shouldStop = true;
  }

  /**
   * This function can be called to skip to that next key, which could be
   * an index or a primary key.
   */
  skip(key: IDBValidKey): void {
    this.nextKey = key;
  }

  /**
   * Delete the current cursor value from the object store.
   *
   * NOTE: You CANNOT do this with a keysOnly query.
   */
  delete(): PersistencePromise<void> {
    return wrapRequest<void>(this.dbCursor.delete());
  }
}

/**
 * Callback used with iterate() method.
 */
export type IterateCallback<KeyType, ValueType> = (
  key: KeyType,
  value: ValueType,
  control: IterationController
) => void | PersistencePromise<void>;

/** Options available to the iterate() method. */
export interface IterateOptions {
  /** Index to iterate over (else primary keys will be iterated) */
  index?: string;

  /** IndxedDB Range to iterate over (else entire store will be iterated) */
  range?: IDBKeyRange;

  /** If true, values aren't read while iterating. */
  keysOnly?: boolean;

  /** If true, iterate over the store in reverse. */
  reverse?: boolean;
}

/**
 * Wraps an IDBTransaction and exposes a store() method to get a handle to a
 * specific object store.
 */
export class SimpleDbTransaction {
  private aborted = false;

  /**
   * A promise that resolves with the result of the IndexedDb transaction.
   */
  private readonly completionDeferred = new Deferred<void>();

  static open(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    objectStoreNames: string[]
  ): SimpleDbTransaction {
    return new SimpleDbTransaction(db.transaction(objectStoreNames, mode));
  }

  constructor(private readonly transaction: IDBTransaction) {
    this.transaction.oncomplete = () => {
      this.completionDeferred.resolve();
    };
    this.transaction.onabort = () => {
      if (transaction.error) {
        this.completionDeferred.reject(transaction.error);
      } else {
        this.completionDeferred.resolve();
      }
    };
    this.transaction.onerror = (event: Event) => {
      const error = checkForAndReportiOSError(
        (event.target as IDBRequest).error!
      );
      this.completionDeferred.reject(error);
    };
  }

  get completionPromise(): Promise<void> {
    return this.completionDeferred.promise;
  }

  abort(error?: Error): void {
    if (error) {
      this.completionDeferred.reject(error);
    }

    if (!this.aborted) {
      debug(
        LOG_TAG,
        'Aborting transaction:',
        error ? error.message : 'Client-initiated abort'
      );
      this.aborted = true;
      this.transaction.abort();
    }
  }

  /**
   * Returns a SimpleDbStore<KeyType, ValueType> for the specified store. All
   * operations performed on the SimpleDbStore happen within the context of this
   * transaction and it cannot be used anymore once the transaction is
   * completed.
   *
   * Note that we can't actually enforce that the KeyType and ValueType are
   * correct, but they allow type safety through the rest of the consuming code.
   */
  store<KeyType extends IDBValidKey, ValueType extends unknown>(
    storeName: string
  ): SimpleDbStore<KeyType, ValueType> {
    const store = this.transaction.objectStore(storeName);
    assert(!!store, 'Object store not part of transaction: ' + storeName);
    return new SimpleDbStore<KeyType, ValueType>(store);
  }
}

/**
 * A wrapper around an IDBObjectStore providing an API that:
 *
 * 1) Has generic KeyType / ValueType parameters to provide strongly-typed
 * methods for acting against the object store.
 * 2) Deals with IndexedDB's onsuccess / onerror event callbacks, making every
 * method return a PersistencePromise instead.
 * 3) Provides a higher-level API to avoid needing to do excessive wrapping of
 * intermediate IndexedDB types (IDBCursorWithValue, etc.)
 */
export class SimpleDbStore<
  KeyType extends IDBValidKey,
  ValueType extends unknown
> {
  constructor(private store: IDBObjectStore) {}

  /**
   * Writes a value into the Object Store.
   *
   * @param key Optional explicit key to use when writing the object, else the
   * key will be auto-assigned (e.g. via the defined keyPath for the store).
   * @param value The object to write.
   */
  put(value: ValueType): PersistencePromise<void>;
  put(key: KeyType, value: ValueType): PersistencePromise<void>;
  put(
    keyOrValue: KeyType | ValueType,
    value?: ValueType
  ): PersistencePromise<void> {
    let request;
    if (value !== undefined) {
      debug(LOG_TAG, 'PUT', this.store.name, keyOrValue, value);
      request = this.store.put(value, keyOrValue as KeyType);
    } else {
      debug(LOG_TAG, 'PUT', this.store.name, '<auto-key>', keyOrValue);
      request = this.store.put(keyOrValue as ValueType);
    }
    return wrapRequest<void>(request);
  }

  /**
   * Adds a new value into an Object Store and returns the new key. Similar to
   * IndexedDb's `add()`, this method will fail on primary key collisions.
   *
   * @param value The object to write.
   * @return The key of the value to add.
   */
  add(value: ValueType): PersistencePromise<KeyType> {
    debug(LOG_TAG, 'ADD', this.store.name, value, value);
    const request = this.store.add(value as ValueType);
    return wrapRequest<KeyType>(request);
  }

  /**
   * Gets the object with the specified key from the specified store, or null
   * if no object exists with the specified key.
   *
   * @key The key of the object to get.
   * @return The object with the specified key or null if no object exists.
   */
  get(key: KeyType): PersistencePromise<ValueType | null> {
    const request = this.store.get(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, We're doing an unsafe cast to ValueType.
    return wrapRequest<any>(request).next(result => {
      // Normalize nonexistence to null.
      if (result === undefined) {
        result = null;
      }
      debug(LOG_TAG, 'GET', this.store.name, key, result);
      return result;
    });
  }

  delete(key: KeyType | IDBKeyRange): PersistencePromise<void> {
    debug(LOG_TAG, 'DELETE', this.store.name, key);
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
    debug(LOG_TAG, 'COUNT', this.store.name);
    const request = this.store.count();
    return wrapRequest<number>(request);
  }

  loadAll(): PersistencePromise<ValueType[]>;
  loadAll(range: IDBKeyRange): PersistencePromise<ValueType[]>;
  loadAll(index: string, range: IDBKeyRange): PersistencePromise<ValueType[]>;
  loadAll(
    indexOrRange?: string | IDBKeyRange,
    range?: IDBKeyRange
  ): PersistencePromise<ValueType[]> {
    const cursor = this.cursor(this.options(indexOrRange, range));
    const results: ValueType[] = [];
    return this.iterateCursor(cursor, (key, value) => {
      results.push(value);
    }).next(() => {
      return results;
    });
  }

  deleteAll(): PersistencePromise<void>;
  deleteAll(range: IDBKeyRange): PersistencePromise<void>;
  deleteAll(index: string, range: IDBKeyRange): PersistencePromise<void>;
  deleteAll(
    indexOrRange?: string | IDBKeyRange,
    range?: IDBKeyRange
  ): PersistencePromise<void> {
    debug(LOG_TAG, 'DELETE ALL', this.store.name);
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
   * @param options Options specifying how to iterate the objects in the store.
   * @param callback will be called for each iterated object. Iteration can be
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

/**
 * Wraps an IDBRequest in a PersistencePromise, using the onsuccess / onerror
 * handlers to resolve / reject the PersistencePromise as appropriate.
 */
function wrapRequest<R>(request: IDBRequest): PersistencePromise<R> {
  return new PersistencePromise<R>((resolve, reject) => {
    request.onsuccess = (event: Event) => {
      const result = (event.target as IDBRequest).result;
      resolve(result);
    };

    request.onerror = (event: Event) => {
      const error = checkForAndReportiOSError(
        (event.target as IDBRequest).error!
      );
      reject(error);
    };
  });
}

// Guard so we only report the error once.
let reportedIOSError = false;
function checkForAndReportiOSError(error: DOMException): Error {
  const iOSVersion = SimpleDb.getIOSVersion(getUA());
  if (iOSVersion >= 12.2 && iOSVersion < 13) {
    const IOS_ERROR =
      'An internal error was encountered in the Indexed Database server';
    if (error.message.indexOf(IOS_ERROR) >= 0) {
      // Wrap error in a more descriptive one.
      const newError = new FirestoreError(
        'internal',
        `IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${IOS_ERROR}'. This is likely ` +
          `due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 ` +
          `for details and a potential workaround.`
      );
      if (!reportedIOSError) {
        reportedIOSError = true;
        // Throw a global exception outside of this promise chain, for the user to
        // potentially catch.
        setTimeout(() => {
          throw newError;
        }, 0);
      }
      return newError;
    }
  }
  return error;
}
