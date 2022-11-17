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

import { BloomFilter, md5HashString } from '../../../src/remote/bloom_filter';

describe('BloomFilter', () => {
  it('should create a hex-encoded MD5 hash of a string', () => {
    expect(md5HashString('abc').toString()).to.equal(
      '900150983cd24fb0d6963f7d28e17f72'
    );
  });

  // Mocking banckend response based on two strings "abc" and "def", for now.
  // bits {
  //   bitmap: "\227\231\354t\007"
  //   padding: 3
  // }
  // hash_count: 13

  // Mocking the bitmap processed from octal string to Uint8Array
  const processedBitmap = new Uint8Array(5);
  for (let i = 0; i < 5; i++) {
    processedBitmap[i] = '\x97\x99ìt\x07'.charCodeAt(i);
  }

  it('should be able to calculate the bitsize correctly', () => {
    const bloomFilter_ = new BloomFilter(processedBitmap, 3, 13);
    expect(bloomFilter_.getBitSize()).to.equal(37);
  });

  it('mightContain should return true for existing document', () => {
    const bloomFilter_ = new BloomFilter(processedBitmap, 3, 13);
    expect(bloomFilter_.mightContain('abc')).to.be.true;
    expect(bloomFilter_.mightContain('def')).to.be.true;
  });

  it('mightContain should return true for non existing document', () => {
    const bloomFilter_ = new BloomFilter(processedBitmap, 3, 13);
    expect(bloomFilter_.mightContain('ab')).to.be.false;
    expect(bloomFilter_.mightContain('bc')).to.be.false;
    expect(bloomFilter_.mightContain('xyz')).to.be.false;
  });
});
