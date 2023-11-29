/**
 * @license
 * Copyright 2019 Google LLC
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

import { Persistence } from '../../model/public_types';
import {
  PersistedBlob,
  PersistenceInternal as InternalPersistence,
  PersistenceType,
  PersistenceValue,
  StorageEventListener,
  STORAGE_AVAILABLE_KEY
} from '../../core/persistence/';
import {
  _EventType,
  _PingResponse,
  KeyChangedResponse,
  KeyChangedRequest,
  PingRequest,
  _TimeoutDuration
} from '../messagechannel/index';
import { Receiver } from '../messagechannel/receiver';
import { Sender } from '../messagechannel/sender';
import {
  _isWorker,
  _getActiveServiceWorker,
  _getServiceWorkerController,
  _getWorkerGlobalScope
} from '../util/worker';

export const DB_NAME = 'firebaseLocalStorageDb';
const DB_VERSION = 1;
const DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
const DB_DATA_KEYPATH = 'fbase_key';

interface DBObject {
  [DB_DATA_KEYPATH]: string;
  value: PersistedBlob;
}

/**
 * Promise wrapper for IDBRequest
 *
 * Unfortunately we can't cleanly extend Promise<T> since promises are not callable in ES6
 *
 */
class DBPromise<T> {
  constructor(private readonly request: IDBRequest) {}

  toPromise(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.request.addEventListener('success', () => {
        resolve(this.request.result);
      });
      this.request.addEventListener('error', () => {
        reject(this.request.error);
      });
    });
  }
}

function getObjectStore(db: IDBDatabase, isReadWrite: boolean): IDBObjectStore {
  return db
    .transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly')
    .objectStore(DB_OBJECTSTORE_NAME);
}

export async function _clearDatabase(db: IDBDatabase): Promise<void> {
  const objectStore = getObjectStore(db, true);
  return new DBPromise<void>(objectStore.clear()).toPromise();
}

export function _deleteDatabase(): Promise<void> {
  const request = indexedDB.deleteDatabase(DB_NAME);
  return new DBPromise<void>(request).toPromise();
}

export function _openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  return new Promise((resolve, reject) => {
    request.addEventListener('error', () => {
      reject(request.error);
    });

    request.addEventListener('upgradeneeded', () => {
      const db = request.result;

      try {
        db.createObjectStore(DB_OBJECTSTORE_NAME, { keyPath: DB_DATA_KEYPATH });
      } catch (e) {
        reject(e);
      }
    });

    request.addEventListener('success', async () => {
      const db: IDBDatabase = request.result;
      // Strange bug that occurs in Firefox when multiple tabs are opened at the
      // same time. The only way to recover seems to be deleting the database
      // and re-initializing it.
      // https://github.com/firebase/firebase-js-sdk/issues/634

      if (!db.objectStoreNames.contains(DB_OBJECTSTORE_NAME)) {
        // Need to close the database or else you get a `blocked` event
        db.close();
        await _deleteDatabase();
        resolve(await _openDatabase());
      } else {
        resolve(db);
      }
    });
  });
}

export async function _putObject(
  db: IDBDatabase,
  key: string,
  value: PersistenceValue | string
): Promise<void> {
  const request = getObjectStore(db, true).put({
    [DB_DATA_KEYPATH]: key,
    value
  });
  return new DBPromise<void>(request).toPromise();
}

async function getObject(
  db: IDBDatabase,
  key: string
): Promise<PersistedBlob | null> {
  const request = getObjectStore(db, false).get(key);
  const data = await new DBPromise<DBObject | undefined>(request).toPromise();
  return data === undefined ? null : data.value;
}

export function _deleteObject(db: IDBDatabase, key: string): Promise<void> {
  const request = getObjectStore(db, true).delete(key);
  return new DBPromise<void>(request).toPromise();
}

export const _POLLING_INTERVAL_MS = 800;
export const _TRANSACTION_RETRY_COUNT = 3;

class IndexedDBLocalPersistence implements InternalPersistence {
  static type: 'LOCAL' = 'LOCAL';

