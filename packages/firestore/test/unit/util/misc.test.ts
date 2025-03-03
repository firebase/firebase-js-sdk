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

describe('CompareUtf8Strings', () => {
  it('compareUtf8Strings should return correct results', () => {
    const errors = [];
    const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    let passCount = 0;
    const stringGenerator = new StringGenerator(new Random(seed), 0.33, 20);
    const stringPairGenerator = new StringPairGenerator(stringGenerator);

    for (let i = 0; i < 1000000 && errors.length < 10; i++) {
      const { s1, s2 } = stringPairGenerator.next();

      const actual = compareUtf8Strings(s1, s2);
      const expected = Buffer.from(s1, 'utf8').compare(Buffer.from(s2, 'utf8'));

      if (actual === expected) {
        passCount++;
      } else {
        errors.push(
          `compareUtf8Strings(s1="${s1}", s2="${s2}") returned ${actual}, ` +
            `but expected ${expected} (i=${i}, s1.length=${s1.length}, s2.length=${s2.length})`
        );
      }
    }

    if (errors.length > 0) {
      console.error(
        `${errors.length} test cases failed, ${passCount} test cases passed, seed=${seed};`
      );
      errors.forEach((error, index) =>
        console.error(`errors[${index}]: ${error}`)
      );
      throw new Error('Test failed');
    }
  }).timeout(20000);

  class StringPair {
    constructor(readonly s1: string, readonly s2: string) {}
  }

  class StringPairGenerator {
    constructor(private stringGenerator: StringGenerator) {}

    next(): StringPair {
      const prefix = this.stringGenerator.next();
      const s1 = prefix + this.stringGenerator.next();
      const s2 = prefix + this.stringGenerator.next();
      return new StringPair(s1, s2);
    }
  }

  class StringGenerator {
    private static readonly DEFAULT_SURROGATE_PAIR_PROBABILITY = 0.33;
    private static readonly DEFAULT_MAX_LENGTH = 20;

    // Pseudo-random number generator. Seed can be set for repeatable tests.
    private readonly rnd: Random;
    private readonly surrogatePairProbability: number;
    private readonly maxLength: number;

    constructor(seed: number);
    constructor(
      rnd: Random,
      surrogatePairProbability: number,
      maxLength: number
    );
    constructor(
      seedOrRnd: number | Random,
      surrogatePairProbability?: number,
      maxLength?: number
    ) {
      if (typeof seedOrRnd === 'number') {
        this.rnd = new Random(seedOrRnd);
        this.surrogatePairProbability =
          StringGenerator.DEFAULT_SURROGATE_PAIR_PROBABILITY;
        this.maxLength = StringGenerator.DEFAULT_MAX_LENGTH;
      } else {
        this.rnd = seedOrRnd;
        this.surrogatePairProbability = StringGenerator.validateProbability(
          surrogatePairProbability!
        );
        this.maxLength = StringGenerator.validateLength(maxLength!);
      }
    }

    private static validateProbability(probability: number): number {
      if (!Number.isFinite(probability)) {
        throw new Error(
          `invalid surrogate pair probability: ${probability} (must be between 0.0 and 1.0, inclusive)`
        );
      } else if (probability < 0.0) {
        throw new Error(
          `invalid surrogate pair probability: ${probability} (must be greater than or equal to zero)`
        );
      } else if (probability > 1.0) {
        throw new Error(
          `invalid surrogate pair probability: ${probability} (must be less than or equal to 1)`
        );
      }
      return probability;
    }

    private static validateLength(length: number): number {
      if (length < 0) {
        throw new Error(
          `invalid maximum string length: ${length} (must be greater than or equal to zero)`
        );
      }
      return length;
    }

    next(): string {
      const length = this.rnd.nextInt(this.maxLength + 1);
      const sb = new StringBuilder();
      while (sb.length() < length) {
        const codePoint = this.nextCodePoint();
        sb.appendCodePoint(codePoint);
      }
      return sb.toString();
    }

    private isNextSurrogatePair(): boolean {
      return StringGenerator.nextBoolean(
        this.rnd,
        this.surrogatePairProbability
      );
    }

    private static nextBoolean(rnd: Random, probability: number): boolean {
      if (probability === 0.0) {
        return false;
      } else if (probability === 1.0) {
        return true;
      } else {
        return rnd.nextFloat() < probability;
      }
    }

    private nextCodePoint(): number {
      if (this.isNextSurrogatePair()) {
        return this.nextSurrogateCodePoint();
      } else {
        return this.nextNonSurrogateCodePoint();
      }
    }

    private nextSurrogateCodePoint(): number {
      const highSurrogateMin = 0xd800;
      const highSurrogateMax = 0xdbff;
      const lowSurrogateMin = 0xdc00;
      const lowSurrogateMax = 0xdfff;

      const highSurrogate = this.nextCodePointRange(
        highSurrogateMin,
        highSurrogateMax
      );
      const lowSurrogate = this.nextCodePointRange(
        lowSurrogateMin,
        lowSurrogateMax
      );

      return (
        (highSurrogate - 0xd800) * 0x400 + (lowSurrogate - 0xdc00) + 0x10000
      );
    }

    private nextNonSurrogateCodePoint(): number {
      let codePoint;
      do {
        codePoint = this.nextCodePointRange(0, 0xffff); // BMP range
      } while (codePoint >= 0xd800 && codePoint <= 0xdfff); // Exclude surrogate range

      return codePoint;
    }

    private nextCodePointRange(min: number, max: number): number {
      const rangeSize = max - min + 1;
      const offset = this.rnd.nextInt(rangeSize);
      return min + offset;
    }
  }

  class Random {
    private seed: number;

    constructor(seed: number) {
      this.seed = seed;
    }

    nextInt(max: number): number {
      // Update the seed with pseudo-randomized numbers using a Linear Congruential Generator (LCG).
      this.seed = (this.seed * 9301 + 49297) % 233280;
      const rnd = this.seed / 233280;
      return Math.floor(rnd * max);
    }

    nextFloat(): number {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    }
  }

  class StringBuilder {
    private buffer: string[] = [];

    append(str: string): StringBuilder {
      this.buffer.push(str);
      return this;
    }

    appendCodePoint(codePoint: number): StringBuilder {
      this.buffer.push(String.fromCodePoint(codePoint));
      return this;
    }

    toString(): string {
      return this.buffer.join('');
    }

    length(): number {
      return this.buffer.join('').length;
    }
  }
});
