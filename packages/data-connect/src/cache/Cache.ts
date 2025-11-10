import { isIndexedDBAvailable, generateSHA256HashBrowser, Deferred } from '@firebase/util';

import { type ConnectorConfig } from '../api/DataConnect';
import { DataConnectError } from '../core/error';
import { type AuthTokenProvider } from '../core/FirebaseAuthProvider';
import { logDebug } from '../logger';

import { CacheProvider } from './CacheProvider';
import { EntityDataObject } from './EntityDataObject';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';
import { IndexedDBCacheProvider } from './IndexedDBCacheProvider';
import { ResultTree } from './ResultTree';
import { ResultTreeProcessor } from './ResultTreeProcessor';

export const Memory = 'memory';
export const Persistent = 'persistent';

export type DataConnectStorage = typeof Memory | typeof Persistent;

/**
 * CacheSettings
 */
export interface CacheSettings {
  storage: DataConnectStorage;
  maxSizeBytes: number;
}


/**
 * ServerValues
 */
export interface ServerValues {
  ttl: number;
}

/**
 * Requirements:
 * 1. Wait until first token comes back to create cache provider. Maybe you have an async initialize function?
 * 2. When user requests data from the cache, await that cache provider to make sure everything has been initialized
 */

// TODO: Figure out how to deal with caching across tabs.
export class DataConnectCache {
  private cacheProvider: CacheProvider | null = null;
  private uid: string | null = null;
  private firstToken: Deferred<void> = new Deferred();
  private hasFirstToken = false;
  private initialized = false;
  constructor(private authProvider: AuthTokenProvider, private projectId: string, private connectorConfig: ConnectorConfig, private host: string, private cacheSettings?: CacheSettings) {
  }

  async initialize(): Promise<void> {
    if(!this.cacheProvider) {
      await this.firstToken.promise;
      this.cacheProvider = await this.initializeNewProviders();
    }
  }

  async getIdentifier(uid: string): Promise<string> {
    const identifier = `${this.cacheSettings?.storage === Persistent ? 'persistent' : 'memory'}-${this.projectId}-${this.connectorConfig.service}-${this.connectorConfig.connector}-${this.connectorConfig.location}-${uid}-${this.host}`;
    const sha256 = await generateSHA256HashBrowser(identifier);
    return sha256;
  }

  setAuthProvider(_authTokenProvider: AuthTokenProvider): void {
    this.authProvider.addTokenChangeListener(async (_) => {
      this.uid = this.authProvider.getAuth().getUid();
      if(!this.hasFirstToken) {
        this.firstToken.resolve();
      } else {
        this.cacheProvider = await this.initializeNewProviders();
      }
    });
  }

  async initializeNewProviders(): Promise<CacheProvider> {
    await this.cacheProvider?.close();
    let cacheProvider: CacheProvider;
    const identifier = await this.getIdentifier(this.uid);
    const isPersistenceEnabled = this.cacheSettings?.storage === Persistent;
    if (this.cacheSettings) {
      cacheProvider = isPersistenceEnabled ? new IndexedDBCacheProvider(identifier) : new InMemoryCacheProvider(identifier);
    } else if (!isIndexedDBAvailable()) {
      logDebug('IndexedDB is not available. Using In-Memory Cache Provider instead.');
      cacheProvider = new InMemoryCacheProvider(identifier);
    } else {
      logDebug('Initializing IndexedDB Cache Provider.');
      cacheProvider = new IndexedDBCacheProvider(identifier);
    }
    return cacheProvider;
  }

  async containsResultTree(queryId: string): Promise<boolean> {
    await this.initialize();
    const resultTree = await this.cacheProvider.getResultTree(queryId);
    return resultTree !== undefined;
  }
  async getResultTree(queryId: string): Promise<ResultTree> {
    await this.initialize();
    const cacheProvider = this.cacheProvider;
    return cacheProvider.getResultTree(queryId);
  }
  async getResultJSON(queryId: string): Promise<string> {
    await this.initialize();
    const processor = new ResultTreeProcessor();
    const cacheProvider = this.cacheProvider;
    const resultTree = await cacheProvider.getResultTree(queryId);
    if (!resultTree) {
      throw new DataConnectError(
        'invalid-argument',
        `${queryId} not found in cache. Call "update() first."`
      );
    }
    return processor.hydrateResults(resultTree.getRootStub());
  }
  async update(queryId: string, serverValues: ServerValues): Promise<string[]> {
    const processor = new ResultTreeProcessor();
    const acc = new ImpactedQueryRefsAccumulator();
    const cacheProvider = this.cacheProvider;
    const { data, stubDataObject } = processor.dehydrateResults(
      serverValues,
      cacheProvider,
      acc
    );
    const now = new Date();
    await cacheProvider.setResultTree(
      queryId,
      new ResultTree(data, stubDataObject, serverValues.ttl, now, now)
    );
    return acc.consumeEvents();
  }
}

export class InMemoryCacheProvider implements CacheProvider {
  private bdos = new Map<string, EntityDataObject>();
  private resultTrees = new Map<string, ResultTree>();
  constructor(private _keyId: string) {

  }

  setResultTree(queryId: string, rt: ResultTree): Promise<void> {
    this.resultTrees.set(queryId, rt);
    return Promise.resolve();
  }
  // TODO: Should this be in the cache provider? This seems common along all CacheProviders.
  async getResultTree(queryId: string): Promise<ResultTree | undefined> {
    return this.resultTrees.get(queryId);
  }
  createGlobalId(): string {
    return crypto.randomUUID();
  }
  updateBackingData(backingData: EntityDataObject): Promise<void> {
    this.bdos.set(backingData.globalID, backingData);
    return Promise.resolve();
  }
  async getBdo(globalId: string): Promise<EntityDataObject> {
    if (!this.bdos.has(globalId)) {
      this.bdos.set(globalId, new EntityDataObject(globalId));
    }
    // Because of the above, we can guarantee that there will be a BDO at the globalId.
    return this.bdos.get(globalId)!;
  }
  close(): Promise<void> {
    // TODO: Noop
    return Promise.resolve();
  }
}
