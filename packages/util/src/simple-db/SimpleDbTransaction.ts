import { assert } from '../assert';
import { Deferred } from '../deferred';
import { IndexedDbTransactionError, checkForAndReportiOSError, LOG_TAG } from './util';
import { SimpleDbStore } from "./SimpleDbStore";

/**
 * Wraps an IDBTransaction and exposes a store() method to get a handle to a
 * specific object store.
 * @internal
 */

export class SimpleDbTransaction {
  private aborted = false;

  /**
   * A `Promise` that resolves with the result of the IndexedDb transaction.
   */
  private readonly completionDeferred = new Deferred<void>();

  static open(
    db: IDBDatabase,
    action: string,
    mode: IDBTransactionMode,
    objectStoreNames: string[],
    logDebug: (...args: string[]) => void
  ): SimpleDbTransaction {
    try {
      return new SimpleDbTransaction(
        action,
        db.transaction(objectStoreNames, mode),
        logDebug
      );
    } catch (e) {
      throw new IndexedDbTransactionError(action, e);
    }
  }

  constructor(
    private readonly action: string,
    private readonly transaction: IDBTransaction,
    private readonly logDebug: (...args: string[]) => void
  ) {
    this.transaction.oncomplete = () => {
      this.completionDeferred.resolve();
    };
    this.transaction.onabort = () => {
      if (transaction.error) {
        this.completionDeferred.reject(
          new IndexedDbTransactionError(action, transaction.error)
        );
      } else {
        this.completionDeferred.resolve();
      }
    };
    this.transaction.onerror = (event: Event) => {
      const error = checkForAndReportiOSError(
        (event.target as IDBRequest).error!
      );
      this.completionDeferred.reject(
        new IndexedDbTransactionError(action, error)
      );
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
      this.logDebug(
        LOG_TAG,
        'Aborting transaction:',
        error ? error.message : 'Client-initiated abort'
      );
      this.aborted = true;
      this.transaction.abort();
    }
  }

  maybeCommit(): void {
    // If the browser supports V3 IndexedDB, we invoke commit() explicitly to
    // speed up index DB processing if the event loop remains blocks.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeV3IndexedDb = this.transaction as any;
    if (!this.aborted && typeof maybeV3IndexedDb.commit === 'function') {
      maybeV3IndexedDb.commit();
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
    return new SimpleDbStore<KeyType, ValueType>(store, this.logDebug);
  }
}
