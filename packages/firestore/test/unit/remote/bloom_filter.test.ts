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

import { BloomFilter } from '../../../src/remote/bloom_filter';

import testData from './bloom_filter_test_data.json';

describe('BloomFilter', () => {
  it('can initiate an empty BloomFilter', () => {
    const bloomFilter = new BloomFilter(
      /* bitmap */ new Uint8Array(0),
      /* padding */ 0,
      /* hashCount */ 0
    );
    expect(bloomFilter.getBitSize()).to.equal(0);
  });

  it('can initiate a non empty BloomFilter', () => {
    const bloomFilter = new BloomFilter(
      /* bitmap */ new Uint8Array([151, 153, 236, 116, 7]),
      /* padding */ 3,
      /* hashCount */ 13
    );
    expect(bloomFilter.getBitSize()).to.equal(37);
  });

  it('should throw error if padding is negative', () => {
    try {
      new BloomFilter(new Uint8Array(0), -1, 0);
      expect.fail();
    } catch (error) {
      expect(
        (error as Error)?.message.includes(
          'INTERNAL ASSERTION FAILED: Padding is negative.'
        )
      ).to.be.true;
    }
  });

  it('should throw error if bitmap size is negative', () => {
    try {
      new BloomFilter(new Uint8Array(0), 1, 0);
      expect.fail();
    } catch (error) {
      expect(
        (error as Error)?.message.includes(
          'INTERNAL ASSERTION FAILED: Bitmap size is negative.'
        )
      ).to.be.true;
    }
  });

  it('should throw error if hash count is negative', () => {
    try {
      new BloomFilter(new Uint8Array(0), 0, -1);
      expect.fail();
    } catch (error) {
      expect(
        (error as Error)?.message.includes(
          'INTERNAL ASSERTION FAILED: Hash count is negative.'
        )
      ).to.be.true;
    }
  });

  it('mightContain in empty bloom filter should always return false', () => {
    const bloomFilter = new BloomFilter(new Uint8Array(0), 0, 0);
    expect(bloomFilter.mightContain('abc')).to.be.false;
    expect(bloomFilter.mightContain('def')).to.be.false;
  });

  it('mightContain should always return false for empty string', () => {
    const emptyBloomFilter = new BloomFilter(new Uint8Array(0), 0, 0);
    const nonEmptyBloomFilter = new BloomFilter(
      new Uint8Array([151, 153, 236, 116, 7]),
      3,
      13
    );
    expect(emptyBloomFilter.mightContain('')).to.be.false;
    expect(nonEmptyBloomFilter.mightContain('')).to.be.false;
  });

  describe('BloomFilter membership test', () => {
    const prefix = 'projects/project-1/databases/database-1/documents/coll/doc';

    interface TestDataType {
      // Bloom filter result created by backend based on documents: prefix+(0 ~i)
      bits: {
        bitmap: number[];
        padding: number;
      };
      hashCount: number;
      // Check membership of documents  prefix+(0 ~2i)
      membershipCheckCount: number;
      // Membership result on docs from 0~i are always postive, i~2i might have false positive
      membershipTestResult: string;
    }

    it('mightContain result should match backend result', () => {
      testData.forEach((data: TestDataType) => {
        const { bits, hashCount, membershipCheckCount, membershipTestResult } =
          data;
        const bloomFilter = new BloomFilter(
          Uint8Array.from(bits.bitmap),
          bits.padding,
          hashCount
        );
        for (let i = 0; i < membershipCheckCount; i++) {
          const isMember = membershipTestResult[i] === '1' ? true : false;
          const mightContain = bloomFilter.mightContain(prefix + i);
          expect(mightContain).to.equal(isMember);
        }
      });
    });
  });
});
