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

import { Code, DataConnectError } from '../core/error';

import { InternalCacheProvider } from './CacheProvider';
import {
  EntityDataObject,
  EntityDataObjectJson,
  FDCScalarValue
} from './EntityDataObject';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';

export const GLOBAL_ID_KEY = '_id';
export const OBJECT_LISTS_KEY = '_objectLists';
export const REFERENCES_KEY = '_references';
export const SCALARS_KEY = '_scalars';
export const ENTITY_DATA_KEYS_KEY = '_entity_data_keys';
export class EntityNode {
  entityData?: EntityDataObject;
  scalars: Record<string, FDCScalarValue> = {};
  references: { [key: string]: EntityNode } = {};
  objectLists: {
    [key: string]: EntityNode[];
  } = {};
  globalId?: string;
  entityDataKeys: Set<string> = new Set();

  async loadData(
    queryId: string,
    values: FDCScalarValue,
    entityIds: Record<string, unknown> | undefined,
    acc: ImpactedQueryRefsAccumulator,
    cacheProvider: InternalCacheProvider
  ): Promise<void> {
    if (values === undefined) {
      return;
    }
    if (typeof values !== 'object' || Array.isArray(values)) {
      throw new DataConnectError(
        Code.INVALID_ARGUMENT,
        'EntityNode initialized with non-object value'
      );
    }
    if (values === null) {
      return;
    }

    if (
      typeof values === 'object' &&
      entityIds &&
      entityIds[GLOBAL_ID_KEY] &&
      typeof entityIds[GLOBAL_ID_KEY] === 'string'
    ) {
      this.globalId = entityIds[GLOBAL_ID_KEY];
      this.entityData = await cacheProvider.getEntityData(this.globalId);
    }
    for (const key in values) {
      if (values.hasOwnProperty(key)) {
        if (typeof values[key] === 'object') {
          if (Array.isArray(values[key])) {
            const ids: Record<string, unknown> | undefined =
              entityIds && (entityIds[key] as Record<string, unknown>);
            const objArray: EntityNode[] = [];
            const scalarArray: Array<NonNullable<FDCScalarValue>> = [];
            for (const [index, value] of values[key].entries()) {
              if (typeof value === 'object') {
                if (Array.isArray(value)) {
                  // Note: we don't support sparse arrays.
                } else {
                  const entityNode = new EntityNode();
                  await entityNode.loadData(
                    queryId,
                    value,
                    ids && (ids[index] as Record<string, unknown>),
                    acc,
                    cacheProvider
                  );
                  objArray.push(entityNode);
                }
              } else {
                scalarArray.push(value);
              }
            }
            if (scalarArray.length > 0 && objArray.length > 0) {
              this.scalars[key] = values[key];
            } else if (scalarArray.length > 0) {
              if (this.entityData) {
                const impactedRefs = this.entityData.updateServerValue(
                  key,
                  scalarArray,
                  queryId
                );
                this.entityDataKeys.add(key);
                acc.add(impactedRefs);
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
            const entityNode = new EntityNode();
            // TODO: Load Data might need to be pushed into ResultTreeProcessor instead.
            await entityNode.loadData(
              queryId,
              (values as Record<string, FDCScalarValue>)[key],
              entityIds && (entityIds[key] as Record<string, unknown>),
              acc,
              cacheProvider
            );
            this.references[key] = entityNode;
          }
        } else {
          if (this.entityData) {
            const impactedRefs = this.entityData.updateServerValue(
              key,
              values[key] as FDCScalarValue,
              queryId
            );
            this.entityDataKeys.add(key);
            acc.add(impactedRefs);
          } else {
            this.scalars[key] = values[key] as FDCScalarValue;
          }
        }
      }
    }
    if (this.entityData) {
      await cacheProvider.updateEntityData(this.entityData);
    }
  }

  toJSON(mode: EncodingMode): Record<string, unknown> {
    const resultObject: Record<string, unknown> = {};
    if (mode === EncodingMode.hydrated) {
      if (this.entityData) {
        for (const key of this.entityDataKeys) {
          resultObject[key] = this.entityData.getServerValue(key);
        }
      }

      if (this.scalars) {
        Object.assign(resultObject, this.scalars);
      }
      if (this.references) {
        for (const key in this.references) {
          if (this.references.hasOwnProperty(key)) {
            resultObject[key] = this.references[key].toJSON(mode);
          }
        }
      }
      if (this.objectLists) {
        for (const key in this.objectLists) {
          if (this.objectLists.hasOwnProperty(key)) {
            resultObject[key] = this.objectLists[key].map(obj =>
              obj.toJSON(mode)
            );
          }
        }
      }
      return resultObject;
    } else {
      // Get JSON representation of dehydrated list
      if (this.entityData) {
        resultObject[GLOBAL_ID_KEY] = this.entityData.globalID;
      }

      resultObject[ENTITY_DATA_KEYS_KEY] = Array.from(this.entityDataKeys);

      if (this.scalars) {
        resultObject[SCALARS_KEY] = this.scalars;
      }

      if (this.references) {
        const references = {} as Record<string, unknown>;
        for (const key in this.references) {
          if (this.references.hasOwnProperty(key)) {
            references[key] = this.references[key].toJSON(mode);
          }
        }
        resultObject[REFERENCES_KEY] = references;
      }
      if (this.objectLists) {
        const objectLists = {} as Record<string, unknown>;
        for (const key in this.objectLists) {
          if (this.objectLists.hasOwnProperty(key)) {
            objectLists[key] = this.objectLists[key].map(obj =>
              obj.toJSON(mode)
            );
          }
        }
        resultObject[OBJECT_LISTS_KEY] = objectLists;
      }
    }

    return resultObject;
  }

  static fromJson(obj: unknown): EntityNode {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new DataConnectError(
        Code.INVALID_ARGUMENT,
        'EntityNode.fromJson: expected object'
      );
    }
    const rawObj = obj as DehydratedStubDataObject;
    const sdo = new EntityNode();
    if (rawObj.backingData) {
      const backingData = rawObj.backingData;
      if (typeof backingData !== 'object' || Array.isArray(backingData)) {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected object for backingData'
        );
      }
      if (typeof backingData.globalID !== 'string') {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected string for backingData.globalID'
        );
      }
      if (!backingData.map || typeof backingData.map !== 'object' || Array.isArray(backingData.map)) {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected object for backingData.map'
        );
      }
      if (!Array.isArray(backingData.referencedFrom) || backingData.referencedFrom.some((x: unknown) => typeof x !== 'string')) {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected string array for backingData.referencedFrom'
        );
      }
      sdo.entityData = EntityDataObject.fromJSON(backingData);
    }
    const rawGlobalId = rawObj[GLOBAL_ID_KEY];
    if (rawGlobalId !== undefined) {
      if (typeof rawGlobalId !== 'string') {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected string for globalId'
        );
      }
      sdo.globalId = rawGlobalId;
    }

    const rawKeys = rawObj[ENTITY_DATA_KEYS_KEY];
    if (rawKeys) {
      if (!Array.isArray(rawKeys)) {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected array for entityDataKeys'
        );
      }
      for (const key of rawKeys) {
        if (typeof key !== 'string') {
          throw new DataConnectError(
            Code.INVALID_ARGUMENT,
            'EntityNode.fromJson: expected array of strings for entityDataKeys'
          );
        }
        sdo.entityDataKeys.add(key);
      }
    }

    const rawScalars = rawObj[SCALARS_KEY];
    if (rawScalars) {
      if (typeof rawScalars !== 'object' || Array.isArray(rawScalars)) {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected object for scalars'
        );
      }
      sdo.scalars = rawScalars;
    } else {
      sdo.scalars = {};
    }

    const rawRefs = rawObj[REFERENCES_KEY];
    if (rawRefs) {
      if (typeof rawRefs !== 'object' || Array.isArray(rawRefs)) {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected object for references'
        );
      }
      const references: { [key: string]: EntityNode } = {};
      for (const key in rawRefs) {
        if (Object.prototype.hasOwnProperty.call(rawRefs, key)) {
          // NOTE: is this check necessary? sure, we don't want to allow `prototype` or `constructor`
          // pollution, but doesn't this mean any fields named that can't be de-serialized? and so
          // therefore we should really be disallowing these field names all the way in the schema???
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
          }
          references[key] = EntityNode.fromJson(rawRefs[key]);
        }
      }
      sdo.references = references;
    }

    const rawLists = rawObj[OBJECT_LISTS_KEY];
    if (rawLists) {
      if (typeof rawLists !== 'object' || Array.isArray(rawLists)) {
        throw new DataConnectError(
          Code.INVALID_ARGUMENT,
          'EntityNode.fromJson: expected object for objectLists'
        );
      }
      const objectLists: { [key: string]: EntityNode[] } = {};
      for (const key in rawLists) {
        if (Object.prototype.hasOwnProperty.call(rawLists, key)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
          }
          const list = rawLists[key];
          if (!Array.isArray(list)) {
            throw new DataConnectError(
              Code.INVALID_ARGUMENT,
              'EntityNode.fromJson: expected array for object list'
            );
          }
          objectLists[key] = list.map((item: unknown) =>
            EntityNode.fromJson(item)
          );
        }
      }
      sdo.objectLists = objectLists;
    }
    return sdo;
  }
}

export interface DehydratedStubDataObject {
  backingData?: EntityDataObjectJson;
  [GLOBAL_ID_KEY]?: string;
  [ENTITY_DATA_KEYS_KEY]?: string[];
  [SCALARS_KEY]?: { [key: string]: FDCScalarValue };
  [REFERENCES_KEY]?: { [key: string]: DehydratedStubDataObject };
  [OBJECT_LISTS_KEY]?: {
    [key: string]: DehydratedStubDataObject[];
  };
}

// Helpful for storing in persistent cache, which is not available yet.
export enum EncodingMode {
  hydrated,
  dehydrated
}
