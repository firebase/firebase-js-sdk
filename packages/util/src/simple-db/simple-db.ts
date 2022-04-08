/**
 * @license
 * Copyright 2017 Google LLC
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

import { getUA, isIndexedDBAvailable } from '../environment';
import { assert } from '../assert';
import { PersistencePromise } from '../persistence_promise';
import { FirebaseError } from '../errors';
import { SimpleDbTransaction } from './SimpleDbTransaction';
import { SimpleDbStore } from './SimpleDbStore';
import {
  Code,
  getAndroidVersion,
  getIOSVersion,
  IndexedDbTransactionError,
  LOG_TAG,
  wrapRequest
} from './util';
import { SimpleDbSchemaConverter } from './types';

export { PersistencePromise, SimpleDbStore, SimpleDbTransaction };
export { isIndexedDbTransactionError, checkForAndReportiOSError } from './util';

// References to `window` are guarded by SimpleDb.isAvailable()
/* eslint-disable no-restricted-globals */

/**
 * The maximum number of retry attempts for an IndexedDb transaction that fails
 * with a DOMException.
 */
const TRANSACTION_RETRY_COUNT = 3;

// The different modes supported by `SimpleDb.runTransaction()`
type SimpleDbTransactionMode = 'readonly' | 'readwrite';

/**
 * Provides a wrapper around IndexedDb with a simplified interface that uses
 * Promise-like return values to chain operations. Real promises cannot be used
 * since .then() continuations are executed asynchronously (e.g. via
 * .setImmediate), which would cause IndexedDB to end the transaction.
 * See PersistencePromise for more details.
 * @internal
 */
export class SimpleDb {
  private db?: IDBDatabase;
  private versionchangelistener?: (event: IDBVersionChangeEvent) => void;

  /**
   * Deletes the specified database.
   */
  static delete(
    name: string,
    logDebug?: (...args: string[]) => void
  ): Promise<void> {
    logDebug && logDebug(LOG_TAG, 'Removing database:', name);
    return wrapRequest<void>(window.indexedDB.deleteDatabase(name)).toPromise();
  }

  /**
   * Returns true if the backing IndexedDB store is the Node IndexedDBShim
   * (see https://github.com/axemclion/IndexedDBShim).
   */
  static isMockPersistence(): boolean {
    return (
      typeof process !== 'undefined' &&
      process.env?.USE_MOCK_PERSISTENCE === 'YES'
    );
  }

  /**
   * Helper to get a typed SimpleDbStore from a transaction.
   */
  static getStore<KeyType extends IDBValidKey, ValueType extends unknown>(
    txn: SimpleDbTransaction,
    store: string
  ): SimpleDbStore<KeyType, ValueType> {
    return txn.store<KeyType, ValueType>(store);
  }

