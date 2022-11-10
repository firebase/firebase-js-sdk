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

import * as fs from 'fs';
import * as os from 'os';

import { FakeWindow, SharedFakeWebStorage } from './test_platform';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny = global as any;

class PgOpenDBRequest extends IDBOpenDBRequest {

}

class PgFactory extends IDBFactory {
  open(name:string, version?:number): IDBOpenDBRequest {
    return new PgOpenDBRequest();
  }
  
  deleteDatabase(name: string): IDBOpenDBRequest {
    return new PgOpenDBRequest();
  }
}

class PgDatabase extends IDBDatabase {}
class PgTransaction extends IDBTransaction {}
type PgTransactionMode = IDBTransactionMode;
type PgRequest = IDBRequest;
type PgValidKey = IDBValidKey;
type PgVersionChangeEvent = IDBVersionChangeEvent;
type PgCursor = IDBCursor;
type PgCursorWithValue = IDBCursorWithValue;
type PgObjectStore = IDBObjectStore;
type PgCursorDirection = IDBCursorDirection;
type PgKeyRange = IDBKeyRange;

function registerIndexedDBPGShim(conn: string) {
  globalAny.indexDB = new PgFactory();
}

if (process.env.USE_PG_PERSISTENCE === 'YES') {
  registerIndexedDBPGShim('');

  // 'indexeddbshim' installs IndexedDB onto `globalAny`, which means we don't
  // have to register it ourselves.
  const fakeWindow = new FakeWindow(
    new SharedFakeWebStorage(),
    globalAny.indexedDB
  );

  globalAny.window = fakeWindow;

  // We need to define the `Event` type as it is used in Node to send events to
  // WebStorage when using both the IndexedDB mock and the WebStorage mock.
  class Event {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(typeArg: string, eventInitDict?: EventInit) {}
  }

  globalAny.Event = Event;
}
