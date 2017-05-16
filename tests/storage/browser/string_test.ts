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
import {assert} from 'chai';
import {dataFromString, StringFormat} from '../../../src/storage/implementation/string';
import {assertThrows, assertUint8ArrayEquals} from './testshared';

describe("Firebase Storage > String", () => {
  it("Encodes raw strings with ascii correctly", () => {
    const str = 'Hello, world!\n';
    assertUint8ArrayEquals(
        new Uint8Array([
          0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x2C, 0x20, 0x77, 0x6F, 0x72, 0x6C, 0x64,
          0x21, 0x0A
        ]),
        dataFromString(StringFormat.RAW, str).data);
  });
  it("Encodes raw strings with 2-byte UTF8 codepoints correctly", () => {
    const str = 'aa\u0089';
    assertUint8ArrayEquals(
        new Uint8Array([0x61, 0x61, 0xC2, 0x89]),
        dataFromString(StringFormat.RAW, str).data);
  });
  it("Encodes raw strings with 3-byte UTF8 codepoints correctly", () => {
    const str = 'aa\uff7c';
    assertUint8ArrayEquals(
        new Uint8Array([0x61, 0x61, 0xEF, 0xBD, 0xBC]),
        dataFromString(StringFormat.RAW, str).data);
  });
  it("Encodes raw strings with 4-byte UTF8 codepoints correctly", () => {
    const str = 'Hello! \ud83d\ude0a';
    assertUint8ArrayEquals(
        new Uint8Array(
            [0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x21, 0x20, 0xF0, 0x9F, 0x98, 0x8A]),
        dataFromString(StringFormat.RAW, str).data);
  });
  it("Encodes raw strings with missing low surrogates correctly", () => {
    const str = 'aa\ud83d t';
    assertUint8ArrayEquals(
        new Uint8Array([0x61, 0x61, 0xEF, 0xBF, 0xBD, 0x20, 0x74]),
        dataFromString(StringFormat.RAW, str).data);
  });
  it("Encodes raw strings with missing high surrogates correctly", () => {
    const str = 'aa\udc3d t';
    assertUint8ArrayEquals(
        new Uint8Array([0x61, 0x61, 0xEF, 0xBF, 0xBD, 0x20, 0x74]),
        dataFromString(StringFormat.RAW, str).data);
  });
  it("Encodes base64 strings correctly", () => {
    const str = 'CpYlM1+XsGxTd1n6izHMU/yY3Bw=';
    const base64Bytes = new Uint8Array([
      0x0A, 0x96, 0x25, 0x33, 0x5F, 0x97, 0xB0, 0x6C, 0x53, 0x77,
      0x59, 0xFA, 0x8B, 0x31, 0xCC, 0x53, 0xFC, 0x98, 0xDC, 0x1C
    ]);
    assertUint8ArrayEquals(
        base64Bytes,
        dataFromString(StringFormat.BASE64, str).data);
  });
  it("Encodes base64 strings without padding correctly", () => {
    const str = 'CpYlM1+XsGxTd1n6izHMU/yY3Bw';
    const base64Bytes = new Uint8Array([
      0x0A, 0x96, 0x25, 0x33, 0x5F, 0x97, 0xB0, 0x6C, 0x53, 0x77,
      0x59, 0xFA, 0x8B, 0x31, 0xCC, 0x53, 0xFC, 0x98, 0xDC, 0x1C
    ]);
    assertUint8ArrayEquals(
        base64Bytes,
        dataFromString(StringFormat.BASE64, str).data);
  });
  it("Rejects invalid base64 strings", () => {
    const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw=';
    assertThrows(function() {
      dataFromString(StringFormat.BASE64, str);
    }, 'storage/invalid-format');
  });
  it("Encodes base64url strings correctly", () => {
    const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw=';
    const base64Bytes = new Uint8Array([
      0x0A, 0x96, 0x25, 0x33, 0x5F, 0x97, 0xB0, 0x6C, 0x53, 0x77,
      0x59, 0xFA, 0x8B, 0x31, 0xCC, 0x53, 0xFC, 0x98, 0xDC, 0x1C
    ]);
    assertUint8ArrayEquals(
        base64Bytes,
        dataFromString(StringFormat.BASE64URL, str).data);
  });
  it("Encodes base64url strings without padding correctly", () => {
    const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw';
    const base64Bytes = new Uint8Array([
      0x0A, 0x96, 0x25, 0x33, 0x5F, 0x97, 0xB0, 0x6C, 0x53, 0x77,
      0x59, 0xFA, 0x8B, 0x31, 0xCC, 0x53, 0xFC, 0x98, 0xDC, 0x1C
    ]);
    assertUint8ArrayEquals(
        base64Bytes,
        dataFromString(StringFormat.BASE64URL, str).data);
  });
  it("Rejects invalid base64url strings", () => {
    const str = 'CpYlM1+XsGxTd1n6izHMU/yY3Bw=';
    assertThrows(function() {
      dataFromString(StringFormat.BASE64URL, str);
    }, 'storage/invalid-format');
  });
  it("Encodes base64 data URLs (including embedded content type and parameters) correctly", () => {
    const str = 'data:image/png;param1=value;base64,aaaa';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
        new Uint8Array([0x69, 0xA6, 0x9A]), data.data);
    assert.equal(data.contentType, 'image/png;param1=value');
  });
  it("Encodes non-base64 data URLs with no content type correctly", () => {
    const str = 'data:,aaaa';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
        new Uint8Array([0x61, 0x61, 0x61, 0x61]), data.data);
    assert.equal(data.contentType, null);
  });
  it("Encodes base64 data URLs with no content type correctly", () => {
    const str = 'data:;base64,aaaa';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
        new Uint8Array([0x69, 0xA6, 0x9A]), data.data);
    assert.equal(data.contentType, null);
  });
  it("Encodes non-base64 data URLs with content type correctly", () => {
    const str = 'data:text/plain,arst';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
        new Uint8Array([0x61, 0x72, 0x73, 0x74]), data.data);
    assert.equal(data.contentType, 'text/plain');
  });
  it("Encodes non-base64 data URLs with URL-encoded text correctly", () => {
    const str = 'data:,a%20data';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
        new Uint8Array([0x61, 0x20, 0x64, 0x61, 0x74, 0x61]), data.data);
  });
  it("Encodes non-base64 data URLs with URL-encoded non-BMP codepoints correctly", () => {
    const str = 'data:,%F0%9F%98%8A%E6%86%82%E9%AC%B1';
    const data = dataFromString(StringFormat.DATA_URL, str);
    assertUint8ArrayEquals(
        new Uint8Array(
            [0xF0, 0x9F, 0x98, 0x8A, 0xE6, 0x86, 0x82, 0xE9, 0xAC, 0xB1]),
        data.data);
  });
  it("Rejects data URLs with invalid URL encodings", () => {
    const str = 'data:,%%0';
    assertThrows(function() {
      dataFromString(StringFormat.DATA_URL, str);
    }, 'storage/invalid-format');
  });
  it("Rejects data URLs with invalid URL-encoded byte sequences", () => {
    const str = 'data:,%80%80%80';
    assertThrows(function() {
      dataFromString(StringFormat.DATA_URL, str);
    }, 'storage/invalid-format');
  });
  it("Rejects data URLs with an invalid format", () => {
    const str = 'dateeeep:,invalid';
    assertThrows(function() {
      dataFromString(StringFormat.DATA_URL, str);
    }, 'storage/invalid-format');
  });
});
