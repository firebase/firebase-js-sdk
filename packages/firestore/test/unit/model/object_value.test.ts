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

import * as api from '../../../src/protos/firestore_proto_api';

import { expect } from 'chai';
import {
  extractFieldMask,
  ObjectValue,
  ObjectValueBuilder,
  TypeOrder
} from '../../../src/model/object_value';
import { typeOrder } from '../../../src/model/values';
import { field, mask, wrap, wrapObject } from '../../util/helpers';

describe('ObjectValue', () => {
  it('can extract fields', () => {
    const objValue = wrapObject({ foo: { a: 1, b: true, c: 'string' } });

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

    const objValue2 = setField(objValue, 'foo', wrap('new-foo-value'));
    assertObjectEquals(objValue, {
      foo: 'foo-value'
    }); // unmodified original
    assertObjectEquals(objValue2, { foo: 'new-foo-value' });
  });

  it('can add new fields', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = setField(objValue, 'bar', wrap('bar-value'));
    assertObjectEquals(objValue, {
      foo: 'foo-value'
    }); // unmodified original
    assertObjectEquals(objValue2, {
      foo: 'foo-value',
      bar: 'bar-value'
    });
  });

  it('can add multiple new fields', () => {
    let objValue = ObjectValue.empty();
    objValue = new ObjectValueBuilder(objValue)
      .set(field('a'), wrap('a'))
      .build();
    objValue = new ObjectValueBuilder(objValue)
      .set(field('b'), wrap('b'))
      .set(field('c'), wrap('c'))
      .build();

    assertObjectEquals(objValue, { a: 'a', b: 'b', c: 'c' });
  });

  it('can implicitly create objects', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = setField(objValue, 'a.b', wrap('b-value'));
    assertObjectEquals(objValue, {
      foo: 'foo-value'
    }); // unmodified original
    assertObjectEquals(objValue2, {
      foo: 'foo-value',
      a: { b: 'b-value' }
    });
  });

  it('can overwrite primitive values to create objects', () => {
    const objValue = wrapObject({ foo: 'foo-value' });

    const objValue2 = setField(objValue, 'foo.bar', wrap('bar-value'));
    assertObjectEquals(objValue, {
      foo: 'foo-value'
    }); // unmodified original
    assertObjectEquals(objValue2, { foo: { bar: 'bar-value' } });
  });

  it('can add to nested objects', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });

    const objValue2 = setField(objValue, 'foo.baz', wrap('baz-value'));
    assertObjectEquals(objValue, {
      foo: { bar: 'bar-value' }
    }); // unmodified original
    assertObjectEquals(objValue2, {
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });
  });

  it('can delete keys', () => {
    const objValue = wrapObject({ foo: 'foo-value', bar: 'bar-value' });

    const objValue2 = deleteField(objValue, 'foo');
    assertObjectEquals(objValue, {
      foo: 'foo-value',
      bar: 'bar-value'
    }); // unmodified original
    assertObjectEquals(objValue2, { bar: 'bar-value' });
  });

  it('can delete nested keys', () => {
    const objValue = wrapObject({
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });

    const objValue2 = deleteField(objValue, 'foo.bar');
    assertObjectEquals(objValue, {
      foo: { bar: 'bar-value', baz: 'baz-value' }
    }); // unmodified original
    assertObjectEquals(objValue2, { foo: { baz: 'baz-value' } });
  });

  it('can delete added keys', () => {
    let objValue = wrapObject({});

    objValue = new ObjectValueBuilder(objValue)
      .set(field('a'), wrap('a'))
      .delete(field('a'))
      .build();

    assertObjectEquals(objValue, {});
  });

  it('can delete, resulting in empty object', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' } });

    const objValue2 = deleteField(objValue, 'foo.bar');
    assertObjectEquals(objValue, {
      foo: { bar: 'bar-value' }
    }); // unmodified original
    assertObjectEquals(objValue2, { foo: {} });
  });

  it('will not delete nested keys on primitive values', () => {
    const objValue = wrapObject({ foo: { bar: 'bar-value' }, a: 1 });

    const expected = { foo: { bar: 'bar-value' }, a: 1 };
    const objValue2 = deleteField(objValue, 'foo.baz');
    const objValue3 = deleteField(objValue, 'foo.bar.baz');
    const objValue4 = deleteField(objValue, 'a.b');
    assertObjectEquals(objValue, expected);
    assertObjectEquals(objValue2, expected);
    assertObjectEquals(objValue3, expected);
    assertObjectEquals(objValue4, expected);
  });

  it('can delete multiple fields', () => {
    let objValue = wrapObject({ a: 'a', b: 'a', c: 'c' });

    objValue = new ObjectValueBuilder(objValue).delete(field('a')).build();
    objValue = new ObjectValueBuilder(objValue)
      .delete(field('b'))
      .delete(field('c'))
      .build();

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
    const actualMask = extractFieldMask(objValue.proto.mapValue!);
    expect(actualMask.isEqual(expectedMask)).to.be.true;
  });

  function setField(
    objectValue: ObjectValue,
    fieldPath: string,
    value: api.Value
  ): ObjectValue {
    return new ObjectValueBuilder(objectValue)
      .set(field(fieldPath), value)
      .build();
  }

  function deleteField(
    objectValue: ObjectValue,
    fieldPath: string
  ): ObjectValue {
    return new ObjectValueBuilder(objectValue).delete(field(fieldPath)).build();
  }

  function assertObjectEquals(
    objValue: ObjectValue,
    data: { [k: string]: unknown }
  ): void {
    expect(objValue.isEqual(wrapObject(data)));
  }
});
