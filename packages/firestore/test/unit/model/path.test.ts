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
import { FieldPath, ResourcePath } from '../../../src/model/path';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { path } from '../../util/helpers';

function expectEqual(s1: string[], s2: string[]): void {
  expect(
    ResourcePath.comparator(new ResourcePath(s1), new ResourcePath(s2))
  ).to.equal(0);
}

function expectLess(s1: string[], s2: string[]): void {
  expect(
    ResourcePath.comparator(new ResourcePath(s1), new ResourcePath(s2))
  ).to.equal(-1);
  expect(
    ResourcePath.comparator(new ResourcePath(s2), new ResourcePath(s1))
  ).to.equal(1);
}

describe('Path', () => {
  addEqualityMatcher();

  it('can be constructed', () => {
    new ResourcePath(['rooms', 'Eros', 'messages']);
  });

  it('can index into itself', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);
    expect(path.get(0)).to.equal('rooms');
    expect(path.get(1)).to.equal('Eros');
    expect(path.get(2)).to.equal('messages');
  });

  it('can be constructed with offsets', () => {
    let path = new ResourcePath(['rooms', 'Eros', 'messages'], 2);
    expect(path).to.deep.equal(new ResourcePath(['messages']));
    expect(path.length).to.equal(1);

    path = new ResourcePath(['rooms', 'Eros', 'messages'], 3);
    expect(path).to.deep.equal(new ResourcePath([]));
    expect(path.length).to.equal(0);
  });

  it('can pop front repeatedly', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);

    expect(path.popFirst()).to.deep.equal(
      new ResourcePath(['Eros', 'messages'])
    );
    expect(path.popFirst().popFirst()).to.deep.equal(
      new ResourcePath(['messages'])
    );
    expect(path.popFirst().popFirst().popFirst()).to.deep.equal(
      new ResourcePath([])
    );
    expect(path.popFirst(0)).to.deep.equal(
      new ResourcePath(['rooms', 'Eros', 'messages'])
    );
    expect(path.popFirst(1)).to.deep.equal(
      new ResourcePath(['Eros', 'messages'])
    );
    expect(path.popFirst(2)).to.deep.equal(new ResourcePath(['messages']));
    expect(path.popFirst(3)).to.deep.equal(new ResourcePath([]));
    // unmodified original
    expect(path).to.deep.equal(new ResourcePath(['rooms', 'Eros', 'messages']));
  });

  it('can yield the last segment', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);

    expect(path.lastSegment()).to.equal('messages');
    expect(path.popLast().lastSegment()).to.equal('Eros');
    expect(path.popLast().popLast().lastSegment()).to.equal('rooms');
  });

  it('can create child path', () => {
    const p: ResourcePath = path('rooms');

    expect(p.child('eros')).to.deep.equal(path('rooms/eros'));
    expect(p.child('eros').child('1')).to.deep.equal(path('rooms/eros/1'));
    // unmodified original
    expect(p).to.deep.equal(path('rooms'));
  });

  it('can pop last repeatedly', () => {
    const path = new ResourcePath(['rooms', 'Eros', 'messages']);

    expect(path.popLast()).to.deep.equal(new ResourcePath(['rooms', 'Eros']));
    expect(path.popLast().popLast()).to.deep.equal(new ResourcePath(['rooms']));
    expect(path.popLast().popLast().popLast()).to.deep.equal(
      new ResourcePath([])
    );

    // original remains unmodified
    expect(path).to.deep.equal(new ResourcePath(['rooms', 'Eros', 'messages']));
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

    expect(empty.isPrefixOf(a)).to.equal(true);
    expect(empty.isPrefixOf(ab)).to.equal(true);
    expect(empty.isPrefixOf(abc)).to.equal(true);
    expect(empty.isPrefixOf(empty)).to.equal(true);
    expect(empty.isPrefixOf(b)).to.equal(true);
    expect(empty.isPrefixOf(ba)).to.equal(true);

    expect(a.isPrefixOf(a)).to.equal(true);
    expect(a.isPrefixOf(ab)).to.equal(true);
    expect(a.isPrefixOf(abc)).to.equal(true);
    expect(a.isPrefixOf(empty)).to.equal(false);
    expect(a.isPrefixOf(b)).to.equal(false);
    expect(a.isPrefixOf(ba)).to.equal(false);

    expect(ab.isPrefixOf(a)).to.equal(false);
    expect(ab.isPrefixOf(ab)).to.equal(true);
    expect(ab.isPrefixOf(abc)).to.equal(true);
    expect(ab.isPrefixOf(empty)).to.equal(false);
    expect(ab.isPrefixOf(b)).to.equal(false);
    expect(ab.isPrefixOf(ba)).to.equal(false);

    expect(abc.isPrefixOf(a)).to.equal(false);
    expect(abc.isPrefixOf(ab)).to.equal(false);
    expect(abc.isPrefixOf(abc)).to.equal(true);
    expect(abc.isPrefixOf(empty)).to.equal(false);
    expect(abc.isPrefixOf(b)).to.equal(false);
    expect(abc.isPrefixOf(ba)).to.equal(false);
  });

  it('escapes FieldPath with segments', () => {
    const path = new FieldPath(['\\foo\\.`bar`']);
    expect(path.canonicalString()).to.equal('`\\\\foo\\\\.\\`bar\\``');
  });

  it('can be constructed from field path.', () => {
    const path = FieldPath.fromServerFormat('foo\\..bar\\\\.baz');
    expect(path.toArray()).to.deep.equal(['foo.', 'bar\\', 'baz']);
  });

  describe('fails to construct from invalid field path', () => {
    for (const bad of ['', 'foo\\', 'foo\\x', 'foo.', '.foo', 'foo..bar']) {
      it('"' + bad + '"', () => {
        expect(() => FieldPath.fromServerFormat(bad)).to.throw();
      });
    }
  });
});
