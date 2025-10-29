import { EntityNode, StubDataObjectJson } from './EntityNode';

export class ResultTree {
  static parse(value: ResultTreeJson): ResultTree {
    const rt = new ResultTree(
      value.data,
      EntityNode.fromStorableJson(value.rootStub),
      value.ttlInMs,
      value.cachedAt,
      value.lastAccessed
    );
    return rt;
  }
  constructor(
    public readonly data: string,
    private rootStub: EntityNode,
    private ttlInMs: number = 300_000,
    private readonly cachedAt: Date,
    private lastAccessed: Date
  ) {}
  isStale(): boolean {
    return (Date.now() - new Date(this.cachedAt.getTime()).getTime()) > this.ttlInMs;
  }
  updateTtl(ttlInMs: number): void {
    this.ttlInMs = ttlInMs;
  }
  updateAccessed(): void {
    this.lastAccessed = new Date();
  }
  getRootStub(): EntityNode {
    return this.rootStub;
  }
}

interface ResultTreeJson {
  rootStub: StubDataObjectJson;
  ttlInMs: number;
  cachedAt: Date;
  lastAccessed: Date;
  data: string;
}
