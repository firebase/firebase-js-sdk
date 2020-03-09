/**
 * @license
 * Copyright 2020 Google LLC
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

import * as api from '../../../src/protos/firestore_proto_api';
import * as util from '../../util/values';

import { ObjectValue } from '../../../src/model/proto_field_value';
import { field } from '../../util/helpers';

// Since these tests only test the ObjectValueBuilder, the representational
// differences introduced by Proto3Json don't alter their behavior.
const USE_PROTO3_JSON = false;

describe('ObjectValueBuilder', () => {
  it('supports empty builders', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    const object = builder.build();
    expect(object.isEqual(ObjectValue.empty(USE_PROTO3_JSON))).to.be.true;
  });

  it('sets single field', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('foo'), valueOf('foo'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'foo': 'foo' }))).to.be.true;
  });

  it('sets empty object', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('foo'), valueOf({}));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'foo': {} }))).to.be.true;
  });

  it('sets multiple fields', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('foo'), valueOf('foo'));
    builder.set(field('bar'), valueOf('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'foo': 'foo', 'bar': 'bar' }))).to.be
      .true;
  });

  it('sets nested fields', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('a.b'), valueOf('foo'));
    builder.set(field('c.d.e'), valueOf('bar'));
    const object = builder.build();
    expect(
      object.isEqual(
        wrapObject({ 'a': { 'b': 'foo' }, 'c': { 'd': { 'e': 'bar' } } })
      )
    ).to.be.true;
  });

  it('sets two fields in nested object', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('a.b'), valueOf('foo'));
    builder.set(field('a.c'), valueOf('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'a': { 'b': 'foo', 'c': 'bar' } }))).to
      .be.true;
  });

  it('sets field in nested object', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('a'), valueOf({ b: 'foo' }));
    builder.set(field('a.c'), valueOf('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'a': { 'b': 'foo', 'c': 'bar' } }))).to
      .be.true;
  });

  it('sets deeply nested field in nested object', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('a.b.c.d.e.f'), valueOf('foo'));
    const object = builder.build();
    expect(
      object.isEqual(
        wrapObject({
          'a': { 'b': { 'c': { 'd': { 'e': { 'f': 'foo' } } } } }
        })
      )
    ).to.be.true;
  });

  it('sets nested field multiple times', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('a.c'), valueOf('foo'));
    builder.set(field('a'), valueOf({ b: 'foo' }));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'a': { 'b': 'foo' } }))).to.be.true;
  });

  it('sets and deletes field', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('foo'), valueOf('foo'));
    builder.delete(field('foo'));
    const object = builder.build();
    expect(object.isEqual(ObjectValue.empty(USE_PROTO3_JSON))).to.be.true;
  });

  it('sets and deletes nested field', () => {
    const builder = ObjectValue.newBuilder(USE_PROTO3_JSON);
    builder.set(field('a.b.c'), valueOf('foo'));
    builder.set(field('a.b.d'), valueOf('foo'));
    builder.set(field('f.g'), valueOf('foo'));
    builder.set(field('h'), valueOf('foo'));
    builder.delete(field('a.b.c'));
    builder.delete(field('h'));
    const object = builder.build();
    expect(
      object.isEqual(
        wrapObject({ 'a': { 'b': { 'd': 'foo' } }, 'f': { g: 'foo' } })
      )
    ).to.be.true;
  });

  it('sets single field in existing object', () => {
    const builder = wrapObject({ a: 'foo' }).toBuilder();
    builder.set(field('b'), valueOf('foo'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: 'foo', b: 'foo' }))).to.be.true;
  });

  it('overwrites field', () => {
    const builder = wrapObject({ a: 'foo' }).toBuilder();
    builder.set(field('a'), valueOf('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: 'bar' }))).to.be.true;
  });

  it('overwrites nested field', () => {
    const builder = wrapObject({
      a: { b: 'foo', c: { 'd': 'foo' } }
    }).toBuilder();
    builder.set(field('a.b'), valueOf('bar'));
    builder.set(field('a.c.d'), valueOf('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'bar', c: { 'd': 'bar' } } })))
      .to.be.true;
  });

  it('overwrites deeply nested field', () => {
    const builder = wrapObject({ a: { b: 'foo' } }).toBuilder();
    builder.set(field('a.b.c'), valueOf('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: { c: 'bar' } } }))).to.be.true;
  });

  it('merges existing object', () => {
    const builder = wrapObject({ a: { b: 'foo' } }).toBuilder();
    builder.set(field('a.c'), valueOf('foo'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'foo', c: 'foo' } }))).to.be
      .true;
  });

  it('overwrites nested object', () => {
    const builder = wrapObject({
      a: { b: { c: 'foo', d: 'foo' } }
    }).toBuilder();
    builder.set(field('a.b'), valueOf('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'bar' } }))).to.be.true;
  });

  it('replaces nested object', () => {
    const singleValueObject = valueOf({ c: 'bar' });
    const builder = wrapObject({ a: { b: 'foo' } }).toBuilder();
    builder.set(field('a'), singleValueObject);
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { c: 'bar' } }))).to.be.true;
  });

  it('deletes single field', () => {
    const builder = wrapObject({ a: 'foo', b: 'foo' }).toBuilder();
    builder.delete(field('a'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ b: 'foo' }))).to.be.true;
  });

  it('deletes nested object', () => {
    const builder = wrapObject({
      a: { b: { c: 'foo', d: 'foo' }, f: 'foo' }
    }).toBuilder();
    builder.delete(field('a.b'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { f: 'foo' } }))).to.be.true;
  });

  it('deletes non-existing field', () => {
    const builder = wrapObject({ a: 'foo' }).toBuilder();
    builder.delete(field('b'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: 'foo' }))).to.be.true;
  });

  it('deletes non-existing nested field', () => {
    const builder = wrapObject({ a: { b: 'foo' } }).toBuilder();
    builder.delete(field('a.b.c'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'foo' } }))).to.be.true;
  });

  // TODO(mrschmidt): Clean up the helpers and merge wrap() with TestUtil.wrap()
  function wrapObject(value: object): ObjectValue {
    return new ObjectValue(valueOf(value), USE_PROTO3_JSON);
  }

  function valueOf(value: unknown): api.Value {
    return util.valueOf(value, USE_PROTO3_JSON);
  }
});
