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

import { Bytes } from '../../../../src';
import {
  byteLength,
  charLength,
  constant,
  endsWith,
  field,
  like,
  regexContains,
  regexMatch,
  reverse,
  startsWith,
  stringConcat,
  stringContains
} from '../../../../src/lite-api/expressions';
import { FALSE_VALUE, TRUE_VALUE } from '../../../../src/model/values';

import { evaluateToValue, expectEqualToConstant } from './utils';

describe('String Functions', () => {
  describe('byteLength', () => {
    it('emptyString', () => {
      expectEqualToConstant(
        evaluateToValue(byteLength(constant(''))),
        constant(0)
      );
    });

    it('emptyByte', () => {
      expectEqualToConstant(
        evaluateToValue(
          byteLength(constant(Bytes.fromUint8Array(new Uint8Array())))
        ),
        constant(0)
      );
    });

    it('nonStringOrBytes_returnsError', () => {
      expect(evaluateToValue(byteLength(constant(123)))).toBeUndefined();
    });

    it('highSurrogateOnly', () => {
      const s = '\uD83C'; // high surrogate, missing low surrogate
      expect(evaluateToValue(byteLength(constant(s)))).toBeUndefined();
    });

    it('lowSurrogateOnly', () => {
      const s = '\uDF53'; // low surrogate, missing high surrogate
      expect(evaluateToValue(byteLength(constant(s)))).toBeUndefined();
    });

    it('lowAndHighSurrogate_swapped', () => {
      const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
      expect(evaluateToValue(byteLength(constant(s)))).toBeUndefined();
    });

    it('ascii', () => {
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('abc'))),
        constant(3)
      );
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('1234'))),
        constant(4)
      );
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('abc123!@'))),
        constant(8)
      );
    });

    it('largeString', () => {
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('a'.repeat(1500)))),
        constant(1500)
      );
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('ab'.repeat(1500)))),
        constant(3000)
      );
    });

    it('twoBytes_perCharacter', () => {
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('éçñöü'))),
        constant(10)
      );
      expectEqualToConstant(
        evaluateToValue(
          byteLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('éçñöü')))
          )
        ),
        constant(10)
      );
    });

    it('threeBytes_perCharacter', () => {
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('你好世界'))),
        constant(12)
      );
      expectEqualToConstant(
        evaluateToValue(
          byteLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('你好世界')))
          )
        ),
        constant(12)
      );
    });

    it('fourBytes_perCharacter', () => {
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('🀘🂡'))),
        constant(8)
      );
      expectEqualToConstant(
        evaluateToValue(
          byteLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('🀘🂡')))
          )
        ),
        constant(8)
      );
    });

    it('mixOfDifferentEncodedLengths', () => {
      expectEqualToConstant(
        evaluateToValue(byteLength(constant('aé好🂡'))),
        constant(10)
      );
      expectEqualToConstant(
        evaluateToValue(
          byteLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('aé好🂡')))
          )
        ),
        constant(10)
      );
    });
  }); // end describe('byteLength')

  describe('charLength', () => {
    it('emptyString', () => {
      expectEqualToConstant(
        evaluateToValue(charLength(constant(''))),
        constant(0)
      );
    });

    it('bytesType_returnsError', () => {
      expect(
        evaluateToValue(
          charLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('abc')))
          )
        )
      ).toBeUndefined();
    });

    it('baseCase_bmp', () => {
      expectEqualToConstant(
        evaluateToValue(charLength(constant('abc'))),
        constant(3)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('1234'))),
        constant(4)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('abc123!@'))),
        constant(8)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('你好世界'))),
        constant(4)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('cafétéria'))),
        constant(9)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('абвгд'))),
        constant(5)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('¡Hola! ¿Cómo estás?'))),
        constant(19)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('☺'))),
        constant(1)
      );
    });

    it('spaces', () => {
      expectEqualToConstant(
        evaluateToValue(charLength(constant(''))),
        constant(0)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant(' '))),
        constant(1)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('  '))),
        constant(2)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('a b'))),
        constant(3)
      );
    });

    it('specialCharacters', () => {
      expectEqualToConstant(
        evaluateToValue(charLength(constant('\n'))),
        constant(1)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('\t'))),
        constant(1)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('\\'))),
        constant(1)
      );
    });

    it('bmp_smp_mix', () => {
      const s = 'Hello\uD83D\uDE0A'; // Hello followed by emoji
      expectEqualToConstant(
        evaluateToValue(charLength(constant(s))),
        constant(6)
      );
    });

    it('smp', () => {
      const s = '\uD83C\uDF53\uD83C\uDF51'; // a strawberry and peach emoji
      expectEqualToConstant(
        evaluateToValue(charLength(constant(s))),
        constant(2)
      );
    });

    it('highSurrogateOnly', () => {
      const s = '\uD83C'; // high surrogate, missing low surrogate
      expectEqualToConstant(
        evaluateToValue(charLength(constant(s))),
        constant(1)
      );
    });

    it('lowSurrogateOnly', () => {
      const s = '\uDF53'; // low surrogate, missing high surrogate
      expectEqualToConstant(
        evaluateToValue(charLength(constant(s))),
        constant(1)
      );
    });

    it('lowAndHighSurrogate_swapped', () => {
      const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
      expectEqualToConstant(
        evaluateToValue(charLength(constant(s))),
        constant(2)
      );
    });

    it('largeString', () => {
      expectEqualToConstant(
        evaluateToValue(charLength(constant('a'.repeat(1500)))),
        constant(1500)
      );
      expectEqualToConstant(
        evaluateToValue(charLength(constant('ab'.repeat(1500)))),
        constant(3000)
      );
    });
  }); // end describe('charLength')

  describe('concat', () => {
    it('multipleStringChildren_returnsCombination', () => {
      expectEqualToConstant(
        evaluateToValue(
          stringConcat(constant('foo'), constant(' '), constant('bar'))
        ),
        constant('foo bar'),
        `stringConcat('foo', ' ', 'bar')`
      );
    });

    it('multipleNonStringChildren_returnsError', () => {
      expect(
        evaluateToValue(
          stringConcat(constant('foo'), constant(42), constant('bar'))
        )
      ).toBeUndefined();
    });

    it('multipleCalls', () => {
      const func = stringConcat(
        constant('foo'),
        constant(' '),
        constant('bar')
      );
      expectEqualToConstant(
        evaluateToValue(func),
        constant('foo bar'),
        'First call'
      );
      expectEqualToConstant(
        evaluateToValue(func),
        constant('foo bar'),
        'Second call'
      );
      expectEqualToConstant(
        evaluateToValue(func),
        constant('foo bar'),
        'Third call'
      );
    });

    it('largeNumberOfInputs', () => {
      const args = [];
      for (let i = 0; i < 500; i++) {
        args.push(constant('a'));
      }
      expectEqualToConstant(
        evaluateToValue(stringConcat(args[0], args[1], ...args.slice(2))),
        constant('a'.repeat(500))
      );
    });

    it('largeStrings', () => {
      const func = stringConcat(
        constant('a'.repeat(500)),
        constant('b'.repeat(500)),
        constant('c'.repeat(500))
      );
      expectEqualToConstant(
        evaluateToValue(func),
        constant('a'.repeat(500) + 'b'.repeat(500) + 'c'.repeat(500))
      );
    });
  }); // end describe('concat')

  describe('endsWith', () => {
    it('get_nonStringValue_isError', () => {
      expect(
        evaluateToValue(endsWith(constant(42), constant('search')))
      ).toBeUndefined();
    });

    it('get_nonStringSuffix_isError', () => {
      expect(
        evaluateToValue(endsWith(constant('search'), constant(42)))
      ).toBeUndefined();
    });

    it('get_emptyInputs_returnsTrue', () => {
      expect(evaluateToValue(endsWith(constant(''), constant('')))).toEqual(
        TRUE_VALUE
      );
    });

    it('get_emptyValue_returnsFalse', () => {
      expect(evaluateToValue(endsWith(constant(''), constant('v')))).toEqual(
        FALSE_VALUE
      );
    });

    it('get_emptySuffix_returnsTrue', () => {
      expect(
        evaluateToValue(endsWith(constant('value'), constant('')))
      ).toEqual(TRUE_VALUE);
    });

    it('get_returnsTrue', () => {
      expect(
        evaluateToValue(endsWith(constant('search'), constant('rch')))
      ).toEqual(TRUE_VALUE);
    });

    it('get_returnsFalse', () => {
      expect(
        evaluateToValue(endsWith(constant('search'), constant('rcH')))
      ).toEqual(FALSE_VALUE);
    });

    it('get_largeSuffix_returnsFalse', () => {
      expect(
        evaluateToValue(
          endsWith(constant('val'), constant('a very long suffix'))
        )
      ).toEqual(FALSE_VALUE);
    });
  }); // end describe('endsWith')

  describe('like', () => {
    it('get_nonStringLike_isError', () => {
      expect(
        evaluateToValue(like(constant(42), constant('search')))
      ).toBeUndefined();
    });

    it('get_nonStringValue_isError', () => {
      expect(
        evaluateToValue(like(constant('ear'), constant(42)))
      ).toBeUndefined();
    });

    it('get_staticLike', () => {
      const func = like(constant('yummy food'), constant('%food'));
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
    });

    it('get_emptySearchString', () => {
      const func = like(constant(''), constant('%hi%'));
      expect(evaluateToValue(func)).toEqual(FALSE_VALUE);
    });

    it('get_emptyLike', () => {
      const func = like(constant('yummy food'), constant(''));
      expect(evaluateToValue(func)).toEqual(FALSE_VALUE);
    });

    it('get_escapedLike', () => {
      const func = like(constant('yummy food??'), constant('%food??'));
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
    });

    it('get_dynamicLike', () => {
      const func = like(constant('yummy food'), field('regex'));
      expect(evaluateToValue(func, { regex: 'yummy%' })).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func, { regex: 'food%' })).toEqual(FALSE_VALUE);
      expect(evaluateToValue(func, { regex: 'yummy_food' })).toEqual(
        TRUE_VALUE
      );
    });
  }); // end describe('like')

  describe('regexContains', () => {
    it('get_nonStringRegex_isError', () => {
      expect(
        evaluateToValue(regexContains(constant(42), constant('search')))
      ).toBeUndefined();
    });

    it('get_nonStringValue_isError', () => {
      expect(
        evaluateToValue(regexContains(constant('ear'), constant(42)))
      ).toBeUndefined();
    });

    it('get_invalidRegex_isError', () => {
      const func = regexContains(constant('abcabc'), constant('(abc)\\1'));
      expect(evaluateToValue(func)).toBeUndefined();
      expect(evaluateToValue(func)).toBeUndefined();
      expect(evaluateToValue(func)).toBeUndefined();
    });

    it('get_staticRegex', () => {
      const func = regexContains(constant('yummy food'), constant('.*oo.*'));
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
    });

    it('get_subString_literal', () => {
      const func = regexContains(constant('yummy good food'), constant('good'));
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
    });

    it('get_subString_regex', () => {
      const func = regexContains(constant('yummy good food'), constant('go*d'));
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
    });

    it('get_dynamicRegex', () => {
      const func = regexContains(constant('yummy food'), field('regex'));
      expect(evaluateToValue(func, { regex: '^yummy.*' })).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func, { regex: 'fooood$' })).toEqual(FALSE_VALUE);
      expect(evaluateToValue(func, { regex: '.*' })).toEqual(TRUE_VALUE);
    });
  }); // end describe('regexContains')

  describe('regexMatch', () => {
    it('get_nonStringRegex_isError', () => {
      expect(
        evaluateToValue(regexMatch(constant(42), constant('search')))
      ).toBeUndefined();
    });

    it('get_nonStringValue_isError', () => {
      expect(
        evaluateToValue(regexMatch(constant('ear'), constant(42)))
      ).toBeUndefined();
    });

    it('get_invalidRegex_isError', () => {
      const func = regexMatch(constant('abcabc'), constant('(abc)\\1'));
      expect(evaluateToValue(func)).toBeUndefined();
      expect(evaluateToValue(func)).toBeUndefined();
      expect(evaluateToValue(func)).toBeUndefined();
    });

    it('get_staticRegex', () => {
      const func = regexMatch(constant('yummy food'), constant('.*oo.*'));
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func)).toEqual(TRUE_VALUE);
    });

    it('get_subString_literal', () => {
      const func = regexMatch(constant('yummy good food'), constant('good'));
      expect(evaluateToValue(func)).toEqual(FALSE_VALUE);
    });

    it('get_subString_regex', () => {
      const func = regexMatch(constant('yummy good food'), constant('go*d'));
      expect(evaluateToValue(func)).toEqual(FALSE_VALUE);
    });

    it('get_dynamicRegex', () => {
      const func = regexMatch(constant('yummy food'), field('regex'));
      expect(evaluateToValue(func, { regex: '^yummy.*' })).toEqual(TRUE_VALUE);
      expect(evaluateToValue(func, { regex: 'fooood$' })).toEqual(FALSE_VALUE);
      expect(evaluateToValue(func, { regex: '.*' })).toEqual(TRUE_VALUE);
    });
  }); // end describe('regexMatch')

  describe('startsWith', () => {
    it('get_nonStringValue_isError', () => {
      expect(
        evaluateToValue(startsWith(constant(42), constant('search')))
      ).toBeUndefined();
    });

    it('get_nonStringPrefix_isError', () => {
      expect(
        evaluateToValue(startsWith(constant('search'), constant(42)))
      ).toBeUndefined();
    });

    it('get_emptyInputs_returnsTrue', () => {
      expect(evaluateToValue(startsWith(constant(''), constant('')))).toEqual(
        TRUE_VALUE
      );
    });

    it('get_emptyValue_returnsFalse', () => {
      expect(evaluateToValue(startsWith(constant(''), constant('v')))).toEqual(
        FALSE_VALUE
      );
    });

    it('get_emptyPrefix_returnsTrue', () => {
      expect(
        evaluateToValue(startsWith(constant('value'), constant('')))
      ).toEqual(TRUE_VALUE);
    });

    it('get_returnsTrue', () => {
      expect(
        evaluateToValue(startsWith(constant('search'), constant('sea')))
      ).toEqual(TRUE_VALUE);
    });

    it('get_returnsFalse', () => {
      expect(
        evaluateToValue(startsWith(constant('search'), constant('Sea')))
      ).toEqual(FALSE_VALUE);
    });

    it('get_largePrefix_returnsFalse', () => {
      expect(
        evaluateToValue(
          startsWith(constant('val'), constant('a very long prefix'))
        )
      ).toEqual(FALSE_VALUE);
    });
  }); // end describe('startsWith')

  describe('stringContains', () => {
    it('value_nonString_isError', () => {
      expect(
        evaluateToValue(stringContains(constant(42), constant('value')))
      ).toBeUndefined();
    });

    it('subString_nonString_isError', () => {
      expect(
        evaluateToValue(stringContains(constant('search space'), constant(42)))
      ).toBeUndefined();
    });

    it('execute_true', () => {
      expect(
        evaluateToValue(stringContains(constant('abc'), constant('c')))
      ).toEqual(TRUE_VALUE);
      expect(
        evaluateToValue(stringContains(constant('abc'), constant('bc')))
      ).toEqual(TRUE_VALUE);
      expect(
        evaluateToValue(stringContains(constant('abc'), constant('abc')))
      ).toEqual(TRUE_VALUE);
      expect(
        evaluateToValue(stringContains(constant('abc'), constant('')))
      ).toEqual(TRUE_VALUE);
      expect(
        evaluateToValue(stringContains(constant(''), constant('')))
      ).toEqual(TRUE_VALUE);
      expect(
        evaluateToValue(stringContains(constant('☃☃☃'), constant('☃')))
      ).toEqual(TRUE_VALUE);
    });

    it('execute_false', () => {
      expect(
        evaluateToValue(stringContains(constant('abc'), constant('abcd')))
      ).toEqual(FALSE_VALUE);
      expect(
        evaluateToValue(stringContains(constant('abc'), constant('d')))
      ).toEqual(FALSE_VALUE);
      expect(
        evaluateToValue(stringContains(constant(''), constant('a')))
      ).toEqual(FALSE_VALUE);
      expect(
        evaluateToValue(stringContains(constant(''), constant('abcde')))
      ).toEqual(FALSE_VALUE);
    });
  }); // end describe('stringContains')

  describe('reverse()', () => {
    it('reverse_onSimpleString', () => {
      expectEqualToConstant(
        evaluateToValue(reverse(constant('foobar'))),
        constant('raboof'),
        `stringReverse('foobar')`
      );
    });

    it('reverse_onSingleLengthString', () => {
      expectEqualToConstant(
        evaluateToValue(reverse(constant('t'))),
        constant('t'),
        `stringReverse('t')`
      );
    });

    it('reverse_onSingleUnicodeString', () => {
      expectEqualToConstant(
        evaluateToValue(reverse(constant('🖖🏻'))),
        constant('🖖🏻'),
        `stringReverse('🖖🏻')`
      );
    });

    it('reverse_onEmptyString', () => {
      expectEqualToConstant(
        evaluateToValue(reverse(constant(''))),
        constant(''),
        `stringReverse('')`
      );
    });

    it('reverse_onStringWithNonAscii', () => {
      // Assumes grapheme-aware reversal, treating "é", "🦆", "🖖🏻", "🌎" as individual units.
      expectEqualToConstant(
        evaluateToValue(reverse(constant('é🦆🖖🏻🌎'))),
        constant('🌎🖖🏻🦆é'),
        `stringReverse('é🦆🖖🏻🌎')`
      );
    });

    it('reverse_onStringWithAsciiAndNonAscii', () => {
      // Assumes grapheme-aware reversal.
      expectEqualToConstant(
        evaluateToValue(reverse(constant('é🦆foo🖖🏻b🌎ar'))),
        constant('ra🌎b🖖🏻oof🦆é'),
        `stringReverse('é🦆foo🖖🏻b🌎ar')`
      );
    });

    // --- Tests adapted from Java ByteString tests ---
    // These assume that if ByteString contained valid UTF-8, it's treated as a string input
    // to the TypeScript stringReverse function.

    it('reverse_onStringFromUtf8Bytes', () => {
      expectEqualToConstant(
        evaluateToValue(
          reverse(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('foo')))
          )
        ),
        constant(Bytes.fromUint8Array(new TextEncoder().encode('oof'))),
        `stringReverse('foo') (from ByteString.copyFromUtf8("foo"))`
      );
    });

    it('reverse_onEmptyStringFromEmptyBytes', () => {
      expectEqualToConstant(
        evaluateToValue(
          reverse(constant(Bytes.fromUint8Array(new TextEncoder().encode(''))))
        ),
        constant(Bytes.fromUint8Array(new TextEncoder().encode(''))),
        `stringReverse('') (from ByteString.EMPTY)`
      );
    });

    it('reverse_onSingleCharStringFromSingleByte', () => {
      expectEqualToConstant(
        evaluateToValue(
          reverse(constant(Bytes.fromUint8Array(new TextEncoder().encode('a'))))
        ),
        constant(Bytes.fromUint8Array(new TextEncoder().encode('a'))),
        `stringReverse('a') (from ByteString.copyFromUtf8("a"))`
      );
    });

    it('reverse_onBytesWithNonAsciiAndAscii (requires byte array support and byte-wise reversal)', () => {
      const inputBytes = new Uint8Array([
        ...new TextEncoder().encode('foOBaR'),
        0xf9,
        0xfa,
        0xfb,
        0xfc
      ]);
      const expectedReversedBytes = new Uint8Array([
        0xfc,
        0xfb,
        0xfa,
        0xf9,
        ...new TextEncoder().encode('RaBOof')
      ]);
      expectEqualToConstant(
        evaluateToValue(reverse(constant(Bytes.fromUint8Array(inputBytes)))),
        constant(Bytes.fromUint8Array(expectedReversedBytes))
      );
    });

    it('reverse_onUnsupportedType', () => {
      expect(evaluateToValue(reverse(constant(1)))).toBeUndefined();
    });
  }); // end describe('stringReverse')
}); // end describe('String Functions')