  /**
   * Returns true if IndexedDB is available in the current environment.
   */
  static isAvailable(): boolean {
    if (!isIndexedDBAvailable()) {
      return false;
    }

    if (SimpleDb.isMockPersistence()) {
      return true;
    }

    // We extensively use indexed array values and compound keys,
    // which IE and Edge do not support. However, they still have indexedDB
    // defined on the window, so we need to check for them here and make sure
    // to return that persistence is not enabled for those browsers.
    // For tracking support of this feature, see here:
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/

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
    const iOSVersion = getIOSVersion(ua);
    const isUnsupportedIOS = 0 < iOSVersion && iOSVersion < 10;

    // Android browser: Disable for userse running version < 4.5.
    const androidVersion = getAndroidVersion(ua);
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
  /*
   * Creates a new SimpleDb wrapper for IndexedDb database `name`.
   *
   * Note that `version` must not be a downgrade. IndexedDB does not support
   * downgrading the schema version. We currently do not support any way to do
   * versioning outside of IndexedDB's versioning mechanism, as only
   * version-upgrade transactions are allowed to do things like create
   * objectstores.
   */
  constructor(
    private readonly name: string,
    private readonly version: number,
    private readonly schemaConverter: SimpleDbSchemaConverter,
    private readonly logDebug: (...args: string[]) => void,
    private readonly logError: (...args: string[]) => void
  ) {
    assert(
      SimpleDb.isAvailable(),
      'IndexedDB not supported in current environment.'
    );

    const iOSVersion = getIOSVersion(getUA());
    // NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
    // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
    // whatever reason it's much harder to hit after 12.2 so we only proactively
    // log on 12.2.
    if (iOSVersion === 12.2) {
      this.logError(
        'Persistence suffers from a bug in iOS 12.2 ' +
          'Safari that may cause your app to stop working. See ' +
          'https://stackoverflow.com/q/56496296/110915 for details ' +
          'and a potential workaround.'
      );
    }
  }

  /**
   * Opens the specified database, creating or upgrading it if necessary.
   */
  async ensureDb(action: string): Promise<IDBDatabase> {
    if (!this.db) {
      this.logDebug(LOG_TAG, 'Opening database:', this.name);
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        // TODO(mikelehen): Investigate browser compatibility.
        // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
        // suggests IE9 and older WebKit browsers handle upgrade
        // differently. They expect setVersion, as described here:
        // https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeRequest/setVersion
        const request = indexedDB.open(this.name, this.version);

        request.onsuccess = (event: Event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onblocked = () => {
          reject(
            new IndexedDbTransactionError(
              action,
              'Cannot upgrade IndexedDB schema while another tab is open. ' +
                'Close all tabs that access Firebase and reload this page to proceed.'
            )
          );
        };

        request.onerror = (event: Event) => {
          const error: DOMException = (event.target as IDBOpenDBRequest).error!;
          if (error.name === 'VersionError') {
            reject(
              new FirebaseError(
                Code.FAILED_PRECONDITION,
                'A newer version of the Firebase SDK was previously used and so the persisted ' +
                  'data is not compatible with the version of the SDK you are now using. The SDK ' +
                  'will operate with persistence disabled. If you need persistence, please ' +
                  're-upgrade to a newer version of the SDK or else clear the persisted IndexedDB ' +
                  'data for your app to start fresh.'
              )
            );
          } else if (error.name === 'InvalidStateError') {
            reject(
              new FirebaseError(
                Code.FAILED_PRECONDITION,
                'Unable to open an IndexedDB connection. This could be due to running in a ' +
                  'private browsing session on a browser whose private browsing sessions do not ' +
                  'support IndexedDB: ' +
                  error
              )
            );
          } else {
            reject(new IndexedDbTransactionError(action, error));
          }
        };

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          this.logDebug(
            LOG_TAG,
            'Database "' + this.name + '" requires upgrade from version:',
            event.oldVersion.toString()
          );
          const db = (event.target as IDBOpenDBRequest).result;
          this.schemaConverter
            .createOrUpgrade(
              db,
              request.transaction!,
              event.oldVersion,
              this.version
            )
            .next(() => {
              this.logDebug(
                LOG_TAG,
                'Database upgrade to version ' + this.version + ' complete'
              );
            });
        };
      });
    }

    if (this.versionchangelistener) {
      this.db.onversionchange = event => this.versionchangelistener!(event);
    }
    return this.db;
  }

  setVersionChangeListener(
    versionChangeListener: (event: IDBVersionChangeEvent) => void
  ): void {
    this.versionchangelistener = versionChangeListener;
    if (this.db) {
      this.db.onversionchange = (event: IDBVersionChangeEvent) => {
        return versionChangeListener(event);
      };
    }
  }

  async runTransaction<T>(
    action: string,
    mode: SimpleDbTransactionMode,
    objectStores: string[],
    transactionFn: (transaction: SimpleDbTransaction) => PersistencePromise<T>
  ): Promise<T> {
    const readonly = mode === 'readonly';
    let attemptNumber = 0;

    while (true) {
      ++attemptNumber;

      try {
        this.db = await this.ensureDb(action);

        const transaction = SimpleDbTransaction.open(
          this.db,
          action,
          readonly ? 'readonly' : 'readwrite',
          objectStores,
          this.logDebug
        );
        const transactionFnResult = transactionFn(transaction)
          .next(result => {
            transaction.maybeCommit();
            return result;
          })
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
        await transaction.completionPromise;
        return transactionFnResult;
      } catch (error) {
        // TODO(schmidt-sebastian): We could probably be smarter about this and
        // not retry exceptions that are likely unrecoverable (such as quota
        // exceeded errors).

        // Note: We cannot use an instanceof check for FirestoreException, since the
        // exception is wrapped in a generic error by our async/await handling.
        const retryable =
          error.name !== 'FirebaseError' &&
          attemptNumber < TRANSACTION_RETRY_COUNT;
        this.logDebug(
          LOG_TAG,
          'Transaction failed with error:',
          error.message,
          'Retrying:',
          retryable.toString()
        );

        this.close();

        if (!retryable) {
          return Promise.reject(error);
        }
      }
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = undefined;
  }
}
