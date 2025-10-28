export type FDCScalarValue = string | number | boolean | undefined | null | object | FDCScalarValue[];

export interface BackingDataObjectJson {
  map: Map<string, FDCScalarValue>;
  queriesReferenced: Set<string>;
  globalID: string;
}

export class BackingDataObject {
  toStorableJson(): BackingDataObjectJson {
    // TODO: This might not be ok.
    return {
      globalID: this.globalID,
      map: this.map,
      queriesReferenced: this.queriesReferenced
    };
  }
  static fromStorableJson(json: BackingDataObjectJson): BackingDataObject {
    const bdo = new BackingDataObject(json.globalID);
    bdo.map = new Map<string, FDCScalarValue>(json.map);
    bdo.queriesReferenced = json.queriesReferenced;
    return bdo;
  }
  private map = new Map<string, FDCScalarValue>();
  private queriesReferenced = new Set<string>();
  constructor(public readonly globalID: string) {}
  updateServerValue(key: string, value: FDCScalarValue): string[] {
    this.map.set(key, value);
    return Array.from(this.queriesReferenced);
  }
  // TODO(mtewani): Add a way to track what fields are associated with each query during runtime.
  // private queryToFields = new Map<string, string[]>();
  track(queryId: string): void {
    this.queriesReferenced.add(queryId);
    // if(!this.queryToFields.has(queryId)) {
    //   this.queryToFields.set(queryId, []);
    // }
    // if(!this.queryToFields.get(queryId).includes(key)) {
    //   this.queryToFields.get(queryId).push(key);
    // }
  }
}
