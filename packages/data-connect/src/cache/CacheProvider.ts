import { BackingDataObject } from "./BackingDataObject";

export class CacheProvider {
    createGlobalId(): string {
        throw new Error("Method not implemented.");
    }
    getBdo(globalId: string): BackingDataObject {
        throw new Error("Method not implemented.");
    }
}