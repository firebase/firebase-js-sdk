/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0x00 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0x00
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from 'chai';

import {
  numberOfLeadingZerosInByte,
  OrderedCodeWriter
} from '../../../src/index/ordered_code_writer';

class ValueTestCase<T> {
  constructor(
    readonly val: T,
    readonly ascString: string,
    readonly descString: string
  ) {}
}

const NUMBER_TEST_CASES: Array<ValueTestCase<number>> = [
  new ValueTestCase(
    Number.NEGATIVE_INFINITY,
    // Note: This values are taken from the Android reference implementation
    '070fffffffffffff',
    'f8f0000000000000'
  ),
  new ValueTestCase(
    Number.MIN_SAFE_INTEGER,
    '083cc0000000000000',
    'f7c33fffffffffffff'
  ),
  new ValueTestCase(-2, '083fffffffffffffff', 'f7c000000000000000'),
  new ValueTestCase(-1, '08400fffffffffffff', 'f7bff0000000000000'),
  new ValueTestCase(-0.1, '084046666666666665', 'f7bfb999999999999a'),
  new ValueTestCase(-0.0, '087fffffffffffffff', 'f78000000000000000'),
  new ValueTestCase(0, '088000000000000000', 'f77fffffffffffffff'),
  new ValueTestCase(
    Number.MIN_VALUE,
    '088000000000000001',
    'f77ffffffffffffffe'
  ),
  new ValueTestCase(0.1, '08bfb999999999999a', 'f74046666666666665'),
  new ValueTestCase(1, '08bff0000000000000', 'f7400fffffffffffff'),
  new ValueTestCase(2, '08c000000000000000', 'f73fffffffffffffff'),
  new ValueTestCase(4, '08c010000000000000', 'f73fefffffffffffff'),
  new ValueTestCase(8, '08c020000000000000', 'f73fdfffffffffffff'),
  new ValueTestCase(16, '08c030000000000000', 'f73fcfffffffffffff'),
  new ValueTestCase(32, '08c040000000000000', 'f73fbfffffffffffff'),
  new ValueTestCase(64, '08c050000000000000', 'f73fafffffffffffff'),
  new ValueTestCase(128, '08c060000000000000', 'f73f9fffffffffffff'),
  new ValueTestCase(255, '08c06fe00000000000', 'f73f901fffffffffff'),
  new ValueTestCase(256, '08c070000000000000', 'f73f8fffffffffffff'),
  new ValueTestCase(257, '08c070100000000000', 'f73f8fefffffffffff'),
  new ValueTestCase(
    Number.MAX_SAFE_INTEGER,
    '08c33fffffffffffff',
    'f73cc0000000000000'
  ),
  new ValueTestCase(
    Number.POSITIVE_INFINITY,
    '08fff0000000000000',
    'f7000fffffffffffff'
  ),
  new ValueTestCase(Number.NaN, '08fff8000000000000', 'f70007ffffffffffff')
];

describe('Ordered Code Writer', () => {
  it('computes number of leading zeros', () => {
    for (let i = 0; i < 0xff; ++i) {
      let zeros = 0;
      for (let bit = 7; bit >= 0; --bit) {
        if ((i & (1 << bit)) === 0) {
          ++zeros;
        } else {
          break;
        }
      }
      expect(numberOfLeadingZerosInByte(i)).to.equal(zeros, `for number ${i}`);
    }
  });

  it('converts numbers to bits', () => {
    for (let i = 0; i < NUMBER_TEST_CASES.length; ++i) {
      const bytes = getBytes(NUMBER_TEST_CASES[i].val);
      expect(bytes.asc).to.deep.equal(
        fromHex(NUMBER_TEST_CASES[i].ascString),
        'Ascending for ' + NUMBER_TEST_CASES[i].val
      );
      expect(bytes.desc).to.deep.equal(
        fromHex(NUMBER_TEST_CASES[i].descString),
        'Descending for ' + NUMBER_TEST_CASES[i].val
      );
    }
  });

  it('orders numbers correctly', () => {
    for (let i = 0; i < NUMBER_TEST_CASES.length; ++i) {
      for (let j = i; j < NUMBER_TEST_CASES.length; ++j) {
        const left = NUMBER_TEST_CASES[i].val;
        const leftBytes = getBytes(left);
        const right = NUMBER_TEST_CASES[j].val;
        const rightBytes = getBytes(right);
        expect(compare(leftBytes.asc, rightBytes.asc)).to.equal(
          i === j ? 0 : -1,
          `Ascending order: ${left} vs ${right}`
        );
        expect(compare(leftBytes.desc, rightBytes.desc)).to.equal(
          i === j ? 0 : 1,
          `Descending order: ${left} vs ${right}`
        );
      }
    }
  });
});

function fromHex(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let c = 0; c < hexString.length; c += 2) {
    bytes[c / 2] = parseInt(hexString.substr(c, 2), 16);
  }
  return bytes;
}

function compare(left: Uint8Array, right: Uint8Array): number {
  for (let i = 0; i < Math.min(left.length, right.length); ++i) {
    if (left[i] < right[i]) {
      return -1;
    }
    if (left[i] > right[i]) {
      return 1;
    }
  }
  return left.length - right.length;
}

function getBytes(val: unknown): { asc: Uint8Array; desc: Uint8Array } {
  const ascWriter = new OrderedCodeWriter();
  const descWriter = new OrderedCodeWriter();
  if (typeof val === 'number') {
    ascWriter.writeNumberAscending(val);
    descWriter.writeNumberDescending(val);
  } else {
    throw new Error('Encoding not yet supported for ' + val);
  }
  return { asc: ascWriter.encodedBytes(), desc: descWriter.encodedBytes() };
}
