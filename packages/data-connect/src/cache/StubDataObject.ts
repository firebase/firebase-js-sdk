import { DataConnectError } from '../core/error';
import { BackingDataObject, FDCScalarValue } from './BackingDataObject';
import { CacheProvider } from './CacheProvider';
import { ImpactedQueryRefsAccumulator } from './ImpactedQueryRefsAccumulator';

export const GLOBAL_ID_KEY = 'cacheId';
export class StubDataObject {
  backingData?: BackingDataObject;
  scalars: { [key: string]: FDCScalarValue } = {};
  references: { [key: string]: StubDataObject } = {};
  objectLists: {
    [key: string]: StubDataObject[];
  } = {};
  globalId?: string;
  impactedQueryRefs = new Set<string>();

  constructor();
  constructor(values: FDCScalarValue, cacheProvider: CacheProvider, acc: ImpactedQueryRefsAccumulator);
  constructor(values?: FDCScalarValue, cacheProvider?: CacheProvider, private acc?: ImpactedQueryRefsAccumulator) {
    if(typeof values === 'undefined' && typeof cacheProvider === 'undefined' && typeof acc === 'undefined') {
      return;
    }
    // TODO: validate that all other fields have been passed in
    // TODO: validate that all other fields have been passed in.
    if (typeof values !== 'object' || Array.isArray(values)) {
      throw new DataConnectError(
        'invalid-argument',
        'StubDataObject initialized with non-object value'
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
      this.backingData = cacheProvider.getBdo(this.globalId);
    }
    for (const key in values) {
      if (values.hasOwnProperty(key)) {
        if (key === GLOBAL_ID_KEY) {
          continue;
        }
        if (typeof values[key] === 'object') {
          if (Array.isArray(values[key])) {
            if (!this.objectLists[key]) {
              this.objectLists[key] = [];
            }
            const objArray: StubDataObject[] = [];
            const scalarArray: NonNullable<FDCScalarValue>[] = [];
            for (const value of values[key]) {
              if (typeof value === 'object') {
                if (Array.isArray(value)) {
                  // TODO: What if it's an array of arrays?
                } else {
                  objArray.push(new StubDataObject(value, cacheProvider, this.acc));
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
              if (this.backingData) {
                const impactedRefs = this.backingData.updateServerValue(key, scalarArray);
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
            const stubDataObject = new StubDataObject(
              values[key],
              cacheProvider,
              this.acc
            );
            this.references[key] = stubDataObject;
          }
        } else {
          if (this.backingData) {
            // TODO: Track only the fields we need for the BDO
            const impactedRefs = this.backingData.updateServerValue(
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
    if (this.backingData) {
      cacheProvider.updateBackingData(this.backingData);
    }
  }
  toJson(): object {
    const resultObject: object = {};
    for (const key in this.backingData) {
      if (this.backingData.hasOwnProperty(key)) {
        resultObject[key] = this.backingData[key];
      }
    }
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
        resultObject[key] = this.objectLists[key].map(obj => obj.toJson());
      }
    }
    return resultObject;
  }
  static parseMap(map: {[key: string]: any}): typeof map {
    const newMap: typeof map = {};
    for (const key in map) {
      if(map.hasOwnProperty(key)) {
        if(Array.isArray(map[key])) {
          newMap[key] = map[key].map(value => StubDataObject.fromStorableJson(value));
        } else {
          newMap[key] = StubDataObject.fromStorableJson(map[key]);
        }
      }
    }
    return newMap;
  }
  static fromStorableJson(obj: any): StubDataObject {
    const sdo = new StubDataObject();
    // TODO: implement this.
    sdo.backingData = BackingDataObject.fromStorableJson(obj.backingData);
    sdo.acc = new ImpactedQueryRefsAccumulator();
    sdo.globalId = obj.globalID;
    sdo.impactedQueryRefs = new Set<string>();
    sdo.scalars = this.parseMap(obj.scalars);
    sdo.references = this.parseMap(obj.references);
    return sdo;
  }
  getStorableMap(map: {[key: string]: any}) {
    const newMap: typeof map = {};
    for (const key in map) {
      if(map.hasOwnProperty(key)) {
        if(Array.isArray(map[key])) {
          newMap[key] = map[key].map(value => value.toStorableJson());
        } else {
          newMap[key] = map[key].toStorableJson();
        }
      }
    }
    return newMap;
  }
  toStorableJson(): object {
    // TODO: replace all `any` types.
    const obj: any = {};
    obj.backingData = this.backingData.toStorableJson();
    obj.globalID = this.globalId;
    obj.scalars = this.scalars;
    obj.references = this.getStorableMap(this.references);
    obj.objectLists = this.getStorableMap(this.objectLists);
    return obj;
  }
}
