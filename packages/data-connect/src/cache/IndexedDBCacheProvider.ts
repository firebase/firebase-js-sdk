/**
 * @license
 * Copyright 2025 Google LLC
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

import { Deferred } from '@firebase/util';

import { InternalCacheProvider } from './CacheProvider';
import { EntityDataObject } from './EntityDataObject';
import { ResultTree } from './ResultTree';
export const BDO_OBJECT_STORE_NAME = 'data-connect-bdos';
export const SRT_OBJECT_STORE_NAME = 'data-connect-srts';
export class IndexedDBCacheProvider implements InternalCacheProvider {
  private bdos = new Map<string, EntityDataObject>();
  private resultTrees = new Map<string, ResultTree>();
  private idbManager?: IndexedDbManager;
  private initialized = false;
  isIdbAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  // TODO: Figure out how to deal with caching across tabs.
  // We could use the web locks api
  constructor(private cacheId: string) {
    if (!this.isIdbAvailable()) {
      return;
    }
    this.idbManager = new IndexedDbManager(this.cacheId);
    this.idbManager.open(1);
  }
  async initialize(): Promise<void> {
    // load BDOs
    if (this.initialized || !this.idbManager) {
      return;
    }
    const db = await this.idbManager.dbPromise;
    const resultTrees = await this.idbManager.readFromDb(db);
    resultTrees.forEach((resultTree, key) => {
      this.resultTrees.set(key, resultTree);
    });
  }
  async commitBdoChanges(backingData: EntityDataObject): Promise<void> {
    // TODO: Move these into a new function.
    if (!this.isIdbAvailable()) {
      return;
    }
    await this.initialize();
    void this.idbManager!.updateBdo(backingData);
  }
  async commitResultTreeChanges(
    queryId: string,
    rt: ResultTree
  ): Promise<void> {
    if (!this.isIdbAvailable()) {
      return;
    }
    await this.initialize();
    void this.idbManager!.updateResultTree(rt, queryId);
  }
  async setResultTree(queryId: string, rt: ResultTree): Promise<void> {
    this.resultTrees.set(queryId, rt);
    // maybe this needs to be async?
    // TODO: replace array with valid data
    await this.commitResultTreeChanges(queryId, rt);
  }
  async getResultTree(queryId: string): Promise<ResultTree | undefined> {
    await this.initialize();
    const ret = this.resultTrees.get(queryId);
    return ret;
  }
  createGlobalId(): string {
    return crypto.randomUUID();
  }
  async getBdo(globalId: string): Promise<EntityDataObject> {
    await this.initialize();
    if (!this.bdos.has(globalId)) {
      this.bdos.set(globalId, new EntityDataObject(globalId));
    }
    // Because of the above, we can guarantee that there will be a BDO at the globalId.
    return this.bdos.get(globalId)!;
  }
  async updateBackingData(backingData: EntityDataObject): Promise<void> {
    this.bdos.set(backingData.globalID, backingData);
    await this.commitBdoChanges(backingData);
  }
  async close(): Promise<void> {
    await this.idbManager?.close();
  }
}

const dbName = 'data-connect';
class IndexedDbManager {
  dbDeferred: Deferred<IDBDatabase>;
  dbPromise: Promise<IDBDatabase>;
  alreadyRead = false;
  constructor(private cacheId: string) {
    this.dbDeferred = new Deferred();
    this.dbPromise = this.dbDeferred.promise;
  }
  open(version: number): void {
    // TODO: See when, or if ever, cacheId is null
    const request = indexedDB.open(`${dbName}-${this.cacheId}`, version);
    request.onupgradeneeded = event => {
      // TODO: Handle what happens if the version changes.
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore(BDO_OBJECT_STORE_NAME);
      db.createObjectStore(SRT_OBJECT_STORE_NAME);
      this.dbDeferred.resolve(db);
    };
    request.onsuccess = async event => {
      const db = (event.target as IDBOpenDBRequest).result;
      this.dbDeferred.resolve(db);
    };
    request.onerror = error => {
      // TODO(mtewani): Use proper error.
      this.dbDeferred.reject(error);
    };
  }
  async updateBdo(backingData: EntityDataObject): Promise<void> {
    const db = await this.dbPromise;
    db?.transaction([BDO_OBJECT_STORE_NAME], 'readwrite')
      .objectStore(BDO_OBJECT_STORE_NAME)
      .put(backingData, backingData.globalID);
  }
  async updateResultTree(rt: ResultTree, queryId: string): Promise<void> {
    const db = await this.dbPromise;
    const objectStore = db
      .transaction([SRT_OBJECT_STORE_NAME], 'readwrite')
      .objectStore(SRT_OBJECT_STORE_NAME);
    // TODO: What happens if you override an existing entry?
    // TODO: We should first check whether the tree is hydrated or not.
    // TODO: We should make sure that everything has been written.
    objectStore.put(rt.getRootStub().toStorableJson(), queryId);
  }
  async readFromDb(db: IDBDatabase): Promise<Map<string, ResultTree>> {
    const resultTrees = new Map<string, ResultTree>();
    if (this.alreadyRead) {
      return resultTrees;
    }
    const bdos = new Map<string, EntityDataObject>();
    const tx = db.transaction(
      [BDO_OBJECT_STORE_NAME, SRT_OBJECT_STORE_NAME],
      'readonly'
    );
    const bdoStore = tx.objectStore(BDO_OBJECT_STORE_NAME);
    const srtStore = tx.objectStore(SRT_OBJECT_STORE_NAME);
    const bdoComplete = new Promise((resolve, reject) => {
      const openCursor = bdoStore.openCursor();
      openCursor.onsuccess = event => {
        const cursor = (event.target as IDBRequest)
          .result as IDBCursorWithValue;
        if (cursor) {
          bdos.set(
            cursor.key as string,
            EntityDataObject.fromStorableJson(cursor.value)
          );
          cursor.continue();
        } else {
          // No more entries
          resolve(null);
        }
      };
      openCursor.onerror = error => {
        console.error(error);
        reject(error);
      };
    });
    const srtComplete = new Promise((resolve, reject) => {
      const openCursor = srtStore.openCursor();
      openCursor.onsuccess = event => {
        const cursor = (event.target as IDBRequest)
          .result as IDBCursorWithValue;
        if (cursor) {
          const srt = ResultTree.parse(cursor.value);
          resultTrees.set(cursor.key as string, srt);
          cursor.continue();
        } else {
          // No more entries
          resolve(null);
        }
      };
      openCursor.onerror = error => {
        console.error(error);
        reject(error);
      };
    });
    await Promise.all([bdoComplete, srtComplete]);
    return resultTrees;
  }
  async close(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
  }
}
