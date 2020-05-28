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

import { arrayToBase64, base64ToArray } from './array-base64-translator';
import { expect } from 'chai';
import '../testing/setup';

// prettier-ignore
const TEST_P256_ARRAY = new Uint8Array([
  4, 181, 98, 240, 48, 62, 75, 119, 193, 227, 154, 69, 250, 216, 53, 110,
  157, 120, 62, 76, 213, 249, 11, 62, 12, 19, 149, 36, 5, 82, 140, 37, 141,
  134, 132, 98, 87, 152, 175, 98, 53, 83, 196, 242, 202, 155, 19, 173, 157,
  216, 45, 147, 20, 12, 151, 160, 147, 159, 205, 219, 75, 133, 156, 129, 152
]);
const TEST_P256_BASE64 =
  'BLVi8DA-S3fB45pF-tg1bp14PkzV-Qs-DBOVJAVSjCWNhoRi' +
  'V5ivYjVTxPLKmxOtndgtkxQMl6CTn83bS4WcgZg';

// prettier-ignore
const TEST_AUTH_ARRAY = new Uint8Array([
  255, 237, 107, 177, 171, 78, 84, 131, 221, 231, 87, 188, 22, 232, 71, 15
]);
const TEST_AUTH_BASE64 = '_-1rsatOVIPd51e8FuhHDw';

// prettier-ignore
const TEST_VAPID_ARRAY = new Uint8Array([4, 48, 191, 217, 11, 218, 74, 124, 103, 143, 63, 182, 203,
  91, 0, 68, 221, 68, 172, 74, 89, 133, 198, 252, 145, 164, 136, 243, 186, 75, 198, 32, 45, 64, 240,
  120, 141, 173, 240, 131, 253, 83, 209, 193, 129, 50, 155, 126, 189, 23, 127, 232, 109, 75, 101,
  229, 92, 85, 137, 80, 121, 35, 229, 118, 207]);
const TEST_VAPID_BASE64 =
  'BDC_2QvaSnxnjz-2y1sARN1ErEpZhcb8kaSI87pLxiAtQPB4ja3wg_1T0cGBMpt' +
  '-vRd_6G1LZeVcVYlQeSPlds8';

describe('arrayToBase64', () => {
  it('array to base64 translation succeed', () => {
    expect(arrayToBase64(TEST_P256_ARRAY)).to.equal(TEST_P256_BASE64);
    expect(arrayToBase64(TEST_AUTH_ARRAY)).to.equal(TEST_AUTH_BASE64);
    expect(arrayToBase64(TEST_VAPID_ARRAY)).to.equal(TEST_VAPID_BASE64);
  });
});

describe('base64ToArray', () => {
  it('base64 to array translation succeed', () => {
    expect(isEqual(base64ToArray(TEST_P256_BASE64), TEST_P256_ARRAY)).to.equal(
      true
    );
    expect(isEqual(base64ToArray(TEST_AUTH_BASE64), TEST_AUTH_ARRAY)).to.equal(
      true
    );
    expect(
      isEqual(base64ToArray(TEST_VAPID_BASE64), TEST_VAPID_ARRAY)
    ).to.equal(true);
  });
});

function isEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