  type = PersistenceType.LOCAL;
  db?: IDBDatabase;
  readonly _shouldAllowMigration = true;

  private readonly listeners: Record<string, Set<StorageEventListener>> = {};
  private readonly localCache: Record<string, PersistenceValue | null> = {};
  // setTimeout return value is platform specific
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pollTimer: any | null = null;
  private pendingWrites = 0;

  private receiver: Receiver | null = null;
  private sender: Sender | null = null;
  private serviceWorkerReceiverAvailable = false;
  private activeServiceWorker: ServiceWorker | null = null;
  // Visible for testing only
  readonly _workerInitializationPromise: Promise<void>;

  constructor() {
    // Fire & forget the service worker registration as it may never resolve
    this._workerInitializationPromise =
      this.initializeServiceWorkerMessaging().then(
        () => {},
        () => {}
      );
  }

  async _openDb(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    this.db = await _openDatabase();
    return this.db;
  }

  async _withRetries<T>(op: (db: IDBDatabase) => Promise<T>): Promise<T> {
    let numAttempts = 0;

    while (true) {
      try {
        const db = await this._openDb();
        return await op(db);
      } catch (e) {
        if (numAttempts++ > _TRANSACTION_RETRY_COUNT) {
          throw e;
        }
        if (this.db) {
          this.db.close();
          this.db = undefined;
        }
        // TODO: consider adding exponential backoff
      }
    }
  }

  /**
   * IndexedDB events do not propagate from the main window to the worker context.  We rely on a
   * postMessage interface to send these events to the worker ourselves.
   */
  private async initializeServiceWorkerMessaging(): Promise<void> {
    return _isWorker() ? this.initializeReceiver() : this.initializeSender();
  }

  /**
   * As the worker we should listen to events from the main window.
   */
  private async initializeReceiver(): Promise<void> {
    this.receiver = Receiver._getInstance(_getWorkerGlobalScope()!);
    // Refresh from persistence if we receive a KeyChanged message.
    this.receiver._subscribe(
      _EventType.KEY_CHANGED,
      async (_origin: string, data: KeyChangedRequest) => {
        const keys = await this._poll();
        return {
          keyProcessed: keys.includes(data.key)
        };
      }
    );
    // Let the sender know that we are listening so they give us more timeout.
    this.receiver._subscribe(
      _EventType.PING,
      async (_origin: string, _data: PingRequest) => {
        return [_EventType.KEY_CHANGED];
      }
    );
  }

  /**
   * As the main window, we should let the worker know when keys change (set and remove).
   *
   * @remarks
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready | ServiceWorkerContainer.ready}
   * may not resolve.
   */
  private async initializeSender(): Promise<void> {
    // Check to see if there's an active service worker.
    this.activeServiceWorker = await _getActiveServiceWorker();
    if (!this.activeServiceWorker) {
      return;
    }
    this.sender = new Sender(this.activeServiceWorker);
    // Ping the service worker to check what events they can handle.
    const results = await this.sender._send<_PingResponse, PingRequest>(
      _EventType.PING,
      {},
      _TimeoutDuration.LONG_ACK
    );
    if (!results) {
      return;
    }
    if (
      results[0]?.fulfilled &&
      results[0]?.value.includes(_EventType.KEY_CHANGED)
    ) {
      this.serviceWorkerReceiverAvailable = true;
    }
  }

  /**
   * Let the worker know about a changed key, the exact key doesn't technically matter since the
   * worker will just trigger a full sync anyway.
   *
   * @remarks
   * For now, we only support one service worker per page.
   *
   * @param key - Storage key which changed.
   */
  private async notifyServiceWorker(key: string): Promise<void> {
    if (
      !this.sender ||
      !this.activeServiceWorker ||
      _getServiceWorkerController() !== this.activeServiceWorker
    ) {
      return;
    }
    try {
      await this.sender._send<KeyChangedResponse, KeyChangedRequest>(
        _EventType.KEY_CHANGED,
        { key },
        // Use long timeout if receiver has previously responded to a ping from us.
        this.serviceWorkerReceiverAvailable
          ? _TimeoutDuration.LONG_ACK
          : _TimeoutDuration.ACK
      );
    } catch {
      // This is a best effort approach. Ignore errors.
    }
  }

