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
import { hardAssert } from '../../../src/util/assert';
import { ByteString } from '../../../src/util/byte_string';

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

const STRING_TEST_CASES: Array<ValueTestCase<string>> = [
  new ValueTestCase('', '0001', 'fffe'),
  new ValueTestCase('\u0000', '00ff0001', 'ff00fffe'),
  new ValueTestCase('\u0000\u0000', '00ff00ff0001', 'ff00ff00fffe'),
  new ValueTestCase('abc', '6162630001', '9e9d9cfffe'),
  new ValueTestCase(
    'xy¢z𠜎€𠜱あ𠝹',
    '7879c2a27af0a09c8ee282acf0a09cb1e38182f0a09db90001',
    '87863d5d850f5f63711d7d530f5f634e1c7e7d0f5f6246fffe'
  ),
  new ValueTestCase(
    '¬˚ß∂∆ç',
    'c2accb9ac39fe28882e28886c3a70001',
    '3d5334653c601d777d1d77793c58fffe'
  ),
  new ValueTestCase(
    'œ∑´´ß™£',
    'c593e28891c2b4c2b4c39fe284a2c2a30001',
    '3a6c1d776e3d4b3d4b3c601d7b5d3d5cfffe'
  ),
  new ValueTestCase(
    'πåçasdlß¬µœ∑âsldalskdåßµ∂π',
    'cf80c3a5c3a76173646cc39fc2acc2b5c593e28891c3a2736c64616c736b64c3a5c39fc2b5e28882cf800001',
    '307f3c5a3c589e8c9b933c603d533d4a3a6c1d776e3c5d8c939b9e938c949b3c5a3c603d4a1d777d307ffffe'
  ),
  new ValueTestCase(
    '†¥¬´´`',
    'e280a0c2a5c2acc2b4c2b4600001',
    '1d7f5f3d5a3d533d4b3d4b9ffffe'
  )
];

const BYTES_TEST_CASES: Array<ValueTestCase<Uint8Array>> = [
  new ValueTestCase(fromHex(''), '0001', 'fffe'),
  new ValueTestCase(fromHex('00'), '00ff0001', 'ff00fffe'),
  new ValueTestCase(fromHex('0000'), '00ff00ff0001', 'ff00ff00fffe'),
  new ValueTestCase(fromHex('0001'), '00ff010001', 'ff00fefffe'),
  new ValueTestCase(fromHex('0041'), '00ff410001', 'ff00befffe'),
  new ValueTestCase(fromHex('00ff'), '00ffff000001', 'ff0000fffffe'),
  new ValueTestCase(fromHex('01'), '010001', 'fefffe'),
  new ValueTestCase(fromHex('0100'), '0100ff0001', 'feff00fffe'),
  new ValueTestCase(fromHex('6f776c'), '6f776c0001', '908893fffe'),
  new ValueTestCase(fromHex('ff'), 'ff000001', '00fffffe'),
  new ValueTestCase(fromHex('ff00'), 'ff0000ff0001', '00ffff00fffe'),
  new ValueTestCase(fromHex('ff01'), 'ff00010001', '00fffefffe'),
  new ValueTestCase(fromHex('ffff'), 'ff00ff000001', '00ff00fffffe'),
  new ValueTestCase(fromHex('ffffff'), 'ff00ff00ff000001', '00ff00ff00fffffe')
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
    verifyEncoding(NUMBER_TEST_CASES);
  });

  it('orders numbers correctly', () => {
    verifyOrdering(NUMBER_TEST_CASES);
  });

  it('converts strings to bits', () => {
    verifyEncoding(STRING_TEST_CASES);
  });

  it('orders strings correctly', () => {
    verifyOrdering(STRING_TEST_CASES);
  });

  it('converts bytes to bits', () => {
    verifyEncoding(BYTES_TEST_CASES);
  });

  it('orders bytes correctly', () => {
    verifyOrdering(BYTES_TEST_CASES);
  });

  it('encodes infinity', () => {
    const writer = new OrderedCodeWriter();
    writer.writeInfinityAscending();
    expect(writer.encodedBytes()).to.deep.equal(fromHex('ffff'));

    writer.reset();
    writer.writeInfinityDescending();
    expect(writer.encodedBytes()).to.deep.equal(fromHex('0000'));
  });

  it('seeds bytes', () => {
    const writer = new OrderedCodeWriter();
    writer.seed(fromHex('01'));
    writer.writeInfinityAscending();
    writer.seed(fromHex('02'));
    expect(writer.encodedBytes()).to.deep.equal(fromHex('01ffff02'));
  });

  function verifyEncoding(testCases: Array<ValueTestCase<unknown>>): void {
    for (let i = 0; i < testCases.length; ++i) {
      const bytes = getBytes(testCases[i].val);
      expect(bytes.asc).to.deep.equal(
        fromHex(testCases[i].ascString),
        'Ascending for ' + testCases[i].val
      );
      expect(bytes.desc).to.deep.equal(
        fromHex(testCases[i].descString),
        'Descending for ' + testCases[i].val
      );
    }
  }

  function verifyOrdering(testCases: Array<ValueTestCase<unknown>>): void {
    for (let i = 0; i < testCases.length; ++i) {
      for (let j = i; j < testCases.length; ++j) {
        const left = testCases[i].val;
        const leftBytes = getBytes(left);
        const right = testCases[j].val;
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
  }
});

function fromHex(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
}

export function compare(left: Uint8Array, right: Uint8Array): number {
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
  } else if (typeof val === 'string') {
    ascWriter.writeUtf8Ascending(val);
    descWriter.writeUtf8Descending(val);
  } else {
    hardAssert(
      val instanceof Uint8Array,
      0xa10f,
      'val is not instance of Uint8Array',
      {
        val
      }
    );
    ascWriter.writeBytesAscending(ByteString.fromUint8Array(val));
    descWriter.writeBytesDescending(ByteString.fromUint8Array(val));
  }
  return { asc: ascWriter.encodedBytes(), desc: descWriter.encodedBytes() };
}
