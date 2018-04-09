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
import { arrayBufferToBase64 } from '../src/helpers/array-buffer-to-base64';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { isArrayBufferEqual } from '../src/helpers/is-array-buffer-equal';

describe('Firebase Messaging > Helpers', () => {
  describe('Array Buffer - Base64 conversion', () => {
    it('returns expected value for p256dh example', () => {
      // prettier-ignore
      const buffer = new Uint8Array([
        4, 181, 98, 240, 48, 62, 75, 119, 193, 227, 154, 69, 250, 216, 53, 110,
        157, 120, 62, 76, 213, 249, 11, 62, 12, 19, 149, 36, 5, 82, 140, 37, 141,
        134, 132, 98, 87, 152, 175, 98, 53, 83, 196, 242, 202, 155, 19, 173, 157,
        216, 45, 147, 20, 12, 151, 160, 147, 159, 205, 219, 75, 133, 156, 129, 152
      ]);
      const expectedValue =
        'BLVi8DA-S3fB45pF-tg1bp14PkzV-Qs-DBOVJAVSjCWNhoRi' +
        'V5ivYjVTxPLKmxOtndgtkxQMl6CTn83bS4WcgZg';
      expect(arrayBufferToBase64(buffer)).to.equal(expectedValue);
    });

    it('returns expected value for auth example', () => {
      // prettier-ignore
      const buffer = new Uint8Array([
        255, 237, 107, 177, 171, 78, 84, 131, 221, 231, 87, 188, 22, 232, 71, 15
      ]);
      const expectedValue = '_-1rsatOVIPd51e8FuhHDw';
      expect(arrayBufferToBase64(buffer)).to.equal(expectedValue);
    });

    it('converts back and forth', () => {
      // prettier-ignore
      const array = new Uint8Array([
        4, 181, 98, 240, 48, 62, 75, 119, 193, 227, 154, 69, 250, 216, 53, 110,
        157, 120, 62, 76, 213, 249, 11, 62, 12, 19, 149, 36, 5, 82, 140, 37, 141,
        134, 132, 98, 87, 152, 175, 98, 53, 83, 196, 242, 202, 155, 19, 173, 157,
        216, 45, 147, 20, 12, 151, 160, 147, 159, 205, 219, 75, 133, 156, 129, 152
      ]);
      const string =
        'BLVi8DA-S3fB45pF-tg1bp14PkzV-Qs-DBOVJAVSjCWNhoRi' +
        'V5ivYjVTxPLKmxOtndgtkxQMl6CTn83bS4WcgZg';

      expect(arrayBufferToBase64(base64ToArrayBuffer(string))).to.equal(string);
      expect(
        isArrayBufferEqual(
          base64ToArrayBuffer(arrayBufferToBase64(array)).buffer,
          array.buffer
        )
      ).to.be.true;
    });
  });

  describe('isArrayBufferEqual', () => {
    let buffer: ArrayBuffer;

    beforeEach(() => {
      buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    });

    it('returns true if array buffers are same', () => {
      expect(isArrayBufferEqual(buffer, buffer)).to.be.true;
    });

    it('returns true if array buffers are equal', () => {
      const equalBuffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      expect(isArrayBufferEqual(buffer, equalBuffer)).to.be.true;
    });

    it('returns false if array buffers are not equal', () => {
      const differentBuffer = new Uint8Array([1, 2, 3, 2, 1]).buffer;
      expect(isArrayBufferEqual(buffer, differentBuffer)).to.be.false;
    });

    it('returns false if array buffers have different lengths', () => {
      const longerBuffer = new Uint8Array([1, 2, 3, 4, 5, 6]).buffer;
      expect(isArrayBufferEqual(buffer, longerBuffer)).to.be.false;
    });

    it('returns false if either array buffer is undefined or null', () => {
      expect(isArrayBufferEqual(buffer, undefined)).to.be.false;
      expect(isArrayBufferEqual(buffer, null)).to.be.false;
      expect(isArrayBufferEqual(undefined, buffer)).to.be.false;
      expect(isArrayBufferEqual(null, buffer)).to.be.false;
      expect(isArrayBufferEqual(undefined, undefined)).to.be.false;
      expect(isArrayBufferEqual(null, null)).to.be.false;
      expect(isArrayBufferEqual(undefined, null)).to.be.false;
      expect(isArrayBufferEqual(null, undefined)).to.be.false;
    });
  });
});
