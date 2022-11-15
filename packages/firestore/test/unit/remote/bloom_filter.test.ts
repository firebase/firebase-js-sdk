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

import {
  isBigEndian,
  md5HashStringToHex
} from '../../../src/remote/bloom_filter';

describe('BloomFilter', () => {
  it('should create a hex-encoded MD5 hash of a string', () => {
    expect(isBigEndian()).to.be.false;
    expect(
      md5HashStringToHex(
        'projects/my-cool-project/databases/(default)/documents/MyCoolColl/MyCoolDoc'
      )
    ).to.equal('165f8eafe08aa55d22dac2fceda88335');
  });
});
