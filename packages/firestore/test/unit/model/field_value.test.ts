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
import { DatabaseId } from '../../../src/core/database_info';
import { DocumentKey } from '../../../src/model/document_key';
import {
  FieldValue,
  ServerTimestampValue,
  TypeOrder
} from '../../../src/model/field_value';
import {
  ObjectValue,
  PrimitiveValue
} from '../../../src/model/proto_field_value';
import { canonicalId, estimateByteSize } from '../../../src/model/proto_values';
import { ByteString } from '../../../src/util/byte_string';
import { primitiveComparator } from '../../../src/util/misc';
import * as typeUtils from '../../../src/util/types';
import {
  blob,
  dbId,
  expectCorrectComparisonGroups,
  expectEqualitySets,
  field,
  key,
  mask,
  ref
} from '../../util/helpers';
import { refValue, valueOf } from '../../util/values';

for (const useProto3Json of [true, false]) {
  describe(`FieldValue (useProto3Json=${useProto3Json})`, () => {
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
        typeUtils.MIN_SAFE_INTEGER - 1,
        -1.1,
        0.1,
        typeUtils.MAX_SAFE_INTEGER + 1,
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
          expect(isNaN(value.value() as number)).to.equal(
            isNaN(primitiveValue)
          );
        } else {
          expect(Number(value.value())).to.equal(primitiveValue);
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
      let objValue = ObjectValue.empty(useProto3Json);
      objValue = objValue
        .toBuilder()
        .set(field('a'), valueOf('a', useProto3Json))
        .build();
      objValue = objValue
        .toBuilder()
        .set(field('b'), valueOf('b', useProto3Json))
        .set(field('c'), valueOf('c', useProto3Json))
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
        .set(field('a'), valueOf('a', useProto3Json))
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

    it('compares values for equality', () => {
      // Each subarray compares equal to each other and false to every other value
      const values: FieldValue[][] = [
        [
          wrap(true),
          new PrimitiveValue(valueOf(true, useProto3Json), useProto3Json)
        ],
        [
          wrap(false),
          new PrimitiveValue(valueOf(false, useProto3Json), useProto3Json)
        ],
        [
          wrap(null),
          new PrimitiveValue(valueOf(null, useProto3Json), useProto3Json)
        ],
        [
          wrap(0 / 0),
          wrap(Number.NaN),
          new PrimitiveValue(valueOf(NaN, useProto3Json), useProto3Json)
        ],
        // -0.0 and 0.0 order the same but are not considered equal.
        [wrap(-0.0)],
        [wrap(0.0)],
        [wrap(1), new PrimitiveValue({ integerValue: 1 }, useProto3Json)],
        // Doubles and Integers order the same but are not considered equal.
        [new PrimitiveValue({ doubleValue: 1.0 }, useProto3Json)],
        [
          wrap(1.1),
          new PrimitiveValue(valueOf(1.1, useProto3Json), useProto3Json)
        ],
        [
          wrap(blob(0, 1, 2)),
          new PrimitiveValue(
            valueOf(blob(0, 1, 2), useProto3Json),
            useProto3Json
          )
        ],
        [wrap(blob(0, 1))],
        [
          wrap('string'),
          new PrimitiveValue(valueOf('string', useProto3Json), useProto3Json)
        ],
        [wrap('strin')],
        // latin small letter e + combining acute accent
        [wrap('e\u0301b')],
        // latin small letter e with acute accent
        [wrap('\u00e9a')],
        [
          wrap(date1),
          new PrimitiveValue(
            valueOf(Timestamp.fromDate(date1), useProto3Json),
            useProto3Json
          )
        ],
        [wrap(date2)],
        [
          // NOTE: ServerTimestampValues can't be parsed via wrap().
          new ServerTimestampValue(Timestamp.fromDate(date1), null),
          new ServerTimestampValue(Timestamp.fromDate(date1), null)
        ],
        [new ServerTimestampValue(Timestamp.fromDate(date2), null)],
        [
          wrap(new GeoPoint(0, 1)),
          new PrimitiveValue(
            valueOf(new GeoPoint(0, 1), useProto3Json),
            useProto3Json
          )
        ],
        [wrap(new GeoPoint(1, 0))],
        [
          wrap(ref('project', 'coll/doc1')),
          new PrimitiveValue(
            valueOf(ref('project', 'coll/doc1'), useProto3Json),
            useProto3Json
          )
        ],
        [wrap(ref('project', 'coll/doc2'))],
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
        [
          new PrimitiveValue({ integerValue: -1 }, useProto3Json),
          new PrimitiveValue({ doubleValue: -1 }, useProto3Json)
        ],
        [wrap(-Number.MIN_VALUE)],
        // zeros all compare the same.
        [
          new PrimitiveValue({ integerValue: 0 }, useProto3Json),
          new PrimitiveValue({ doubleValue: 0 }, useProto3Json),
          new PrimitiveValue({ doubleValue: -0 }, useProto3Json)
        ],
        [wrap(Number.MIN_VALUE)],
        [
          new PrimitiveValue({ integerValue: 1 }, useProto3Json),
          new PrimitiveValue({ doubleValue: 1 }, useProto3Json)
        ],
        [wrap(1.1)],
        [wrap(typeUtils.MAX_SAFE_INTEGER)],
        [wrap(typeUtils.MAX_SAFE_INTEGER + 1)],
        [wrap(Infinity)],

        // timestamps
        [wrap(date1)],
        [wrap(date2)],

        // server timestamps come after all concrete timestamps.
        [new ServerTimestampValue(Timestamp.fromDate(date1), null)],
        [new ServerTimestampValue(Timestamp.fromDate(date2), null)],

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
        [wrapRef(dbId('p1', 'd1'), key('c1/doc1'))],
        [wrapRef(dbId('p1', 'd1'), key('c1/doc2'))],
        [wrapRef(dbId('p1', 'd1'), key('c10/doc1'))],
        [wrapRef(dbId('p1', 'd1'), key('c2/doc1'))],
        [wrapRef(dbId('p1', 'd2'), key('c1/doc1'))],
        [wrapRef(dbId('p2', 'd1'), key('c1/doc1'))],

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
        (left: FieldValue, right: FieldValue) => {
          return left.compareTo(right);
        }
      );
    });

    it('estimates size correctly for fixed sized values', () => {
      // This test verifies that each member of a group takes up the same amount
      // of space in memory (based on its estimated in-memory size).
      const equalityGroups = [
        {
          expectedByteSize: 4,
          elements: [wrap(null), wrap(false), wrap(true)]
        },
        {
          expectedByteSize: 4,
          elements: [wrap(blob(0, 1)), wrap(blob(128, 129))]
        },
        {
          expectedByteSize: 8,
          elements: [wrap(NaN), wrap(Infinity), wrap(1), wrap(1.1)]
        },
        {
          expectedByteSize: 16,
          elements: [wrap(new GeoPoint(0, 0)), wrap(new GeoPoint(0, 0))]
        },
        {
          expectedByteSize: 16,
          elements: [wrap(Timestamp.fromMillis(100)), wrap(Timestamp.now())]
        },
        // TODO(mrschmidt): Support server timestamps
        // {
        //   expectedByteSize: 16,
        //   elements: [
        //     new ServerTimestampValue(Timestamp.fromMillis(100), null),
        //     new ServerTimestampValue(Timestamp.now(), null)
        //   ]
        // },
        // {
        //   expectedByteSize: 20,
        //   elements: [
        //     new ServerTimestampValue(Timestamp.fromMillis(100), wrap(true)),
        //     new ServerTimestampValue(Timestamp.now(), wrap(false))
        //   ]
        // },
        {
          expectedByteSize: 42,
          elements: [
            wrapRef(dbId('p1', 'd1'), key('c1/doc1')),
            wrapRef(dbId('p2', 'd2'), key('c2/doc2'))
          ]
        },
        { expectedByteSize: 6, elements: [wrap('foo'), wrap('bar')] },
        { expectedByteSize: 4, elements: [wrap(['a', 'b']), wrap(['c', 'd'])] },
        {
          expectedByteSize: 6,
          elements: [wrap({ a: 'a', b: 'b' }), wrap({ c: 'c', d: 'd' })]
        }
      ];

      for (const group of equalityGroups) {
        for (const element of group.elements) {
          expect(estimateByteSize(element.proto)).to.equal(
            group.expectedByteSize
          );
        }
      }
    });

    it('estimates size correctly for relatively sized values', () => {
      // This test verifies for each group that the estimated size increases
      // as the size of the underlying data grows.
      const relativeGroups: FieldValue[][] = [
        [wrap(blob(0)), wrap(blob(0, 1))],
        [
          new ServerTimestampValue(Timestamp.fromMillis(100), null),
          new ServerTimestampValue(Timestamp.now(), wrap(null))
        ],
        [
          wrapRef(dbId('p1', 'd1'), key('c1/doc1')),
          wrapRef(dbId('p1', 'd1'), key('c1/doc1/c2/doc2'))
        ],
        [wrap('foo'), wrap('foobar')],
        [wrap(['a', 'b']), wrap(['a', 'bc'])],
        [wrap(['a', 'b']), wrap(['a', 'b', 'c'])],
        [wrap({ a: 'a', b: 'b' }), wrap({ a: 'a', b: 'bc' })],
        [wrap({ a: 'a', b: 'b' }), wrap({ a: 'a', bc: 'b' })],
        [wrap({ a: 'a', b: 'b' }), wrap({ a: 'a', b: 'b', c: 'c' })]
      ];

      for (const group of relativeGroups) {
        const expectedOrder = group;
        const actualOrder = group
          .slice()
          .sort((l, r) =>
            primitiveComparator(
              l.approximateByteSize(),
              r.approximateByteSize()
            )
          );
        expect(expectedOrder).to.deep.equal(actualOrder);
      }
    });

    it('canonicalizes values', () => {
      expect(canonicalId(wrap(null).proto)).to.equal('null');
      expect(canonicalId(wrap(true).proto)).to.equal('true');
      expect(canonicalId(wrap(false).proto)).to.equal('false');
      expect(canonicalId(wrap(1).proto)).to.equal('1');
      expect(canonicalId(wrap(1.1).proto)).to.equal('1.1');
      expect(canonicalId(wrap(new Timestamp(30, 60)).proto)).to.equal(
        'time(30,60)'
      );
      expect(canonicalId(wrap('a').proto)).to.equal('a');
      expect(canonicalId(wrap(blob(1, 2, 3)).proto)).to.equal('AQID');
      expect(
        canonicalId(wrapRef(dbId('p1', 'd1'), key('c1/doc1')).proto)
      ).to.equal('projects/p1/databases/d1/documents/c1/doc1');
      expect(canonicalId(wrap(new GeoPoint(30, 60)).proto)).to.equal(
        'geo(30,60)'
      );
      expect(canonicalId(wrap([1, 2, 3]).proto)).to.equal('[1,2,3]');
      expect(
        canonicalId(
          wrap({
            'a': 1,
            'b': 2,
            'c': '3'
          }).proto
        )
      ).to.equal('{a:1,b:2,c:3}');
      expect(
        canonicalId(wrap({ 'a': ['b', { 'c': new GeoPoint(30, 60) }] }).proto)
      ).to.equal('{a:[b,{c:geo(30,60)}]}');
    });

    it('canonical IDs ignore sort order', () => {
      expect(
        canonicalId(
          wrap({
            'a': 1,
            'b': 2,
            'c': '3'
          }).proto
        )
      ).to.equal('{a:1,b:2,c:3}');
      expect(
        canonicalId(
          wrap({
            'c': 3,
            'b': 2,
            'a': '1'
          }).proto
        )
      ).to.equal('{a:1,b:2,c:3}');
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
      return new ObjectValue(valueOf(value, useProto3Json), useProto3Json);
    }

    function wrap(value: unknown): PrimitiveValue {
      return new PrimitiveValue(valueOf(value, useProto3Json), useProto3Json);
    }

    function wrapRef(
      databaseId: DatabaseId,
      documentKey: DocumentKey
    ): PrimitiveValue {
      return new PrimitiveValue(
        refValue(databaseId, documentKey),
        useProto3Json
      );
    }
  });
}

describe('FieldValue', function() {
  it('normalizes values for comparison', () => {
    const groups = [
      [
        new PrimitiveValue({ doubleValue: 'NaN' }, /* useProto3Json= */ true),
        new PrimitiveValue({ doubleValue: NaN }, /* useProto3Json= */ false)
      ],
      [
        new PrimitiveValue({ integerValue: '1' }, /* useProto3Json= */ true),
        new PrimitiveValue({ integerValue: 1 }, /* useProto3Json= */ true)
      ],
      [
        new PrimitiveValue({ doubleValue: '2' }, /* useProto3Json= */ true),
        new PrimitiveValue({ doubleValue: 2 }, /* useProto3Json= */ false)
      ],
      [
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:01Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          { timestampValue: { seconds: 1175783401 } },
          /* useProto3Json= */ false
        )
      ],
      [
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:01.999Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          {
            timestampValue: { seconds: 1175783401, nanos: 999000000 }
          },
          /* useProto3Json= */ false
        )
      ],
      [
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:02Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          { timestampValue: { seconds: 1175783402 } },
          /* useProto3Json= */ false
        )
      ],
      [
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:02.100Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          {
            timestampValue: { seconds: 1175783402, nanos: 100000000 }
          },
          /* useProto3Json= */ false
        )
      ],
      [
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:02.100001Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          {
            timestampValue: { seconds: 1175783402, nanos: 100001000 }
          },
          /* useProto3Json= */ false
        )
      ],
      [
        new PrimitiveValue(
          { bytesValue: new Uint8Array([0, 1, 2]) },
          /* useProto3Json= */ false
        ),
        new PrimitiveValue({ bytesValue: 'AAEC' }, /* useProto3Json= */ true)
      ],
      [
        new PrimitiveValue(
          { bytesValue: new Uint8Array([0, 1, 3]) },
          /* useProto3Json= */ false
        ),
        new PrimitiveValue({ bytesValue: 'AAED' }, /* useProto3Json= */ true)
      ]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: FieldValue, right: FieldValue) => {
        return left.compareTo(right);
      }
    );
  });

  it('normalizes values for equality', () => {
    // Each subarray compares equal to each other and false to every other value
    const values: FieldValue[][] = [
      [
        new PrimitiveValue({ integerValue: '1' }, /* useProto3Json= */ true),
        new PrimitiveValue({ integerValue: 1 }, /* useProto3Json= */ false)
      ],
      [
        new PrimitiveValue({ doubleValue: '1.0' }, /* useProto3Json= */ true),
        new PrimitiveValue({ doubleValue: 1.0 }, /* useProto3Json= */ false)
      ],
      [
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:01Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:01.000Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:01.000000Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          {
            timestampValue: '2007-04-05T14:30:01.000000000Z'
          },
          /* useProto3Json= */ false
        ),
        new PrimitiveValue(
          { timestampValue: { seconds: 1175783401 } },
          /* useProto3Json= */ false
        ),
        new PrimitiveValue(
          { timestampValue: { seconds: '1175783401' } },
          /* useProto3Json= */ false
        ),
        new PrimitiveValue(
          {
            timestampValue: { seconds: 1175783401, nanos: 0 }
          },
          /* useProto3Json= */ false
        )
      ],
      [
        new PrimitiveValue(
          { timestampValue: '2007-04-05T14:30:01.100Z' },
          /* useProto3Json= */ true
        ),
        new PrimitiveValue(
          {
            timestampValue: { seconds: 1175783401, nanos: 100000000 }
          },
          /* useProto3Json= */ false
        )
      ],
      [
        new PrimitiveValue(
          { bytesValue: new Uint8Array([0, 1, 2]) },
          /* useProto3Json= */ false
        ),
        new PrimitiveValue({ bytesValue: 'AAEC' }, /* useProto3Json= */ true)
      ]
    ];
    expectEqualitySets(values, (v1, v2) => v1.isEqual(v2));
  });
});
