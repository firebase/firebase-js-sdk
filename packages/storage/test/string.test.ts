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
import { assert } from 'chai';
import { dataFromString, StringFormat } from '../src/implementation/string';
import { assertThrows, assertUint8ArrayEquals } from './testshared';

describe('Firebase Storage > String', () => {
  it('Encodes raw strings with ascii correctly', () => {
    const str = 'Hello, world!\n';
    assertUint8ArrayEquals(
      new Uint8Array([
        0x48,
        0x65,
        0x6c,
        0x6c,
        0x6f,
        0x2c,
        0x20,
        0x77,
        0x6f,
        0x72,
        0x6c,
        0x64,
        0x21,
        0x0a
      ]),
      dataFromString(StringFormat.RAW, str).data
    );
  });
  it('Encodes raw strings with 2-byte UTF8 codepoints correctly', () => {
    const str = 'aa\u0089';
    assertUint8ArrayEquals(
      new Uint8Array([0x61, 0x61, 0xc2, 0x89]),
      dataFromString(StringFormat.RAW, str).data
    );
  });
  it('Encodes raw strings with 3-byte UTF8 codepoints correctly', () => {
    const str = 'aa\uff7c';
    assertUint8ArrayEquals(
      new Uint8Array([0x61, 0x61, 0xef, 0xbd, 0xbc]),
      dataFromString(StringFormat.RAW, str).data
    );
  });
  it('Encodes raw strings with 4-byte UTF8 codepoints correctly', () => {
    const str = 'Hello! \ud83d\ude0a';
    assertUint8ArrayEquals(
      new Uint8Array([
        0x48,
        0x65,
        0x6c,
        0x6c,
        0x6f,
        0x21,
        0x20,
        0xf0,
        0x9f,
        0x98,
        0x8a
      ]),
      dataFromString(StringFormat.RAW, str).data
    );
  });
  it('Encodes raw strings with missing low surrogates correctly', () => {
    const str = 'aa\ud83d t';
    assertUint8ArrayEquals(
      new Uint8Array([0x61, 0x61, 0xef, 0xbf, 0xbd, 0x20, 0x74]),
      dataFromString(StringFormat.RAW, str).data
    );
  });
  it('Encodes raw strings with missing high surrogates correctly', () => {
    const str = 'aa\udc3d t';
    assertUint8ArrayEquals(
      new Uint8Array([0x61, 0x61, 0xef, 0xbf, 0xbd, 0x20, 0x74]),
      dataFromString(StringFormat.RAW, str).data
    );
  });
  it('Encodes base64 strings correctly', () => {
    const str = 'CpYlM1+XsGxTd1n6izHMU/yY3Bw=';
    const base64Bytes = new Uint8Array([
      0x0a,
      0x96,
      0x25,
      0x33,
      0x5f,
      0x97,
      0xb0,
      0x6c,
      0x53,
      0x77,
      0x59,
      0xfa,
      0x8b,
      0x31,
      0xcc,
      0x53,
      0xfc,
      0x98,
      0xdc,
      0x1c
    ]);
    assertUint8ArrayEquals(
      base64Bytes,
      dataFromString(StringFormat.BASE64, str).data
    );
  });
  it('Encodes base64 strings without padding correctly', () => {
    const str = 'CpYlM1+XsGxTd1n6izHMU/yY3Bw';
    const base64Bytes = new Uint8Array([
      0x0a,
      0x96,
      0x25,
      0x33,
      0x5f,
      0x97,
      0xb0,
      0x6c,
      0x53,
      0x77,
      0x59,
      0xfa,
      0x8b,
      0x31,
      0xcc,
      0x53,
      0xfc,
      0x98,
      0xdc,
      0x1c
    ]);
    assertUint8ArrayEquals(
      base64Bytes,
      dataFromString(StringFormat.BASE64, str).data
    );
  });
  it('Rejects invalid base64 strings', () => {
    const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw=';
    assertThrows(() => {
      dataFromString(StringFormat.BASE64, str);
    }, 'storage/invalid-format');
  });
  it('Encodes base64url strings correctly', () => {
    const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw=';
    const base64Bytes = new Uint8Array([
      0x0a,
      0x96,
      0x25,
      0x33,
      0x5f,
      0x97,
      0xb0,
      0x6c,
      0x53,
      0x77,
      0x59,
      0xfa,
      0x8b,
      0x31,
      0xcc,
      0x53,
      0xfc,
      0x98,
      0xdc,
      0x1c
    ]);
    assertUint8ArrayEquals(
      base64Bytes,
      dataFromString(StringFormat.BASE64URL, str).data
    );
  });
  it('Encodes base64url strings without padding correctly', () => {
    const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw';
    const base64Bytes = new Uint8Array([
      0x0a,
      0x96,
      0x25,
      0x33,
      0x5f,
      0x97,
      0xb0,
      0x6c,
      0x53,
      0x77,
      0x59,
      0xfa,
      0x8b,
      0x31,
      0xcc,
      0x53,
      0xfc,
      0x98,
      0xdc,
      0x1c
    ]);
    assertUint8ArrayEquals(
      base64Bytes,
      dataFromString(StringFormat.BASE64URL, str).data
    );
  });
  it('Rejects invalid base64url strings', () => {
    const str = 'CpYlM1+XsGxTd1n6izHMU/yY3Bw=';
    assertThrows(() => {
      dataFromString(StringFormat.BASE64URL, str);
    }, 'storage/invalid-format');
  });
  it('Encodes base64 data URLs (including embedded content type and parameters) correctly', () => {
    const str = 'data:image/png;param1=value;base64,aaaa';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(new Uint8Array([0x69, 0xa6, 0x9a]), data.data);
    assert.equal(data.contentType, 'image/png;param1=value');
  });
  it('Encodes non-base64 data URLs with no content type correctly', () => {
    const str = 'data:,aaaa';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(new Uint8Array([0x61, 0x61, 0x61, 0x61]), data.data);
    assert.equal(data.contentType, null);
  });
  it('Encodes base64 data URLs with no content type correctly', () => {
    const str = 'data:;base64,aaaa';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(new Uint8Array([0x69, 0xa6, 0x9a]), data.data);
    assert.equal(data.contentType, null);
  });
  it('Encodes non-base64 data URLs with content type correctly', () => {
    const str = 'data:text/plain,arst';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(new Uint8Array([0x61, 0x72, 0x73, 0x74]), data.data);
    assert.equal(data.contentType, 'text/plain');
  });
  it('Encodes non-base64 data URLs with URL-encoded text correctly', () => {
    const str = 'data:,a%20data';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
      new Uint8Array([0x61, 0x20, 0x64, 0x61, 0x74, 0x61]),
      data.data
    );
  });
  it('Encodes non-base64 data URLs with URL-encoded non-BMP codepoints correctly', () => {
    const str = 'data:,%F0%9F%98%8A%E6%86%82%E9%AC%B1';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
      new Uint8Array([
        0xf0,
        0x9f,
        0x98,
        0x8a,
        0xe6,
        0x86,
        0x82,
        0xe9,
        0xac,
        0xb1
      ]),
      data.data
    );
  });
  it('Rejects data URLs with invalid URL encodings', () => {
    const str = 'data:,%%0';
    assertThrows(() => {
      dataFromString(StringFormat.DATA_URL, str);
    }, 'storage/invalid-format');
  });
  it('Rejects data URLs with invalid URL-encoded byte sequences', () => {
    const str = 'data:,%80%80%80';
    assertThrows(() => {
      dataFromString(StringFormat.DATA_URL, str);
    }, 'storage/invalid-format');
  });
  it('Rejects data URLs with an invalid format', () => {
    const str = 'dateeeep:,invalid';
    assertThrows(() => {
      dataFromString(StringFormat.DATA_URL, str);
    }, 'storage/invalid-format');
  });
});
