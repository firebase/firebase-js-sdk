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

import {
  ObjectValue,
  ObjectValueBuilder
} from '../../../src/model/object_value';
import { field, wrap, wrapObject } from '../../util/helpers';

describe('ObjectValueBuilder', () => {
  it('supports empty builders', () => {
    const builder = new ObjectValueBuilder();
    const object = builder.build();
    expect(object.isEqual(ObjectValue.empty())).to.be.true;
  });

  it('sets single field', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('foo'), wrap('foo'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'foo': 'foo' }))).to.be.true;
  });

  it('sets empty object', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('foo'), wrap({}));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'foo': {} }))).to.be.true;
  });

  it('sets multiple fields', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('foo'), wrap('foo'));
    builder.set(field('bar'), wrap('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'foo': 'foo', 'bar': 'bar' }))).to.be
      .true;
  });

  it('sets nested fields', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('a.b'), wrap('foo'));
    builder.set(field('c.d.e'), wrap('bar'));
    const object = builder.build();
    expect(
      object.isEqual(
        wrapObject({ 'a': { 'b': 'foo' }, 'c': { 'd': { 'e': 'bar' } } })
      )
    ).to.be.true;
  });

  it('sets two fields in nested object', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('a.b'), wrap('foo'));
    builder.set(field('a.c'), wrap('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'a': { 'b': 'foo', 'c': 'bar' } }))).to
      .be.true;
  });

  it('sets field in nested object', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('a'), wrap({ b: 'foo' }));
    builder.set(field('a.c'), wrap('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'a': { 'b': 'foo', 'c': 'bar' } }))).to
      .be.true;
  });

  it('sets deeply nested field in nested object', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('a.b.c.d.e.f'), wrap('foo'));
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
    const builder = new ObjectValueBuilder();
    builder.set(field('a.c'), wrap('foo'));
    builder.set(field('a'), wrap({ b: 'foo' }));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ 'a': { 'b': 'foo' } }))).to.be.true;
  });

  it('sets and deletes field', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('foo'), wrap('foo'));
    builder.delete(field('foo'));
    const object = builder.build();
    expect(object.isEqual(ObjectValue.empty())).to.be.true;
  });

  it('sets and deletes nested field', () => {
    const builder = new ObjectValueBuilder();
    builder.set(field('a.b.c'), wrap('foo'));
    builder.set(field('a.b.d'), wrap('foo'));
    builder.set(field('f.g'), wrap('foo'));
    builder.set(field('h'), wrap('foo'));
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
    const builder = new ObjectValueBuilder(wrapObject({ a: 'foo' }));
    builder.set(field('b'), wrap('foo'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: 'foo', b: 'foo' }))).to.be.true;
  });

  it('overwrites field', () => {
    const builder = new ObjectValueBuilder(wrapObject({ a: 'foo' }));
    builder.set(field('a'), wrap('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: 'bar' }))).to.be.true;
  });

  it('overwrites nested field', () => {
    const builder = new ObjectValueBuilder(
      wrapObject({
        a: { b: 'foo', c: { 'd': 'foo' } }
      })
    );
    builder.set(field('a.b'), wrap('bar'));
    builder.set(field('a.c.d'), wrap('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'bar', c: { 'd': 'bar' } } })))
      .to.be.true;
  });

  it('overwrites deeply nested field', () => {
    const builder = new ObjectValueBuilder(wrapObject({ a: { b: 'foo' } }));
    builder.set(field('a.b.c'), wrap('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: { c: 'bar' } } }))).to.be.true;
  });

  it('merges existing object', () => {
    const builder = new ObjectValueBuilder(wrapObject({ a: { b: 'foo' } }));
    builder.set(field('a.c'), wrap('foo'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'foo', c: 'foo' } }))).to.be
      .true;
  });

  it('overwrites nested object', () => {
    const builder = new ObjectValueBuilder(
      wrapObject({
        a: { b: { c: 'foo', d: 'foo' } }
      })
    );
    builder.set(field('a.b'), wrap('bar'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'bar' } }))).to.be.true;
  });

  it('replaces nested object', () => {
    const singleValueObject = wrap({ c: 'bar' });
    const builder = new ObjectValueBuilder(wrapObject({ a: { b: 'foo' } }));
    builder.set(field('a'), singleValueObject);
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { c: 'bar' } }))).to.be.true;
  });

  it('deletes single field', () => {
    const builder = new ObjectValueBuilder(wrapObject({ a: 'foo', b: 'foo' }));
    builder.delete(field('a'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ b: 'foo' }))).to.be.true;
  });

  it('deletes nested object', () => {
    const builder = new ObjectValueBuilder(
      wrapObject({
        a: { b: { c: 'foo', d: 'foo' }, f: 'foo' }
      })
    );
    builder.delete(field('a.b'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { f: 'foo' } }))).to.be.true;
  });

  it('deletes non-existing field', () => {
    const builder = new ObjectValueBuilder(wrapObject({ a: 'foo' }));
    builder.delete(field('b'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: 'foo' }))).to.be.true;
  });

  it('deletes non-existing nested field', () => {
    const builder = new ObjectValueBuilder(wrapObject({ a: { b: 'foo' } }));
    builder.delete(field('a.b.c'));
    const object = builder.build();
    expect(object.isEqual(wrapObject({ a: { b: 'foo' } }))).to.be.true;
  });
});
