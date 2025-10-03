import { CacheProvider } from "./CacheProvider";
import { StubDataObject } from "./StubDataObject";

interface DehydratedResults {
    stubDataObject: StubDataObject;
    data: string;
}

export class ResultTreeProcessor {
    hydrateResults(rootStubObject: StubDataObject): string {
        // TODO: convert SDO into JSON
        return JSON.stringify(rootStubObject.toJson());
    }
    dehydrateResults(json: object, cacheProvider: CacheProvider): DehydratedResults {
        const stubDataObject = new StubDataObject(json, cacheProvider);
        return {
            stubDataObject,
            data: JSON.stringify(stubDataObject.toJson())
        };
    }
}