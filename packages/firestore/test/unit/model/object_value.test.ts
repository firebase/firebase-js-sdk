/**
 * @license
 * Copyright 2017 Google LLC
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

import {
  BsonObjectId,
  BsonBinaryData,
  BsonTimestamp,
  RegexValue,
  Int32Value,
  MaxKey,
  MinKey
} from '../../../src';
import { vector } from '../../../src/lite-api/field_value_impl';
import { extractFieldMask, ObjectValue } from '../../../src/model/object_value';
import { TypeOrder } from '../../../src/model/type_order';
import { typeOrder } from '../../../src/model/values';
import { field, mask, wrap, wrapObject } from '../../util/helpers';

describe('ObjectValue', () => {
  it('can extract fields', () => {
    const objValue = wrapObject({
      foo: { a: 1, b: true, c: 'string' },
      embedding: vector([1]),
      bson: {
        objectId: new BsonObjectId('foo'),
        binary: new BsonBinaryData(1, new Uint8Array([1, 2, 3])),
        timestamp: new BsonTimestamp(1, 2),
        min: MinKey.instance(),
        max: MaxKey.instance(),
        regex: new RegexValue('a', 'b'),
        int32: new Int32Value(1)
      }
    });

    expect(typeOrder(objValue.field(field('foo'))!)).to.equal(
      TypeOrder.ObjectValue
    );
    expect(typeOrder(objValue.field(field('foo.a'))!)).to.equal(
      TypeOrder.NumberValue
    );
    expect(typeOrder(objValue.field(field('foo.b'))!)).to.equal(
      TypeOrder.BooleanValue
    );
    expect(typeOrder(objValue.field(field('foo.c'))!)).to.equal(
      TypeOrder.StringValue
    );
    expect(typeOrder(objValue.field(field('embedding'))!)).to.equal(
      TypeOrder.VectorValue
    );
    expect(typeOrder(objValue.field(field('bson.objectId'))!)).to.equal(
      TypeOrder.BsonObjectIdValue
    );
    expect(typeOrder(objValue.field(field('bson.binary'))!)).to.equal(
      TypeOrder.BsonBinaryValue
    );
    expect(typeOrder(objValue.field(field('bson.timestamp'))!)).to.equal(
      TypeOrder.BsonTimestampValue
    );
    expect(typeOrder(objValue.field(field('bson.min'))!)).to.equal(
      TypeOrder.MinKeyValue
    );
    expect(typeOrder(objValue.field(field('bson.max'))!)).to.equal(
      TypeOrder.MaxKeyValue
    );
    expect(typeOrder(objValue.field(field('bson.regex'))!)).to.equal(
      TypeOrder.RegexValue
    );
    expect(typeOrder(objValue.field(field('bson.int32'))!)).to.equal(
      TypeOrder.NumberValue
    );

    expect(objValue.field(field('foo.a.b'))).to.be.null;
    expect(objValue.field(field('bar'))).to.be.null;
    expect(objValue.field(field('bar.a'))).to.be.null;

    expect(objValue.field(field('foo'))!).to.deep.equal(
      wrap({
        a: 1,
        b: true,
        c: 'string'
      })
    );
    expect(objValue.field(field('foo.a'))).to.deep.equal(wrap(1));
    expect(objValue.field(field('foo.b'))).to.deep.equal(wrap(true));
    expect(objValue.field(field('foo.c'))).to.deep.equal(wrap('string'));

    expect(objValue.field(field('bson'))!).to.deep.equal(
      wrap({
        objectId: new BsonObjectId('foo'),
        binary: new BsonBinaryData(1, new Uint8Array([1, 2, 3])),
        timestamp: new BsonTimestamp(1, 2),
        min: MinKey.instance(),
        max: MaxKey.instance(),
        regex: new RegexValue('a', 'b'),
        int32: new Int32Value(1)
      })
    );
    expect(objValue.field(field('bson.objectId'))!).to.deep.equal(
      wrap(new BsonObjectId('foo'))
    );
    expect(objValue.field(field('bson.binary'))!).to.deep.equal(
      wrap(new BsonBinaryData(1, new Uint8Array([1, 2, 3])))
    );
    expect(objValue.field(field('bson.timestamp'))!).to.deep.equal(
      wrap(new BsonTimestamp(1, 2))
    );
    expect(objValue.field(field('bson.min'))!).to.deep.equal(
      wrap(MinKey.instance())
    );
    expect(objValue.field(field('bson.max'))!).to.deep.equal(
      wrap(MaxKey.instance())
    );
    expect(objValue.field(field('bson.regex'))!).to.deep.equal(
      wrap(new RegexValue('a', 'b'))
    );
    expect(objValue.field(field('bson.int32'))!).to.deep.equal(
      wrap(new Int32Value(1))
    );
  });

  it('can overwrite existing fields', () => {
    const objValue = wrapObject({ foo: 'foo-value' });
    objValue.set(field('foo'), wrap('new-foo-value'));

    assertObjectEquals(objValue, {
      foo: 'new-foo-value'
    });
  });

  it('can add new fields', () => {
    const objValue = wrapObject({ foo: 'foo-value' });
    objValue.set(field('bar'), wrap('bar-value'));

    assertObjectEquals(objValue, {
      foo: 'foo-value',
      bar: 'bar-value'
    });
  });

  it('can add multiple new fields', () => {
    const objValue = ObjectValue.empty();
    objValue.set(field('a'), wrap('a'));
    objValue.set(field('b'), wrap('b'));
    objValue.set(field('c'), wrap('c'));

    assertObjectEquals(objValue, { a: 'a', b: 'b', c: 'c' });
  });

  it('can implicitly create objects', () => {
    const objValue = wrapObject({ foo: 'foo-value' });
    objValue.set(field('a.b'), wrap('b-value'));

    assertObjectEquals(objValue, {
      foo: 'foo-value',
      a: { b: 'b-value' }
    });
  });

  it('can overwrite primitive values to create objects', () => {
    const objValue = wrapObject({ foo: 'foo-value' });
    objValue.set(field('foo.bar'), wrap('bar-value'));

    assertObjectEquals(objValue, { foo: { bar: 'bar-value' } });
  });

  it('can add to nested objects', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });
    objValue.set(field('foo.baz'), wrap('baz-value'));

    assertObjectEquals(objValue, {
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });
  });

  it('can delete keys', () => {
    const objValue = wrapObject({ foo: 'foo-value', bar: 'bar-value' });
    objValue.delete(field('foo'));

    assertObjectEquals(objValue, { bar: 'bar-value' });
  });

  it('can delete nested keys', () => {
    const objValue = wrapObject({
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });

    objValue.delete(field('foo.bar'));
    assertObjectEquals(objValue, { foo: { baz: 'baz-value' } });
  });

  it('can delete added keys', () => {
    const objValue = wrapObject({});
    objValue.set(field('a'), wrap('a'));
    objValue.delete(field('a'));
    assertObjectEquals(objValue, {});
  });

  it('can delete, resulting in empty object', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });
    objValue.delete(field('foo.bar'));
    assertObjectEquals(objValue, { foo: {} });
  });

  it('will not delete nested keys on primitive values', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' }, a: 1 });
    objValue.delete(field('foo.baz'));
    objValue.delete(field('foo.bar.baz'));
    objValue.delete(field('a.b'));

    const expected = { foo: { bar: 'bar-value' }, a: 1 };
    assertObjectEquals(objValue, expected);
  });

  it('can delete multiple fields', () => {
    const objValue = wrapObject({ a: 'a', b: 'a', c: 'c' });

    objValue.delete(field('a'));
    objValue.delete(field('b'));
    objValue.delete(field('c'));

    assertObjectEquals(objValue, {});
  });

  it('can handle bson types in ObjectValue', () => {
    const objValue = ObjectValue.empty();
    // Add new fields
    objValue.set(field('objectId'), wrap(new BsonObjectId('foo-value')));
    objValue.set(
      field('binary'),
      wrap(new BsonBinaryData(1, new Uint8Array([1, 2, 3])))
    );
    objValue.set(field('timestamp'), wrap(new BsonTimestamp(1, 2)));
    objValue.set(field('regex'), wrap(new RegexValue('a', 'b')));
    objValue.set(field('int32'), wrap(new Int32Value(1)));
    objValue.set(field('min'), wrap(MinKey.instance()));
    objValue.set(field('max'), wrap(MaxKey.instance()));

    assertObjectEquals(objValue, {
      objectId: new BsonObjectId('foo-value'),
      binary: new BsonBinaryData(1, new Uint8Array([1, 2, 3])),
      timestamp: new BsonTimestamp(1, 2),
      regex: new RegexValue('a', 'b'),
      int32: new Int32Value(1),
      min: MinKey.instance(),
      max: MaxKey.instance()
    });

    // Overwrite existing fields
    objValue.set(field('objectId'), wrap(new BsonObjectId('new-foo-value')));

    // Create nested objects
    objValue.set(
      field('foo.binary'),
      wrap(new BsonBinaryData(2, new Uint8Array([1, 2, 3])))
    );
    objValue.set(field('foo.timestamp'), wrap(new BsonTimestamp(1, 2)));

    // Delete fields
    objValue.delete(field('binary'));

    // overwrite nested objects
    objValue.set(field('foo.timestamp'), wrap(new BsonTimestamp(2, 1)));

    // Overwrite primitive values to create objects
    objValue.set(field('min'), wrap(null));

    assertObjectEquals(objValue, {
      objectId: new BsonObjectId('new-foo-value'),
      timestamp: new BsonTimestamp(1, 2),
      regex: new RegexValue('a', 'b'),
      int32: new Int32Value(1),
      min: null,
      max: MaxKey.instance(),
      foo: {
        binary: new BsonBinaryData(2, new Uint8Array([1, 2, 3])),
        timestamp: new BsonTimestamp(2, 1)
      }
    });
  });

  it('provides field mask', () => {
    const objValue = wrapObject({
      a: 'b',
      map: { a: 1, b: true, c: 'string', nested: { d: 'e' } },
      emptymap: {},
      bar: {
        objectId: new BsonObjectId('foo'),
        binary: new BsonBinaryData(1, new Uint8Array([1, 2, 3])),
        timestamp: new BsonTimestamp(1, 2),
        min: MinKey.instance(),
        max: MaxKey.instance(),
        regex: new RegexValue('a', 'b'),
        int32: new Int32Value(1)
      }
    });
    const expectedMask = mask(
      'a',
      'map.a',
      'map.b',
      'map.c',
      'map.nested.d',
      'emptymap',
      'bar.objectId',
      'bar.binary',
      'bar.timestamp',
      'bar.min',
      'bar.max',
      'bar.regex',
      'bar.int32'
    );
    const actualMask = extractFieldMask(objValue.value.mapValue);
    expect(actualMask.isEqual(expectedMask)).to.be.true;
  });

  function assertObjectEquals(
    objValue: ObjectValue,
    data: { [k: string]: unknown }
  ): void {
    expect(objValue.isEqual(wrapObject(data))).to.be.true;
  }
});
