import { BackingDataObject } from "./BackingDataObject";
import { ResultTree } from "./ResultTree";

export interface CacheProvider {
    getBdo(globalId: string): BackingDataObject;
    updateBackingData(backingData: BackingDataObject): void;
    createGlobalId(): string;
    getResultTree(queryId: string): ResultTree | undefined;
    setResultTree(queryId: string, resultTree: ResultTree): void;
}
