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

import { deleteApp, FirebaseApp, initializeApp } from '@firebase/app';
import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { DataConnect, getDataConnect, queryRef } from '../../src';
import { makePersistentCacheProvider } from '../../src/api/DataConnect';
import { InMemoryCacheProvider } from '../../src/cache/InMemoryCacheProvider';

chai.use(chaiAsPromised);

// --- Mock Browser Web Primitives in Node ---

// 1. Web Locks Mock
if (typeof navigator === 'undefined') {
  (global as any).navigator = {} as any;
}
const lockQueues = new Map<string, Array<{
  resolve: (val: any) => void;
  callback: (lock: any) => Promise<any>;
}>>();

(global as any).navigator.locks = {
  request: async (name: string, callback: (lock: any) => Promise<any>) => {
    console.log(`[LocksMock] request lock: ${name}`);
    return new Promise<any>((resolve) => {
      let queue = lockQueues.get(name);
      if (!queue) {
        queue = [];
        lockQueues.set(name, queue);
      }
      const runNext = () => {
        if (queue!.length === 0) {
          return;
        }
        const item = queue![0];
        const lockObj = { name };
        console.log(`[LocksMock] granting lock: ${name}`);
        Promise.resolve(item.callback(lockObj))
          .then((val) => {
            console.log(`[LocksMock] lock released: ${name}`);
            item.resolve(val);
            queue!.shift();
            queueMicrotask(runNext);
          })
          .catch((err) => {
            console.log(`[LocksMock] lock released with error: ${name}`, err);
            item.resolve(err);
            queue!.shift();
            queueMicrotask(runNext);
          });
      };
      queue.push({ resolve, callback });
      if (queue.length === 1) {
        runNext();
      }
    });
  }
};

// 2. BroadcastChannel Mock
const channels = new Map<string, Set<BroadcastChannelMock>>();
class BroadcastChannelMock {
  onmessage: ((event: { data: any }) => void) | null = null;
  name: string;
  constructor(name: string) {
    this.name = name;
    let set = channels.get(name);
    if (!set) {
      set = new Set();
      channels.set(name, set);
    }
    set.add(this);
  }
  postMessage(data: any) {
    const set = channels.get(this.name);
    if (set) {
      for (const chan of set) {
        if (chan !== this && chan.onmessage) {
          chan.onmessage({ data });
        }
      }
    }
  }
  close() {
    const set = channels.get(this.name);
    if (set) {
      set.delete(this);
    }
  }
}
(global as any).BroadcastChannel = BroadcastChannelMock;

// 3. IndexedDB High-Fidelity Synchronous Mock
class MockIDBRequest {
  result: any;
  onerror: any;
  onsuccess: any;
  onupgradeneeded: any;
}
class MockIDBObjectStore {
  public data = new Map<string, any>();
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  get(key: string) {
    console.log(`[IDBMock] get ${this.name} key: ${key}`);
    const keys = Array.from(this.data.keys());
    console.log(`[IDBMock] keys in ${this.name}:`, keys);
    if (keys.length > 0) {
      console.log(`[IDBMock] compare key === keys[0]:`, keys[0] === key);
      console.log(`[IDBMock] type of key:`, typeof key, `type of keys[0]:`, typeof keys[0]);
    }
    const req = new MockIDBRequest();
    const value = this.data.get(key);
    console.log(`[IDBMock] Map lookup result:`, value);
    req.result = value;
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }
  getAll() {
    console.log(`[IDBMock] getAll ${this.name}`);
    const req = new MockIDBRequest();
    req.result = Array.from(this.data.values());
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }
  put(val: any, key?: string) {
    const k = key || val.clientId || val._id || 'default_key';
    console.log(`[IDBMock] put ${this.name} key: ${k}`, val);
    this.data.set(k, val);
    const req = new MockIDBRequest();
    req.result = k;
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }
  delete(key: string) {
    console.log(`[IDBMock] delete ${this.name} key: ${key}`);
    this.data.delete(key);
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }
}
class MockIDBTransaction {
  oncomplete: (() => void) | null = null;
  onabort: ((err: any) => void) | null = null;
  storeNames: string[];
  mode: string;
  storesMap: Map<string, MockIDBObjectStore>;
  constructor(storeNames: string[], mode: string, storesMap: Map<string, MockIDBObjectStore>) {
    this.storeNames = storeNames;
    this.mode = mode;
    this.storesMap = storesMap;
  }
  objectStore(name: string) {
    let store = this.storesMap.get(name);
    if (!store) {
      store = new MockIDBObjectStore(name);
      this.storesMap.set(name, store);
    }
    return store;
  }
  abort() {
    if (this.onabort) {
      this.onabort(new Error('Transaction aborted'));
    }
  }
}
const dbStores = new Map<string, Map<string, MockIDBObjectStore>>();
class MockIDBDatabase {
  name: string;
  objectStoreNames = {
    contains: (name: string) => {
      const storesMap = dbStores.get(this.name);
      return storesMap ? storesMap.has(name) : false;
    }
  };
  constructor(name: string) {
    this.name = name;
    if (!dbStores.has(name)) {
      dbStores.set(name, new Map());
    }
  }
  createObjectStore(name: string, options?: any) {
    console.log(`[IDBMock] createObjectStore: ${name}`);
    const storesMap = dbStores.get(this.name)!;
    if (!storesMap.has(name)) {
      storesMap.set(name, new MockIDBObjectStore(name));
    }
    return storesMap.get(name)!;
  }
  transaction(storeNames: string | string[], mode: string) {
    console.log(`[IDBMock] start transaction on ${JSON.stringify(storeNames)} mode: ${mode}`);
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const storesMap = dbStores.get(this.name)!;
    const tx = new MockIDBTransaction(names, mode, storesMap);
    setTimeout(() => {
      if (tx.oncomplete) {
        console.log(`[IDBMock] complete transaction on ${JSON.stringify(storeNames)}`);
        tx.oncomplete();
      }
    }, 20);
    return tx;
  }
  close() {}
}
(global as any).indexedDB = {
  open: (name: string, version?: number) => {
    console.log(`[IDBMock] open database: ${name}`);
    const req = new MockIDBRequest();
    req.result = new MockIDBDatabase(name);
    queueMicrotask(() => {
      if (req.onupgradeneeded) {
        req.onupgradeneeded({ target: req });
      }
      if (req.onsuccess) {
        req.onsuccess({ target: req });
      }
    });
    return req;
  }
};

