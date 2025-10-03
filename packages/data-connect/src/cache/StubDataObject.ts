import { DataConnectError } from '../core/error';
import { BackingDataObject } from './BackingDataObject';
import { CacheProvider } from './CacheProvider';

type ScalarValue = number | string | null | object | ScalarValue[];
export const GLOBAL_ID_KEY = 'cacheId';
export class StubDataObject {
  backingData?: BackingDataObject;
  scalars: { [key: string]: ScalarValue } = {};
  references: { [key: string]: StubDataObject } = {};
  objectLists: {
    [key: string]: StubDataObject[];
  } = {};
  globalId?: string;

  constructor(values: ScalarValue, cacheProvider: CacheProvider) {
    if (typeof values !== 'object' || Array.isArray(values)) {
      throw new DataConnectError(
        'invalid-argument',
        'StubDataObject initialized with non-object value'
      );
    }
    if(values === null) {
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
                if(!this.objectLists[key]) {
                    this.objectLists[key] = [];
                }
                const objArray: StubDataObject[] = [];
                const scalarArray: NonNullable<ScalarValue>[] = [];
                for(const value of values[key]) {
                    if(typeof value === 'object') {
                        if(Array.isArray(value)) {
                            // TODO: What if it's an array of arrays?
                        } else {
                            objArray.push(
                                new StubDataObject(value, cacheProvider));
                        }
                    } else {
                        scalarArray.push(value);
                    }
                }
                if(scalarArray.length > 0 && objArray.length > 0) {
                    throw new DataConnectError('invalid-argument', 'Sparse array detected.');
                }
                if(scalarArray.length > 0) {
                    if(this.backingData) {
                        this.backingData.updateServerValue(key, scalarArray);
                    } else {
                        this.scalars[key] = scalarArray;
                    }
                } else if(objArray.length > 0) {
                    this.objectLists[key] = objArray;
                } else {
                    this.scalars[key] = [];
                }
            } else {
              if(values[key] === null) {
                this.scalars[key] = null;
                continue;
              }
              const stubDataObject = new StubDataObject(
                values[key],
                cacheProvider
              );
              this.references[key] = stubDataObject;
            }
          } else {
            if(this.backingData) {
                // TODO: Track only the fields we need for the BDO
                this.backingData.updateServerValue(key, values[key]);
            } else {
                this.scalars[key] = values[key];
            }
          }
        }
      }
      if(this.backingData) {
        cacheProvider.updateBackingData(this.backingData);
      }
    }
    toJson(): object {
        const resultObject: object = {

        };
        for(const key in this.backingData) {
            if(this.backingData.hasOwnProperty(key)) {
                resultObject[key] = this.backingData[key];
            }
        }
        for(const key in this.scalars) {
            if(this.scalars.hasOwnProperty(key)) {
                resultObject[key] = this.scalars[key];
            }
        }
        for(const key in this.references) {
            if(this.references.hasOwnProperty(key)) {
                resultObject[key] = this.references[key].toJson();
            }
        }
        for(const key in this.objectLists) {
            if(this.objectLists.hasOwnProperty(key)) {
                resultObject[key] = this.objectLists[key].map(obj => obj.toJson());
            }
        }
        return resultObject;
    }
}
