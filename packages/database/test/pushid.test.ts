/**
 * @license
 * Copyright 2021 Google LLC
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

import { predecessor, successor } from '../src/core/util/NextPushId';
import {
  INTEGER_32_MIN,
  INTEGER_32_MAX,
  MIN_NAME,
  MAX_NAME
} from '../src/core/util/util';

// Copied from src/core/util/NextPushId.ts
const MIN_PUSH_CHAR = '-';

const MAX_PUSH_CHAR = 'z';

const MAX_KEY_LEN = 786;

describe('Push ID tests', () => {
  it('predecessor special values', () => {
    expect(predecessor('' + MIN_PUSH_CHAR)).to.equal('' + INTEGER_32_MAX);
    expect(predecessor('' + INTEGER_32_MIN)).to.equal('' + MIN_NAME);
  });

  it('predecessor basic test', () => {
    expect(predecessor('abc')).to.equal(
      'abb' + MAX_PUSH_CHAR.repeat(MAX_KEY_LEN - 'abc'.length)
    );
    expect(predecessor('abc' + MIN_PUSH_CHAR)).to.equal('abc');
  });

  it('successor special values', () => {
    expect(successor('' + INTEGER_32_MAX)).to.equal(MIN_PUSH_CHAR);
    expect(successor(MAX_PUSH_CHAR.repeat(MAX_KEY_LEN))).to.equal(MAX_NAME);
  });

  it('successor basic tests', () => {
    expect(successor('abc')).to.equal('abc' + MIN_PUSH_CHAR);
    expect(
      successor('abc' + MAX_PUSH_CHAR.repeat(MAX_KEY_LEN - 'abc'.length))
    ).to.equal('abd');
    expect(successor('abc' + MIN_PUSH_CHAR)).to.equal(
      'abc' + MIN_PUSH_CHAR.repeat(2)
    );
  });
});
