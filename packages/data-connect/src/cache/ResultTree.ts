import { StubDataObject } from './StubDataObject';

export class ResultTree {
  constructor(
    public readonly data: string,
    private rootStub: StubDataObject,
    private ttlInMs: number = 30_000,
    private readonly cachedAt: Date,
    private lastAccessed: Date
  ) {}
  isStale(): boolean {
    return Date.now() - this.cachedAt.getTime() > this.ttlInMs;
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
