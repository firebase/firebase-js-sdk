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

import { Client } from 'pg';

import { FakeWindow, SharedFakeWebStorage } from './test_platform';
import { logDebug } from '../../src/util/log';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny = global as any;

// class PgOpenDBRequest extends IDBOpenDBRequest {}
type PgOpenDBRequest = {};

class PgFactory {
  open(name: string, version?: number): PgOpenDBRequest {
    const request: any = {};

    // Open PG connection here!
    logDebug('PG', `connecting to db dbver${version}`);
    const pgClient = new Client({ database: `dbver${version}` });
    pgClient
      .connect()
      .then(() => {
        logDebug('PG', `PG open ok`);
        request.result = new PgDatabase(pgClient);
        if (request.onsuccess) {
          request.onsuccess({ target: request } as any);
        }
      })
      .catch((e: any) => {
        logDebug('PG', `open failed with ${e}`);
        request.error = new DOMException(`PG failed with ${e}`, `PG`);
        if (request.onerror) {
          request.onerror({ target: request } as any);
        }
      });

    return request;
  }

  deleteDatabase(name: string): PgOpenDBRequest {
    const request: any = {};
    request.result = {};

    if (request.onsuccess) {
      request.onsuccess({ target: request } as any);
    }

    return request;
  }
}

class PgDatabase {
  constructor(public pgClient: Client) {}

  close() {}

  // createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore {
  //   return {} as IDBObjectStore;
  // }

  deleteObjectStore(name: string) {}

  transaction(storeNames: string | string[], mode?: string): PgTransaction {
    return new PgTransaction(this, mode);
  }
}

class PgTransaction {
  readonly error: any;

  constructor(db: PgDatabase, mode?: string) {}

  abort() {}

  objectStore(name: string): PgObjectStore {
    return new PgObjectStore();
  }
}

type PgValidKey = number | string | Date | BufferSource | PgArrayKey;
type PgArrayKey = Array<PgValidKey>;

class PgRequest<K> {}

class PgIndex {}

type PgIndexParameters = {
  multiEntry: boolean;
  unique: boolean;
};

class PgKeyRange {
  lower: any;
  lowerOpen: boolean | undefined;
  upper: any;
  upperOpen: boolean | undefined;

  includes(key: any): boolean {
    return false;
  }

  static bound(
    lower: any,
    upper: any,
    lowerOpen?: boolean,
    upperOpen?: boolean
  ): PgKeyRange {
    return new PgKeyRange();
  }

  static lowerBound(lower: any, lowerOpen?: boolean): PgKeyRange {
    return new PgKeyRange();
  }
  static upperBound(upper: any, upperOpen?: boolean): PgKeyRange {
    return new PgKeyRange();
  }
  static only(v: any): PgKeyRange {
    return new PgKeyRange();
  }
}

type PgCursorDirection = 'next' | 'nextunique' | 'prev' | 'prevunique';
class PgCursor {
  readonly direction: PgCursorDirection;
  readonly key: PgValidKey;
  readonly primaryKey: PgValidKey;
  readonly source: PgObjectStore | PgIndex;

  constructor(
    direction: PgCursorDirection,
    key: PgValidKey,
    primaryKey: PgValidKey,
    source: PgObjectStore | PgIndex
  ) {
    this.direction = direction;
    this.key = key;
    this.primaryKey = primaryKey;
    this.source = source;
  }

  advance(count: number) {}

  continue(key?: PgValidKey) {}

  continuePrimaryKey(key: PgValidKey, primaryKey: PgValidKey) {}

  delete(): PgRequest<undefined> {
    return new PgRequest();
  }

  update(value: any): PgRequest<PgValidKey> {
    return new PgRequest();
  }
}
class PgCursorWithValue extends PgCursor {
  readonly value;

  constructor(
    direction: PgCursorDirection,
    key: PgValidKey,
    primaryKey: PgValidKey,
    source: PgObjectStore | PgIndex,
    value: any
  ) {
    super(direction, key, primaryKey, source);
    this.value = value;
  }
}

class PgObjectStore {
  add(value: any, key?: PgValidKey): PgRequest<PgValidKey> {
    return new PgRequest<PgValidKey>();
  }

  clear(): PgRequest<undefined> {
    return new PgRequest<undefined>();
  }

  count(key?: PgValidKey | PgKeyRange): PgRequest<number> {
    return new PgRequest<number>();
  }

  createIndex(
    name: string,
    keyPath: string | string[],
    options?: PgIndexParameters
  ): PgIndex {
    return new PgIndex();
  }

  delete(key: PgValidKey | PgKeyRange): PgRequest<undefined> {
    return new PgRequest<undefined>();
  }

  deleteIndex(name: string) {}

  get(query: PgValidKey | PgKeyRange): PgRequest<any> {
    return new PgRequest();
  }

  getAll(
    query?: PgValidKey | PgKeyRange | null,
    count?: number
  ): PgRequest<any[]> {
    return new PgRequest();
  }

  getAllKeys(
    query?: PgValidKey | PgKeyRange | null,
    count?: number
  ): PgRequest<PgValidKey[]> {
    return new PgRequest();
  }

  getKey(query: PgValidKey | PgKeyRange): PgRequest<PgValidKey | undefined> {
    return new PgRequest();
  }

  index(name: string): PgIndex {
    return new PgIndex();
  }

  openCursor(
    query?: PgValidKey | PgKeyRange | null,
    direction?: PgCursorDirection
  ): PgRequest<PgCursorWithValue | null> {
    return new PgRequest();
  }

  openKeyCursor(
    query?: PgValidKey | PgKeyRange | null,
    direction?: PgCursorDirection
  ): PgRequest<PgCursor | null> {
    return new PgRequest();
  }

  put(value: any, key?: PgValidKey): PgRequest<PgValidKey> {
    return new PgRequest();
  }
}

// class PgTransaction extends IDBTransaction {}
/*
type PgTransactionMode = IDBTransactionMode;
type PgVersionChangeEvent = IDBVersionChangeEvent;
type PgCursor = IDBCursor;
type PgCursorWithValue = IDBCursorWithValue;
type PgCursorDirection = IDBCursorDirection;
 */

function registerIndexedDBPGShim(conn: string) {
  globalAny.indexedDB = new PgFactory();
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
