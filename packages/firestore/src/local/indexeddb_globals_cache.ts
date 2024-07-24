/**
 * @license
 * Copyright 2024 Google LLC
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
import { ByteString } from '../util/byte_string';
import { GlobalsCache } from './globals_cache';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { SimpleDbStore } from './simple_db';
import { DbGlobalsStore, DbGlobalsKey } from './indexeddb_sentinels';
import { DbGlobals } from './indexeddb_schema';
import { getStore } from './indexeddb_transaction';

export class IndexedDbGlobalsCache implements GlobalsCache {
  private globalsStore(
    txn: PersistenceTransaction
  ): SimpleDbStore<DbGlobalsKey, DbGlobals> {
    return getStore<DbGlobalsKey, DbGlobals>(txn, DbGlobalsStore);
  }

  getSessionToken(txn: PersistenceTransaction): PersistencePromise<ByteString> {
    const globals = this.globalsStore(txn);
    return globals.get('sessionToken').next(global => {
      const value = global?.value;
      return value
        ? ByteString.fromUint8Array(value)
        : ByteString.EMPTY_BYTE_STRING;
    });
  }

  setSessionToken(
    txn: PersistenceTransaction,
    sessionToken: ByteString
  ): PersistencePromise<void> {
    const globals = this.globalsStore(txn);
    return globals.put({
      name: 'sessionToken',
      value: sessionToken.toUint8Array()
    });
  }
}
