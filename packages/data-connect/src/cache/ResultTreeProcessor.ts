import { CacheProvider } from "./CacheProvider";
import { ImpactedQueryRefsAccumulator } from "./ImpactedQueryRefsAccumulator";
import { EntityNode } from "./EntityNode";

interface DehydratedResults {
    stubDataObject: EntityNode;
    data: string;
}

export class ResultTreeProcessor {
    hydrateResults(rootStubObject: EntityNode): string {
        return JSON.stringify(rootStubObject.toJson());
    }
    dehydrateResults(json: object, cacheProvider: CacheProvider, acc: ImpactedQueryRefsAccumulator): DehydratedResults {
        const stubDataObject = new EntityNode(json, cacheProvider, acc);
        return {
            stubDataObject,
            data: JSON.stringify(stubDataObject.toStorableJson())
        };
    }
}