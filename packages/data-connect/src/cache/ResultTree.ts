import { StubDataObject } from './StubDataObject';

export class ResultTree {
  static parse(value: any): ResultTree {
    console.log('RESULT TREE', value);
    // TODO: need to parse stubdataobject as well.
    // const rootStub = new StubDataObject()
    const rt = new ResultTree(
      JSON.parse(value.data),
      StubDataObject.fromStorableJson(value.rootStub),
      value.ttlInMs,
      value.cachedAt,
      value.lastAccessed
    );
    return rt;
  }
  constructor(
    public readonly data: string,
    private rootStub: StubDataObject,
    private ttlInMs: number = 30_000,
    private readonly cachedAt: Date,
    private lastAccessed: Date
  ) {}
  isStale(): boolean {
    const stale = Date.now() - this.cachedAt.getTime() > this.ttlInMs;
    console.log('isStale: ' + stale)
    return stale;
  }
  updateTtl(ttlInMs: number) {
    this.ttlInMs = ttlInMs;
  }
  updateAccessed() {
    this.lastAccessed = new Date();
  }
  getRootStub() {
    return this.rootStub;
  }
}
