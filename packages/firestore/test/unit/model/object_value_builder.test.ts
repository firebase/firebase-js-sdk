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

import { ObjectValue } from '../../../src/model/object_value';
import { field, wrap, wrapObject } from '../../util/helpers';

describe('MutableObjectValue', () => {
  it('supports empty objectValues', () => {
    const objectValue = ObjectValue.empty();

    expect(objectValue.isEqual(ObjectValue.empty())).to.be.true;
  });

  it('sets single field', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('foo'), wrap('foo'));

    expect(objectValue.isEqual(wrapObject({ 'foo': 'foo' }))).to.be.true;
  });

  it('sets empty object', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('foo'), wrap({}));

    expect(objectValue.isEqual(wrapObject({ 'foo': {} }))).to.be.true;
  });

  it('sets multiple fields', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('foo'), wrap('foo'));
    objectValue.set(field('bar'), wrap('bar'));

    expect(objectValue.isEqual(wrapObject({ 'foo': 'foo', 'bar': 'bar' }))).to
      .be.true;
  });

  it('sets nested fields', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('a.b'), wrap('foo'));
    objectValue.set(field('c.d.e'), wrap('bar'));

    expect(
      objectValue.isEqual(
        wrapObject({ 'a': { 'b': 'foo' }, 'c': { 'd': { 'e': 'bar' } } })
      )
    ).to.be.true;
  });

  it('sets two fields in nested object', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('a.b'), wrap('foo'));
    objectValue.set(field('a.c'), wrap('bar'));

    expect(objectValue.isEqual(wrapObject({ 'a': { 'b': 'foo', 'c': 'bar' } })))
      .to.be.true;
  });

  it('sets field in nested object', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('a'), wrap({ b: 'foo' }));
    objectValue.set(field('a.c'), wrap('bar'));

    expect(objectValue.isEqual(wrapObject({ 'a': { 'b': 'foo', 'c': 'bar' } })))
      .to.be.true;
  });

  it('sets deeply nested field in nested object', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('a.b.c.d.e.f'), wrap('foo'));

    expect(
      objectValue.isEqual(
        wrapObject({
          'a': { 'b': { 'c': { 'd': { 'e': { 'f': 'foo' } } } } }
        })
      )
    ).to.be.true;
  });

  it('sets nested field multiple times', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('a.c'), wrap('foo'));
    objectValue.set(field('a'), wrap({ b: 'foo' }));

    expect(objectValue.isEqual(wrapObject({ 'a': { 'b': 'foo' } }))).to.be.true;
  });

  it('sets and deletes field', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('foo'), wrap('foo'));
    objectValue.delete(field('foo'));

    expect(objectValue.isEqual(ObjectValue.empty())).to.be.true;
  });

  it('sets and deletes nested field', () => {
    const objectValue = ObjectValue.empty();
    objectValue.set(field('a.b.c'), wrap('foo'));
    objectValue.set(field('a.b.d'), wrap('foo'));
    objectValue.set(field('f.g'), wrap('foo'));
    objectValue.set(field('h'), wrap('foo'));
    objectValue.delete(field('a.b.c'));
    objectValue.delete(field('h'));

    expect(
      objectValue.isEqual(
        wrapObject({ 'a': { 'b': { 'd': 'foo' } }, 'f': { g: 'foo' } })
      )
    ).to.be.true;
  });

  it('sets single field in existing object', () => {
    const objectValue = wrapObject({ a: 'foo' });
    objectValue.set(field('b'), wrap('foo'));

    expect(objectValue.isEqual(wrapObject({ a: 'foo', b: 'foo' }))).to.be.true;
  });

  it('overwrites field', () => {
    const objectValue = wrapObject({ a: 'foo' });
    objectValue.set(field('a'), wrap('bar'));
    expect(objectValue.isEqual(wrapObject({ a: 'bar' }))).to.be.true;
  });

  it('overwrites nested field', () => {
    const objectValue = wrapObject({
      a: { b: 'foo', c: { 'd': 'foo' } }
    });
    objectValue.set(field('a.b'), wrap('bar'));
    objectValue.set(field('a.c.d'), wrap('bar'));

    expect(
      objectValue.isEqual(wrapObject({ a: { b: 'bar', c: { 'd': 'bar' } } }))
    ).to.be.true;
  });

  it('overwrites deeply nested field', () => {
    const objectValue = wrapObject({ a: { b: 'foo' } });
    objectValue.set(field('a.b.c'), wrap('bar'));

    expect(objectValue.isEqual(wrapObject({ a: { b: { c: 'bar' } } }))).to.be
      .true;
  });

  it('merges existing object', () => {
    const objectValue = wrapObject({ a: { b: 'foo' } });
    objectValue.set(field('a.c'), wrap('foo'));

    expect(objectValue.isEqual(wrapObject({ a: { b: 'foo', c: 'foo' } }))).to.be
      .true;
  });

  it('overwrites nested object', () => {
    const objectValue = wrapObject({
      a: { b: { c: 'foo', d: 'foo' } }
    });
    objectValue.set(field('a.b'), wrap('bar'));

    expect(objectValue.isEqual(wrapObject({ a: { b: 'bar' } }))).to.be.true;
  });

  it('replaces nested object', () => {
    const singleValueObject = wrap({ c: 'bar' });
    const objectValue = wrapObject({ a: { b: 'foo' } });
    objectValue.set(field('a'), singleValueObject);

    expect(objectValue.isEqual(wrapObject({ a: { c: 'bar' } }))).to.be.true;
  });

  it('deletes single field', () => {
    const objectValue = wrapObject({ a: 'foo', b: 'foo' });
    objectValue.delete(field('a'));

    expect(objectValue.isEqual(wrapObject({ b: 'foo' }))).to.be.true;
  });

  it('deletes nested object', () => {
    const objectValue = wrapObject({
      a: { b: { c: 'foo', d: 'foo' }, f: 'foo' }
    });
    objectValue.delete(field('a.b'));

    expect(objectValue.isEqual(wrapObject({ a: { f: 'foo' } }))).to.be.true;
  });

  it('deletes non-existing field', () => {
    const objectValue = wrapObject({ a: 'foo' });
    objectValue.delete(field('b'));

    expect(objectValue.isEqual(wrapObject({ a: 'foo' }))).to.be.true;
  });

  it('deletes non-existing nested field', () => {
    const objectValue = wrapObject({ a: { b: 'foo' } });
    objectValue.delete(field('a.b.c'));

    expect(objectValue.isEqual(wrapObject({ a: { b: 'foo' } }))).to.be.true;
  });
});
