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
    const bytes = Bytes.fromUint8Array(new Uint8Array([0, 1, 2, 3, 4, 5]));
    expect(() => {
      Bytes.fromJSON(bytes.toJSON());
    }).to.not.throw;
    expect(Bytes.fromJSON(bytes.toJSON()).isEqual(bytes)).to.be.true;
  });

  it('fromJSON parameter order does not matter', () => {
    const type = 'firestore/bytes/1.0';
    const bytes = 'AA==';
    expect(() => {
      Bytes.fromJSON({ bytes, type });
    }).to.not.throw;
    expect(() => {
      Bytes.fromJSON({ type, bytes });
    }).to.not.throw;
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
  });

  it('fromJSON misisng fields throws', () => {
    expect(() => {
      Bytes.fromJSON({ type: 'firestore/bytes/1.0' /* missing bytes data */ });
    }).to.throw;
    expect(() => {
      Bytes.fromJSON({ bytes: 'AA==' /* missing type */ });
    }).to.throw;
    expect(() => {
      Bytes.fromJSON({ type: 1, bytes: 'AA==' });
    }).to.throw;
    expect(() => {
      Bytes.fromJSON({ type: 'firestore/bytes/1.0', bytes: 1 });
    }).to.throw;
  });

  it('rejects invalid subtype values', () => {
    const arr = new Uint8Array([1, 2, 3]);
    expect(() => Bytes.fromUint8Array(arr, -1)).to.throw(
      'The subtype for Bytes must be a value in the inclusive [0, 255] range.'
    );
    expect(() => Bytes.fromUint8Array(arr, 256)).to.throw(
      'The subtype for Bytes must be a value in the inclusive [0, 255] range.'
    );
    expect(() => Bytes.fromBase64String('AA==', -1)).to.throw(
      'The subtype for Bytes must be a value in the inclusive [0, 255] range.'
    );
    expect(() => Bytes.fromBase64String('AA==', 256)).to.throw(
      'The subtype for Bytes must be a value in the inclusive [0, 255] range.'
    );
  });

  it('preserves subtype on construction', () => {
    const arr = new Uint8Array([1, 2, 3]);
    expect(Bytes.fromUint8Array(arr, 5).subtype).to.equal(5);
    expect(Bytes.fromBase64String('AA==', 10).subtype).to.equal(10);
  });

  it('verifies equality checking with different subtypes', () => {
    const arr = new Uint8Array([1, 2, 3]);
    const b1 = Bytes.fromUint8Array(arr, 1);
    const b1Again = Bytes.fromUint8Array(arr, 1);
    const b2 = Bytes.fromUint8Array(arr, 2);
    const b0 = Bytes.fromUint8Array(arr, 0);

    expectEqual(b1, b1Again);
    expectNotEqual(b1, b2);
    expectNotEqual(b1, b0);
  });

  it('supports data compatibility getter', () => {
    const arr = new Uint8Array([1, 2, 3]);
    const b1 = Bytes.fromUint8Array(arr, 5);
    expect(b1.data).to.deep.equal(arr);
  });

  it('supports custom toString() with subtype info', () => {
    const b1 = Bytes.fromUint8Array(new Uint8Array([1, 2, 3]), 5);
    expect(b1.toString()).to.equal('Bytes(base64: AQID, subtype: 5)');
  });

  it('serializes toJSON correctly with and without subtype', () => {
    const arr = new Uint8Array([1, 2, 3]);
    const b0 = Bytes.fromUint8Array(arr, 0);
    const b5 = Bytes.fromUint8Array(arr, 5);

    expect(b0.toJSON()).to.deep.equal({
      type: 'firestore/bytes/1.0',
      bytes: 'AQID'
    });

    expect(b5.toJSON()).to.deep.equal({
      type: 'firestore/bytes/1.0',
      bytes: 'AQID',
      subtype: 5
    });
  });

  it('deserializes fromJSON correctly with and without subtype', () => {
    const jsonWithoutSubtype = {
      type: 'firestore/bytes/1.0',
      bytes: 'AQID'
    };
    const jsonWithSubtype = {
      type: 'firestore/bytes/1.0',
      bytes: 'AQID',
      subtype: 5
    };

    const b0 = Bytes.fromJSON(jsonWithoutSubtype);
    expect(b0.subtype).to.equal(0);
    expect(b0.toUint8Array()).to.deep.equal(new Uint8Array([1, 2, 3]));

    const b5 = Bytes.fromJSON(jsonWithSubtype);
    expect(b5.subtype).to.equal(5);
    expect(b5.toUint8Array()).to.deep.equal(new Uint8Array([1, 2, 3]));
  });
});
