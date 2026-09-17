/**
 * @license
 * Copyright 2026 Google LLC
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

import { FieldPath, ResourcePath } from '../../../src/model/path';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { path } from '../../util/helpers';

function expectEqual(s1: string[], s2: string[]): void {
  expect(
    ResourcePath.comparator(new ResourcePath(s1), new ResourcePath(s2))
  ).toBe(0);
}

function expectLess(s1: string[], s2: string[]): void {
  expect(
    ResourcePath.comparator(new ResourcePath(s1), new ResourcePath(s2))
  ).toBe(-1);
  expect(
    ResourcePath.comparator(new ResourcePath(s2), new ResourcePath(s1))
  ).toBe(1);
}

describe('Path', () => {
  addEqualityMatcher();

  it('can be constructed', () => {
    new ResourcePath(['rooms', 'Eros', 'messages']);
  });

  it('can index into itself', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);
    expect(path.get(0)).toBe('rooms');
    expect(path.get(1)).toBe('Eros');
    expect(path.get(2)).toBe('messages');
  });

  it('can be constructed with offsets', () => {
    let path = new ResourcePath(['rooms', 'Eros', 'messages'], 2);
    expect(path).toEqual(new ResourcePath(['messages']));
    expect(path.length).toBe(1);

    path = new ResourcePath(['rooms', 'Eros', 'messages'], 3);
    expect(path).toEqual(new ResourcePath([]));
    expect(path.length).toBe(0);
  });

  it('can pop front repeatedly', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);

    expect(path.popFirst()).toEqual(new ResourcePath(['Eros', 'messages']));
    expect(path.popFirst().popFirst()).toEqual(new ResourcePath(['messages']));
    expect(path.popFirst().popFirst().popFirst()).toEqual(new ResourcePath([]));
    expect(path.popFirst(0)).toEqual(
      new ResourcePath(['rooms', 'Eros', 'messages'])
    );
    expect(path.popFirst(1)).toEqual(new ResourcePath(['Eros', 'messages']));
    expect(path.popFirst(2)).toEqual(new ResourcePath(['messages']));
    expect(path.popFirst(3)).toEqual(new ResourcePath([]));
    // unmodified original
    expect(path).toEqual(new ResourcePath(['rooms', 'Eros', 'messages']));
  });

  it('can yield the last segment', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);

    expect(path.lastSegment()).toBe('messages');
    expect(path.popLast().lastSegment()).toBe('Eros');
    expect(path.popLast().popLast().lastSegment()).toBe('rooms');
  });

  it('can create child path', () => {
    const p: ResourcePath = path('rooms');

    expect(p.child('eros')).toEqual(path('rooms/eros'));
    expect(p.child('eros').child('1')).toEqual(path('rooms/eros/1'));
    // unmodified original
    expect(p).toEqual(path('rooms'));
  });

  it('can pop last repeatedly', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);

    expect(path.popLast()).toEqual(new ResourcePath(['rooms', 'Eros']));
    expect(path.popLast().popLast()).toEqual(new ResourcePath(['rooms']));
    expect(path.popLast().popLast().popLast()).toEqual(new ResourcePath([]));

    // original remains unmodified
    expect(path).toEqual(new ResourcePath(['rooms', 'Eros', 'messages']));
  });

  it('compares correctly', () => {
    expectEqual([], []);
    expectEqual(['a'], ['a']);
    expectEqual(['a', 'b', 'c'], ['a', 'b', 'c']);

    expectLess([], ['a']);
    expectLess(['a'], ['b']);
    expectLess(['a'], ['a', 'b']);
  });

  it('determines prefix correctly', () => {
    const empty = new ResourcePath([]);
    const a = new ResourcePath(['a']);
    const ab = new ResourcePath(['a', 'b']);
    const abc = new ResourcePath(['a', 'b', 'c']);
    const b = new ResourcePath(['b']);
    const ba = new ResourcePath(['b', 'a']);

    expect(empty.isPrefixOf(a)).toBe(true);
    expect(empty.isPrefixOf(ab)).toBe(true);
    expect(empty.isPrefixOf(abc)).toBe(true);
    expect(empty.isPrefixOf(empty)).toBe(true);
    expect(empty.isPrefixOf(b)).toBe(true);
    expect(empty.isPrefixOf(ba)).toBe(true);

    expect(a.isPrefixOf(a)).toBe(true);
    expect(a.isPrefixOf(ab)).toBe(true);
    expect(a.isPrefixOf(abc)).toBe(true);
    expect(a.isPrefixOf(empty)).toBe(false);
    expect(a.isPrefixOf(b)).toBe(false);
    expect(a.isPrefixOf(ba)).toBe(false);

    expect(ab.isPrefixOf(a)).toBe(false);
    expect(ab.isPrefixOf(ab)).toBe(true);
    expect(ab.isPrefixOf(abc)).toBe(true);
    expect(ab.isPrefixOf(empty)).toBe(false);
    expect(ab.isPrefixOf(b)).toBe(false);
    expect(ab.isPrefixOf(ba)).toBe(false);

    expect(abc.isPrefixOf(a)).toBe(false);
    expect(abc.isPrefixOf(ab)).toBe(false);
    expect(abc.isPrefixOf(abc)).toBe(true);
    expect(abc.isPrefixOf(empty)).toBe(false);
    expect(abc.isPrefixOf(b)).toBe(false);
    expect(abc.isPrefixOf(ba)).toBe(false);
  });

  it('escapes FieldPath with segments', () => {
    const path = new FieldPath(['\\foo\\.`bar`']);
    expect(path.canonicalString()).toBe('`\\\\foo\\\\.\\`bar\\``');
  });

  it('can be constructed from field path.', () => {
    const path = FieldPath.fromServerFormat('foo\\..bar\\\\.baz');
    expect(path.toArray()).toEqual(['foo.', 'bar\\', 'baz']);
  });

  describe('fails to construct from invalid field path', () => {
    for (const bad of ['', 'foo\\', 'foo\\x', 'foo.', '.foo', 'foo..bar']) {
      it('"' + bad + '"', () => {
        expect(() => FieldPath.fromServerFormat(bad)).toThrow();
      });
    }
  });
});
