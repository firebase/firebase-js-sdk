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

/**
 * Options available to the iterate() method.
 * @internal
 */

import { PersistencePromise } from '../persistence_promise';

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
