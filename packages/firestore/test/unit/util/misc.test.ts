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
import { debugCast } from '../../../src/util/assert';
import { immediateSuccessor } from '../../../src/util/misc';
import { mask } from '../../util/helpers';

describe('immediateSuccessor', () => {
  it('generates the correct immediate successors', () => {
    expect(immediateSuccessor('hello')).to.equal('hello\0');
    expect(immediateSuccessor('')).to.equal('\0');
  });
});

describe('typeCast', () => {
  it('can cast types', () => {
    class Foo {}
    class Bar extends Foo {}
    const foo: Foo = new Bar();
    const _: Bar = debugCast(foo, Bar);
  });

  it('validates types', () => {
    class Foo {}
    class Bar {}
    const foo = new Foo();
    expect(() => debugCast(foo, Bar)).to.throw(
      "Expected type 'Bar', but was 'Foo'"
    );
  });
});

describe('FieldMask', () => {
  it('cannot contain duplicate fields', () => {
    expect(() => mask('a', 'b', 'a')).to.throw(
      'FieldMask contains field that is not unique: a'
    );
  });
});
