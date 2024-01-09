/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0x00 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0x00
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from 'chai';

import {
  DocumentData,
  DocumentReference,
  WithFieldValue,
  PartialWithFieldValue,
  SetOptions,
  UpdateData
} from '../../../src/lite-api/reference';
import {
  getDoc,
  setDoc,
  updateDoc
} from '../../../src/lite-api/reference_impl';
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from '../../../src/lite-api/snapshot';

// A union type for testing
type MyUnionType = string | number;

// An object type for testing
interface MyObjectType {
  booleanProperty: boolean;
  stringProperty: string;
  numberProperty: number;
  nullProperty: null;
  undefinedProperty: undefined;
  unionProperty: MyUnionType;
}

// v9 tests cover scenarios that worked in
// Web SDK version v9.
describe('UpdateData - v9', () => {
  interface MyV9ServerType {
    // primitive types
    booleanProperty: boolean;
    stringProperty: string;
    numberProperty: number;
    nullProperty: null;
    undefinedProperty: undefined;

    // custom types
    unionProperty: MyUnionType;
    objectProperty: MyObjectType;

    // nested objects
    nested: {
      bar: {
        booleanProperty: boolean;
        stringProperty: string;
        anotherLayer: {
          booleanProperty: boolean;
          stringProperty: string;
        };
      };
      baz: {
        booleanProperty: boolean;
        stringProperty: string;
        anotherLayer: {
          booleanProperty: boolean;
          stringProperty: string;
        };
      };
    };

    // index signatures nested 1 layer deep
    indexed: {
      [name: string]: {
        booleanProperty: boolean;
        numberProperty: number;
      };
    };

    // property with dots in the name
    'property.with.dots': boolean;
  }

  it('Supports properties with primitive types', () => {
    let _: UpdateData<MyV9ServerType>;
    _ = {
      booleanProperty: true,
      stringProperty: 'string',
      numberProperty: 2,
      nullProperty: null,
      undefinedProperty: undefined
    };

    _ = {
      // @ts-expect-error
      booleanProperty: 'string',
      // @ts-expect-error
      stringProperty: 1,
      // @ts-expect-error
      numberProperty: 'string',
      // @ts-expect-error
      nullProperty: 'string',
      // @ts-expect-error
      undefinedProperty: 'string'
    };

    expect(true).to.be.true;
  });

  it('Supports properties with custom types', () => {
    let _: UpdateData<MyV9ServerType>;
    _ = {
      unionProperty: 'string',
      objectProperty: {
        booleanProperty: true,
        stringProperty: 'string',
        numberProperty: 2,
        nullProperty: null,
        undefinedProperty: undefined,
        unionProperty: 1
      }
    };

    _ = {
      // @ts-expect-error
      unionProperty: true,

      // @ts-expect-error
      objectProperty: true
    };

    _ = {
      objectProperty: {
        // @ts-expect-error
        booleanProperty: 'string',
        // @ts-expect-error
        stringProperty: 1,
        // @ts-expect-error
        numberProperty: 'string',
        // @ts-expect-error
        nullProperty: 'string',
        // @ts-expect-error
        undefinedProperty: 'string'
      }
    };

    expect(true).to.be.true;
  });

  describe('given properties with dots', () => {
    it('preserves the value type', () => {
      let _: UpdateData<MyV9ServerType>;

      // Allows values of expected type
      _ = {
        'property.with.dots': true
      };

      // Errors on values of unexpected type
      _ = {
        // @ts-expect-error
        'property.with.dots': 1
      };

      expect(true).to.be.true;
    });

    it('does not allow matching a sub-string|path', () => {
      const _: UpdateData<MyV9ServerType> = {
        // @ts-expect-error
        'property.with': true
      };

      expect(true).to.be.true;
    });
  });

  describe('given nested objects without index properties', () => {
    it('supports object replacement at each layer (with partial)', () => {
      let _: UpdateData<MyV9ServerType>;
      _ = {
        nested: {}
      };

      _ = {
        nested: {
          bar: {},
          baz: {}
        }
      };

      _ = {
        nested: {
          bar: {
            booleanProperty: true,
            stringProperty: 'string'
          },
          baz: {
            stringProperty: 'string'
          }
        }
      };

      _ = {
        nested: {
          bar: {
            booleanProperty: true,
            stringProperty: 'string',
            anotherLayer: {
              booleanProperty: false,
              stringProperty: 'another string'
            }
          }
        }
      };

      expect(true).to.be.true;
    });

    it('errors for unexpected value types at each layer', () => {
      let _: UpdateData<MyV9ServerType>;
      _ = {
        // @ts-expect-error
        nested: true
      };

      _ = {
        nested: {
          bar: {
            // @ts-expect-error
            stringProperty: true,
            // @ts-expect-error
            anotherLayer: true
          },
          baz: {
            anotherLayer: {
              // @ts-expect-error
              booleanProperty: 'string value'
            }
          }
        }
      };

      expect(true).to.be.true;
    });

    it('does not allow properties that were not on the original type', () => {
      let _: UpdateData<MyV9ServerType>;
      _ = {
        // @ts-expect-error
        unknown: true
      };

      _ = {
        nested: {
          // @ts-expect-error
          unknown: true
        }
      };

      expect(true).to.be.true;
    });

    it('preserves value types for dot notation', () => {
      let _: UpdateData<MyV9ServerType>;

      // 2 layers with dot notation

      // preserves type
      _ = {
        'nested.bar': {},
        'nested.baz': {}
      };

      // preserves properties of nested objects referenced
      // with dot notation
      _ = {
        'nested.bar': {
          booleanProperty: true,
          stringProperty: 'string',
          anotherLayer: {
            booleanProperty: false,
            stringProperty: 'string'
          }
        },
        'nested.baz': {
          booleanProperty: true
        }
      };

      // preserves type - failure
      _ = {
        // @ts-expect-error
        'nested.bar': false,
        // @ts-expect-error
        'nested.baz': 'string'
      };

      // preserves properties of nested objects - failure
      _ = {
        'nested.bar': {
          // @ts-expect-error
          booleanProperty: 'string'
        }
      };

      // 3 layers with dot notation

      // preserves type
      _ = {
        'nested.bar.booleanProperty': true,
        'nested.bar.anotherLayer': {}
      };

      // preserves properties of nested objects
      _ = {
        'nested.bar.anotherLayer': {
          booleanProperty: false,
          stringProperty: 'string'
        }
      };

      // preserves type - failure
      _ = {
        // @ts-expect-error
        'nested.bar.anotherLayer': true,
        // @ts-expect-error
        'nested.baz.anotherLayer': 'string'
      };

      // preserves properties of nested objects - failure
      _ = {
        'nested.bar.anotherLayer': {
          // @ts-expect-error
          booleanProperty: 'string'
        }
      };

      expect(true).to.be.true;
    });
  });

  describe('given nested objects with index properties', () => {
    it('supports object replacement at each layer (with partial)', () => {
      let _: UpdateData<MyV9ServerType>;
      _ = {
        indexed: {}
      };

      _ = {
        indexed: {
          bar: {},
          baz: {}
        }
      };

      _ = {
        indexed: {
          bar: {
            booleanProperty: true
          },
          baz: {
            numberProperty: 1
          }
        }
      };

      expect(true).to.be.true;
    });

    it('errors for unexpected value types at each layer', () => {
      let _: UpdateData<MyV9ServerType>;
      _ = {
        // @ts-expect-error
        indexed: true
      };

      _ = {
        indexed: {
          bar: {
            // @ts-expect-error
            stringProperty: true
          }
        }
      };

      expect(true).to.be.true;
    });

    it('does not allow properties that were not on the original type', () => {
      const _: UpdateData<MyV9ServerType> = {
        indexed: {
          foo: {
            // @ts-expect-error
            unknown: 1
          },
          bar: {
            numberProperty: 2,
            // @ts-expect-error
            something: 'string val'
          }
        }
      };

      expect(true).to.be.true;
    });

    it('preserves value types for dot notation', () => {
      let _: UpdateData<MyV9ServerType>;

      // 2 layers with dot notation

      // preserves type
      _ = {
        'indexed.bar': {},
        'indexed.baz': {}
      };

      // preserves properties of nested objects referenced
      // with dot notation
      _ = {
        'indexed.bar': {
          booleanProperty: true,
          numberProperty: 1
        },
        'indexed.baz': {
          booleanProperty: true
        }
      };

      expect(true).to.be.true;
    });
  });

  // v10 tests cover new scenarios that are fixed for v10
  describe('UpdateData - v10', () => {
    interface MyV10ServerType {
      booleanProperty: boolean;

      // index signatures nested 1 layer deep
      indexed: {
        [name: string]: {
          booleanProperty: boolean;
          numberProperty: number;
        };
      };

      // index signatures nested 2 layers deep
      layer: {
        indexed: {
          [name: string]: {
            booleanProperty: boolean;
            numberProperty: number;
          };
        };
      };
    }

    describe('given nested objects with index properties', () => {
      it('supports object replacement at each layer (with partial)', () => {
        // This unexpectidly fails in v9 when the object has index signature nested
        // two layers deep (e.g. layer.indexed.[name]).
        const _: UpdateData<MyV10ServerType> = {
          indexed: {
            bar: {},
            baz: {}
          }
        };

        expect(true).to.be.true;
      });

      it('allows dot notation for nested index types', () => {
        let _: UpdateData<MyV10ServerType>;

        // v10 allows 3 layers of dot notation

        // allows the property
        _ = {
          'indexed.bar.booleanProperty': true
        };

        _ = {
          'indexed.bar.numberProperty': 1
        };

        // does not enforce type
        _ = {
          'indexed.bar.booleanProperty': 'string value is not rejected'
        };

        _ = {
          'indexed.bar.numberProperty': 'string value is not rejected'
        };

        // rejects properties that don't exist
        _ = {
          'indexed.bar.unknown': 'string value is not rejected'
        };

        expect(true).to.be.true;
      });

      it('allows dot notation for nested index types that are 2 layers deep', () => {
        let _: UpdateData<MyV10ServerType>;

        // v10 3 layers with dot notation

        // allows the property
        _ = {
          'layer.indexed.bar.booleanProperty': true
        };

        // allows the property, but does not enforce type
        _ = {
          'layer.indexed.bar.booleanProperty': 'string value is not rejected'
        };

        // Allows unknown properties in sub types
        _ = {
          'layer.indexed.bar.unknownProperty': 'This just allows anything'
        };

        expect(true).to.be.true;
      });
    });
  });
});

