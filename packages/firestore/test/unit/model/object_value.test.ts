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

import { vector } from '../../../src/lite-api/field_value_impl';
import { extractFieldMask, ObjectValue } from '../../../src/model/object_value';
import { TypeOrder } from '../../../src/model/type_order';
import { typeOrder } from '../../../src/model/values';
import { field, mask, wrap, wrapObject } from '../../util/helpers';

describe('ObjectValue', () => {
  it('can extract fields', () => {
    const objValue = wrapObject({
      foo: { a: 1, b: true, c: 'string' },
      embedding: vector([1])
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
  });

  it('can overwrite existing fields', () => {
    const objValue = wrapObject({ foo: 'foo-value' });
    objValue.set(field('foo'), wrap('new-foo-value'));

    assertObjectEquals(objValue, { foo: 'new-foo-value' });
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
    const actualMask = extractFieldMask(objValue.value.mapValue);
    expect(actualMask.isEqual(expectedMask)).to.be.true;
  });

  function assertObjectEquals(
    objValue: ObjectValue,
    data: { [k: string]: unknown }
  ): void {
    expect(objValue.isEqual(wrapObject(data)));
  }
});
