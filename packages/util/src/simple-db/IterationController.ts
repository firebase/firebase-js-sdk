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

import { PersistencePromise } from '../persistence_promise';
import { wrapRequest } from './util';

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
