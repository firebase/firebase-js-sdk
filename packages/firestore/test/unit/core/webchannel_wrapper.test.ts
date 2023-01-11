/**
 * @license
 * Copyright 2022 Google LLC
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

// Add some unit tests for classes exported from @firebase/webchannel-wrapper.
// These tests are mostly to ensure that the exported classes correctly map to
// underlying functionality from google-closure-library.

import { Md5, Integer } from '@firebase/webchannel-wrapper';
import { expect } from 'chai';

import { newTextEncoder } from '../../../src/platform/text_serializer';

describe('Md5', () => {
  // The precomputed MD5 digests of the 3-character strings "abc" and "def".
  const DIGEST_OF_ABC = Object.freeze([
    144, 1, 80, 152, 60, 210, 79, 176, 214, 150, 63, 125, 40, 225, 127, 114
  ]);
  const DIGEST_OF_DEF = Object.freeze([
    78, 217, 64, 118, 48, 235, 16, 0, 192, 246, 182, 56, 66, 222, 250, 125
  ]);
  const DIGEST_OF_SPECIAL_CHARACTERS = Object.freeze([
    52, 39, 159, 0, 195, 250, 18, 219, 221, 173, 54, 243, 4, 85, 117, 46
  ]);
  const DIGEST_OF_SPECIAL_CHARACTERS_ENCODED = Object.freeze([
    214, 128, 77, 255, 85, 207, 186, 121, 150, 50, 152, 9, 85, 67, 52, 135
  ]);

  it('constructor should create distinct instances', () => {
    const instance1 = new Md5();
    const instance2 = new Md5();
    expect(instance1).is.instanceof(Md5);
    expect(instance2).is.instanceof(Md5);
    expect(instance1).is.not.equal(instance2);
  });

  it('update() should accept a string', () => {
    const md5 = new Md5();
    md5.update('abc');
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should accept a string of non-standard characters', () => {
    const md5 = new Md5();
    md5.update('ÀÒ∑');
    expect(md5.digest()).to.deep.equal(DIGEST_OF_SPECIAL_CHARACTERS);
  });

  it('update() should accept a string of UTF-8 encoded non-standard characters ', () => {
    const md5 = new Md5();
    const encodedValue = newTextEncoder().encode('ÀÒ∑');
    md5.update(encodedValue);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_SPECIAL_CHARACTERS_ENCODED);
  });

  it('update() should accept an array of number', () => {
    const md5 = new Md5();
    md5.update([97, 98, 99]);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should accept a Uint8Array', () => {
    const md5 = new Md5();
    md5.update(Uint8Array.from([97, 98, 99]));
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should honor opt_length on a string', () => {
    const md5 = new Md5();
    md5.update('abcdef', 3);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should honor opt_length on an array of number', () => {
    const md5 = new Md5();
    md5.update([97, 98, 99, 100, 101, 102], 3);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('update() should honor opt_length on a Uint8Array', () => {
    const md5 = new Md5();
    md5.update(Uint8Array.from([97, 98, 99, 100, 101, 102]), 3);
    expect(md5.digest()).to.deep.equal(DIGEST_OF_ABC);
  });

  it('reset() should reset', () => {
    const md5 = new Md5();
    md5.update('abc');
    md5.reset();
    md5.update('def');
    expect(md5.digest()).to.deep.equal(DIGEST_OF_DEF);
  });
});

describe('Integer', () => {
  it('constructor should create distinct instances', () => {
    const instance1 = new Integer([1], 0);
    const instance2 = new Integer([1], 0);
    expect(instance1).is.instanceof(Integer);
    expect(instance2).is.instanceof(Integer);
    expect(instance1).is.not.equal(instance2);
  });

  it('constructor should construct 1 and -1, 2 and -2', () => {
    const positiveOne = new Integer([1], 0);
    expect(positiveOne.toNumber()).equals(1);
    const negativeOne = new Integer([-1], -1);
    expect(negativeOne.toNumber()).equals(-1);
    const positiveTwo = new Integer([2], 0);
    expect(positiveTwo.toNumber()).equals(2);
    const negativeTwo = new Integer([-2], -1);
    expect(negativeTwo.toNumber()).equals(-2);
  });

  it('constructor should construct big positive values', () => {
    expect(new Integer([0xff], 0).toNumber()).equals(255);
    expect(new Integer([0xffff], 0).toNumber()).equals(65535);
    expect(new Integer([0xffffff], 0).toNumber()).equals(16777215);
    expect(new Integer([0xffffffff], 0).toNumber()).equals(4294967295);
    expect(new Integer([0, 1], 0).toNumber()).equals(4294967296);
    expect(new Integer([1, 1], 0).toNumber()).equals(4294967297);
    expect(new Integer([0xfffffffe, 1], 0).toNumber()).equals(8589934590);
    expect(new Integer([0xffffffff, 1], 0).toNumber()).equals(8589934591);
    expect(new Integer([0, 2], 0).toNumber()).equals(8589934592);
    expect(new Integer([1, 2], 0).toNumber()).equals(8589934593);
    expect(
      new Integer(
        [0x992ce530, 0xbc1f3bbb, 0x2080e2ee, 0xe53c0595],
        0
      ).toString()
    ).equals('304704862073361391914321619654827369776');
  });

  it('constructor should construct big negative values', () => {
    expect(new Integer([0xffffffff], -1).toNumber()).equals(-1);
    expect(new Integer([0xfffffffe], -1).toNumber()).equals(-2);
    expect(new Integer([0xfffffffd], -1).toNumber()).equals(-3);
    expect(new Integer([0xfffffff0], -1).toNumber()).equals(-16);
    expect(new Integer([0xffffff00], -1).toNumber()).equals(-256);
    expect(new Integer([0xfffff000], -1).toNumber()).equals(-4096);
    expect(new Integer([0xffff0000], -1).toNumber()).equals(-65536);
    expect(new Integer([0xfff00000], -1).toNumber()).equals(-1048576);
    expect(new Integer([0xff000000], -1).toNumber()).equals(-16777216);
    expect(new Integer([0xf0000000], -1).toNumber()).equals(-268435456);
    expect(new Integer([0x00000001], -1).toNumber()).equals(-4294967295);
    expect(new Integer([0x00000000], -1).toNumber()).equals(-4294967296);
    expect(new Integer([0x00000000, 0xffffffff], -1).toNumber()).equals(
      -4294967296
    );
    expect(new Integer([0xffffffff, 0xfffffffe], -1).toNumber()).equals(
      -4294967297
    );
    expect(new Integer([0xfffffffe, 0xfffffffe], -1).toNumber()).equals(
      -4294967298
    );
  });

  it('add() should produce the sum of the two numbers', () => {
    expect(Integer.fromNumber(0).add(Integer.fromNumber(0)).toNumber()).equals(
      0
    );
    expect(Integer.fromNumber(1).add(Integer.fromNumber(1)).toNumber()).equals(
      2
    );
    expect(
      Integer.fromNumber(0xffffffff).add(Integer.fromNumber(1)).toNumber()
    ).equals(4294967296);
    expect(
      Integer.fromString('304704862073361391914321619654827369776')
        .add(Integer.fromString('77393247566944052149773810817307943505'))
        .toString()
    ).equals('382098109640305444064095430472135313281');
    expect(Integer.fromNumber(0).add(Integer.fromNumber(-1)).toNumber()).equals(
      -1
    );
  });

  it('multiply() should produce the product of the two numbers', () => {
    expect(
      Integer.fromNumber(0).multiply(Integer.fromNumber(0)).toNumber()
    ).equals(0);
    expect(
      Integer.fromNumber(1).multiply(Integer.fromNumber(0)).toNumber()
    ).equals(0);
    expect(
      Integer.fromNumber(1).multiply(Integer.fromNumber(1)).toNumber()
    ).equals(1);
    expect(
      Integer.fromNumber(9).multiply(Integer.fromNumber(3)).toNumber()
    ).equals(27);
    expect(
      Integer.fromNumber(0xffffffff)
        .multiply(Integer.fromNumber(0xca11ba11))
        .toString()
    ).equals('14560623649052575215');
    expect(
      Integer.fromString('304704862073361391914321619654827369776')
        .multiply(Integer.fromString('77393247566944052149773810817307943505'))
        .toString()
    ).equals(
      '23582098825295199538298333106941184620809785262540690532878112097410752504880'
    );
    expect(
      Integer.fromNumber(5).multiply(Integer.fromNumber(-1)).toNumber()
    ).equals(-5);
  });

  it('modulo() should produce the division remainder of the two numbers', () => {
    expect(() => Integer.fromNumber(0).modulo(Integer.fromNumber(0))).to.throw(
      'division by zero'
    );
    expect(() => Integer.fromNumber(42).modulo(Integer.fromNumber(0))).to.throw(
      'division by zero'
    );
    expect(
      Integer.fromNumber(20).modulo(Integer.fromNumber(1)).toNumber()
    ).equals(0);
    expect(
      Integer.fromNumber(2).modulo(Integer.fromNumber(2)).toNumber()
    ).equals(0);
    expect(
      Integer.fromNumber(3).modulo(Integer.fromNumber(2)).toNumber()
    ).equals(1);
    expect(
      Integer.fromNumber(4).modulo(Integer.fromNumber(2)).toNumber()
    ).equals(0);
    expect(
      Integer.fromNumber(0xffffffff)
        .modulo(Integer.fromNumber(0xca11ba11))
        .toNumber()
    ).equals(904807918);
    expect(
      Integer.fromString('304704862073361391914321619654827369776')
        .modulo(Integer.fromString('77393247566944052149773810817307943505'))
        .toString()
    ).equals('72525119372529235465000187202903539261');
    expect(
      Integer.fromString('304704862073361391914321619654827369776')
        .modulo(Integer.fromNumber(313))
        .toNumber()
    ).equals(167);
  });

  it('compare() should correctly compare two numbers for order', () => {
    const numbers = Object.freeze([
      Integer.fromNumber(-4294967298),
      Integer.fromNumber(-2),
      Integer.fromNumber(-1),
      Integer.fromNumber(0),
      Integer.fromNumber(1),
      Integer.fromNumber(2),
      Integer.fromNumber(0xffffffff),
      Integer.fromString('77393247566944052149773810817307943505'),
      Integer.fromString('304704862073361391914321619654827369776')
    ]);
    for (let i1 = 0; i1 < numbers.length; i1++) {
      for (let i2 = 0; i2 < numbers.length; i2++) {
        const num1 = numbers[i1];
        const num2 = numbers[i2];
        const expected = i1 === i2 ? 0 : i1 < i2 ? -1 : 1;
        expect(num1.compare(num2)).equals(expected);
      }
    }
  });

  it('toNumber() should return the correct number', () => {
    const one = Integer.fromNumber(1);
    const two = Integer.fromNumber(2);
    expect(Integer.fromNumber(0).toNumber()).equals(0);
    expect(Integer.fromNumber(1).toNumber()).equals(1);
    expect(Integer.fromNumber(-1).toNumber()).equals(-1);
    expect(Integer.fromNumber(Number.MAX_SAFE_INTEGER).toNumber()).equals(
      Number.MAX_SAFE_INTEGER
    );
    expect(Integer.fromNumber(Number.MIN_SAFE_INTEGER).toNumber()).equals(
      Number.MIN_SAFE_INTEGER
    );
    expect(
      Integer.fromNumber(Number.MAX_SAFE_INTEGER).add(one).toNumber()
    ).equals(Number.MAX_SAFE_INTEGER + 1);
    expect(
      Integer.fromNumber(Number.MAX_SAFE_INTEGER).add(two).toNumber()
    ).equals(Number.MAX_SAFE_INTEGER + 1);
  });

  it('toString() should return the correct number', () => {
    const one = Integer.fromNumber(1);
    const two = Integer.fromNumber(2);
    expect(Integer.fromNumber(0).toString()).equals('0');
    expect(Integer.fromNumber(1).toString()).equals('1');
    expect(Integer.fromNumber(-1).toString()).equals('-1');
    expect(Integer.fromNumber(Number.MAX_SAFE_INTEGER).toString()).equals(
      '9007199254740991'
    );
    expect(Integer.fromNumber(Number.MIN_SAFE_INTEGER).toString()).equals(
      '-9007199254740991'
    );
    expect(
      Integer.fromNumber(Number.MAX_SAFE_INTEGER).add(one).toString()
    ).equals('9007199254740992');
    expect(
      Integer.fromNumber(Number.MAX_SAFE_INTEGER).add(two).toString()
    ).equals('9007199254740993');
    expect(
      Integer.fromString('304704862073361391914321619654827369776').toString()
    ).equals('304704862073361391914321619654827369776');

    expect(Integer.fromNumber(0).toString(2)).equals('0');
    expect(Integer.fromNumber(43981).toString(2)).equals('1010101111001101');
    expect(Integer.fromNumber(43981).toString(8)).equals('125715');
    expect(Integer.fromNumber(43981).toString(10)).equals('43981');
    expect(Integer.fromNumber(43981).toString(16)).equals('abcd');
  });

  it('fromNumber() create a new Integer with the given value', () => {
    // The tests for toString() and toNumber() cover this method.
  });

  it('fromString() create a new Integer with the given value', () => {
    expect(Integer.fromString('0').toNumber()).equals(0);
    expect(Integer.fromString('1').toNumber()).equals(1);
    expect(Integer.fromString('-1').toNumber()).equals(-1);
    expect(Integer.fromString('42').toNumber()).equals(42);
    expect(Integer.fromString('9007199254740991').toNumber()).equals(
      Number.MAX_SAFE_INTEGER
    );
    expect(Integer.fromString('-9007199254740991').toNumber()).equals(
      Number.MIN_SAFE_INTEGER
    );
    expect(
      Integer.fromString('304704862073361391914321619654827369776').toString()
    ).equals('304704862073361391914321619654827369776');

    expect(Integer.fromString('abcd', 16).toNumber()).equals(43981);
    expect(Integer.fromString('125715', 8).toNumber()).equals(43981);
    expect(Integer.fromString('1010101111001101', 2).toNumber()).equals(43981);
  });

  it('getBits() create a new Integer with the given value', () => {
    expect(new Integer([1, 2], 0).getBits(0)).equals(1);
    expect(new Integer([1, 2], 0).getBits(1)).equals(2);
    expect(new Integer([-1, -2], -1).getBits(0)).equals(-1);
    expect(new Integer([-1, -2], -1).getBits(1)).equals(-2);
    expect(new Integer([0xff, 0xffff], 0).getBits(0)).equals(0xff);
    expect(new Integer([0xff, 0xffff], 0).getBits(1)).equals(0xffff);
  });
});
