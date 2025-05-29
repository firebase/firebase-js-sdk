/**
 * @license
 * Copyright 2025 Google LLC
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

import { fail, hardAssert } from '../../../src/util/assert';

describe('hardAssert', () => {
  it('includes the error code as hex', () => {
    expect(() => hardAssert(false, 0x1234, 'a message here')).to.throw('1234');
  });

  it('includes the context', () => {
    expect(() =>
      hardAssert(false, 0x1234, 'a message here', { foo: 'bar baz' })
    ).to.throw('bar baz');
  });

  it('includes the message', () => {
    expect(() =>
      hardAssert(false, 0x1234, 'a message here', { foo: 'bar baz' })
    ).to.throw('a message here');
  });

  describe('without message', () => {
    it('includes the error code as hex', () => {
      expect(() => hardAssert(false, 0x1234)).to.throw('1234');
    });

    it('includes the context', () => {
      expect(() => hardAssert(false, 0x1234, { foo: 'bar baz' })).to.throw(
        'bar baz'
      );
    });
    it('includes a default message', () => {
      expect(() => hardAssert(false, 0x1234, { foo: 'bar baz' })).to.throw(
        'Unexpected state'
      );
    });
  });
});

describe('fail', () => {
  it('includes the error code as hex', () => {
    expect(() => fail(0x1234, 'a message here')).to.throw('1234');
  });

  it('includes the context', () => {
    expect(() => fail(0x1234, 'a message here', { foo: 'bar baz' })).to.throw(
      'bar baz'
    );
  });

  it('includes the message', () => {
    expect(() => fail(0x1234, 'a message here', { foo: 'bar baz' })).to.throw(
      'a message here'
    );
  });

  describe('without message', () => {
    it('includes the error code as hex', () => {
      expect(() => fail(0x1234)).to.throw('1234');
    });

    it('includes the context', () => {
      expect(() => fail(0x1234, { foo: 'bar baz' })).to.throw('bar baz');
    });
    it('includes a default message', () => {
      expect(() => fail(0x1234, { foo: 'bar baz' })).to.throw(
        'Unexpected state'
      );
    });
  });
});
