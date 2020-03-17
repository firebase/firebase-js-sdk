/**
 * @license
 * Copyright 2017 Google Inc.
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

import { expect } from 'chai';
import { GeoPoint } from '../../../src/api/geo_point';
import { Timestamp } from '../../../src/api/timestamp';
import { TypeOrder } from '../../../src/model/field_value';
import {
  ObjectValue,
  PrimitiveValue
} from '../../../src/model/proto_field_value';
import { ByteString } from '../../../src/util/byte_string';
import { blob, field, mask } from '../../util/helpers';
import { valueOf } from '../../util/values';

describe('FieldValue', () => {
  const date1 = new Date(2016, 4, 2, 1, 5);
  const date2 = new Date(2016, 5, 20, 10, 20, 30);

  it('can parse integers', () => {
    const primitiveValues = [
      Number.MIN_SAFE_INTEGER,
      -1,
      0,
      1,
      2,
      Number.MAX_SAFE_INTEGER
    ];
    const values = primitiveValues.map(v => wrap(v));

    values.forEach(v => {
      expect(v.typeOrder).to.equal(TypeOrder.NumberValue);
    });

    for (let i = 0; i < primitiveValues.length; i++) {
      const primitiveValue = primitiveValues[i];
      const value = values[i];
      expect(value.value()).to.equal(primitiveValue);
    }
  });

  it('can parse doubles', () => {
    const primitiveValues = [
      Number.MIN_SAFE_INTEGER - 1,
      -1.1,
      0.1,
      Number.MAX_SAFE_INTEGER + 1,
      NaN,
      Infinity,
      -Infinity
    ];
    const values = primitiveValues.map(v => wrap(v));

    values.forEach(v => {
      expect(v.typeOrder).to.equal(TypeOrder.NumberValue);
    });

    for (let i = 0; i < primitiveValues.length; i++) {
      const primitiveValue = primitiveValues[i];
      const value = values[i];
      if (isNaN(primitiveValue)) {
        expect(isNaN(value.value() as number)).to.equal(isNaN(primitiveValue));
      } else {
        expect(value.value()).to.equal(primitiveValue);
      }
    }
  });

  it('can parse null', () => {
    const nullValue = wrap(null);

    expect(nullValue.typeOrder).to.equal(TypeOrder.NullValue);
    expect(nullValue.value()).to.equal(null);
  });

  it('can parse booleans', () => {
    const trueValue = wrap(true);
    const falseValue = wrap(false);

    expect(trueValue.typeOrder).to.equal(TypeOrder.BooleanValue);
    expect(trueValue.typeOrder).to.equal(TypeOrder.BooleanValue);

    expect(trueValue.value()).to.equal(true);
    expect(falseValue.value()).to.equal(false);
  });

  it('can parse dates', () => {
    const dateValue1 = wrap(date1);
    const dateValue2 = wrap(date2);

    expect(dateValue1.typeOrder).to.equal(TypeOrder.TimestampValue);
    expect(dateValue2.typeOrder).to.equal(TypeOrder.TimestampValue);

    expect(dateValue1.value()).to.deep.equal(Timestamp.fromDate(date1));
    expect(dateValue2.value()).to.deep.equal(Timestamp.fromDate(date2));
  });

  it('can parse geo points', () => {
    const latLong1 = new GeoPoint(1.23, 4.56);
    const latLong2 = new GeoPoint(-20, 100);
    const value1 = wrap(latLong1);
    const value2 = wrap(latLong2);

    expect(value1.typeOrder).to.equal(TypeOrder.GeoPointValue);
    expect(value2.typeOrder).to.equal(TypeOrder.GeoPointValue);

    expect((value1.value() as GeoPoint).latitude).to.equal(1.23);
    expect((value1.value() as GeoPoint).longitude).to.equal(4.56);
    expect((value2.value() as GeoPoint).latitude).to.equal(-20);
    expect((value2.value() as GeoPoint).longitude).to.equal(100);
  });

  it('can parse bytes', () => {
    const bytesValue = wrap(blob(0, 1, 2));

    expect(bytesValue.typeOrder).to.equal(TypeOrder.BlobValue);
    expect((bytesValue.value() as ByteString).toUint8Array()).to.deep.equal(
      new Uint8Array([0, 1, 2])
    );
  });

  it('can parse simple objects', () => {
    const objValue = wrap({ a: 'foo', b: 1, c: true, d: null });

    expect(objValue.typeOrder).to.equal(TypeOrder.ObjectValue);
    expect(objValue.value()).to.deep.equal({
      a: 'foo',
      b: 1,
      c: true,
      d: null
    });
  });

  it('can parse nested objects', () => {
    const objValue = wrap({ foo: { bar: 1, baz: [1, 2, { a: 'b' }] } });

    expect(objValue.typeOrder).to.equal(TypeOrder.ObjectValue);
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 1, baz: [1, 2, { a: 'b' }] }
    });
  });

  it('can parse empty objects', () => {
    const objValue = wrap({ foo: {} });

    expect(objValue.typeOrder).to.equal(TypeOrder.ObjectValue);
    expect(objValue.value()).to.deep.equal({ foo: {} });
  });

  it('can extract fields', () => {
    const objValue = wrapObject({ foo: { a: 1, b: true, c: 'string' } });

    expect(objValue.typeOrder).to.equal(TypeOrder.ObjectValue);

    expect(objValue.field(field('foo'))?.typeOrder).to.equal(
      TypeOrder.ObjectValue
    );
    expect(objValue.field(field('foo.a'))?.typeOrder).to.equal(
      TypeOrder.NumberValue
    );
    expect(objValue.field(field('foo.b'))?.typeOrder).to.equal(
      TypeOrder.BooleanValue
    );
    expect(objValue.field(field('foo.c'))?.typeOrder).to.equal(
      TypeOrder.StringValue
    );

    expect(objValue.field(field('foo.a.b'))).to.be.null;
    expect(objValue.field(field('bar'))).to.be.null;
    expect(objValue.field(field('bar.a'))).to.be.null;

    expect(objValue.field(field('foo'))!.value()).to.deep.equal({
      a: 1,
      b: true,
      c: 'string'
    });
    expect(objValue.field(field('foo.a'))!.value()).to.equal(1);
    expect(objValue.field(field('foo.b'))!.value()).to.equal(true);
    expect(objValue.field(field('foo.c'))!.value()).to.equal('string');
  });

  it('can overwrite existing fields', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = setField(objValue, 'foo', wrap('new-foo-value'));
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: 'new-foo-value' });
  });

  it('can add new fields', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = setField(objValue, 'bar', wrap('bar-value'));
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({
      foo: 'foo-value',
      bar: 'bar-value'
    });
  });

  it('can add multiple new fields', () => {
    let objValue = ObjectValue.EMPTY;
    objValue = objValue
      .toBuilder()
      .set(field('a'), valueOf('a'))
      .build();
    objValue = objValue
      .toBuilder()
      .set(field('b'), valueOf('b'))
      .set(field('c'), valueOf('c'))
      .build();

    expect(objValue.value()).to.deep.equal({ a: 'a', b: 'b', c: 'c' });
  });

  it('can implicitly create objects', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = setField(objValue, 'a.b', wrap('b-value'));
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({
      foo: 'foo-value',
      a: { b: 'b-value' }
    });
  });

  it('can overwrite primitive values to create objects', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = setField(objValue, 'foo.bar', wrap('bar-value'));
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: { bar: 'bar-value' } });
  });

  it('can add to nested objects', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });

    const objValue2 = setField(objValue, 'foo.baz', wrap('baz-value'));
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 'bar-value' }
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });
  });

  it('can delete keys', () => {
    const objValue = wrapObject({ foo: 'foo-value', bar: 'bar-value' });

    const objValue2 = deleteField(objValue, 'foo');
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value',
      bar: 'bar-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ bar: 'bar-value' });
  });

  it('can delete nested keys', () => {
    const objValue = wrapObject({
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });

    const objValue2 = deleteField(objValue, 'foo.bar');
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 'bar-value', baz: 'baz-value' }
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: { baz: 'baz-value' } });
  });

  it('can delete added keys', () => {
    let objValue = wrapObject({});

    objValue = objValue
      .toBuilder()
      .set(field('a'), valueOf('a'))
      .delete(field('a'))
      .build();

    expect(objValue.value()).to.deep.equal({});
  });

  it('can delete, resulting in empty object', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });

    const objValue2 = deleteField(objValue, 'foo.bar');
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 'bar-value' }
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: {} });
  });

  it('will not delete nested keys on primitive values', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' }, a: 1 });

    const expected = { foo: { bar: 'bar-value' }, a: 1 };
    const objValue2 = deleteField(objValue, 'foo.baz');
    const objValue3 = deleteField(objValue, 'foo.bar.baz');
    const objValue4 = deleteField(objValue, 'a.b');
    expect(objValue.value()).to.deep.equal(expected);
    expect(objValue2.value()).to.deep.equal(expected);
    expect(objValue3.value()).to.deep.equal(expected);
    expect(objValue4.value()).to.deep.equal(expected);
  });

  it('can delete multiple fields', () => {
    let objValue = wrapObject({ a: 'a', b: 'a', c: 'c' });

    objValue = objValue
      .toBuilder()
      .delete(field('a'))
      .build();
    objValue = objValue
      .toBuilder()
      .delete(field('b'))
      .delete(field('c'))
      .build();

    expect(objValue.value()).to.deep.equal({});
  });

  it('provides field mask', () => {
    const objValue = wrapObject({
      a: 'b',
      map: { a: 1, b: true, c: 'string', nested: { d: 'e' } },
      emptymap: {}
    });
    const expectedMask = mask(
      'a',
      'map.a',
      'map.b',
      'map.c',
      'map.nested.d',
      'emptymap'
    );
    const actualMask = objValue.fieldMask();
    expect(actualMask.isEqual(expectedMask)).to.be.true;
  });

  function setField(
    objectValue: ObjectValue,
    fieldPath: string,
    value: PrimitiveValue
  ): ObjectValue {
    return objectValue
      .toBuilder()
      .set(field(fieldPath), value.proto)
      .build();
  }

  function deleteField(
    objectValue: ObjectValue,
    fieldPath: string
  ): ObjectValue {
    return objectValue
      .toBuilder()
      .delete(field(fieldPath))
      .build();
  }

  // TODO(mrschmidt): Clean up the helpers and merge wrap() with TestUtil.wrap()
  function wrapObject(value: object): ObjectValue {
    return new ObjectValue(valueOf(value));
  }

  function wrap(value: unknown): PrimitiveValue {
    return new PrimitiveValue(valueOf(value));
  }
});
