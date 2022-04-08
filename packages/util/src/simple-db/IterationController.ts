import { PersistencePromise } from '../persistence_promise';
import { wrapRequest } from "./util";

/**
 * Callback used with iterate() method.
 * @internal
 */
 export type IterateCallback<KeyType, ValueType> = (
  key: KeyType,
  value: ValueType,
  control: IterationController
) => void | PersistencePromise<void>;

/**
 * A controller for iterating over a key range or index. It allows an iterate
 * callback to delete the currently-referenced object, or jump to a new key
 * within the key range or index.
 * @internal
 */

export class IterationController {
  private shouldStop = false;
  private nextKey: IDBValidKey | null = null;

  constructor(private dbCursor: IDBCursorWithValue) { }

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