  async _isAvailable(): Promise<boolean> {
    try {
      if (!indexedDB) {
        return false;
      }
      const db = await _openDatabase();
      await _putObject(db, STORAGE_AVAILABLE_KEY, '1');
      await _deleteObject(db, STORAGE_AVAILABLE_KEY);
      return true;
    } catch {}
    return false;
  }

  private async _withPendingWrite(write: () => Promise<void>): Promise<void> {
    this.pendingWrites++;
    try {
      await write();
    } finally {
      this.pendingWrites--;
    }
  }

  async _set(key: string, value: PersistenceValue): Promise<void> {
    return this._withPendingWrite(async () => {
      await this._withRetries((db: IDBDatabase) => _putObject(db, key, value));
      this.localCache[key] = value;
      return this.notifyServiceWorker(key);
    });
  }

  async _get<T extends PersistenceValue>(key: string): Promise<T | null> {
    const obj = (await this._withRetries((db: IDBDatabase) =>
      getObject(db, key)
    )) as T;
    this.localCache[key] = obj;
    return obj;
  }

  async _remove(key: string): Promise<void> {
    return this._withPendingWrite(async () => {
      await this._withRetries((db: IDBDatabase) => _deleteObject(db, key));
      delete this.localCache[key];
      return this.notifyServiceWorker(key);
    });
  }

  private async _poll(): Promise<string[]> {
    // TODO: check if we need to fallback if getAll is not supported
    const result = await this._withRetries((db: IDBDatabase) => {
      const getAllRequest = getObjectStore(db, false).getAll();
      return new DBPromise<DBObject[] | null>(getAllRequest).toPromise();
    });

    if (!result) {
      return [];
    }

    // If we have pending writes in progress abort, we'll get picked up on the next poll
    if (this.pendingWrites !== 0) {
      return [];
    }

    const keys = [];
    const keysInResult = new Set();
    if (result.length !== 0) {
      for (const { fbase_key: key, value } of result) {
        keysInResult.add(key);
        if (JSON.stringify(this.localCache[key]) !== JSON.stringify(value)) {
          this.notifyListeners(key, value as PersistenceValue);
          keys.push(key);
        }
      }
    }

    for (const localKey of Object.keys(this.localCache)) {
      if (this.localCache[localKey] && !keysInResult.has(localKey)) {
        // Deleted
        this.notifyListeners(localKey, null);
        keys.push(localKey);
      }
    }
    return keys;
  }

  private notifyListeners(
    key: string,
    newValue: PersistenceValue | null
  ): void {
    this.localCache[key] = newValue;
    const listeners = this.listeners[key];
    if (listeners) {
      for (const listener of Array.from(listeners)) {
        listener(newValue);
      }
    }
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollTimer = setInterval(
      async () => this._poll(),
      _POLLING_INTERVAL_MS
    );
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  _addListener(key: string, listener: StorageEventListener): void {
    if (Object.keys(this.listeners).length === 0) {
      this.startPolling();
    }
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
      // Populate the cache to avoid spuriously triggering on first poll.
      void this._get(key); // This can happen in the background async and we can return immediately.
    }
    this.listeners[key].add(listener);
  }

  _removeListener(key: string, listener: StorageEventListener): void {
    if (this.listeners[key]) {
      this.listeners[key].delete(listener);

      if (this.listeners[key].size === 0) {
        delete this.listeners[key];
      }
    }

    if (Object.keys(this.listeners).length === 0) {
      this.stopPolling();
    }
  }
}

/**
 * An implementation of {@link Persistence} of type `LOCAL` using `indexedDB`
 * for the underlying storage.
 *
 * @public
 */
export const indexedDBLocalPersistence: Persistence = IndexedDBLocalPersistence;
