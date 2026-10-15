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

import { encode, decode } from './serializer';

describe('Serializer', () => {
  it('encodes null', () => {
    expect(encode(null)).toBeNull();
    expect(encode(undefined)).toBeNull();
  });

  it('decodes null', () => {
    expect(decode(null)).toBeNull();
  });

  it('encodes int', () => {
    expect(encode(1)).toBe(1);
    // Number isn't allowed in our own codebase, but we need to test it, in case
    // a user passes one in. There's no reason not to support it, and we don't
    // want to unintentionally encode them as {}.
    // eslint-disable-next-line no-new-wrappers
    expect(encode(new Number(1))).toBe(1);
  });

  it('decodes int', () => {
    expect(decode(1)).toBe(1);
  });

  it('encodes long', () => {
    expect(encode(-9223372036854775000)).toBe(-9223372036854775000);
  });

  it('decodes long', () => {
    expect(
      decode({
        '@type': 'type.googleapis.com/google.protobuf.Int64Value',
        value: '-9223372036854775000'
      })
    ).toBe(-9223372036854775000);
  });

  it('encodes unsigned long', () => {
    expect(encode(9223372036854800000)).toBe(9223372036854800000);
  });

  it('decodes unsigned long', () => {
    expect(
      decode({
        '@type': 'type.googleapis.com/google.protobuf.UInt64Value',
        value: '9223372036854800000'
      })
    ).toBe(9223372036854800000);
  });

  it('encodes double', () => {
    expect(encode(1.2)).toBe(1.2);
  });

  it('decodes double', () => {
    expect(decode(1.2)).toBe(1.2);
  });

  it('encodes string', () => {
    expect(encode('hello')).toBe('hello');
  });

  it('decodes string', () => {
    expect(decode('hello')).toBe('hello');
  });

  it('encodes date to ISO string', () => {
    expect(encode(new Date(1620666095891))).toBe('2021-05-10T17:01:35.891Z');
  });

  it('decodes date string without modifying it', () => {
    expect(decode('2021-05-10T17:01:35.891Z')).toBe('2021-05-10T17:01:35.891Z');
  });

  // TODO(klimt): Make this test more interesting once we have a complex type
  // that can be created in JavaScript.
  it('encodes array', () => {
    expect(encode([1, '2', [3, 4]])).toEqual([1, '2', [3, 4]]);
  });

  it('decodes array', () => {
    expect(
      decode([
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
    ).toEqual([1, '2', [3, 1099511627776]]);
  });

  // TODO(klimt): Make this test more interesting once we have a complex type
  // that can be created in JavaScript.
  it('encodes object', () => {
    expect(
      encode({
        foo: 1,
        bar: 'hello',
        baz: [1, 2, 3],
        date: new Date(1620666095891)
      })
    ).toEqual({
      foo: 1,
      bar: 'hello',
      baz: [1, 2, 3],
      date: '2021-05-10T17:01:35.891Z'
    });
  });

  it('decodes object', () => {
    expect(
      decode({
        foo: 1,
        bar: 'hello',
        baz: [
          1,
          2,
          {
            value: '1099511627776',
            '@type': 'type.googleapis.com/google.protobuf.Int64Value'
          }
        ],
        date: '2021-05-10T17:01:35.891Z'
      })
    ).toEqual({
      foo: 1,
      bar: 'hello',
      baz: [1, 2, 1099511627776],
      date: '2021-05-10T17:01:35.891Z'
    });
  });

  it('fails to encode NaN', () => {
    expect(() => encode(NaN)).toThrow();
  });

  it('fails to decode unknown type', () => {
    expect(() =>
      decode({
        '@type': 'unknown',
        value: 'should be ignored'
      })
    ).toThrow();
  });
});
