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

import {
  byteLength,
  charLength,
  constant,
  endsWith,
  field,
  like,
  regexContains,
  regexMatch,
  startsWith,
  strConcat,
  strContains
} from '../../../../src/lite-api/expressions';
import { Bytes } from '../../../../src';
import { FALSE_VALUE, TRUE_VALUE } from '../../../../src/model/values';
import { evaluateToValue, expectEqual } from './utils';

describe('String Functions', () => {
  describe('byteLength', () => {
    it('emptyString', () => {
      expectEqual(evaluateToValue(byteLength(constant(''))), constant(0));
    });

    it('emptyByte', () => {
      expectEqual(
        evaluateToValue(
          byteLength(constant(Bytes.fromUint8Array(new Uint8Array())))
        ),
        constant(0)
      );
    });

    it('nonStringOrBytes_returnsError', () => {
      expect(evaluateToValue(byteLength(constant(123)))).to.be.undefined;
    });

    it('highSurrogateOnly', () => {
      const s = '\uD83C'; // high surrogate, missing low surrogate
      expect(evaluateToValue(byteLength(constant(s)))).to.be.undefined;
    });

    it('lowSurrogateOnly', () => {
      const s = '\uDF53'; // low surrogate, missing high surrogate
      expect(evaluateToValue(byteLength(constant(s)))).to.be.undefined;
    });

    it('lowAndHighSurrogate_swapped', () => {
      const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
      expect(evaluateToValue(byteLength(constant(s)))).to.be.undefined;
    });

    it('ascii', () => {
      expectEqual(evaluateToValue(byteLength(constant('abc'))), constant(3));
      expectEqual(evaluateToValue(byteLength(constant('1234'))), constant(4));
      expectEqual(
        evaluateToValue(byteLength(constant('abc123!@'))),
        constant(8)
      );
    });

    it('largeString', () => {
      expectEqual(
        evaluateToValue(byteLength(constant('a'.repeat(1500)))),
        constant(1500)
      );
      expectEqual(
        evaluateToValue(byteLength(constant('ab'.repeat(1500)))),
        constant(3000)
      );
    });

    it('twoBytes_perCharacter', () => {
      expectEqual(evaluateToValue(byteLength(constant('éçñöü'))), constant(10));
      expectEqual(
        evaluateToValue(
          byteLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('éçñöü')))
          )
        ),
        constant(10)
      );
    });

    it('threeBytes_perCharacter', () => {
      expectEqual(
        evaluateToValue(byteLength(constant('你好世界'))),
        constant(12)
      );
      expectEqual(
        evaluateToValue(
          byteLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('你好世界')))
          )
        ),
        constant(12)
      );
    });

    it('fourBytes_perCharacter', () => {
      expectEqual(evaluateToValue(byteLength(constant('🀘🂡'))), constant(8));
      expectEqual(
        evaluateToValue(
          byteLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('🀘🂡')))
          )
        ),
        constant(8)
      );
    });

    it('mixOfDifferentEncodedLengths', () => {
      expectEqual(evaluateToValue(byteLength(constant('aé好🂡'))), constant(10));
      expectEqual(
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
      expectEqual(evaluateToValue(charLength(constant(''))), constant(0));
    });

    it('bytesType_returnsError', () => {
      expect(
        evaluateToValue(
          charLength(
            constant(Bytes.fromUint8Array(new TextEncoder().encode('abc')))
          )
        )
      ).to.be.undefined;
    });

    it('baseCase_bmp', () => {
      expectEqual(evaluateToValue(charLength(constant('abc'))), constant(3));
      expectEqual(evaluateToValue(charLength(constant('1234'))), constant(4));
      expectEqual(
        evaluateToValue(charLength(constant('abc123!@'))),
        constant(8)
      );
      expectEqual(
        evaluateToValue(charLength(constant('你好世界'))),
        constant(4)
      );
      expectEqual(
        evaluateToValue(charLength(constant('cafétéria'))),
        constant(9)
      );
      expectEqual(evaluateToValue(charLength(constant('абвгд'))), constant(5));
      expectEqual(
        evaluateToValue(charLength(constant('¡Hola! ¿Cómo estás?'))),
        constant(19)
      );
      expectEqual(evaluateToValue(charLength(constant('☺'))), constant(1));
    });

    it('spaces', () => {
      expectEqual(evaluateToValue(charLength(constant(''))), constant(0));
      expectEqual(evaluateToValue(charLength(constant(' '))), constant(1));
      expectEqual(evaluateToValue(charLength(constant('  '))), constant(2));
      expectEqual(evaluateToValue(charLength(constant('a b'))), constant(3));
    });

    it('specialCharacters', () => {
      expectEqual(evaluateToValue(charLength(constant('\n'))), constant(1));
      expectEqual(evaluateToValue(charLength(constant('\t'))), constant(1));
      expectEqual(evaluateToValue(charLength(constant('\\'))), constant(1));
    });

    it('bmp_smp_mix', () => {
      const s = 'Hello\uD83D\uDE0A'; // Hello followed by emoji
      expectEqual(evaluateToValue(charLength(constant(s))), constant(6));
    });

    it('smp', () => {
      const s = '\uD83C\uDF53\uD83C\uDF51'; // a strawberry and peach emoji
      expectEqual(evaluateToValue(charLength(constant(s))), constant(2));
    });

    it('highSurrogateOnly', () => {
      const s = '\uD83C'; // high surrogate, missing low surrogate
      expectEqual(evaluateToValue(charLength(constant(s))), constant(1));
    });

    it('lowSurrogateOnly', () => {
      const s = '\uDF53'; // low surrogate, missing high surrogate
      expectEqual(evaluateToValue(charLength(constant(s))), constant(1));
    });

    it('lowAndHighSurrogate_swapped', () => {
      const s = '\uDF53\uD83C'; // swapped high with low, invalid sequence
      expectEqual(evaluateToValue(charLength(constant(s))), constant(2));
    });

    it('largeString', () => {
      expectEqual(
        evaluateToValue(charLength(constant('a'.repeat(1500)))),
        constant(1500)
      );
      expectEqual(
        evaluateToValue(charLength(constant('ab'.repeat(1500)))),
        constant(3000)
      );
    });
  }); // end describe('charLength')

  describe('concat', () => {
    it('multipleStringChildren_returnsCombination', () => {
      expectEqual(
        evaluateToValue(
          strConcat(constant('foo'), constant(' '), constant('bar'))
        ),
        constant('foo bar'),
        `strConcat('foo', ' ', 'bar')`
      );
    });

    it('multipleNonStringChildren_returnsError', () => {
      expect(
        evaluateToValue(
          strConcat(constant('foo'), constant(42), constant('bar'))
        )
      ).to.be.undefined;
    });

    it('multipleCalls', () => {
      const func = strConcat(constant('foo'), constant(' '), constant('bar'));
      expectEqual(evaluateToValue(func), constant('foo bar'), 'First call');
      expectEqual(evaluateToValue(func), constant('foo bar'), 'Second call');
      expectEqual(evaluateToValue(func), constant('foo bar'), 'Third call');
    });

    it('largeNumberOfInputs', () => {
      const args = [];
      for (let i = 0; i < 500; i++) {
        args.push(constant('a'));
      }
      expectEqual(
        evaluateToValue(strConcat(args[0], args[1], ...args.slice(2))),
        constant('a'.repeat(500))
      );
    });

    it('largeStrings', () => {
      const func = strConcat(
        constant('a'.repeat(500)),
        constant('b'.repeat(500)),
        constant('c'.repeat(500))
      );
      expectEqual(
        evaluateToValue(func),
        constant('a'.repeat(500) + 'b'.repeat(500) + 'c'.repeat(500))
      );
    });
  }); // end describe('concat')

  describe('endsWith', () => {
    it('get_nonStringValue_isError', () => {
      expect(evaluateToValue(endsWith(constant(42), constant('search')))).to.be
        .undefined;
    });

    it('get_nonStringSuffix_isError', () => {
      expect(evaluateToValue(endsWith(constant('search'), constant(42)))).to.be
        .undefined;
    });

    it('get_emptyInputs_returnsTrue', () => {
      expect(
        evaluateToValue(endsWith(constant(''), constant('')))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('get_emptyValue_returnsFalse', () => {
      expect(
        evaluateToValue(endsWith(constant(''), constant('v')))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('get_emptySuffix_returnsTrue', () => {
      expect(
        evaluateToValue(endsWith(constant('value'), constant('')))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('get_returnsTrue', () => {
      expect(
        evaluateToValue(endsWith(constant('search'), constant('rch')))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('get_returnsFalse', () => {
      expect(
        evaluateToValue(endsWith(constant('search'), constant('rcH')))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('get_largeSuffix_returnsFalse', () => {
      expect(
        evaluateToValue(
          endsWith(constant('val'), constant('a very long suffix'))
        )
      ).to.deep.equal(FALSE_VALUE);
    });
  }); // end describe('endsWith')

  describe('like', () => {
    it('get_nonStringLike_isError', () => {
      expect(evaluateToValue(like(constant(42), constant('search')))).to.be
        .undefined;
    });

    it('get_nonStringValue_isError', () => {
      expect(evaluateToValue(like(constant('ear'), constant(42)))).to.be
        .undefined;
    });

    it('get_staticLike', () => {
      const func = like(constant('yummy food'), constant('%food'));
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
    });

    it('get_emptySearchString', () => {
      const func = like(constant(''), constant('%hi%'));
      expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
    });

    it('get_emptyLike', () => {
      const func = like(constant('yummy food'), constant(''));
      expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
    });

    it('get_escapedLike', () => {
      const func = like(constant('yummy food??'), constant('%food??'));
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
    });

    it('get_dynamicLike', () => {
      const func = like(constant('yummy food'), field('regex'));
      expect(evaluateToValue(func, { regex: 'yummy%' })).to.deep.equal(
        TRUE_VALUE
      );
      expect(evaluateToValue(func, { regex: 'food%' })).to.deep.equal(
        FALSE_VALUE
      );
      expect(evaluateToValue(func, { regex: 'yummy_food' })).to.deep.equal(
        TRUE_VALUE
      );
    });
  }); // end describe('like')

  describe('regexContains', () => {
    it('get_nonStringRegex_isError', () => {
      expect(evaluateToValue(regexContains(constant(42), constant('search'))))
        .to.be.undefined;
    });

    it('get_nonStringValue_isError', () => {
      expect(evaluateToValue(regexContains(constant('ear'), constant(42)))).to
        .be.undefined;
    });

    it('get_invalidRegex_isError', () => {
      const func = regexContains(constant('abcabc'), constant('(abc)\\1'));
      expect(evaluateToValue(func)).to.be.undefined;
      expect(evaluateToValue(func)).to.be.undefined;
      expect(evaluateToValue(func)).to.be.undefined;
    });

    it('get_staticRegex', () => {
      const func = regexContains(constant('yummy food'), constant('.*oo.*'));
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
    });

    it('get_subString_literal', () => {
      const func = regexContains(constant('yummy good food'), constant('good'));
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
    });

    it('get_subString_regex', () => {
      const func = regexContains(constant('yummy good food'), constant('go*d'));
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
    });

    it('get_dynamicRegex', () => {
      const func = regexContains(constant('yummy food'), field('regex'));
      expect(evaluateToValue(func, { regex: '^yummy.*' })).to.deep.equal(
        TRUE_VALUE
      );
      expect(evaluateToValue(func, { regex: 'fooood$' })).to.deep.equal(
        FALSE_VALUE
      );
      expect(evaluateToValue(func, { regex: '.*' })).to.deep.equal(TRUE_VALUE);
    });
  }); // end describe('regexContains')

  describe('regexMatch', () => {
    it('get_nonStringRegex_isError', () => {
      expect(evaluateToValue(regexMatch(constant(42), constant('search')))).to
        .be.undefined;
    });

    it('get_nonStringValue_isError', () => {
      expect(evaluateToValue(regexMatch(constant('ear'), constant(42)))).to.be
        .undefined;
    });

    it('get_invalidRegex_isError', () => {
      const func = regexMatch(constant('abcabc'), constant('(abc)\\1'));
      expect(evaluateToValue(func)).to.be.undefined;
      expect(evaluateToValue(func)).to.be.undefined;
      expect(evaluateToValue(func)).to.be.undefined;
    });

    it('get_staticRegex', () => {
      const func = regexMatch(constant('yummy food'), constant('.*oo.*'));
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
      expect(evaluateToValue(func)).to.deep.equal(TRUE_VALUE);
    });

    it('get_subString_literal', () => {
      const func = regexMatch(constant('yummy good food'), constant('good'));
      expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
    });

    it('get_subString_regex', () => {
      const func = regexMatch(constant('yummy good food'), constant('go*d'));
      expect(evaluateToValue(func)).to.deep.equal(FALSE_VALUE);
    });

    it('get_dynamicRegex', () => {
      const func = regexMatch(constant('yummy food'), field('regex'));
      expect(evaluateToValue(func, { regex: '^yummy.*' })).to.deep.equal(
        TRUE_VALUE
      );
      expect(evaluateToValue(func, { regex: 'fooood$' })).to.deep.equal(
        FALSE_VALUE
      );
      expect(evaluateToValue(func, { regex: '.*' })).to.deep.equal(TRUE_VALUE);
    });
  }); // end describe('regexMatch')

  describe('startsWith', () => {
    it('get_nonStringValue_isError', () => {
      expect(evaluateToValue(startsWith(constant(42), constant('search')))).to
        .be.undefined;
    });

    it('get_nonStringPrefix_isError', () => {
      expect(evaluateToValue(startsWith(constant('search'), constant(42)))).to
        .be.undefined;
    });

    it('get_emptyInputs_returnsTrue', () => {
      expect(
        evaluateToValue(startsWith(constant(''), constant('')))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('get_emptyValue_returnsFalse', () => {
      expect(
        evaluateToValue(startsWith(constant(''), constant('v')))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('get_emptyPrefix_returnsTrue', () => {
      expect(
        evaluateToValue(startsWith(constant('value'), constant('')))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('get_returnsTrue', () => {
      expect(
        evaluateToValue(startsWith(constant('search'), constant('sea')))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('get_returnsFalse', () => {
      expect(
        evaluateToValue(startsWith(constant('search'), constant('Sea')))
      ).to.deep.equal(FALSE_VALUE);
    });

    it('get_largePrefix_returnsFalse', () => {
      expect(
        evaluateToValue(
          startsWith(constant('val'), constant('a very long prefix'))
        )
      ).to.deep.equal(FALSE_VALUE);
    });
  }); // end describe('startsWith')

  describe('strContains', () => {
    it('value_nonString_isError', () => {
      expect(evaluateToValue(strContains(constant(42), constant('value')))).to
        .be.undefined;
    });

    it('subString_nonString_isError', () => {
      expect(
        evaluateToValue(strContains(constant('search space'), constant(42)))
      ).to.be.undefined;
    });

    it('execute_true', () => {
      expect(
        evaluateToValue(strContains(constant('abc'), constant('c')))
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(strContains(constant('abc'), constant('bc')))
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(strContains(constant('abc'), constant('abc')))
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(strContains(constant('abc'), constant('')))
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(strContains(constant(''), constant('')))
      ).to.deep.equal(TRUE_VALUE);
      expect(
        evaluateToValue(strContains(constant('☃☃☃'), constant('☃')))
      ).to.deep.equal(TRUE_VALUE);
    });

    it('execute_false', () => {
      expect(
        evaluateToValue(strContains(constant('abc'), constant('abcd')))
      ).to.deep.equal(FALSE_VALUE);
      expect(
        evaluateToValue(strContains(constant('abc'), constant('d')))
      ).to.deep.equal(FALSE_VALUE);
      expect(
        evaluateToValue(strContains(constant(''), constant('a')))
      ).to.deep.equal(FALSE_VALUE);
      expect(
        evaluateToValue(strContains(constant(''), constant('abcde')))
      ).to.deep.equal(FALSE_VALUE);
    });
  }); // end describe('strContains')
}); // end describe('String Functions')
