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

import { Bytes } from '../../../src';
import { blob, expectEqual, expectNotEqual } from '../../util/helpers';

describe('Bytes', () => {
  const base64Mappings: { [base64: string]: number[] } = {
    '': [],
    'AA==': [0],
    AAECAwQF: [0, 1, 2, 3, 4, 5],
    'AP8A/w==': [0, 255, 0, 255]
  };

  it('constructs values from Base64', () => {
    Object.keys(base64Mappings).forEach(base64Str => {
      const blob = Bytes.fromBase64String(base64Str);
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

  it('works with instanceof checks', () => {
    expect(Bytes.fromBase64String('') instanceof Bytes).to.equal(true);
  });

  it('support equality checking with isEqual()', () => {
    expectEqual(blob(1, 2, 3), blob(1, 2, 3));
    expectNotEqual(blob(1, 2, 3), blob(4, 5, 6));
  });
  
  it('fromJSON reconstructs the value from toJSON', () => {
    const bytes  = Bytes.fromUint8Array(new Uint8Array([0, 1, 2, 3, 4, 5]));
    expect(() => { Bytes.fromJSON(bytes.toJSON())} ).to.not.throw;
    expect(Bytes.fromJSON(bytes.toJSON()).isEqual(bytes)).to.be.true;
  });

  it('toJSON -> fromJSON bytes comparison', () => {
    Object.keys(base64Mappings).forEach(base64Str => {
      const bytesToSerialize = Bytes.fromBase64String(base64Str);
      const deserializedBytes = Bytes.fromJSON(bytesToSerialize.toJSON());
      expectEqual(bytesToSerialize, deserializedBytes);
      const expectedUint8Array = base64Mappings[base64Str];
      const actualUint8Array = deserializedBytes.toUint8Array();
      expect(actualUint8Array.length).to.equal(expectedUint8Array.length);
      for (let i = 0; i < actualUint8Array.length; i++) {
        expect(actualUint8Array[i]).to.equal(expectedUint8Array[i]);
      }
    });
  })

  it('fromJSON misisng fields throws', () => {
    expect(() => {Bytes.fromJSON({type: 'firestore/bytes/1.0' /* missing data */})}).to.throw;
    expect(() => {Bytes.fromJSON({data: 'AA==' /* missing type */})}).to.throw;
    expect(() => {Bytes.fromJSON({type: 1, data: 'AA==' })}).to.throw;
    expect(() => {Bytes.fromJSON({type: 'firestore/bytes/1.0', data: 1 })}).to.throw;
  });
});
