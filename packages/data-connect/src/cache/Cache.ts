import { isIndexedDBAvailable } from '@firebase/util';
import { DataConnectError } from '../core/error';
import { BackingDataObject } from './BackingDataObject';
import { CacheProvider } from './CacheProvider';
import { ResultTree } from './ResultTree';
import { ResultTreeProcessor } from './ResultTreeProcessor';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';
import { IndexedDBCacheProvider } from './IndexedDBCacheProvider';

export interface ServerValues extends Object {
  ttl: number;
}

export const BDO_OBJECT_STORE_NAME = 'data-connect-bdos';
export const SRT_OBJECT_STORE_NAME = 'data-connect-srts';

export class Cache {
  private cacheProvider: CacheProvider;
  constructor() {
    // TODO: Include identifier for cacheprovider
    if (!isIndexedDBAvailable()) {
      this.cacheProvider = new EphemeralCacheProvider();
    } else {
      this.cacheProvider = new IndexedDBCacheProvider();
    }
    // TODO: Create one for Tanstack
    // TODO: Deal with auth changes.
  }
  containsResultTree(queryId: string): boolean {
    const resultTree = this.cacheProvider.getResultTree(queryId);
    return resultTree !== undefined;
  }
  getResultTree(queryId: string) {
    return this.cacheProvider.getResultTree(queryId);
  }
  getResultJSON(queryId: string): string {
    const processor = new ResultTreeProcessor();
    const resultTree = this.cacheProvider.getResultTree(queryId);
    if (!resultTree) {
      throw new DataConnectError(
        'invalid-argument',
        `${queryId} not found in cache. Call "update() first."`
      );
    }
    // TODO: Make sure that this serializes the references, not the objects themselves.
    return processor.hydrateResults(resultTree.getRootStub());
  }
  update(queryId: string, serverValues: ServerValues): string[] {
    const processor = new ResultTreeProcessor();
    const acc = new ImpactedQueryRefsAccumulator();
    const { data, stubDataObject } = processor.dehydrateResults(
      serverValues,
      this.cacheProvider,
      acc
    );
    const now = new Date();
    this.cacheProvider.setResultTree(
      queryId,
      new ResultTree(data, stubDataObject, serverValues.ttl, now, now)
    );
    return acc.consumeEvents();
  }
}

class EphemeralCacheProvider implements CacheProvider {
  private bdos = new Map<string, BackingDataObject>();
  private resultTrees = new Map<string, ResultTree>();

  setResultTree(queryId: string, rt: ResultTree) {
    this.resultTrees.set(queryId, rt);
  }
  // TODO: Should this be in the cache provider? This seems common along all CacheProviders.
  getResultTree(queryId: string): ResultTree | undefined {
    return this.resultTrees.get(queryId);
  }
  createGlobalId(): string {
    return crypto.randomUUID();
  }
  updateBackingData(backingData: BackingDataObject): void {
    this.bdos.set(backingData.globalID, backingData);
  }
  getBdo(globalId: string): BackingDataObject {
    if (!this.bdos.has(globalId)) {
      this.bdos.set(globalId, new BackingDataObject(globalId));
    }
    // Because of the above, we can guarantee that there will be a BDO at the globalId.
    return this.bdos.get(globalId)!;
  }
}