describe('FirestoreTypeConverter', () => {
  it('converter has the minimal typing information', () => {
    interface MyModelType {
      stringProperty: string;
      numberProperty: number;
    }
    const converter = {
      toFirestore(obj: MyModelType) {
        return { a: obj.stringProperty, b: obj.numberProperty };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot) {
        return {
          stringProperty: snapshot.data().a,
          numberProperty: snapshot.data().b
        };
      }
    };
    async function _(docRef: DocumentReference): Promise<void> {
      const newDocRef = docRef.withConverter(converter);
      await setDoc(newDocRef, { stringProperty: 'foo', numberProperty: 42 });
      await updateDoc(newDocRef, { a: 'newFoo', b: 43 });
      const snapshot = await getDoc(newDocRef);
      const data: MyModelType = snapshot.data()!;
      expect(data.stringProperty).to.equal('newFoo');
      expect(data.numberProperty).to.equal(43);
    }
  });

  it('converter has the minimal typing information plus return types', () => {
    interface MyModelType {
      stringProperty: string;
      numberProperty: number;
    }
    const converter = {
      toFirestore(obj: WithFieldValue<MyModelType>): DocumentData {
        return { a: obj.stringProperty, b: obj.numberProperty };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): MyModelType {
        return {
          stringProperty: snapshot.data().a,
          numberProperty: snapshot.data().b
        };
      }
    };
    async function _(docRef: DocumentReference): Promise<void> {
      const newDocRef = docRef.withConverter(converter);
      await setDoc(newDocRef, { stringProperty: 'foo', numberProperty: 42 });
      await updateDoc(newDocRef, { a: 'newFoo', b: 43 });
      const snapshot = await getDoc(newDocRef);
      const data: MyModelType = snapshot.data()!;
      expect(data.stringProperty).to.equal('newFoo');
      expect(data.numberProperty).to.equal(43);
    }
  });

  it("has the additional 'merge' version of toFirestore()", () => {
    interface MyModelType {
      stringProperty: string;
      numberProperty: number;
    }
    const converter = {
      toFirestore(
        modelObject: PartialWithFieldValue<MyModelType>,
        options?: SetOptions
      ): DocumentData {
        if (options === undefined) {
          return {
            a: modelObject.stringProperty,
            b: modelObject.numberProperty
          };
        }
        const result: DocumentData = {};
        if ('stringProperty' in modelObject) {
          result.a = modelObject.stringProperty;
        }
        if ('numberProperty' in modelObject) {
          result.b = modelObject.numberProperty;
        }
        return result;
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): MyModelType {
        return {
          stringProperty: snapshot.data().a,
          numberProperty: snapshot.data().b
        };
      }
    };
    async function _(docRef: DocumentReference): Promise<void> {
      const newDocRef = docRef.withConverter(converter);
      await setDoc(newDocRef, { stringProperty: 'foo', numberProperty: 42 });
      await updateDoc(newDocRef, { a: 'newFoo', b: 43 });
      const snapshot = await getDoc(newDocRef);
      const data: MyModelType = snapshot.data()!;
      expect(data.stringProperty).to.equal('newFoo');
      expect(data.numberProperty).to.equal(43);
    }
  });

  it('converter is explicitly typed as FirestoreDataConverter<T>', () => {
    interface MyModelType {
      stringProperty: string;
      numberProperty: number;
    }
    const converter: FirestoreDataConverter<MyModelType> = {
      toFirestore(obj: WithFieldValue<MyModelType>) {
        return { a: obj.stringProperty, b: obj.numberProperty };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot) {
        return {
          stringProperty: snapshot.data().a,
          numberProperty: snapshot.data().b
        };
      }
    };
    async function _(docRef: DocumentReference): Promise<void> {
      const newDocRef = docRef.withConverter(converter);
      await setDoc(newDocRef, { stringProperty: 'foo', numberProperty: 42 });
      await updateDoc(newDocRef, { a: 'newFoo', b: 43 });
      const snapshot = await getDoc(newDocRef);
      const data: MyModelType = snapshot.data()!;
      expect(data.stringProperty).to.equal('newFoo');
      expect(data.numberProperty).to.equal(43);
    }
  });

  it('converter is explicitly typed as FirestoreDataConverter<T, U>', () => {
    interface MyModelType {
      stringProperty: string;
      numberProperty: number;
    }
    interface MyDbType {
      a: string;
      b: number;
    }
    const converter: FirestoreDataConverter<MyModelType, MyDbType> = {
      toFirestore(obj: WithFieldValue<MyModelType>) {
        return { a: obj.stringProperty, b: obj.numberProperty };
      },
      fromFirestore(snapshot: QueryDocumentSnapshot) {
        return {
          stringProperty: snapshot.data().a,
          numberProperty: snapshot.data().b
        };
      }
    };
    async function _(docRef: DocumentReference): Promise<void> {
      const newDocRef = docRef.withConverter(converter);
      await setDoc(newDocRef, { stringProperty: 'foo', numberProperty: 42 });
      await updateDoc(newDocRef, { a: 'newFoo', b: 43 });
      const snapshot = await getDoc(newDocRef);
      const data: MyModelType = snapshot.data()!;
      expect(data.stringProperty).to.equal('newFoo');
      expect(data.numberProperty).to.equal(43);
    }
  });

  it('setDoc() fails to compile if `data` argument is missing properties', () => {
    async function _(docRef: DocumentReference): Promise<void> {
      const converter = new ThrowingConverter<
        { foo: string },
        { bar: number }
      >();
      const docRefWithConverter = docRef.withConverter(converter);
      // @ts-expect-error `data` argument is missing `foo` property.
      await setDoc(docRefWithConverter, { bar: 42 });
    }
  });

  it('setDoc() fails to compile if `data` argument has incorrect type for a property', () => {
    async function _(docRef: DocumentReference): Promise<void> {
      const converter = new ThrowingConverter<{ foo: string }, {}>();
      const docRefWithConverter = docRef.withConverter(converter);
      // @ts-expect-error The `data` argument has the wrong type for `foo`.
      await setDoc(docRefWithConverter, { foo: 42 });
    }
  });

  it('updateDoc() fails to compile if `data` argument is missing properties', () => {
    async function _(docRef: DocumentReference): Promise<void> {
      const converter = new ThrowingConverter<
        { foo: string },
        { bar: number }
      >();
      const docRefWithConverter = docRef.withConverter(converter);
      // @ts-expect-error `data` argument is missing `bar` property.
      await updateDoc(docRefWithConverter, { foo: 'foo' });
    }
  });

  it('updateDoc() fails to compile if `data` argument has incorrect type for a property', () => {
    async function _(docRef: DocumentReference): Promise<void> {
      const converter = new ThrowingConverter<{}, { bar: number }>();
      const docRefWithConverter = docRef.withConverter(converter);
      // @ts-expect-error The `data` argument has the wrong type for `bar`.
      await updateDoc(docRefWithConverter, { bar: 'bar' });
    }
  });

  it('getDoc() returns AppModelType', () => {
    async function _(docRef: DocumentReference): Promise<void> {
      const converter = new ThrowingConverter<
        { foo: string },
        { bar: number }
      >();
      const docRefWithConverter = docRef.withConverter(converter);
      const snapshot = await getDoc(docRefWithConverter);
      const data: { foo: string } = snapshot.data()!;
      expect(data.foo).to.equal('foo');
    }
  });

  /**
   * An implementation of FirestoreDataConverter whose methods simply throw an
   * exception. Instances of this class may be useful for tests that only desire
   * to check the compile-time type checking but not actually invoke the
   * converter at runtime.
   */
  class ThrowingConverter<AppModelType, DbModelType extends DocumentData>
    implements FirestoreDataConverter<AppModelType, DbModelType>
  {
    toFirestore(
      modelObject: WithFieldValue<AppModelType>
    ): WithFieldValue<DbModelType> {
      throw new Error('ThrowingConverter.toFirestore() should not be called');
    }

    fromFirestore(snapshot: QueryDocumentSnapshot): AppModelType {
      throw new Error('ThrowingConverter.fromFirestore() should not be called');
    }
  }
});
