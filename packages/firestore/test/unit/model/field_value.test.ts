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
import * as fieldValue from '../../../src/model/field_value';
import * as typeUtils from '../../../src/util/types';
import {
  blob,
  dbId,
  expectCorrectComparisonGroups,
  expectEqualitySets,
  field,
  key,
  mask,
  ref,
  wrap,
  wrapObject
} from '../../util/helpers';

describe('FieldValue', () => {
  const date1 = new Date(2016, 4, 2, 1, 5);
  const date2 = new Date(2016, 5, 20, 10, 20, 30);

  it('can parse integers', () => {
    const primitiveValues = [
      typeUtils.MIN_SAFE_INTEGER,
      -1,
      0,
      1,
      2,
      typeUtils.MAX_SAFE_INTEGER
    ];
    const values = primitiveValues.map(v => wrap(v));

    values.forEach(v => {
      expect(v).to.be.an.instanceof(fieldValue.IntegerValue);
    });

    for (let i = 0; i < primitiveValues.length; i++) {
      const primitiveValue = primitiveValues[i];
      const value = values[i];
      expect(value.value()).to.equal(primitiveValue);
    }
  });

  it('can parse doubles', () => {
    const primitiveValues = [
      typeUtils.MIN_SAFE_INTEGER - 1,
      -1.1,
      0.1,
      typeUtils.MAX_SAFE_INTEGER + 1,
      NaN,
      Infinity,
      -Infinity
    ];
    const values = primitiveValues.map(v =>
      wrap(v)
    ) as fieldValue.NumberValue[];

    values.forEach(v => {
      expect(v).to.be.an.instanceof(fieldValue.DoubleValue);
    });

    for (let i = 0; i < primitiveValues.length; i++) {
      const primitiveValue = primitiveValues[i];
      const value = values[i];
      if (isNaN(primitiveValue)) {
        expect(isNaN(value.value())).to.equal(isNaN(primitiveValue));
      } else {
        expect(value.value()).to.equal(primitiveValue);
      }
    }
  });

  it('can parse null', () => {
    const nullValue = wrap(null);

    expect(nullValue).to.be.an.instanceof(fieldValue.NullValue);
    expect(nullValue.value()).to.equal(null);

    // check for identity for interning
    expect(nullValue).to.equal(wrap(null));
  });

  it('can parse booleans', () => {
    const trueValue = wrap(true);
    const falseValue = wrap(false);

    expect(trueValue).to.be.an.instanceof(fieldValue.BooleanValue);
    expect(falseValue).to.be.an.instanceof(fieldValue.BooleanValue);

    expect(trueValue.value()).to.equal(true);
    expect(falseValue.value()).to.equal(false);

    // check for identity for interning
    expect(trueValue).to.equal(wrap(true));
    expect(falseValue).to.equal(wrap(false));
  });

  it('can parse dates', () => {
    const dateValue1 = wrap(date1);
    const dateValue2 = wrap(date2);

    expect(dateValue1).to.be.an.instanceof(fieldValue.TimestampValue);
    expect(dateValue2).to.be.an.instanceof(fieldValue.TimestampValue);

    expect(dateValue1.value()).to.deep.equal(Timestamp.fromDate(date1));
    expect(dateValue2.value()).to.deep.equal(Timestamp.fromDate(date2));
  });

  it('can parse geo points', () => {
    const latLong1 = new GeoPoint(1.23, 4.56);
    const latLong2 = new GeoPoint(-20, 100);
    const value1 = wrap(latLong1) as fieldValue.GeoPointValue;
    const value2 = wrap(latLong2) as fieldValue.GeoPointValue;

    expect(value1).to.be.an.instanceof(fieldValue.GeoPointValue);
    expect(value2).to.be.an.instanceof(fieldValue.GeoPointValue);

    expect(value1.value().latitude).to.equal(1.23);
    expect(value1.value().longitude).to.equal(4.56);
    expect(value2.value().latitude).to.equal(-20);
    expect(value2.value().longitude).to.equal(100);
  });

  it('can parse bytes', () => {
    const bytesValue = wrap(blob(0, 1, 2)) as fieldValue.BlobValue;

    expect(bytesValue).to.be.an.instanceof(fieldValue.BlobValue);
    expect(bytesValue.value().toUint8Array()).to.deep.equal(
      new Uint8Array([0, 1, 2])
    );
  });

  it('can parse simple objects', () => {
    const objValue = wrap({ a: 'foo', b: 1, c: true, d: null });

    expect(objValue).to.be.an.instanceof(fieldValue.ObjectValue);
    expect(objValue.value()).to.deep.equal({
      a: 'foo',
      b: 1,
      c: true,
      d: null
    });
  });

  it('can parse nested objects', () => {
    const objValue = wrap({ foo: { bar: 1, baz: [1, 2, { a: 'b' }] } });

    expect(objValue).to.be.an.instanceof(fieldValue.ObjectValue);
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 1, baz: [1, 2, { a: 'b' }] }
    });
  });

  it('can parse empty objects', () => {
    const objValue = wrap({ foo: {} });

    expect(objValue).to.be.an.instanceof(fieldValue.ObjectValue);
    expect(objValue.value()).to.deep.equal({ foo: {} });
  });

  it('can extract fields', () => {
    const objValue = wrapObject({ foo: { a: 1, b: true, c: 'string' } });

    expect(objValue).to.be.an.instanceof(fieldValue.ObjectValue);

    expect(objValue.field(field('foo'))).to.be.an.instanceof(
      fieldValue.ObjectValue
    );
    expect(objValue.field(field('foo.a'))).to.be.an.instanceof(
      fieldValue.IntegerValue
    );
    expect(objValue.field(field('foo.b'))).to.be.an.instanceof(
      fieldValue.BooleanValue
    );
    expect(objValue.field(field('foo.c'))).to.be.an.instanceof(
      fieldValue.StringValue
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

    const objValue2 = objValue.set(field('foo'), wrap('new-foo-value'));
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: 'new-foo-value' });
  });

  it('can add new fields', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = objValue.set(field('bar'), wrap('bar-value'));
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({
      foo: 'foo-value',
      bar: 'bar-value'
    });
  });

  it('can implicitly create objects', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = objValue.set(field('a.b'), wrap('b-value'));
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

    const objValue2 = objValue.set(field('foo.bar'), wrap('bar-value'));
    expect(objValue.value()).to.deep.equal({
      foo: 'foo-value'
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: { bar: 'bar-value' } });
  });

  it('can add to nested objects', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });

    const objValue2 = objValue.set(field('foo.baz'), wrap('baz-value'));
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 'bar-value' }
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });
  });

  it('can delete keys', () => {
    const objValue = wrapObject({ foo: 'foo-value', bar: 'bar-value' });

    const objValue2 = objValue.delete(field('foo'));
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

    const objValue2 = objValue.delete(field('foo.bar'));
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 'bar-value', baz: 'baz-value' }
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: { baz: 'baz-value' } });
  });

  it('can delete, resulting in empty object', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });

    const objValue2 = objValue.delete(field('foo.bar'));
    expect(objValue.value()).to.deep.equal({
      foo: { bar: 'bar-value' }
    }); // unmodified original
    expect(objValue2.value()).to.deep.equal({ foo: {} });
  });

  it('will not delete nested keys on primitive values', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' }, a: 1 });

    const expected = { foo: { bar: 'bar-value' }, a: 1 };
    const objValue2 = objValue.delete(field('foo.baz'));
    const objValue3 = objValue.delete(field('foo.bar.baz'));
    const objValue4 = objValue.delete(field('a.b'));
    expect(objValue.value()).to.deep.equal(expected);
    expect(objValue2.value()).to.deep.equal(expected);
    expect(objValue3.value()).to.deep.equal(expected);
    expect(objValue4.value()).to.deep.equal(expected);
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

  it('compares values for equality', () => {
    // Each subarray compares equal to each other and false to every other value
    const values = [
      [wrap(true), fieldValue.BooleanValue.TRUE],
      [wrap(false), fieldValue.BooleanValue.FALSE],
      [wrap(null), fieldValue.NullValue.INSTANCE],
      [wrap(0 / 0), wrap(Number.NaN), fieldValue.DoubleValue.NAN],
      // -0.0 and 0.0 order the same but are not considered equal.
      [wrap(-0.0)],
      [wrap(0.0)],
      [wrap(1), new fieldValue.IntegerValue(1)],
      // Doubles and Integers order the same but are not considered equal.
      [new fieldValue.DoubleValue(1)],
      [wrap(1.1), new fieldValue.DoubleValue(1.1)],
      [wrap(blob(0, 1, 2)), new fieldValue.BlobValue(blob(0, 1, 2))],
      [new fieldValue.BlobValue(blob(0, 1))],
      [wrap('string'), new fieldValue.StringValue('string')],
      [new fieldValue.StringValue('strin')],
      // latin small letter e + combining acute accent
      [new fieldValue.StringValue('e\u0301b')],
      // latin small letter e with acute accent
      [new fieldValue.StringValue('\u00e9a')],
      [wrap(date1), new fieldValue.TimestampValue(Timestamp.fromDate(date1))],
      [new fieldValue.TimestampValue(Timestamp.fromDate(date2))],
      [
        // NOTE: ServerTimestampValues can't be parsed via wrap().
        new fieldValue.ServerTimestampValue(Timestamp.fromDate(date1), null),
        new fieldValue.ServerTimestampValue(Timestamp.fromDate(date1), null)
      ],
      [new fieldValue.ServerTimestampValue(Timestamp.fromDate(date2), null)],
      [
        wrap(new GeoPoint(0, 1)),
        new fieldValue.GeoPointValue(new GeoPoint(0, 1))
      ],
      [new fieldValue.GeoPointValue(new GeoPoint(1, 0))],
      [
        new fieldValue.RefValue(dbId('project'), key('coll/doc1')),
        wrap(ref('project', 'coll/doc1'))
      ],
      [new fieldValue.RefValue(dbId('project'), key('coll/doc2'))],
      [wrap(['foo', 'bar']), wrap(['foo', 'bar'])],
      [wrap(['foo', 'bar', 'baz'])],
      [wrap(['foo'])],
      [wrap({ bar: 1, foo: 2 }), wrap({ foo: 2, bar: 1 })],
      [wrap({ bar: 2, foo: 1 })],
      [wrap({ bar: 1, foo: 1 })],
      [wrap({ foo: 1 })]
    ];
    expectEqualitySets(values, (v1, v2) => v1.isEqual(v2));
  });

  it('orders types correctly', () => {
    const groups = [
      // null first
      [wrap(null)],

      // booleans
      [wrap(false)],
      [wrap(true)],

      // numbers
      [wrap(NaN)],
      [wrap(-Infinity)],
      [wrap(-Number.MAX_VALUE)],
      [wrap(typeUtils.MIN_SAFE_INTEGER - 1)],
      [wrap(typeUtils.MIN_SAFE_INTEGER)],
      [wrap(-1.1)],
      // Integers and Doubles order the same.
      [new fieldValue.IntegerValue(-1), new fieldValue.DoubleValue(-1)],
      [wrap(-Number.MIN_VALUE)],
      // zeros all compare the same.
      [
        new fieldValue.IntegerValue(0),
        new fieldValue.DoubleValue(0),
        new fieldValue.DoubleValue(-0)
      ],
      [wrap(Number.MIN_VALUE)],
      [new fieldValue.IntegerValue(1), new fieldValue.DoubleValue(1)],
      [wrap(1.1)],
      [wrap(typeUtils.MAX_SAFE_INTEGER)],
      [wrap(typeUtils.MAX_SAFE_INTEGER + 1)],
      [wrap(Infinity)],

      // timestamps
      [wrap(date1)],
      [wrap(date2)],

      // server timestamps come after all concrete timestamps.
      [new fieldValue.ServerTimestampValue(Timestamp.fromDate(date1), null)],
      [new fieldValue.ServerTimestampValue(Timestamp.fromDate(date2), null)],

      // strings
      [wrap('')],
      [wrap('\u0000\ud7ff\ue000\uffff')],
      [wrap('(╯°□°）╯︵ ┻━┻')],
      [wrap('a')],
      [wrap('abc def')],
      // latin small letter e + combining acute accent + latin small letter b
      [wrap('e\u0301b')],
      [wrap('æ')],
      // latin small letter e with acute accent + latin small letter a
      [wrap('\u00e9a')],

      // blobs
      [wrap(blob())],
      [wrap(blob(0))],
      [wrap(blob(0, 1, 2, 3, 4))],
      [wrap(blob(0, 1, 2, 4, 3))],
      [wrap(blob(255))],

      // reference values
      [new fieldValue.RefValue(dbId('p1', 'd1'), key('c1/doc1'))],
      [new fieldValue.RefValue(dbId('p1', 'd1'), key('c1/doc2'))],
      [new fieldValue.RefValue(dbId('p1', 'd1'), key('c10/doc1'))],
      [new fieldValue.RefValue(dbId('p1', 'd1'), key('c2/doc1'))],
      [new fieldValue.RefValue(dbId('p1', 'd2'), key('c1/doc1'))],
      [new fieldValue.RefValue(dbId('p2', 'd1'), key('c1/doc1'))],

      // geo points
      [wrap(new GeoPoint(-90, -180))],
      [wrap(new GeoPoint(-90, 0))],
      [wrap(new GeoPoint(-90, 180))],
      [wrap(new GeoPoint(0, -180))],
      [wrap(new GeoPoint(0, 0))],
      [wrap(new GeoPoint(0, 180))],
      [wrap(new GeoPoint(1, -180))],
      [wrap(new GeoPoint(1, 0))],
      [wrap(new GeoPoint(1, 180))],
      [wrap(new GeoPoint(90, -180))],
      [wrap(new GeoPoint(90, 0))],
      [wrap(new GeoPoint(90, 180))],

      // arrays
      [wrap([])],
      [wrap(['bar'])],
      [wrap(['foo'])],
      [wrap(['foo', 1])],
      [wrap(['foo', 2])],
      [wrap(['foo', '0'])],

      // objects
      [wrap({ bar: 0 })],
      [wrap({ bar: 0, foo: 1 })],
      [wrap({ foo: 1 })],
      [wrap({ foo: 2 })],
      [wrap({ foo: '0' })]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: fieldValue.FieldValue, right: fieldValue.FieldValue) => {
        return left.compareTo(right);
      }
    );
  });
});