// --- Multi-Tab Persistence Unit Tests ---

describe('Concurrent Multi-Tab Persistence Tests', () => {
  let app1: FirebaseApp;
  let app2: FirebaseApp;
  let dc1: DataConnect;
  let dc2: DataConnect;

  beforeEach(async () => {
    console.log('[TestSetup] beforeEach start');
    dbStores.clear();
    channels.clear();
    lockQueues.clear();
    if (typeof navigator === 'undefined') {
      (global as any).navigator = {} as any;
    }

    app1 = initializeApp({ projectId: 'test-proj', appId: 'app-1' }, 'tab1');
    app2 = initializeApp({ projectId: 'test-proj', appId: 'app-2' }, 'tab2');

    dc1 = getDataConnect(app1, { connector: 'c', location: 'l', service: 's' }, {
      cacheSettings: {
        cacheProvider: makePersistentCacheProvider()
      }
    });

    dc2 = getDataConnect(app2, { connector: 'c', location: 'l', service: 's' }, {
      cacheSettings: {
        cacheProvider: makePersistentCacheProvider()
      }
    });

    dc1.setInitialized();
    dc2.setInitialized();

    console.log('[TestSetup] initializing cache 1');
    await dc1.getCache()!.initialize();
    console.log('[TestSetup] initializing cache 2');
    await dc2.getCache()!.initialize();

    console.log('[TestSetup] creating coordinator 1');
    (dc1._queryManager as any).getCoordinator();
    console.log('[TestSetup] creating coordinator 2');
    (dc2._queryManager as any).getCoordinator();

    console.log('[TestSetup] waiting for election lock queue...');
    await new Promise((r) => setTimeout(r, 150));
    console.log('[TestSetup] beforeEach done');
  });

  afterEach(async () => {
    console.log('[TestCleanup] afterEach start');
    const manager1 = dc1._queryManager;
    const manager2 = dc2._queryManager;
    if (manager1) {
      const coord = (manager1 as any).getCoordinator();
      if (coord) coord.close();
    }
    if (manager2) {
      const coord = (manager2 as any).getCoordinator();
      if (coord) coord.close();
    }
    await dc1._delete();
    await dc2._delete();
    await deleteApp(app1);
    await deleteApp(app2);
    console.log('[TestCleanup] afterEach done');
  });

  it('should elect the first tab as Leader, second tab as Follower, and route IPC execution successfully', async () => {
    const q1 = queryRef<any>(dc1, 'getSongs');
    const q2 = queryRef<any>(dc2, 'getSongs');

    const manager1 = dc1._queryManager;
    const manager2 = dc2._queryManager;

    const coordinator1 = (manager1 as any).getCoordinator();
    const coordinator2 = (manager2 as any).getCoordinator();

    expect(coordinator1).to.not.be.null;
    expect(coordinator2).to.not.be.null;

    // Setup mock network response on both transports to prevent real server requests
    const mockResult = {
      data: { songs: [{ id: '1', title: 'Yesterday' }] }
    };

    const fakeInvoke = async () => {
      return {
        data: mockResult.data,
        extensions: { dataConnect: [] }
      };
    };

    (manager1 as any).transport.invokeQuery = fakeInvoke;
    (manager2 as any).transport.invokeQuery = fakeInvoke;

    // Verify initial leader/follower election state
    expect(coordinator1.isLeader).to.be.true;
    expect(coordinator2.isLeader).to.be.false;

    // Follower (tab 2) triggers query. It routes via IPC to Leader (tab 1)
    const queryPromise = manager2.fetchServerResults(q2);

    console.log('[Test1] Follower fetchServerResults promise triggered');
    // Wait for IPC message routing & database transaction completes
    await new Promise((r) => setTimeout(r, 100));

    console.log('[Test1] Awaiting queryPromise now...');
    const result = await queryPromise;
    console.log('[Test1] queryPromise resolved with:', JSON.stringify(result));
    expect(result.data).to.deep.equal(mockResult.data);

    // Verify data was also saved to Leader cache
    const cacheTree = await manager1.getFromResultTreeCache(q1, true);
    console.log('[Test1] Leader getFromResultTreeCache result:', JSON.stringify(cacheTree));
    expect(cacheTree).to.not.be.null;
    expect(cacheTree!.data).to.deep.equal(mockResult.data);
  });

  it('should perform zombie leader recovery on heartbeat lapse and demote stale leader on split-brain write', async () => {
    const q1 = queryRef<any>(dc1, 'getSongs');
    const manager1 = dc1._queryManager;
    const manager2 = dc2._queryManager;

    const coordinator1 = (manager1 as any).getCoordinator();
    const coordinator2 = (manager2 as any).getCoordinator();

    expect(coordinator1.isLeader).to.be.true;
    expect(coordinator2.isLeader).to.be.false;

    // Silence original leader heartbeats
    clearInterval(coordinator1.heartbeatInterval);

    // Force heartbeat timestamp back in database to simulate 6 seconds passing
    const db = await (coordinator2 as any).getDb();
    const tx = db.transaction('metadata', 'readwrite');
    tx.objectStore('metadata').put(Date.now() - 6000, 'leaderHeartbeat');

    await new Promise((r) => setTimeout(r, 10));

    // Explicitly trigger follower tab 2's heartbeat verification to claim leadership in IndexedDB
    await coordinator2.verifyLeaderHeartbeat();

    // Wait for transactional overwrites in IndexedDB to complete
    await new Promise((r) => setTimeout(r, 50));

    // Stub invokeQuery on Leader A to avoid network calls
    (manager1 as any).transport.invokeQuery = async () => {
      return {
        data: { songs: [] },
        extensions: { dataConnect: [] }
      };
    };

    // Leader A unfreezes and attempts to execute query. It must demote itself inside write transaction and gracefully fallback to memory cache and resolve successfully.
    const result = await manager1.fetchServerResults(q1);
    expect(result.data).to.deep.equal({ songs: [] });
    expect(coordinator1.isLeader).to.be.false;

    // Wait for lock release queue to shift and promote Tab 2
    await new Promise((r) => setTimeout(r, 100));
    expect(coordinator2.isLeader).to.be.true;
  });

  it('should gracefully degrade to InMemoryCacheProvider if IndexedDB transaction throws QuotaExceededError', async () => {
    const q = queryRef<any>(dc1, 'getSongs');
    const manager = dc1._queryManager;

    // Force IndexedDB write transaction to throw QuotaExceededError
    const provider = (manager as any).cache.getProvider();
    provider.setResultTree = async () => {
      const err = new Error('Quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    };

    // Mock transport
    (manager as any).transport.invokeQuery = async () => {
      return { data: { songs: [] } };
    };

    // Execute query. It must catch error, degrade provider, and execute successfully via memory cache.
    const result = await manager.fetchServerResults(q);
    expect(result.data).to.deep.equal({ songs: [] });

    // Verify caching fallback degraded successfully to memory cache provider
    const fallbackProvider = (manager as any).cache.getProvider();
    expect(fallbackProvider).to.be.an.instanceOf(InMemoryCacheProvider);
  });
});
