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
  | Record<string, unknown>
  | FDCScalarValue[];

export interface EntityDataObjectJson {
  map: {
    [key: string]: FDCScalarValue;
  };
  referencedFrom: string[];
  globalID: string;
}

export class EntityDataObject {
  getServerValue(key: string): unknown {
    return this.serverValues[key];
  }
  private serverValues: { [key: string]: FDCScalarValue } = {};
  private referencedFrom = new Set<string>();
  constructor(public readonly globalID: string) {}
  getServerValues(): { [key: string]: FDCScalarValue } {
    return this.serverValues;
  }
  toJSON(): EntityDataObjectJson {
    return {
      globalID: this.globalID,
      map: this.serverValues,
      referencedFrom: Array.from(this.referencedFrom)
    };
  }
  static fromJSON(json: EntityDataObjectJson): EntityDataObject {
    const bdo = new EntityDataObject(json.globalID);
    bdo.serverValues = json.map;
    bdo.referencedFrom = new Set(json.referencedFrom);
    return bdo;
  }

  updateServerValue(
    key: string,
    value: FDCScalarValue,
    requestedFrom: string
  ): string[] {
    this.serverValues[key] = value;
    this.referencedFrom.add(requestedFrom);
    return Array.from(this.referencedFrom);
  }
  // TODO(mtewani): Add a way to track what fields are associated with each query during runtime.
}
