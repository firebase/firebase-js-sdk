/**
 * @license
 * Copyright 2017 Google Inc.
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

import { arrayToBase64, base64ToArray } from './array-base64-translator';
import { expect } from 'chai';
import '../testing/setup';

// prettier-ignore
const P256_ARRAY = new Uint8Array([
  4, 181, 98, 240, 48, 62, 75, 119, 193, 227, 154, 69, 250, 216, 53, 110,
  157, 120, 62, 76, 213, 249, 11, 62, 12, 19, 149, 36, 5, 82, 140, 37, 141,
  134, 132, 98, 87, 152, 175, 98, 53, 83, 196, 242, 202, 155, 19, 173, 157,
  216, 45, 147, 20, 12, 151, 160, 147, 159, 205, 219, 75, 133, 156, 129, 152
]);
const P256_BASE64 = 'BLVi8DA-S3fB45pF-tg1bp14PkzV-Qs-DBOVJAVSjCWNhoRi' +
'V5ivYjVTxPLKmxOtndgtkxQMl6CTn83bS4WcgZg';

// prettier-ignore
const AUTH_ARRAY = new Uint8Array([
  255, 237, 107, 177, 171, 78, 84, 131, 221, 231, 87, 188, 22, 232, 71, 15
]);
const AUTH_BASE64 = '_-1rsatOVIPd51e8FuhHDw';

describe('arrayToBase64', () => {
  it('array to base64 translation succeed', () => {
    expect(arrayToBase64(P256_ARRAY)).to.equal(P256_BASE64);
    expect(arrayToBase64(AUTH_ARRAY)).to.equal(AUTH_BASE64);
  });
});

describe('base64ToArray', () => {
  it('base64 to array translation succeed', () => {
    expect(isEqual(base64ToArray(P256_BASE64), P256_ARRAY)).to.equal(true);
    expect(isEqual(base64ToArray(AUTH_BASE64), AUTH_ARRAY)).to.equal(true);
  });
});

function isEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]){
      return false;
    }
  }
  
  return true;
}
