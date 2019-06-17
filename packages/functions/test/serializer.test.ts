/**
 * @license
 * Copyright 2017 Google Inc.
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
import { Serializer } from '../src/serializer';

describe('Serializer', () => {
  const serializer = new Serializer();

  it('encodes null', () => {
    expect(serializer.encode(null)).to.be.null;
    expect(serializer.encode(undefined)).to.be.null;
  });

  it('decodes null', () => {
    expect(serializer.decode(null)).to.be.null;
  });

  it('encodes int', () => {
    expect(serializer.encode(1)).to.equal(1);
    // Number isn't allowed in our own codebase, but we need to test it, in case
    // a user passes one in. There's no reason not to support it, and we don't
    // want to unintentionally encode them as {}.
    // eslint-disable-next-line no-new-wrappers
    expect(serializer.encode(new Number(1))).to.equal(1);
  });

  it('decodes int', () => {
    expect(serializer.decode(1)).to.equal(1);
  });

  it('encodes long', () => {
    expect(serializer.encode(-9223372036854775000)).to.equal(
      -9223372036854775000
    );
  });

  it('decodes long', () => {
    expect(
      serializer.decode({
        '@type': 'type.googleapis.com/google.protobuf.Int64Value',
        value: '-9223372036854775000'
      })
    ).to.equal(-9223372036854775000);
  });

  it('encodes unsigned long', () => {
    expect(serializer.encode(9223372036854800000)).to.equal(
      9223372036854800000
    );
  });

  it('decodes unsigned long', () => {
    expect(
      serializer.decode({
        '@type': 'type.googleapis.com/google.protobuf.UInt64Value',
        value: '9223372036854800000'
      })
    ).to.equal(9223372036854800000);
  });

  it('encodes double', () => {
    expect(serializer.encode(1.2)).to.equal(1.2);
  });

  it('decodes double', () => {
    expect(serializer.decode(1.2)).to.equal(1.2);
  });

  it('encodes string', () => {
    expect(serializer.encode('hello')).to.equal('hello');
  });

  it('decodes string', () => {
    expect(serializer.decode('hello')).to.equal('hello');
  });

  // TODO(klimt): Make this test more interesting once we have a complex type
  // that can be created in JavaScript.
  it('encodes array', () => {
    expect(serializer.encode([1, '2', [3, 4]])).to.deep.equal([1, '2', [3, 4]]);
  });

  it('decodes array', () => {
    expect(
      serializer.decode([
        1,
        '2',
        [
          3,
          {
            value: '1099511627776',
            '@type': 'type.googleapis.com/google.protobuf.Int64Value'
          }
        ]
      ])
    ).to.deep.equal([1, '2', [3, 1099511627776]]);
  });

  // TODO(klimt): Make this test more interesting once we have a complex type
  // that can be created in JavaScript.
  it('encodes object', () => {
    expect(
      serializer.encode({
        foo: 1,
        bar: 'hello',
        baz: [1, 2, 3]
      })
    ).to.deep.equal({
      foo: 1,
      bar: 'hello',
      baz: [1, 2, 3]
    });
  });

  it('decodes object', () => {
    expect(
      serializer.decode({
        foo: 1,
        bar: 'hello',
        baz: [
          1,
          2,
          {
            value: '1099511627776',
            '@type': 'type.googleapis.com/google.protobuf.Int64Value'
          }
        ]
      })
    ).to.deep.equal({
      foo: 1,
      bar: 'hello',
      baz: [1, 2, 1099511627776]
    });
  });

  it('fails to encode NaN', () => {
    expect(() => serializer.encode(NaN)).to.throw();
  });

  it('fails to decode unknown type', () => {
    expect(() =>
      serializer.decode({
        '@type': 'unknown',
        value: 'should be ignored'
      })
    ).to.throw();
  });
});
