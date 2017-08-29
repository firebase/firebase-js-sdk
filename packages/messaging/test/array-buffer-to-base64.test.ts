/**
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

import { expect } from 'chai';
import arrayBufferToBase64 from '../src/helpers/array-buffer-to-base64';

describe('Firebase Messaging > array-buffer-to-base64', function() {
  it('should return expected value for p256dh example', function() {
    const buffer = new Uint8Array([
      4,
      181,
      98,
      240,
      48,
      62,
      75,
      119,
      193,
      227,
      154,
      69,
      250,
      216,
      53,
      110,
      157,
      120,
      62,
      76,
      213,
      249,
      11,
      62,
      12,
      19,
      149,
      36,
      5,
      82,
      140,
      37,
      141,
      134,
      132,
      98,
      87,
      152,
      175,
      98,
      53,
      83,
      196,
      242,
      202,
      155,
      19,
      173,
      157,
      216,
      45,
      147,
      20,
      12,
      151,
      160,
      147,
      159,
      205,
      219,
      75,
      133,
      156,
      129,
      152
    ]).buffer;
    const expectedValue =
      'BLVi8DA-S3fB45pF-tg1bp14PkzV-Qs-DBOVJAVSjCWNhoRi' +
      'V5ivYjVTxPLKmxOtndgtkxQMl6CTn83bS4WcgZg';
    expect(arrayBufferToBase64(buffer)).to.equal(expectedValue);
  });

  it('should return expected value for auth example', function() {
    const buffer = new Uint8Array([
      255,
      237,
      107,
      177,
      171,
      78,
      84,
      131,
      221,
      231,
      87,
      188,
      22,
      232,
      71,
      15
    ]).buffer;
    const expectedValue = '_-1rsatOVIPd51e8FuhHDw';
    expect(arrayBufferToBase64(buffer)).to.equal(expectedValue);
  });
});
