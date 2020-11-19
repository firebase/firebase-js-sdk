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

import { expect } from 'chai';
import { Blob } from '../../../src/api/blob';
import { blob, expectEqual, expectNotEqual } from '../../util/helpers';

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
      /Failed to construct data from Base64 string:/
    );
  });

  it('works with instanceof checks', () => {
    expect(Blob.fromBase64String('') instanceof Blob).to.equal(true);
  });

  it('support equality checking with isEqual()', () => {
    expectEqual(blob(1, 2, 3), blob(1, 2, 3));
    expectNotEqual(blob(1, 2, 3), blob(4, 5, 6));
  });
});
