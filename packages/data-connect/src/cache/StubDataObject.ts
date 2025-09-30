import { DataConnectError } from '../api';
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
    
      this.globalId = values[GLOBAL_ID_KEY];
      if (values.hasOwnProperty(GLOBAL_ID_KEY)) {
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
                const objArray = [];
                const scalarArray = [];
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
              const stubDataObject = new StubDataObject(
                values[key],
                cacheProvider
              );
              this.references[key] = stubDataObject;
            }
          } else {
            if(this.backingData) {
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
}
