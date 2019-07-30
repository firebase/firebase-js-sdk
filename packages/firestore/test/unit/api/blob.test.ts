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

import { expect } from 'chai';
import { Blob, PublicBlob } from '../../../src/api/blob';
import {
  blob,
  expectCorrectComparisons,
  expectEqual,
  expectNotEqual
} from '../../util/helpers';

describe('Blob', () => {
  const base64Mappings: { [base64: string]: number[] } = {
    '': [],
    'AA==': [0],
    AAECAwQF: [0, 1, 2, 3, 4, 5],
    'AP8A/w==': [0, 255, 0, 255]
  };

  it('constructs values from Base64', () => {
    Object.keys(base64Mappings).forEach(base64Str => {
      const blob = Blob.fromBase64String(base64Str);
      const expectedBytes = base64Mappings[base64Str];
      const actualBytes = blob.toUint8Array();
      expect(actualBytes.length).to.equal(expectedBytes.length);
      for (let i = 0; i < actualBytes.length; i++) {
        expect(actualBytes[i]).to.equal(expectedBytes[i]);
      }
    });
  });

  it('constructs values from Uint8Array', () => {
    Object.keys(base64Mappings).forEach(base64Str => {
      const bytes = base64Mappings[base64Str];
      expect(blob(...bytes).toBase64()).to.deep.equal(base64Str);
    });
  });

  it('Blob throws on invalid Base64 strings', () => {
    expect(() => Blob.fromBase64String('not-base64!')).to.throw(
      /Failed to construct Blob from Base64 string:/
    );
  });

  it('Blob throws on using the public constructor', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, allow using constructor with any
    expect(() => new (PublicBlob as any)('')).to.throw(
      'This constructor is private. Use Blob.fromUint8Array() or ' +
        'Blob.fromBase64String() instead.'
    );
  });

  it('PublicBlob works with instanceof checks', () => {
    expect(Blob.fromBase64String('') instanceof PublicBlob).to.equal(true);
  });

  it('compares correctly', () => {
    const values = [
      blob(0),
      blob(0, 1),
      blob(0, 1, 2),
      blob(0, 2),
      blob(0, 255),
      blob(1),
      blob(1, 0),
      blob(1, 2),
      blob(1, 255),
      blob(2),
      blob(255)
    ];

    expectCorrectComparisons(values, (left: Blob, right: Blob) => {
      return left._compareTo(right);
    });
  });

  it('support equality checking with isEqual()', () => {
    expectEqual(blob(1, 2, 3), blob(1, 2, 3));
    expectNotEqual(blob(1, 2, 3), blob(4, 5, 6));
  });
});
