import { EntityDataObject } from "./EntityDataObject";
import { ResultTree } from "./ResultTree";

export interface CacheProvider {
    getBdo(globalId: string): EntityDataObject;
    updateBackingData(backingData: EntityDataObject): void;
    createGlobalId(): string;
    getResultTree(queryId: string): ResultTree | undefined;
    setResultTree(queryId: string, resultTree: ResultTree): void;
}
