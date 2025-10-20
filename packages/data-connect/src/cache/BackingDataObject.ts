export type FDCScalarValue = string | number | boolean | undefined | null | object | FDCScalarValue[];

export class BackingDataObject {
  toStorableJson(): any {
    // TODO: This might not be ok.
    return this;
  }
  static fromStorableJson(json: any): BackingDataObject {
    const bdo = new BackingDataObject(json.globalID);
    // TODO: check whether the map can be stored in the database as-is
    bdo.map = new Map<string, FDCScalarValue>(json.map);
    // TODO: check whether the map can be stored in the database as-is
    bdo.queriesReferenced = json.queriesReferenced;
    return bdo;
  }
  private map = new Map<string, FDCScalarValue>();
  private queriesReferenced = new Set<string>();
  // private queryToFields = new Map<string, string[]>();
  constructor(public readonly globalID: string) {}
  updateServerValue(key: string, value: FDCScalarValue): string[] {
    this.map.set(key, value);
    return Array.from(this.queriesReferenced);
    // TODO: Collect queries that need to be updated.
  }
  track(queryId: string) {
    this.queriesReferenced.add(queryId);
    // if(!this.queryToFields.has(queryId)) {
    //   this.queryToFields.set(queryId, []);
    // }
    // if(!this.queryToFields.get(queryId).includes(key)) {
    //   this.queryToFields.get(queryId).push(key);
    // }
  }
}
