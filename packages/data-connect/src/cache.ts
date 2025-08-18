enum FieldType {
  scalar,
  customobject
}
interface Field {
  name: string;
  type: FieldType;
}
interface Scalar {
  fields: Field[];
}

type TypeInformation = Scalar;

type NativeScalar = string | number | boolean | null;

interface ResultTree {
  [name: string]: StubObject | NativeScalar | Omit<StubObject[], 'typedKey'>;
}


interface BackingObjectListenerMap {
  [name: string]: StubObject[];
}

type FDCScalarValue = string | number | boolean | null;

class BackingDataObject {
  typedKey: string;
  private serverValues = new Map<string, FDCScalarValue>();
  private listeners: BackingObjectListenerMap = {};
  updateFromServer(value: FDCScalarValue, key: string) {
    this.serverValues[key] = value;
    this.notifyListeners(key);
  }
  listenTo(keys: string[], listener: StubObject) {
    for (const key of keys) {
      if (this.listeners[key]) {
        this.listeners[key].push(listener);
      } else {
        this.listeners[key] = [listener];
      }
    }
  }
  notifyListeners(key: string) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(listener =>
        listener.updateValue(key, this.serverValues[key])
      );
    }
  }

  serverValue(key: string): FDCScalarValue {
    return this.serverValues[key];
  }
  toJson() {
    const toReturn: object = {};
    for (const [key, value] of this.serverValues) {
      toReturn[key] = value;
    }
    return toReturn;
  }
}
/**
 * StubObject: field: 'movies',
 * StubObject: Array of Movies:
 * StubObject(movie0)
 *   BackingDataObject(movie0)
 */

// interface StubObject {
//     [name: string]: FDCScalarValue;
// }
/**
 * StubObject({
 *  'movies': StubArray([
 *   StubObject(BDO),
 *   StubObject(BDO)
 * ])
 * })
 */

class StubArray {
  _valueMap: (FDCScalarValue | StubObject)[] = [];
  constructor(
    private _values: FDCScalarValue[] | object[],
    private _bdoHandler: BackingDataObjectHandler
  ) {
    for (const value of _values) {
      if (typeof value === 'object') {
        // TODO: What about arrays?
        const stubObject = new StubObject(value as CachedObject, _bdoHandler); // What about instances where there's no typename?
        this._valueMap.push(stubObject);
      } else {
        this._valueMap.push(value);
      }
    }
  }
  value(): (FDCScalarValue | object)[] {
    return this._valueMap.map(v => {
      // print
      if (v instanceof StubObject) {
        return v.toJson();
      } else {
        return v;
      }
    });
  }
}

class BackingDataObjectHandler {
  private backingDataObjects = new Map<string, BackingDataObject>();

  getOrCreate(typedKey: string): BackingDataObject {
    if (!this.backingDataObjects.has(typedKey)) {
      this.backingDataObjects.set(typedKey, new BackingDataObject());
    }
    return this.backingDataObjects.get(typedKey)!;
  }
}

interface CachedObject {
    __typename: string;
    [field: string]: FDCScalarValue | CachedObject | FDCScalarValue[] | CachedObject[];
}

class StubObject {
  constructor(
    value: CachedObject,
    public bdoHandler: BackingDataObjectHandler
  ) {
    // TODO: Register value with typename system
    for(const [k, v] of Object.entries(value)) {
        if(typeof v === 'object') {
            this.addObject(k, v);
        } else {
            this.addField(k, v);
        }
    }
  }
  // TODO: Check whether object is right here.
  map: Map<string, BackingDataObject | FDCScalarValue | StubObject | StubArray> = new Map();

  parentListeners: Map<
    string,
    ((value: FDCScalarValue | FDCScalarValue[]) => void)[]
  > = new Map();

  updateValue(key: string, value: FDCScalarValue | FDCScalarValue[]) {
    // TODO: Propagate to other listeners.
    // this.map.set(key, value);
    // if (this.parentListeners.has(key)) {
    //   this.parentListeners.get(key).forEach(listener => listener(value));
    // }
  }

  addField(key: string, value: FDCScalarValue) {
    this.map.set(key, value);
  }

  addObject(key: string, value: object | FDCScalarValue) {
    /**
     * Every key maps to a backing data object.
     */
        if(Array.isArray(value)) {
            this.map.set(key, new StubArray(value, this.bdoHandler));
        } else if(typeof value === 'object') {
            // Field is an object
            const toListenTo: string[] = [];
            for(const [k, v] of Object.entries(value)) {
                if(typeof v === 'object') {
                    const stubObject = new StubObject(v, this.bdoHandler);
                    this.map.set(k, stubObject);
                } else {
                    const bdo = this.bdoHandler.getOrCreate((value as CachedObject).__typename as string);
                    if('__typename' in value && typeof v !== 'object') {
                        toListenTo.push(k);
                        console.log('bdo for ' + k);
                        this.map.set(k, bdo);
                        bdo.updateFromServer(v as FDCScalarValue, k);
                    }
                }
            }
            if(toListenTo.length > 0) {
                const bdo = this.bdoHandler.getOrCreate((value as CachedObject).__typename as string);
                bdo.listenTo(toListenTo, this);
            }
        } else {
            // TODO: throw an error
            throw new Error('Add Object called on non-object');
        }
  }

  toJson(): object {
    const toReturn: object = {};
    for (const [key, value] of this.map) {
      let retV;
      if (value instanceof StubObject) {
        retV = value.toJson();
      } else if (value instanceof StubArray) {
        retV = value.value();
      } else if(value instanceof BackingDataObject) {
        retV = value.serverValue(key);
      } else {
        retV = value;
      }
    toReturn[key] = retV;
    }
    return toReturn;
  }
}

const stubDataObject = new StubObject({
        __typename: '__moviesArray',
        movies: [
            {
                __typename: 'abc',
                id: 'abc',
                title: 'abc',
                nestedField: {
                    a: 'abc',
                    b: 'def',
                    __typename: 'nestedField'
                },
                reviews: [
                    { __typename: 'abc', id: 'def', title: 'review!' }
                ]
            }
        ]
    },
    new BackingDataObjectHandler()
);