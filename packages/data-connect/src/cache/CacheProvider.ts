import { EntityDataObject } from "./EntityDataObject";
import { ResultTree } from "./ResultTree";

export interface CacheProvider {
    getBdo(globalId: string): Promise<EntityDataObject>;
    updateBackingData(backingData: EntityDataObject): Promise<void>;
    createGlobalId(): string;
    getResultTree(queryId: string): Promise<ResultTree | undefined>;
    setResultTree(queryId: string, resultTree: ResultTree): Promise<void>;
    close(): Promise<void>;
}
