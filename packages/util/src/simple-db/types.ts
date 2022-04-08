/**
 * Options available to the iterate() method.
 * @internal
 */

import { PersistencePromise } from "../persistence_promise";

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
 * @internal
 */
export interface SimpleDbSchemaConverter {
  createOrUpgrade(
    db: IDBDatabase,
    txn: IDBTransaction,
    fromVersion: number,
    toVersion: number
  ): PersistencePromise<void>;
}
