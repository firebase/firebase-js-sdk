import { EntityDataObject } from './EntityDataObject';
import { CacheProvider } from './CacheProvider';
import { ResultTree } from './ResultTree';
export const BDO_OBJECT_STORE_NAME = 'data-connect-bdos';
export const SRT_OBJECT_STORE_NAME = 'data-connect-srts';
export class IndexedDBCacheProvider implements CacheProvider {
  private bdos = new Map<string, EntityDataObject>();
  private resultTrees = new Map<string, ResultTree>();
  private dbPromise: Promise<IDBDatabase>;
  isIdbAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  constructor() {
    // TODO: cache based on firebase app etc.
    if (!this.isIdbAvailable()) {
      return;
    }
    this.dbPromise = new Promise((dbResolve, dbReject) => {
      const request = indexedDB.open('data-connect', 3);
      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore(BDO_OBJECT_STORE_NAME);
        db.createObjectStore(SRT_OBJECT_STORE_NAME);
        dbResolve(db);
      };
      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
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
              this.resultTrees.set(cursor.key as string, cursor.value);
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
              this.resultTrees.set(
                cursor.key as string,
                ResultTree.parse(cursor.value)
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
        await Promise.all([bdoComplete, srtComplete]);


        // TODO: get data from store and put it into the map.
        dbResolve(db);
      };
      request.onerror = error => {
        // TODO(mtewani): Use proper error.
        dbReject(error);
      };
    });
  }
  async commitBdoChanges(backingData: EntityDataObject): Promise<void> {
    if (!this.isIdbAvailable()) {
      return;
    }
    const db = await this.dbPromise;
    db.transaction([BDO_OBJECT_STORE_NAME], 'readwrite')
      .objectStore(BDO_OBJECT_STORE_NAME)
      .put(backingData, backingData.globalID);
  }
  async commitResultTreeChanges(queryId: string, rt: ResultTree): Promise<void> {
    if (!this.isIdbAvailable()) {
      return;
    }
    const db = await this.dbPromise;
    const objectStore = db
      .transaction([SRT_OBJECT_STORE_NAME], 'readwrite')
      .objectStore(SRT_OBJECT_STORE_NAME);
    // TODO: What happens if you override an existing entry?
    // TODO: We should first check whether the tree is hydrated or not.
    // TODO: We should make sure that everything has been written.
    objectStore.put(rt, queryId);
  }
  async setResultTree(queryId: string, rt: ResultTree): Promise<void> {
    this.resultTrees.set(queryId, rt);
    // maybe this needs to be async?
    // TODO: replace array with valid data
    await this.commitResultTreeChanges(queryId, rt);
  }
  getResultTree(queryId: string): ResultTree | undefined {
    const ret = this.resultTrees.get(queryId);
    return ret;
  }
  createGlobalId(): string {
    return crypto.randomUUID();
  }
  getBdo(globalId: string): EntityDataObject {
    if (!this.bdos.has(globalId)) {
      this.bdos.set(globalId, new EntityDataObject(globalId));
    }
    // Because of the above, we can guarantee that there will be a BDO at the globalId.
    return this.bdos.get(globalId)!;
  }
  updateBackingData(backingData: EntityDataObject): void {
    this.bdos.set(backingData.globalID, backingData);
    void this.commitBdoChanges(backingData);
  }
}
