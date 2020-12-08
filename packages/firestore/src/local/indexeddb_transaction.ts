/**
 * @license
 * Copyright 2020 Google LLC
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

import { ListenSequenceNumber } from '../core/types';
import { debugCast } from '../util/assert';

import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDb, SimpleDbStore, SimpleDbTransaction } from './simple_db';

export class IndexedDbTransaction extends PersistenceTransaction {
  constructor(
    readonly simpleDbTransaction: SimpleDbTransaction,
    readonly currentSequenceNumber: ListenSequenceNumber
  ) {
    super();
  }
}

export function getStore<Key extends IDBValidKey, Value>(
  txn: PersistenceTransaction,
  store: string
): SimpleDbStore<Key, Value> {
  const indexedDbTransaction = debugCast(txn, IndexedDbTransaction);
  return SimpleDb.getStore<Key, Value>(
    indexedDbTransaction.simpleDbTransaction,
    store
  );
}
