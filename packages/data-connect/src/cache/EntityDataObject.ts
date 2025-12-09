/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type FDCScalarValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | object
  | FDCScalarValue[];

export interface BackingDataObjectJson {
  map: {
    [key: string]: FDCScalarValue
  };
  queriesReferenced: Set<string>;
  globalID: string;
}

export class EntityDataObject {
  getMap(): { [key: string]: FDCScalarValue } {
    return this.map;
  }
  getStorableMap(map: { [key: string]: FDCScalarValue }): {
    [key: string]: FDCScalarValue;
  } {
    const newMap: { [key: string]: FDCScalarValue } =
      {};
    for (const key in map) {
      if (map.hasOwnProperty(key)) {
        newMap[key] = map[key];
      }
    }
    return newMap;
  }
  toStorableJson(): BackingDataObjectJson {
    return {
      globalID: this.globalID,
      map: this.getStorableMap(this.map),
      queriesReferenced: this.queriesReferenced
    };
  }
  static fromStorableJson(json: BackingDataObjectJson): EntityDataObject {
    const bdo = new EntityDataObject(json.globalID);
    bdo.map = json.map;
    bdo.queriesReferenced = json.queriesReferenced;
    return bdo;
  }
  private map: {[key:string]: FDCScalarValue} = {};
  private queriesReferenced = new Set<string>();
  constructor(public readonly globalID: string) {}
  updateServerValue(key: string, value: FDCScalarValue): string[] {
    this.map[key] = value;
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
