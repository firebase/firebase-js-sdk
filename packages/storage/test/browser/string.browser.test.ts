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

import { expect } from 'chai';
import { missingPolyFill } from '../../src/implementation/error';
import { dataFromString, StringFormat } from '../../src/implementation/string';
import { assertThrows } from '../unit/testshared';

describe('String browser tests', () => {
  it('should reject if atob is undefined', () => {
    const originalAToB = global.atob;
    // @ts-ignore
    global.atob = undefined;
    const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw=';

    const error = assertThrows(() => {
      dataFromString(StringFormat.BASE64URL, str);
    }, 'storage/unsupported-environment');
    expect(error.message).to.equal(missingPolyFill('base-64').message);
    global.atob = originalAToB;
  });
});
