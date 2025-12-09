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

import { DataConnectError } from '../core/error';

import { InternalCacheProvider } from './CacheProvider';
import {
  EntityDataObject,
  BackingDataObjectJson,
  FDCScalarValue
} from './EntityDataObject';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';
export const IndexedDb = 'indexeddb' as const;
export const InMemoryProvider= 'inmemory' as const;


export const GLOBAL_ID_KEY = '_id';
export class EntityNode {
  entityData?: EntityDataObject;
  scalars: { [key: string]: FDCScalarValue } = {};
  references: { [key: string]: EntityNode } = {};
  objectLists: {
    [key: string]: EntityNode[];
  } = {};
  globalId?: string;
  impactedQueryRefs = new Set<string>();
  constructor(private acc = new ImpactedQueryRefsAccumulator()) {
  }

  async loadData(
    values?: FDCScalarValue,
    cacheProvider?: InternalCacheProvider,
  ): Promise<void> {
    if (
      values === undefined &&
      cacheProvider === undefined 
    ) {
      return;
    }
    if (typeof values !== 'object' || Array.isArray(values)) {
      throw new DataConnectError(
        'invalid-argument',
        'EntityNode initialized with non-object value'
      );
    }
    if (values === null) {
      return;
    }

    if (
      values.hasOwnProperty(GLOBAL_ID_KEY) &&
      typeof values[GLOBAL_ID_KEY] === 'string'
    ) {
      this.globalId = values[GLOBAL_ID_KEY];
      this.entityData = await cacheProvider.getBdo(this.globalId);
    }
    for (const key in values) {
      if (values.hasOwnProperty(key)) {
        if (key === GLOBAL_ID_KEY) {
          continue;
        }
        if (typeof values[key] === 'object') {
          if (Array.isArray(values[key])) {
            const objArray: EntityNode[] = [];
            const scalarArray: Array<NonNullable<FDCScalarValue>> = [];
            for (const value of values[key]) {
              if (typeof value === 'object') {
                if (Array.isArray(value)) {
                  // Note: we don't support sparse arrays.
                } else {
                  const entityNode =  new EntityNode( this.acc);
                  await entityNode.loadData(value, cacheProvider);
                  objArray.push(entityNode);
                }
              } else {
                scalarArray.push(value);
              }
            }
            if (scalarArray.length > 0 && objArray.length > 0) {
              throw new DataConnectError(
                'invalid-argument',
                'Sparse array detected.'
              );
            }
            if (scalarArray.length > 0) {
              if (this.entityData) {
                const impactedRefs = this.entityData.updateServerValue(
                  key,
                  scalarArray
                );
                this.acc.add(impactedRefs);
              } else {
                this.scalars[key] = scalarArray;
              }
            } else if (objArray.length > 0) {
              this.objectLists[key] = objArray;
            } else {
              this.scalars[key] = [];
            }
          } else {
            if (values[key] === null) {
              this.scalars[key] = null;
              continue;
            }
            const stubDataObject = new EntityNode(
              this.acc
            );
            await stubDataObject.loadData(values[key], cacheProvider);
            this.references[key] = stubDataObject;
          }
        } else {
          if (this.entityData) {
            // TODO: Track only the fields we need for the BDO
            const impactedRefs = this.entityData.updateServerValue(
              key,
              values[key]
            );
            this.acc.add(impactedRefs);
          } else {
            this.scalars[key] = values[key];
          }
        }
      }
    }
    if (this.entityData) {
      await cacheProvider.updateBackingData(this.entityData);
    }
  }
  
  toJson(): object {
    const resultObject: object = {};
    const entityDataMap = this.entityData?.getMap();
    for (const key in entityDataMap) {
      if (entityDataMap?.hasOwnProperty(key)) {
        resultObject[key] = entityDataMap[key];
      }
    }
    // Scalars should never have stubdataobjects
    for (const key in this.scalars) {
      if (this.scalars.hasOwnProperty(key)) {
        resultObject[key] = this.scalars[key];
      }
    }
    for (const key in this.references) {
      if (this.references.hasOwnProperty(key)) {
        resultObject[key] = this.references[key].toJson();
      }
    }
    for (const key in this.objectLists) {
      if (this.objectLists.hasOwnProperty(key)) {
        resultObject[key] = this.objectLists[key].map(obj => {
          return obj.toJson();
        });
      }
    }
    return resultObject;
  }
  static parseMap(
    map: { [key: string]: EntityNode | EntityNode[] | FDCScalarValue },
    isSdo = false
  ): typeof map {
    const newMap: typeof map = {};
    for (const key in map) {
      if (map.hasOwnProperty(key)) {
        if (Array.isArray(map[key])) {
          newMap[key] = map[key].map(value =>
            isSdo ? EntityNode.fromStorableJson(value) : value
          );
        } else {
          newMap[key] = isSdo
            ? EntityNode.fromStorableJson(map[key] as StubDataObjectJson)
            : map[key];
        }
      }
    }
    return newMap;
  }
  static fromStorableJson(obj: StubDataObjectJson): EntityNode {
    const sdo = new EntityNode();
    if (obj.backingData) {
      sdo.entityData = EntityDataObject.fromStorableJson(obj.backingData);
    }
    sdo.acc = new ImpactedQueryRefsAccumulator();
    sdo.globalId = obj.globalID;
    sdo.impactedQueryRefs = new Set<string>();
    sdo.scalars = EntityNode.parseMap(obj.scalars);
    sdo.references = EntityNode.parseMap(obj.references) as typeof sdo.references;
    sdo.objectLists = EntityNode.parseMap(
      obj.objectLists,
      true
    ) as typeof sdo.objectLists;
    return sdo;
  }
  getStorableMap(map: { [key: string]: EntityNode | EntityNode[] }): {
    [key: string]: StubDataObjectJson | StubDataObjectJson[];
  } {
    const newMap: { [key: string]: StubDataObjectJson | StubDataObjectJson[] } =
      {};
    for (const key in map) {
      if (map.hasOwnProperty(key)) {
        if (Array.isArray(map[key])) {
          newMap[key] = map[key].map(value => value.toStorableJson());
        } else {
          newMap[key] = map[key].toStorableJson();
        }
      }
    }
    return newMap;
  }
  toStorableJson(): StubDataObjectJson {
    const obj: StubDataObjectJson = {
      globalID: this.globalId,
      scalars: this.scalars,
      references: this.getStorableMap(
        this.references
      ) as StubDataObjectJson['references'],
      objectLists: this.getStorableMap(
        this.objectLists
      ) as StubDataObjectJson['objectLists']
    };
    if (this.entityData) {
      obj.backingData = this.entityData.toStorableJson();
    }
    return obj;
  }
}

export interface StubDataObjectJson {
  backingData?: BackingDataObjectJson;
  globalID: string;
  scalars: { [key: string]: FDCScalarValue };
  references: { [key: string]: StubDataObjectJson };
  objectLists: {
    [key: string]: StubDataObjectJson[];
  };
}
