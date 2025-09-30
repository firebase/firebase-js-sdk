class ResultTree {
    // TTL in MS
    ttlInMs: number;
    // Tree data
    data: string;
    // Last cached at timestamp
    cachedAt: Date;
    // Last accessed
    lastAccessed: Date

    rootStub: StubDataObject;

    isStale(): boolean {
        return Date.now() - this.cachedAt.getTime() > this.ttlInMs;
    }
}