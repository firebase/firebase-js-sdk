import { InternalCacheProvider } from './CacheProvider';
import { EntityDataObject } from './EntityDataObject';
import { ResultTree } from './ResultTree';


export class InMemoryCacheProvider implements InternalCacheProvider {
  private bdos = new Map<string, EntityDataObject>();
  private resultTrees = new Map<string, ResultTree>();
  constructor(private _keyId: string) { }

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
