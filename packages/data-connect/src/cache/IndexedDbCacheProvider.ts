/**
 * @license
 * Copyright 2026 Google LLC
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

import { InternalCacheProvider } from './CacheProvider';
import { EntityDataObject, EntityDataObjectJson } from './EntityDataObject';
import { GLOBAL_ID_KEY, EncodingMode } from './EntityNode';
import { ResultTree } from './ResultTree';

/**
 * Synchronously scans the entityIds schema to extract all global ID strings.
 */
export function extractGlobalIds(entityIds: Record<string, unknown> | undefined): string[] {
  if (!entityIds) {
    return [];
  }
  const ids = new Set<string>();
  const visited = new Set<any>();
  function recurse(obj: any) {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) {
      return;
    }
    visited.add(obj);
    if (obj[GLOBAL_ID_KEY] && typeof obj[GLOBAL_ID_KEY] === 'string') {
      ids.add(obj[GLOBAL_ID_KEY]);
    }
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && key !== GLOBAL_ID_KEY) {
        const val = obj[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            recurse(item);
          }
        } else {
          recurse(val);
        }
      }
    }
  }
  recurse(entityIds);
  return Array.from(ids);
}

/**
 * Persistent cache provider class implementing InternalCacheProvider using IndexedDB.
 * Enforces a Pre-fetch and Batch-Write pattern to avoid TransactionInactiveError.
 */
export class PersistentCacheProvider implements InternalCacheProvider {
  private db: IDBDatabase | null = null;
  private sessionEntities = new Map<string, EntityDataObject>();
  private pendingWrites = new Map<string, EntityDataObject>();

  /** Client ID of this SDK tab instance, used to verify leadership lease. */
  myClientId: string | null = null;

  constructor(private readonly dbName: string) { }

  private openDb(): Promise<IDBDatabase> {
    if (this.db) {
      return Promise.resolve(this.db);
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
        if (!db.objectStoreNames.contains('followerHeartbeats')) {
          db.createObjectStore('followerHeartbeats', { keyPath: 'clientId' });
        }
        if (!db.objectStoreNames.contains('resultTrees')) {
          db.createObjectStore('resultTrees');
        }
        if (!db.objectStoreNames.contains('entityDataObjects')) {
          db.createObjectStore('entityDataObjects');
        }
      };
      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db!);
      };
      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Initiates a write session by pre-fetching all matching existing entities
   * in parallel into an in-memory map using a single read-only transaction.
   */
  async startWriteSession(entityIds: Record<string, unknown>): Promise<void> {
    const globalIds = extractGlobalIds(entityIds);
    if (globalIds.length === 0) {
      return;
    }
    const db = await this.openDb();
    const tx = db.transaction('entityDataObjects', 'readonly');
    const store = tx.objectStore('entityDataObjects');

    const reads = globalIds.map(id => {
      return new Promise<EntityDataObjectJson | null>((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });

    const results = await Promise.all(reads);
    for (let i = 0; i < globalIds.length; i++) {
      const id = globalIds[i];
      const res = results[i];
      if (res) {
        this.sessionEntities.set(id, EntityDataObject.fromJSON(res));
      } else {
        this.sessionEntities.set(id, new EntityDataObject(id));
      }
    }
  }

  async getEntityData(globalId: string): Promise<EntityDataObject> {
    let edo = this.sessionEntities.get(globalId);
    if (edo) {
      return edo;
    }
    // Fallback if called outside of a write session
    const db = await this.openDb();
    const tx = db.transaction('entityDataObjects', 'readonly');
    const store = tx.objectStore('entityDataObjects');
    const res = await new Promise<EntityDataObjectJson | null>((resolve, reject) => {
      const req = store.get(globalId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (res) {
      return EntityDataObject.fromJSON(res);
    }
    const newEdo = new EntityDataObject(globalId);
    this.sessionEntities.set(globalId, newEdo);
    return newEdo;
  }

  async updateEntityData(entityData: EntityDataObject): Promise<void> {
    if (this.sessionEntities.size > 0) {
      this.pendingWrites.set(entityData.globalID, entityData);
      return;
    }
    // Fallback write if called outside of a write session
    const db = await this.openDb();
    const tx = db.transaction('entityDataObjects', 'readwrite');
    const store = tx.objectStore('entityDataObjects');
    store.put(entityData.toJSON(), entityData.globalID);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getResultTree(queryId: string): Promise<ResultTree | undefined> {
    const db = await this.openDb();
    const tx = db.transaction('resultTrees', 'readonly');
    const store = tx.objectStore('resultTrees');
    const res = await new Promise<any | undefined>((resolve, reject) => {
      const req = store.get(queryId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!res) {
      return undefined;
    }
    return ResultTree.fromJson(res);
  }

  /**
   * Performs atomic write in a single transaction, double-checking leadership lease first.
   */
  async setResultTree(queryId: string, resultTree: ResultTree): Promise<void> {
    const db = await this.openDb();
    const tx = db.transaction(['resultTrees', 'entityDataObjects', 'metadata'], 'readwrite');

    const metadataStore = tx.objectStore('metadata');
    const resultTreesStore = tx.objectStore('resultTrees');
    const entitiesStore = tx.objectStore('entityDataObjects');

    // Verify active leadership lease inside the transaction
    const leaderId = await new Promise<string | undefined>((resolve, reject) => {
      const req = metadataStore.get('leaderId');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (this.myClientId && leaderId !== this.myClientId) {
      tx.abort();
      throw new Error('Leadership revoked');
    }

    // Write results and pending entity modifications in a single turn
    resultTreesStore.put(
      {
        rootStub: resultTree.getRootStub().toJSON(EncodingMode.dehydrated),
        maxAge: (resultTree as any).maxAge,
        cachedAt: resultTree.cachedAt,
        lastAccessed: resultTree.lastAccessed
      },
      queryId
    );

    for (const [id, edo] of this.pendingWrites.entries()) {
      entitiesStore.put(edo.toJSON(), id);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction aborted'));
    });

    this.sessionEntities.clear();
    this.pendingWrites.clear();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
